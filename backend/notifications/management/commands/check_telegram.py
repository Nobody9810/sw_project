"""Explicit operator diagnostics; never prints bot tokens or message content."""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count
from django.utils import timezone
import re

from notifications.errors import DeliveryError
from notifications.queue import enqueue
from notifications.telegram import call_api, inline_button_count
from notifications.models import OutboundMessage, TelegramPollCursor, TelegramReview

SAFE_ERRORS = {'telegram_not_configured', 'telegram_network_error', 'telegram_rate_limited',
               'telegram_chat_not_found', 'telegram_bot_blocked', 'telegram_chat_permission_denied',
               'telegram_invalid_message_format', 'telegram_invalid_link', 'telegram_invalid_operation',
               'attempt_limit', 'expired before delivery'}


class Command(BaseCommand):
    help = '检查Telegram配置；可发现Chat ID或将测试提醒加入队列（不输出Token）'

    def add_arguments(self, parser):
        actions = parser.add_mutually_exclusive_group()
        actions.add_argument('--discover-chat', action='store_true', help='读取机器人最近收到消息的Chat ID，不显示消息或昵称')
        actions.add_argument('--test', action='store_true', help='将一条不含读者资料的测试提醒加入异步队列')
        actions.add_argument('--status', action='store_true', help='只读检查待发送/失败队列，不显示提醒内容或Token')

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN:
            raise CommandError('请在根目录.env设置TELEGRAM_BOT_TOKEN，再重启后端和worker')
        if options['discover_chat']:
            try:
                updates = call_api('getUpdates', {'limit': 20, 'timeout': 0})
            except DeliveryError as error:
                raise CommandError(str(error)) from None
            found = set()
            for update in updates if isinstance(updates, list) else []:
                if not isinstance(update, dict):
                    continue
                for field in ('message', 'channel_post', 'my_chat_member'):
                    event = update.get(field)
                    chat = event.get('chat') if isinstance(event, dict) else None
                    if isinstance(chat, dict) and type(chat.get('id')) is int:
                        found.add(chat['id'])
            for identifier in sorted(found):
                self.stdout.write(f'Chat ID: {identifier}')
            if not found:
                self.stdout.write('尚无可用Chat ID：先在Telegram给机器人发送/start，再运行此命令。已有webhook或其他消费者时，请从现有机器人配置取得Chat ID。')
            return
        if not settings.TELEGRAM_CHAT_ID:
            raise CommandError('请先给机器人发送/start，运行check_telegram --discover-chat取得TELEGRAM_CHAT_ID并填入.env')
        self.stdout.write('Telegram Token与Chat ID均已设置（尚未验证网络或投递）')
        if options['status']:
            try:
                messages = OutboundMessage.objects.filter(channel='telegram')
                counts = dict(messages.values('status').annotate(count=Count('pk')).values_list('status', 'count'))
                self.stdout.write('Telegram队列：' + '；'.join(f'{name}={counts.get(name, 0)}' for name in ('pending', 'sending', 'failed')))
                for message in messages.order_by('-pk')[:10]:
                    code = message.last_error
                    safe = code if code in SAFE_ERRORS or re.fullmatch(r'telegram_http_[1-5][0-9]{2}', code) else ('none' if not code else 'other_error')
                    method = message.payload.get('method', 'sendMessage') if isinstance(message.payload, dict) else 'unknown'
                    method = method if method in {'sendMessage', 'editMessageText'} else 'unknown'
                    self.stdout.write(f'#{message.pk} status={message.status} attempts={message.attempts} error={safe} '
                                      f'method={method} buttons={inline_button_count(message.payload)}')
                if messages.filter(status='pending', attempts=0, available_at__lte=timezone.now()).exists():
                    self.stdout.write('有尚未领取的任务：确认独立worker正在运行，并在修改.env后重启Django和worker。')
                if not counts:
                    self.stdout.write('队列为空：可能未入队或已成功发送（成功会删除记录）；请结合worker的delivered日志判断。')
                reviews = TelegramReview.objects.select_related('comment', 'question').order_by('-expires_at')[:5]
                from notifications.moderation import fingerprint
                found = False
                for review in reviews:
                    found = True
                    status = review.get_status_display() if review.status in dict(TelegramReview._meta.get_field('status').choices) else '未知'
                    target = review.comment if review.comment_id else review.question
                    kind = '评论' if review.comment_id else '问题'
                    public = target.is_public if review.comment_id else target.status == 'published'
                    removed = target.is_removed if review.comment_id else False
                    self.stdout.write(f'审核记录：{kind} #{target.pk}；{status}；'
                                      f'已过期={review.expires_at <= timezone.now()}；网页公开={public}；'
                                      f'已移除={removed}；内容与状态匹配={fingerprint(target) == review.fingerprint}')
                if not found:
                    self.stdout.write('尚无Telegram审核记录：当前数据库没有新版评论审核提醒记录。')
                cursor = TelegramPollCursor.objects.filter(pk=1).first()
                active = bool(cursor and cursor.lease_token and cursor.lease_until and cursor.lease_until > timezone.now())
                self.stdout.write(f'审核接收进程有效租约：{"有" if active else "无"}（仅影响按钮点击后的处理，不影响按钮显示）')
            except Exception as error:
                raise CommandError(f'队列检查失败：{type(error).__name__}（检查数据库连接与迁移）') from None
        if options['test']:
            message = enqueue('telegram', {'text': '📝 书味通知测试\n异步通知渠道已连接；此消息不含读者资料。'},
                              ttl=settings.TELEGRAM_NOTIFICATION_TTL)
            self.stdout.write(f'测试提醒已入队 #{message.pk}；请运行run_outbound_worker投递。入队不代表投递成功。')
            self.stdout.write('这是普通渠道测试，不含通过／不通过按钮。审核按钮请用真实待审核评论测试。')
