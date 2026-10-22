"""Give custom admin assets an independent namespace and a content version."""
import hashlib
from functools import lru_cache
from pathlib import Path

from django.templatetags.static import static


@lru_cache(maxsize=8)
def _content_version(source, modified_ns, size):
    # Metadata is part of the key, so a CSS edit invalidates the digest cache.
    return hashlib.sha256(source.read_bytes()).hexdigest()[:12]


def admin_stylesheet(request):
    asset = 'admin_library/admin.css'
    source = Path(__file__).resolve().parent.parent / 'static' / asset
    url = static(asset)
    try:
        metadata = source.stat()
        version = _content_version(source, metadata.st_mtime_ns, metadata.st_size)
    except OSError:
        # Some deployments only retain collected assets. A missing source file
        # must not turn every admin page into a 500; storage still owns the URL.
        return url
    return f'{url}?v={version}'
