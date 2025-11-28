"""
Django Admin Dashboard 回调函数
用于在 admin 首页显示最新评论、最新问答、最新建议和数据统计
"""
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta
from comment.models import Comment
from qa.models import Question, Answer
from home.models import 通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库, Feedback
from interactions.models import ViewCount, UserReaction
from django.contrib.auth.models import User


def dashboard_callback(request, context):
    """
    Dashboard 回调函数
    返回包含最新评论、最新问答、最新建议和数据统计的 context
    """
    # 获取最新评论（最近5条）
    latest_comments = Comment.objects.select_related('content_type').order_by('-submit_date')[:5]
    
    # 获取最新问题（最近5条）
    latest_questions = Question.objects.select_related('author').order_by('-created_at')[:5]
    
    # 获取最新回答（最近5条）
    latest_answers = Answer.objects.select_related('question', 'author').order_by('-created_at')[:5]
    
    # 获取最新建议（最近5条，只选择需要的字段）
    latest_feedbacks = Feedback.objects.only('id', '姓名', '建议内容', '提交时间', '已处理').order_by('-提交时间')[:5]
    
    # 数据统计
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    
    # 评论统计
    total_comments = Comment.objects.count()
    pending_comments = Comment.objects.filter(is_public=False, is_removed=False).count()
    today_comments = Comment.objects.filter(submit_date__date=today).count()
    week_comments = Comment.objects.filter(submit_date__date__gte=week_ago).count()
    
    # 问答统计
    total_questions = Question.objects.count()
    published_questions = Question.objects.filter(status='published').count()
    draft_questions = Question.objects.filter(status='draft').count()
    total_answers = Answer.objects.count()
    today_questions = Question.objects.filter(created_at__date=today).count()
    today_answers = Answer.objects.filter(created_at__date=today).count()
    
    # 建议统计
    total_feedbacks = Feedback.objects.count()
    processed_feedbacks = Feedback.objects.filter(已处理=True).count()
    pending_feedbacks = Feedback.objects.filter(已处理=False).count()
    today_feedbacks = Feedback.objects.filter(提交时间__date=today).count()
    week_feedbacks = Feedback.objects.filter(提交时间__date__gte=week_ago).count()
    
    # 内容统计（所有文章类型）
    content_models = [通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库]
    total_articles = sum(model.objects.count() for model in content_models)
    published_articles = sum(model.objects.filter(发布状态=True).count() for model in content_models)
    
    # 浏览量统计
    total_views = ViewCount.objects.aggregate(total=Sum('总浏览量'))['total'] or 0
    today_views = ViewCount.objects.aggregate(total=Sum('今日浏览量'))['total'] or 0
    
    # 互动统计
    total_likes = UserReaction.objects.filter(reaction_type='like').count()
    total_dislikes = UserReaction.objects.filter(reaction_type='dislike').count()
    
    # 用户统计
    total_users = User.objects.count()
    staff_users = User.objects.filter(is_staff=True).count()
    
    # 将数据添加到 context
    context.update({
        'latest_comments': latest_comments,
        'latest_questions': latest_questions,
        'latest_answers': latest_answers,
        'latest_feedbacks': latest_feedbacks,
        'stats': {
            'comments': {
                'total': total_comments,
                'pending': pending_comments,
                'today': today_comments,
                'week': week_comments,
            },
            'qa': {
                'total_questions': total_questions,
                'published_questions': published_questions,
                'draft_questions': draft_questions,
                'total_answers': total_answers,
                'today_questions': today_questions,
                'today_answers': today_answers,
            },
            'feedbacks': {
                'total': total_feedbacks,
                'processed': processed_feedbacks,
                'pending': pending_feedbacks,
                'today': today_feedbacks,
                'week': week_feedbacks,
            },
            'content': {
                'total_articles': total_articles,
                'published_articles': published_articles,
            },
            'views': {
                'total': total_views,
                'today': today_views,
            },
            'interactions': {
                'total_likes': total_likes,
                'total_dislikes': total_dislikes,
            },
            'users': {
                'total': total_users,
                'staff': staff_users,
            },
        },
    })
    
    return context

