from rest_framework_simplejwt.tokens import RefreshToken
from typing import Tuple


def get_tokens_for_user(user) -> Tuple[str]:

    refresh = RefreshToken.for_user(user)

    return str(refresh), str(refresh.access_token)