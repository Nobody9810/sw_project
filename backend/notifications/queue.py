"""Database outbox: requests enqueue, `manage.py run_outbound_worker` delivers with retries."""
import logging
from datetime import timedelta

from django.conf import settings
from django.db import connection, transaction
from django.db.models import Q
from django.utils import timezone

from .channels import SENDERS
from .models import OutboundMessage
from .errors import DeliveryError

logger = logging.getLogger(__name__)
# Delay before attempt n+1; the last value repeats until the message expires.
RETRY_DELAYS = (10, 30, 120, 300)


def enqueue(channel, payload, ttl=None):
    if channel not in SENDERS:
        raise ValueError(f'unknown channel: {channel}')
    now = timezone.now()
    ttl = settings.OUTBOUND_MESSAGE_TTL if ttl is None else ttl
    return OutboundMessage.objects.create(channel=channel, payload=payload, available_at=now,
                                          expires_at=now + timedelta(seconds=ttl))


def enqueue_email(message, ttl=None):
    """Queue a rendered Django EmailMessage instead of sending it in the request."""
    html = next((content for content, mimetype in getattr(message, 'alternatives', []) if mimetype == 'text/html'), '')
    return enqueue('email', {'subject': message.subject, 'body': message.body, 'html': html,
                             'from_email': message.from_email, 'to': list(message.to),
                             'headers': dict(message.extra_headers)}, ttl)


def owned(message):
    # Claim generation + lease compare prevents an expired worker from mutating a new claim.
    return OutboundMessage.objects.filter(pk=message.pk, status=OutboundMessage.SENDING,
                                         attempts=message.attempts, available_at=message.available_at)


def give_up(message, error):
    updated = owned(message).update(status=OutboundMessage.FAILED, payload={}, last_error=error[:200])
    if updated:
        if message.channel == 'telegram_article':
            from .models import ArticleDistribution
            ArticleDistribution.objects.filter(outbox_id=message.pk, status='queued').update(
                status='failed', last_error=error[:200])
            ArticleDistribution.objects.filter(outbox_id=message.pk, status='sending').update(
                status='unknown', last_error='delivery_interrupted_check_channel')
        logger.warning('Outbound %s #%s abandoned after %s attempts: %s', message.channel, message.pk, message.attempts, error)


def claim(limit):
    """Lock due messages for this worker; a crashed worker's claim lapses after the lease."""
    now = timezone.now()
    lease = now + timedelta(seconds=settings.OUTBOUND_SEND_TIMEOUT * 2 + 30)
    with transaction.atomic():
        # Concurrent workers skip each other's rows (MySQL 8 / MariaDB 10.6); otherwise they wait.
        skip = connection.features.has_select_for_update_skip_locked
        due = (OutboundMessage.objects.select_for_update(skip_locked=skip)
               .filter(Q(status=OutboundMessage.PENDING) | Q(status=OutboundMessage.SENDING), available_at__lte=now)
               .order_by('available_at', 'pk')[:limit])
        claimed = list(due)
        for message in claimed:
            message.status = OutboundMessage.SENDING
            message.attempts += 1
            message.available_at = lease
        OutboundMessage.objects.bulk_update(claimed, ['status', 'attempts', 'available_at'])
    return claimed


def deliver(message):
    if not owned(message).filter(available_at__gt=timezone.now()).exists():
        return None
    if timezone.now() >= message.expires_at:
        return give_up(message, 'expired before delivery')
    if message.attempts > settings.OUTBOUND_MAX_ATTEMPTS:
        return give_up(message, 'attempt_limit')
    try:
        SENDERS[message.channel](message.payload)
    except Exception as error:  # Any provider failure is retried; never surfaced to the reader's request.
        reason = str(error) if isinstance(error, DeliveryError) else type(error).__name__
        if message.attempts >= settings.OUTBOUND_MAX_ATTEMPTS or getattr(error, 'permanent', False):
            return give_up(message, reason)
        delay = RETRY_DELAYS[min(message.attempts, len(RETRY_DELAYS)) - 1]
        delay = max(delay, getattr(error, 'retry_after', 0))
        available = timezone.now() + timedelta(seconds=min(delay, 86400))
        owned(message).update(status=OutboundMessage.PENDING, available_at=available, last_error=reason[:200])
        logger.info('Outbound %s #%s failed (attempt %s), retry in %ss', message.channel, message.pk, message.attempts, delay)
        return None
    # Delivered: keep no copy of the content (login codes, addresses).
    deleted, _ = owned(message).delete()
    if deleted:
        logger.info('Outbound %s #%s delivered', message.channel, message.pk)
    return True


def process(limit=20):
    """Deliver one batch; returns the number of messages handled."""
    handled = 0
    # Lease starts just before sending, rather than while waiting behind a whole batch.
    for _ in range(limit):
        batch = claim(1)
        if not batch:
            break
        deliver(batch[0])
        handled += 1
    return handled


def purge_failed(days=7):
    cutoff = timezone.now() - timedelta(days=days)
    return OutboundMessage.objects.filter(status=OutboundMessage.FAILED, created_at__lt=cutoff).delete()[0]
