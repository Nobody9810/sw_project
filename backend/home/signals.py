"""
信号处理模块 - 性能优化版本
关键优化:
1. 移除同步PDF缩略图生成,改用异步任务
2. 避免重复的信号处理器
3. 添加错误处理和日志
"""
import os
import re
import html
import logging
from pathlib import Path
from django.db import transaction, close_old_connections
from urllib.parse import urlparse, unquote
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.conf import settings
from sorl.thumbnail import delete as delete_thumbnail
from .models import (
    通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库
)

# ==================== 文件删除相关函数 ====================

ARTICLE_MODELS = (通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库)
HTML_FIELDS = ('内容', '作者简介', '目录', '前言', '内容简介')
logger = logging.getLogger(__name__)


def media_name_from_url(file_url):
    """Return a local media name only when the URL and resolved path are trusted."""
    parsed = urlparse(html.unescape(str(file_url)))
    media_url = urlparse(settings.MEDIA_URL)
    if parsed.scheme and parsed.scheme not in ('http', 'https'):
        return None
    if parsed.netloc:
        trusted_hosts = set(getattr(settings, 'MEDIA_FILE_HOSTS', []))
        if media_url.hostname:
            trusted_hosts.add(media_url.hostname)
        if parsed.hostname not in trusted_hosts:
            return None
    prefix = media_url.path.rstrip('/') + '/'
    path = unquote(parsed.path)
    if not path.startswith(prefix):
        return None
    name = path[len(prefix):]
    return _safe_media_name(name)


def _safe_media_name(name):
    if not name or name in ('null', 'None') or '\\' in name:
        return None
    root = Path(settings.MEDIA_ROOT).resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root) or target == root:
        return None
    return target.relative_to(root).as_posix()


def _referenced_media_names(names):
    """Check all candidates in one pass through each model's rich text."""
    referenced = set()
    for model in ARTICLE_MODELS:
        file_fields = [field for field in model._meta.fields if hasattr(field, 'upload_to')]
        for field in file_fields:
            referenced.update(model.objects.filter(**{field.name + '__in': names}).values_list(field.name, flat=True))
        if referenced >= names:
            return referenced
        html_fields = [field.name for field in model._meta.fields if field.name in HTML_FIELDS]
        if html_fields:
            for values in model.objects.values_list(*html_fields).iterator(chunk_size=500):
                for value in values:
                    for url in extract_ckeditor_files(str(value or '')):
                        name = media_name_from_url(url)
                        if name in names:
                            referenced.add(name)
                if referenced >= names:
                    return referenced
    return referenced


def _is_media_referenced(name):
    return name in _referenced_media_names({name})


def _delete_unreferenced_media_batch(entries):
    try:
        names = {name for name in entries if _safe_media_name(name) == name}
        referenced = _referenced_media_names(names) if names else set()
        from django.core.files.storage import default_storage
        for name in names - referenced:
            try:
                delete_thumbnail(name, delete_file=False)
                (entries[name] or default_storage).delete(name)
            except Exception:
                logger.exception('媒体文件清理失败: %s', name)
    except Exception:
        # A failed reference query must preserve all candidate files.
        logger.exception('媒体引用检查失败')


def _delete_unreferenced_media(name, storage=None):
    _delete_unreferenced_media_batch({name: storage})


from contextlib import contextmanager
from contextvars import ContextVar

_cleanup_batch = ContextVar('media_cleanup_batch', default=None)


def schedule_media_cleanup(entries):
    batch = _cleanup_batch.get()
    if batch is not None:
        batch.update(entries)
    elif entries:
        transaction.on_commit(lambda: _delete_unreferenced_media_batch(entries))


@contextmanager
def media_cleanup_batch():
    if _cleanup_batch.get() is not None:
        yield
        return
    entries = {}
    token = _cleanup_batch.set(entries)
    try:
        yield
    except BaseException:
        raise
    else:
        schedule = dict(entries)
        if schedule:
            transaction.on_commit(lambda: _delete_unreferenced_media_batch(schedule))
    finally:
        _cleanup_batch.reset(token)


def delete_file(file_field):
    if file_field:
        name = _safe_media_name(file_field.name)
        if name:
            schedule_media_cleanup({name: file_field.storage})


def extract_ckeditor_files(html_content):
    """从CKEditor HTML内容中提取所有文件URL"""
    if not html_content:
        return []
    
    file_urls = []
    
    img_pattern = r'<img[^>]*\s+src=["\']([^"\']+)["\']'
    image_urls = re.findall(img_pattern, html_content, re.IGNORECASE)
    file_urls.extend(image_urls)
    
    link_pattern = r'<a[^>]*\s+href=["\']([^"\']+\.pdf)["\']'
    pdf_urls = re.findall(link_pattern, html_content, re.IGNORECASE)
    file_urls.extend(pdf_urls)
    
    return list(set(file_urls))


