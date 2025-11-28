# hadith/management/commands/import_bukhari.py   ← 完整正确版
import csv
import os
from django.core.management.base import BaseCommand
from hadith.models import HadithCollection, Hadith


class Command(BaseCommand):
    help = "导入布哈里圣训实录（纯净版CSV → 数据库）"

    def handle(self, *args, **options):
        # 1. 获取或创建布哈里集合
        collection, created = HadithCollection.objects.get_or_create(
            short_name="Bukhari",
            defaults={
                "name": "布哈里圣训实录",
                "arabic_name": "صحيح البخاري",
                "description": "伊斯兰六大圣训集之首，最权威",
                "is_sahih": True,
                "total_hadiths": 0,
            },
        )
        if created:
            self.stdout.write("已创建布哈里圣训集")

        # 2. 自动查找 CSV 文件（支持三种常见位置）
        possible_paths = [
            "布哈里圣训集_纯净版.csv",                                   # 根目录
            "布哈里圣训集纯净版.csv",                                     # 可能没下划线
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "布哈里圣训集_纯净版.csv"),
        ]

        csv_path = None
        for p in possible_paths:
            if os.path.exists(p):
                csv_path = p
                break

        if not csv_path:
            self.stdout.write(self.style.ERROR("找不到CSV文件！"))
            self.stdout.write("请把文件命名为 布哈里圣训集_纯净版.csv 并放到 backend 根目录")
            self.stdout.write(f"当前工作目录: {os.getcwd()}")
            return

        self.stdout.write(f"找到文件: {csv_path}")

        # 3. 开始导入
        objs = []
        count = 0
        with open(csv_path, encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            next(reader)  # 跳表头
            for row in reader:
                if len(row) < 3:
                    continue
                chapter, number, text = row[0].strip(), row[1].strip(), row[2].strip()

                objs.append(Hadith(
                    collection=collection,
                    chapter=chapter,
                    collection_number=number,
                    text=text,
                ))

                if len(objs) >= 1000:
                    Hadith.objects.bulk_create(objs, ignore_conflicts=True)
                    count += len(objs)
                    self.stdout.write(f"已导入 {count} 条...")
                    objs = []

            if objs:
                Hadith.objects.bulk_create(objs, ignore_conflicts=True)
                count += len(objs)

        collection.total_hadiths = count
        collection.save()

        self.stdout.write(self.style.SUCCESS(f"布哈里圣训集导入完成！共 {count} 条"))