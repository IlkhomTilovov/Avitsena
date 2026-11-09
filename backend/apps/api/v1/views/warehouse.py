from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import DecimalField, ExpressionWrapper, F, Q, Sum
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import SAFE_METHODS
from rest_framework.views import APIView

from apps.api.v1.serializers import (
    WarehouseItemSerializer,
    WarehouseItemWriteSerializer,
    StockMovementSerializer,
    StockMovementCreateSerializer
)
from apps.api.v1.views.inpatient import _first_error, _error_response
from apps.shared.choices import StockMovementType, UserRole
from apps.shared.pagination import CustomPagination
from apps.shared.permissions import IsAdmin, IsRegistratorOrAdmin
from apps.shared.response import CustomResponse
from apps.shared.utils import get_current_month_data
from apps.warehouse.models import WarehouseItem, StockMovement

EXPIRY_WARNING_DAYS = 30


def _parse_date(value):

    try:

        return datetime.strptime(value, '%Y-%m-%d').date()

    except (TypeError, ValueError):

        return None


class ItemAdminWriteMixin:

    # Mahsulotni ko'rish admin va registratorga, yaratish va tahrirlash faqat adminga
    def get_permissions(self):

        if self.request.method in SAFE_METHODS:

            return [IsRegistratorOrAdmin()]

        return [IsAdmin()]


class WarehouseSummaryView(APIView):

    permission_classes = (IsRegistratorOrAdmin, )

    @extend_schema(tags=['warehouse'])
    def get(self, request):

        clinic = request.user.clinic

        items = WarehouseItem.objects.filter(clinic=clinic, is_active=True)

        stock_value = items.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F('quantity') * F('last_price'),
                    output_field=DecimalField(max_digits=20, decimal_places=2)
                )
            )
        )['total'] or 0

        month_start, month_end = get_current_month_data()

        month_in = StockMovement.objects \
            .filter(clinic=clinic, type=StockMovementType.IN, date__range=(month_start, month_end)) \
            .aggregate(
                total=Sum(
                    ExpressionWrapper(
                        F('change') * F('unit_price'),
                        output_field=DecimalField(max_digits=20, decimal_places=2)
                    )
                )
            )['total'] or 0

        today = timezone.localdate()

        # Partiyalar alohida hisoblanmaydi: qoldig'i bor mahsulotning yaqin muddatli kirimlari ko'rsatiladi
        expiring = StockMovement.objects \
            .filter(
                clinic=clinic,
                type=StockMovementType.IN,
                expiry_date__isnull=False,
                expiry_date__lte=today + timedelta(days=EXPIRY_WARNING_DAYS),
                item__is_active=True,
                item__quantity__gt=0
            ) \
            .select_related('item', 'created_by') \
            .order_by('expiry_date')[:50]

        return CustomResponse(data={
            'items_count': items.count(),
            'out_of_stock_count': items.filter(quantity__lte=0).count(),
            'low_stock_count': items.filter(quantity__gt=0, quantity__lte=F('min_quantity')).count(),
            'stock_value': int(stock_value),
            'month_in_value': int(month_in),
            'expiry_warning_days': EXPIRY_WARNING_DAYS,
            'expiring': StockMovementSerializer(expiring, many=True).data
        })


class WarehouseItemListCreateView(ItemAdminWriteMixin, APIView):

    pagination_class = CustomPagination

    def get_queryset(self):

        query_params = self.request.query_params

        queryset = WarehouseItem.objects.filter(clinic=self.request.user.clinic)

        if query_params.get('include_inactive') != 'true':

            queryset = queryset.filter(is_active=True)

        category = query_params.get('category')

        if category:

            queryset = queryset.filter(category=category)

        stock = query_params.get('stock')

        if stock == 'out':

            queryset = queryset.filter(quantity__lte=0)

        elif stock == 'low':

            queryset = queryset.filter(quantity__gt=0, quantity__lte=F('min_quantity'))

        search = query_params.get('search')

        if search:

            query = Q()

            for search_term in search.split():

                query &= Q(name__icontains=search_term)

            queryset = queryset.filter(query)

        return queryset

    @extend_schema(
        tags=['warehouse'],
        parameters=[
            OpenApiParameter(name='search', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='category', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='stock', description='low | out', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='include_inactive', location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL),
            OpenApiParameter(name='page', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT),
            OpenApiParameter(name='per_page', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT)
        ],
        responses={status.HTTP_200_OK: WarehouseItemSerializer(many=True)}
    )
    def get(self, request):

        paginator = self.pagination_class()

        page = paginator.paginate_queryset(self.get_queryset(), request)

        return paginator.get_paginated_response(
            WarehouseItemSerializer(page, many=True).data
        )

    @extend_schema(tags=['warehouse'], request=WarehouseItemWriteSerializer, responses={status.HTTP_201_CREATED: WarehouseItemSerializer})
    def post(self, request):

        serializer = WarehouseItemWriteSerializer(
            data=request.data,
            context={'clinic': request.user.clinic}
        )

        if not serializer.is_valid():

            return _error_response(_first_error(serializer.errors))

        item = serializer.save(clinic=request.user.clinic)

        return CustomResponse(
            data=WarehouseItemSerializer(item).data,
            status=status.HTTP_201_CREATED
        )


