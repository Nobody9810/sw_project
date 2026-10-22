from shuwei.dates import local_date
import logging
from django.contrib.contenttypes.models import ContentType
from django.db import models, transaction
from django.db.models.functions import Greatest
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import UserReaction, ViewCount, ViewRecord
from .services import read_view_counts
from .identity import request_identity

logger = logging.getLogger(__name__)


def _get_content_type_and_model(app_label, model_name):
    from home.views import MODEL_MAP
    if app_label != 'home' or model_name not in MODEL_MAP:
        raise Http404('无效的内容类型')
    model = MODEL_MAP[model_name]
    return ContentType.objects.get_for_model(model), model


def _get_item_for_update(model_class, item_id):
    return get_object_or_404(model_class.objects.select_for_update(), pk=item_id, 发布状态=True)


def _get_or_create_view_count(content_type, item):
    return ViewCount.objects.get_or_create(
        content_type=content_type, object_id=item.pk,
        defaults={
            '总浏览量': item.总浏览量,
            '今日浏览量': item.今日浏览量 if item.最后统计日期 == local_date() else 0,
            '最后统计日期': local_date(),
        },
    )[0]


def update_view_count(request, app_label, model_name, item_id):
    if request.method != 'POST':
        return JsonResponse({'error': '只允许POST请求'}, status=405)
    try:
        content_type, model = _get_content_type_and_model(app_label, model_name)
        _, user_id, session = request_identity(request)
        with transaction.atomic():
            # Serializes deduplication, day rollover and admin resets for this article.
            item = _get_item_for_update(model, item_id)
            view_count = _get_or_create_view_count(content_type, item)
            today = local_date()
            counted = ViewRecord.should_count_view(session, content_type, item_id, 30, user_id=user_id)
            if view_count.最后统计日期 != today:
                view_count.今日浏览量 = 0
                view_count.最后统计日期 = today
            if counted:
                ViewRecord.objects.create(user_id=user_id, user_session=session, content_type=content_type, object_id=item_id)
                view_count.总浏览量 += 1
                view_count.今日浏览量 += 1
            ViewCount.objects.filter(pk=view_count.pk).update(
                总浏览量=view_count.总浏览量, 今日浏览量=view_count.今日浏览量, 最后统计日期=today,
            )
            model.objects.filter(pk=item_id).update(
                总浏览量=view_count.总浏览量, 今日浏览量=view_count.今日浏览量, 最后统计日期=today,
            )
            return JsonResponse({'success': True, 'counted': counted,
                                 'total_views': view_count.总浏览量, 'today_views': view_count.今日浏览量})
    except Http404:
        return JsonResponse({'error': '对象不存在或未发布'}, status=404)
    except Exception:
        logger.exception('更新浏览量失败')
        return JsonResponse({'error': '服务器错误，请稍后重试'}, status=500)


def get_view_count(request, app_label, model_name, item_id):
    try:
        content_type, model = _get_content_type_and_model(app_label, model_name)
        item = get_object_or_404(model, pk=item_id, 发布状态=True)
        return JsonResponse({'success': True, **read_view_counts(item)})
    except Http404:
        return JsonResponse({'error': '对象不存在或未发布'}, status=404)


def _handle_reaction(identity_key, user_id, user_session, content_type, item, action):
    """处理用户反应并更新计数"""
    reaction, created = UserReaction.objects.get_or_create(
        identity_key=identity_key,
        content_type=content_type,
        object_id=item.id,
        defaults={'reaction_type': action, 'user_id': user_id, 'user_session': user_session}
    )
    
    # Reaction counters remain on the article; ViewCount only stores views.
    if not created:
        if reaction.reaction_type == action:
            # 取消反应
            reaction.delete()
            # 更新原模型的计数（保持向后兼容）
            if hasattr(item, 'likes') and hasattr(item, 'dislikes'):
                type(item).objects.filter(id=item.id).update(
                    **{action + 's': Greatest(models.F(action + 's') - 1, 0)}
                )
        else:
            # 切换反应类型
            old_action = reaction.reaction_type
            reaction.reaction_type = action
            reaction.save()
            # 更新原模型的计数（保持向后兼容）
            if hasattr(item, 'likes') and hasattr(item, 'dislikes'):
                type(item).objects.filter(id=item.id).update(
                    **{
                        action + 's': models.F(action + 's') + 1,
                        old_action + 's': Greatest(models.F(old_action + 's') - 1, 0)
                    }
                )
    else:
        # 新增反应
        if hasattr(item, 'likes') and hasattr(item, 'dislikes'):
            type(item).objects.filter(id=item.id).update(
                **{action + 's': models.F(action + 's') + 1}
            )
    
    # 重新获取最新数据
    item.refresh_from_db()
    return _create_response(item, identity_key, content_type)


def _create_response(item, identity_key, content_type):
    """创建响应数据"""
    return {
        'success': True,
        'total_likes': getattr(item, 'likes', 0),
        'total_dislikes': getattr(item, 'dislikes', 0),
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


def handle_like_dislike(request, app_label, model_name, item_id, action):
    if request.method != 'POST':
        return JsonResponse({'error': '只允许POST请求'}, status=405)
    try:
        return _process_reaction(request, app_label, model_name, item_id, action)
    except Http404:
        return JsonResponse({'error': '对象不存在或未发布'}, status=404)
    except Exception:
        logger.exception('更新点赞状态失败')
        return JsonResponse({'error': '服务器错误，请稍后重试'}, status=500)


def _process_reaction(request, app_label, model_name, item_id, action):
    identity_key, user_id, session = request_identity(request)
    content_type, model = _get_content_type_and_model(app_label, model_name)
    with transaction.atomic():
        item = _get_item_for_update(model, item_id)
        return JsonResponse(_handle_reaction(identity_key, user_id, session, content_type, item, action))


def like_item(request, app_label, model_name, item_id):
    return handle_like_dislike(request, app_label, model_name, item_id, 'like')


def dislike_item(request, app_label, model_name, item_id):
    return handle_like_dislike(request, app_label, model_name, item_id, 'dislike')


def get_reaction(request, app_label, model_name, item_id):
    if request.method != 'GET':
        return JsonResponse({'error': '只允许GET请求'}, status=405)
    try:
        content_type, model = _get_content_type_and_model(app_label, model_name)
        identity_key, _, _ = request_identity(request, create_session=False)
        with transaction.atomic():
            item = _get_item_for_update(model, item_id)
            response = JsonResponse(_create_response(item, identity_key, content_type))
            response['Cache-Control'] = 'private, no-store'
            return response
    except Http404:
        return JsonResponse({'error': '对象不存在或未发布'}, status=404)
