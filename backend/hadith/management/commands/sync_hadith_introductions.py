"""Apply editorial copy to existing collections without reimporting any text."""
import json
import uuid
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import DatabaseError, transaction
from django.utils import timezone

from hadith.collection_introductions import COLLECTION_INTRODUCTIONS, INTRODUCTION_FIELDS
from hadith.models import HadithCollection


class Command(BaseCommand):
    help = '统一六大圣训集介绍；默认离线预览，--execute 仅更新已存在集合的作者、介绍、历史与参考来源。'
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument('--execute', action='store_true')
        parser.add_argument('--backup-dir', type=Path,
                            default=Path(settings.BASE_DIR) / 'hadith_exports' / 'collection_profiles')

    def handle(self, *args, **options):
        if not options['execute']:
            self.stdout.write(json.dumps(COLLECTION_INTRODUCTIONS, ensure_ascii=False, indent=2))
            self.stdout.write('离线预览，未访问数据库。使用 --execute 更新已存在集合。')
            return
        try:
            with transaction.atomic():
                collections = list(HadithCollection.objects.select_for_update().filter(
                    short_name__in=COLLECTION_INTRODUCTIONS).order_by('pk'))
                if not collections:
                    raise CommandError('未找到六大圣训集，不会创建空集合；请先导入正文。')
                changed = [(collection, {field: values[field] for field in INTRODUCTION_FIELDS
                                         if getattr(collection, field) != values[field]})
                           for collection in collections
                           for values in [COLLECTION_INTRODUCTIONS[collection.short_name]]]
                changed = [(collection, values) for collection, values in changed if values]
                if changed:
                    snapshot = [{'id': collection.pk, 'short_name': collection.short_name,
                                 **{field: getattr(collection, field) for field in INTRODUCTION_FIELDS}}
                                for collection, _ in changed]
                    directory = options['backup_dir']
                    directory.mkdir(parents=True, exist_ok=True)
                    backup = directory / f'{timezone.now():%Y%m%dT%H%M%S}-{uuid.uuid4().hex}.json'
                    with backup.open('x', encoding='utf-8') as output:
                        json.dump(snapshot, output, ensure_ascii=False, indent=2)
                        output.write('\n')
                    self.stdout.write(f'原介绍备份：{backup}')
                    for collection, values in changed:
                        for field, value in values.items():
                            setattr(collection, field, value)
                        collection.save(update_fields=list(values))
                missing = set(COLLECTION_INTRODUCTIONS) - {item.short_name for item in collections}
        except (DatabaseError, OSError) as error:
            raise CommandError(f'介绍更新失败，数据库事务未提交：{error}') from error
        if missing:
            self.stdout.write(f'以下集合尚不存在，已跳过：{", ".join(sorted(missing))}')
        self.stdout.write(self.style.SUCCESS(
            f'介绍同步完成：检查{len(collections)}部，更新{len(changed)}部。正文、注释、ID及中译本出版资料保持原值。'))
