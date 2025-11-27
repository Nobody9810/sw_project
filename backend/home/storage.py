"""
自定义存储类，支持自动压缩
"""
from django.core.files.storage import FileSystemStorage
from django.core.files.base import ContentFile
from .compression import compress_image, compress_pdf, should_compress_file
import os


class CompressedFileSystemStorage(FileSystemStorage):
    """
    支持自动压缩的文件存储类
    """
    
    def save(self, name, content, max_length=None):
        """
        保存文件时自动压缩
        """
        # 获取文件扩展名
        ext = os.path.splitext(name)[1].lower()
        
        # 判断文件类型
        image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        pdf_exts = ['.pdf']
        
        print(f"[存储] 保存文件: {name}")
        
        # 如果是图片或PDF，且需要压缩，则进行压缩
        if ext in image_exts:
            if should_compress_file(content, 'image'):
                content = compress_image(content)
        elif ext in pdf_exts:
            if should_compress_file(content, 'pdf'):
                content = compress_pdf(content)
        else:
            print(f"[存储] 跳过非压缩格式: {name}\n")
        
        # 调用父类的save方法
        result = super().save(name, content, max_length)
        print(f"[存储] ✓ 文件保存完成: {result}\n")
        return result

