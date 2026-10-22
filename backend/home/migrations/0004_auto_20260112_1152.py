from django.db import migrations

def migrate_content_intro(apps, schema_editor):
    # 获取书库模型
    Shuku = apps.get_model('home', '书库') # 确保 app 名称正确
    for item in Shuku.objects.all():
        # 如果“内容简介”有值且不是默认值，则迁移到“内容”字段
        if item.内容简介 and item.内容简介 != "暂无":
            item.内容 = item.内容简介
            item.save()

def reverse_migrate(apps, schema_editor):
    # 如果需要回滚的操作
    Shuku = apps.get_model('home', '书库')
    for item in Shuku.objects.all():
        item.内容简介 = item.内容
        item.save()

class Migration(migrations.Migration):
    dependencies = [
        # 这里会自动填充上一个迁移文件的名称，请保留原样
        ('home', '0003_alter_书库_文档_alter_古籍_文档_alter_论文_文档'), 
    ]

    operations = [
        migrations.RunPython(migrate_content_intro, reverse_migrate),
    ]