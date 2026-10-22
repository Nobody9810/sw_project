"""Staff-only, validated uploads using the same storage as article fields."""
import logging
from pathlib import Path
from django.conf import settings
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django_ckeditor_5.permissions import check_upload_permission
from django_ckeditor_5.forms import UploadFileForm
from .uploads import validate_upload
from .storage import CompressedFileSystemStorage

logger = logging.getLogger(__name__)


@require_POST
@check_upload_permission
def upload_file(request):
    form = UploadFileForm(request.POST, request.FILES)
    if not form.is_valid():
        return JsonResponse({'error': {'message': '请选择有效的上传文件'}}, status=400)
    uploaded = request.FILES['upload']
    if uploaded.size > settings.MAX_UPLOAD_SIZE:
        return JsonResponse({'error': {'message': '文件不能超过 25 MB'}}, status=400)
    extension = Path(uploaded.name).suffix.lower().lstrip('.')
    if extension not in settings.CKEDITOR_5_UPLOAD_FILE_TYPES:
        return JsonResponse({'error': {'message': '不支持的文件类型'}}, status=400)
    try:
        validate_upload(uploaded)
        storage = CompressedFileSystemStorage()
        filename = storage.save(uploaded.name, uploaded)
        return JsonResponse({'url': storage.url(filename)})
    except ValidationError:
        return JsonResponse({'error': {'message': '文件格式无效或大小超限'}}, status=400)
    except Exception:
        logger.exception('编辑器上传失败')
        return JsonResponse({'error': {'message': '上传失败，请稍后重试'}}, status=500)
