import csv
import uuid
from datetime import datetime, timedelta

from django.db.models import Sum, Q
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
    ExpenseUpdateSerializer
)
from apps.finance.models import Expense
from apps.patients.models import PatientVisit
from apps.shared.choices import PaymentMethod
from apps.shared.pagination import CustomPagination
from apps.shared.permissions import IsRegistratorOrAdmin
from apps.shared.response import CustomResponse
from apps.shared.utils import get_current_month_data


FINANCE_FILTER_PARAMETERS = [
    OpenApiParameter(name='date_from', description='YYYY-MM-DD', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='date_to', description='YYYY-MM-DD', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='type', description='kirim | chiqim', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='doctor', description='Comma separated doctor ids', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='service', description='Comma separated service ids', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='payment_method', description='Comma separated payment methods', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='category', description='Expense category code or service-category id', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
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


def _get_finance_querysets(user, request):

    date_from, date_to = _get_date_range(request)

    params = request.query_params

    income_qs = PatientVisit.objects \
        .filter(
            patient__clinic=user.clinic,
            created_at__date__range=(date_from, date_to)
        ) \
        .select_related('patient', 'doctor', 'cashier') \
        .prefetch_related('services')

    expense_qs = Expense.objects \
        .filter(
            clinic=user.clinic,
            date__range=(date_from, date_to)
        ) \
        .select_related('created_by')

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

        expense_qs = expense_qs.filter(category=category)

        try:

            category_uuid = uuid.UUID(str(category))
            income_qs = income_qs.filter(services__category_id=category_uuid)

        except (ValueError, TypeError):

            income_qs = income_qs.none()

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
        'category': expense.get_category_display(),
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

    permission_classes = (IsRegistratorOrAdmin, )

    @extend_schema(tags=['finance'], parameters=FINANCE_FILTER_PARAMETERS)
    def get(self, request):

        user = request.user

        income_qs, expense_qs, date_from, date_to = _get_finance_querysets(user, request)

        total_income = income_qs.aggregate(total=Sum('total_price'))['total'] or 0

        total_expense = expense_qs.aggregate(total=Sum('amount'))['total'] or 0

        period_length = (date_to - date_from).days + 1

        prev_date_to = date_from - timedelta(days=1)

        prev_date_from = prev_date_to - timedelta(days=period_length - 1)

        prev_income_qs = PatientVisit.objects.filter(
            patient__clinic=user.clinic,
            created_at__date__range=(prev_date_from, prev_date_to)
        )

        prev_expense_qs = Expense.objects.filter(
            clinic=user.clinic,
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

    permission_classes = (IsRegistratorOrAdmin, )

    @extend_schema(
        tags=['finance'],
        parameters=FINANCE_FILTER_PARAMETERS + [
            OpenApiParameter(name='page', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT),
            OpenApiParameter(name='per_page', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT),
        ]
    )
    def get(self, request):

        user = request.user

        income_qs, expense_qs, date_from, date_to = _get_finance_querysets(user, request)

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

    permission_classes = (IsRegistratorOrAdmin, )

    @extend_schema(tags=['finance'], parameters=FINANCE_FILTER_PARAMETERS)
    def get(self, request):

        user = request.user

        income_qs, expense_qs, date_from, date_to = _get_finance_querysets(user, request)

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


class ExpenseCreateView(APIView):

    permission_classes = (IsRegistratorOrAdmin, )
    serializer_class = ExpenseCreateSerializer
    pagination_class = CustomPagination

    @extend_schema(tags=['finance'], request=ExpenseCreateSerializer, responses={status.HTTP_201_CREATED: ExpenseSerializer})
    def post(self, request):

        serializer = self.serializer_class(
            data=request.data,
            context={'request': request}
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

    permission_classes = (IsRegistratorOrAdmin, )
    serializer_class = ExpenseSerializer

    def get_object(self):

        try:

            return Expense.objects.get(
                id=self.kwargs['id'],
                clinic=self.request.user.clinic
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
