"""Shared source syntax only; importing this module never reads source files."""
import re

ABUDAWUD_NUMBERED = re.compile(r'^[★☆\]]?(\d+)(?:[、.．\s]+)?(\D.*)$', re.S)
MUSLIM_NUMBERED = re.compile(r'^(?:[\[【［t]|(?=\d+[\]】］]\s+[\u4e00-\u9fff]))(\d+)([\]】］)l]|(?=\s))\s*(.*)$', re.S)
TIRMIDHI_NUMBERED = re.compile(r'^(?:[\[【［I]\s*|(?=\d+[\]】］]))(\d+)\s*(\.J|[\]】］J）l)]|(?=[\u4e00-\u9fff]))\s*(.*)$', re.S)
BUKHARI_NUMBERED = re.compile(r'^\|?(?:[【\[［(（t{]|(?=\d{1,5}\s*[】\]］]))\s*(\d(?:\s*\d){0,4})([】\]］)）jJlI|]+|(?=\s|[\u4e00-\u9fff]))\s*(.*)$', re.S)
READING_NUMBERED = re.compile(r'^【(\d+(?:、\d+)*(?:重)?)(】)\s*(.*)$', re.S)
INTRO_END = '【圣训正文】'
SUPPLEMENT_PREFIX = '补充译文｜'
MAIN_LAST_CHAPTER = '第三十六篇：礼仪部'
SUPPLEMENT_CHAPTER = '第三十七篇：补充'

class ReadingNumberPattern:
    def match(self, text):
        return READING_NUMBERED.match(text) or BUKHARI_NUMBERED.match(text)

READING_NUMBERS = ReadingNumberPattern()
