from django.shortcuts import render, get_object_or_404, redirect
from django.views import generic
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.contrib import messages
from django.db.models import Q, F, CharField
from django.db.models.functions import Length
from django.contrib.contenttypes.models import ContentType
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.db import models, transaction
import random
from comment.models import Comment
from comment.forms import CommentForm
from comment.views import get_comments_for_object
from .models import (
    通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 
    论文, 古籍, 书库, 书评_分类, Feedback
)
from interactions.models import UserReaction, ViewCount
from .forms import ContactForm
from django.utils.html import strip_tags
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

class GenericListView(generic.ListView):
    """通用列表视图基类"""
    paginate_by = 10
    ordering = '-更新时间'
    context_object_name = 'object_list'

    def get_queryset(self):
        """获取已发布的对象列表"""
        if self.model is None:
            return self.model.objects.none()
        return self.model.objects.filter(发布状态=True).order_by(self.ordering)

class GenericDetail(generic.DetailView):
    """通用详情视图基类"""
    pk_url_kwarg = 'id'
    
    def get_object(self):
        """获取详情对象"""
        return get_object_or_404(self.model, id=self.kwargs[self.pk_url_kwarg])

    def get_context_data(self, **kwargs):
        """获取上下文数据"""
        context = super().get_context_data(**kwargs)
        obj = self.get_object()
        
        # 注意：浏览量统计已迁移到 interactions app，由前端API调用更新
        # 这里不再直接更新浏览量，避免重复计算和刷量问题
        # 浏览量更新由前端 ArticleDetail 组件调用 /interactions/api/view/ 接口完成
        
        # 获取评论
        content_type = ContentType.objects.get_for_model(obj)
        comments = self._get_comments(content_type, obj)

        # 确保用户有session并获取反应状态
        user_session = self._ensure_user_session()
        user_reaction = self._get_user_reaction(content_type, obj, user_session)

        # 获取浏览量（优先从 ViewCount 获取，如果没有则从原模型获取）
        view_count = ViewCount.objects.filter(
            content_type=content_type,
            object_id=obj.id
        ).first()
        
        total_views = view_count.总浏览量 if view_count else getattr(obj, '总浏览量', 0)
        today_views = view_count.今日浏览量 if view_count else getattr(obj, '今日浏览量', 0)

        # 更新上下文
        context.update(self._get_extended_context(obj, comments, user_reaction))
        
        # 添加浏览量到context
        context.update({
            'total_views': total_views,
            'today_views': today_views,
        })
        
        return context

    def _get_comments(self, content_type, obj):
        """获取对象的评论"""
        return get_comments_for_object(obj)

    def _ensure_user_session(self):
        """确保用户有session"""
        if not self.request.session.session_key:
            self.request.session.create()
        return self.request.session.session_key

    def _get_user_reaction(self, content_type, obj, user_session):
        """获取用户的反应状态"""
        return UserReaction.objects.filter(
            user_session=user_session,
            content_type=content_type,
            object_id=obj.id
        ).first()
    cover_url = None
    

    def _get_extended_context(self, obj, comments, user_reaction):
        """获取扩展的上下文数据"""
        if hasattr(obj, '图片') and obj.图片:
            meta_image = self.request.build_absolute_uri(obj.图片.url)
        else:
            meta_image = self.request.build_absolute_uri(static(settings.DEFAULT_META_IMAGE))

        return {
            'object': obj,
            'all_comments': comments,
            'form': CommentForm(obj),
            'recommended_articles': self.get_recommended_articles(obj),
            'model_name': obj.__class__.__name__,
            'app_label': obj._meta.app_label,
            'object_id': obj.id,
            'meta_image': meta_image,
            'user': self.request.user,
            'meta_title': obj.标题 if hasattr(obj, '标题') else "默认标题",
            'meta_url': self.request.build_absolute_uri(),
            'total_likes': obj.likes,
            'total_dislikes': obj.dislikes,
            'is_liked': user_reaction and user_reaction.reaction_type == 'like',
            'is_disliked': user_reaction and user_reaction.reaction_type == 'dislike',
        }

    def get_recommended_articles(self, current_obj):
        """获取推荐文章"""
        all_articles = list(self.model.objects.filter(发布状态=True).exclude(id=current_obj.id))
        return random.sample(all_articles, min(len(all_articles), 5))

    def _update_view_count(self, obj):
        """更新浏览量统计（使用 interactions app 的 ViewCount 模型）"""
        content_type = ContentType.objects.get_for_model(obj)
        today = date.today()
        
        with transaction.atomic():
            # 获取或创建 ViewCount 对象
            view_count, created = ViewCount.objects.get_or_create(
                content_type=content_type,
                object_id=obj.id,
                defaults={
                    '总浏览量': 0,
                    '今日浏览量': 0,
                    '最后统计日期': today
                }
            )
            
            # 检查是否需要重置今日浏览量
            if view_count.最后统计日期 != today:
                ViewCount.objects.filter(id=view_count.id).update(
                    今日浏览量=1,  # 重置为1，因为这是今天的第一次访问
                    总浏览量=models.F('总浏览量') + 1,
                    最后统计日期=today
                )
            else:
                # 直接增加浏览量
                ViewCount.objects.filter(id=view_count.id).update(
                    总浏览量=models.F('总浏览量') + 1,
                    今日浏览量=models.F('今日浏览量') + 1
                )
            
            # 为了保持向后兼容，同时更新原模型的字段
            if hasattr(obj, '总浏览量') and hasattr(obj, '今日浏览量'):
                view_count.refresh_from_db()
                type(obj).objects.filter(id=obj.id).update(
                    总浏览量=view_count.总浏览量,
                    今日浏览量=view_count.今日浏览量,
                    最后统计日期=view_count.最后统计日期
                )
        
        # 重新获取最新数据
        obj.refresh_from_db()

