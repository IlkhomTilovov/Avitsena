from rest_framework.response import Response
from rest_framework import status


class CustomResponse(Response):
    
    def __init__(self, success=True, data=None, status=status.HTTP_200_OK, message=None, **kwargs):

        response = {
            'success': success,
            **({'message': message} if message  else {}),
            **({'data': data} if data else {})
        }

        super().__init__(response, status=status, **kwargs)