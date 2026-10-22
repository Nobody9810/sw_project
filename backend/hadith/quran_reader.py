"""Authenticated Quran Foundation data; never synthesize words or timings."""
import hashlib
import json
import logging
import math
import re
import time
from pathlib import Path
from threading import Lock
import unicodedata
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .quran_constants import VERSE_COUNTS
from .quran_chapters import QURAN_CHAPTER_NAMES_AR, QURAN_CHAPTER_NAMES_ZH
from html.parser import HTMLParser


logger = logging.getLogger(__name__)
_token_lock = Lock()


class ReaderError(ValueError):
    def __init__(self, message, code='reader_unavailable', **details):
        super().__init__(message)
        self.code = code
        self.details = details


# Errors caused by the client's own parameters; everything else is an upstream failure.
CLIENT_ERROR_CODES = {'reciter_unsupported', 'script_unsupported', 'translation_unsupported'}


def reader_error_response(error, resource, number):
    # Only our own messages and whitelisted diagnostic fields, never upstream bodies or exceptions.
    logger.warning('Quran resource=%s number=%s code=%s reason=%s details=%s',
                   resource, number, error.code, str(error), error.details)
    status = 400 if error.code in CLIENT_ERROR_CODES else 502
    return JsonResponse({'error': str(error), 'code': error.code, **error.details}, status=status,
                        json_dumps_params={'ensure_ascii': False})


def resource_id(value):
    if type(value) is int and value > 0:
        return value
    if isinstance(value, str) and 1 <= len(value) <= 9 and value.isascii() and value.isdigit() and int(value) > 0:
        return int(value)
    return None


def is_millisecond(value):
    # The live API also serializes milliseconds as JSON floats (e.g. 1040.0).
    # Preserve precision; reject booleans, numeric strings, NaN and infinity.
    return type(value) is int or (type(value) is float and math.isfinite(value))


def configured():
    return bool(settings.QF_CLIENT_ID and settings.QF_CLIENT_SECRET)


def cached(key, create, lifetime=86400):
    missing = object()
    try:
        value = cache.get(key, missing)
    except Exception:
        value = missing
    if value is missing:
        value = create()
        try:
            cache.set(key, value, 300 if value is None else lifetime)
        except Exception:
            pass
    return value


