"""Convert referenced cover and rich-text images to WebP masters and update every reference.

Default is a dry run. --apply writes new files, updates the database in one
transaction, then moves the replaced originals into --backup-dir together with
mapping.json. Rerunning skips images that already comply.
"""
import json
import shutil
from collections import defaultdict
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from sorl.thumbnail import delete as delete_thumbnail

from home.feed_cache import invalidate_home_feed
from home.images import card_image, is_image_name, to_webp, webp_name
from home.media_refs import (article_models, html_media_names, rewrite_html, safe_media_name, site_hosts,
                             sources)


class Command(BaseCommand):
    help = '把文章头图和正文图片统一为 WebP 原图（长边 ≤1600px），同步数据库引用并移出旧文件。默认只预览。'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='实际写入；默认只输出预览。')
        parser.add_argument('--backup-dir', help='--apply 时必填：旧原图和 mapping.json 的保存目录（不能位于 media 内）。')
        parser.add_argument('--site-host', action='append', default=[],
                            help='正文中视为本站媒体的绝对地址主机名，可重复；默认取 PUBLIC_SITE_URL 及其 www 变体。')
        parser.add_argument('--skip-thumbnails', action='store_true', help='完成后不预先生成列表缩略图。')

    def handle(self, *args, **options):
        self.storage = FileSystemStorage()
        self.media_root = Path(settings.MEDIA_ROOT).resolve()
        self.site_hosts = site_hosts() | set(options['site_host'])
        backup_dir = None
        if options['apply']:
            if not options['backup_dir']:
                raise CommandError('--apply 需要 --backup-dir')
            backup_dir = Path(options['backup_dir']).resolve()
            if backup_dir.is_relative_to(self.media_root):
                raise CommandError('--backup-dir 不能位于 media 目录内')

        references = self.collect_references()
        plan, report = self.plan(references)
        self.print_report(plan, report, references)
        if not options['apply']:
            self.stdout.write('预览完成，未修改任何文件或数据。加 --apply --backup-dir <目录> 执行。')
            return
        if plan:
            mapping = self.write_and_relink(plan, references)
            self.retire_originals(mapping, references, backup_dir)
            invalidate_home_feed()
            self.stdout.write(self.style.SUCCESS(f'已转换 {len(mapping)} 张图片；旧文件与 mapping.json 位于 {backup_dir}'))
        if not options['skip_thumbnails']:
            self.stdout.write(f'已生成列表缩略图 {self.warm_thumbnails()} 个')

    # ---------- references ----------

    def collect_references(self):
        """{media name: {'fields': [(model, pk, field)], 'html': {(model, pk)}}} for local images."""
        references = defaultdict(lambda: {'fields': [], 'html': set()})
        for model, file_fields, html_fields in sources():
            for row in model.objects.values('pk', *file_fields, *html_fields).iterator(chunk_size=200):
                for field in file_fields:
                    name = safe_media_name(row[field])
                    if name and is_image_name(name):
                        references[name]['fields'].append((model, row['pk'], field))
                for field in html_fields:
                    for name in html_media_names(row[field], self.site_hosts):
                        if is_image_name(name):
                            references[name]['html'].add((model, row['pk']))
        return references

    # ---------- conversion ----------

    def plan(self, references):
        plan = {}
        report = {'missing': [], 'kept': [], 'compliant': 0}
        for name in sorted(references):
            path = Path(self.storage.path(name))
            if not path.is_file():
                report['missing'].append(name)
                continue
            data = path.read_bytes()
            converted = to_webp(data)
            if converted is None:
                report['kept'].append(name)
            elif converted is data and name.lower().endswith('.webp'):
                report['compliant'] += 1
            else:
                plan[name] = (len(data), converted)
        return plan, report

    def print_report(self, plan, report, references):
        before = sum(size for size, _ in plan.values())
        after = sum(len(data) for _, data in plan.values())
        self.stdout.write(f'被引用的本站图片 {len(references)} 张：需转换 {len(plan)}，已符合 {report["compliant"]}，'
                          f'保留原样（动图或无法读取）{len(report["kept"])}，文件缺失 {len(report["missing"])}')
        self.stdout.write(f'转换前 {before / 1048576:.1f} MB → 转换后 {after / 1048576:.1f} MB')
        orphans = [path for path in self.media_root.rglob('*') if path.is_file() and is_image_name(path.name)
                   and path.relative_to(self.media_root).parts[0] not in ('cache', 'avatars')
                   and path.relative_to(self.media_root).as_posix() not in references]
        self.stdout.write(f'media 中未被引用的图片 {len(orphans)} 张，'
                          f'{sum(path.stat().st_size for path in orphans) / 1048576:.1f} MB（本命令不处理）')
        for name in report['missing']:
            self.stdout.write(f'  缺失: {name}')
        for name in report['kept']:
            self.stdout.write(f'  保留: {name}')

    def write_and_relink(self, plan, references):
        mapping = {}
        try:
            for name, (_, data) in plan.items():
                mapping[name] = self.storage.save(webp_name(name), ContentFile(data))
            with transaction.atomic():
                self.relink(mapping, references)
        except BaseException:
            for new_name in mapping.values():
                self.storage.delete(new_name)
            raise
        return mapping

    def relink(self, mapping, references):
        # update() keeps 更新时间 and skips save()-time signals and conversion.
        for old, new in mapping.items():
            for model, pk, field in references[old]['fields']:
                model.objects.filter(pk=pk, **{field: old}).update(**{field: new})
        rows = defaultdict(set)
        for old in mapping:
            for model, pk in references[old]['html']:
                rows[model].add(pk)
        html_fields = {model: fields for model, _, fields in sources()}
        for model, pks in rows.items():
            fields = html_fields[model]
            for row in model.objects.select_for_update().filter(pk__in=pks).values('pk', *fields):
                changed = {field: rewrite_html(row[field], mapping, self.site_hosts) for field in fields}
                changed = {field: value for field, value in changed.items() if value != row[field]}
                if changed:
                    model.objects.filter(pk=row['pk']).update(**changed)

    # ---------- cleanup ----------

    def retire_originals(self, mapping, references, backup_dir):
        backup_dir.mkdir(parents=True, exist_ok=True)
        records = []
        for old, new in mapping.items():
            delete_thumbnail(old, delete_file=False)
            target = backup_dir / 'media' / old
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(self.storage.path(old), target)
            records.append({'old': old, 'new': new,
                            'fields': [f'{model._meta.label}:{pk}:{field}' for model, pk, field in references[old]['fields']],
                            'html': sorted(f'{model._meta.label}:{pk}' for model, pk in references[old]['html'])})
        (backup_dir / 'mapping.json').write_text(json.dumps(records, ensure_ascii=False, indent=1), encoding='utf-8')

    def warm_thumbnails(self):
        count = 0
        for model in article_models():
            for item in model.objects.iterator(chunk_size=100):
                count += card_image(item) is not None
        return count
