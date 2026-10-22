"""Production readiness check: reads MySQL/SQLite only, never source assets."""
from django.core.management.base import BaseCommand, CommandError
from hadith.collection_rules import COLLECTION_RULES
from hadith.models import HadithCollection
from hadith.reading_store import ReadingUnavailable, search_text, stored_reading


class Command(BaseCommand):
    help = '只读检查数据库中的六部最终阅读数据是否完整；不读取PDF/EPUB/导出文件'

    def add_arguments(self, parser):
        parser.add_argument('--collection', action='append', dest='collections')

    def handle(self, *args, **options):
        selected = set(options['collections'] or COLLECTION_RULES)
        collections = list(HadithCollection.objects.filter(short_name__in=selected).order_by('pk'))
        if selected != {c.short_name for c in collections}:
            raise CommandError('数据库缺少所选圣训集，未通过完整性检查')
        issues, total = [], 0
        for collection in collections:
            count = 0
            for row in collection.hadiths.values('id', 'chapter', 'collection_number', 'text', 'reading', 'reading_search').iterator(chunk_size=500):
                count += 1
                try:
                    payload = stored_reading(row, collection.pk)
                    if payload is None or row['reading_search'] != search_text(payload):
                        issues.append(row['id'])
                except ReadingUnavailable:
                    issues.append(row['id'])
            if not count:
                raise CommandError(f'{collection.short_name}没有正文，未通过')
            total += count
            self.stdout.write(f'{collection.short_name}：{count}条')
        if issues:
            raise CommandError(f'{len(issues)}条尚未入库、已过期或检索字段不一致；首批ID：{issues[:20]}')
        self.stdout.write(f'数据库阅读检查通过：{len(collections)}部、{total}条；不再需要运行时原书或阅读JSON。')