def qf_get(path, params=None):
    if not configured():
        raise ReaderError('古兰经服务尚未配置完整的后端 OAuth 凭据')
    env = settings.QF_ENV
    if env not in ('prelive', 'production'):
        raise ReaderError('数据源环境配置无效')
    auth_host = 'prelive-oauth2' if env == 'prelive' else 'oauth2'
    api_host = 'apis-prelive' if env == 'prelive' else 'apis'
    digest = hashlib.sha256(f'{env}:{settings.QF_CLIENT_ID}:{settings.QF_CLIENT_SECRET}'.encode()).hexdigest()
    token_key = f'qf:token:{digest}'

    phase = 'oauth'

    def token():
        nonlocal phase
        phase = 'oauth'
        response = requests.post(f'https://{auth_host}.quran.foundation/oauth2/token',
                                 auth=(settings.QF_CLIENT_ID, settings.QF_CLIENT_SECRET),
                                 data={'grant_type': 'client_credentials', 'scope': 'content'},
                                 headers={'User-Agent': 'ShuweiQuran/1.0', 'Accept': 'application/json'},
                                 timeout=(2, 5), allow_redirects=False)
        response.raise_for_status()
        payload = response.json()
        access = payload.get('access_token')
        if not isinstance(access, str) or not access:
            raise ReaderError('数据源认证失败')
        return {'access': access, 'expires_at': time.time() + max(1, int(payload.get('expires_in', 3600)) - 60)}

    rejected_access = None
    try:
        for attempt in range(2):
            # Double-check under one process-wide lock. Concurrent 401s reuse a token
            # already renewed by another request instead of invalidating it again.
            with _token_lock:
                credential = cached(token_key, token, 60)
                if (not isinstance(credential, dict) or credential.get('expires_at', 0) <= time.time()
                        or credential.get('access') == rejected_access):
                    try:
                        cache.delete(token_key)
                    except Exception:
                        pass
                    credential = token()
                try:
                    cache.set(token_key, credential, max(1, int(credential['expires_at'] - time.time())))
                except Exception:
                    pass
            phase = 'content'
            response = requests.get(f'https://{api_host}.quran.foundation/content/api/v4/{path}',
                                    params=params, headers={'User-Agent': 'ShuweiQuran/1.0', 'Accept': 'application/json', 'x-auth-token': credential['access'],
                                                           'x-client-id': settings.QF_CLIENT_ID},
                                    timeout=(2, 5), allow_redirects=False)
            if response.status_code == 401 and attempt == 0:
                rejected_access = credential['access']
                continue
            response.raise_for_status()
            result = response.json()
            if not isinstance(result, dict) or response.status_code != 200:
                raise ReaderError('数据源响应格式无效')
            return result
    except ReaderError:
        raise
    except requests.Timeout:
        raise ReaderError('官方接口连接超时，请重试', 'upstream_timeout', stage=phase) from None
    except requests.exceptions.SSLError:
        raise ReaderError('官方接口 TLS 证书校验失败，请检查服务器证书与代理配置', 'upstream_tls', stage=phase) from None
    except requests.ConnectionError:
        raise ReaderError('无法连接官方接口，请检查后端网络、DNS及代理配置', 'upstream_connection', stage=phase) from None
    except requests.HTTPError as error:
        status = getattr(error.response, 'status_code', None)
        status = status if type(status) is int else 0
        environment = 'Production' if env == 'production' else 'Pre-live'
        if status == 401 and phase == 'oauth':
            message = f'{environment} OAuth 客户端认证失败（HTTP 401），请核对该环境的 Client ID 和 Client Secret'
        elif status in (401, 403):
            message = f'{environment} 官方接口拒绝访问（HTTP {status}），请核对客户端授权与 content 权限'
        elif status == 429:
            message = '官方接口请求过于频繁，请稍后重试'
        else:
            message = '官方接口返回错误状态，请稍后重试'
        raise ReaderError(message, 'upstream_http_error', stage=phase, upstream_status=status) from None
    except requests.RequestException:
        raise ReaderError('官方接口请求失败，请检查后端网络', 'upstream_request_failed', stage=phase) from None
    except (ValueError, TypeError, KeyError, AttributeError):
        raise ReaderError('官方接口返回格式无效', 'upstream_invalid_response', stage=phase) from None
    raise ReaderError('官方接口认证失败', 'upstream_auth_failed', stage='content')


def reader_cached(key, create):
    if not configured():
        raise ReaderError('古兰经服务尚未配置完整的后端 OAuth 凭据')
    identity = hashlib.sha256(settings.QF_CLIENT_ID.encode()).hexdigest()[:16]
    return cached(f'qf:reader:v2:{settings.QF_ENV}:{identity}:{key}', create)


def compact_text(text):
    # Used for validation only. The rendered text is never rewritten.
    return ''.join(char for char in unicodedata.normalize('NFC', text)
                   if not char.isspace() and not char.isdigit() and char != '\u06dd')


def verse_key(key):
    if not isinstance(key, str) or not re.fullmatch(r'[1-9]\d{0,2}:[1-9]\d{0,2}', key):
        raise ReaderError('经文键无效')
    chapter, verse = map(int, key.split(':'))
    if not 1 <= chapter <= 114 or not 1 <= verse <= VERSE_COUNTS[chapter - 1]:
        raise ReaderError('经文编号越界')
    return chapter, verse


