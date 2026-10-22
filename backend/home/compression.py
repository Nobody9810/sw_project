"""
文件压缩工具模块
支持图片和PDF的自动压缩
"""
import os
import io
import time
import sys
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.files.base import ContentFile

# 确保 print 输出立即刷新（避免缓冲）
def print_flush(*args, **kwargs):
    """带立即刷新的 print 函数，确保输出立即显示在终端"""
    kwargs.setdefault('flush', True)
    print(*args, **kwargs)
    sys.stdout.flush()
    sys.stderr.flush()


def compress_image(image_file, quality=85, max_width=1920, max_height=1920):
    """Preserve file format, alpha and animated originals during optimization."""
    import logging
    logger = logging.getLogger(__name__)
    image_file.seek(0)
    original = image_file.read()
    image_file.seek(0)
    try:
        with Image.open(io.BytesIO(original)) as image:
            if getattr(image, 'is_animated', False):
                return image_file
            extension = os.path.splitext(image_file.name)[1].lower()
            image_format = {'.jpg': 'JPEG', '.jpeg': 'JPEG', '.png': 'PNG',
                            '.webp': 'WEBP', '.gif': 'GIF', '.bmp': 'BMP'}.get(extension)
            if image_format is None or image.format != image_format:
                return image_file
            image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            if image_format == 'JPEG' and image.mode not in ('RGB', 'L'):
                image = image.convert('RGB')
            output = io.BytesIO()
            options = {'quality': quality} if image_format in ('JPEG', 'WEBP') else {}
            if image_format in ('JPEG', 'PNG'):
                options['optimize'] = True
            image.save(output, format=image_format, **options)
            if output.tell() >= len(original):
                return image_file
            output.seek(0)
            result = InMemoryUploadedFile(output, 'ImageField', image_file.name,
                                          Image.MIME[image_format], len(output.getvalue()), None)
            result._compressed = True
            return result
    except Exception:
        logger.exception('图片优化失败，保留原文件: %s', image_file.name)
        image_file.seek(0)
        return image_file


def compress_pdf_with_ghostscript(pdf_file):
    """
    使用Ghostscript进行强力PDF压缩（如果可用）
    
    参数:
        pdf_file: Django上传的文件对象
    
    返回:
        压缩后的文件对象，如果Ghostscript不可用则返回None
    """
    try:
        import subprocess
        import tempfile
        
        file_name = getattr(pdf_file, 'name', '未知文件')
        pdf_file.seek(0, os.SEEK_END)
        original_size = pdf_file.tell()
        pdf_file.seek(0)
        
        print_flush(f"[压缩] 尝试使用Ghostscript压缩: {file_name}")
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_input:
            tmp_input.write(pdf_file.read())
            tmp_input_path = tmp_input.name
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_output:
            tmp_output_path = tmp_output.name
        
        try:
            # 使用Ghostscript进行激进压缩
            # -dPDFSETTINGS=/screen: 高压缩（适合屏幕显示，文件更小，质量仍可接受）
            # 更激进的设置：降低图片分辨率，使用更强的压缩
            result = subprocess.run([
                'gs', '-sDEVICE=pdfwrite',
                '-dCompatibilityLevel=1.4',
                '-dPDFSETTINGS=/screen',  # 使用 /screen 获得更高压缩（比 /ebook 更激进）
                '-dNOPAUSE', '-dQUIET', '-dBATCH',
                '-dDetectDuplicateImages=true',
                '-dColorImageDownsampleType=/Bicubic',
                '-dColorImageResolution=100',  # 降低到100 DPI（更激进）
                '-dGrayImageDownsampleType=/Bicubic',
                '-dGrayImageResolution=100',  # 降低到100 DPI（更激进）
                '-dMonoImageResolution=100',  # 单色图片也降低分辨率
                '-dEmbedAllFonts=false',  # 不嵌入所有字体（减小文件大小）
                '-dSubsetFonts=true',  # 子集化字体
                '-dCompressFonts=true',  # 压缩字体
                '-dOptimize=true',  # 优化PDF结构
                f'-sOutputFile={tmp_output_path}',
                tmp_input_path
            ], check=True, capture_output=True, timeout=300)  # 5分钟超时
            
            # 读取压缩后的文件
            with open(tmp_output_path, 'rb') as f:
                compressed_data = f.read()
            
            compressed_size = len(compressed_data)
            compression_ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
            
            print_flush(f"[压缩] Ghostscript压缩成功: {compressed_size / 1024:.2f} KB (压缩 {compression_ratio:.1f}%)")
            
            # 创建ContentFile
            compressed_file = ContentFile(compressed_data)
            compressed_file.name = file_name
            # 标记已压缩
            compressed_file._compressed = True
            print_flush(f"[压缩] Ghostscript压缩已设置压缩标记: _compressed=True")
            return compressed_file
            
        finally:
            # 清理临时文件
            try:
                if os.path.exists(tmp_input_path):
                    os.remove(tmp_input_path)
                if os.path.exists(tmp_output_path):
                    os.remove(tmp_output_path)
            except Exception:
                pass
                
    except FileNotFoundError:
        print_flush(f"[压缩] Ghostscript未安装，使用标准压缩方法")
        return None
    except subprocess.TimeoutExpired:
        print_flush(f"[压缩] Ghostscript压缩超时，使用标准压缩方法")
        return None
    except Exception as e:
        print_flush(f"[压缩] Ghostscript压缩失败: {str(e)[:60]}，使用标准压缩方法")
        return None


