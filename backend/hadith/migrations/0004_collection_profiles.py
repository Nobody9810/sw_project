from django.db import migrations


def seed_profiles(apps, schema_editor):
    from hadith.collection_profiles import fill_collection_profiles
    fill_collection_profiles(apps.get_model('hadith', 'HadithCollection'), schema_editor.connection.alias)


class Migration(migrations.Migration):
    dependencies = [('hadith', '0003_hadithcollection_author_hadithcollection_edition_and_more')]
    operations = [migrations.RunPython(seed_profiles, migrations.RunPython.noop)]
