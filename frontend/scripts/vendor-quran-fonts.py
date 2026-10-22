#!/usr/bin/env python3
"""Download the exact Quran font versions already used by the reader, once at development time."""
import hashlib
import json
from pathlib import Path
import struct
import sys
import tempfile
from urllib.error import URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

DESTINATION = Path(__file__).resolve().parents[1] / 'src' / 'assets' / 'fonts'
BASE = 'https://verses.quran.foundation/fonts/quran/hafs/'
FONTS = {
    'UthmanicHafs1Ver18.woff2': BASE + 'uthmanic_hafs/UthmanicHafs1Ver18.woff2',
    'indopak-nastaleeq-waqf-lazim-v4.2.1.woff2': BASE + 'nastaleeq/indopak/indopak-nastaleeq-waqf-lazim-v4.2.1.woff2',
}
LIMIT = 8 * 1024 * 1024


class SameHostRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        from urllib.parse import urlparse
        parsed = urlparse(new_url)
        if parsed.scheme != 'https' or parsed.hostname != 'verses.quran.foundation':
            raise ValueError('字体下载被重定向到非预期来源')
        return super().redirect_request(request, response, code, message, headers, new_url)


def validate_font(data):
    if len(data) < 48 or data[:4] != b'wOF2' or struct.unpack('>I', data[8:12])[0] != len(data):
        raise ValueError('响应不是完整 WOFF2 字体；未使用错误页或备用字体')


def main():
    downloaded = {}
    opener = build_opener(SameHostRedirect())
    for filename, url in FONTS.items():
        request = Request(url, headers={'User-Agent': 'Shuwei-font-vendor/1.0'})
        with opener.open(request, timeout=45) as response:
            data = response.read(LIMIT + 1)
        if len(data) > LIMIT:
            raise ValueError('字体超过大小上限')
        validate_font(data)
        downloaded[filename] = data
        print(f'已核验 {filename}：{len(data)} 字节')
    DESTINATION.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for filename, data in downloaded.items():
        with tempfile.NamedTemporaryFile(dir=DESTINATION, delete=False) as temporary:
            temporary.write(data)
            staged = Path(temporary.name)
        staged.replace(DESTINATION / filename)
        manifest[filename] = {'source': FONTS[filename], 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
    (DESTINATION / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'字体已保存：{DESTINATION}；没有访问数据库或任何凭据。')


if __name__ == '__main__':
    try:
        main()
    except (OSError, URLError, ValueError) as error:
        print(f'下载未完成：{error}', file=sys.stderr)
        sys.exit(1)
