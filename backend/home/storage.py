"""Image optimization storage. PDF originals are preserved."""
import logging
import os
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.storage import FileSystemStorage
from .compression import compress_image, should_compress_file

logger = logging.getLogger(__name__)


class CompressedFileSystemStorage(FileSystemStorage):
    def save(self, name, content, max_length=None):
        size = getattr(content, 'size', None)
        if size is not None and size > settings.MAX_UPLOAD_SIZE:
            raise ValidationError('文件不能超过 25 MB')
        extension = os.path.splitext(name)[1].lower()
        if (extension in ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')
                and not getattr(content, '_compressed', False)
                and should_compress_file(content, 'image')):
            if not getattr(content, 'name', None):
                content.name = name
            content = compress_image(content)
        result = super().save(name, content, max_length=max_length)
        logger.info('保存媒体文件: %s', result)
        return result
