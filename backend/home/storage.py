"""
自定义存储类，支持自动压缩
"""
import os
import sys
from django.core.files.storage import FileSystemStorage
from django.core.files.base import ContentFile
from .compression import compress_image, compress_pdf, should_compress_file

# 确保 print 输出立即刷新
def print_flush(*args, **kwargs):
    """带立即刷新的 print 函数"""
    kwargs.setdefault('flush', True)
    print(*args, **kwargs)
    sys.stdout.flush()
    sys.stderr.flush()


class CompressedFileSystemStorage(FileSystemStorage):
    """
    支持自动压缩的文件存储类
    """
    
    def save(self, name, content, max_length=None):
        """
        保存文件时自动压缩
        
        注意：如果文件已经被压缩过（通过检查 _compressed 标记），则跳过压缩以避免双重压缩
        """
        # 测试输出 - 确认存储类被调用
        print_flush("=" * 80)
        print_flush(f"[存储] ⚡ 存储类 save 方法被调用！文件名: {name}")
        print_flush("=" * 80)
        
        # 获取文件扩展名
        ext = os.path.splitext(name)[1].lower()
        
        # 判断文件类型
        image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        pdf_exts = ['.pdf']
        
        # 获取文件大小用于诊断
        try:
            content.seek(0, os.SEEK_END)
            file_size = content.tell()
            content.seek(0)
            print_flush(f"[存储] 保存文件: {name} (大小: {file_size / 1024:.2f} KB)")
        except Exception:
            print_flush(f"[存储] 保存文件: {name}")
        
        # 检查文件是否已经被压缩过（避免双重压缩）
        is_already_compressed = getattr(content, '_compressed', False)
        print_flush(f"[存储] 检查压缩标记: is_already_compressed={is_already_compressed}, 文件类型={ext}")
        
        # 如果是图片或PDF，且需要压缩，且未被压缩过，则进行压缩
        if not is_already_compressed:
            if ext in image_exts:
                if should_compress_file(content, 'image'):
                    print_flush(f"[存储] 开始压缩图片: {name}")
                    content = compress_image(content)
                    # 标记已压缩
                    content._compressed = True
                else:
                    print_flush(f"[存储] 图片文件不需要压缩（文件太小或已压缩）")
            elif ext in pdf_exts:
                print_flush(f"[存储] 检测到PDF文件: {name} (大小: {file_size / 1024:.2f} KB)")
                if should_compress_file(content, 'pdf'):
                    print_flush(f"[存储] 开始压缩PDF: {name}")
                    content = compress_pdf(content)
                    # 标记已压缩
                    content._compressed = True
                else:
                    print_flush(f"[存储] PDF文件不需要压缩（文件大小: {file_size / 1024:.2f} KB < 500 KB）")
            else:
                print_flush(f"[存储] 跳过非压缩格式: {name}\n")
        else:
            print_flush(f"[存储] 文件已压缩，跳过压缩: {name}\n")
        
        # 调用父类的save方法
        result = super().save(name, content, max_length)
        print_flush(f"[存储] ✓ 文件保存完成: {result}\n")
        return result

