import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('notifications', '0001_initial'), ('comment', '__first__')]

    operations = [
        migrations.CreateModel(
            name='TelegramReview',
            fields=[
                ('token', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('fingerprint', models.CharField(max_length=64)),
                ('status', models.CharField(choices=[('pending', '待审核'), ('approved', '已通过'), ('rejected', '未通过'), ('superseded', '内容已变更'), ('expired', '已过期')], default='pending', max_length=16)),
                ('expires_at', models.DateTimeField(db_index=True)),
                ('processed_by', models.PositiveBigIntegerField(blank=True, null=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('comment', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='telegram_review', to='comment.comment')),
            ],
            options={'verbose_name': 'Telegram审核记录', 'verbose_name_plural': 'Telegram审核记录'},
        ),
        migrations.CreateModel(
            name='TelegramPollCursor',
            fields=[
                ('id', models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
                ('next_update', models.BigIntegerField(default=0)),
                ('last_update_at', models.DateTimeField(null=True)),
                ('lease_token', models.UUIDField(editable=False, null=True)),
                ('lease_until', models.DateTimeField(null=True)),
            ],
        ),
    ]
