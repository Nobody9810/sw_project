from django.shortcuts import redirect
from django.views import generic
from django.http import JsonResponse, HttpResponseRedirect
from django.contrib import messages
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.conf import settings
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_http_methods
from django.middleware.csrf import get_token
from .models import Comment
from users.avatars import avatar_data
from shuwei.submissions import allow_submission, rate_limit_response
import logging

logger = logging.getLogger(__name__)
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
    ).select_related('user__profile').order_by('thread_id', 'order', 'submit_date')


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CommentCreateView(generic.CreateView):
    """创建评论视图"""
    model = Comment
    form_class = CommentForm
    http_method_names = ['post']

    def get_form_kwargs(self):
        return {**super().get_form_kwargs(), 'user': self.request.user}
    
    def post(self, request, *args, **kwargs):
        limit = 10 if request.user.is_authenticated else 5
        if not allow_submission(request, 'comment', limit=limit):
            return rate_limit_response()
        return super().post(request, *args, **kwargs)

    def form_valid(self, form):
        # 获取内容对象
        app_label = self.kwargs.get('app_label')
        model_name = self.kwargs.get('model_name')
        object_id = self.kwargs.get('object_id')
        
        from home.views import MODEL_MAP
        if app_label != 'home' or model_name not in MODEL_MAP:
            return JsonResponse({'error': '无效的内容类型'}, status=404)

        model = MODEL_MAP[model_name]
        try:
            content_object = model.objects.get(pk=object_id, 发布状态=True)
            content_type = ContentType.objects.get_for_model(content_object)
        except model.DoesNotExist:
            return JsonResponse({'error': '找不到指定的内容对象'}, status=404)
        except Exception:
            logger.exception('获取评论目标失败')
            return JsonResponse({'error': '服务器错误，请稍后重试'}, status=500)

        # 设置评论的基本信息
        comment = form.save(commit=False)
        comment.content_type = content_type
        comment.object_id = object_id
        comment.user = self.request.user if self.request.user.is_authenticated else None
        comment.is_guest = not self.request.user.is_authenticated
        if comment.is_guest:
            comment.user_name = form.cleaned_data['name']
            comment.user_email = ''  # Guest email is neither required nor collected, even if supplied.
        else:
            comment.user_name = (self.request.user.first_name.strip() or '读者')[:50]
            comment.user_email = self.request.user.email
        comment.site_id = settings.SITE_ID
        comment.is_public = False  # 默认需要审核
        
        # 处理回复
        reply_to_id = form.cleaned_data.get('reply_to')
        if reply_to_id:
            try:
                parent_comment = Comment.objects.get(
                    pk=reply_to_id, content_type=content_type, object_id=object_id,
                    site_id=settings.SITE_ID, is_public=True, is_removed=False, level__lt=8,
                )
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
        
        from notifications.events import comment_pending
        with transaction.atomic():
            comment.save()  # Comment.save also assigns the root thread ID.
            comment_pending(comment, content_object)
        
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
        return JsonResponse({'error': '表单验证失败', 'errors': form.errors}, status=400)

    def get_success_url(self):
        """获取成功后的URL"""
        app_label = self.kwargs.get('app_label')
        model_name = self.kwargs.get('model_name')
        object_id = self.kwargs.get('object_id')
        
        from urllib.parse import quote
        from home.views import MODEL_MAP
        if app_label == 'home' and model_name in MODEL_MAP:
            return f'/{quote(model_name)}/{object_id}/'
        return '/'


@ensure_csrf_cookie
@require_http_methods(["GET"])
def get_csrf_token_view(request):
    """获取CSRF token的视图"""
    token = get_token(request)
    return JsonResponse({'csrfToken': token})


@require_http_methods(['GET'])
def comment_list_api(request, app_label, model_name, object_id):
    """Paginate roots and load each reply level with a bounded query."""
    from home.views import MODEL_MAP
    from home.querysets import parse_pagination
    from django.core.paginator import Paginator
    from django.db.models import Count
    if app_label != 'home' or model_name not in MODEL_MAP:
        return JsonResponse({'error': '无效的内容类型'}, status=404)
    model = MODEL_MAP[model_name]
    try:
        content_object = model.objects.get(pk=object_id, 发布状态=True)
        page, size = parse_pagination(request.GET)
    except model.DoesNotExist:
        return JsonResponse({'error': '找不到指定的内容对象'}, status=404)
    except ValueError as exc:
        return JsonResponse({'error': str(exc)}, status=400)
    except Exception:
        logger.exception('获取评论目标失败')
        return JsonResponse({'error': '服务器错误，请稍后重试'}, status=500)

    try:
        comments = get_comments_for_object(content_object)
        parent_id = request.GET.get('parent_id')
        if parent_id is not None:
            try:
                parent_id = int(parent_id)
                offset = int(request.GET.get('offset', 0))
                if parent_id < 1 or offset < 0:
                    raise ValueError
            except (TypeError, ValueError):
                return JsonResponse({'error': 'parent_id 和 offset 无效'}, status=400)
            if not comments.filter(pk=parent_id).exists():
                return JsonResponse({'error': '评论不存在'}, status=404)
            root_query = comments.filter(parent_id=parent_id).order_by('-submit_date', '-id')
            count = root_query.count()
            roots = list(root_query[offset:offset + size])
            total_pages = max(1, (count + size - 1) // size)
        else:
            paginator = Paginator(comments.filter(parent__isnull=True).order_by('-submit_date', '-id'), size)
            if page > paginator.num_pages:
                return JsonResponse({'error': '评论页不存在'}, status=404)
            roots = list(paginator.page(page).object_list)
            count, total_pages = paginator.count, paginator.num_pages
        nodes = {}
        def serialize(comment):
            return {'id': comment.id, 'user_name': (comment.user.first_name.strip() or '读者') if comment.user_id else comment.user_name,
                    'avatar': avatar_data(comment.user) if comment.user_id else None,
                    'is_guest': comment.is_guest, 'comment': comment.comment,
                    'submit_date': comment.submit_date.isoformat(), 'level': comment.level,
                    'parent_id': comment.parent_id, 'replies': [], 'reply_count': 0}
        for root in roots:
            nodes[root.id] = serialize(root)
        frontier = [root.id for root in roots]
        truncated = False
        remaining = 500
        for _ in range(8):
            if not frontier or not remaining:
                break
            replies = list(comments.filter(parent_id__in=frontier).order_by('-submit_date', '-id')[:remaining + 1])
            if len(replies) > remaining:
                truncated = True
                replies = replies[:remaining]
            remaining -= len(replies)
            frontier = []
            for reply in replies:
                node = serialize(reply)
                nodes[reply.id] = node
                nodes[reply.parent_id]['replies'].append(node)
                frontier.append(reply.id)
        if frontier and not remaining:
            truncated = truncated or comments.filter(parent_id__in=frontier).exists()
        for row in comments.filter(parent_id__in=list(nodes)).values('parent_id').annotate(count=Count('id')):
            nodes[row['parent_id']]['reply_count'] = row['count']
        return JsonResponse({'count': count if parent_id is not None else comments.count(),
                             'root_count': count, 'page': page, 'page_size': size,
                             'total_pages': total_pages,
                             'replies_truncated': truncated,
                             'comments': [nodes[root.id] for root in roots]})
    except Exception:
        logger.exception('加载评论失败')
        return JsonResponse({'error': '服务器错误，请稍后重试'}, status=500)
