from shuwei.submissions import text_field, allow_submission, rate_limit_response
from .serializers import DETAIL_SERIALIZER_MAP, LIST_SERIALIZER_MAP
from .html import first_content_image
from .querysets import adjacent_articles, content_queryset, parse_pagination
from django.shortcuts import render, get_object_or_404, redirect
from django.views import generic
from django.http import HttpResponseRedirect, JsonResponse, Http404
from django.urls import reverse
from django.contrib import messages
from django.contrib.contenttypes.models import ContentType
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.core.cache import cache
from .feed_cache import feed_version
from django.db import models, transaction
import random
from comment.models import Comment
from comment.forms import CommentForm
from comment.views import get_comments_for_object
from .models import (
    通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 
    论文, 古籍, 书库, 书评_分类, Feedback
)
from interactions.models import UserReaction
from .forms import ContactForm
from django.utils.html import strip_tags
from django.utils import timezone
from django.templatetags.static import static
from datetime import date

MODEL_MAP = {
    '书讯': 书讯,
    '书评': 书评,
    '观点': 观点,
    '译林': 译林,
    '文艺': 文艺,
    '文史': 文史,
    '通讯': 通讯,
    '论文': 论文,
    '古籍': 古籍,
    '书库': 书库,
}

# 首页"最新XX"模块展示顺序，需与前端 Flutter 的 homeFeedOrder 保持一致
HOME_FEED_ORDER = [
    '书讯', '书评', '观点', '译林', '文艺',
    '文史', '书库', '通讯', '古籍', '论文',
]

# 首页聚合接口的缓存有效期（秒）。首页内容更新不频繁，
# 短时间内的重复请求直接走缓存，减轻数据库压力。
HOME_FEED_CACHE_TTL = 60





# API 列表视图

def api_list_view(request, content_type):
    """通用 API 列表视图"""
    from urllib.parse import unquote
    content_type = unquote(content_type)

    if content_type not in MODEL_MAP:
        return JsonResponse({'error': '无效的内容类型'}, status=400)

    model = MODEL_MAP[content_type]
    serializer_class = LIST_SERIALIZER_MAP[content_type]

    try:
        page, page_size = parse_pagination(request.GET)
    except ValueError as exc:
        return JsonResponse({'error': str(exc)}, status=400)

    queryset = content_queryset(model).order_by('-更新时间', '-id')
    total_count = queryset.count()

    start = (page - 1) * page_size
    end = start + page_size
    items = queryset[start:end]

    results = serializer_class(items, many=True, context={'request': request}).data

    return JsonResponse({
        'count': total_count,
        'results': results,
        'page': page,
        'page_size': page_size,
    })


def api_home_feed(request):
    """
    首页聚合接口：一次性返回多个板块各自最新的若干条内容。

    GET /api/home/feed/
    可选参数：
        limit    每个板块返回的条数，默认 6，范围 1~20
        modules  指定只返回哪些板块，逗号分隔，如 "书讯,书评"；
                 不传则按 HOME_FEED_ORDER 返回全部 10 个板块

    返回结构：
    {
        "success": true,
        "modules": ["书讯", "书评", ...],
        "limit": 6,
        "feed": {
            "书讯": [ {...}, {...} ],
            "书评": [ {...} ],
            ...
        }
    }
    """
    if request.method != 'GET':
        return JsonResponse({'error': '仅支持 GET 请求'}, status=405)

    # 1. 解析并校验 limit，防止被传入过大值拖垮数据库
    try:
        limit = int(request.GET.get('limit', 6))
    except (TypeError, ValueError):
        limit = 6
    limit = max(1, min(limit, 20))

    # 2. 解析 modules 参数，按需只查部分板块；非法板块名直接忽略
    modules_param = request.GET.get('modules')
    if modules_param:
        requested = [m.strip() for m in modules_param.split(',') if m.strip()]
        target_modules = list(dict.fromkeys(m for m in requested if m in MODEL_MAP))
        if not target_modules:
            return JsonResponse({'error': 'modules 参数中没有有效的板块名'}, status=400)
    else:
        target_modules = HOME_FEED_ORDER

    # 3. 命中缓存直接返回（缓存 key 包含模块列表和 limit，避免不同请求互相污染）
    cache_key = 'home_feed:{}:{}:{}:{}'.format(
        feed_version(), request.get_host(), ':'.join(target_modules), limit,
    )
    cached_payload = cache.get(cache_key)
    if cached_payload is not None:
        return JsonResponse(cached_payload)

    # 4. 逐个板块查询最新 N 条，用对应的 List 序列化器序列化
    feed = {}
    for module_name in target_modules:
        model = MODEL_MAP.get(module_name)
        serializer_class = LIST_SERIALIZER_MAP.get(module_name)
        if not model or not serializer_class:
            continue

        queryset = content_queryset(model).order_by('-更新时间', '-id')[:limit]
        feed[module_name] = serializer_class(
            queryset, many=True, context={'request': request}
        ).data

    payload = {
        'success': True,
        'modules': target_modules,
        'limit': limit,
        'feed': feed,
    }

    cache.set(cache_key, payload, HOME_FEED_CACHE_TTL)
    return JsonResponse(payload)


