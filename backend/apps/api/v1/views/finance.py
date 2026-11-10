import csv
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
from apps.inpatient.models import Admission
from apps.patients.choices import PatientVisitStatus
from apps.patients.models import PatientVisit
from apps.services.models import Service, ServiceCategory
from apps.shared.choices import (
    AdmissionStatus,
    ExpenseStatus,
    FinanceCategoryColor,
    FinanceTransactionType,
    PaymentMethod,
    StockMovementType
)
from apps.shared.pagination import CustomPagination
from apps.shared.permissions import IsSuperAdmin
from apps.shared.response import CustomResponse
from apps.shared.utils import get_current_month_data
from apps.users.models import CustomUser
from apps.warehouse.models import StockMovement


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
    OpenApiParameter(name='payment_method', description='cash | card', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='source', description='visit | inpatient | manual | warehouse', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    OpenApiParameter(name='search', description='Search', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
]

SOURCE_LABELS = {
    'visit': 'Qabullar',
    'inpatient': 'Statsionar',
    'manual': "Qo'lda kiritilgan",
    'warehouse': 'Ombor xaridlari',
}

METHOD_LABELS = {
    'cash': 'Naqd',
    'card': 'Karta',
    'unknown': 'Belgilanmagan',
}

# Kunlik grafik shundan uzun davrda oylik ko'rinishga o'tadi
DAILY_SERIES_MAX_DAYS = 62


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


def _normalize_method(value):

    # Klinikada ikki tur: naqd va karta. Eski Click/Payme va o'tkazma karta (naqdsiz) hisoblanadi
    if not value:

        return 'unknown'

    return 'cash' if value == PaymentMethod.CASH else 'card'


def _start_of_day(value):

    return timezone.make_aware(datetime.combine(value, datetime.min.time()))


def _visit_reference(visit_id) -> str:

    return f"AV-{str(visit_id).split('-')[0][:5].upper()}"


def _fio(patient) -> str:

    return ' '.join(
        part for part in [patient.last_name, patient.first_name, patient.middle_name] if part
    )


def _row(**kwargs) -> dict:

    method = _normalize_method(kwargs.pop('raw_method'))

    return {
        'reference': None,
        'subtitle': None,
        'doctor': None,
        'created_by': None,
        'category_id': None,
        **kwargs,
        'source_display': SOURCE_LABELS[kwargs['source']],
        'payment_method': method,
        'payment_method_display': METHOD_LABELS[method],
    }


def _collect_rows(clinic, date_from, date_to) -> list:

    rows = []

    # Qabullar: to'lov qabul qilingan paytda kirim bo'ladi
    visits = PatientVisit.objects \
        .filter(patient__clinic=clinic, payment_method__isnull=False) \
        .exclude(status=PatientVisitStatus.CANCELLED) \
        .filter(
            Q(paid_at__date__range=(date_from, date_to)) |
            Q(paid_at__isnull=True, created_at__date__range=(date_from, date_to))
        ) \
        .select_related('patient', 'doctor', 'cashier') \
        .prefetch_related('services')

    for visit in visits:

        rows.append(_row(
            id=str(visit.id),
            source='visit',
            type=FinanceTransactionType.KIRIM,
            date=visit.paid_at or visit.created_at,
            reference=_visit_reference(visit.id),
            title=_fio(visit.patient),
            subtitle=', '.join(service.name for service in visit.services.all()) or 'Qabul',
            category="Qabul to'lovlari",
            doctor=getattr(visit.doctor, 'fio', None),
            created_by=getattr(visit.cashier, 'fio', None),
            amount=visit.total_price,
            raw_method=visit.payment_method
        ))

    # Statsionar: chiqarishda yopilgan hisob
    admissions = Admission.objects \
        .filter(
            clinic=clinic,
            status=AdmissionStatus.DISCHARGED,
            payment_method__isnull=False,
            discharged_at__date__range=(date_from, date_to)
        ) \
        .select_related('patient', 'bed__room', 'doctor', 'created_by')

    for admission in admissions:

        rows.append(_row(
            id=str(admission.id),
            source='inpatient',
            type=FinanceTransactionType.KIRIM,
            date=admission.discharged_at,
            title=_fio(admission.patient),
            subtitle=f'{admission.bed.room.name} xona, {admission.days} kun',
            category='Statsionar',
            doctor=getattr(admission.doctor, 'fio', None),
            created_by=getattr(admission.created_by, 'fio', None),
            amount=admission.paid_amount or 0,
            raw_method=admission.payment_method
        ))

    # Qo'lda kiritilgan kirim va chiqimlar
    entries = Expense.objects \
        .filter(clinic=clinic, date__range=(date_from, date_to)) \
        .exclude(status=ExpenseStatus.CANCELLED) \
        .select_related('category', 'created_by')

    for entry in entries:

        rows.append(_row(
            id=str(entry.id),
            source='manual',
            type=entry.category.type,
            date=_start_of_day(entry.date),
            title=entry.title,
            subtitle="Qo'lda kiritilgan",
            category=entry.category.name,
            category_id=str(entry.category_id),
            created_by=getattr(entry.created_by, 'fio', None),
            amount=entry.amount,
            raw_method=entry.payment_method
        ))

    # Ombor: narxi kiritilgan kirim xarid (chiqim) hisoblanadi
    purchases = StockMovement.objects \
        .filter(
            clinic=clinic,
            type=StockMovementType.IN,
            unit_price__gt=0,
            date__range=(date_from, date_to)
        ) \
        .select_related('item', 'created_by')

    for movement in purchases:

        rows.append(_row(
            id=str(movement.id),
            source='warehouse',
            type=FinanceTransactionType.CHIQIM,
            date=_start_of_day(movement.date),
            title=movement.item.name,
            subtitle=movement.supplier or 'Ombor xaridi',
            category='Ombor xaridlari',
            created_by=getattr(movement.created_by, 'fio', None),
            amount=int(movement.change * movement.unit_price),
            raw_method=movement.payment_method
        ))

    rows.sort(key=lambda row: row['date'], reverse=True)

    return rows


def _filter_rows(rows, params) -> list:

    type_param = params.get('type')
    method = params.get('payment_method')
    source = params.get('source')
    search_terms = (params.get('search') or '').lower().split()

    def matches(row):

        if type_param and row['type'] != type_param:

            return False

        if method and row['payment_method'] != method:

            return False

        if source and row['source'] != source:

            return False

        if search_terms:

            haystack = ' '.join(
                str(row.get(key) or '')
                for key in ('title', 'subtitle', 'category', 'reference', 'doctor', 'created_by')
            ).lower()

            return all(term in haystack for term in search_terms)

        return True

    return [row for row in rows if matches(row)]


def _totals(rows, type_value) -> dict:

    totals = {'total': 0, 'cash': 0, 'card': 0, 'unknown': 0, 'count': 0}

    for row in rows:

        if row['type'] != type_value:

            continue

        totals['total'] += row['amount']
        totals[row['payment_method']] += row['amount']
        totals['count'] += 1

    return totals


def _series(rows, date_from, date_to) -> list:

    monthly = (date_to - date_from).days + 1 > DAILY_SERIES_MAX_DAYS

    def key_of(value):

        return value.strftime('%Y-%m') if monthly else value.isoformat()

    buckets = {}
    current = date_from

    while current <= date_to:

        buckets.setdefault(key_of(current), {'income': 0, 'expense': 0})
        current += timedelta(days=1)

    for row in rows:

        key = key_of(timezone.localtime(row['date']).date())

        if key in buckets:

            field = 'income' if row['type'] == FinanceTransactionType.KIRIM else 'expense'
            buckets[key][field] += row['amount']

    return [
        {'period': key, 'income': value['income'], 'expense': value['expense']}
        for key, value in buckets.items()
    ]


def _public_row(row) -> dict:

    return {key: value for key, value in row.items() if key != 'category_id'}


class FinanceSummaryView(APIView):

    permission_classes = (IsSuperAdmin, )

    @extend_schema(tags=['finance'], parameters=FINANCE_FILTER_PARAMETERS[:3])
    def get(self, request):

        clinic = _get_clinic(request)

        date_from, date_to = _get_date_range(request)

        rows = _collect_rows(clinic, date_from, date_to)

        income = _totals(rows, FinanceTransactionType.KIRIM)
        expense = _totals(rows, FinanceTransactionType.CHIQIM)

        by_source = {}

        for row in rows:

            key = (row['source'], row['type'])
            bucket = by_source.setdefault(key, {
                'source': row['source'],
                'label': row['source_display'],
                'type': row['type'],
                'amount': 0,
                'count': 0
            })
            bucket['amount'] += row['amount']
            bucket['count'] += 1

        expense_by_category = {}

        for row in rows:

            if row['type'] == FinanceTransactionType.CHIQIM:

                expense_by_category[row['category']] = expense_by_category.get(row['category'], 0) + row['amount']

        unpaid_qs = PatientVisit.objects \
            .filter(
                patient__clinic=clinic,
                payment_method__isnull=True,
                created_at__date__range=(date_from, date_to)
            ) \
            .exclude(status=PatientVisitStatus.CANCELLED) \
            .select_related('patient', 'doctor') \
            .order_by('-created_at')

        unpaid_total = unpaid_qs.aggregate(total=Sum('total_price'), count=Count('id'))

        return CustomResponse(data={
            'date_from': date_from,
            'date_to': date_to,
            'income': income,
            'expense': expense,
            'balance': income['total'] - expense['total'],
            # Davr ichidagi naqd va karta oqimi: kirim minus chiqim
            'cash_balance': income['cash'] - expense['cash'],
            'card_balance': income['card'] - expense['card'],
            'by_source': sorted(by_source.values(), key=lambda item: -item['amount']),
            'expense_by_category': sorted(
                [{'category': name, 'amount': amount} for name, amount in expense_by_category.items()],
                key=lambda item: -item['amount']
            ),
            'series': _series(rows, date_from, date_to),
            'series_unit': 'month' if (date_to - date_from).days + 1 > DAILY_SERIES_MAX_DAYS else 'day',
            'unpaid': {
                'count': unpaid_total['count'] or 0,
                'amount': unpaid_total['total'] or 0,
                'items': [
                    {
                        'id': str(visit.id),
                        'patient_id': str(visit.patient_id),
                        'patient': _fio(visit.patient),
                        'doctor': getattr(visit.doctor, 'fio', None),
                        'date': visit.created_at,
                        'amount': visit.total_price
                    }
                    for visit in unpaid_qs[:20]
                ]
            }
        })


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

        date_from, date_to = _get_date_range(request)

        rows = _filter_rows(_collect_rows(clinic, date_from, date_to), request.query_params)

        try:

            page = max(int(request.query_params.get('page', 1)), 1)

        except (TypeError, ValueError):

            page = 1

        try:

            per_page = min(max(int(request.query_params.get('per_page', 15)), 1), 100)

        except (TypeError, ValueError):

            per_page = 15

        income = _totals(rows, FinanceTransactionType.KIRIM)
        expense = _totals(rows, FinanceTransactionType.CHIQIM)

        start = (page - 1) * per_page

        return CustomResponse(data={
            'results': [_public_row(row) for row in rows[start:start + per_page]],
            'meta': {
                'total_items': len(rows),
                'total_pages': max((len(rows) + per_page - 1) // per_page, 1),
                'current_page': page,
                'income_amount': income['total'],
                'expense_amount': expense['total'],
                'balance': income['total'] - expense['total']
            }
        })


class FinanceExportView(APIView):

    permission_classes = (IsSuperAdmin, )

    @extend_schema(tags=['finance'], parameters=FINANCE_FILTER_PARAMETERS)
    def get(self, request):

        clinic = _get_clinic(request)

        date_from, date_to = _get_date_range(request)

        rows = _filter_rows(_collect_rows(clinic, date_from, date_to), request.query_params)

        response = HttpResponse(content_type='text/csv; charset=utf-8')

        filename = f"moliya_{date_from.isoformat()}_{date_to.isoformat()}.csv"

        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        response.write('\ufeff')

        writer = csv.writer(response, delimiter=';')

        writer.writerow([
            'Sana', 'Turi', 'Manba', 'Nomi', 'Tafsilot', 'Kategoriya',
            "To'lov turi", 'Summa', 'Xodim'
        ])

        for row in rows:

            writer.writerow([
                timezone.localtime(row['date']).strftime('%d.%m.%Y %H:%M'),
                'Kirim' if row['type'] == FinanceTransactionType.KIRIM else 'Chiqim',
                row['source_display'],
                row['title'],
                row['subtitle'] or '',
                row['category'] or '',
                row['payment_method_display'],
                row['amount'],
                row['created_by'] or '',
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

        rows = _collect_rows(clinic, date_from, date_to)

        system_income = [row for row in rows if row['source'] in ('visit', 'inpatient')]

        manual_totals = {}

        for row in rows:

            if row['category_id']:

                totals = manual_totals.setdefault(row['category_id'], {'total': 0, 'count': 0})
                totals['total'] += row['amount']
                totals['count'] += 1

        data = []

        for category in categories:

            if category.is_system:

                amount = sum(row['amount'] for row in system_income)
                count = len(system_income)

            else:

                totals = manual_totals.get(str(category.id), {'total': 0, 'count': 0})
                amount = totals['total']
                count = totals['count']

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
