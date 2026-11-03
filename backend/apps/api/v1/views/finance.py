import csv
import uuid
from datetime import datetime, timedelta

from django.core.exceptions import ValidationError
from django.db.models import Sum, Q, Count, Prefetch
from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView

from apps.api.v1.serializers import (
    ExpenseSerializer,
    ExpenseCreateSerializer,
    ExpenseUpdateSerializer,
    FinanceCategorySerializer,
    FinanceCategoryCreateSerializer,
    FinanceCategoryUpdateSerializer
)
from apps.clinics.models import Clinic
from apps.finance.models import Expense, FinanceCategory
from apps.patients.models import PatientVisit
from apps.services.models import Service, ServiceCategory
from apps.shared.choices import PaymentMethod, FinanceTransactionType, FinanceCategoryColor
from apps.shared.pagination import CustomPagination
from apps.shared.permissions import IsSuperAdmin
from apps.shared.response import CustomResponse
from apps.shared.utils import get_current_month_data
from apps.users.models import CustomUser


DEFAULT_KIRIM_CATEGORIES = [
    {'name': "Qabul to'lovlari", 'icon': 'calendar', 'color': FinanceCategoryColor.TEAL, 'is_system': True},
    {'name': 'Laboratoriya tahlillari', 'icon': 'flask', 'color': FinanceCategoryColor.CYAN},
    {'name': 'Dorixona savdosi', 'icon': 'shopping-bag', 'color': FinanceCategoryColor.BLUE},
    {'name': "Sug'urta to'lovlari", 'icon': 'shield', 'color': FinanceCategoryColor.PURPLE},
    {'name': "Investitsiya / qo'shimcha mablag'", 'icon': 'trending-up', 'color': FinanceCategoryColor.ORANGE},
    {'name': 'Boshqa kirim', 'icon': 'dots', 'color': FinanceCategoryColor.GRAY},
]

DEFAULT_CHIQIM_CATEGORIES = [
    {'name': 'Dori va materiallar', 'icon': 'pill', 'color': FinanceCategoryColor.TEAL},
    {'name': "Jihozlar ta'miri", 'icon': 'tool', 'color': FinanceCategoryColor.BLUE},
    {'name': 'Ijara', 'icon': 'home', 'color': FinanceCategoryColor.PURPLE},
    {'name': 'Ish haqi', 'icon': 'users', 'color': FinanceCategoryColor.ORANGE},
    {'name': 'Kommunal xizmatlar', 'icon': 'flash', 'color': FinanceCategoryColor.CYAN},
    {'name': 'Reklama', 'icon': 'package', 'color': FinanceCategoryColor.RED},
    {'name': 'Soliq va yig\'imlar', 'icon': 'shield', 'color': FinanceCategoryColor.GRAY},
    {'name': 'Boshqa', 'icon': 'dots', 'color': FinanceCategoryColor.GRAY},
]


def _get_clinic(request):

    try:

        return Clinic.objects.get(id=request.query_params.get('clinic'))

    except (Clinic.DoesNotExist, ValidationError):

        raise NotFound('Clinic not found')


def _ensure_default_categories(clinic):

    if FinanceCategory.objects.filter(clinic=clinic).exists():

        return

    categories = []

    for item in DEFAULT_KIRIM_CATEGORIES:

        categories.append(FinanceCategory(
            clinic=clinic,
            type=FinanceTransactionType.KIRIM,
            is_system=item.get('is_system', False),
            **{k: v for k, v in item.items() if k != 'is_system'}
        ))

    for item in DEFAULT_CHIQIM_CATEGORIES:

        categories.append(FinanceCategory(
            clinic=clinic,
            type=FinanceTransactionType.CHIQIM,
            **item
        ))

    FinanceCategory.objects.bulk_create(categories)


FINANCE_CLINIC_PARAMETER = OpenApiParameter(
    name='clinic',
    description='Clinic id',
    location=OpenApiParameter.QUERY,
    type=OpenApiTypes.UUID,
    required=True
)

