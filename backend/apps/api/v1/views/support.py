from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from apps.api.v1.serializers import (
    SupportMessageCreateSerializer,
    SupportMessageListSerializer,
    SupportMessageReplySerializer
)
from apps.shared.choices import UserRole
from apps.shared.pagination import CustomPagination
from apps.shared.permissions import IsSuperAdmin
from apps.shared.response import CustomResponse
from apps.support.models import SupportMessage
from apps.support.services import send_telegram_message


class SupportMessageCreateView(APIView):

    serializer_class = SupportMessageCreateSerializer
    pagination_class = CustomPagination

    def get_permissions(self):

        if self.request.method == 'GET':

            return [IsAuthenticated()]

        return super().get_permissions()

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

            telegram_message_id = send_telegram_message(
                getattr(clinic, 'telegram_chat_id', None),
                text
            )

            if telegram_message_id:

                support_message.delivered = True
                support_message.telegram_message_id = telegram_message_id
                support_message.save(update_fields=['delivered', 'telegram_message_id'])

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

    @extend_schema(
        tags=['support'],
        parameters=[
            OpenApiParameter(name='clinic', description='Clinic id', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='page', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT),
            OpenApiParameter(name='per_page', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT),
        ],
        responses={status.HTTP_200_OK: SupportMessageListSerializer}
    )
    def get(self, request):

        queryset = SupportMessage.objects \
            .select_related('clinic', 'user') \
            .order_by('-created_at')

        user = request.user

        if user.role == UserRole.SUPERADMIN:

            clinic_id = request.query_params.get('clinic')

            if clinic_id:

                queryset = queryset.filter(clinic_id=clinic_id)

        else:

            queryset = queryset.filter(user=user)

        paginator = self.pagination_class()

        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = SupportMessageListSerializer(paginated_queryset, many=True)

        return paginator.get_paginated_response(serializer.data)


class SupportMessageReplyView(APIView):

    serializer_class = SupportMessageReplySerializer
    permission_classes = [IsSuperAdmin]

    @extend_schema(tags=['support'], request=SupportMessageReplySerializer)
    def patch(self, request, id):

        try:

            support_message = SupportMessage.objects.select_related('clinic').get(id=id)

        except SupportMessage.DoesNotExist:

            return CustomResponse(
                success=False,
                message='Murojaat topilmadi',
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.serializer_class(data=request.data)

        if not serializer.is_valid():

            return CustomResponse(
                success=False,
                message=str(serializer.errors),
                status=status.HTTP_400_BAD_REQUEST
            )

        reply = serializer.validated_data['reply']

        support_message.reply = reply
        support_message.replied_by = request.user.fio
        support_message.replied_at = timezone.now()
        support_message.reply_source = SupportMessage.REPLY_SOURCE_APP
        support_message.save(update_fields=[
            'reply', 'replied_by', 'replied_at', 'reply_source'
        ])

        send_telegram_message(
            getattr(support_message.clinic, 'telegram_chat_id', None),
            f"✅ Admin javobi:\n{reply}",
            reply_to_message_id=support_message.telegram_message_id
        )

        return CustomResponse(
            message='Javob yuborildi',
            data=SupportMessageListSerializer(support_message).data
        )


class SupportTelegramWebhookView(APIView):
    """Receives Telegram bot updates so admins can reply to a support message directly in Telegram."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):

        secret = getattr(settings, 'TELEGRAM_WEBHOOK_SECRET', None)

        if secret and request.headers.get('X-Telegram-Bot-Api-Secret-Token') != secret:

            return Response(status=status.HTTP_403_FORBIDDEN)

        message = request.data.get('message') or {}
        reply_to = message.get('reply_to_message')

        if not reply_to:

            return Response(status=status.HTTP_200_OK)

        reply_to_message_id = reply_to.get('message_id')
        text = (message.get('text') or '').strip()
        chat_id = message.get('chat', {}).get('id')

        if not text or not reply_to_message_id or chat_id is None:

            return Response(status=status.HTTP_200_OK)

        support_message = SupportMessage.objects.filter(
            telegram_message_id=reply_to_message_id,
            clinic__telegram_chat_id=str(chat_id)
        ).first()

        if support_message:

            sender = message.get('from') or {}
            replied_by = sender.get('username') or sender.get('first_name') or 'Telegram'

            support_message.reply = text
            support_message.replied_by = replied_by
            support_message.replied_at = timezone.now()
            support_message.reply_source = SupportMessage.REPLY_SOURCE_TELEGRAM
            support_message.save(update_fields=[
                'reply', 'replied_by', 'replied_at', 'reply_source'
            ])

        return Response(status=status.HTTP_200_OK)
