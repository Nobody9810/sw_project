"""
自定义CKEditor上传视图，支持文件压缩
"""
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.conf import settings
from django_ckeditor_5.permissions import check_upload_permission
from django_ckeditor_5.exceptions import NoImageException
from django_ckeditor_5.storage_utils import image_verify
from django_ckeditor_5.forms import UploadFileForm
from .compression import compress_image, compress_pdf, should_compress_file
from .storage import CompressedFileSystemStorage
import os


@require_POST
@check_upload_permission
def upload_file(request):
    """
    自定义CKEditor文件上传视图，支持自动压缩
    """
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
        
        print(f"\n{'='*60}")
        print(f"[CKEditor上传] 收到上传请求")
        print(f"{'='*60}")
        
        # 获取文件扩展名
        file_name = uploaded_file.name
        ext = os.path.splitext(file_name)[1].lower()
        
        # 根据文件类型进行压缩
        image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        pdf_exts = ['.pdf']
        
        if ext in image_exts:
            # 压缩图片
            if should_compress_file(uploaded_file, 'image'):
                uploaded_file = compress_image(uploaded_file)
        elif ext in pdf_exts:
            # 压缩PDF
            if should_compress_file(uploaded_file, 'pdf'):
                uploaded_file = compress_pdf(uploaded_file)
        else:
            print(f"[CKEditor上传] 文件类型不支持压缩: {file_name}\n")
        
        # 使用自定义存储保存文件
        storage = CompressedFileSystemStorage()
        filename = storage.save(uploaded_file.name, uploaded_file)
        url = storage.url(filename)
        
        print(f"[CKEditor上传] ✓ 上传完成，URL: {url}")
        print(f"{'='*60}\n")
        
        return JsonResponse({"url": url})
    
    if form.errors.get("upload"):
        return JsonResponse(
            {"error": {"message": form.errors["upload"][0]}},
            status=400,
        )
    
    return JsonResponse({"error": {"message": "Invalid form data"}}, status=400)

