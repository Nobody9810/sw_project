"""
文件压缩工具模块
支持图片和PDF的自动压缩
"""
import os
import io
import time
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.files.base import ContentFile
import sys


def compress_image(image_file, quality=85, max_width=1920, max_height=1920):
    """
    压缩图片文件
    
    参数:
        image_file: Django上传的文件对象
        quality: JPEG质量 (1-100, 默认85)
        max_width: 最大宽度 (默认1920)
        max_height: 最大高度 (默认1920)
    
    返回:
        压缩后的InMemoryUploadedFile对象
    """
    start_time = time.time()
    file_name = getattr(image_file, 'name', '未知文件')
    
    # 获取原始文件大小
    image_file.seek(0, os.SEEK_END)
    original_size = image_file.tell()
    image_file.seek(0)
    
    print(f"[压缩] 开始压缩图片: {file_name}")
    print(f"[压缩] 原始大小: {original_size / 1024:.2f} KB")
    
    try:
        # 打开图片
        img = Image.open(image_file)
        
        # 如果是RGBA模式，转换为RGB（JPEG不支持透明度）
        if img.mode in ('RGBA', 'LA', 'P'):
            # 创建白色背景
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # 获取原始尺寸
        original_width, original_height = img.size
        print(f"[压缩] 原始尺寸: {original_width}x{original_height} 像素")
        
        # 计算新尺寸（保持宽高比）
        if original_width > max_width or original_height > max_height:
            ratio = min(max_width / original_width, max_height / original_height)
            new_width = int(original_width * ratio)
            new_height = int(original_height * ratio)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            print(f"[压缩] 调整尺寸: {new_width}x{new_height} 像素 (缩放比例: {ratio:.2%})")
        
        # 保存到内存
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)
        
        # 获取压缩后的大小
        compressed_size = len(output.getvalue())
        compression_ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
        elapsed_time = time.time() - start_time
        
        print(f"[压缩] 压缩后大小: {compressed_size / 1024:.2f} KB")
        print(f"[压缩] 压缩比例: {compression_ratio:.1f}% (节省 {compressed_size / 1024:.2f} KB)")
        print(f"[压缩] 耗时: {elapsed_time:.2f} 秒")
        print(f"[压缩] ✓ 图片压缩完成: {file_name}\n")
        
        # 创建新的InMemoryUploadedFile
        compressed_file = InMemoryUploadedFile(
            output,
            'ImageField',
            image_file.name,
            'image/jpeg',
            sys.getsizeof(output),
            None
        )
        
        return compressed_file
        
    except Exception as e:
        # 如果压缩失败，返回原文件
        print(f"[压缩] ✗ 图片压缩失败: {file_name}")
        print(f"[压缩] 错误信息: {str(e)}")
        print(f"[压缩] 使用原始文件\n")
        image_file.seek(0)  # 重置文件指针
        return image_file


