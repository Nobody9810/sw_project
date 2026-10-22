"""AlAdhan boundary: explicit rules, bounded requests, validated offset timestamps."""
import hashlib
import json
import math
from datetime import datetime, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import requests
from django.core.cache import cache
from django.utils import timezone
from .options import PRAYERS, METHODS


class PrayerError(Exception):
    def __init__(self, code, message, status=502):
        self.code, self.message, self.status = code, message, status
        super().__init__(message)


def _invalid():
    raise PrayerError('invalid_upstream', '礼拜时间来源返回的数据不完整，请重试')


def _cache_get(key):
    try:
        return cache.get(key)
    except Exception:
        return None


def _cache_set(key, value):
    try:
        cache.set(key, value, 21600)
    except Exception:
        pass  # A cache outage must not turn a valid timetable into an error.


def _timestamp(value, day, zone):
    # Polar regions may have no computable sunrise/Fajr/Isha. Never invent one.
    if value is None or value in ('-', '--', '-----', 'N/A') or (isinstance(value, str) and 'nan' in value.lower()):
        return None
    if not isinstance(value, str):
        _invalid()
    try:
        stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if stamp.tzinfo is None or stamp.utcoffset() is None:
            _invalid()
        local = stamp.astimezone(zone)
        if stamp.utcoffset() != local.utcoffset() or stamp.replace(tzinfo=None) != local.replace(tzinfo=None):
            _invalid()
        if local.date() not in (day, day + timedelta(days=1)):
            _invalid()
        return local.isoformat()
    except (ValueError, OverflowError):
        _invalid()


def _day(query, day):
    identity = {**query, 'date': day.isoformat()}
    key = 'prayers:v2:' + hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    existing = _cache_get(key)
    if existing is not None:
        return existing
    params = {key: query[key] for key in ('city', 'country', 'state', 'latitude', 'longitude') if key in query}
    offsets = query['tune'].split(',')
    params.update(school=query['school'], latitudeAdjustmentMethod=query['high_latitude'],
                  tune=','.join(['0', offsets[0], '0', offsets[1], offsets[2], offsets[3], '0', offsets[4], '0']), iso8601='true')
    if query['method'] != 'auto':
        params['method'] = query['method']
    if query.get('timezone'):
        params['timezonestring'] = query['timezone']
    endpoint = 'timings' if 'latitude' in query else 'timingsByCity'
    try:
        response = requests.get(f'https://api.aladhan.com/v1/{endpoint}/{day:%d-%m-%Y}',
                                params=params, timeout=(3, 4), allow_redirects=False)
        if response.status_code == 400:
            raise PrayerError('location_unavailable', '未找到该地点或该地点的时间不可计算，请检查城市、国家或参考当地时间表', 422)
        if response.status_code != 200:
            raise PrayerError('upstream_unavailable', '礼拜时间服务暂时不可用，请稍后重试')
        payload = response.json()
    except requests.Timeout:
        raise PrayerError('upstream_timeout', '礼拜时间服务连接超时，请重试', 504) from None
    except (requests.RequestException, ValueError):
        raise PrayerError('upstream_unavailable', '暂时无法取得礼拜时间，请稍后重试') from None
    try:
        if payload['code'] != 200:
            _invalid()
        data = payload['data']
        meta = data['meta']
        zone = ZoneInfo(meta['timezone'])
        if query.get('timezone') and meta['timezone'] != query['timezone']:
            _invalid()
        if data['date']['gregorian']['date'] != day.strftime('%d-%m-%Y'):
            _invalid()
        resolved_method = int(meta['method']['id'])
        if resolved_method not in METHODS or (query['method'] != 'auto' and resolved_method != query['method']):
            _invalid()
        lat, lon = float(meta['latitude']), float(meta['longitude'])
        if not math.isfinite(lat) or not math.isfinite(lon) or not -90 <= lat <= 90 or not -180 <= lon <= 180:
            _invalid()
        if 'latitude' in query and (abs(lat-query['latitude']) > .1 or abs(lon-query['longitude']) > .1):
            _invalid()
        timings = data['timings']
        prayers = [dict(key=key, label=label, time=_timestamp(timings[key], day, zone)) for key, label in PRAYERS]
        sunrise = _timestamp(timings['Sunrise'], day, zone)
        ordered = [prayers[0]['time'], sunrise, *[item['time'] for item in prayers[1:]]]
        present = [datetime.fromisoformat(value).astimezone(dt_timezone.utc) for value in ordered if value]
        if any(before >= after for before, after in zip(present, present[1:])):
            _invalid()
        result = dict(date=day.isoformat(), timezone=meta['timezone'], latitude=round(lat, 2), longitude=round(lon, 2),
                      prayers=prayers, sunrise=sunrise, method=resolved_method)
    except (KeyError, TypeError, ValueError, OverflowError, ZoneInfoNotFoundError):
        _invalid()
    _cache_set(key, result)
    return result


def timetable(query):
    query = dict(query)
    selected = query.pop('date', None)
    now = timezone.now()
    if timezone.is_naive(now):
        now = timezone.make_aware(now, timezone.get_default_timezone())
    if selected and abs((selected - now.date()).days) > 366:
        raise PrayerError('invalid_date', '仅支持前后一年内的日期', 400)
    initial_zone = ZoneInfo(query['timezone']) if query.get('timezone') else dt_timezone.utc
    day = selected or now.astimezone(initial_zone).date()
    today = _day(query, day)
    zone = ZoneInfo(today['timezone'])
    # Resolve the city's timezone before deciding what "today" means there.
    local_day = now.astimezone(zone).date()
    if not selected and day != local_day:
        day = local_day
        query['timezone'] = today['timezone']
        today = _day(query, day)
    # Resolve tomorrow at the same coordinates/timezone: never geocode the city twice.
    following_query = {key: value for key, value in query.items() if key not in ('city', 'country', 'state')}
    following_query['method'] = today['method']
    following_query.update(latitude=today['latitude'], longitude=today['longitude'], timezone=today['timezone'])
    warnings = []
    if any(item['time'] is None for item in today['prayers']) or today['sunrise'] is None:
        warnings.append('当前地点部分时间暂不可计算，请参考当地清真寺时间表。')
    try:
        tomorrow = _day(following_query, day + timedelta(days=1))
        next_fajr = tomorrow['prayers'][0]['time']
    except PrayerError:
        next_fajr = None
        warnings.append('暂未取得次日晨礼时间，宵礼之后请重新加载。')
    midnight = datetime.combine(local_day + timedelta(days=1), datetime.min.time(), zone)
    return {
        **{key: today[key] for key in ('date', 'timezone', 'prayers', 'sunrise')},
        'location': {key: today[key] for key in ('latitude', 'longitude')},
        'next_day_fajr': next_fajr, 'valid_until': midnight.isoformat(),
        'settings': {'method': today['method'], 'method_label': METHODS[today['method']], 'school': query['school'],
                     'high_latitude': query['high_latitude'], 'tune': query['tune']},
        'source': {'name': 'AlAdhan', 'url': 'https://aladhan.com/prayer-times-api'}, 'warnings': warnings,
    }
