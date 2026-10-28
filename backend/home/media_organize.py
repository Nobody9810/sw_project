"""Keep each article's files in <section>/<id>/ and each release note's in releases/<id>/.

Files are uploaded before an article has an ID (and editor uploads never know
their article), so they are staged first and moved here after the save commits.
Files another row also references stay where they are.
"""
import logging
import os
from pathlib import Path, PurePosixPath

from django.core.files.storage import FileSystemStorage
from django.db import transaction

from .media_refs import (UNMANAGED_DIRS, prune_empty_dirs, referenced_media_names, rewrite_html,
                         row_media_names, site_hosts, source_fields)

logger = logging.getLogger(__name__)


def media_dir(model, pk):
    from .models import ReleaseNote
    if model is ReleaseNote:
        return f'releases/{pk}'
    # The existing pinyin folders, e.g. images/wenshi/ → wenshi.
    section = model._meta.get_field('图片').upload_to.strip('/').split('/')[-1]
    return f'{section}/{pk}'


def plan_moves(model, pk, hosts=None, storage=None):
    """({old name: target folder}, shared names) for the files of one row outside its folder."""
    hosts = site_hosts() if hosts is None else hosts
    storage = storage or FileSystemStorage()
    file_fields, html_fields = source_fields(model)
    row = model.objects.filter(pk=pk).values('pk', *file_fields, *html_fields).first()
    if row is None:
        return {}, set()
    directory = media_dir(model, pk)
    candidates = {name for name in row_media_names(row, file_fields, html_fields, hosts)
                  if not name.startswith(directory + '/') and name.split('/')[0] not in UNMANAGED_DIRS
                  and storage.exists(name)}
    shared = referenced_media_names(candidates, exclude=(model, pk), hosts=hosts)
    return {name: directory for name in sorted(candidates - shared)}, shared


def organize(model, pk, hosts=None):
    """Move one row's own files into its folder and update its references; returns {old: new}."""
    from sorl.thumbnail import delete as delete_thumbnail
    hosts = site_hosts() if hosts is None else hosts
    storage = FileSystemStorage()
    moves, _ = plan_moves(model, pk, hosts, storage)
    if not moves:
        return {}
    file_fields, html_fields = source_fields(model)
    mapping = {}
    try:
        for old, directory in moves.items():
            new = storage.get_available_name(f'{directory}/{PurePosixPath(old).name}')
            Path(storage.path(new)).parent.mkdir(parents=True, exist_ok=True)
            os.rename(storage.path(old), storage.path(new))
            mapping[old] = new
        with transaction.atomic():
            row = model.objects.select_for_update().filter(pk=pk).values(*file_fields, *html_fields).first()
            if row is None:
                raise LookupError('row deleted while organizing')
            changes = {field: mapping[row[field]] for field in file_fields if row[field] in mapping}
            for field in html_fields:
                value = rewrite_html(row[field], mapping, hosts)
                if value != row[field]:
                    changes[field] = value
            # update() keeps 更新时间 and does not re-run save signals.
            if changes:
                model.objects.filter(pk=pk).update(**changes)
    except BaseException:
        for old, new in mapping.items():
            try:
                os.rename(storage.path(new), storage.path(old))
            except OSError:
                logger.exception('媒体文件归位回滚失败: %s → %s', new, old)
        raise
    for old in mapping:
        delete_thumbnail(old, delete_file=False)
        prune_empty_dirs(Path(storage.path(old)).parent)
    return mapping
