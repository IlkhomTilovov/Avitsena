from rest_framework import status
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):

    response = exception_handler(exc, context)

    if response is not None and response.status_code == status.HTTP_401_UNAUTHORIZED:

        message = response.data.get('detail', 'Authentication failed')
        
        response.data = {
            'success': False,
            'message': message
        }

    elif response is not None and response.status_code == status.HTTP_404_NOT_FOUND:

        message = response.data.get('detail')

        response.data = {
            'success': False,
            'message': message
        }

    elif response is not None and response.status_code == status.HTTP_403_FORBIDDEN:

        message = response.data.get('detail')

        response.data = {
            'success': False,
            'message': message
        }

    elif response is not None and response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE:
        response.data = {
            'success': False,
            'message': 'Request Entity Too Large'
        }

    elif response is not None and response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED:
        response.data = {
            'success': False,
            'message': response.data.get('detail', None)
        }
    

    elif response is not None and response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:

        response.data = {
            'success': False,
            'message': 'Request was throttled!'
        }

    return response