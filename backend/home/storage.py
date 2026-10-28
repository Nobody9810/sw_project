"""Media storage: images are stored as WebP masters. PDFs are optimized after their article is saved."""
import logging
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from .images import is_image_name, to_webp, webp_name

logger = logging.getLogger(__name__)


class CompressedFileSystemStorage(FileSystemStorage):
    def save(self, name, content, max_length=None):
        size = getattr(content, 'size', None)
        if size is not None and size > settings.MAX_UPLOAD_SIZE:
            raise ValidationError('文件不能超过 25 MB')
        # Callers already sized some images themselves (avatars).
        if is_image_name(name) and not getattr(content, '_compressed', False):
            content.seek(0)
            converted = to_webp(content.read())
            content.seek(0)
            if converted is not None:
                name = webp_name(name)
                content = ContentFile(converted, name=name)
        result = super().save(name, content, max_length=max_length)
        logger.info('保存媒体文件: %s', result)
        return result
