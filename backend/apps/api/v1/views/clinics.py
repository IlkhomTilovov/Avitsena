from rest_framework.views import APIView
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from apps.shared.response import CustomResponse
from apps.shared.pagination import CustomPagination
from apps.shared.permissions import IsSuperAdmin
from apps.api.v1.serializers import (
    ClinicListSerializer,
    ClinicDetailSerializer,
    ClinicCreateSerializer
)
from apps.clinics.models import Clinic
from rest_framework.exceptions import NotFound


class ClinicListCreateView(APIView):

    permission_classes = (IsSuperAdmin, )
    pagination_class = CustomPagination

    def get_queryset(self):

        query_params = self.request.query_params

        search = query_params.get('search')

        queryset = Clinic.objects.order_by('-created_at')

        if search:

            queryset = queryset.filter(name__icontains=search)

        return queryset

    @extend_schema(
        tags=['clinics'],
        parameters=[
            OpenApiParameter(
                name='page',
                description='Page number',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.INT
            ),
            OpenApiParameter(
                name='per_page',
                description='Page item count',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.INT
            ),
            OpenApiParameter(
                name='search',
                description='Search by name',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR
            )
        ],
        responses={
            status.HTTP_200_OK: ClinicListSerializer
        }
    )
    def get(self, request):

        queryset = self.get_queryset()

        paginator = self.pagination_class()

        paginated_queryset = paginator.paginate_queryset(
            queryset,
            request
        )

        serializer = ClinicListSerializer(
            paginated_queryset,
            many=True
        )

        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        tags=['clinics'],
        request=ClinicCreateSerializer,
        responses={
            status.HTTP_201_CREATED: ClinicDetailSerializer
        }
    )
    def post(self, request):

        serializer = ClinicCreateSerializer(data=request.data)

        if serializer.is_valid():

            clinic = serializer.save()

            data = ClinicDetailSerializer(clinic).data

            return CustomResponse(
                data=data,
                status=status.HTTP_201_CREATED
            )

        else:

            error_message = str(serializer.errors)

            return CustomResponse(
                success=False,
                message=error_message,
                status=status.HTTP_400_BAD_REQUEST
            )


class ClinicDetailView(APIView):

    permission_classes = (IsSuperAdmin, )
    serializer_class = ClinicDetailSerializer

    def get_object(self):

        try:

            id = self.kwargs['id']

            return Clinic.objects.get(id=id)

        except Clinic.DoesNotExist:

            raise NotFound('Clinic not found')

    @extend_schema(tags=['clinics'])
    def get(self, request, id):

        clinic = self.get_object()

        serializer = self.serializer_class(clinic)

        return CustomResponse(data=serializer.data)

    @extend_schema(tags=['clinics'])
    def patch(self, request, id):

        clinic = self.get_object()

        serializer = self.serializer_class(
            clinic,
            request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return CustomResponse(data=serializer.data)

        else:

            error_message = str(serializer.errors)

            return CustomResponse(
                success=False,
                message=error_message,
                status=status.HTTP_400_BAD_REQUEST
            )
