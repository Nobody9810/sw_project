"""Shared submission validation and cache-backed rate limits."""
import hashlib
import ipaddress
import time

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse


def text_field(data, name, maximum, *, required=True):
    if not isinstance(data, dict) and not hasattr(data, 'getlist'):
        raise ValueError('请求内容必须是对象')
    value = data.get(name, '')
    if not isinstance(value, str):
        raise ValueError(f'{name} 必须是字符串')
    value = value.strip()
    if not value and required:
        raise ValueError(f'{name} 不能为空')
    if len(value) > maximum:
        raise ValueError(f'{name} 不能超过 {maximum} 个字符')
    return value


def client_address(request):
    address = request.META.get('REMOTE_ADDR', '')
    trusted = getattr(settings, 'SUBMISSION_TRUSTED_PROXIES', [])
    if address in trusted:
        # Walk from the nearest proxy; never trust an arbitrary leftmost value.
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')
        for candidate in reversed(forwarded):
            try:
                candidate = str(ipaddress.ip_address(candidate.strip()))
            except ValueError:
                continue
            if candidate not in trusted:
                return candidate
    return address or 'unknown'


def allow_submission(request, scope, limit=10, window=600):
    address = hashlib.sha256(client_address(request).encode()).hexdigest()
    key = f'submission:{scope}:{address}:{int(time.time()) // window}'
    if cache.add(key, 1, timeout=window + 1):
        return True
    try:
        return cache.incr(key) <= limit
    except ValueError:
        return cache.add(key, 1, timeout=window + 1)


def rate_limit_response():
    response = JsonResponse({'error': '提交过于频繁，请稍后再试'}, status=429)
    response['Retry-After'] = '600'
    return response
