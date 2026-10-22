"""Permission-aware admin overview, using the same querysets as model admins."""
from django.db.models import Count, Q
from django.urls import reverse

from comment.models import Comment
from home.models import Feedback
from interactions.models import ViewCount, UserReaction
from interactions.services import CONTENT_MODELS, aggregate_view_counts
from qa.models import Question
from .dates import local_date
from .admin_access import viewable_model_admin



def visible_queryset(request, model):
    """Do not even query data a staff account cannot view in the model admin."""
    model_admin = viewable_model_admin(request, model)
    return model_admin.get_queryset(request) if model_admin is not None else None


def admin_url(model, pk=None):
    opts = model._meta
    name = f'admin:{opts.app_label}_{opts.model_name}_' + ('change' if pk is not None else 'changelist')
    return reverse(name, args=[pk] if pk is not None else None)


def dashboard_callback(request, context):
    today = local_date()
    stats, cards, panels, tasks, shortcuts = {}, [], [], [], []

    def add_card(label, value, icon, detail, url):
        cards.append({'label': label, 'value': value, 'icon': icon, 'detail': detail, 'url': url})

    def add_panel(title, icon, model, items):
        panels.append({'title': title, 'icon': icon, 'url': admin_url(model), 'items': items})

    comments = visible_queryset(request, Comment)
    if comments is not None:
        stats['comments'] = comments.aggregate(
            total=Count('pk'), pending=Count('pk', filter=Q(is_public=False, is_removed=False)),
            today=Count('pk', filter=Q(submit_date__date=today)))
        values = stats['comments']
        tasks.append({'label': '待审核评论', 'count': values['pending'], 'icon': 'chat_bubble',
                      'url': admin_url(Comment) + '?is_public__exact=0&is_removed__exact=0'})
        add_card('评论总数', values['total'], 'comment',
                 f'待审核：{values["pending"]} · 今日：{values["today"]}', admin_url(Comment))
        latest_comments = list(comments.prefetch_related(None).order_by('-submit_date', '-pk')[:5])
        add_panel('最新评论', 'comment', Comment, [
            {'title': row.user_name, 'text': row.comment[:120], 'date': row.submit_date,
             'status': '已移除' if row.is_removed else ('已公开' if row.is_public else '待审核'),
             'pending': not row.is_public and not row.is_removed, 'url': admin_url(Comment, row.pk)}
            for row in latest_comments])

    totals, article_querysets = [], []
    for model in CONTENT_MODELS:
        queryset = visible_queryset(request, model)
        if queryset is not None:
            article_querysets.append(queryset)
            values = queryset.aggregate(total=Count('pk'), published=Count('pk', filter=Q(发布状态=True)))
            totals.append(values)
            shortcuts.append({'label': model._meta.verbose_name, 'count': values['total'], 'url': admin_url(model)})
    if totals:
        stats['content'] = {'total_articles': sum(row['total'] for row in totals),
                            'published_articles': sum(row['published'] for row in totals)}
        # The number covers only the content models this user may view.
        add_card('可管理文章', stats['content']['total_articles'], 'article',
                 f'已发布：{stats["content"]["published_articles"]}', None)

    views = visible_queryset(request, ViewCount)
    if views is not None:
        values = [aggregate_view_counts(queryset, views) for queryset in article_querysets]
        stats['views'] = {name: sum(row[name] for row in values) for name in ('total', 'today')}
        add_card('总浏览量', stats['views']['total'], 'visibility',
                 f'今日：{stats["views"]["today"]}', admin_url(ViewCount))

    questions = visible_queryset(request, Question)
    if questions is not None:
        tasks.append({'label': '待审核问题', 'count': questions.filter(status='draft').count(),
                      'icon': 'help', 'url': admin_url(Question) + '?status__exact=draft'})
        latest_questions = list(questions.order_by('-created_at', '-pk')[:5])
        add_panel('最新问答', 'help', Question, [
            {'title': row.content[:100], 'text': '', 'date': row.created_at,
             'status': row.get_status_display(), 'pending': row.status == 'draft',
             'url': admin_url(Question, row.pk)} for row in latest_questions])

    feedbacks = visible_queryset(request, Feedback)
    if feedbacks is not None:
        stats['feedbacks'] = feedbacks.aggregate(
            total=Count('pk'),
            pending=Count('pk', filter=Q(已处理=False)),
            today=Count('pk', filter=Q(提交时间__date=today)))
        values = stats['feedbacks']
        tasks.append({'label': '待处理建议', 'count': values['pending'], 'icon': 'feedback',
                      'url': admin_url(Feedback) + '?已处理__exact=0'})
        add_card('建议总数', values['total'], 'feedback',
                 f'待处理：{values["pending"]} · 今日：{values["today"]}', admin_url(Feedback))
        latest_feedbacks = list(feedbacks.order_by('-提交时间', '-pk')[:5])
        add_panel('最新建议', 'feedback', Feedback, [
            {'title': row.姓名, 'text': row.建议内容[:120], 'date': row.提交时间,
             'status': '已处理' if row.已处理 else '待处理', 'pending': not row.已处理,
             'url': admin_url(Feedback, row.pk)} for row in latest_feedbacks])

    reactions = visible_queryset(request, UserReaction)
    if reactions is not None:
        stats['interactions'] = reactions.aggregate(
            total_likes=Count('pk', filter=Q(reaction_type='like')),
            total_dislikes=Count('pk', filter=Q(reaction_type='dislike')))
        values = stats['interactions']
        add_card('总点赞数', values['total_likes'], 'thumb_up',
                 f'点踩数：{values["total_dislikes"]}', admin_url(UserReaction))

    context.update(stats=stats, dashboard_cards=cards, dashboard_lists=panels,
                   dashboard_tasks=tasks, dashboard_shortcuts=shortcuts, dashboard_date=today,
                   dashboard_pending=sum(item['count'] for item in tasks))
    return context
