from shuwei.dates import local_date
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Case, Exists, F, OuterRef, Q, Subquery, Sum, Value, When
from django.db.models.functions import Coalesce
from home.models import 通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库

from .models import UserReaction, ViewCount, ViewRecord

CONTENT_MODELS = (通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库)


def aggregate_view_counts(articles, visible_counts):
    """Aggregate existing, permitted articles using the detail API's fallback."""
    content_type = ContentType.objects.get_for_model(articles.model)
    counts = visible_counts.filter(content_type=content_type, object_id=OuterRef('pk'))
    all_counts = ViewCount.objects.filter(content_type=content_type, object_id=OuterRef('pk'))
    today = local_date()
    current = Case(When(最后统计日期=today, then=F('今日浏览量')), default=Value(0))
    values = articles.annotate(
        _has_count=Exists(all_counts), _visible_count=Exists(counts),
    ).filter(Q(_has_count=False) | Q(_visible_count=True)).annotate(
        _total=Coalesce(Subquery(counts.values('总浏览量')[:1]), F('总浏览量')),
        _today=Coalesce(Subquery(counts.annotate(_current=current).values('_current')[:1]), current),
    ).aggregate(total=Sum('_total'), today=Sum('_today'))
    return {name: value or 0 for name, value in values.items()}


def edit_view_counts(count_id, total, today_count, *, using='default'):
    """Admin edits share the article-first lock order with visits and resets."""
    if total < 0 or today_count < 0 or today_count > total:
        raise ValidationError('今日浏览量必须在0和总浏览量之间。')
    with transaction.atomic(using=using):
        count = ViewCount.objects.using(using).select_related('content_type').get(pk=count_id)
        model = count.content_type.model_class()
        if model not in CONTENT_MODELS:
            raise ValidationError('无效的文章类型。')
        model.objects.using(using).select_for_update().get(pk=count.object_id)
        values = {'总浏览量': total, '今日浏览量': today_count, '最后统计日期': local_date()}
        ViewCount.objects.using(using).filter(pk=count_id).update(**values)
        model.objects.using(using).filter(pk=count.object_id).update(**values)


def merge_legacy_view_counts(model, item_id, *, using='default'):
    """Preserve totals; compare daily counters only when their dates match."""
    with transaction.atomic(using=using):
        item = model.objects.using(using).select_for_update().get(pk=item_id)
        content_type = ContentType.objects.db_manager(using).get_for_model(model)
        count, created = ViewCount.objects.using(using).get_or_create(
            content_type=content_type, object_id=item_id,
            defaults={'总浏览量': item.总浏览量, '今日浏览量': item.今日浏览量},
        )
        if created or item.最后统计日期 > count.最后统计日期:
            date, daily = item.最后统计日期, item.今日浏览量
        elif item.最后统计日期 == count.最后统计日期:
            date, daily = count.最后统计日期, max(item.今日浏览量, count.今日浏览量)
        else:
            date, daily = count.最后统计日期, count.今日浏览量
        values = {'总浏览量': max(item.总浏览量, count.总浏览量),
                  '今日浏览量': daily, '最后统计日期': date}
        # QuerySet.update deliberately bypasses DateField(auto_now=True).
        ViewCount.objects.using(using).filter(pk=count.pk).update(**values)
        model.objects.using(using).filter(pk=item_id).update(**values)


def read_view_counts(item):
    """Read authoritative counts, preserving article totals before migration."""
    content_type = ContentType.objects.get_for_model(item)
    count = ViewCount.objects.filter(content_type=content_type, object_id=item.pk).first()
    source = count if count is not None else item
    return {
        'total_views': source.总浏览量,
        'today_views': source.今日浏览量 if source.最后统计日期 == local_date() else 0,
    }


def reset_statistics(queryset):
    with transaction.atomic():
        # Lock the same article rows used by view/reaction requests.
        ids = list(queryset.order_by('pk').select_for_update().values_list('pk', flat=True))
        content_type = ContentType.objects.get_for_model(queryset.model)
        filters = {'content_type': content_type, 'object_id__in': ids}
        UserReaction.objects.filter(**filters).delete()
        ViewRecord.objects.filter(**filters).delete()
        ViewCount.objects.filter(**filters).update(
            总浏览量=0, 今日浏览量=0, 最后统计日期=local_date(),
        )
        queryset.model.objects.filter(pk__in=ids).update(
            likes=0, dislikes=0, 总浏览量=0, 今日浏览量=0, 最后统计日期=local_date(),
        )
