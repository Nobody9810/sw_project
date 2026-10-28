"""One image policy for covers and rich-text pictures.

Stored files are WebP masters no larger than MASTER_MAX_EDGE; list cards use
sorl thumbnails made from them. Animated images keep their original bytes.
"""
import logging
from io import BytesIO
from pathlib import PurePosixPath

from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

MASTER_MAX_EDGE = 1600
MASTER_QUALITY = 82
# Cards show covers at most ~240 px wide; 480 px keeps them sharp on 2x screens.
CARD_GEOMETRY = '480x720'
CARD_QUALITY = 78
IMAGE_EXTENSIONS = frozenset({'.jpg', '.jpeg', '.jfif', '.png', '.gif', '.bmp', '.webp'})
EMPTY_NAMES = (None, '', 'null', 'None')


def is_image_name(name):
    return PurePosixPath(name or '').suffix.lower() in IMAGE_EXTENSIONS


def webp_name(name):
    return str(PurePosixPath(name).with_suffix('.webp'))


def to_webp(data):
    """WebP master bytes, the input itself when already compliant, or None to keep the file as is."""
    try:
        with Image.open(BytesIO(data)) as source:
            if getattr(source, 'is_animated', False):
                return None
            if source.format == 'WEBP' and max(source.size) <= MASTER_MAX_EDGE:
                return data
            icc_profile = source.info.get('icc_profile')
            image = ImageOps.exif_transpose(source)
            image.thumbnail((MASTER_MAX_EDGE, MASTER_MAX_EDGE), Image.Resampling.LANCZOS)
            transparent = image.mode in ('RGBA', 'LA', 'PA') or 'transparency' in image.info
            image = image.convert('RGBA' if transparent else 'RGB')
            output = BytesIO()
            # EXIF (camera, GPS) is dropped; the colour profile is kept.
            image.save(output, format='WEBP', quality=MASTER_QUALITY, method=6,
                       **({'icc_profile': icc_profile} if icc_profile else {}))
            return output.getvalue()
    except (OSError, ValueError, Image.DecompressionBombError) as error:
        logger.warning('图片无法转换，保留原文件: %s', error)
        return None


def card_image_url(source):
    """List-card thumbnail URL for an uploaded file or a local /media/ URL.

    External URLs are returned unchanged; a failed thumbnail falls back to the
    original so the frontend can still show it or its placeholder.
    """
    from django.core.files.storage import default_storage
    from sorl.thumbnail import get_thumbnail
    from .media_refs import media_name
    if isinstance(source, str):
        original = source
        source = media_name(source)
        if not source or not is_image_name(source):
            return original
        storage, name = default_storage, source
    else:
        original, storage, name = source.url, source.storage, source.name
    try:
        # sorl would return a URL for a thumbnail it could not create.
        if not storage.exists(name):
            return original
        return get_thumbnail(source, CARD_GEOMETRY, format='WEBP', quality=CARD_QUALITY, upscale=False).url
    except Exception:
        logger.exception('缩略图生成失败: %s', original)
        return original


def card_image(item):
    """The card image of an article: its cover, else its first content image, else None."""
    from .html import first_content_image
    cover = getattr(item, '图片', None)
    if getattr(cover, 'name', None) not in EMPTY_NAMES:
        return card_image_url(cover)
    content_image = first_content_image(getattr(item, '内容', None))
    return card_image_url(content_image) if content_image else None
