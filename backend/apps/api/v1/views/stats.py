from rest_framework.views import APIView
from apps.users.models import CustomUser, Doctor
from apps.patients.models import Patient, PatientVisit
from apps.shared.choices import UserRole
from apps.shared.response import CustomResponse
from django.utils import timezone
from apps.patients.choices import PatientVisitStatus
from datetime import datetime, time, timedelta
from django.db.models import Count, Q, OuterRef, Exists, Sum, Subquery
from django.db.models.functions import ExtractMonth, TruncDate, Coalesce
from rest_framework import status, serializers
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from apps.shared.utils import get_last_month_data, get_current_month_data
from apps.shared.choices import FinanceTransactionType
from apps.api.v1.views.finance import _collect_rows


def _as_date(value):

    return value.date() if isinstance(value, datetime) else value


def _income_rows(clinic, date_from, date_to):

    # Daromad Moliya bilan bir xil hisoblanadi: qabul va statsionar to'lovlari hamda qo'lda kiritilgan kirim
    return [
        row for row in _collect_rows(clinic, _as_date(date_from), _as_date(date_to))
        if row['type'] == FinanceTransactionType.KIRIM
    ]


class ClinicStatsView(APIView):

    @extend_schema(tags=['stats'])
    def get(self, request):

        clinic = request.user.clinic

        now = timezone.now()

        start_of_prev_month, end_of_prev_month = get_last_month_data()

        start_of_month, end_of_month = get_current_month_data()

        start_of_day = datetime.combine(now.date(), time.min)

        end_of_day = datetime.combine(now.date(), time.max)

        returned_subquery = PatientVisit.objects \
            .filter(
                patient=OuterRef('id'),
                created_at__date__gt=OuterRef('created_at__date')
            )

        patients_stats = Patient.objects.filter(clinic=clinic).aggregate(
            total_patients=Count('id'),
            returned_patients=Count(
                'id',
                filter=Q(Exists(returned_subquery))
            ),
            patient_coun_of_curr_month=Count(
                'id',
                filter=Q(created_at__date__range=(start_of_month, end_of_month))
            ),
            patient_count_of_last_month=Count(
                'id',
                filter=Q(created_at__date__range=(start_of_prev_month, end_of_prev_month))
            ),
            patient_count_of_curr_month=Count(
                'id',
                filter=Q(created_at__date__range=(start_of_month, end_of_month))
            )
        )

        patient_count_of_curr_month = patients_stats.pop('patient_count_of_curr_month')
        patient_count_of_last_month = patients_stats.pop('patient_count_of_last_month')

        patients_stats['change_from_last_month'] = (
            {'percentage': None, 'amount': patient_count_of_curr_month}
            if patient_count_of_last_month == 0 else 

            {'percentage': round(
                (patient_count_of_curr_month - patient_count_of_last_month) / patient_count_of_last_month * 100, 2
            ), 'amount': None}
        )

        patients_stats['new_patients'] = patients_stats['total_patients'] - patients_stats['returned_patients']

        staff_stats = CustomUser.objects.filter(clinic=clinic).aggregate(
            total=Count('id'),
            admin_count=Count('id', filter=Q(role=UserRole.ADMIN)),
            registrator_count=Count('id', filter=Q(role=UserRole.REGISTRATOR)),
            doctor_count=Count('id', filter=Q(role=UserRole.DOCTOR))
        )

        visits_stats = PatientVisit.objects.filter(patient__clinic=clinic).aggregate(
            total_visits=Count('id'),
            today_visits=Count('id', 
                filter=Q(
                    created_at__range=(start_of_day, end_of_day)
                )
            ),
            pending_visits=Count('id', 
                filter=Q(
                    created_at__range=(start_of_day, end_of_day),
                    status=PatientVisitStatus.PENDING
                )
            )
        )

        revenue_of_curr_month = sum(row['amount'] for row in _income_rows(clinic, start_of_month, end_of_month))
        revenue_of_last_month = sum(row['amount'] for row in _income_rows(clinic, start_of_prev_month, end_of_prev_month))
        visits_stats['monthly_revenue'] = revenue_of_curr_month

        visits_stats['change_from_last_month'] = (
            {'percentage': None, 'amount': revenue_of_curr_month}
            if not revenue_of_last_month else 

            {'percentage': round((revenue_of_curr_month - revenue_of_last_month) / revenue_of_last_month * 100, 2), 'amount': None}
        )

        category_subquery = Doctor.objects \
            .filter(user=OuterRef('pk')) \
            .values('services__category__name')[:1]

        doctors_stats = CustomUser.objects \
            .filter(role=UserRole.DOCTOR, clinic=clinic) \
            .annotate(
                patient_count=Count(
                    'doctor_visits',
                    filter=Q(doctor_visits__created_at__range=(start_of_day, end_of_day))
                ),
                category_name=Subquery(category_subquery)
            ) \
            .values('id', 'fio', 'patient_count', 'category_name') \
            .order_by('-patient_count')[:10]
        
        doctors_stats = list(doctors_stats)

        data = {
            'staff_stats': staff_stats,
            'doctors_stats': doctors_stats,
            'patients_stats': patients_stats,
            'visits_stats': visits_stats
        }

        return CustomResponse(data=data)


