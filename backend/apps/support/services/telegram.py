import json
import urllib.error
import urllib.request

from django.conf import settings


def send_telegram_message(chat_id: str, text: str) -> bool:

    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)

    if not token or not chat_id:

        return False

    url = f'https://api.telegram.org/bot{token}/sendMessage'

    payload = json.dumps({
        'chat_id': chat_id,
        'text': text
    }).encode('utf-8')

    request = urllib.request.Request(
        url,
        data=payload,
        headers={'Content-Type': 'application/json'}
    )

    try:

        with urllib.request.urlopen(request, timeout=5) as response:

            return response.status == 200

    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):

        return False
