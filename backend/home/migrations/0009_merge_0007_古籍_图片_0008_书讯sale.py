# Merge existing home migration branches

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0007_古籍_图片'),
        ('home', '0008_remove_书讯sale_service_time_remove_书讯sale_wechat_qr_and_more'),
    ]

    operations = []
