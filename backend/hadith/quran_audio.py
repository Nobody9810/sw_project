"""MP3 header reads for auditing official recordings; never used to alter timings."""
import re

import requests


MP3_BITRATES = {1: (0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320),
                2: (0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160)}
MP3_SAMPLE_RATES = {3: (44100, 48000, 32000), 2: (22050, 24000, 16000), 0: (11025, 12000, 8000)}
MP3_CBR_FRAMES = 20  # consecutive equal bitrates required before trusting a constant-bitrate estimate


def mp3_duration_ms(head, total_size, offset):
    """Exact duration from a Xing/Info/VBRI frame count, or from a constant bitrate.

    `head` holds bytes from `offset` (just after any ID3v2 tag). Returns None whenever the
    duration cannot be determined reliably, e.g. a variable bitrate without a frame count.
    """
    frames = []
    index = 0
    while index + 4 <= len(head) and len(frames) < MP3_CBR_FRAMES:
        value = int.from_bytes(head[index:index + 4], 'big')
        version, layer = (value >> 19) & 3, (value >> 17) & 3
        bitrate_index, rate_index = (value >> 12) & 15, (value >> 10) & 3
        if ((value >> 21) & 0x7FF != 0x7FF or version == 1 or layer != 1
                or bitrate_index in (0, 15) or rate_index == 3):
            if frames:
                return None  # Frames must be contiguous; anything else is not a plain MP3 stream.
            index += 1
            continue
        bitrate = MP3_BITRATES[1 if version == 3 else 2][bitrate_index] * 1000
        rate = MP3_SAMPLE_RATES[version][rate_index]
        samples = 1152 if version == 3 else 576
        size = (144 if version == 3 else 72) * bitrate // rate + ((value >> 9) & 1)
        if not frames:
            first = head[index:index + 200]
            for tag, flags_at, count_at in ((b'Xing', 4, 8), (b'Info', 4, 8), (b'VBRI', None, 14)):
                position = first.find(tag)
                if position < 0:
                    continue
                if flags_at is not None and not first[position + flags_at + 3] & 1:
                    break  # Tag without a frame count.
                count = int.from_bytes(first[position + count_at:position + count_at + 4], 'big')
                return count * samples * 1000 / rate if count > 0 else None
            start = index
        frames.append(bitrate)
        index += size
    if len(frames) < MP3_CBR_FRAMES or len(set(frames)) != 1:
        return None  # Not provably constant bitrate.
    return (total_size - offset - start) * 8 * 1000 / frames[0]


def audio_duration_ms(url):
    """Read only the MP3 headers of the official file with two small Range requests."""
    def read(first, last):
        response = requests.get(url, headers={'Range': f'bytes={first}-{last}', 'User-Agent': 'ShuweiQuran/1.0'},
                                timeout=(2, 5), allow_redirects=False, stream=True)
        try:
            match = re.fullmatch(r'bytes \d+-\d+/(\d+)', response.headers.get('Content-Range', ''))
            if response.status_code != 206 or not match:
                return None, None
            return response.raw.read(last - first + 1, decode_content=False), int(match.group(1))
        finally:
            response.close()
    try:
        head, total = read(0, 9)
        if not head or len(head) < 10:
            return None
        offset = 0
        if head[:3] == b'ID3':
            offset = 10 + ((head[6] & 127) << 21 | (head[7] & 127) << 14 | (head[8] & 127) << 7 | (head[9] & 127))
        frames, total = read(offset, offset + 32767)  # >= 31 frames even at 320 kbps
        return mp3_duration_ms(frames, total, offset) if frames else None
    except (requests.RequestException, ValueError):
        return None
