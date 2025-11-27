from django.shortcuts import get_object_or_404, redirect
from django.views import generic
from django.http import JsonResponse, HttpResponseRedirect
from django.contrib import messages
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_http_methods
from django.middleware.csrf import get_token
from .models import Comment
from .forms import CommentForm


def get_comments_for_object(content_object):
    """获取对象的评论列表"""
    content_type = ContentType.objects.get_for_model(content_object)
    return Comment.objects.filter(
        content_type=content_type,
        object_id=content_object.pk,
        site_id=settings.SITE_ID,
        is_public=True,
        is_removed=False
    ).order_by('thread_id', 'order', 'submit_date')


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CommentCreateView(generic.CreateView):
    """创建评论视图"""
    model = Comment
    form_class = CommentForm
    
    def form_valid(self, form):
        # 获取内容对象
        app_label = self.kwargs.get('app_label')
        model_name = self.kwargs.get('model_name')
        object_id = self.kwargs.get('object_id')
        
        # 调试日志
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f'CommentCreateView: app_label={app_label}, model_name={model_name}, object_id={object_id}')
        
        try:
            content_type = ContentType.objects.get(app_label=app_label, model=model_name)
            content_object = content_type.get_object_for_this_type(pk=object_id)
        except ContentType.DoesNotExist as e:
            logger.error(f'ContentType不存在: app_label={app_label}, model={model_name}, error={str(e)}')
            if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'error': f'找不到指定的内容对象: ContentType不存在 (app_label={app_label}, model={model_name})'}, status=404)
            messages.error(self.request, f'找不到指定的内容对象: {str(e)}')
            return redirect('home:homepage')
        except Exception as e:
            logger.error(f'获取内容对象失败: {str(e)}')
            if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'error': f'找不到指定的内容对象: {str(e)}'}, status=404)
            messages.error(self.request, f'找不到指定的内容对象: {str(e)}')
            return redirect('home:homepage')
        
        # 设置评论的基本信息
        comment = form.save(commit=False)
        comment.content_type = content_type
        comment.object_id = object_id
        comment.user_name = form.cleaned_data['name']
        comment.user_email = form.cleaned_data['email']
        comment.site_id = settings.SITE_ID
        comment.is_public = False  # 默认需要审核
        
        # 处理回复
        reply_to_id = form.cleaned_data.get('reply_to')
        if reply_to_id:
            try:
                parent_comment = Comment.objects.get(pk=reply_to_id)
                comment.parent = parent_comment
                comment.thread_id = parent_comment.thread_id or parent_comment.id
                comment.level = (parent_comment.level or 0) + 1
                success_message = f'已成功回复 @{parent_comment.user_name} 的评论，审核通过后将显示！'
            except Comment.DoesNotExist:
                if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({'error': '回复失败：找不到原始评论'}, status=400)
                messages.error(self.request, '回复失败：找不到原始评论')
                return redirect(self.get_success_url())
        else:
            comment.level = 0
            success_message = '评论提交成功！审核通过后将显示！'
        
        comment.save()
        
        # 如果是新评论，设置其自己的thread_id
        if not reply_to_id and not comment.thread_id:
            comment.thread_id = comment.id
            comment.save(update_fields=['thread_id'])
        
        # 如果是AJAX请求，返回JSON响应
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': success_message,
                'comment_id': comment.id
            })
        
        messages.success(self.request, success_message)
        return HttpResponseRedirect(self.get_success_url())
    
    def form_invalid(self, form):
        # 如果是AJAX请求，返回JSON格式的错误
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            errors = {}
            for field, error_list in form.errors.items():
                errors[field] = error_list
            return JsonResponse({'error': '表单验证失败', 'errors': errors}, status=400)
        return super().form_invalid(form)
    
    def get_success_url(self):
        """获取成功后的URL"""
        app_label = self.kwargs.get('app_label')
        model_name = self.kwargs.get('model_name')
        object_id = self.kwargs.get('object_id')
        
        # 根据模型名称构建详情页URL
        model_name_map = {
            '书讯': 'shuxundetail',
            '书评': 'shupingdetail',
            '观点': 'guandiandetail',
            '译林': 'yilingdetail',
            '文艺': 'wenyidetail',
            '文史': 'wenshidetail',
            '通讯': 'tongxundetail',
            '论文': 'lunwendetail',
            '古籍': 'gujidetail',
            '书库': 'shukudetail',
        }
        
        url_name = model_name_map.get(model_name, 'homepage')
        if url_name == 'homepage':
            return reverse('home:homepage')
        
        # 构建URL参数
        url_kwargs = {
            'shuxun_id': object_id if model_name == '书讯' else None,
            'shuping_id': object_id if model_name == '书评' else None,
            'guandian_id': object_id if model_name == '观点' else None,
            'yiling_id': object_id if model_name == '译林' else None,
            'wenyi_id': object_id if model_name == '文艺' else None,
            'wenshi_id': object_id if model_name == '文史' else None,
            'tongxun_id': object_id if model_name == '通讯' else None,
            'lunwen_id': object_id if model_name == '论文' else None,
            'guji_id': object_id if model_name == '古籍' else None,
            'shuku_id': object_id if model_name == '书库' else None,
        }
        
        # 找到对应的参数
        for key, value in url_kwargs.items():
            if value is not None:
                param_name = key.replace('_id', '')
                return reverse(f'home:{url_name}', kwargs={param_name: value})
        
        return reverse('home:homepage')


@ensure_csrf_cookie
@require_http_methods(["GET"])
def get_csrf_token_view(request):
    """获取CSRF token的视图"""
    token = get_token(request)
    return JsonResponse({'csrfToken': token})


def comment_list_api(request, app_label, model_name, object_id):
    """评论列表API"""
    try:
        content_type = ContentType.objects.get(app_label=app_label, model=model_name)
        content_object = content_type.get_object_for_this_type(pk=object_id)
    except (ContentType.DoesNotExist, Exception):
        return JsonResponse({'error': '找不到指定的内容对象'}, status=404)
    
    comments = get_comments_for_object(content_object)
    
    # 构建评论树
    def build_comment_tree(comments):
        comment_dict = {}
        root_comments = []
        
        for comment in comments:
            comment_dict[comment.id] = {
                'id': comment.id,
                'user_name': comment.user_name,
                'comment': comment.comment,
                'submit_date': comment.submit_date.isoformat(),
                'level': comment.level,
                'parent_id': comment.parent_id,
                'replies': []
            }
        
        for comment in comments:
            comment_data = comment_dict[comment.id]
            if comment.parent_id:
                if comment.parent_id in comment_dict:
                    comment_dict[comment.parent_id]['replies'].append(comment_data)
            else:
                root_comments.append(comment_data)
        
        return root_comments
    
    comment_tree = build_comment_tree(comments)
    
    return JsonResponse({
        'count': comments.count(),
        'comments': comment_tree
    })

