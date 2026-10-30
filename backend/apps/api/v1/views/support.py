from rest_framework import status
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.api.v1.serializers import SupportMessageCreateSerializer
from apps.shared.response import CustomResponse
from apps.support.services import send_telegram_message


class SupportMessageCreateView(APIView):

    serializer_class = SupportMessageCreateSerializer

    @extend_schema(tags=['support'], request=SupportMessageCreateSerializer)
    def post(self, request):

        serializer = self.serializer_class(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():

            support_message = serializer.save()

            user = request.user
            clinic = user.clinic

            text = (
                f"🆘 Yordam so'rovi\n"
                f"Klinika: {getattr(clinic, 'name', '—')}\n"
                f"Yuboruvchi: {user.fio} ({user.get_role_display()})\n"
                f"Telefon: {user.phone}\n\n"
                f"{support_message.message}"
            )

            delivered = send_telegram_message(
                getattr(clinic, 'telegram_chat_id', None),
                text
            )

            if delivered:

                support_message.delivered = True
                support_message.save(update_fields=['delivered'])

            return CustomResponse(
                message='Murojaatingiz qabul qilindi',
                data=self.serializer_class(support_message).data,
                status=status.HTTP_201_CREATED
            )

        return CustomResponse(
            success=False,
            message=str(serializer.errors),
            status=status.HTTP_400_BAD_REQUEST
        )
