"""Business notifications publish minimal payloads; transports stay in channels.py."""
import logging
from html import escape
from urllib.parse import urlparse
from ipaddress import ip_address
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.urls import reverse
from django.utils import timezone

from .queue import enqueue
from .models import TelegramReview

logger = logging.getLogger(__name__)


def review_link(url):
    host = urlparse(url).hostname or ''
    local = '.' not in host or host.lower().endswith('.localhost')
    try:
        local = local or not ip_address(host).is_global
    except ValueError:
        pass
    if local:
        # Telegram may reject an HTML text-link targeting a localhost/private address.
        return f'前往后台审核（开发地址，请在本机打开）：{escape(url)}'
    return f'<a href="{escape(url, quote=True)}">前往后台审核</a>'


def review_keyboard(review):
    return {'inline_keyboard': [[
        {'text': '✓ 通过', 'callback_data': f'r:a:{review.token.hex}'},
        {'text': '✕ 不通过', 'callback_data': f'r:r:{review.token.hex}'},
    ]]}


def comment_pending(comment, article):
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return
    try:
        # Savepoint isolates an outbox DB failure from the surrounding comment transaction.
        with transaction.atomic():
            from .moderation import fingerprint
            review, _ = TelegramReview.objects.get_or_create(comment=comment, defaults={
                'fingerprint': fingerprint(comment),
                'expires_at': timezone.now() + timedelta(seconds=settings.TELEGRAM_NOTIFICATION_TTL),
            })
            buttons = review_keyboard(review)
            return enqueue('telegram', {'text': review_text(comment, article), 'reply_markup': buttons}, ttl=settings.TELEGRAM_NOTIFICATION_TTL)
    except Exception as error:
        logger.warning('Comment notification enqueue failed: %s', type(error).__name__)


def review_text(comment, article, state='pending'):
    labels = {'pending': '待审核', 'approved': '已通过', 'rejected': '未通过',
              'superseded': '已变更，请到后台审核', 'expired': '已过期，请到后台审核'}
    label = labels[state]
    url = settings.PUBLIC_SITE_URL + reverse('admin:comment_comment_change', args=[comment.pk])
    title = escape(' '.join(str(getattr(article, '标题', '原文章已删除')).split())[:250])
    nickname = escape(' '.join(comment.user_name.split())[:50])
    identity = '访客' if comment.is_guest is True else '登录用户' if comment.is_guest is False else '历史身份未记录'
    return (f'📝 <b>書味 · 评论{label}</b>\n\n<b>《{title}》</b>\n'
            f'评论者：{nickname} <i>· {identity}</i>\n'
            f'{label} · <code>#{comment.pk}</code>\n\n{review_link(url)}')


def question_review_text(question, state='pending'):
    labels = {'pending': '待审核', 'approved': '已通过，等待回答', 'rejected': '未通过',
              'superseded': '已变更，请到后台审核', 'expired': '已过期，请到后台审核'}
    label = labels[state]
    nickname = escape(((question.author.first_name.strip() or '读者') if question.author else
                       (question.guest_name or '历史提问者'))[:50])
    identity = '登录用户' if question.author_id else ('访客' if question.guest_name else '历史身份未记录')
    url = settings.PUBLIC_SITE_URL + reverse('admin:qa_question_change', args=[question.pk])
    return (f'📝 <b>書味 · 新问题{label}</b>\n\n提问者：{nickname} · {identity}\n'
            f'{label} · <code>#{question.pk}</code>\n\n{review_link(url)}')


def question_pending(question):
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return
    try:
        with transaction.atomic():
            from .moderation import fingerprint
            review, _ = TelegramReview.objects.get_or_create(question=question, defaults={
                'fingerprint': fingerprint(question),
                'expires_at': timezone.now() + timedelta(seconds=settings.TELEGRAM_NOTIFICATION_TTL),
            })
            return enqueue('telegram', {'text': question_review_text(question), 'reply_markup': review_keyboard(review)},
                           ttl=settings.TELEGRAM_NOTIFICATION_TTL)
    except Exception as error:
        logger.warning('Question notification enqueue failed: %s', type(error).__name__)
