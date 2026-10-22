"""Shared reading-note contract; source adapters do not change stored text."""
import re
from .collection_rules import COLLECTION_RULES

LABEL = re.compile(r'(?m)^[ \t]*(?:注(?:释)?|译者注)[ \t]*[：:][ \t]*')
MARKER = re.compile(r'(?m)^[ \t]*([①-⑳⑴-⒇]|\d+[、．.])[ \t]*')


def normalize_note(note, *, key, format_text):
    """Every collection returns these same fields, including nullable page data."""
    return {
        'key': str(note.get('key') or key),
        'marker': str(note.get('marker') or ''),
        'text': format_text(str(note.get('text') or '').strip()),
        'pdf_page': note.get('pdf_page'),
        'status': note.get('status') or 'matched',
    }


def split_source_notes(body, *, key_prefix, format_text):
    label = LABEL.search(body)
    start = label.start() if label else None
    # Circled definitions are footnotes when the earlier body references the
    # same mark. A numbered list with no preceding reference remains prose.
    if start is None:
        for match in MARKER.finditer(body):
            if len(match[1]) == 1 and match[1] in body[:match.start()]:
                start = match.start()
                break
    if start is None:
        return format_text(body), []
    main = body[:start].rstrip()
    tail = body[label.end():] if label else body[start:]
    positions = [match.start() for match in MARKER.finditer(tail)]
    boundaries = sorted(set([0, *positions, len(tail)]))
    notes = []
    for left, right in zip(boundaries, boundaries[1:]):
        text = tail[left:right].strip()
        if not text:
            continue
        marker = MARKER.match(text)
        symbol = marker[1] if marker else ''
        # Explicit note regions belong to this source record; bare definitions
        # without a matching body reference remain visible but flagged.
        status = 'matched' if label or not symbol or symbol in main else 'unmatched'
        notes.append(normalize_note({'marker': symbol, 'text': text, 'status': status},
                                    key=f'{key_prefix}:{len(notes) + 1}', format_text=format_text))
    return format_text(main), notes


def tirmidhi_pdf_notes(row):
    from .tirmidhi_notes import reading_notes
    from .tirmidhi_text import NUMBERED
    entry = reading_notes(row)
    if entry is None:
        return None
    body = entry['body']
    numbered = NUMBERED.match(body)
    return {'body': numbered[3].strip() if numbered else body, 'notes': entry['notes']}


# Future source formats can register a provider returning {body, notes} or None.
# All providers pass through the same normalizer; serializers and UI stay shared.
def bukhari_pdf_notes(row):
    from .bukhari_pdf import reading_notes
    return reading_notes(row)


def nasai_pdf_notes(row):
    from .nasai_pdf import reading_notes
    return reading_notes(row)


def ibnmajah_pdf_notes(row):
    from .ibnmajah_pdf import reading_notes
    return reading_notes(row)


_NOTE_PROVIDERS = {'tirmidhi': tirmidhi_pdf_notes, 'bukhari': bukhari_pdf_notes,
                   'nasai': nasai_pdf_notes, 'ibnmajah': ibnmajah_pdf_notes}
SOURCE_NOTE_PROVIDERS = {name: _NOTE_PROVIDERS[rule['notes']]
                         for name, rule in COLLECTION_RULES.items() if rule['notes']}


def reading_with_notes(row, collection, body, *, format_text=lambda value: value):
    key_prefix = f'note:{collection}:{row.get("id", row.get("collection_number", "reading"))}'
    provider = SOURCE_NOTE_PROVIDERS.get(collection)
    source = provider(row) if provider else None
    if source is not None:
        return format_text(source['body']), [
            normalize_note(note, key=f'{key_prefix}:{index + 1}', format_text=format_text)
            for index, note in enumerate(source['notes'])]
    return split_source_notes(body, key_prefix=key_prefix, format_text=format_text)