# Verse-by-verse scripts: the official text field and the official font it must be rendered with
# (IndoPak waqf signs and verse ends only render correctly with the matching IndoPak font).
QURAN_SCRIPTS = {
    'qpc-hafs': {'field': 'text_qpc_hafs', 'label': '纳斯赫体', 'source': 'QPC Hafs'},
    'indopak': {'field': 'text_indopak_nastaleeq', 'label': '印巴体', 'source': 'IndoPak Nastaleeq'},
}
DEFAULT_SCRIPT = 'qpc-hafs'


def normalize_verse(row, field='text_qpc_hafs'):
    if not isinstance(row, dict):
        raise ReaderError('经文格式无效')
    chapter, number = verse_key(row.get('verse_key'))
    if row.get('verse_number') != number:
        raise ReaderError('经文节号不一致')
    words = row.get('words')
    if not isinstance(words, list) or not words:
        raise ReaderError('缺少逐词经文')
    output = []
    previous = 0
    for word in words:
        if not isinstance(word, dict):
            raise ReaderError('逐词格式无效')
        position = word.get('position')
        kind = word.get('char_type_name')
        text = word.get(field)
        if (type(position) is not int or position <= previous or
                not isinstance(text, str) or not text.strip() or kind not in ('word', 'end', 'pause', 'sajdah', 'rub-el-hizb')):
            raise ReaderError('逐词经文编号或文字无效')
        previous = position
        output.append({'position': position, 'text': text, 'kind': kind})
    lexical = [word for word in output if word['kind'] == 'word']
    if not lexical:
        raise ReaderError('缺少经文正文词语')
    text = row.get(field)
    if not isinstance(text, str) or not text.strip():
        raise ReaderError('缺少校验用经文全文')
    # Every character of the verse must come from its words, including the verse-end word
    # (IndoPak ends carry waqf signs and a private-use number glyph, not just digits).
    if compact_text(' '.join(word['text'] for word in output)) != compact_text(text):
        raise ReaderError('逐词内容与经文全文不一致，未展示该数据', 'word_text_mismatch', verse_key=row['verse_key'])
    return {'key': row['verse_key'], 'chapter': chapter, 'verse': number, 'text': text,
            'text_uthmani': row.get('text_uthmani'), 'words': output}


def fetch_verses(resource, expected=None, translation_id=None, field='text_qpc_hafs'):
    rows = []
    for page in range(1, 8):
        params = {'words': 'true', 'per_page': 50, 'page': page,
            'fields': f'{field},text_uthmani', 'word_fields': field}
        if translation_id is not None:
            params['translations'] = translation_id
        payload = qf_get(f'verses/{resource}', params)
        batch = payload.get('verses')
        pagination = payload.get('pagination')
        if not isinstance(batch, list) or not batch or not isinstance(pagination, dict):
            raise ReaderError('经文分页不完整')
        if pagination.get('current_page') != page:
            raise ReaderError('经文分页顺序错误')
        rows.extend(batch)
        next_page = pagination.get('next_page')
        if next_page is None:
            if pagination.get('total_records') != len(rows) or (expected and len(rows) != expected):
                raise ReaderError('经文总数不完整')
            return rows
        if next_page != page + 1:
            raise ReaderError('经文分页循环或缺页')
    raise ReaderError('经文分页超过限制')


def chapter_words(chapter, translation_id=None, script=DEFAULT_SCRIPT):
    field = QURAN_SCRIPTS[script]['field']

    def create():
        rows = fetch_verses(f'by_chapter/{chapter}', VERSE_COUNTS[chapter - 1], translation_id, field)
        verses = [normalize_verse(row, field) for row in rows]
        if translation_id is not None:
            for verse, row in zip(verses, rows):
                verse['translation'] = translation_text(row.get('translations'), translation_id)
        if [(row['chapter'], row['verse']) for row in verses] != [(chapter, number) for number in range(1, VERSE_COUNTS[chapter - 1] + 1)]:
            raise ReaderError('经文章节、顺序或完整性不匹配')
        return {'chapter': chapter, 'verses': verses,
                'source': f"Quran Foundation · {QURAN_SCRIPTS[script]['source']}", 'verified_words': True}
    return reader_cached(f'chapter:v3:{chapter}:script:{script}:translation:{translation_id}', create)


