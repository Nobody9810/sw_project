"""Admin decisions invalidate outstanding Telegram capabilities in the same transaction."""
from django.db import transaction
from django.utils import timezone


def invalidate_telegram(queryset):
    from notifications.models import TelegramReview
    TelegramReview.objects.filter(comment_id__in=queryset.values('pk'), status='pending').update(
        status='superseded', processed_at=timezone.now())


def moderate_queryset(queryset, **changes):
    with transaction.atomic():
        ids = list(queryset.select_for_update().order_by('pk').values_list('pk', flat=True))
        target = queryset.model.objects.filter(pk__in=ids)
        count = target.update(**changes, updated_at=timezone.now())
        invalidate_telegram(target)
        return count
