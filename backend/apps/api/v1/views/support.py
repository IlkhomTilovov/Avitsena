from rest_framework import status
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from apps.api.v1.serializers import (
    SupportMessageCreateSerializer,
    SupportMessageListSerializer
)
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

            return [IsSuperAdmin()]

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

        clinic_id = request.query_params.get('clinic')

        if clinic_id:

            queryset = queryset.filter(clinic_id=clinic_id)

        paginator = self.pagination_class()

        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = SupportMessageListSerializer(paginated_queryset, many=True)

        return paginator.get_paginated_response(serializer.data)
