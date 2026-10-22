from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('hadith', '0004_collection_profiles')]
    operations = [migrations.AddField(
        model_name='hadithcollection', name='data_quality',
        field=models.JSONField(default=dict, blank=True, verbose_name='数据校对状态'),
    )]
