"""Delivery adapters by channel. A new platform registers a sender; callers only enqueue."""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from .errors import DeliveryError
from .telegram import send_telegram


def send_email(payload):
    connection = get_connection(timeout=settings.OUTBOUND_SEND_TIMEOUT)
    message = EmailMultiAlternatives(payload['subject'], payload['body'], payload.get('from_email') or None,
                                     payload['to'], headers=payload.get('headers') or None, connection=connection)
    if payload.get('html'):
        message.attach_alternative(payload['html'], 'text/html')
    if message.send() != 1:
        raise DeliveryError('email_not_sent')


def send_article_channel(payload):
    from .publishing import deliver_article
    return deliver_article(payload)


SENDERS = {'email': send_email, 'telegram': send_telegram, 'telegram_article': send_article_channel}
