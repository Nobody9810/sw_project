"""Database-only reading output. Source converters are never imported here."""
from collections import Counter
from copy import deepcopy
import hashlib
import json

from rest_framework.exceptions import APIException

from .notes import split_source_notes
from .presentation import chapter_sections, SECTION, STRUCTURED_COLLECTIONS

VERSION = 1
FIELDS = ('body', 'notes', 'section', 'section_hadith_number', 'original_number',
          'chapter_intro', 'section_intro')
DEFAULTS = {'body': '', 'notes': [], 'section': None, 'section_hadith_number': None,
            'original_number': None, 'chapter_intro': '', 'section_intro': ''}


class ReadingUnavailable(APIException):
    status_code = 503
    default_detail = '圣训阅读结构与原文不一致，请管理员核对并重新整理入库。'
    default_code = 'hadith_reading_stale'


def fingerprint(row, collection_id):
    value = [collection_id, row['chapter'], row['collection_number'], row['text']]
    return hashlib.sha256(json.dumps(value, ensure_ascii=False).encode()).hexdigest()


def valid_payload(payload):
    if not isinstance(payload, dict) or not set(FIELDS).issubset(payload):
        return False
    if any(not isinstance(payload[key], str) for key in ('body', 'chapter_intro', 'section_intro')):
        return False
    if payload['original_number'] is not None and not isinstance(payload['original_number'], str):
        return False
    section = payload['section']
    if section is not None:
        if not isinstance(section, dict) or not {'key', 'number', 'order', 'title', 'source_heading', 'count', 'is_supplement'}.issubset(section):
            return False
        if not all(isinstance(section[key], str) for key in ('key', 'title', 'source_heading')):
            return False
        if any(type(section[key]) is not int or section[key] < 1 for key in ('order', 'count')):
            return False
        if section['number'] is not None and type(section['number']) is not int:
            return False
        if type(payload['section_hadith_number']) is not int or payload['section_hadith_number'] < 1:
            return False
    elif payload['section_hadith_number'] is not None:
        return False
    if not isinstance(payload['notes'], list):
        return False
    for note in payload['notes']:
        if not isinstance(note, dict) or set(note) != {'key', 'marker', 'text', 'pdf_page', 'status'}:
            return False
        if not all(isinstance(note[key], str) for key in ('key', 'marker', 'text')):
            return False
        if note['status'] not in ('matched', 'shared', 'unmatched'):
            return False
        if note['pdf_page'] is not None and (type(note['pdf_page']) is not int or note['pdf_page'] < 1):
            return False
    return True


def stored_reading(row, collection_id):
    snapshot = row.get('reading')
    if snapshot is None:
        return None
    if (not isinstance(snapshot, dict) or snapshot.get('version') != VERSION
            or snapshot.get('fingerprint') != fingerprint(row, collection_id)
            or not valid_payload(snapshot.get('data'))):
        raise ReadingUnavailable()
    return deepcopy(snapshot['data'])


def snapshot_for(row, collection_id, payload):
    data = {key: deepcopy(payload.get(key, DEFAULTS[key])) for key in FIELDS}
    if not valid_payload(data):
        raise ValueError('阅读字段不完整或类型不正确')
    return {'version': VERSION, 'fingerprint': fingerprint(row, collection_id), 'data': data}


def search_text(payload):
    return '\n'.join([payload['body'], payload['chapter_intro'], payload['section_intro'],
                      *(note['text'] for note in payload['notes'])])


def database_notes(row, collection, body, *, format_text=lambda value: value):
    key = f'note:{collection}:{row.get("id", row.get("collection_number", "reading"))}'
    return split_source_notes(body, key_prefix=key, format_text=format_text)


def chapter_readings(rows, collection_id, chapter, short_name):
    """Read saved semantics and count against the whole current DB chapter."""
    result, fallback = {}, {}
    missing = [row for row in rows if row.get('reading') is None]
    if missing and short_name in STRUCTURED_COLLECTIONS:
        # New manually entered records can be parsed from DB text, without any
        # source assets. Historical source enrichment is an offline operation.
        fallback = chapter_sections(rows, collection_id, chapter, short_name, note_reader=database_notes)
    for row in rows:
        payload = stored_reading(row, collection_id)
        if payload is None:
            payload = deepcopy(DEFAULTS)
            if short_name in STRUCTURED_COLLECTIONS and SECTION.match(row['text']):
                payload.update(fallback[row['id']])
            else:
                payload['body'], payload['notes'] = database_notes(row, short_name, row['text'])
        result[row['id']] = payload
    counts = Counter(p['section']['key'] for p in result.values() if p['section'])
    positions = Counter()
    for payload in result.values():
        if payload['section']:
            section = payload['section']
            key = section['key']
            positions[key] += 1
            section.update(count=counts[key])
            payload['section_hadith_number'] = positions[key]
    return result
