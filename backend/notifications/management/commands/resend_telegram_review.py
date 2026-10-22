"""Explicitly replace an unhandled capability; old messages cannot acquire buttons retroactively."""
from datetime import timedelta
from uuid import uuid4

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from comment.models import Comment
from qa.models import Question
from notifications.events import comment_pending, question_pending
from notifications.models import TelegramReview
from notifications.moderation import fingerprint


class Command(BaseCommand):
    help = '为指定待审核评论或问题重新发送带审核按钮的提醒，旧按钮随之失效'

    def add_arguments(self, parser):
        targets = parser.add_mutually_exclusive_group(required=True)
        targets.add_argument('--comment', type=int, help='评论编号（不是发信队列任务编号）')
        targets.add_argument('--question', type=int, help='问答问题编号')

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
            raise CommandError('请先配置Telegram Token与Chat ID')
        with transaction.atomic():
            is_question = options.get('question') is not None
            kind = '问题' if is_question else '评论'
            if is_question:
                comment = Question.objects.select_for_update().filter(pk=options['question'], status='draft').first()
                if comment is None:
                    raise CommandError('问题不存在或不是待审核状态')
            else:
                comment = Comment.objects.select_for_update().filter(pk=options['comment'], site_id=settings.SITE_ID,
                                                                     is_public=False, is_removed=False).first()
                if comment is None or not getattr(comment.content_object, '发布状态', False):
                    raise CommandError('评论不存在、已公开/移除或原文章未发布')
            target = {'question' if is_question else 'comment': comment}
            review = TelegramReview.objects.select_for_update().filter(**target).first()
            if review and review.status in {'approved', 'rejected'}:
                raise CommandError(f'该{kind}已有Telegram审核结果，请在后台处理，不重复发起审核')
            if review:
                TelegramReview.objects.filter(token=review.token).update(
                    token=uuid4(), fingerprint=fingerprint(comment), status='pending', processed_by=None,
                    processed_at=None, expires_at=timezone.now() + timedelta(seconds=settings.TELEGRAM_NOTIFICATION_TTL))
            message = question_pending(comment) if is_question else comment_pending(comment, comment.content_object)
            if message is None:
                raise CommandError('提醒未能入队，请检查通知表迁移及后端日志')
        self.stdout.write(f'{kind} #{comment.pk} 的带按钮提醒已入队 #{message.pk}；由发信worker投递。')