FINANCE_FILTER_PARAMETERS = [
    FINANCE_CLINIC_PARAMETER,
    OpenApiParameter(name='date_from', description='YYYY-MM-DD', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='date_to', description='YYYY-MM-DD', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='type', description='kirim | chiqim', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='doctor', description='Comma separated doctor ids', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='service', description='Comma separated service ids', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='payment_method', description='Comma separated payment methods', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='category', description='Service-category id (income) or finance-category id (expense)', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='status', description='Transaction status', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='cashier', description='Comma separated cashier ids', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='search', description='Search', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
]


def _parse_date(value):

    try:

        return datetime.strptime(value, '%Y-%m-%d').date()

    except (TypeError, ValueError):

        return None


def _get_date_range(request):

    date_from = _parse_date(request.query_params.get('date_from'))

    date_to = _parse_date(request.query_params.get('date_to'))

    if not date_from or not date_to:

        date_from, date_to = get_current_month_data()

    return date_from, date_to


def _csv_list(request, key):

    value = request.query_params.get(key)

    if not value:

        return []

    return [item.strip() for item in value.split(',') if item.strip()]


def _get_finance_querysets(clinic, request):

    date_from, date_to = _get_date_range(request)

    params = request.query_params

    income_qs = PatientVisit.objects \
        .filter(
            patient__clinic=clinic,
            created_at__date__range=(date_from, date_to)
        ) \
        .select_related('patient', 'doctor', 'cashier') \
        .prefetch_related('services')

    expense_qs = Expense.objects \
        .filter(
            clinic=clinic,
            date__range=(date_from, date_to)
        ) \
        .select_related('created_by', 'category')

    doctor_ids = _csv_list(request, 'doctor')

    if doctor_ids:

        income_qs = income_qs.filter(doctor_id__in=doctor_ids)
        expense_qs = expense_qs.none()

    service_ids = _csv_list(request, 'service')

    if service_ids:

        income_qs = income_qs.filter(services__id__in=service_ids)
        expense_qs = expense_qs.none()

    payment_methods = _csv_list(request, 'payment_method')

    if payment_methods:

        income_qs = income_qs.filter(payment_method__in=payment_methods)
        expense_qs = expense_qs.filter(payment_method__in=payment_methods)

    status_param = params.get('status')

    if status_param:

        income_qs = income_qs.filter(status=status_param)
        expense_qs = expense_qs.filter(status=status_param)

    cashier_ids = _csv_list(request, 'cashier')

    if cashier_ids:

        income_qs = income_qs.filter(cashier_id__in=cashier_ids)
        expense_qs = expense_qs.filter(created_by_id__in=cashier_ids)

    category = params.get('category')

    if category:

        try:

            category_uuid = uuid.UUID(str(category))

        except (ValueError, TypeError):

            income_qs = income_qs.none()
            expense_qs = expense_qs.none()

        else:

            # category may be a service-category id (income side) or a
            # FinanceCategory id (expense side); each filter is a safe
            # no-op on the model it doesn't apply to.
            income_qs = income_qs.filter(services__category_id=category_uuid)
            expense_qs = expense_qs.filter(category_id=category_uuid)

    search = params.get('search')

    if search:

        income_qs = income_qs.filter(
            Q(patient__first_name__icontains=search) |
            Q(patient__last_name__icontains=search) |
            Q(patient__middle_name__icontains=search) |
            Q(queue__icontains=search)
        )

        expense_qs = expense_qs.filter(title__icontains=search)

    return income_qs.distinct(), expense_qs, date_from, date_to


def _visit_reference(visit_id) -> str:

    return f"AV-{str(visit_id).split('-')[0][:5].upper()}"


VISIT_STATUS_LABELS_UZ = {
    'pending': 'Kutilmoqda',
    'in_progress': 'Jarayonda',
    'completed': 'Bajarildi',
    'cancelled': 'Bekor qilindi',
}


def _visit_to_row(visit) -> dict:

    patient = visit.patient

    fio = ' '.join(
        part for part in [patient.last_name, patient.first_name, patient.middle_name] if part
    )

    services = list(visit.services.all())

    return {
        'id': str(visit.id),
        'type': 'kirim',
        'date': visit.created_at,
        'reference': _visit_reference(visit.id),
        'title': fio,
        'subtitle': "Qabul to'lovlari",
        'doctor': getattr(visit.doctor, 'fio', None),
        'category': ', '.join(service.name for service in services) or None,
        'payment_method': visit.payment_method,
        'payment_method_display': visit.get_payment_method_display() if visit.payment_method else None,
        'cashier': getattr(visit.cashier, 'fio', None),
        'amount': visit.total_price,
        'status': visit.status,
        'status_display': VISIT_STATUS_LABELS_UZ.get(visit.status, visit.get_status_display()),
    }


def _expense_to_row(expense) -> dict:

    return {
        'id': str(expense.id),
        'type': 'chiqim',
        'date': timezone.make_aware(datetime.combine(expense.date, datetime.min.time())),
        'reference': None,
        'title': expense.title,
        'subtitle': "Qo'lda kiritilgan chiqim",
        'doctor': None,
        'category': expense.category.name,
        'payment_method': expense.payment_method,
        'payment_method_display': expense.get_payment_method_display() if expense.payment_method else None,
        'cashier': getattr(expense.created_by, 'fio', None),
        'amount': expense.amount,
        'status': expense.status,
        'status_display': expense.get_status_display(),
    }


def _build_rows(income_qs, expense_qs, type_param):

    rows = []

    if type_param != 'chiqim':

        rows.extend(_visit_to_row(visit) for visit in income_qs.order_by('-created_at'))

    if type_param != 'kirim':

        rows.extend(_expense_to_row(expense) for expense in expense_qs.order_by('-date', '-created_at'))

    rows.sort(key=lambda row: row['date'], reverse=True)

    return rows


class FinanceSummaryView(APIView):

    permission_classes = (IsSuperAdmin, )

    @extend_schema(tags=['finance'], parameters=FINANCE_FILTER_PARAMETERS)
    def get(self, request):

        clinic = _get_clinic(request)

        income_qs, expense_qs, date_from, date_to = _get_finance_querysets(clinic, request)

        total_income = income_qs.aggregate(total=Sum('total_price'))['total'] or 0

        total_expense = expense_qs.aggregate(total=Sum('amount'))['total'] or 0

        period_length = (date_to - date_from).days + 1

        prev_date_to = date_from - timedelta(days=1)

        prev_date_from = prev_date_to - timedelta(days=period_length - 1)

        prev_income_qs = PatientVisit.objects.filter(
            patient__clinic=clinic,
            created_at__date__range=(prev_date_from, prev_date_to)
        )

        prev_expense_qs = Expense.objects.filter(
            clinic=clinic,
            date__range=(prev_date_from, prev_date_to)
        )

        prev_total_income = prev_income_qs.aggregate(total=Sum('total_price'))['total'] or 0

        prev_total_expense = prev_expense_qs.aggregate(total=Sum('amount'))['total'] or 0

        def change(curr, prev):

            if not prev:

                return {'percentage': None, 'amount': curr}

            return {'percentage': round((curr - prev) / prev * 100, 2), 'amount': None}

        payment_breakdown_qs = income_qs \
            .values('payment_method') \
            .annotate(total=Sum('total_price'))

        payment_breakdown = {
            item['payment_method'] or 'unknown': item['total'] or 0
            for item in payment_breakdown_qs
        }

        payment_breakdown_total = sum(payment_breakdown.values()) or 1

        payment_methods = [
            {
                'value': value,
                'label': label,
                'amount': payment_breakdown.get(value, 0),
                'percentage': round(payment_breakdown.get(value, 0) / payment_breakdown_total * 100, 1)
            }
            for value, label in PaymentMethod.choices
        ]

        data = {
            'date_from': date_from,
            'date_to': date_to,
            'total_income': total_income,
            'total_expense': total_expense,
            'balance': total_income - total_expense,
            'income_change': change(total_income, prev_total_income),
            'expense_change': change(total_expense, prev_total_expense),
            'income_count': income_qs.count(),
            'expense_count': expense_qs.count(),
            'payment_methods': payment_methods
        }

        return CustomResponse(data=data)


class FinanceTransactionsListView(APIView):

    permission_classes = (IsSuperAdmin, )

    @extend_schema(
        tags=['finance'],
        parameters=FINANCE_FILTER_PARAMETERS + [
            OpenApiParameter(name='page', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT),
            OpenApiParameter(name='per_page', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT),
        ]
    )
    def get(self, request):

        clinic = _get_clinic(request)

        income_qs, expense_qs, date_from, date_to = _get_finance_querysets(clinic, request)

        type_param = request.query_params.get('type')

        rows = _build_rows(income_qs, expense_qs, type_param)

        try:

            page = int(request.query_params.get('page', 1))

        except (TypeError, ValueError):

            page = 1

        try:

            per_page = min(int(request.query_params.get('per_page', 16)), 100)

        except (TypeError, ValueError):

            per_page = 16

        total_items = len(rows)

        total_pages = max((total_items + per_page - 1) // per_page, 1)

        start = (page - 1) * per_page

        end = start + per_page

        page_rows = rows[start:end]

        total_income_amount = income_qs.aggregate(total=Sum('total_price'))['total'] or 0

        total_expense_amount = expense_qs.aggregate(total=Sum('amount'))['total'] or 0

        return CustomResponse(data={
            'results': page_rows,
            'meta': {
                'total_pages': total_pages,
                'total_items': total_items,
                'current_page': page,
                'income_count': income_qs.count(),
                'expense_count': expense_qs.count(),
                'total_income_amount': total_income_amount,
                'total_expense_amount': total_expense_amount,
                'balance': total_income_amount - total_expense_amount
            }
        })


class FinanceExportView(APIView):

    permission_classes = (IsSuperAdmin, )

    @extend_schema(tags=['finance'], parameters=FINANCE_FILTER_PARAMETERS)
    def get(self, request):

        clinic = _get_clinic(request)

        income_qs, expense_qs, date_from, date_to = _get_finance_querysets(clinic, request)

        type_param = request.query_params.get('type')

        rows = _build_rows(income_qs, expense_qs, type_param)

        response = HttpResponse(content_type='text/csv; charset=utf-8')

        filename = f"moliya_{date_from.isoformat()}_{date_to.isoformat()}.csv"

        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        response.write('﻿')

        writer = csv.writer(response, delimiter=';')

        writer.writerow([
            'Sana', 'Turi', 'Bemor/Izoh', 'Shifokor',
            'Kategoriya/Xizmat', "To'lov usuli", 'Summa', 'Holat'
        ])

        for row in rows:

            writer.writerow([
                timezone.localtime(row['date']).strftime('%d.%m.%Y %H:%M'),
                'Kirim' if row['type'] == 'kirim' else 'Chiqim',
                row['title'],
                row['doctor'] or '',
                row['category'] or '',
                row['payment_method_display'] or '',
                row['amount'],
                row['status_display'],
            ])

        return response


class FinanceFilterOptionsView(APIView):

    permission_classes = (IsSuperAdmin, )

    @extend_schema(tags=['finance'], parameters=[FINANCE_CLINIC_PARAMETER])
    def get(self, request):

        clinic = _get_clinic(request)

        employees = CustomUser.objects \
            .filter(clinic=clinic) \
            .order_by('fio') \
            .values('id', 'fio', 'role')

        categories = ServiceCategory.objects \
            .filter(clinic=clinic) \
            .prefetch_related(
                Prefetch(
                    'services',
                    queryset=Service.objects.filter(is_active=True)
                )
            ) \
            .order_by('name')

        return CustomResponse(data={
            'employees': list(employees),
            'service_categories': [
                {
                    'id': category.id,
                    'name': category.name,
                    'services': [
                        {'id': service.id, 'name': service.name}
                        for service in category.services.all()
                    ]
                }
                for category in categories
            ]
        })


class FinanceCategoryListCreateView(APIView):

    permission_classes = (IsSuperAdmin, )
    serializer_class = FinanceCategorySerializer

    @extend_schema(
        tags=['finance'],
        parameters=[
            OpenApiParameter(name='type', description='kirim | chiqim', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='date_from', description='YYYY-MM-DD', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='date_to', description='YYYY-MM-DD', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='include_archived', location=OpenApiParameter.QUERY, type=OpenApiTypes.BOOL),
        ]
    )
    def get(self, request):

        clinic = _get_clinic(request)

        _ensure_default_categories(clinic)

        date_from, date_to = _get_date_range(request)

        type_param = request.query_params.get('type')

        include_archived = request.query_params.get('include_archived') == 'true'

        queryset = FinanceCategory.objects.filter(clinic=clinic)

        if not include_archived:

            queryset = queryset.filter(archived=False)

        if type_param:

            queryset = queryset.filter(type=type_param)

        categories = list(queryset)

        income_total = PatientVisit.objects \
            .filter(patient__clinic=clinic, created_at__date__range=(date_from, date_to)) \
            .aggregate(total=Sum('total_price'), count=Count('id'))

        expense_totals = {
            item['category_id']: item
            for item in Expense.objects
            .filter(clinic=clinic, date__range=(date_from, date_to))
            .values('category_id')
            .annotate(total=Sum('amount'), count=Count('id'))
        }

        data = []

        for category in categories:

            if category.is_system:

                amount = income_total['total'] or 0
                count = income_total['count'] or 0

            elif category.type == FinanceTransactionType.CHIQIM:

                totals = expense_totals.get(category.id)
                amount = totals['total'] if totals else 0
                count = totals['count'] if totals else 0

            else:

                amount = 0
                count = 0

            item = self.serializer_class(category).data
            item['amount'] = amount
            item['count'] = count
            data.append(item)

        return CustomResponse(data={
            'date_from': date_from,
            'date_to': date_to,
            'categories': data
        })

    @extend_schema(tags=['finance'], request=FinanceCategoryCreateSerializer, responses={status.HTTP_201_CREATED: FinanceCategorySerializer})
    def post(self, request):

        clinic = _get_clinic(request)

        _ensure_default_categories(clinic)

        serializer = FinanceCategoryCreateSerializer(
            data=request.data,
            context={'clinic': clinic}
        )

        if serializer.is_valid():

            category = serializer.save()

            return CustomResponse(
                message='Category created',
                data=self.serializer_class(category).data,
                status=status.HTTP_201_CREATED
            )

        return CustomResponse(
            success=False,
            message=str(serializer.errors),
            status=status.HTTP_400_BAD_REQUEST
        )


class FinanceCategoryDetailView(APIView):

    permission_classes = (IsSuperAdmin, )
    serializer_class = FinanceCategorySerializer

    def get_object(self):

        try:

            return FinanceCategory.objects.get(
                id=self.kwargs['id'],
                clinic=_get_clinic(self.request)
            )

        except FinanceCategory.DoesNotExist:

            raise NotFound('Category not found')

    @extend_schema(tags=['finance'], request=FinanceCategoryUpdateSerializer)
    def patch(self, request, id):

        category = self.get_object()

        serializer = FinanceCategoryUpdateSerializer(
            category,
            request.data,
            partial=True
        )

        if serializer.is_valid():

            category = serializer.save()

            return CustomResponse(data=self.serializer_class(category).data)

        return CustomResponse(
            success=False,
            message=str(serializer.errors),
            status=status.HTTP_400_BAD_REQUEST
        )


class ExpenseCreateView(APIView):

    permission_classes = (IsSuperAdmin, )
    serializer_class = ExpenseCreateSerializer
    pagination_class = CustomPagination

    @extend_schema(tags=['finance'], request=ExpenseCreateSerializer, responses={status.HTTP_201_CREATED: ExpenseSerializer})
    def post(self, request):

        serializer = self.serializer_class(
            data=request.data,
            context={'request': request, 'clinic': _get_clinic(request)}
        )

        if serializer.is_valid():

            expense = serializer.save()

            data = ExpenseSerializer(expense).data

            return CustomResponse(
                message='Expense created',
                data=data,
                status=status.HTTP_201_CREATED
            )

        return CustomResponse(
            success=False,
            message=str(serializer.errors),
            status=status.HTTP_400_BAD_REQUEST
        )


class ExpenseDetailView(APIView):

    permission_classes = (IsSuperAdmin, )
    serializer_class = ExpenseSerializer

    def get_object(self):

        try:

            return Expense.objects.get(
                id=self.kwargs['id'],
                clinic=_get_clinic(self.request)
            )

        except Expense.DoesNotExist:

            raise NotFound('Expense not found')

    @extend_schema(tags=['finance'])
    def get(self, request, id):

        expense = self.get_object()

        return CustomResponse(data=self.serializer_class(expense).data)

    @extend_schema(tags=['finance'], request=ExpenseUpdateSerializer)
    def patch(self, request, id):

        expense = self.get_object()

        serializer = ExpenseUpdateSerializer(
            expense,
            request.data,
            partial=True
        )

        if serializer.is_valid():

            expense = serializer.save()

            return CustomResponse(data=self.serializer_class(expense).data)

        return CustomResponse(
            success=False,
            message=str(serializer.errors),
            status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(tags=['finance'])
    def delete(self, request, id):

        expense = self.get_object()

        expense.delete()

        return CustomResponse(message='Expense deleted')