def delete_ckeditor_file(file_url):
    name = media_name_from_url(file_url)
    if not name:
        return False
    schedule_media_cleanup({name: None})
    return True


@receiver(post_delete)
def delete_article_media(sender, instance, **kwargs):
    if sender not in ARTICLE_MODELS:
        return
    from django.contrib.contenttypes.models import ContentType
    from notifications.models import ArticleDistribution
    ArticleDistribution.objects.filter(content_type=ContentType.objects.get_for_model(sender), object_id=instance.pk).delete()
    entries = {}
    for field in instance._meta.fields:
        value = getattr(instance, field.name)
        if hasattr(field, 'upload_to') and value:
            name = _safe_media_name(value.name)
            if name:
                entries[name] = value.storage
        elif field.name in HTML_FIELDS:
            for url in extract_ckeditor_files(str(value or '')):
                name = media_name_from_url(url)
                if name:
                    entries.setdefault(name, None)
    schedule_media_cleanup(entries)


# ==================== PDF 封面后台处理 ====================
# Limit work in each web process. The repair command retries missing covers after restart.
from threading import Thread, Lock, BoundedSemaphore
from uuid import uuid4

_thumbnail_lock = Lock()
_thumbnail_slots = BoundedSemaphore(2)
_thumbnail_pending = set()


def queue_pdf_thumbnail(model, pk, document_name):
    key = (model._meta.label_lower, pk, document_name)
    with _thumbnail_lock:
        if key in _thumbnail_pending or not _thumbnail_slots.acquire(blocking=False):
            return
        _thumbnail_pending.add(key)

    def run():
        close_old_connections()
        try:
            _generate_pdf_thumbnail_task(model, pk, document_name)
        finally:
            try:
                close_old_connections()
            finally:
                with _thumbnail_lock:
                    _thumbnail_pending.discard(key)
                    _thumbnail_slots.release()
    try:
        Thread(target=run, daemon=True).start()
    except Exception:
        with _thumbnail_lock:
            _thumbnail_pending.discard(key)
            _thumbnail_slots.release()
        logger.exception('启动封面任务失败: %s', key)


@receiver(post_save, sender=论文)
@receiver(post_save, sender=古籍)
@receiver(post_save, sender=书库)
def generate_pdf_thumbnail(sender, instance, **kwargs):
    if kwargs.get('raw'):
        return
    document_name = instance.文档.name
    if document_name and document_name.lower().endswith('.pdf') and getattr(instance.图片, 'name', None) in (None, '', 'null', 'None'):
        pk = instance.pk
        transaction.on_commit(lambda: queue_pdf_thumbnail(sender, pk, document_name))


def _generate_pdf_thumbnail_task(model, pk, document_name):
    """Apply only the cover field, guarded against deletion, new documents and manual covers."""
    from django.core.files.base import ContentFile
    from django.db.models import Q
    cover_name = None
    storage = model._meta.get_field('图片').storage
    try:
        import fitz
        item = model.objects.filter(pk=pk, 文档=document_name).first()
        if not item or getattr(item.图片, 'name', item.图片) not in (None, '', 'null', 'None') or not document_name.lower().endswith('.pdf'):
            return False
        with item.文档.open('rb') as source:
            with fitz.open(stream=source.read(), filetype='pdf') as document:
                if document.page_count < 1:
                    return False
                page = document.load_page(0)
                # Bound output dimensions even for unusually large PDF pages.
                scale = min(1.5, 1920 / max(page.rect.width, page.rect.height))
                pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                blob = pixmap.tobytes('jpeg')
        filename = f'{Path(document_name).stem}_{uuid4().hex}_thumb.jpg'
        field = model._meta.get_field('图片')
        cover_name = storage.save(field.generate_filename(item, filename), ContentFile(blob, name=filename),
                                  max_length=field.max_length)
        updated = model.objects.filter(pk=pk, 文档=document_name).filter(
            Q(图片__in=['', 'null', 'None']) | Q(图片__isnull=True)
        ).update(图片=cover_name)
        if not updated:
            storage.delete(cover_name)
            return False
        logger.info('生成 PDF 封面: %s %s', model._meta.label_lower, pk)
        invalidate_home_feed()
        return True
    except Exception:
        # A database failure after applying the update must not delete a referenced cover.
        if cover_name:
            _delete_unreferenced_media(cover_name, storage)
        logger.exception('生成 PDF 封面失败: %s %s', model._meta.label_lower, pk)
        return False


def invalidate_home_feed():
    from .feed_cache import invalidate_home_feed as invalidate
    invalidate()


@receiver(post_save)
@receiver(post_delete)
def invalidate_content_cache(sender, **kwargs):
    from .models import 书讯Sale, 书评_分类
    if sender in ARTICLE_MODELS or sender in (书讯Sale, 书评_分类):
        transaction.on_commit(invalidate_home_feed)
