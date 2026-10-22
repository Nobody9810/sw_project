"""Long-running delivery worker for the database outbox (run under systemd/Supervisor)."""
import signal
import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from notifications.queue import process, purge_failed


class Command(BaseCommand):
    help = '发送数据库队列中的外部消息（登录邮件等），失败自动重试'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='处理当前到期的消息后退出')
        parser.add_argument('--interval', type=float, default=2.0, help='队列为空时的轮询间隔（秒）')

    def handle(self, *args, once=False, interval=2.0, **options):
        stopping = []
        for name in ('SIGTERM', 'SIGINT'):
            signal.signal(getattr(signal, name), lambda *_: stopping.append(True))
        last_purge = 0.0
        while not stopping:
            close_old_connections()
            if time.monotonic() - last_purge > 3600:
                purge_failed()
                last_purge = time.monotonic()
            handled = process()
            if once:
                if handled:
                    continue
                return
            if not handled:
                time.sleep(interval)
