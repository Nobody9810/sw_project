"""Read-only channel-bot diagnostics; never prints credentials or article content."""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count

from notifications.errors import DeliveryError
from notifications.models import ArticleDistribution
from notifications.publishing import configuration_error, public_origin_valid, local_test_mode
from notifications.telegram import call_api


class Command(BaseCommand):
    help = '检查文章发布机器人的独立配置及分发状态；--verify 验证频道发帖权限，不发送消息'

    def add_arguments(self, parser):
        parser.add_argument('--verify', action='store_true', help='只读访问 Telegram，验证机器人和频道权限')

    def handle(self, *args, **options):
        # Permission diagnostics contain no article URL and work on localhost.
        error = configuration_error(require_public_url=False)
        if error:
            raise CommandError(error)
        self.stdout.write('独立发布机器人与频道已配置；不会使用后台审核机器人的凭据。')
        public_url_ready = public_origin_valid()
        if not public_url_ready:
            self.stdout.write(self.style.WARNING(
                '当前为本地或非公开 HTTPS 地址：仍可检查频道权限；正式文章发送需配置公开 HTTPS 网站地址，localhost 链接无法供读者访问。'))
        if local_test_mode():
            self.stdout.write('本地测试模式可用：后台可发送标注为本地测试、不含阅读链接的消息。')
        counts = dict(ArticleDistribution.objects.values('status').annotate(n=Count('pk')).values_list('status', 'n'))
        self.stdout.write('文章分发：' + '；'.join(f'{key}={counts.get(key, 0)}' for key in ('queued', 'sending', 'sent', 'failed', 'unknown')))
        if not options['verify']:
            self.stdout.write('尚未验证网络或频道权限；可加 --verify 只读检查。')
            return
        def api(method, data):
            return call_api(method, data, bot_token=settings.TELEGRAM_PUBLISH_BOT_TOKEN)
        try:
            bot = api('getMe', {})
            if not isinstance(bot, dict) or type(bot.get('id')) is not int:
                raise CommandError('机器人身份响应不完整。')
            channel = api('getChat', {'chat_id': settings.TELEGRAM_PUBLISH_CHANNEL_ID})
            if not isinstance(channel, dict) or channel.get('type') != 'channel':
                raise CommandError('接收目标必须是频道，不能使用管理员私聊或讨论群。')
            member = api('getChatMember', {'chat_id': settings.TELEGRAM_PUBLISH_CHANNEL_ID, 'user_id': bot['id']})
            if not isinstance(member, dict) or member.get('status') != 'administrator' or not member.get('can_post_messages'):
                raise CommandError('请将发布机器人设为频道管理员，并开启发布消息权限。')
        except DeliveryError as exc:
            raise CommandError(str(exc)) from None
        self.stdout.write(self.style.SUCCESS('机器人身份、频道类型和发布权限通过；未发送消息。'))
        self.stdout.write('请用一篇已发布文章验证实际投递。' if public_url_ready else
                          '频道权限验证已完成；本地 PUBLIC_SITE_URL 可保持不变，正式文章通知需在上线配置公开域名后验收。')