# 列表视图
class TongXun(GenericListView):
    """通讯列表视图"""
    model = 通讯
    template_name = 'frontend/通讯/main.html'
    context_object_name = 'all_通讯'

class ShuXun(GenericListView):
    """书讯列表视图"""
    model = 书讯
    template_name = 'frontend/书讯/main.html'
    context_object_name = 'all_书讯'
    paginate_by = 16

class ShuPing(GenericListView):
    """书评列表视图"""
    model = 书评
    template_name = 'frontend/书评/main.html'
    context_object_name = 'all_书评'

class GuanDian(GenericListView):
    """观点列表视图"""
    model = 观点
    template_name = 'frontend/观点/main.html'
    context_object_name = 'all_观点'

class WenYi(GenericListView):
    """文艺列表视图"""
    model = 文艺
    template_name = 'frontend/文艺/main.html'
    context_object_name = 'all_文艺'

class ShuKu(GenericListView):
    """书库列表视图"""
    model = 书库
    template_name = 'frontend/书库/main.html'
    context_object_name = 'all_书库'
    paginate_by = 16

class GuJi(GenericListView):
    """古籍列表视图"""
    model = 古籍
    template_name = 'frontend/古籍/main.html'
    context_object_name = 'all_古籍'
    paginate_by = 36

class LunWen(GenericListView):
    """论文列表视图"""
    model = 论文
    template_name = 'frontend/论文/main.html'
    context_object_name = 'all_论文'
    paginate_by = 16

class YiLing(GenericListView):
    """译林列表视图"""
    model = 译林
    template_name = 'frontend/译林/main.html'
    context_object_name = 'all_译林'

class WenShi(GenericListView):
    """文史列表视图"""
    model = 文史
    template_name = 'frontend/文史/main.html'
    context_object_name = 'all_文史'

# 详情视图
class TongXunDetail(GenericDetail):
    """通讯详情视图"""
    model = 通讯
    template_name = "frontend/通讯/detail.html"
    pk_url_kwarg = 'tongxun_id'
    success_url = 'home:tongxundetail'

class ShuXunDetail(GenericDetail):
    """书讯详情视图"""
    model = 书讯
    template_name = "frontend/书讯/detail.html"
    pk_url_kwarg = 'shuxun_id'
    success_url = 'home:shuxundetail'

