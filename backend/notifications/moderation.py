"""Telegram review callbacks: chat + administrator authorization, one-use capability, row locks."""
import hashlib
import json
import logging
import re

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from comment.models import Comment
from qa.models import Question
from .errors import DeliveryError
from .models import TelegramReview
from .queue import enqueue
from .telegram import call_api

logger = logging.getLogger(__name__)


def fingerprint(comment):
    if isinstance(comment, Question):
        values = [comment.content, comment.author_id, comment.status, comment.updated_at.isoformat()]
        if comment.guest_name:
            values.append(comment.guest_name)
        return hashlib.sha256(json.dumps(values, ensure_ascii=False).encode()).hexdigest()
    values = [comment.comment, comment.user_name, comment.content_type_id, comment.object_id,
              comment.site_id, comment.is_guest, comment.is_public, comment.is_removed, comment.updated_at.isoformat()]
    return hashlib.sha256(json.dumps(values, ensure_ascii=False).encode()).hexdigest()


def authorization_failure(query):
    sender = query.get('from')
    message = query.get('message')
    if not isinstance(sender, dict) or not isinstance(message, dict) or sender.get('is_bot'):
        return 'invalid_sender_or_message'
    chat = message.get('chat')
    if not isinstance(chat, dict) or str(chat.get('id')) != settings.TELEGRAM_CHAT_ID:
        return 'chat_mismatch'
    user_id = sender.get('id')
    if type(user_id) is not int or user_id <= 0 or type(message.get('message_id')) is not int:
        return 'invalid_sender_or_message'
    allowed = settings.TELEGRAM_REVIEWER_IDS
    if allowed:
        return None if user_id in allowed else 'reviewer_not_allowed'
    # No implicit group-admin privileges. Only the configured private-chat owner is trusted.
    return None if chat.get('type') == 'private' and str(user_id) == settings.TELEGRAM_CHAT_ID else 'private_owner_required'


def authorized(query):
    return authorization_failure(query) is None


def decide(token, action, user_id):
    initial = TelegramReview.objects.filter(token=token).values('comment_id', 'question_id').first()
    if initial is None:
        return None, None, '审核按钮已失效，请到后台处理'
    with transaction.atomic():
        # All moderation paths lock comment first, then its ticket, preventing deadlocks.
        is_question = initial['question_id'] is not None
        model = Question if is_question else Comment
        comment = model.objects.select_for_update().filter(pk=initial['question_id'] if is_question else initial['comment_id']).first()
        review = TelegramReview.objects.select_for_update().filter(token=token).first()
        if review is None or comment is None:
            return None, None, '原评论已不存在'
        if is_question:
            return decide_question(comment, review, action, user_id)
        if review.status != 'pending':
            state = review.status if fingerprint(comment) == review.fingerprint else 'superseded'
            return comment, state, '这条评论已处理，请勿重复操作'
        now = timezone.now()
        article = comment.content_object
        if review.expires_at <= now:
            state, notice = 'expired', '审核按钮已过期，请到后台处理'
        elif (fingerprint(comment) != review.fingerprint or comment.is_public or comment.is_removed
              or comment.site_id != settings.SITE_ID or not getattr(article, '发布状态', False)):
            state, notice = 'superseded', '评论或原文章已变更，请到后台重新审核'
        elif action == 'a':
            state, notice = 'approved', '已通过，评论现已公开'
        else:
            state, notice = 'rejected', '已标记不通过，评论保留在后台'
        if state in {'approved', 'rejected'}:
            Comment.objects.filter(pk=comment.pk).update(is_public=state == 'approved', updated_at=now)
            comment.is_public = state == 'approved'
            comment.updated_at = now
        review.status, review.processed_by, review.processed_at = state, user_id, now
        review.fingerprint = fingerprint(comment)
        review.save(update_fields=['status', 'processed_by', 'processed_at', 'fingerprint'])
        return comment, state, notice


def decide_question(question, review, action, user_id):
    """Called under the same target-then-ticket locks used by comment moderation."""
    if review.status != 'pending':
        state = review.status if fingerprint(question) == review.fingerprint else 'superseded'
        return question, state, '这个问题已处理，请勿重复操作'
    now = timezone.now()
    if review.expires_at <= now:
        state, notice = 'expired', '审核按钮已过期，请到后台处理'
    elif fingerprint(question) != review.fingerprint or question.status != 'draft':
        state, notice = 'superseded', '问题已变更，请到后台重新审核'
    elif action == 'a':
        state, notice = 'approved', '已通过，问题已公开，请到后台添加回答'
    else:
        state, notice = 'rejected', '问题未通过，内容保留在后台'
    if state in {'approved', 'rejected'}:
        question.status = 'published' if state == 'approved' else 'rejected'
        question.updated_at = now
        Question.objects.filter(pk=question.pk).update(status=question.status, updated_at=now)
    review.status, review.processed_by, review.processed_at = state, user_id, now
    review.fingerprint = fingerprint(question)
    review.save(update_fields=['status', 'processed_by', 'processed_at', 'fingerprint'])
    return question, state, notice


def handle_callback(query):
    if not isinstance(query, dict) or not isinstance(query.get('id'), str):
        return
    logger.info('Telegram review callback received')
    denied = authorization_failure(query)
    if denied:
        notice = '无审核权限'
        logger.warning('Telegram review callback rejected: reason=%s', denied)
    else:
        data = query.get('data')
        match = re.fullmatch(r'r:([ar]):([0-9a-f]{32})', data) if isinstance(data, str) else None
        if not match:
            notice = '无效的审核按钮'
            logger.warning('Telegram review callback rejected: reason=invalid_button')
        else:
            comment, state, notice = decide(match[2], match[1], query['from']['id'])
            if comment is None:
                logger.warning('Telegram review callback rejected: reason=unknown_or_replaced_button')
            else:
                if isinstance(comment, Question):
                    logger.info('Telegram review result: question_id=%s state=%s', comment.pk, state)
                else:
                    logger.info('Telegram review result: comment_id=%s state=%s public=%s',
                                comment.pk, state, comment.is_public)
            if comment is not None:
                from .events import review_text, question_review_text
                try:
                    with transaction.atomic():
                        enqueue('telegram', {'method': 'editMessageText',
                                             'message_id': query['message']['message_id'],
                                             'text': (question_review_text(comment, state) if isinstance(comment, Question)
                                                      else review_text(comment, comment.content_object, state)),
                                             'reply_markup': {'inline_keyboard': []}}, ttl=86400)
                except Exception as error:
                    # The moderation decision is already committed. Never undo it for delivery.
                    logger.warning('Telegram review result enqueue failed: %s', type(error).__name__)
    try:
        call_api('answerCallbackQuery', {'callback_query_id': query['id'], 'text': notice, 'show_alert': True})
    except DeliveryError as error:
        logger.warning('Telegram callback acknowledgement failed: %s', error)
