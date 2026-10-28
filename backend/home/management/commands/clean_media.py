"""Remove what deleted or abandoned content left behind.

- media files nothing references (including editor uploads never saved and
  non-media files such as stray .php), once older than --min-age-days;
- thumbnails whose source no longer exists;
- comments, reactions, view statistics and distribution rows of deleted articles.

Default is a dry run. --apply moves files into --backup-dir (keeping their
paths) instead of deleting them, and deletes the orphan rows.
"""
import shutil
import time
from pathlib import Path

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from home.media_refs import article_models, iter_references, prune_empty_dirs


def orphan_rows():
    """(model, queryset) of rows that point at deleted articles."""
    from comment.models import Comment
    from interactions.models import UserReaction, ViewCount, ViewRecord
    from notifications.models import ArticleDistribution
    for article in article_models():
        content_type = ContentType.objects.get_for_model(article)
        existing = article.objects.values('pk')
        for model in (Comment, UserReaction, ViewCount, ViewRecord, ArticleDistribution):
            yield model, model.objects.filter(content_type=content_type).exclude(object_id__in=existing)


def known_thumbnails():
    """Thumbnail files sorl still tracks; anything else under cache/ is stale."""
    from sorl.thumbnail.conf import settings as thumbnail_settings
    from sorl.thumbnail.default import kvstore
    names = set()
    for key in kvstore._find_keys(identity='image'):
        image = kvstore._get(key)
        if image and image.name.startswith(thumbnail_settings.THUMBNAIL_PREFIX):
            names.add(image.name)
    return names


class Command(BaseCommand):
    help = '清理未被引用的媒体文件、失效缩略图，以及已删除文章残留的评论和统计。默认只预览。'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='实际清理；默认只输出预览。')
        parser.add_argument('--backup-dir', help='--apply 时必填：被移出文件的保存目录（不能位于 media 内）。')
        parser.add_argument('--min-age-days', type=float, default=2,
                            help='只处理修改时间早于此天数的文件，避免刚上传、尚未保存文章的文件被清理（默认 2）。')

    def handle(self, *args, **options):
        root = Path(settings.MEDIA_ROOT).resolve()
        backup_dir = None
        if options['apply']:
            if not options['backup_dir']:
                raise CommandError('--apply 需要 --backup-dir')
            backup_dir = Path(options['backup_dir']).resolve()
            if backup_dir.is_relative_to(root):
                raise CommandError('--backup-dir 不能位于 media 目录内')
            from sorl.thumbnail.default import kvstore
            kvstore.cleanup()  # forget thumbnails whose source is gone, deleting their files

        referenced = set()
        for _, _, names in iter_references():
            referenced |= names
        thumbnails = known_thumbnails()
        cutoff = time.time() - options['min_age_days'] * 86400
        candidates = []
        for path in sorted(root.rglob('*')):
            if not path.is_file() or path.stat().st_mtime > cutoff:
                continue
            name = path.relative_to(root).as_posix()
            top = name.split('/')[0]
            if top == 'avatars':
                continue
            if (top == 'cache' and name not in thumbnails) or (top != 'cache' and name not in referenced):
                candidates.append((name, path))

        total = sum(path.stat().st_size for _, path in candidates)
        self.stdout.write(f'未被引用的文件 {len(candidates)} 个，{total / 1048576:.1f} MB：')
        for name, path in candidates:
            self.stdout.write(f'  {path.stat().st_size / 1048576:8.2f} MB  {name}')
        counts = {}
        for model, rows in orphan_rows():
            counts[model] = counts.get(model, 0) + rows.count()
        for model, count in counts.items():
            if count:
                self.stdout.write(f'已删除文章残留的{model._meta.verbose_name}: {count} 条')

        if not backup_dir:
            self.stdout.write('预览完成，未修改任何文件或数据。加 --apply --backup-dir <目录> 执行。')
            return
        for name, path in candidates:
            target = backup_dir / 'media' / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(path, target)
            prune_empty_dirs(path.parent)
        with transaction.atomic():
            deleted = sum(rows.delete()[0] for _, rows in orphan_rows())
        self.stdout.write(self.style.SUCCESS(f'已移出 {len(candidates)} 个文件到 {backup_dir}；删除残留记录 {deleted} 条'))