class ShuPingDetail(GenericDetail):
    """书评详情视图"""
    model = 书评
    template_name = "frontend/书评/detail.html"
    pk_url_kwarg = 'shuping_id'
    success_url = 'home:shupingdetail'

class GuanDianDetail(GenericDetail):
    """观点详情视图"""
    model = 观点
    template_name = "frontend/观点/detail.html"
    pk_url_kwarg = 'guandian_id'
    success_url = 'home:guandiandetail'

class WenYiDetail(GenericDetail):
    """文艺详情视图"""
    model = 文艺
    template_name = "frontend/文艺/detail.html"
    pk_url_kwarg = 'wenyi_id'
    success_url = 'home:wenyidetail'

class WenShiDetail(GenericDetail):
    """文史详情视图"""
    model = 文史
    template_name = "frontend/文史/detail.html"
    pk_url_kwarg = 'wenshi_id'
    success_url = 'home:wenshidetail'

class YiLingDetail(GenericDetail):
    """译林详情视图"""
    model = 译林
    template_name = "frontend/译林/detail.html"
    pk_url_kwarg = 'yiling_id'
    success_url = 'home:yilingdetail'

class LunWenDetail(GenericDetail):
    """论文详情视图"""
    model = 论文
    template_name = "frontend/论文/detail.html"
    pk_url_kwarg = 'lunwen_id'
    success_url = 'home:lunwendetail'

class GuJiDetail(GenericDetail):
    """古籍详情视图"""
    model = 古籍
    template_name = "frontend/古籍/detail.html"
    pk_url_kwarg = 'guji_id'
    success_url = 'home:gujidetail'

class ShuKuDetail(GenericDetail):
    """书库详情视图"""
    model = 书库
    template_name = "frontend/书库/detail.html"
    pk_url_kwarg = 'shuku_id'
    success_url = 'home:shukudetail'

# 特殊视图函数
def ShuPing_categories(request, category_id):
    """书评分类视图"""
    category = get_object_or_404(书评_分类, pk=category_id)
    reviews = 书评.objects.filter(分类=category, 发布状态=True).order_by('-更新时间')
    return render(request, 'frontend/书评/category_detail.html', {
        'category': category, 
        'reviews': reviews
    })


@method_decorator(xframe_options_exempt, name='dispatch')
class MainView(generic.TemplateView):
    """首页视图"""
    template_name = 'frontend/首页/index.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update({
            'all_通讯': 通讯.objects.filter(发布状态=True).order_by("-更新时间")[:8],
            'all_书讯': 书讯.objects.filter(发布状态=True).order_by("-更新时间")[:6],
            'all_书评': 书评.objects.filter(发布状态=True).order_by("-更新时间")[:8],
            'all_观点': 观点.objects.filter(发布状态=True).order_by("-更新时间")[:9],
            'all_文艺': 文艺.objects.filter(发布状态=True).order_by("-更新时间")[:8],
            'all_论文': 论文.objects.filter(发布状态=True).order_by("-更新时间")[:4],
            'all_古籍': 古籍.objects.filter(发布状态=True).order_by("-更新时间")[:4],
            'all_书库': 书库.objects.filter(发布状态=True).order_by("-更新时间")[:10],
            'all_译林': 译林.objects.filter(发布状态=True).order_by("-更新时间")[:8],
            'all_文史': 文史.objects.filter(发布状态=True).order_by("-更新时间")[:8],
        })
        return context

def SearchAll(request):
    """全站搜索视图"""
    keyword = request.GET.get('keyword')
    if not keyword or not keyword.strip():
        messages.error(request, '搜索内容不能空，请输入关键字。')
        return redirect('home:homepage')

    models = [通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库]
    results = {
        model._meta.verbose_name: model.objects.filter(发布状态=True, 标题__icontains=keyword) 
        for model in models
    }
    result_count = sum(len(result) for result in results.values())
    
    return render(request, 'components/search/search.html', {
        **results, 
        'result_count': result_count, 
        'keyword': keyword
    })



