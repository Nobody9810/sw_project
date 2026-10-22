from pathlib import Path
from django.conf import settings
from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError


def validate_upload(uploaded, image_only=False):
    if uploaded.size > settings.MAX_UPLOAD_SIZE:
        raise ValidationError('文件不能超过 25 MB')
    extension = Path(uploaded.name).suffix.lower().lstrip('.')
    images = {'jpg': 'JPEG', 'jpeg': 'JPEG', 'png': 'PNG', 'gif': 'GIF',
              'webp': 'WEBP', 'bmp': 'BMP'}
    try:
        if extension == 'pdf' and not image_only:
            if not uploaded.read(5).startswith(b'%PDF-'):
                raise ValidationError('PDF 格式不正确')
        elif extension in images:
            with Image.open(uploaded) as image:
                if image.format != images[extension]:
                    raise ValidationError('图片格式与文件扩展名不一致')
                image.verify()
        else:
            raise ValidationError('不支持的文件类型')
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError):
        raise ValidationError('文件格式无效')
    finally:
        uploaded.seek(0)
