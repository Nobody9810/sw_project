from uuid import uuid4
from django.core.cache import cache

VERSION_KEY = 'home_feed:version'


def feed_version():
    value = cache.get(VERSION_KEY)
    if value is None:
        cache.add(VERSION_KEY, uuid4().hex, timeout=None)
        value = cache.get(VERSION_KEY)
    return value


def invalidate_home_feed():
    # Old payloads expire normally. Versioning also works with shared Redis caches.
    cache.set(VERSION_KEY, uuid4().hex, timeout=None)