@csrf_exempt
def handle_like_dislike(request, app_label, model_name, item_id, action):
    """处理点赞/点踩请求"""
    if request.method != 'POST':
        return JsonResponse({'error': '只允许POST请求'}, status=405)
    
    try:
        return _process_reaction(request, app_label, model_name, item_id, action)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def _process_reaction(request, app_label, model_name, item_id, action):
    """处理用户反应"""
    # 确保用户有session
    user_session = _ensure_user_session(request)
    
    # 获取内容类型和对象
    content_type, model_class = _get_content_type_and_model(app_label, model_name)
    
    with transaction.atomic():
        # 获取项目并处理反应
        item = _get_item_for_update(model_class, item_id)
        reaction_result = _handle_reaction(user_session, content_type, item, action)
        
        return JsonResponse(reaction_result)

def _ensure_user_session(request):
    """确保用户有session"""
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key

def _get_content_type_and_model(app_label, model_name):
    """获取内容类型和模型类"""
    try:
        content_type = ContentType.objects.get(app_label=app_label, model=model_name)
        return content_type, content_type.model_class()
    except ContentType.DoesNotExist:
        raise ValueError(f'找不到模型：{app_label}.{model_name}')

def _get_item_for_update(model_class, item_id):
    """获取要更新的项目"""
    try:
        return model_class.objects.select_for_update().get(id=item_id)
    except model_class.DoesNotExist:
        raise ValueError(f'找不到对象：{item_id}')

def _handle_reaction(user_session, content_type, item, action):
    """处理用户反应并更新计数"""
    reaction, created = UserReaction.objects.get_or_create(
        user_session=user_session,
        content_type=content_type,
        object_id=item.id,
        defaults={'reaction_type': action}
    )
    
    if not created:
        if reaction.reaction_type == action:
            reaction.delete()
            # 使用 update() 直接更新点赞/点踩数，不影响更新时间
            type(item).objects.filter(id=item.id).update(
                **{action + 's': models.F(action + 's') - 1}
            )
        else:
            old_action = reaction.reaction_type
            reaction.reaction_type = action
            reaction.save()
            # 使用 update() 直接更新点赞/点踩数，不影响更新时间
            type(item).objects.filter(id=item.id).update(
                **{
                    action + 's': models.F(action + 's') + 1,
                    old_action + 's': models.F(old_action + 's') - 1
                }
            )
    else:
        # 使用 update() 直接更新点赞/点踩数，不影响更新时间
        type(item).objects.filter(id=item.id).update(
            **{action + 's': models.F(action + 's') + 1}
        )
    
    # 重新获取最新数据
    item.refresh_from_db()
    return _create_response(item, user_session, content_type)

def _create_response(item, user_session, content_type):
    """创建响应数据"""
    return {
        'success': True,
        'total_likes': item.likes,
        'total_dislikes': item.dislikes,
        'is_liked': UserReaction.objects.filter(
            user_session=user_session,
            content_type=content_type,
            object_id=item.id,
            reaction_type='like'
        ).exists(),
        'is_disliked': UserReaction.objects.filter(
            user_session=user_session,
            content_type=content_type,
            object_id=item.id,
            reaction_type='dislike'
        ).exists(),
    }

# API endpoints
@csrf_exempt
def like_item(request, app_label, model_name, item_id):
    """点赞接口"""
    return handle_like_dislike(request, app_label, model_name, item_id, 'like')

@csrf_exempt
def dislike_item(request, app_label, model_name, item_id):
    """点踩接口"""
    return handle_like_dislike(request, app_label, model_name, item_id, 'dislike')