# Verified against the decoded official recordings (see docs/quran_api.md): reciters whose
# timeline belongs to another recording, and single recordings whose word starts do not
# follow the audio. Neither verse ranges nor word highlighting can be trusted for them.
# Read at startup; editing the file takes effect after a process restart. The digest keys the
# reciter cache, so a catalog cached under older data is never served afterwards.
_RELIABILITY_TEXT = Path(__file__).with_name('quran_audio_reliability.json').read_text(encoding='utf-8')
RELIABILITY = json.loads(_RELIABILITY_TEXT)
RELIABILITY_VERSION = hashlib.sha256(_RELIABILITY_TEXT.encode()).hexdigest()[:12]
EXCLUDED_CHAPTER_RECITERS = {int(reciter) for reciter in RELIABILITY['excluded_reciters']}
UNRELIABLE_RECORDINGS = {(reciter, chapter) for reciter, chapters in RELIABILITY['misaligned'].items() for chapter in chapters}


def https_audio(value):
    if not isinstance(value, str):
        raise ReaderError('缺少音频地址')
    parsed = urlparse(value)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise ReaderError('音频地址不安全')
    return value


class TranslationText(HTMLParser):
    """Plain text for React, preserving footnote numbers without executing upstream HTML."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag == 'sup': self.parts.append('〔')
        elif tag in ('br', 'p'): self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag == 'sup': self.parts.append('〕')

    def handle_data(self, data):
        self.parts.append(data)


def translation_text(rows, identifier):
    if not isinstance(rows, list):
        raise ReaderError('缺少中文译文')
    matches = [row for row in rows if isinstance(row, dict) and resource_id(row.get('resource_id')) == identifier]
    if len(matches) != 1 or not isinstance(matches[0].get('text'), str):
        raise ReaderError('中文译文版本不匹配')
    parser = TranslationText()
    parser.feed(matches[0]['text'])
    value = ''.join(parser.parts).strip()
    if not value:
        raise ReaderError('中文译文为空')
    return value


def _translation_metadata(row):
    return ' '.join(str(row.get(key, '')) for key in ('author_name', 'name', 'slug', 'language_name')).casefold()


def _is_ma_jian(row):
    return any(token in re.sub(r'[^a-z\u4e00-\u9fff]', '', _translation_metadata(row)) for token in ('majian', 'majain', '马坚'))


def chinese_translation_rows():
    """Every official Chinese translation resource, with validated numeric IDs."""
    def create():
        rows = qf_get('resources/translations', {'language': 'en'}).get('translations')
        if not isinstance(rows, list):
            raise ReaderError('中文译文目录格式无效')

        def is_chinese(row):
            language = str(row.get('language_name', '')).casefold().strip()
            return (language.startswith('chinese') or language in ('zh', 'zh-cn', 'zh-hans', 'zh-tw', 'zh-hant', '中文', '汉语')
                    or str(row.get('slug', '')).casefold().startswith(('zh-', 'zh.', 'quran.zh.')))

        return [{key: row.get(key) for key in ('name', 'author_name', 'slug', 'language_name')} | {'id': resource_id(row.get('id'))}
                for row in rows if isinstance(row, dict) and is_chinese(row) and resource_id(row.get('id')) is not None]
    return reader_cached('translations:zh:v1', create)


def translation_resource():
    def create():
        chinese = chinese_translation_rows()
        metadata = _translation_metadata
        configured_id = getattr(settings, 'QF_TRANSLATION_ID', '')
        if configured_id:
            matches = [row for row in chinese if str(row['id']) == str(configured_id)]
        else:
            matches = [row for row in chinese if _is_ma_jian(row)
                       and not any(token in metadata(row) for token in ('traditional', '繁體', '繁体', 'zh-hant', 'zh-tw'))]
            simplified = [row for row in matches if any(token in metadata(row)
                          for token in ('simplified', '简体', '簡體', 'zh-hans', 'zh-cn'))]
            if simplified:
                matches = simplified
        if not matches and not configured_id:
            return None
        if len(matches) != 1:
            raise ReaderError('未能唯一确认马坚简体中文译本，请查看后端译本诊断', 'translation_selection_failed',
                              stage='translation_catalog', chinese_resources=len(chinese),
                              candidate_ids=[row['id'] for row in matches])
        row = matches[0]
        return {'id': row['id'], 'name': row.get('name') or row.get('author_name'),
                'author': row.get('author_name') or row.get('name')}
    return reader_cached(f'translation-resource:v2:{getattr(settings, "QF_TRANSLATION_ID", "")}', create)


def translation_label(row):
    """Short switcher label; only the long-established Ma Jian translation gets a Chinese name."""
    if _is_ma_jian(row):
        return '马坚'
    name = row.get('author_name') or re.sub(r'^Chinese Translation(\s*\([^)]*\))?\s*-\s*', '', row.get('name') or '')
    return name.strip() or str(row['id'])


def reading_options():
    """Official Chinese translations (the default first) and the verse-by-verse scripts."""
    default = translation_resource()
    rows = sorted(chinese_translation_rows(), key=lambda row: (not default or row['id'] != default['id'], row['id']))
    return {'translations': [{'id': row['id'], 'name': row.get('name') or row.get('author_name'), 'label': translation_label(row)}
                             for row in rows],
            'default_translation_id': default['id'] if default else None,
            'scripts': [{'id': key, 'label': value['label']} for key, value in QURAN_SCRIPTS.items()],
            'default_script': DEFAULT_SCRIPT, 'source': 'Quran Foundation'}


def chapter_detail(chapter, translation_id=None, script=DEFAULT_SCRIPT):
    if script not in QURAN_SCRIPTS:
        raise ReaderError('不支持的经文字体', 'script_unsupported')
    if translation_id is None:
        translation = translation_resource()
    else:
        row = next((row for row in chinese_translation_rows() if row['id'] == translation_id), None)
        if row is None:
            raise ReaderError('不支持的中文译本', 'translation_unsupported')
        translation = {'id': row['id'], 'name': row.get('name') or row.get('author_name'),
                       'author': row.get('author_name') or row.get('name')}
    data = chapter_words(chapter, translation['id'] if translation else None, script)
    if not translation:
        data = {**data, 'verses': [{**row, 'translation': None} for row in data['verses']]}
    return {**data, 'text_script': script, 'translation': translation,
            'translation_status': 'ready' if translation else 'unavailable',
            'translation_notice': '' if translation else '当前官方数据源未提供本站所用的马坚中文译文，暂显示阿拉伯原文。',
            'environment': settings.QF_ENV,
            'chapter_name': QURAN_CHAPTER_NAMES_ZH[chapter],
            'chapter_name_ar': QURAN_CHAPTER_NAMES_AR[chapter]}


def reciter_catalog():
    def create():
        rows = qf_get('resources/chapter_reciters', {'language': 'en'}).get('reciters')
        if not isinstance(rows, list):
            raise ReaderError('诵读者目录格式无效')
        result = []
        for row in rows:
            if not isinstance(row, dict): continue
            qirat, style = row.get('qirat'), row.get('style')
            if (not isinstance(qirat, dict) or not isinstance(style, dict)
                    or str(qirat.get('name', '')).casefold() != 'hafs'
                    or str(style.get('name', '')).casefold() != 'murattal'):
                continue
            if type(row.get('id')) is not int or row['id'] <= 0 or not isinstance(row.get('name'), str) or not row['name'].strip():
                raise ReaderError('诵读者编号或姓名无效')
            if row['id'] in EXCLUDED_CHAPTER_RECITERS:
                continue
            result.append({'id': str(row['id']), 'name': row['name'], 'label': row['name'],
                           'unavailable_chapters': sorted(RELIABILITY['misaligned'].get(str(row['id']), []))})
        if not result or len({row['id'] for row in result}) != len(result):
            raise ReaderError('暂无可确认的 Hafs Murattal 诵读者')
        # The official name is "Mishari Rashid al-`Afasy"; compare letters only.
        result.sort(key=lambda row: ('alafasy' not in re.sub(r'[^a-z]', '', row['name'].casefold()),
                                     row['name'].casefold(), int(row['id'])))
        return {'reciters': result, 'default_id': result[0]['id'], 'source': 'Quran Foundation'}
    return reader_cached(f'reciters:v3:{RELIABILITY_VERSION}', create)


def chapter_catalog():
    def create():
        rows = qf_get('chapters', {'language': 'en'}).get('chapters')
        if not isinstance(rows, list) or not rows or (settings.QF_ENV == 'production' and len(rows) != 114):
            count = len(rows) if isinstance(rows, list) else 0
            raise ReaderError(f'官方章节目录不完整：实际返回 {count}/114 章', 'chapter_catalog_incomplete',
                              stage='chapter_catalog', actual_count=count, expected_count=114)
        normalized = []
        for row in rows:
            if not isinstance(row, dict) or resource_id(row.get('id')) is None:
                raise ReaderError('官方章节目录编号格式无效', 'chapter_catalog_invalid', stage='chapter_catalog')
            normalized.append({**row, 'id': resource_id(row['id']), 'verses_count': resource_id(row.get('verses_count'))})
        rows = sorted(normalized, key=lambda row: row['id'])
        result = []
        seen = set()
        for row in rows:
            number = row['id']
            if (not 1 <= number <= 114 or number in seen
                    or row.get('verses_count') != VERSE_COUNTS[number - 1]
                    or not isinstance(row.get('name_arabic'), str) or not row['name_arabic'].strip()):
                raise ReaderError(f'官方章节目录第 {number} 章编号、名称或节数不匹配', 'chapter_catalog_invalid', stage='chapter_catalog')
            seen.add(number)
            result.append({'id': number, 'name': QURAN_CHAPTER_NAMES_ZH[number],
                           'name_arabic': row['name_arabic'], 'verses_count': row['verses_count']})
        return {'chapters': result, 'source': 'Quran Foundation', 'environment': settings.QF_ENV,
                'available_count': len(result), 'expected_count': 114, 'complete': len(result) == 114}
    return reader_cached('chapters:en:v3', create)


def chapter_audio(chapter, identifier):
    if identifier not in {row['id'] for row in reciter_catalog()['reciters']}:
        raise ReaderError('不支持的诵读者', 'reciter_unsupported')

    if (identifier, chapter) in UNRELIABLE_RECORDINGS:
        raise ReaderError('该录音的官方时间轴与音频不一致，无法准确播放和同步，请选择其他诵读者',
                          'audio_timeline_mismatch', reciter_id=identifier)

    def create():
        data = qf_get(f'chapter_recitations/{identifier}/{chapter}', {'segments': 'true'})
        file = data.get('audio_file', {})
        if not isinstance(file, dict):
            raise ReaderError('音频格式无效')
        if file.get('chapter_id') != chapter:
            raise ReaderError('音频章节不匹配')
        url = https_audio(file.get('audio_url'))
        verses = chapter_detail(chapter)['verses']
        timestamps = file.get('timestamps')
        if not isinstance(timestamps, list) or len(timestamps) != len(verses):
            raise ReaderError('该录音暂无完整逐节时间轴，请选择其他诵读者')
        output = []
        timing_issues = []
        previous = 0
        previous_start = -1
        for verse, timing in zip(verses, timestamps):
            if not isinstance(timing, dict):
                raise ReaderError('时间轴格式无效')
            start, end = timing.get('timestamp_from'), timing.get('timestamp_to')
            if (timing.get('verse_key') != verse['key'] or not is_millisecond(start) or not is_millisecond(end)
                    or start < 0 or start < previous_start or end < previous or end <= start):
                raise ReaderError('逐节时间轴顺序或范围无效', 'audio_verse_mismatch',
                                  verse_key=verse['key'], reciter_id=identifier,
                                  verse_from=start if is_millisecond(start) else None,
                                  verse_to=end if is_millisecond(end) else None,
                                  previous_from=previous_start, previous_to=previous)
            positions = {word['position'] for word in verse['words'] if word['kind'] == 'word'}
            segments = timing.get('segments')
            if segments is None:
                segments = []
            last = 0
            bounded_segments = []
            issues = []
            if not isinstance(segments, list):
                issues.append({'reason': 'invalid_segments_array'})
                segments = []
            for index, segment in enumerate(segments):
                reason = None
                if (not isinstance(segment, list) or len(segment) != 3 or
                        type(segment[0]) is not int or
                        not is_millisecond(segment[1]) or not is_millisecond(segment[2])):
                    reason = 'invalid_triplet'
                elif segment[0] not in positions:
                    reason = 'unknown_word_position'
                elif not (last <= segment[1] < segment[2]
                          and segment[1] < end and segment[2] > start):
                    reason = 'invalid_time_range'
                if reason:
                    # A broken word alignment must not invalidate verified verse
                    # playback. Disable highlighting for this verse, report every
                    # numeric defect, and never guess a replacement interval.
                    numeric = segment if (isinstance(segment, list) and len(segment) <= 4
                                          and all(is_millisecond(value) for value in segment)) else None
                    issues.append({'segment_index': index, 'reason': reason, 'segment': numeric})
                    continue
                last = segment[2]
                bounded_segments.append([segment[0], max(start, segment[1]), min(end, segment[2])])
            covered = {segment[0] for segment in bounded_segments}
            if covered != positions:
                issues.append({'reason': 'incomplete_word_coverage',
                               'missing_positions': sorted(positions - covered),
                               'expected_word_count': len(positions), 'covered_word_count': len(covered)})
            complete = not issues
            timing_issues.extend({'verse_key': verse['key'], **issue} for issue in issues)
            output.append({'verse': verse['verse'], 'from': start, 'to': end,
                           'segments': bounded_segments if complete else [], 'word_sync': complete})
            previous = end
            previous_start = start
        return {'chapter': chapter, 'reciter': identifier, 'url': url, 'timings': output,
                'word_sync': all(row['word_sync'] for row in output), 'timing_issues': timing_issues}
    return reader_cached(f'audio:v5:{identifier}:{chapter}', create)


@require_GET
def reader_proxy(request, resource, number):
    catalogs = ('reciters', 'chapters', 'reading-options')
    limit = 1 if resource in catalogs else 114
    identifier = request.GET.get('reciter', '')
    translation = request.GET.get('translation', '')
    script = request.GET.get('script', DEFAULT_SCRIPT)
    if (resource not in ('chapter', 'audio', *catalogs) or not 1 <= number <= limit
            or translation and (len(translation) > 9 or not translation.isascii() or not translation.isdigit() or int(translation) <= 0)
            or len(script) > 20
            or resource == 'audio' and (not 1 <= len(identifier) <= 6 or not identifier.isascii() or not identifier.isdigit() or not 0 < int(identifier) < 1000000)):
        return JsonResponse({'error': '章节或诵读者无效'}, status=400)
    if not configured():
        return JsonResponse({'error': '古兰经服务尚未配置完整的后端 OAuth 凭据',
                             'code': 'reader_not_configured'}, status=503)
    try:
        if resource == 'chapter':
            data = chapter_detail(number, int(translation) if translation else None, script)
        elif resource == 'audio':
            data = chapter_audio(number, identifier)
        elif resource == 'reciters':
            data = reciter_catalog()
        elif resource == 'reading-options':
            data = reading_options()
        else:
            data = chapter_catalog()
        return JsonResponse(data, json_dumps_params={'ensure_ascii': False})
    except ReaderError as error:
        return reader_error_response(error, resource, number)
