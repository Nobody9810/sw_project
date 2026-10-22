from datetime import datetime

from django.db import migrations
from django.utils import timezone


def seed(apps, schema_editor):
    date = datetime(2026, 10, 22, 0, 0)
    if timezone.is_aware(timezone.now()):
        date = timezone.make_aware(date)
    apps.get_model('home', 'ReleaseNote').objects.using(schema_editor.connection.alias).get_or_create(
        version='2026.10', defaults={
            'title': '书味更新：阅读与交流的新体验',
            'summary': '六部圣训、古兰经诵读、账户与交流功能现已上线，欢迎探索。',
            'published_at': date, 'is_published': True, 'notify': True,
            'content': '''<h2>经训阅读</h2><p>完整六部圣训集现已上线，支持搜索、篇章定位，以及统一的正文与注释展示。<a href="/经训/">前往经训</a></p>
<h2>古兰经诵读</h2><p>阅读中文译文、选择诵读者，切换单节与连续播放。具有完整时间轴的录音支持逐字高亮。古兰经入口位于经训页面。</p>
<h2>账户与交流</h2><p>支持邮箱和 Google 登录、修改个人资料。登录后评论、提问和反馈关联账户；访客也可以参与。<a href="/登录/">前往账户</a> · <a href="/问答/">前往问答</a></p>
<h2>阅读体验</h2><p>支持深浅主题切换，优化手机端导航与阅读交互，文章底部可以直接前往上一篇和下一篇。</p>
<h2>礼拜时间</h2><p>授权定位后查看当地礼拜时间和下一番提醒，也可以通过页面右下角的工具入口查看。<a href="/礼拜时间/">查看礼拜时间</a></p>''',
        })


class Migration(migrations.Migration):
    dependencies = [('home', '0012_release_notes')]
    # Rollback must not remove editorial content that may have been edited.
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
