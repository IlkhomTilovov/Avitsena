import json
import logging
import urllib.error
import urllib.request
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)


def send_telegram_message(
    chat_id: str,
    text: str,
    reply_to_message_id: Optional[int] = None
) -> Optional[int]:
    """Sends a message to Telegram and returns the sent message's id, or None on failure."""

    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)

    if not token or not chat_id:

        return None

    url = f'https://api.telegram.org/bot{token}/sendMessage'

    body = {
        'chat_id': chat_id,
        'text': text
    }

    if reply_to_message_id:

        body['reply_to_message_id'] = reply_to_message_id

    payload = json.dumps(body).encode('utf-8')

    request = urllib.request.Request(
        url,
        data=payload,
        headers={'Content-Type': 'application/json'}
    )

    try:

        with urllib.request.urlopen(request, timeout=5) as response:

            result = json.loads(response.read().decode('utf-8'))

            if result.get('ok'):

                return result['result']['message_id']

            logger.warning('Telegram sendMessage failed: %s', result)

            return None

    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:

        logger.warning('Telegram sendMessage error: %s', exc)

        return None
