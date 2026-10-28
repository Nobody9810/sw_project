"""Optimize every PDF under MEDIA_ROOT in place (same file name, so no database change).

Default is a dry run. --apply copies each replaced original into --backup-dir
first and writes report.json there. Files that would not clearly improve are
left untouched, so reruns skip finished files.
"""
import json
import os
import shutil
import tempfile
import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from home.pdfs import optimize_pdf


class Command(BaseCommand):
    help = '压缩 media 中所有 PDF 的页面图片（150 dpi）并线性化，文件名不变。默认只预览。'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='实际替换；默认只输出预览。')
        parser.add_argument('--backup-dir', help='--apply 时必填：原文件和 report.json 的保存目录（不能位于 media 内）。')
        parser.add_argument('--limit', type=int, help='最多处理的文件数，从大文件开始。')

    def handle(self, *args, **options):
        media_root = Path(settings.MEDIA_ROOT).resolve()
        backup_dir = None
        if options['apply']:
            if not options['backup_dir']:
                raise CommandError('--apply 需要 --backup-dir')
            backup_dir = Path(options['backup_dir']).resolve()
            if backup_dir.is_relative_to(media_root):
                raise CommandError('--backup-dir 不能位于 media 目录内')
        files = sorted((path for path in media_root.rglob('*')
                        if path.is_file() and path.suffix.lower() == '.pdf'
                        and path.relative_to(media_root).parts[0] != 'cache'),
                       key=lambda path: path.stat().st_size, reverse=True)[:options['limit']]
        report, before_total, after_total, failed = [], 0, 0, []
        for index, path in enumerate(files, 1):
            name = path.relative_to(media_root).as_posix()
            with tempfile.NamedTemporaryFile(suffix='.pdf', dir=path.parent, delete=False) as staged:
                staged_path = Path(staged.name)
            started = time.monotonic()
            try:
                before = path.stat().st_size
                if not optimize_pdf(path, staged_path):
                    self.stdout.write(f'[{index}/{len(files)}] 保持原样 {before / 1048576:.1f} MB  {name}')
                    continue
                after = staged_path.stat().st_size
                if backup_dir:
                    target = backup_dir / 'media' / name
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(path, target)
                    os.chmod(staged_path, path.stat().st_mode & 0o777)
                    os.replace(staged_path, path)
                before_total += before
                after_total += after
                report.append({'file': name, 'before': before, 'after': after})
                self.stdout.write(f'[{index}/{len(files)}] {before / 1048576:.1f} MB → {after / 1048576:.1f} MB '
                                  f'({time.monotonic() - started:.0f}s)  {name}')
            except Exception as error:
                failed.append(name)
                self.stderr.write(f'[{index}/{len(files)}] 失败，保留原文件: {name}: {error}')
            finally:
                staged_path.unlink(missing_ok=True)
        if backup_dir:
            backup_dir.mkdir(parents=True, exist_ok=True)
            (backup_dir / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
        action = '已替换' if backup_dir else '可优化'
        self.stdout.write(f'共 {len(files)} 个 PDF；{action} {len(report)} 个：{before_total / 1048576:.0f} MB → '
                          f'{after_total / 1048576:.0f} MB；失败 {len(failed)} 个')
        if not backup_dir:
            self.stdout.write('预览完成，未修改任何文件。加 --apply --backup-dir <目录> 执行。')
