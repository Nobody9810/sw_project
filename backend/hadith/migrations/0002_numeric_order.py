from django.db import migrations, models


def populate_order(apps, schema_editor):
    from hadith.ordering import chapter_order, number_order
    Hadith = apps.get_model('hadith', 'Hadith')
    alias = schema_editor.connection.alias
    batch = []
    for item in Hadith.objects.using(alias).all().iterator(chunk_size=500):
        item.chapter_order = chapter_order(item.chapter)
        item.number_order = number_order(item.collection_number)
        batch.append(item)
        if len(batch) == 500:
            Hadith.objects.using(alias).bulk_update(batch, ['chapter_order', 'number_order'])
            batch = []
    if batch:
        Hadith.objects.using(alias).bulk_update(batch, ['chapter_order', 'number_order'])


class Migration(migrations.Migration):
    dependencies = [('hadith', '0001_initial')]
    operations = [
        migrations.AddField(model_name='hadith', name='chapter_order', field=models.PositiveIntegerField(default=0, editable=False)),
        migrations.AddField(model_name='hadith', name='number_order', field=models.PositiveIntegerField(default=0, editable=False)),
        migrations.RunPython(populate_order, migrations.RunPython.noop),
        migrations.AlterModelOptions(name='hadith', options={'ordering': ['collection', 'chapter_order', 'number_order', 'id'], 'verbose_name': '圣训', 'verbose_name_plural': '全部圣训'}),
        migrations.AddIndex(model_name='hadith', index=models.Index(fields=['collection', 'chapter_order', 'number_order'], name='hadith_numeric_order')),
    ]
