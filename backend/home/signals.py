"""Media lifecycle for articles and release notes.

After a save commits: move the row's own files into its folder, remove files the
edit stopped using, then queue PDF cover/optimization work. After a delete
commits: remove files nothing else references. File removal always re-checks
every other reference first.
"""
import logging
from contextlib import contextmanager
from contextvars import ContextVar
from pathlib import Path

from django.db import transaction, close_old_connections
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from sorl.thumbnail import delete as delete_thumbnail

from .media_refs import (instance_media_names, media_name, prune_empty_dirs,
                         referenced_media_names, safe_media_name)
from .models import (
    ReleaseNote, 通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库
)

ARTICLE_MODELS = (通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库)
MEDIA_MODELS = ARTICLE_MODELS + (ReleaseNote,)
PDF_MODELS = (论文, 古籍, 书库)
logger = logging.getLogger(__name__)

# Kept for existing callers.
media_name_from_url = media_name
_safe_media_name = safe_media_name


def _referenced_media_names(names):
    return referenced_media_names(names)


# ==================== 文件删除 ====================

def _delete_unreferenced_media_batch(entries):
    try:
        names = {name for name in entries if _safe_media_name(name) == name}
        referenced = _referenced_media_names(names) if names else set()
        from django.core.files.storage import default_storage
        for name in names - referenced:
            try:
                storage = entries[name] or default_storage
                delete_thumbnail(name, delete_file=False)
                storage.delete(name)
                prune_empty_dirs(Path(storage.path(name)).parent)
            except Exception:
                logger.exception('媒体文件清理失败: %s', name)
    except Exception:
        # A failed reference query must preserve all candidate files.
        logger.exception('媒体引用检查失败')


def _delete_unreferenced_media(name, storage=None):
    _delete_unreferenced_media_batch({name: storage})


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


def delete_ckeditor_file(file_url):
    name = media_name_from_url(file_url)
    if not name:
        return False
    schedule_media_cleanup({name: None})
    return True


@receiver(post_delete)
def delete_article_media(sender, instance, **kwargs):
    if sender not in MEDIA_MODELS:
        return
    if sender in ARTICLE_MODELS:
        from django.contrib.contenttypes.models import ContentType
        from notifications.models import ArticleDistribution
        ArticleDistribution.objects.filter(content_type=ContentType.objects.get_for_model(sender), object_id=instance.pk).delete()
    schedule_media_cleanup({name: None for name in instance_media_names(instance)})


# ==================== 保存后的文件整理 ====================

@receiver(pre_save)
def remember_media_before_save(sender, instance, raw=False, **kwargs):
    if sender in MEDIA_MODELS and not raw and instance.pk:
        previous = sender.objects.filter(pk=instance.pk).first()
        instance._media_before = instance_media_names(previous) if previous else set()


@receiver(post_save)
def process_media_after_save(sender, instance, raw=False, **kwargs):
    if sender not in MEDIA_MODELS or raw:
        return
    before = getattr(instance, '_media_before', set())
    pk = instance.pk
    transaction.on_commit(lambda: after_media_save(sender, pk, before))


def after_media_save(model, pk, before=frozenset()):
    """Organize, drop files the edit no longer uses, then start PDF background work."""
    from .media_organize import organize
    try:
        mapping = organize(model, pk)
    except Exception:
        logger.exception('媒体文件归位失败: %s %s', model._meta.label_lower, pk)
        mapping = {}
    instance = model.objects.filter(pk=pk).first()
    current = instance_media_names(instance) if instance else set()
    removed = set(before) - current - set(mapping)
    if removed:
        _delete_unreferenced_media_batch({name: None for name in removed})
    if mapping:
        invalidate_home_feed()
    if instance is None or model not in PDF_MODELS:
        return
    from django.core.files.storage import default_storage
    from .pdfs import queue_pdf_optimization
    for name in mapping.values():
        if name.lower().endswith('.pdf'):
            queue_pdf_optimization(default_storage.path(name))
    document_name = instance.文档.name
    if document_name and document_name.lower().endswith('.pdf') and getattr(instance.图片, 'name', None) in (None, '', 'null', 'None'):
        queue_pdf_thumbnail(model, pk, document_name)


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
        from .media_organize import media_dir
        filename = f'{Path(document_name).stem}_{uuid4().hex}_thumb.jpg'
        field = model._meta.get_field('图片')
        cover_name = storage.save(f'{media_dir(model, pk)}/{filename}', ContentFile(blob, name=filename),
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
