# Generated for GuJi PDF cover previews

import sorl.thumbnail.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0006_书讯sale'),
    ]

    operations = [
        migrations.AddField(
            model_name='古籍',
            name='图片',
            field=sorl.thumbnail.fields.ImageField(
                default='null',
                null=True,
                upload_to='images/guji/',
                verbose_name='封面图片',
            ),
        ),
    ]