class PatientsStatsOfYearlyANDMonthlyView(APIView):

    @extend_schema(
        tags=['stats'],
        parameters=[
            OpenApiParameter(
                name='type',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR,
                default='monthly'
            )
        ],
        responses={
            status.HTTP_200_OK: inline_serializer(
                name='Patients stats success response',
                fields={
                    'success': serializers.BooleanField(),
                    'data1': serializers.ListField(
                        child=inline_serializer(
                            name='Patient stats yearly',
                            fields={
                                'month': serializers.IntegerField(default=1),
                                'patient_count': serializers.IntegerField(default=10),
                            }
                        )
                    ),
                    'data2': serializers.ListField(
                        child=inline_serializer(
                            name='Patient stats monthly',
                            fields={
                                'date': serializers.DateField(),
                                'patient_count': serializers.IntegerField(default=10),
                            }
                        )
                    )
                }
            )
        }
    )
    def get(self, request):

        clinic = request.user.clinic

        type = request.query_params.get('type', 'monthly')

        if type == 'monthly':

            start_of_month, end_of_month = get_current_month_data()

            monthly_stats = Patient.objects \
                .filter(
                    clinic=clinic,
                    created_at__date__range=(start_of_month, end_of_month)
                ) \
                .annotate(date=TruncDate('created_at')) \
                .values('date') \
                .annotate(
                    patient_count=Count('id'),
                    new_count=Count('id', filter=Q(is_returning=False)),
                    returned_count=Count('id', filter=Q(is_returning=True))
                ) \
                .order_by('date')

            monthly_data = {
                item['date']: {
                    'patient_count': item['patient_count'],
                    'new_count': item['new_count'],
                    'returned_count': item['returned_count']
                }
                for item in monthly_stats
            }

            date_range = []

            current_date = start_of_month

            while current_date <= end_of_month:

                day_data = monthly_data.get(current_date, {})

                date_range.append({
                    'data': current_date,
                    'patient_count': day_data.get('patient_count', 0),
                    'new_count': day_data.get('new_count', 0),
                    'returned_count': day_data.get('returned_count', 0)
                })

                current_date += timedelta(days=1)

            return CustomResponse(data=date_range)

        elif type == 'yearly':

            current_year = timezone.now().year
        
            yearly_stats = Patient.objects \
                .filter(clinic=clinic, created_at__year=current_year) \
                .annotate(month=ExtractMonth('created_at')) \
                .values('month') \
                .annotate(patient_count=Count('id')) \
                .order_by('month')
        
            yearly_data = {
                item['month']: {
                    'patient_count': item['patient_count']
                }
                for item in yearly_stats
            }

            month_range = []

            current_month = 1

            while current_month <= 12:

                month_range.append({
                    'month': current_month,
                    'patient_count': yearly_data.get(current_month, {}).get('patient_count', 0)
                })

                current_month += 1
            
            return CustomResponse(data=month_range)

        else:

            return CustomResponse(
                success=False,
                message='Type not found',
                status=status.HTTP_404_NOT_FOUND
            )


