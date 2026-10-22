import re


def chapter_order(name):
    match = re.search(r'第(.+?)篇', name)
    if not match:
        return 9999 if name.startswith('附') else 0
    text = match.group(1)
    if text.isdigit():
        return int(text)
    digits = {'零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9}
    # This edition prints section ordinals such as 第一五四节 (154).
    if text and all(char in digits for char in text):
        return int(''.join(str(digits[char]) for char in text))
    units = {'十': 10, '百': 100, '千': 1000}
    total = current = 0
    for char in text:
        if char in digits:
            current = digits[char]
        elif char in units:
            total += (current or 1) * units[char]
            current = 0
        else:
            return 999
    return total + current


def number_order(text):
    digits = ''.join(filter(str.isdigit, text))
    return min(int(digits or 0), 2147483647)
