from django import template
from home.models import 通讯, 译林, 观点,书评,文艺,文史,论文,古籍,书库,书评_分类
from interactions.models import UserReaction
from comment.models import Comment
from comment.views import get_comments_for_object
from django.contrib.contenttypes.models import ContentType
from django.template.loader import render_to_string
from django.urls import reverse
import random
import hashlib
register = template.Library()

@register.inclusion_tag('components/sidebar/main_sidebar.html', takes_context=True)
def sidebar_content(context):
    # 查询通讯板块的最新两篇文章
    latest_tongxun = 通讯.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_yilin = 译林.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_guandian = 观点.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_shuping = 书评.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_wenyi = 文艺.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_wenshi = 文史.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_lunwen = 论文.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_guji = 古籍.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_shuku = 书库.objects.all().filter(发布状态=True).order_by('-更新时间')[:1]
    return {
        'latest_tongxun': latest_tongxun,
        'latest_yilin': latest_yilin,
        'latest_guandian': latest_guandian,
        'latest_shuping':latest_shuping,
        'latest_wenyi':latest_wenyi,
        'latest_wenshi':latest_wenshi,
        'latest_lunwen':latest_lunwen,
        'latest_guji':latest_guji,
        'latest_shuku':latest_shuku
    }

@register.inclusion_tag('components/sidebar/书评_sidebar.html', takes_context=True)
def sidebar_content1(context):
    # 查询通讯板块的最新两篇文章
    latest_tongxun = 通讯.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_yilin = 译林.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_guandian = 观点.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_shuping = 书评.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_wenyi = 文艺.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_wenshi = 文史.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_lunwen = 论文.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_guji = 古籍.objects.filter(发布状态=True).order_by('-更新时间')[:1]
    latest_shuku = 书库.objects.all().filter(发布状态=True).order_by('-更新时间')[:1]
    分类 = 书评_分类.objects.all()
    return {
        'latest_tongxun': latest_tongxun,
        'latest_yilin': latest_yilin,
        'latest_guandian': latest_guandian,
        'latest_shuping':latest_shuping,
        'latest_wenyi':latest_wenyi,
        'latest_wenshi':latest_wenshi,
        'latest_lunwen':latest_lunwen,
        'latest_guji':latest_guji,
        'latest_shuku':latest_shuku,
        '分类' : 分类,
    }

@register.inclusion_tag('comment_section.html', takes_context=True)
def comment_section(context, object):
    comments = get_comments_for_object(object)
    return {
        'comments': comments,
        'user': context.get('user'),  # 使用 context.get 确保不会引发 KeyError
        'object': object,
    }

@register.simple_tag(takes_context=True)
def render_like_dislike_buttons(context, obj):
    """渲染点赞和不喜欢按��"""
    request = context['request']
    
    # 确保用户有session
    if not request.session.session_key:
        request.session.create()
    
    user_session = request.session.session_key
    content_type = ContentType.objects.get_for_model(obj)
    
    # 获取用户的反应状态
    user_reaction = UserReaction.objects.filter(
        user_session=user_session,
        content_type=content_type,
        object_id=obj.id
    ).first()
    
    button_context = {
        'object': obj,
        'app_label': obj._meta.app_label,
        'model_name': obj._meta.model_name,
        'object_id': obj.id,
        'total_likes': obj.likes,
        'total_dislikes': obj.dislikes,
        'is_liked': user_reaction and user_reaction.reaction_type == 'like',
        'is_disliked': user_reaction and user_reaction.reaction_type == 'dislike',
        'csrf_token': context.get('csrf_token'),
    }
    
    return render_to_string('components/like_button/like_button.html', button_context, request=request)

@register.simple_tag
def get_avatar_url(user_name=None, size=80):
    """获取头像URL，基于用户名生成唯一的头像"""
    styles = ['adventurer', 'avataaars', 'bottts', 'micah', 'miniavs', 'personas']
    
    if user_name:
        # 使用用户名作为种子来确保同一用户名总是获得相同的头像
        seed = hashlib.md5(user_name.encode('utf-8')).hexdigest()
        # 使用用户名的哈希值来确定使用哪个风格
        style = styles[int(seed[0], 16) % len(styles)]
    else:
        # 如果没有用户名，随机生成
        style = random.choice(styles)
        seed = str(random.randint(1, 99999))
    
    return f"https://api.dicebear.com/6.x/{style}/svg?seed={seed}&backgroundColor=ffffff"