def _get_published_queryset(model):
    """根据模型是否有发布状态字段返回已发布的 Queryset"""
    field_names = [field.name for field in model._meta.fields]
    if '发布状态' in field_names:
        return model.objects.filter(发布状态=True)
    return model.objects.all()


def _get_reaction_flags(request, item):
    """获取点赞/点踩状态"""
    from interactions.identity import request_identity
    identity_key, _, _ = request_identity(request, create_session=False)
    content_type = ContentType.objects.get_for_model(item)
    return {
        'is_liked': UserReaction.objects.filter(
            identity_key=identity_key,
            content_type=content_type,
            object_id=item.id,
            reaction_type='like'
        ).exists(),
        'is_disliked': UserReaction.objects.filter(
            identity_key=identity_key,
            content_type=content_type,
            object_id=item.id,
            reaction_type='dislike'
        ).exists(),
    }

def api_detail_view(request, content_type, item_id):
    """通用 API 详情视图"""
    from urllib.parse import unquote
    content_type = unquote(content_type)

    model = MODEL_MAP.get(content_type)
    serializer_class = DETAIL_SERIALIZER_MAP.get(content_type)
    if not model or not serializer_class:
        return JsonResponse({'error': '无效的内容类型'}, status=400)

    queryset = _get_published_queryset(model)
    try:
        item = queryset.get(pk=item_id)
    except model.DoesNotExist:
        return JsonResponse({'error': '对象不存在'}, status=404)

    data = serializer_class(item, context={'request': request}).data
    data.update(adjacent_articles(item))
    reaction_flags = ({'is_liked': False, 'is_disliked': False}
                      if request.GET.get('public') == '1' else _get_reaction_flags(request, item))

    from interactions.services import read_view_counts
    counts = read_view_counts(item)

    data.update({
        '总浏览量': counts['total_views'],
        '今日浏览量': counts['today_views'],
        'is_liked': reaction_flags['is_liked'],
        'is_disliked': reaction_flags['is_disliked'],
    })

    return JsonResponse(data)


def api_search_all(request):
    """全站搜索 API（JSON）"""
    keyword = request.GET.get('keyword', '').strip()
    if not keyword:
        return JsonResponse({'error': 'keyword 参数必填'}, status=400)

    results = []
    for label, model in MODEL_MAP.items():
        queryset = _get_published_queryset(model).filter(标题__icontains=keyword)[:8]
        for item in queryset:
            summary_source = getattr(item, '内容', '') or getattr(item, '内容简介', '') or ''
            summary = strip_tags(summary_source)[:200]
            results.append({
                'id': item.id,
                'type': label,
                '标题': item.标题,
                '摘要': summary,
                '更新时间': item.更新时间.isoformat() if hasattr(item, '更新时间') and item.更新时间 else None,
                '图片': item.图片.url if getattr(item, '图片', None) else first_content_image(getattr(item, '内容', None)),
            })

    return JsonResponse({
        'keyword': keyword,
        'result_count': len(results),
        'results': results,
    })

def about_us(request):
    return render(request, 'components/others/about_us.html')

def copyright(request):
    return render(request, 'components/others/T-P.html')


