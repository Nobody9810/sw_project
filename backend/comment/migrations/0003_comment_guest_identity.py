from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('comment', '0002_migrate_old_comments')]

    operations = [
        migrations.AddField(
            model_name='comment', name='is_guest',
            field=models.BooleanField(default=None, null=True, verbose_name='访客评论'),
        ),
        migrations.AlterField(
            model_name='comment', name='user_email',
            field=models.EmailField(blank=True, max_length=254, verbose_name='邮箱'),
        ),
    ]
