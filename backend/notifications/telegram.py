"""Telegram transport. Called only by the outbox worker, never a reader request."""
import logging
import requests
from django.conf import settings

from .errors import DeliveryError

logger = logging.getLogger(__name__)


def inline_button_count(payload):
    """Inspect keyboard shape without exposing text or callback capabilities."""
    markup = payload.get('reply_markup') if isinstance(payload, dict) else None
    rows = markup.get('inline_keyboard') if isinstance(markup, dict) else None
    if not isinstance(rows, list):
        return 0
    return sum(sum(isinstance(button, dict) for button in row)
               for row in rows if isinstance(row, list))


def call_api(method, payload, *, bot_token=None):
    token = settings.TELEGRAM_BOT_TOKEN if bot_token is None else bot_token
    if not token:
        raise DeliveryError('telegram_not_configured', permanent=True)
    try:
        response = requests.post(
            f'https://api.telegram.org/bot{token}/{method}', json=payload,
            timeout=(5, max(settings.OUTBOUND_SEND_TIMEOUT, payload.get('timeout', 0) + 5)
                     if method == 'getUpdates' else settings.OUTBOUND_SEND_TIMEOUT), allow_redirects=False,
        )
    except requests.RequestException:
        raise DeliveryError('telegram_network_error') from None
    try:
        data = response.json()
    except ValueError:
        data = {}
    if not isinstance(data, dict):
        data = {}
    if response.status_code == 200 and data.get('ok') is True:
        return data.get('result')
    # Never include Telegram's description/URL: either may contain private data.
    if response.status_code == 429 or data.get('error_code') == 429:
        parameters = data.get('parameters')
        delay = parameters.get('retry_after', 0) if isinstance(parameters, dict) else 0
        delay = delay if type(delay) is int and delay > 0 else 0
        raise DeliveryError('telegram_rate_limited', retry_after=delay)
    status = response.status_code
    description = data.get('description', '')
    if isinstance(description, str):
        description = description.lower()
        if method.startswith('editMessage') and 'message is not modified' in description:
            return True
        # Recognize fixed causes without persisting the upstream text or request URL.
        for fragment, code in (
            ('chat not found', 'telegram_chat_not_found'),
            ('bot was blocked', 'telegram_bot_blocked'),
            ('not enough rights', 'telegram_chat_permission_denied'),
            ("can't parse entities", 'telegram_invalid_message_format'),
            ('wrong http url', 'telegram_invalid_link'),
        ):
            if fragment in description and 400 <= status < 500:
                raise DeliveryError(code, permanent=True)
    raise DeliveryError(f'telegram_http_{status}', permanent=400 <= status < 500)


def send_telegram(payload):
    if not settings.TELEGRAM_CHAT_ID:
        raise DeliveryError('telegram_not_configured', permanent=True)
    method = payload.get('method', 'sendMessage')
    if method not in {'sendMessage', 'editMessageText'}:
        raise DeliveryError('telegram_invalid_operation', permanent=True)
    data = {'chat_id': settings.TELEGRAM_CHAT_ID, 'text': payload['text'],
            'parse_mode': 'HTML', 'link_preview_options': {'is_disabled': True}}
    if 'reply_markup' in payload:
        data['reply_markup'] = payload['reply_markup']
    if method == 'editMessageText':
        data['message_id'] = payload['message_id']
    result = call_api(method, data)
    message_id = result.get('message_id') if isinstance(result, dict) else None
    logger.info('Telegram %s accepted: message_id=%s requested_buttons=%s returned_buttons=%s',
                method, message_id if type(message_id) is int else 'unknown',
                inline_button_count(data),
                inline_button_count(result) if isinstance(result, dict) else 'unknown')
