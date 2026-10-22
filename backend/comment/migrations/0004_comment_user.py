from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('comment', '0003_comment_guest_identity'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [migrations.AddField(
        model_name='comment', name='user',
        field=models.ForeignKey(blank=True, null=True,
            on_delete=django.db.models.deletion.SET_NULL,
            related_name='article_comments', to=settings.AUTH_USER_MODEL, verbose_name='关联账户'),
    )]
