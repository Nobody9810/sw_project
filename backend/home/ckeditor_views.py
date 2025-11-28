"""
自定义CKEditor上传视图，支持文件压缩
"""
import os
import sys
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.conf import settings
from django_ckeditor_5.permissions import check_upload_permission
from django_ckeditor_5.exceptions import NoImageException
from django_ckeditor_5.storage_utils import image_verify
from django_ckeditor_5.forms import UploadFileForm
from .compression import compress_image, compress_pdf, should_compress_file
from .storage import CompressedFileSystemStorage

# 确保 print 输出立即刷新
def print_flush(*args, **kwargs):
    """带立即刷新的 print 函数"""
    kwargs.setdefault('flush', True)
    print(*args, **kwargs)
    sys.stdout.flush()
    sys.stderr.flush()


@require_POST
@check_upload_permission
def upload_file(request):
    """
    自定义CKEditor文件上传视图，支持自动压缩
    """
    try:
        form = UploadFileForm(request.POST, request.FILES)
        allow_all_file_types = getattr(settings, "CKEDITOR_5_ALLOW_ALL_FILE_TYPES", False)
        
        # 验证图片（如果不是允许所有文件类型）
        if not allow_all_file_types:
            try:
                image_verify(request.FILES["upload"])
            except NoImageException as ex:
                return JsonResponse({"error": {"message": f"{ex}"}}, status=400)
        
        if form.is_valid():
            uploaded_file = request.FILES["upload"]
            
            print_flush(f"\n{'='*60}")
            print_flush(f"[CKEditor上传] 收到上传请求: {uploaded_file.name}")
            print_flush(f"{'='*60}")
            
            try:
                # 获取文件扩展名
                file_name = uploaded_file.name
                ext = os.path.splitext(file_name)[1].lower()
                
                # 根据文件类型进行压缩
                image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
                pdf_exts = ['.pdf']
                
                if ext in image_exts:
                    # 压缩图片
                    try:
                        if should_compress_file(uploaded_file, 'image'):
                            print_flush(f"[CKEditor上传] 开始压缩图片: {file_name}")
                            uploaded_file = compress_image(uploaded_file)
                            # 确保文件指针在开始位置
                            if hasattr(uploaded_file, 'seek'):
                                uploaded_file.seek(0)
                        else:
                            print_flush(f"[CKEditor上传] 图片文件不需要压缩")
                    except Exception as e:
                        print_flush(f"[CKEditor上传] ✗ 图片压缩失败: {str(e)}")
                        # 压缩失败时使用原文件，重置文件指针
                        uploaded_file.seek(0)
                elif ext in pdf_exts:
                    # 压缩PDF
                    try:
                        if should_compress_file(uploaded_file, 'pdf'):
                            print_flush(f"[CKEditor上传] 开始压缩PDF: {file_name}")
                            uploaded_file = compress_pdf(uploaded_file)
                            # 确保文件指针在开始位置
                            if hasattr(uploaded_file, 'seek'):
                                uploaded_file.seek(0)
                        else:
                            print_flush(f"[CKEditor上传] PDF文件不需要压缩")
                    except Exception as e:
                        print_flush(f"[CKEditor上传] ✗ PDF压缩失败: {str(e)}")
                        # 压缩失败时使用原文件，重置文件指针
                        uploaded_file.seek(0)
                else:
                    print_flush(f"[CKEditor上传] 文件类型不支持压缩: {file_name}")
                
                # 确保文件指针在开始位置（保存前必须）
                if hasattr(uploaded_file, 'seek'):
                    uploaded_file.seek(0)
                
                # 使用自定义存储保存文件
                try:
                    print_flush(f"[CKEditor上传] 准备保存文件到存储: {uploaded_file.name}")
                    # 检查文件是否已被压缩
                    is_compressed = getattr(uploaded_file, '_compressed', False)
                    print_flush(f"[CKEditor上传] 文件压缩标记: {is_compressed}")
                    
                    storage = CompressedFileSystemStorage()
                    filename = storage.save(uploaded_file.name, uploaded_file)
                    url = storage.url(filename)
                    
                    print_flush(f"[CKEditor上传] ✓ 上传完成，URL: {url}")
                    print_flush(f"{'='*60}\n")
                    
                    return JsonResponse({"url": url})
                except Exception as e:
                    error_msg = f"保存文件失败: {str(e)}"
                    print_flush(f"[CKEditor上传] ✗ {error_msg}")
                    print_flush(f"{'='*60}\n")
                    return JsonResponse({"error": {"message": error_msg}}, status=500)
                    
            except Exception as e:
                error_msg = f"处理文件失败: {str(e)}"
                print_flush(f"[CKEditor上传] ✗ {error_msg}")
                print_flush(f"{'='*60}\n")
                import traceback
                traceback.print_exc()
                return JsonResponse({"error": {"message": error_msg}}, status=500)
        
        if form.errors.get("upload"):
            error_msg = form.errors["upload"][0]
            print_flush(f"[CKEditor上传] ✗ 表单验证失败: {error_msg}")
            return JsonResponse(
                {"error": {"message": error_msg}},
                status=400,
            )
        
        error_msg = "Invalid form data"
        print_flush(f"[CKEditor上传] ✗ {error_msg}")
        return JsonResponse({"error": {"message": error_msg}}, status=400)
        
    except Exception as e:
        error_msg = f"上传处理异常: {str(e)}"
        print_flush(f"[CKEditor上传] ✗ {error_msg}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": {"message": error_msg}}, status=500)