class WarehouseItemDetailView(ItemAdminWriteMixin, APIView):

    def get_object(self):

        try:

            return WarehouseItem.objects.get(id=self.kwargs['id'], clinic=self.request.user.clinic)

        except WarehouseItem.DoesNotExist:

            raise NotFound('Item not found')

    @extend_schema(tags=['warehouse'], responses={status.HTTP_200_OK: WarehouseItemSerializer})
    def get(self, request, id):

        item = self.get_object()

        movements = item.movements.select_related('created_by').order_by('-date', '-created_at')[:50]

        return CustomResponse(data={
            **WarehouseItemSerializer(item).data,
            'movements': StockMovementSerializer(movements, many=True).data
        })

    @extend_schema(tags=['warehouse'], request=WarehouseItemWriteSerializer, responses={status.HTTP_200_OK: WarehouseItemSerializer})
    def patch(self, request, id):

        item = self.get_object()

        serializer = WarehouseItemWriteSerializer(
            item,
            data=request.data,
            partial=True,
            context={'clinic': request.user.clinic}
        )

        if not serializer.is_valid():

            return _error_response(_first_error(serializer.errors))

        item = serializer.save()

        return CustomResponse(data=WarehouseItemSerializer(item).data)

    @extend_schema(tags=['warehouse'])
    def delete(self, request, id):

        item = self.get_object()

        if item.movements.exists():

            return _error_response("Mahsulotning harakatlar tarixi bor, uni o'chirib bo'lmaydi. Uni nofaol qiling.")

        item.delete()

        return CustomResponse(message='Item deleted')


class StockMovementListCreateView(APIView):

    permission_classes = (IsRegistratorOrAdmin, )
    pagination_class = CustomPagination

    def get_queryset(self):

        query_params = self.request.query_params

        queryset = StockMovement.objects \
            .filter(clinic=self.request.user.clinic) \
            .select_related('item', 'created_by')

        item_id = query_params.get('item')

        if item_id:

            queryset = queryset.filter(item_id=item_id)

        movement_type = query_params.get('type')

        if movement_type:

            queryset = queryset.filter(type=movement_type)

        date_from = _parse_date(query_params.get('date_from'))

        if date_from:

            queryset = queryset.filter(date__gte=date_from)

        date_to = _parse_date(query_params.get('date_to'))

        if date_to:

            queryset = queryset.filter(date__lte=date_to)

        search = query_params.get('search')

        if search:

            queryset = queryset.filter(
                Q(item__name__icontains=search) |
                Q(supplier__icontains=search) |
                Q(note__icontains=search)
            )

        return queryset

    @extend_schema(
        tags=['warehouse'],
        parameters=[
            OpenApiParameter(name='item', location=OpenApiParameter.QUERY, type=OpenApiTypes.UUID),
            OpenApiParameter(name='type', description='in | out | write_off | adjust', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='date_from', description='YYYY-MM-DD', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='date_to', description='YYYY-MM-DD', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='search', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='page', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT),
            OpenApiParameter(name='per_page', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT)
        ],
        responses={status.HTTP_200_OK: StockMovementSerializer(many=True)}
    )
    def get(self, request):

        paginator = self.pagination_class()

        page = paginator.paginate_queryset(self.get_queryset(), request)

        return paginator.get_paginated_response(
            StockMovementSerializer(page, many=True).data
        )

    @extend_schema(tags=['warehouse'], request=StockMovementCreateSerializer, responses={status.HTTP_201_CREATED: StockMovementSerializer})
    def post(self, request):

        serializer = StockMovementCreateSerializer(
            data=request.data,
            context={'clinic': request.user.clinic}
        )

        if not serializer.is_valid():

            return _error_response(_first_error(serializer.errors))

        data = serializer.validated_data
        movement_type = data['type']

        if movement_type == StockMovementType.ADJUST and request.user.role != UserRole.ADMIN:

            return _error_response('Inventarizatsiyani faqat admin qila oladi.')

        with transaction.atomic():

            # Bir vaqtda ikki chiqim qoldiqni manfiyga tushirmasligi uchun qatorni qulflaymiz
            item = WarehouseItem.objects.select_for_update().get(id=data['item'].id)

            quantity = data['quantity']

            if movement_type == StockMovementType.IN:

                change = quantity

            elif movement_type == StockMovementType.ADJUST:

                change = quantity - item.quantity

            else:

                change = -quantity

                if quantity > item.quantity:

                    return _error_response(
                        f"Omborda yetarli emas: {item.name} qoldig'i {item.quantity.normalize():f} {item.unit}."
                    )

            if movement_type == StockMovementType.ADJUST and change == 0:

                return _error_response("Sanalgan qoldiq hozirgi qoldiq bilan bir xil, o'zgarish yo'q.")

            item.quantity += change

            unit_price = data.get('unit_price')

            if movement_type == StockMovementType.IN and unit_price:

                item.last_price = unit_price

            item.save(update_fields=['quantity', 'last_price', 'updated_at'])

            movement = StockMovement.objects.create(
                clinic=request.user.clinic,
                item=item,
                type=movement_type,
                change=change,
                balance_after=item.quantity,
                unit_price=unit_price if movement_type == StockMovementType.IN else None,
                supplier=(data.get('supplier') or '').strip() or None,
                expiry_date=data.get('expiry_date') if movement_type == StockMovementType.IN else None,
                note=(data.get('note') or '').strip() or None,
                date=data.get('date') or timezone.localdate(),
                created_by=request.user
            )

        return CustomResponse(
            data=StockMovementSerializer(movement).data,
            status=status.HTTP_201_CREATED
        )
