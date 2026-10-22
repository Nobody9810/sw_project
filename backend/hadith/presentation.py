"""Expose reading sections from imported text without rewriting source records."""
import re
from collections import Counter

from .reading_patterns import ABUDAWUD_NUMBERED as NUMBERED, SUPPLEMENT_PREFIX
from .reading_patterns import MUSLIM_NUMBERED, INTRO_END
from .reading_patterns import TIRMIDHI_NUMBERED
from .notes import reading_with_notes
from .reading_patterns import READING_NUMBERS as BUKHARI_NUMBERED
from .collection_rules import COLLECTION_RULES

_NUMBER_PATTERNS = {'muslim': MUSLIM_NUMBERED, 'tirmidhi': TIRMIDHI_NUMBERED, 'pdf': BUKHARI_NUMBERED}
PDF_NUMBER_PATTERNS = {name: _NUMBER_PATTERNS[rule['parser']]
                       for name, rule in COLLECTION_RULES.items() if rule['parser'] != 'epub'}
SOURCE_SECTION_NUMBERS = set(COLLECTION_RULES)
STRUCTURED_COLLECTIONS = set(COLLECTION_RULES)


SECTION = re.compile(r'^【([^\n]+)】\s*\n\s*\n(.*)$', re.S)
SECTION_NUMBER = re.compile(r'^(\d+)\s*[、.．]?\s*(.*)$', re.S)
PARAGRAPH_END = re.compile(r'[。！？.!?][”’」』）)\]】]*$')
PARAGRAPH_START = re.compile(r'^(?:注(?:释)?[：:]|[①-⑳⑴-⒇]|[一二三四五六七八九十]+[、．])')


def pdf_reading_text(text):
    """Join extraction line wraps; retain paragraphs and independently numbered notes.

    Blank lines at PDF page boundaries can split words or quotations, so they
    only open a paragraph after a complete sentence. Source text is untouched.
    """
    paragraphs, current = [], ''
    blank = False
    for line in text.splitlines():
        line = line.strip()
        if not line:
            blank = True
            continue
        starts_paragraph = PARAGRAPH_START.match(line)
        closes_quote = line[0] in '”’」』）)，。！？；：'
        if current and (starts_paragraph or (blank and PARAGRAPH_END.search(current) and not closes_quote)):
            paragraphs.append(current)
            current = ''
        # Preserve word boundaries when a Latin word follows another Latin word.
        separator = ' ' if current and current[-1].isascii() and current[-1].isalnum() and line[0].isascii() and line[0].isalnum() else ''
        current += separator + line
        blank = False
    if current:
        paragraphs.append(current)
    return '\n\n'.join(paragraphs)


def split_imported_text(text):
    match = SECTION.match(text)
    heading, body = (match[1], match[2]) if match else ('未分节内容', text)
    numbered = NUMBERED.match(body)
    original_number = re.sub(r'\s+', '', numbered[1]) if numbered else None
    # Remove only the first hadith's number, leaving numbered notes untouched.
    if numbered:
        body = numbered[2].strip()
    title_match = SECTION_NUMBER.match(heading)
    title = title_match[2] if title_match else heading
    return heading, title, original_number, body


def split_muslim_text(text, *, numbered_pattern=MUSLIM_NUMBERED):
    match = SECTION.match(text)
    heading, body = (match[1], match[2]) if match else ('未分节内容', text)
    extras = {}
    if body.startswith(('【篇前说明】', '【节前说明】')) and INTRO_END in body:
        intro, body = body.split(INTRO_END, 1)
        for entry in re.finditer(r'【(篇前说明|节前说明)】\s*\n(.*?)(?=\n\n【(?:篇前说明|节前说明)】|\Z)', intro, re.S):
            extras['chapter_intro' if entry[1] == '篇前说明' else 'section_intro'] = pdf_reading_text(entry[2])
    body = body.strip()
    numbered = numbered_pattern.match(body)
    original_number = re.sub(r'\s+', '', numbered[1]) if numbered else None
    if numbered:
        body = numbered[3].strip()
    body = pdf_reading_text(body)
    title_match = SECTION_NUMBER.match(heading)
    title = title_match[2] if title_match else heading
    return heading, title, original_number, body, extras


def chapter_sections(rows, collection_id, chapter, collection_short_name='AbuDawud', *, note_reader=reading_with_notes):
    """Count and number the whole chapter, so pagination/search cannot reset them."""
    sections, positions, result = {}, Counter(), {}
    for row in rows:
        extras = {}
        if collection_short_name in PDF_NUMBER_PATTERNS:
            heading, title, original_number, body, extras = split_muslim_text(row['text'], numbered_pattern=PDF_NUMBER_PATTERNS[collection_short_name])
        else:
            heading, title, original_number, body = split_imported_text(row['text'])
        body, notes = note_reader(row, collection_short_name, body,
                                        format_text=pdf_reading_text if collection_short_name in PDF_NUMBER_PATTERNS else lambda value: value)
        if heading not in sections:
            title_match = SECTION_NUMBER.match(heading)
            source_number = int(title_match[1]) if title_match else None
            supplement = collection_short_name == 'AbuDawud' and heading.startswith(SUPPLEMENT_PREFIX)
            if supplement:
                title = title.removeprefix(SUPPLEMENT_PREFIX)
                if title == '原文未标小节':
                    title = '补充'
            sections[heading] = {
                'key': f'{collection_id}:{chapter}:{heading}',
                'number': source_number if collection_short_name in SOURCE_SECTION_NUMBERS else len(sections) + 1,
                'order': len(sections) + 1, 'title': title,
                'source_heading': heading, 'count': 0,
                'is_supplement': supplement,
            }
        positions[heading] += 1
        sections[heading]['count'] += 1
        result[row['id']] = {
            'section': sections[heading],
            'section_hadith_number': positions[heading],
            'original_number': original_number,
            'body': body,
            'notes': notes,
            **extras,
        }
    return result