# API 列表视图
def api_list_view(request, content_type):
    """通用 API 列表视图"""
    import logging
    from urllib.parse import unquote
    logger = logging.getLogger(__name__)
    
    # URL解码，处理中文字符
    content_type = unquote(content_type)
    
    logger.info(f'API list view called for content_type: {content_type}')
    
    if content_type not in MODEL_MAP:
        logger.error(f'Invalid content_type: {content_type}')
        return JsonResponse({'error': '无效的内容类型'}, status=400)
    
    model = MODEL_MAP[content_type]
    
    # 获取查询参数
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 10))
    
    logger.info(f'Page: {page}, Page size: {page_size}')
    
    # 获取已发布的对象
    queryset = model.objects.filter(发布状态=True).order_by('-更新时间')
    
    # 分页
    start = (page - 1) * page_size
    end = start + page_size
    items = queryset[start:end]
    
    # 序列化数据
    results = []
    for item in items:
        # 处理作者字段
        author_value = getattr(item, '作者', '') or ''
        
        # 获取内容，确保返回完整的HTML内容
        content_value = ''
        if hasattr(item, '内容'):
            # 直接获取内容值，不进行 or '' 转换，以保留原始值
            raw_content = getattr(item, '内容', None)
            if raw_content is not None:
                content_value = str(raw_content)
                # 如果内容是默认值，设为空
                if content_value == '暂无内容简介':
                    content_value = ''
            # 如果内容是None，保持为空字符串（这种情况不应该发生，因为已经过滤）
        
        # 标准处理
        if True:
            item_data = {
                'id': item.id,
                '标题': item.标题,
                '作者': author_value,
                '内容': content_value,
                '更新时间': item.更新时间.isoformat() if hasattr(item, '更新时间') and item.更新时间 else '',
                '图片': item.图片.url if hasattr(item, '图片') and item.图片 else None,
                '文档': item.文档.url if hasattr(item, '文档') and item.文档 else None,
            }
        # 为书讯模型添加详细信息字段
        if content_type == '书讯':
            item_data.update({
                '出版社': getattr(item, '出版社', None) or '',
                '出版年': getattr(item, '出版年', None).isoformat() if hasattr(item, '出版年') and getattr(item, '出版年', None) else None,
                'ISBN': getattr(item, 'ISBN', None) or '',
                '页数': getattr(item, '页数', None),
                '装帧': getattr(item, '装帧', None) or '',
            })
        results.append(item_data)
    
    logger.info(f'Returning {len(results)} results for {content_type}')
    
    return JsonResponse({
        'count': queryset.count(),
        'results': results,
        'page': page,
        'page_size': page_size
    })


def _serialize_item(item):
    """序列化模型实例为 JSON 友好格式"""
    data = {}
    for field in item._meta.fields:
        value = getattr(item, field.name, None)
        if isinstance(field, (models.DateTimeField, models.DateField)):
            data[field.name] = value.isoformat() if value else None
        elif isinstance(field, (models.ImageField, models.FileField)):
            # 处理文件字段，确保正确返回URL
            if value:
                try:
                    # 获取文件的URL，如果文件存在
                    data[field.name] = value.url
                except (ValueError, AttributeError):
                    # 如果文件不存在或无法获取URL，返回None
                    data[field.name] = None
            else:
                data[field.name] = None
        elif isinstance(field, models.ForeignKey):
            # 对于外键，返回ID
            data[field.name] = value.id if value else None
            # 同时添加一个带_id后缀的字段（用于兼容）
            data[f'{field.name}_id'] = value.id if value else None
            # 对于书评的分类字段，同时返回分类名称
            if field.name == '分类' and item._meta.model_name == '书评' and value:
                data['分类名称'] = value.名称
        else:
            data[field.name] = value
    data['app_label'] = item._meta.app_label
    data['model_name'] = item._meta.model_name
    return data


def _get_published_queryset(model):
    """根据模型是否有发布状态字段返回已发布的 Queryset"""
    field_names = [field.name for field in model._meta.fields]
    if '发布状态' in field_names:
        return model.objects.filter(发布状态=True)
    return model.objects.all()




def _get_reaction_flags(request, item):
    """获取点赞/点踩状态"""
    if not request.session.session_key:
        request.session.create()
    user_session = request.session.session_key
    content_type = ContentType.objects.get_for_model(item)
    return {
        'is_liked': UserReaction.objects.filter(
            user_session=user_session,
            content_type=content_type,
            object_id=item.id,
            reaction_type='like'
        ).exists(),
        'is_disliked': UserReaction.objects.filter(
            user_session=user_session,
            content_type=content_type,
            object_id=item.id,
            reaction_type='dislike'
        ).exists(),
    }