def compress_pdf(pdf_file, _tried_ghostscript=False):
    """
    压缩PDF文件（更激进的压缩策略）
    
    参数:
        pdf_file: Django上传的文件对象
        _tried_ghostscript: 内部参数，防止重复调用Ghostscript
    
    返回:
        压缩后的文件对象（如果压缩失败则返回原文件）
    """
    start_time = time.time()
    file_name = getattr(pdf_file, 'name', '未知文件')
    
    # 获取原始文件大小
    pdf_file.seek(0, os.SEEK_END)
    original_size = pdf_file.tell()
    pdf_file.seek(0)
    
    print_flush(f"[压缩] 开始压缩PDF: {file_name}")
    print_flush(f"[压缩] 原始大小: {original_size / 1024:.2f} KB")
    
    # 优先尝试使用Ghostscript（更激进的压缩）
    # 降低阈值：对于大于500KB的文件都尝试使用Ghostscript
    if not _tried_ghostscript and original_size > 500 * 1024:  # 500KB（与压缩阈值一致）
        print_flush(f"[压缩] 文件大小 {original_size / 1024:.2f} KB > 500 KB，优先使用Ghostscript进行强力压缩")
        gs_result = compress_pdf_with_ghostscript(pdf_file)
        if gs_result is not None:
            return gs_result
        print_flush(f"[压缩] Ghostscript压缩失败或不可用，继续使用标准压缩方法...")
        _tried_ghostscript = True
    
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
                print_flush("[压缩] ✗ 警告: 未安装pypdf或PyPDF2，PDF压缩功能不可用")
                print_flush(f"[压缩] 使用原始文件\n")
                pdf_file.seek(0)
                return pdf_file
        
        # 读取PDF
        pdf_file.seek(0)
        reader = PdfReader(pdf_file)
        writer = PdfWriter()
        
        page_count = len(reader.pages)
        print_flush(f"[压缩] PDF页数: {page_count} 页")
        print_flush(f"[压缩] 使用库: {pdf_lib}")
        
        # 复制所有页面到writer
        for i, page in enumerate(reader.pages, 1):
            writer.add_page(page)
            if i % 10 == 0 or i == page_count:
                print_flush(f"[压缩] 处理进度: {i}/{page_count} 页", end='\r')
        
        print_flush()  # 换行
        
        # 尝试压缩PDF内容流和资源
        # 使用多种压缩方法以获得最佳效果
        compressed_count = 0
        image_compressed_count = 0
        
        try:
            # 方法1：压缩每个页面的内容流
            for i, page_obj in enumerate(writer.pages, 1):
                try:
                    # 检查页面是否有compress_content_streams方法
                    if hasattr(page_obj, 'compress_content_streams'):
                        # 尝试压缩内容流（某些PDF可能不支持，会抛出异常）
                        page_obj.compress_content_streams()
                        compressed_count += 1
                except (AttributeError, Exception) as e:
                    # 如果压缩失败，跳过该页
                    pass
                
                # 方法2：尝试压缩页面中的图片资源
                try:
                    if hasattr(page_obj, 'images') and page_obj.images:
                        # 对于pypdf，可以访问images属性
                        # 注意：图片压缩需要额外的库，这里先记录
                        image_compressed_count += len(page_obj.images) if hasattr(page_obj.images, '__len__') else 0
                except Exception:
                    pass
            
            # 方法3：移除不必要的元数据和优化PDF结构
            try:
                # 移除文档信息（如果不需要）
                if hasattr(writer, 'remove_links'):
                    # 某些版本可能支持移除链接
                    pass
            except Exception:
                pass
            
            if compressed_count > 0:
                print_flush(f"[压缩] 成功压缩 {compressed_count}/{page_count} 页的内容流")
            else:
                print_flush(f"[压缩] 注意: 此PDF不支持内容流压缩，将尝试其他优化方法")
            
            if image_compressed_count > 0:
                print_flush(f"[压缩] 检测到 {image_compressed_count} 个图片资源（图片压缩需要额外配置）")
                
        except Exception as e:
            # 如果整体压缩过程出错，仍然继续保存文件
            print_flush(f"[压缩] 压缩过程遇到问题（将保存文件）: {str(e)[:60]}")
        
        # 保存到内存
        output = io.BytesIO()
        writer.write(output)
        output.seek(0)
        
        # 获取压缩后的大小
        compressed_size = len(output.getvalue())
        compression_ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
        saved_size = original_size - compressed_size
        elapsed_time = time.time() - start_time
        
        print_flush(f"[压缩] 压缩后大小: {compressed_size / 1024:.2f} KB")
        print_flush(f"[压缩] 压缩比例: {compression_ratio:.1f}% (节省 {saved_size / 1024:.2f} KB)")
        print_flush(f"[压缩] 耗时: {elapsed_time:.2f} 秒")
        
        # 检查压缩效果
        if compressed_size >= original_size:
            size_increase = (compressed_size - original_size) / original_size * 100
            print_flush(f"[压缩] ⚠️ 警告: 压缩后文件增大 {size_increase:.1f}%（可能PDF已经高度优化）")
            print_flush(f"[压缩] 将尝试使用Ghostscript进行更强压缩...")
        elif compression_ratio < 5:
            print_flush(f"[压缩] ⚠️ 警告: 压缩效果不明显（仅减小 {compression_ratio:.1f}%）")
            print_flush(f"[压缩] 将尝试使用Ghostscript进行更强压缩...")
        else:
            print_flush(f"[压缩] ✓ PDF压缩完成: {file_name}")
        
        print_flush()  # 空行
        
        # 更激进的策略：如果pypdf压缩效果不好，尝试使用Ghostscript
        size_increase_ratio = (compressed_size - original_size) / original_size * 100 if original_size > 0 else 0
        
        # 如果压缩后文件变大或压缩效果不明显（<5%），尝试使用Ghostscript
        if (compressed_size >= original_size or compression_ratio < 5) and not _tried_ghostscript:
            if compressed_size >= original_size:
                print_flush(f"[压缩] 标准压缩后文件增大 {size_increase_ratio:.1f}%，尝试使用Ghostscript进行更强压缩...")
            else:
                print_flush(f"[压缩] 标准压缩效果不明显（仅减小 {compression_ratio:.1f}%），尝试使用Ghostscript进行更强压缩...")
            
            # 尝试使用Ghostscript
            pdf_file.seek(0)
            gs_result = compress_pdf_with_ghostscript(pdf_file)
            if gs_result is not None:
                return gs_result
            print_flush(f"[压缩] Ghostscript不可用或效果不佳，使用标准压缩结果\n")
        
        # 更激进的策略：即使压缩后稍微变大（<15%），也使用压缩后的文件
        # 如果明显变大（>15%），使用原文件
        if compressed_size >= original_size:
            size_increase_ratio = (compressed_size - original_size) / original_size * 100
            if size_increase_ratio > 15:
                print_flush(f"[压缩] 压缩后文件增大 {size_increase_ratio:.1f}%（>15%），使用原始文件\n")
                pdf_file.seek(0)
                return pdf_file
            else:
                # 即使稍微变大（<15%），也使用压缩后的文件（更激进的策略）
                print_flush(f"[压缩] 压缩后文件增大 {size_increase_ratio:.1f}%（<15%），仍使用压缩后的文件（激进策略）\n")
        
        # 创建新的ContentFile
        compressed_file = ContentFile(output.read())
        compressed_file.name = pdf_file.name
        # 标记已压缩，避免存储类重复压缩
        compressed_file._compressed = True
        print_flush(f"[压缩] 已设置压缩标记: _compressed=True")
        
        return compressed_file
        
    except Exception as e:
        # 如果压缩失败，返回原文件
        print_flush(f"[压缩] ✗ PDF压缩失败: {file_name}")
        print_flush(f"[压缩] 错误信息: {str(e)}")
        print_flush(f"[压缩] 使用原始文件\n")
        pdf_file.seek(0)
        return pdf_file


def should_compress_file(file, file_type=None):
    """Only optimize images over 100 KB in upload requests."""
    extension = os.path.splitext(getattr(file, 'name', None) or '')[1].lower()
    if file_type == 'pdf' or extension == '.pdf':
        return False
    if extension not in ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'):
        return False
    try:
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        return size > 100 * 1024
    except (OSError, ValueError):
        return False
