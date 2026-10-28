"""Where stored media is referenced: article file fields, rich text and release notes.

Organizing, edit/delete cleanup and the media commands share these rules, so a
file is only moved or removed when nothing else points at it.
"""
import html
import os
import re
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

from django.conf import settings

HTML_FIELDS = ('内容', '作者简介', '目录', '前言', '内容简介')
EMPTY_NAMES = (None, '', 'null', 'None')
# Managed elsewhere: sorl thumbnails and user avatars.
UNMANAGED_DIRS = ('cache', 'avatars')
URL_ATTRIBUTE = re.compile(r"""(\s(src|href|srcset)\s*=\s*)("([^"]*)"|'([^']*)')""", re.I)


def article_models():
    from .models import 通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库
    return (通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库)


def sources():
    """(model, file field names, rich-text field names) for every model that references media."""
    from .models import ReleaseNote
    for model in article_models():
        fields = model._meta.fields
        yield (model, [field.name for field in fields if hasattr(field, 'upload_to')],
               [field.name for field in fields if field.name in HTML_FIELDS])
    yield ReleaseNote, [], ['content']


def source_fields(model):
    for source, file_fields, html_fields in sources():
        if source is model:
            return file_fields, html_fields
    return None


def safe_media_name(name):
    if not name or name in EMPTY_NAMES or '\\' in name:
        return None
    root = Path(settings.MEDIA_ROOT).resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root) or target == root:
        return None
    return target.relative_to(root).as_posix()


def site_hosts():
    """Hosts whose absolute /media/ URLs are this site's own files."""
    hosts = set(getattr(settings, 'MEDIA_FILE_HOSTS', []))
    for url in (os.getenv('PUBLIC_SITE_URL', ''), settings.MEDIA_URL):
        host = urlparse(url).hostname
        if host:
            bare = host.removeprefix('www.')
            hosts |= {bare, 'www.' + bare}
    return hosts


def media_name(url, hosts=None):
    """The local media name a URL points at, or None for external and unsafe URLs."""
    parsed = urlparse(html.unescape(str(url)).strip())
    if parsed.scheme and parsed.scheme not in ('http', 'https'):
        return None
    if parsed.netloc:
        if parsed.hostname not in (site_hosts() if hosts is None else hosts):
            return None
    prefix = urlparse(settings.MEDIA_URL).path.rstrip('/') + '/'
    path = unquote(parsed.path)
    if not path.startswith(prefix):
        return None
    return safe_media_name(path[len(prefix):])


def _urls(attribute, value):
    if attribute.lower() != 'srcset':
        return [value]
    return [candidate.split()[0] for candidate in value.split(',') if candidate.strip()]


def html_media_names(value, hosts=None):
    hosts = site_hosts() if hosts is None else hosts
    names = set()
    for match in URL_ATTRIBUTE.finditer(str(value or '')):
        for url in _urls(match.group(2), match.group(4) if match.group(4) is not None else match.group(5)):
            name = media_name(url, hosts)
            if name:
                names.add(name)
    return names


def rewrite_html(value, mapping, hosts=None):
    """Point src/href/srcset URLs of mapped files at their new names; other text is unchanged."""
    if not value or not mapping:
        return value
    hosts = site_hosts() if hosts is None else hosts

    def replace_url(url):
        name = media_name(url, hosts)
        return html.escape(settings.MEDIA_URL + quote(mapping[name])) if name in mapping else url

    def replace(match):
        attribute = match.group(2)
        value = match.group(4) if match.group(4) is not None else match.group(5)
        if attribute.lower() == 'srcset':
            candidates = [candidate.strip().split(None, 1) for candidate in value.split(',') if candidate.strip()]
            if all(replace_url(url) == url for url, *_ in candidates):
                return match.group(0)
            new_value = ', '.join(' '.join([replace_url(url), *rest]) for url, *rest in candidates)
        else:
            new_value = replace_url(value)
            if new_value == value:
                return match.group(0)
        return f'{match.group(1)}"{new_value}"'

    return URL_ATTRIBUTE.sub(replace, str(value))


def row_media_names(row, file_fields, html_fields, hosts=None):
    """Names referenced by a values() row or a model instance."""
    get = row.get if isinstance(row, dict) else lambda name: getattr(row, name)
    names = set()
    for field in file_fields:
        value = get(field)
        name = safe_media_name(getattr(value, 'name', value))
        if name:
            names.add(name)
    for field in html_fields:
        names |= html_media_names(get(field), hosts)
    return names


def instance_media_names(instance, hosts=None):
    fields = source_fields(type(instance))
    return row_media_names(instance, *fields, hosts) if fields else set()


def iter_references(hosts=None, exclude=None):
    """Yield (model, pk, names) for every source row except exclude=(model, pk)."""
    hosts = site_hosts() if hosts is None else hosts
    for model, file_fields, html_fields in sources():
        for row in model.objects.values('pk', *file_fields, *html_fields).iterator(chunk_size=200):
            if exclude and exclude == (model, row['pk']):
                continue
            yield model, row['pk'], row_media_names(row, file_fields, html_fields, hosts)


def referenced_media_names(candidates, exclude=None, hosts=None):
    """The subset of candidates that some source row (other than exclude) references."""
    candidates = set(candidates)
    referenced = set()
    if not candidates:
        return referenced
    for _, _, names in iter_references(hosts, exclude):
        referenced |= names & candidates
        if referenced >= candidates:
            break
    return referenced


def prune_empty_dirs(directory):
    """Remove empty folders up to, but not including, the top-level media folders."""
    root = Path(settings.MEDIA_ROOT).resolve()
    directory = Path(directory).resolve()
    while directory.is_relative_to(root) and directory != root and directory.parent != root:
        try:
            directory.rmdir()
        except OSError:
            return
        directory = directory.parent
