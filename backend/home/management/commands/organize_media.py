"""Move existing article and release-note files into <section>/<id>/ and update their references.

Default is a dry run. Files referenced by more than one row stay where they are.
New saves are organized automatically (home.signals.after_media_save); this
command handles files saved before that existed.
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand

from home.feed_cache import invalidate_home_feed
from home.images import card_image
from home.media_organize import organize, plan_moves
from home.media_refs import article_models, site_hosts, sources


class Command(BaseCommand):
    help = '把现有文件按 <板块拼音>/<ID>/ 归位并同步数据库引用。默认只预览。'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='实际移动；默认只输出预览。')
        parser.add_argument('--mapping-file', help='--apply 时把 旧路径→新路径 写入此 JSON 文件。')

    def handle(self, *args, **options):
        hosts = site_hosts()
        moved, rows, shared, failed = {}, 0, set(), []
        for model, _, _ in sources():
            for pk in model.objects.order_by('pk').values_list('pk', flat=True):
                try:
                    if options['apply']:
                        mapping = organize(model, pk, hosts)
                    else:
                        moves, row_shared = plan_moves(model, pk, hosts)
                        mapping = {old: f'{folder}/{Path(old).name}' for old, folder in moves.items()}
                        shared |= row_shared
                except Exception as error:
                    failed.append(f'{model._meta.label}:{pk}')
                    self.stderr.write(f'失败，保持原样: {model._meta.label} {pk}: {error}')
                    continue
                rows += bool(mapping)
                moved.update(mapping)
        if options['apply']:
            invalidate_home_feed()
            if options['mapping_file']:
                Path(options['mapping_file']).write_text(json.dumps(moved, ensure_ascii=False, indent=1), encoding='utf-8')
            warmed = sum(card_image(item) is not None for model in article_models() for item in model.objects.iterator())
            self.stdout.write(self.style.SUCCESS(f'已移动 {len(moved)} 个文件（涉及 {rows} 条记录），失败 {len(failed)} 条；'
                                                 f'已生成列表缩略图 {warmed} 个'))
            return
        self.stdout.write(f'需移动 {len(moved)} 个文件（涉及 {rows} 条记录）；被多处引用而保留原位 {len(shared)} 个')
        for name in sorted(shared):
            self.stdout.write(f'  共用: {name}')
        self.stdout.write('预览完成，未修改任何文件或数据。加 --apply 执行。')
