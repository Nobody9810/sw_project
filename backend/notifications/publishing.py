"""Explicit article distribution; only public article data reaches the channel bot."""
import re
from html import escape, unescape
from ipaddress import ip_address
from urllib.parse import urlencode, urlparse
from uuid import uuid4

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.utils import timezone
from django.utils.html import strip_tags

from .errors import DeliveryError
from .models import ArticleDistribution
from .telegram import call_api


def public_origin_valid():
    url = urlparse(settings.PUBLIC_SITE_URL)
    host = (url.hostname or '').lower()
    if url.scheme != 'https' or not host or '.' not in host or host.endswith('.localhost') or url.username or url.password:
        return False
    try:
        return ip_address(host).is_global
    except ValueError:
        return True


def local_test_mode():
    """Only a development server with an actual local origin may omit article links."""
    if not settings.DEBUG or getattr(settings, 'ENVIRONMENT', 'production') != 'development':
        return False
    host = (urlparse(settings.PUBLIC_SITE_URL).hostname or '').lower()
    if host == 'localhost' or host.endswith('.localhost'):
        return True
    try:
        return not ip_address(host).is_global
    except ValueError:
        return False


def configuration_error(*, require_public_url=True):
    if not settings.TELEGRAM_PUBLISH_BOT_TOKEN or not settings.TELEGRAM_PUBLISH_CHANNEL_ID:
        return '请先配置独立的 TELEGRAM_PUBLISH_BOT_TOKEN 和 TELEGRAM_PUBLISH_CHANNEL_ID。'
    if not re.fullmatch(r'@[A-Za-z0-9_]+|-100[0-9]+', settings.TELEGRAM_PUBLISH_CHANNEL_ID):
        return 'TELEGRAM_PUBLISH_CHANNEL_ID 应为 @频道用户名或 -100 开头的频道数字 ID，不能填私聊 ID 或邀请链接。'
    if require_public_url and not public_origin_valid() and not local_test_mode():
        return '请将 PUBLIC_SITE_URL 设置为读者能访问的 HTTPS 网站来源地址。'
    return ''


def distribution_for(article):
    if not article.pk:
        return None
    content_type = ContentType.objects.get_for_model(article)
    return ArticleDistribution.objects.filter(content_type=content_type, object_id=article.pk).first()


def plain(value):
    from home.html import public_html
    html = public_html(str(value or ''))
    text = strip_tags(re.sub(r'</?(?:p|div|h[1-6]|li|ul|ol|blockquote|br|tr|td|section)\b[^>]*>', ' ', html, flags=re.I))
    return ' '.join(re.sub(r'[\x00-\x1f\x7f]', ' ', unescape(text)).split())


def shorten(value, length):
    return value if len(value) <= length else value[:length - 1] + '…'


def article_message(article, *, compact=False):
    title = shorten(plain(article.标题), 45 if compact else 150)
    author = plain(article.作者)
    if author in ('无作者信息', '暂无', '无'):
        author = ''
    author = shorten(author, 12 if compact else 60)
    summary = plain(getattr(article, '内容', ''))
    if summary in ('暂无内容简介', '暂无', '暂无内容', '待补充'):
        summary = ''
    return title, author, shorten(summary, 24 if compact else 220)


def article_url(article):
    # ID is authoritative; the site's existing redirect resolves its current title URL.
    return settings.PUBLIC_SITE_URL + article.get_absolute_url()


def x_share_url(article):
    if not article.pk or not article.发布状态 or not (public_origin_valid() or local_test_mode()):
        return ''
    title, author, summary = article_message(article, compact=True)
    text = '\n'.join(filter(None, [title, f'作者：{author}' if author else '', summary]))
    # Same Web Intent used by the site's existing react-share Twitter/X button.
    data = {'text': '[本地测试]\n' + text} if local_test_mode() else {'text': text, 'url': article_url(article)}
    return 'https://twitter.com/intent/tweet?' + urlencode(data)