class RevenueStatsOfYearlyANDMonthlyView(APIView):

    @extend_schema(
        tags=['stats'],
            parameters=[
                OpenApiParameter(
                    name='type',
                    location=OpenApiParameter.QUERY,
                    type=OpenApiTypes.STR,
                    default='monthly'
            )
        ],
        responses={
            status.HTTP_200_OK: inline_serializer(
                name='Revenue stats success response',
                fields={
                    'success': serializers.BooleanField(),
                    'data1': serializers.ListField(
                        child=inline_serializer(
                            name='Revenue stats yearly',
                            fields={
                                'month': serializers.IntegerField(default=1),
                                'monthly_revenue': serializers.IntegerField(default=10),
                            }
                        )
                    ),
                     'data2': serializers.ListField(
                        child=inline_serializer(
                            name='Revenue stats monthly',
                            fields={
                                'date': serializers.DateField(),
                                'daily_revenue': serializers.IntegerField(default=10),
                            }
                        )
                    )
                }
            )
        }
    )
    def get(self, request):

        clinic = request.user.clinic

        type = request.query_params.get('type', 'monthly')

        if type == "monthly":

            start_of_month, end_of_month = get_current_month_data()

            monthly_data = {}

            for row in _income_rows(clinic, start_of_month, end_of_month):

                day = timezone.localtime(row['date']).date()
                monthly_data.setdefault(day, {'daily_revenue': 0})
                monthly_data[day]['daily_revenue'] += row['amount']

            date_range = []

            current_date = start_of_month

            while current_date <= end_of_month:

                date_range.append({
                    'date': current_date,
                    'daily_revenue': monthly_data.get(current_date, {}).get('daily_revenue', 0)
                })

                current_date += timedelta(days=1)
            
            return CustomResponse(data=date_range)

        elif type == "yearly":

            current_year = timezone.now().year
        
            yearly_data = {}

            for row in _income_rows(clinic, datetime(current_year, 1, 1), datetime(current_year, 12, 31)):

                month = timezone.localtime(row['date']).month
                yearly_data.setdefault(month, {'monthly_revenue': 0})
                yearly_data[month]['monthly_revenue'] += row['amount']

            month_range = []

            current_month = 1

            while current_month <= 12:

                month_range.append({
                    'month': current_month,
                    'monthly_revenue': yearly_data.get(current_month, {}).get('monthly_revenue', 0)
                })

                current_month += 1
            
            return CustomResponse(data=month_range)

        else:

            return CustomResponse(
                success=False,
                message="Type not found",
                status=status.HTTP_404_NOT_FOUND
            )


class VisitsStatsOfMonthlyView(APIView):

    @extend_schema(
        tags=['stats'],
        responses={
            status.HTTP_200_OK: inline_serializer(
                name='Visits stats success response',
                fields={
                    'success': serializers.BooleanField(),
                    'data': serializers.ListField(
                        child=inline_serializer(
                            name='visit stats monthly',
                            fields={
                                'date': serializers.DateField(),
                                'visit_count': serializers.IntegerField(default=10),
                            }
                        )
                    )
                }
            )
        }
    )
    def get(self, request):

        clinic = request.user.clinic

        start_of_month, end_of_month = get_current_month_data()

        monthly_stats = PatientVisit.objects \
            .filter(
                patient__clinic=clinic,
                created_at__date__range=(start_of_month, end_of_month)
            ) \
            .annotate(date=TruncDate('created_at')) \
            .values('date') \
            .annotate(visit_count=Count('id')) \
            .order_by('date')
        
        monthly_data = {
            item['date']: {
                'visit_count': item['visit_count']
            }
            for item in monthly_stats
        }

        date_range = []

        current_date = start_of_month

        while current_date <= end_of_month:

            date_range.append({
                'date': current_date,
                'visit_count': monthly_data.get(current_date, {}).get('visit_count', 0)
            })

            current_date += timedelta(days=1)

        return CustomResponse(data=date_range)