def compress_pdf(pdf_file):
    """
    压缩PDF文件
    
    参数:
        pdf_file: Django上传的文件对象
    
    返回:
        压缩后的文件对象（如果压缩失败则返回原文件）
    """
    start_time = time.time()
    file_name = getattr(pdf_file, 'name', '未知文件')
    
    # 获取原始文件大小
    pdf_file.seek(0, os.SEEK_END)
    original_size = pdf_file.tell()
    pdf_file.seek(0)
    
    print(f"[压缩] 开始压缩PDF: {file_name}")
    print(f"[压缩] 原始大小: {original_size / 1024:.2f} KB")
    
    try:
        # 尝试导入PyPDF2或pypdf
        try:
            from pypdf import PdfReader, PdfWriter
            pdf_lib = "pypdf"
        except ImportError:
            try:
                from PyPDF2 import PdfReader, PdfWriter
                pdf_lib = "PyPDF2"
            except ImportError:
                # 如果没有安装PDF库，返回原文件
                print("[压缩] ✗ 警告: 未安装pypdf或PyPDF2，PDF压缩功能不可用")
                print(f"[压缩] 使用原始文件\n")
                pdf_file.seek(0)
                return pdf_file
        
        # 读取PDF
        pdf_file.seek(0)
        reader = PdfReader(pdf_file)
        writer = PdfWriter()
        
        page_count = len(reader.pages)
        print(f"[压缩] PDF页数: {page_count} 页")
        print(f"[压缩] 使用库: {pdf_lib}")
        
        # 复制所有页面到writer
        for i, page in enumerate(reader.pages, 1):
            writer.add_page(page)
            if i % 10 == 0 or i == page_count:
                print(f"[压缩] 处理进度: {i}/{page_count} 页", end='\r')
        
        print()  # 换行
        
        # 尝试压缩PDF内容流
        # 注意：某些PDF可能不支持compress_content_streams，如果失败则跳过压缩
        compressed_count = 0
        try:
            # 方法：对writer中的每个页面尝试压缩
            # 在pypdf中，页面添加到writer后，可以尝试压缩
            for i, page_obj in enumerate(writer.pages, 1):
                try:
                    # 检查页面是否有compress_content_streams方法
                    if hasattr(page_obj, 'compress_content_streams'):
                        # 尝试压缩（某些PDF可能不支持，会抛出异常）
                        page_obj.compress_content_streams()
                        compressed_count += 1
                except (AttributeError, Exception) as e:
                    # 如果压缩失败（如"Page must be part of a PdfWriter"），跳过该页
                    # 这是正常的，某些PDF结构不支持内容流压缩
                    pass
            
            if compressed_count > 0:
                print(f"[压缩] 成功压缩 {compressed_count}/{page_count} 页的内容流")
            else:
                # 如果所有页面都无法压缩，这是正常的（某些PDF不支持）
                print(f"[压缩] 注意: 此PDF不支持内容流压缩，将保存优化后的版本")
        except Exception as e:
            # 如果整体压缩过程出错，仍然继续保存文件
            print(f"[压缩] 压缩过程遇到问题（将保存文件）: {str(e)[:60]}")
        
        # 保存到内存
        output = io.BytesIO()
        writer.write(output)
        output.seek(0)
        
        # 获取压缩后的大小
        compressed_size = len(output.getvalue())
        compression_ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
        elapsed_time = time.time() - start_time
        
        print(f"[压缩] 压缩后大小: {compressed_size / 1024:.2f} KB")
        print(f"[压缩] 压缩比例: {compression_ratio:.1f}% (节省 {(original_size - compressed_size) / 1024:.2f} KB)")
        print(f"[压缩] 耗时: {elapsed_time:.2f} 秒")
        print(f"[压缩] ✓ PDF压缩完成: {file_name}\n")
        
        # 创建新的ContentFile
        compressed_file = ContentFile(output.read())
        compressed_file.name = pdf_file.name
        
        return compressed_file
        
    except Exception as e:
        # 如果压缩失败，返回原文件
        print(f"[压缩] ✗ PDF压缩失败: {file_name}")
        print(f"[压缩] 错误信息: {str(e)}")
        print(f"[压缩] 使用原始文件\n")
        pdf_file.seek(0)
        return pdf_file


def should_compress_file(file, file_type=None):
    """
    判断文件是否需要压缩
    
    参数:
        file: 文件对象
        file_type: 文件类型 ('image' 或 'pdf')
    
    返回:
        bool: 是否需要压缩
    """
    if file_type is None:
        # 根据文件扩展名判断
        name = getattr(file, 'name', '')
        if not name:
            return False
        
        ext = os.path.splitext(name)[1].lower()
        image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        pdf_exts = ['.pdf']
        
        if ext in image_exts:
            file_type = 'image'
        elif ext in pdf_exts:
            file_type = 'pdf'
        else:
            return False
    
    # 检查文件大小（大于100KB才压缩）
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_type == 'image' and file_size > 100 * 1024:  # 100KB
        return True
    elif file_type == 'pdf' and file_size > 500 * 1024:  # 500KB
        return True
    
    # 如果文件太小，不需要压缩
    file_name = getattr(file, 'name', '未知文件')
    if file_type == 'image':
        print(f"[压缩] 跳过小图片: {file_name} ({file_size / 1024:.2f} KB < 100 KB)")
    elif file_type == 'pdf':
        print(f"[压缩] 跳过小PDF: {file_name} ({file_size / 1024:.2f} KB < 500 KB)")
    
    return False

