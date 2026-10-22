from django.utils import timezone


def local_date():
    """Support both the project's naive dates and installations using USE_TZ."""
    now = timezone.now()
    return timezone.localdate(now) if timezone.is_aware(now) else now.date()
