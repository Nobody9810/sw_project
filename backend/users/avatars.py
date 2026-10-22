"""Reader avatars: a fixed set of geometric presets (drawn by the frontend) or an uploaded image
re-encoded on the server, which drops EXIF/GPS and any other embedded data."""
from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

# Keep in sync with frontend/src/features/auth/avatarPresets.js (checked by a frontend test).
PATTERNS = ('khatam', 'rosette', 'zellij', 'lattice', 'arch', 'rings')
COLORS = ('green', 'sand', 'indigo')
PRESETS = frozenset(f'{pattern}-{color}' for pattern in PATTERNS for color in COLORS)

MAX_BYTES = 2 * 1024 * 1024
MAX_PIXELS = 40_000_000
SIZE = 256
FORMATS = {'JPEG', 'PNG', 'WEBP', 'GIF'}


class AvatarError(ValueError):
    pass


def process_upload(upload):
    """Return a square WEBP ContentFile, or raise AvatarError with a reader-facing message."""
    if upload.size > MAX_BYTES:
        raise AvatarError('图片不能超过 2 MB')
    try:
        with Image.open(upload) as source:
            if source.format not in FORMATS:
                raise AvatarError('请上传 JPG、PNG、WEBP 或 GIF 图片')
            if source.width * source.height > MAX_PIXELS:
                raise AvatarError('图片尺寸过大')
            image = ImageOps.exif_transpose(source)
            image = image.convert('RGBA' if 'A' in image.getbands() or 'transparency' in source.info else 'RGB')
            image = ImageOps.fit(image, (SIZE, SIZE), Image.Resampling.LANCZOS)
            output = BytesIO()
            image.save(output, 'WEBP', quality=85, method=4)
    except AvatarError:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError, SyntaxError):
        raise AvatarError('无法识别这张图片，请换一张试试')
    content = ContentFile(output.getvalue(), name='avatar.webp')
    content._compressed = True  # Already sized; skip the media storage's generic recompression.
    return content


def avatar_data(user):
    profile = getattr(user, 'profile', None) if user.is_authenticated else None
    if profile is None:
        return None
    if profile.avatar:
        return {'type': 'image', 'url': profile.avatar.url}
    if profile.avatar_preset in PRESETS:
        return {'type': 'preset', 'key': profile.avatar_preset}
    return None