def api_detail_view(request, content_type, item_id):
    """通用 API 详情视图"""
    from urllib.parse import unquote
    # URL解码，处理中文字符
    content_type = unquote(content_type)
    
    model = MODEL_MAP.get(content_type)
    if not model:
        return JsonResponse({'error': '无效的内容类型'}, status=400)

    queryset = _get_published_queryset(model)
    try:
        item = queryset.get(pk=item_id)
    except model.DoesNotExist:
        return JsonResponse({'error': '对象不存在'}, status=404)

    # 注意：浏览量统计已迁移到 interactions app，不再在这里直接更新
    # 浏览量更新由前端调用 /interactions/api/view/ 接口完成，使用防刷策略
    
    # 标准序列化
    if True:
        data = _serialize_item(item)
    reaction_flags = _get_reaction_flags(request, item)
    
    # 从 ViewCount 模型获取浏览量数据（唯一数据源）
    # 如果 ViewCount 不存在，使用 _get_or_create_view_count 创建（会从原模型字段同步初始数据）
    content_type_obj = ContentType.objects.get_for_model(item)
    view_count = ViewCount.objects.filter(
        content_type=content_type_obj,
        object_id=item.id
    ).first()
    
    if not view_count:
        # 如果 ViewCount 不存在，创建它（会从原模型字段获取初始数据）
        view_count = ViewCount.objects.get_or_create(
            content_type=content_type_obj,
            object_id=item.id,
            defaults={
                '总浏览量': getattr(item, '总浏览量', 0),
                '今日浏览量': getattr(item, '今日浏览量', 0),
                '最后统计日期': getattr(item, '最后统计日期', date.today())
            }
        )[0]
    
    # 始终使用 ViewCount 的数据，确保数据源一致性
    total_views = view_count.总浏览量
    today_views = view_count.今日浏览量
    
    # 同步到原模型字段（保持向后兼容）
    if hasattr(item, '总浏览量') and hasattr(item, '今日浏览量'):
        type(item).objects.filter(id=item.id).update(
            总浏览量=total_views,
            今日浏览量=today_views,
            最后统计日期=view_count.最后统计日期
        )

    data.update({
        'likes': getattr(item, 'likes', 0),
        'dislikes': getattr(item, 'dislikes', 0),
        '总浏览量': total_views,
        '今日浏览量': today_views,
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
                '图片': item.图片.url if hasattr(item, '图片') and item.图片 else None,
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


@csrf_exempt
def api_feedback(request):
    """用户反馈 API"""
    if request.method != 'POST':
        return JsonResponse({'error': '仅支持 POST 请求'}, status=405)
    
    try:
        import json
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST
        
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        message = data.get('message', '').strip()
        
        # 验证必填字段
        if not name:
            return JsonResponse({'error': '姓名不能为空'}, status=400)
        if not email:
            return JsonResponse({'error': '邮箱不能为空'}, status=400)
        if not message:
            return JsonResponse({'error': '建议内容不能为空'}, status=400)
        
        # 验证邮箱格式
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({'error': '邮箱格式不正确'}, status=400)
        
        # 创建反馈记录
        feedback = Feedback.objects.create(
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
        logger.error(f'反馈提交失败: {str(e)}')
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
        return JsonResponse({'error': f'服务器错误: {str(e)}'}, status=500)


@csrf_exempt
def api_book_reviews_by_category(request, category_id):
    """获取某个分类下的所有书评 API"""
    if request.method != 'GET':
        return JsonResponse({'error': '仅支持 GET 请求'}, status=405)
    
    try:
        category = get_object_or_404(书评_分类, pk=category_id)
        
        # 获取分页参数
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 12))
        
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
                '图片': item.图片.url if hasattr(item, '图片') and item.图片 else None,
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
    except 书评_分类.DoesNotExist:
        return JsonResponse({'error': '分类不存在'}, status=404)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f'获取分类书评失败: {str(e)}')
        return JsonResponse({'error': f'服务器错误: {str(e)}'}, status=500)