def api_feedback(request):
    """用户反馈 API"""
    if request.method != 'POST':
        return JsonResponse({'error': '仅支持 POST 请求'}, status=405)
    
    if not allow_submission(request, 'feedback'):
        return rate_limit_response()
    try:
        import json
        data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
        try:
            message = text_field(data, 'message', 3000)
            if not request.user.is_authenticated:
                name = text_field(data, 'name', 50)
                email = text_field(data, 'email', 254, required=False)
        except ValueError as exc:
            return JsonResponse({'error': str(exc)}, status=400)
        if not message:
            return JsonResponse({'error': '建议内容不能为空'}, status=400)
        if request.user.is_authenticated:
            name = (request.user.first_name.strip() or '读者')[:100]
            email = request.user.email
        else:
            if not name:
                return JsonResponse({'error': '请填写昵称'}, status=400)
            if email:
                from django.core.validators import validate_email
                from django.core.exceptions import ValidationError
                try:
                    validate_email(email)
                except ValidationError:
                    return JsonResponse({'error': '邮箱格式不正确'}, status=400)
        # 创建反馈记录
        feedback = Feedback.objects.create(
            author=request.user if request.user.is_authenticated else None,
            姓名=name,
            邮箱=email,
            建议内容=message
        )
        
        return JsonResponse({
            'success': True,
            'message': '反馈提交成功，感谢您的建议！',
            'id': feedback.id
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON 格式错误'}, status=400)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error('反馈提交失败: %s', type(e).__name__)
        return JsonResponse({'error': '服务器错误，请稍后重试'}, status=500)


@csrf_exempt
def api_book_review_categories(request):
    """获取书评分类列表 API"""
    if request.method != 'GET':
        return JsonResponse({'error': '仅支持 GET 请求'}, status=405)
    
    try:
        categories = 书评_分类.objects.all().order_by('名称')
        categories_data = [
            {
                'id': category.id,
                '名称': category.名称,
            }
            for category in categories
        ]
        
        return JsonResponse({
            'success': True,
            'categories': categories_data,
            'count': len(categories_data)
        })
    except Exception as e:
        return JsonResponse({'error': '服务器错误，请稍后重试'}, status=500)


@csrf_exempt
def api_book_reviews_by_category(request, category_id):
    """获取某个分类下的所有书评 API"""
    if request.method != 'GET':
        return JsonResponse({'error': '仅支持 GET 请求'}, status=405)
    
    try:
        category = get_object_or_404(书评_分类, pk=category_id)
        
        # 获取分页参数
        try:
            page, page_size = parse_pagination(request.GET, 12)
        except ValueError as exc:
            return JsonResponse({'error': str(exc)}, status=400)
        
        # 获取该分类下的所有已发布书评
        queryset = 书评.objects.filter(分类=category, 发布状态=True).order_by('-更新时间')
        
        # 计算分页
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        items = queryset[start:end]
        
        # 序列化数据
        results = []
        for item in items:
            author_value = getattr(item, '作者', '') or ''
            content_value = ''
            if hasattr(item, '内容'):
                raw_content = getattr(item, '内容', None)
                if raw_content is not None:
                    content_value = str(raw_content)
                    if content_value == '暂无内容简介':
                        content_value = ''
            
            item_data = {
                'id': item.id,
                '标题': item.标题,
                '作者': author_value,
                '内容': content_value,
                '更新时间': item.更新时间.isoformat() if hasattr(item, '更新时间') and item.更新时间 else '',
                '图片': item.图片.url if getattr(item, '图片', None) else first_content_image(getattr(item, '内容', None)),
                '出处': getattr(item, '出处', None) or '',
                '书籍出版日期': item.书籍出版日期.isoformat() if hasattr(item, '书籍出版日期') and item.书籍出版日期 else None,
                '分类名称': category.名称,
            }
            results.append(item_data)
        
        return JsonResponse({
            'success': True,
            'category': {
                'id': category.id,
                '名称': category.名称,
            },
            'results': results,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size if total_count > 0 else 0,
        })
    except Http404:
        return JsonResponse({'error': '分类不存在'}, status=404)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.exception('获取分类书评失败')
        return JsonResponse({'error': '服务器错误，请稍后重试'}, status=500)

