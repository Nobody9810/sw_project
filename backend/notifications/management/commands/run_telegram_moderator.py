"""Outbound-only polling works on localhost, no public endpoint or login bypass."""
import signal
import time
import re
from datetime import timedelta
from uuid import uuid4

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import close_old_connections, transaction
from django.utils import timezone

from notifications.errors import DeliveryError
from notifications.models import TelegramPollCursor, TelegramReview
from notifications.moderation import handle_callback
from notifications.telegram import call_api


class Command(BaseCommand):
    help = '接收Telegram审核按钮操作（轮询，只运行一个接收进程；仍需发信worker）'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='只处理一批当前更新后退出')

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
            raise CommandError('请先配置TELEGRAM_BOT_TOKEN和TELEGRAM_CHAT_ID')
        if not re.fullmatch(r'-?[0-9]+', settings.TELEGRAM_CHAT_ID) or int(settings.TELEGRAM_CHAT_ID) == 0:
            raise CommandError('直接审核必须使用数字Chat ID，不能使用@频道名')
        if not settings.TELEGRAM_REVIEWER_IDS and not settings.TELEGRAM_CHAT_ID.isdigit():
            raise CommandError('群组审核必须设置TELEGRAM_REVIEWER_IDS，仅填写有审核权限的Telegram用户数字ID')
        token = uuid4()
        with transaction.atomic():
            cursor, _ = TelegramPollCursor.objects.get_or_create(pk=1)
            cursor = TelegramPollCursor.objects.select_for_update().get(pk=1)
            if cursor.lease_until and cursor.lease_until > timezone.now():
                raise CommandError('已有Telegram审核接收进程运行；异常退出时请等待60秒再试')
            cursor.lease_token, cursor.lease_until = token, timezone.now() + timedelta(seconds=60)
            cursor.save(update_fields=['lease_token', 'lease_until'])
        stopping = []
        previous_handlers = {}
        for name in ('SIGTERM', 'SIGINT'):
            number = getattr(signal, name)
            previous_handlers[number] = signal.signal(number, lambda *_: stopping.append(True))

        def renew():
            now = timezone.now()
            updated = TelegramPollCursor.objects.filter(pk=1, lease_token=token, lease_until__gt=now).update(
                lease_until=now + timedelta(seconds=60))
            if not updated:
                raise CommandError('审核接收租约已过期，停止旧进程以避免重复接收')

        self.stdout.write('Telegram审核接收已启动；仅处理指定聊天与授权管理员的按钮，不输出Token或消息内容。')
        try:
            while not stopping:
                close_old_connections()
                renew()
                # Telegram can randomize update IDs after a week without updates.
                # Confirmed updates disappear within 24h; reset an idle checkpoint in advance.
                if cursor.last_update_at and cursor.last_update_at < timezone.now() - timedelta(days=6):
                    cursor.next_update, cursor.last_update_at = 0, None
                    TelegramPollCursor.objects.filter(pk=1, lease_token=token).update(next_update=0, last_update_at=None)
                try:
                    updates = call_api('getUpdates', {'offset': cursor.next_update, 'limit': 100,
                                                      'timeout': 0 if options['once'] else 10,
                                                      'allowed_updates': ['callback_query']})
                except DeliveryError as error:
                    self.stderr.write(f'接收失败：{error}（409时请停止其他接收进程或移除已有Webhook）')
                    if options['once'] or error.permanent:
                        raise CommandError(str(error)) from None
                    remaining = max(error.retry_after, 2)
                    while remaining > 0 and not stopping:
                        renew()
                        delay = min(remaining, 5)
                        time.sleep(delay)
                        remaining -= delay
                    continue
                if not isinstance(updates, list):
                    raise CommandError('Telegram更新结构无效')
                for update in updates:
                    if stopping:
                        break
                    renew()
                    if not isinstance(update, dict) or type(update.get('update_id')) is not int:
                        raise CommandError('Telegram更新编号无效；未推进检查点')
                    if update['update_id'] < cursor.next_update:
                        continue
                    if 'callback_query' in update:
                        handle_callback(update['callback_query'])
                    cursor.next_update = update['update_id'] + 1
                    cursor.last_update_at = timezone.now()
                    if not TelegramPollCursor.objects.filter(pk=1, lease_token=token).update(
                            next_update=cursor.next_update, last_update_at=cursor.last_update_at):
                        raise CommandError('审核接收租约已转移')
                # Keep only 30 days of expired capabilities/audit, no reader text is retained.
                TelegramReview.objects.filter(expires_at__lt=timezone.now() - timedelta(days=30)).delete()
                if options['once']:
                    return
                if not updates:
                    time.sleep(1)
        finally:
            for number, handler in previous_handlers.items():
                signal.signal(number, handler)
            TelegramPollCursor.objects.filter(pk=1, lease_token=token).update(lease_until=timezone.now(), lease_token=None)