def channel_message(article, *, local_test=False):
    title, author, summary = article_message(article)
    return '\n\n'.join(filter(None, ['🧪 <b>本地测试 · 非正式文章通知</b>' if local_test else '', f'<b>{escape(title)}</b>',
        f'作者：{escape(author)}' if author else '', escape(summary),
        '本地测试不附阅读链接。' if local_test else f'<a href="{escape(article_url(article), quote=True)}">阅读全文</a>']))


@transaction.atomic
def save_distribution(article, enabled, retry=False):
    """Called by admin within the article-save transaction. No network in requests."""
    article = type(article).objects.select_for_update().get(pk=article.pk)
    content_type = ContentType.objects.get_for_model(article)
    record = ArticleDistribution.objects.select_for_update().filter(
        content_type=content_type, object_id=article.pk).first()
    if record is None:
        if not enabled:
            return None
        record = ArticleDistribution.objects.create(content_type=content_type, object_id=article.pk)
    record.enabled = enabled
    if not enabled or not article.发布状态:
        if record.status == 'queued':
            record.status = 'idle'
            # Invalidate any old queued generation without affecting another attempt.
            record.generation = uuid4()
        record.save()
        return record
    # A local test receipt must never suppress the article's later real publication.
    if record.is_test and not local_test_mode():
        record.status = 'idle'
        record.generation = uuid4()
    if record.status in ('sent', 'sending', 'queued') or (record.status in ('failed', 'unknown') and not retry):
        record.save(update_fields=['enabled'])
        return record
    error = configuration_error()
    if error:
        record.status, record.last_error = 'failed', 'publisher_not_configured'
        record.save()
        return record
    from .queue import enqueue
    record.generation = uuid4()
    record.status, record.last_error = 'queued', ''
    record.is_test = local_test_mode()
    record.message_id, record.sent_at, record.destination = None, None, ''
    record.outbox = enqueue('telegram_article', {'distribution_id': record.pk, 'generation': str(record.generation)}, ttl=86400)
    record.save()
    return record


def deliver_article(payload):
    """Persist sending intent first: a crash/ambiguous response requires manual review."""
    error = None
    with transaction.atomic():
        record = ArticleDistribution.objects.select_for_update().filter(
            pk=payload['distribution_id'], generation=payload['generation']).first()
        if not record or record.status in ('sent', 'idle', 'failed', 'unknown'):
            return
        if record.status == 'sending':
            record.status, record.last_error = 'unknown', 'delivery_interrupted_check_channel'
            record.save(update_fields=['status', 'last_error'])
            return
        model = record.content_type.model_class()
        article = model.objects.filter(pk=record.object_id).first() if model else None
        if not record.enabled or not article or not getattr(article, '发布状态', False):
            record.status = 'idle'
            record.save(update_fields=['status'])
            return
        if configuration_error():
            raise DeliveryError('publisher_not_configured', permanent=True)
        if record.is_test != local_test_mode():
            raise DeliveryError('publication_mode_changed', permanent=True)
        data = {'chat_id': settings.TELEGRAM_PUBLISH_CHANNEL_ID, 'text': channel_message(article, local_test=record.is_test),
                'parse_mode': 'HTML', 'link_preview_options': {'is_disabled': record.is_test}}
        record.status = 'sending'
        record.save(update_fields=['status'])
    try:
        result = call_api('sendMessage', data, bot_token=settings.TELEGRAM_PUBLISH_BOT_TOKEN)
        if not isinstance(result, dict) or type(result.get('message_id')) is not int:
            raise DeliveryError('telegram_delivery_unknown', permanent=True)
    except DeliveryError as exc:
        ambiguous = str(exc) in ('telegram_network_error', 'telegram_delivery_unknown', 'telegram_http_200') or str(exc).startswith('telegram_http_5')
        error = DeliveryError('telegram_delivery_unknown', permanent=True) if ambiguous else exc
        ArticleDistribution.objects.filter(pk=record.pk, generation=record.generation).update(
            status='unknown' if ambiguous else ('failed' if error.permanent else 'queued'), last_error=str(error))
    else:
        ArticleDistribution.objects.filter(pk=record.pk, generation=record.generation).update(
            status='sent', message_id=result['message_id'], destination=str(data['chat_id']),
            sent_at=timezone.now(), last_error='')
    if error:
        raise error
