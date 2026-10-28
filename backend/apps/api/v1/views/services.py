from rest_framework.views import APIView
from apps.shared.pagination import CustomPagination
from apps.shared.response import CustomResponse
from apps.api.v1.serializers import (
    ServiceCategoryListCreateSerializer,
    ServiceDetailSerializer,
    ServiceCategoryDetailSerializer,
    ServiceCreateSerializer
)
from apps.services.models import (
    ServiceCategory,
    Service
)
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    inline_serializer
)
from drf_spectacular.types import OpenApiTypes
from rest_framework import status, serializers
from django.db.models import Prefetch, Count, Avg
from apps.shared.permissions import IsRegistratorOrAdmin
from rest_framework.exceptions import NotFound
from collections import defaultdict


class ServiceCategoryListCreateView(APIView):
    permission_classes = (IsRegistratorOrAdmin, )
    serializer_class = ServiceCategoryListCreateSerializer
    pagination_class = CustomPagination

    def get_queryset(self):

        return ServiceCategory.objects \
            .filter(clinic=self.request.user.clinic) \
            .prefetch_related(
                Prefetch(
                    'services',
                    queryset=Service.objects.filter(is_active=True)
                )
            ) \
            .order_by('name')

    @extend_schema(
        tags=['doctor-services'],
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
            )
        ]
    )
    def get(self, request):

        queryset = self.get_queryset()

        paginator = self.pagination_class()

        paginated_queryset = paginator.paginate_queryset(
            queryset,
            request
        )

        serializer = self.serializer_class(
            paginated_queryset,
            many=True
        )

        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=['doctor-services'])
    def post(self, request):

        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():

            serializer.save(clinic=request.user.clinic)

            return CustomResponse(
                data=serializer.data,
                status=status.HTTP_201_CREATED
            )
        
        else:

            error_message = str(serializer.errors)

            return CustomResponse(
                success=False,
                message=error_message,
                status=status.HTTP_400_BAD_REQUEST
            )


class ServiceListCreateView(APIView):
    permission_classes = (IsRegistratorOrAdmin, )
    pagination_class = CustomPagination

    @extend_schema(
        tags=['doctor-services'],
        request=ServiceCreateSerializer,
        responses={
            status.HTTP_200_OK: ServiceCategoryDetailSerializer
        }
    )
    def post(self, request):

        serializer = ServiceCreateSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():

            category = serializer.validated_data['category']

            services_data = serializer.validated_data['services']

            create_to_services = [
                Service(
                    category=category,
                    clinic=request.user.clinic,
                    **service_data
                )
                for service_data in services_data
            ]

            created_services = Service.objects.bulk_create(create_to_services)

            data = defaultdict(lambda: {
                "id": None,
                "name": None,
                "services": []
            })

            for created_service in created_services:

                category_id = str(category.id)

                data[category_id]["id"] = category.id
                data[category_id]["name"] = category.name
                data[category_id]["services"].append({
                    "id": created_service.id,
                    "name": created_service.name,
                    "price": created_service.price
                })
            
            data = data.get(str(category.id))

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


class ServiceStatsView(APIView):

    permission_classes = (IsRegistratorOrAdmin, )

    @extend_schema(
        tags=['doctor-services'],
        responses={
            status.HTTP_200_OK: inline_serializer(
                name='Service stats response',
                fields={
                    'total_categories': serializers.IntegerField(),
                    'total_services': serializers.IntegerField(),
                    'average_price': serializers.FloatField(),
                    'most_popular_service': serializers.CharField(allow_null=True),
                }
            )
        }
    )
    def get(self, request):

        clinic = request.user.clinic

        total_categories = ServiceCategory.objects.filter(clinic=clinic).count()

        services_qs = Service.objects.filter(clinic=clinic)

        total_services = services_qs.count()

        average_price = services_qs.aggregate(avg=Avg('price'))['avg'] or 0

        most_popular = services_qs \
            .annotate(visit_count=Count('patientvisit')) \
            .order_by('-visit_count') \
            .first()

        most_popular_name = (
            most_popular.name
            if most_popular and most_popular.visit_count > 0
            else None
        )

        return CustomResponse(data={
            'total_categories': total_categories,
            'total_services': total_services,
            'average_price': round(average_price, 2),
            'most_popular_service': most_popular_name
        })


class ServiceCategoryDetailView(APIView):

    permission_classes = (IsRegistratorOrAdmin, )
    serializer_class = ServiceCategoryDetailSerializer

    def get_queryset(self):

        return ServiceCategory.objects \
            .filter(clinic=self.request.user.clinic) \
            .prefetch_related(
                Prefetch(
                    'services',
                    queryset=Service.objects.order_by('name')
                )
            ) \
            .order_by('name')

    def get_object(self):

        try:

            id = self.kwargs['id']

            return self.get_queryset().get(id=id)
        
        except ServiceCategory.DoesNotExist:

            raise NotFound('Service category not found.')

    @extend_schema(tags=['doctor-services'])
    def get(self, request, id):

        service_category = self.get_object()

        serializer = self.serializer_class(service_category)

        return CustomResponse(data=serializer.data)
    
    @extend_schema(tags=['doctor-services'])
    def patch(self, request, id):

        service_category = self.get_object()

        serializer = self.serializer_class(
            service_category,
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
    
    @extend_schema(tags=['doctor-services'])
    def delete(self, request, id):

        service_category = self.get_object()

        service_category.delete()

        return CustomResponse(message='Service category deleted.')


class ServiceDetailView(APIView):
    permission_classes = (IsRegistratorOrAdmin, )
    serializer_class = ServiceDetailSerializer

    def get_object(self):

        try:

            service_id = self.kwargs['id']

            return Service.objects \
                .filter(clinic=self.request.user.clinic) \
                .get(id=service_id)

        except Service.DoesNotExist:

            raise NotFound('Service not found.')

    @extend_schema(tags=['doctor-services'])
    def get(self, request, id):

        service = self.get_object()

        serializer = self.serializer_class(service)

        return CustomResponse(data=serializer.data)
    
    @extend_schema(tags=['doctor-services'])
    def patch(self, request, id):

        service = self.get_object()

        serializer = self.serializer_class(
            service,
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
    
    @extend_schema(tags=['doctor-services'])
    def delete(self, request, id):

        service = self.get_object()

        service.delete()

        return CustomResponse(message='Service deleted.')
