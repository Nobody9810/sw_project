"""Compatibility URLs backed exclusively by Quran Foundation."""
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from .quran_constants import VERSE_COUNTS


@require_GET
def quran_proxy(request, edition, path=''):
    from .quran_reader import ReaderError, chapter_detail, configured, reader_error_response
    number = path.rstrip('/')
    if edition not in ('quran-simple', 'quran-uthmani', 'zho-majian'):
        return JsonResponse({'error': '不支持的古兰经版本'}, status=400)
    if not 1 <= len(number) <= 3 or not number.isascii() or not number.isdigit() or not 1 <= int(number) <= 114:
        return JsonResponse({'error': '章节号必须为 1 至 114 的整数'}, status=400)
    if not configured():
        return JsonResponse({'error': '古兰经服务尚未配置完整的后端 OAuth 凭据', 'code': 'reader_not_configured'}, status=503)
    try:
        data = chapter_detail(int(number))
        if edition == 'zho-majian':
            if data['translation_status'] == 'unavailable':
                return JsonResponse({'error': '官方数据源暂未提供本站所用中文译本', 'code': 'translation_unavailable'}, status=404)
            data = {**data, 'verses': [{'verse': row['verse'], 'text': row['translation']} for row in data['verses']]}
        return JsonResponse({**data, 'edition': edition}, json_dumps_params={'ensure_ascii': False})
    except ReaderError as error:
        return reader_error_response(error, 'legacy-' + edition, int(number))
