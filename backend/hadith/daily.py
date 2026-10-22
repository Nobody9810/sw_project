"""One shared reading per site-local day, without caching serialized content."""
import hashlib
import logging
from datetime import datetime, time, timedelta
from math import ceil

from django.core.cache import cache
from django.utils import timezone

from .models import Hadith

logger = logging.getLogger(__name__)


def daily_reading():
    now = timezone.now()
    site_timezone = timezone.get_default_timezone()
    if timezone.is_naive(now):
        now = timezone.make_aware(now, site_timezone)
    day = timezone.localdate(now, site_timezone)
    expires = timezone.make_aware(datetime.combine(day + timedelta(days=1), time.min), site_timezone)
    key = f'hadith:daily:v1:{day.isoformat()}'
    queryset = Hadith.objects.exclude(text='').select_related('collection')
    try:
        cached_id = cache.get(key)
    except Exception:
        logger.warning('每日圣训缓存读取失败，使用日期选择')
        cached_id = None
    if cached_id is not None:
        row = queryset.filter(pk=cached_id).first()
        if row is not None:
            return row, day, expires

    count = queryset.count()
    if not count:
        return None, day, expires
    index = int(hashlib.sha256(day.isoformat().encode()).hexdigest(), 16) % count
    row = queryset.order_by('pk')[index:index + 1].first() or queryset.order_by('pk').first()
    if row is None:
        return None, day, expires
    try:
        # add() lets concurrent workers agree on the first chosen record.
        if cached_id is not None:
            cache.delete(key)
        cache.add(key, row.pk, timeout=max(1, ceil((expires - now).total_seconds())))
        winner = cache.get(key)
        if winner is not None and winner != row.pk:
            row = queryset.filter(pk=winner).first() or row
    except Exception:
        logger.warning('每日圣训缓存写入失败，使用日期选择')
    return row, day, expires
