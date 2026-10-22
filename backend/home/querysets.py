from django.db.models import Q


def content_queryset(model):
    queryset = model.objects.filter(发布状态=True)
    if model.__name__ == '书讯':
        return queryset.select_related('sale_info')
    if model.__name__ == '书评':
        return queryset.select_related('分类')
    return queryset


def adjacent_articles(item):
    """Neighbors in the public list order (-更新时间, -id), within one section."""
    queryset = content_queryset(type(item))
    newer = Q(更新时间__gt=item.更新时间) | Q(更新时间=item.更新时间, pk__gt=item.pk)
    older = Q(更新时间__lt=item.更新时间) | Q(更新时间=item.更新时间, pk__lt=item.pk)
    return {
        'previous_article': queryset.filter(newer).order_by('更新时间', 'id').values('id', '标题').first(),
        'next_article': queryset.filter(older).order_by('-更新时间', '-id').values('id', '标题').first(),
    }


def parse_pagination(params, default_size=10):
    try:
        page = int(params.get('page', 1))
        size = int(params.get('page_size', default_size))
    except (TypeError, ValueError):
        raise ValueError('page 和 page_size 必须是正整数')
    if page < 1 or not 1 <= size <= 100:
        raise ValueError('page 必须大于 0，page_size 必须在 1 到 100 之间')
    return page, size
