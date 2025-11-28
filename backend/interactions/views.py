from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.db import models
from django.contrib.contenttypes.models import ContentType
from datetime import date
from django.utils import timezone
from .models import UserReaction, ViewCount, ViewRecord


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


def _get_or_create_view_count(content_type, object_id):
    """获取或创建浏览量统计对象"""
    view_count = ViewCount.objects.filter(
        content_type=content_type,
        object_id=object_id
    ).first()
    
    if view_count:
        return view_count
    
    # 如果不存在，尝试从原模型获取现有数据
    try:
        model_class = content_type.model_class()
        item = model_class.objects.get(id=object_id)
        
        # 从原模型字段获取现有数据（向后兼容）
        total_views = getattr(item, '总浏览量', 0)
        today_views = getattr(item, '今日浏览量', 0)
        last_count_date = getattr(item, '最后统计日期', date.today())
        
        # 创建 ViewCount 记录，使用原模型的数据
        view_count = ViewCount.objects.create(
            content_type=content_type,
            object_id=object_id,
            总浏览量=total_views,
            今日浏览量=today_views,
            最后统计日期=last_count_date
        )
    except (model_class.DoesNotExist, AttributeError):
        # 如果无法获取原模型数据，创建默认记录
        view_count = ViewCount.objects.create(
            content_type=content_type,
            object_id=object_id,
            总浏览量=0,
            今日浏览量=0,
            最后统计日期=date.today()
        )
    
    return view_count


@csrf_exempt
def update_view_count(request, app_label, model_name, item_id):
    """
    更新浏览量统计
    策略：同一Session在30分钟内只计算一次浏览量，防止刷新刷量
    """
    if request.method != 'POST':
        return JsonResponse({'error': '只允许POST请求'}, status=405)
    
    try:
        content_type, model_class = _get_content_type_and_model(app_label, model_name)
        user_session = _ensure_user_session(request)
        
        # 获取客户端IP地址
        ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
        if ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        
        with transaction.atomic():
            # 检查是否应该计算浏览量（30分钟内同一Session只算一次）
            should_count = ViewRecord.should_count_view(
                user_session=user_session,
                content_type=content_type,
                object_id=item_id,
                time_window_minutes=30  # 30分钟时间窗口
            )
            
            if not should_count:
                # 不计算浏览量，但返回当前数据
                view_count = _get_or_create_view_count(content_type, item_id)
                
                # 确保原模型字段与 ViewCount 同步（即使不计算浏览量）
                if hasattr(model_class, '总浏览量') and hasattr(model_class, '今日浏览量'):
                    model_class.objects.filter(id=item_id).update(
                        总浏览量=view_count.总浏览量,
                        今日浏览量=view_count.今日浏览量,
                        最后统计日期=view_count.最后统计日期
                    )
                
                return JsonResponse({
                    'success': True,
                    'counted': False,
                    'message': '短时间内已访问过，不重复计算',
                    'total_views': view_count.总浏览量,
                    'today_views': view_count.今日浏览量,
                })
            
            # 记录本次访问（创建新记录，不更新已有记录）
            ViewRecord.objects.create(
                user_session=user_session,
                content_type=content_type,
                object_id=item_id,
                viewed_at=timezone.now(),
                ip_address=ip_address
            )
            
            # 获取或创建 ViewCount 对象
            view_count = _get_or_create_view_count(content_type, item_id)
            today = date.today()
            
            # 检查是否需要重置今日浏览量
            if view_count.最后统计日期 != today:
                # 使用 update() 方法直接更新数据库
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
            
            # 重新获取最新数据
            view_count.refresh_from_db()
            
            # 为了保持向后兼容，同步更新原模型的字段
            if hasattr(model_class, '总浏览量') and hasattr(model_class, '今日浏览量'):
                model_class.objects.filter(id=item_id).update(
                    总浏览量=view_count.总浏览量,
                    今日浏览量=view_count.今日浏览量,
                    最后统计日期=view_count.最后统计日期
                )
            
            return JsonResponse({
                'success': True,
                'counted': True,
                'total_views': view_count.总浏览量,
                'today_views': view_count.今日浏览量,
            })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def get_view_count(request, app_label, model_name, item_id):
    """获取浏览量统计"""
    try:
        content_type, _ = _get_content_type_and_model(app_label, model_name)
        view_count = ViewCount.objects.filter(
            content_type=content_type,
            object_id=item_id
        ).first()
        
        if view_count:
            return JsonResponse({
                'success': True,
                'total_views': view_count.总浏览量,
                'today_views': view_count.今日浏览量,
            })
        else:
            return JsonResponse({
                'success': True,
                'total_views': 0,
                'today_views': 0,
            })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def _handle_reaction(user_session, content_type, item, action):
    """处理用户反应并更新计数"""
    reaction, created = UserReaction.objects.get_or_create(
        user_session=user_session,
        content_type=content_type,
        object_id=item.id,
        defaults={'reaction_type': action}
    )
    
    # 获取或创建 ViewCount 来存储点赞数
    # 注意：为了保持向后兼容，我们仍然更新原模型的 likes/dislikes 字段
    # 但也可以选择只存储在 ViewCount 中
    
    if not created:
        if reaction.reaction_type == action:
            # 取消反应
            reaction.delete()
            # 更新原模型的计数（保持向后兼容）
            if hasattr(item, 'likes') and hasattr(item, 'dislikes'):
                type(item).objects.filter(id=item.id).update(
                    **{action + 's': models.F(action + 's') - 1}
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
                        old_action + 's': models.F(old_action + 's') - 1
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
    return _create_response(item, user_session, content_type)


def _create_response(item, user_session, content_type):
    """创建响应数据"""
    return {
        'success': True,
        'total_likes': getattr(item, 'likes', 0),
        'total_dislikes': getattr(item, 'dislikes', 0),
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


# API endpoints
@csrf_exempt
def like_item(request, app_label, model_name, item_id):
    """点赞接口"""
    return handle_like_dislike(request, app_label, model_name, item_id, 'like')


@csrf_exempt
def dislike_item(request, app_label, model_name, item_id):
    """点踩接口"""
    return handle_like_dislike(request, app_label, model_name, item_id, 'dislike')
