from rest_framework.views import APIView
from rest_framework import status, serializers
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer
from drf_spectacular.types import OpenApiTypes
from apps.shared.response import CustomResponse
from apps.shared.pagination import CustomPagination
from apps.api.v1.serializers import (
    PatientListCreateSerializer,
    PatientDetailSerializer,
    PatientVisitCreateSerializer,
    PatientVisitListSerializer,
    PatientVisitDetailSerializer,
    PatientVisitUpdateSerializer,
    VisitRecipeserializer,
    VisitRecipeCreateSerializer,
    TodayVisitListSerializer,
    PatientAnalysisSerializer
)
from apps.patients.models import Patient, PatientVisit, PatientVisitRecipe, PatientAnalysis
from rest_framework.exceptions import NotFound
from apps.shared.choices import StatusTextChoices, UserRole
from django.db.models import Q, OuterRef, Subquery, DateField, CharField, Count, Exists
from django.db.models.functions import Cast
from django.utils import timezone
from datetime import datetime
import re


def _patient_code_query(search_term):

    # Matches the code shown to users, e.g. AV-0012 or 12
    match = re.fullmatch(r'(?:AV-)?(\d+)', search_term, re.IGNORECASE)

    return Q(number=int(match.group(1))) if match else Q()


class PatientListCreateView(APIView):

    serializer_class = PatientListCreateSerializer
    pagination_class = CustomPagination

    def get_queryset(self):

        user = self.request.user

        query_params = self.request.query_params

        search = query_params.get('search')

        gender = query_params.get('gender')

        status = query_params.get('status')

        doctor_id = query_params.get('doctor')

        month = query_params.get('month')

        last_visit_subquery = PatientVisit.objects \
            .filter(patient=OuterRef('id')) \
            .only('created_at') \
            .order_by('-created_at')

        today = timezone.now().date()

        today_visit_subquery = PatientVisit.objects \
            .filter(patient=OuterRef('id'), created_at__date=today) \
            .order_by('-created_at')

        queryset = Patient.objects \
            .filter(clinic=user.clinic) \
            .annotate(
                last_visit_date=Cast(
                    Subquery(
                        last_visit_subquery.values('created_at')[:1]
                    ),
                    output_field=DateField()
                ),
                last_visit_doctor=Subquery(
                    last_visit_subquery.values('doctor__fio')[:1],
                    output_field=CharField()
                ),
                today_visit_status=Subquery(
                    today_visit_subquery.values('status')[:1],
                    output_field=CharField()
                ),
                visit_count=Count('visits', distinct=True)
            )

        if gender:

            queryset = queryset.filter(gender=gender)

        if status:

            queryset = queryset.filter(status=status)

        if doctor_id:

            doctor_visits_subquery = PatientVisit.objects \
                .filter(patient=OuterRef('id'), doctor_id=doctor_id)

            queryset = queryset.filter(Exists(doctor_visits_subquery))

        if month:

            try:

                year_str, month_str = month.split('-')

                queryset = queryset.filter(
                    created_at__year=int(year_str),
                    created_at__month=int(month_str)
                )

            except (ValueError, AttributeError):

                pass

        if user.role == UserRole.DOCTOR:

            doctor_visits = PatientVisit.objects \
                .filter(
                    patient=OuterRef('id'),
                    doctor=user
                )

            queryset = queryset.annotate(
                has_doctor_visit=Exists(doctor_visits)
            ) \
            .filter(has_doctor_visit=True)

        if search:

            search_terms = search.split()

            query = Q()

            for search_term in search_terms:

                query &= (
                    Q(id__icontains=search_term) |
                    _patient_code_query(search_term) |
                    Q(first_name__icontains=search_term) |
                    Q(last_name__icontains=search_term) |
                    Q(middle_name__icontains=search_term) |
                    Q(phone__icontains=search_term) 
                )
            
            queryset = queryset.filter(query)

        return queryset.order_by('-created_at')
    
    @extend_schema(
        tags=['patients'],
        responses={
            status.HTTP_200_OK: PatientDetailSerializer
        }
    )
    def post(self, request):

        serializer = self.serializer_class(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():

            patient = serializer.save()

            data = PatientDetailSerializer(patient).data

            return CustomResponse(
                message='Patient created',
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
    
    @extend_schema(
        tags=['patients'],
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
                name='status',
                description='Patient status',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR
            ),
            OpenApiParameter(
                name='gender',
                description='Patient gender',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR
            ),
            OpenApiParameter(
                name='search',
                description='Search',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR
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


class PatientStatsView(APIView):

    @extend_schema(
        tags=['patients'],
        responses={
            status.HTTP_200_OK: inline_serializer(
                name='Patient stats response',
                fields={
                    'total': serializers.IntegerField(),
                    'active': serializers.IntegerField(),
                    'inactive': serializers.IntegerField(),
                    'new_this_month': serializers.IntegerField()
                }
            )
        }
    )
    def get(self, request):

        clinic = request.user.clinic

        now = timezone.now()

        stats = Patient.objects.filter(clinic=clinic).aggregate(
            total=Count('id'),
            active=Count('id', filter=Q(status=StatusTextChoices.ACTIVE)),
            inactive=Count('id', filter=Q(status=StatusTextChoices.INACTIVE)),
            new_this_month=Count(
                'id',
                filter=Q(
                    created_at__year=now.year,
                    created_at__month=now.month
                )
            )
        )

        return CustomResponse(data=stats)


class PatientAnalysisListCreateView(APIView):

    serializer_class = PatientAnalysisSerializer
    pagination_class = CustomPagination

    def get_queryset(self):

        user = self.request.user

        patient_id = self.kwargs['id']

        return PatientAnalysis.objects \
            .filter(
                patient_id=patient_id,
                patient__clinic=user.clinic
            )

    def get_patient(self):

        try:

            return Patient.objects \
                .filter(clinic=self.request.user.clinic) \
                .get(id=self.kwargs['id'])

        except Patient.DoesNotExist:

            raise NotFound('Patient not found')

    @extend_schema(tags=['patients'])
    def get(self, request, id):

        queryset = self.get_queryset()

        paginator = self.pagination_class()

        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = self.serializer_class(
            paginated_queryset,
            many=True,
            context={'request': request}
        )

        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        tags=['patients'],
        request=PatientAnalysisSerializer
    )
    def post(self, request, id):

        patient = self.get_patient()

        serializer = self.serializer_class(
            data=request.data,
            context={'request': request, 'patient': patient}
        )

        if serializer.is_valid():

            analysis = serializer.save()

            data = self.serializer_class(
                analysis,
                context={'request': request}
            ).data

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


class PatientDetailView(APIView):

    serializer_class = PatientDetailSerializer

    def get_queryset(self):

        user = self.request.user

        queryset = Patient.objects \
            .filter(clinic=user.clinic) \
            .select_related(
                'pasport',
                'idcard',
                'driver_license'
            ) \
            .order_by('-created_at')
        
        if user.role == UserRole.DOCTOR:

            doctor_visits = PatientVisit.objects \
                .filter(
                    patient=OuterRef('id'),
                    doctor=user
                )

            queryset = queryset.annotate(
                has_doctor_visit=Exists(doctor_visits)
            ) \
            .filter(has_doctor_visit=True)
        
        return queryset
    
    def get_object(self):

        try:

            patient_id = self.kwargs['id']

            return self.get_queryset().get(id=patient_id)
        
        except Patient.DoesNotExist:

            raise NotFound('Patient not found')
    
    @extend_schema(tags=['patients'])
    def get(self, request, id):

        patient = self.get_object()

        serializer = self.serializer_class(patient)

        return CustomResponse(data=serializer.data)
    
    @extend_schema(tags=['patients'])
    def patch(self, request, id):

        patient = self.get_object()

        serializer = self.serializer_class(
            patient,
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

    @extend_schema(tags=['patients'])
    def delete(self, request, id):

        patient = self.get_object()

        patient.delete()

        return CustomResponse(message='Patient deleted')


class PatientVisitListCreateView(APIView):

    pagination_class = CustomPagination

    def get_queryset(self):

        return Patient.objects \
            .filter(
                status=StatusTextChoices.ACTIVE,
                clinic=self.request.user.clinic
            )

    def get_object(self):

        try:

            patient_id = self.kwargs['id']

            return self.get_queryset().get(id=patient_id)

        except Patient.DoesNotExist:

            raise NotFound('Patient not found or inactive')

    @extend_schema(
        tags=['patients'],
        request=PatientVisitCreateSerializer
    )
    def post(self, request, id):

        patient = self.get_object()

        serializer = PatientVisitCreateSerializer(
            data=request.data,
            context={
                'patient': patient,
                'request': request
            }
        )

        if serializer.is_valid():

            patient_visit = serializer.save()

            data = PatientVisitDetailSerializer(
                patient_visit,
                context={
                    "request": request
                }
            ).data

            return CustomResponse(
                success=True,
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
    
    @extend_schema(
        tags=['patients'],
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
        ],
        responses={
            status.HTTP_200_OK: PatientVisitListSerializer
        }
    )
    def get(self, request, id):

        user = request.user

        patient = self.get_object()

        queryset = PatientVisit.objects \
            .filter(patient=patient) \
            .select_related('doctor') \
            .prefetch_related('services')
        
        if user.role == UserRole.DOCTOR:

            queryset = queryset.filter(doctor=user)

        paginator = self.pagination_class()

        paginated_queryset = paginator.paginate_queryset(
            queryset,
            request
        )

        serializer = PatientVisitListSerializer(
            paginated_queryset,
            many=True,
            context={
                "request": request
            }
        )

        return paginator.get_paginated_response(serializer.data)


class PatientVisitDetailView(APIView):

    serializer_class = PatientVisitDetailSerializer

    def get_queryset(self):

        user = self.request.user

        patient_id = self.kwargs['id']

        queryset = PatientVisit.objects \
            .filter(
                patient_id=patient_id,
                patient__clinic=user.clinic
            ) \
            .select_related('doctor', 'patient') \
            .prefetch_related(
                'services',
                'recipes'
            )

        if user.role == UserRole.DOCTOR:

            queryset = queryset.filter(doctor=user)

        return queryset
    
    def get_object(self):   

        try:

            visit_id = self.kwargs['visit_id']

            return self.get_queryset().get(id=visit_id)
        
        except PatientVisit.DoesNotExist:

            raise NotFound('Patient visit not found')
    
    @extend_schema(
        tags=['patients']
    )
    def get(self, request, id, visit_id):

        patient_visit = self.get_object()

        serializer = self.serializer_class(
            patient_visit,
            context={
                "request": request
            }
        )

        return CustomResponse(data=serializer.data)


    @extend_schema(
        tags=['patients'],
        request=PatientVisitUpdateSerializer
    )
    def patch(self, request, id, visit_id):

        patient_visit = self.get_object()

        serializer = PatientVisitUpdateSerializer(
            patient_visit,
            request.data,
            partial=True,
            context={
                'doctor': patient_visit.doctor
            }
        )

        if serializer.is_valid():

            patient_visit = serializer.save()

            data = self.serializer_class(
                patient_visit,
                context={"request": request}
            ).data

            return CustomResponse(data=data)

        else:

            error_message = str(serializer.errors)

            return CustomResponse(
                success=False,
                message=error_message,
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        tags=['patients']
    )
    def delete(self, request, id, visit_id):

        patient_visit = self.get_object()

        patient_visit.delete()

        return CustomResponse(message='Patient visit deleted')


class VisitRecipeCreateView(APIView):

    serializer_class = VisitRecipeserializer
    pagination_class = CustomPagination

    def get_queryset(self):

        user = self.request.user

        return PatientVisit.objects \
            .filter(doctor=user)

    def get_object(self):

        try:

            visit_id = self.kwargs['id']

            return self.get_queryset().get(id=visit_id)
        
        except PatientVisit.DoesNotExist:

            raise NotFound('Patient visit not found.')

    @extend_schema(
        tags=['patients'],
        request=VisitRecipeCreateSerializer
    )
    def post(self, request, id):

        visit = self.get_object()

        serializer = VisitRecipeCreateSerializer(data=request.data)

        if serializer.is_valid():

            recipes = serializer.validated_data['recipes']

            create_to_recipe_objs = [
                PatientVisitRecipe(
                    visit=visit,
                    **recipe
                )

                for recipe in recipes
            ]

            created_recipe_objs = PatientVisitRecipe.objects \
                .bulk_create(create_to_recipe_objs)
            
            created_recipe_ids = [
                created_recipe_obj.id
                for created_recipe_obj in created_recipe_objs
            ]

            queryset = PatientVisitRecipe.objects \
                .filter(id__in=created_recipe_ids)
            
            data = self.serializer_class(
                queryset,
                many=True
            ).data

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


class VisitRecipeDetailView(APIView):

    serializer_class = VisitRecipeserializer

    def get_object(self):

        user = self.request.user
        visit_id = self.kwargs['id']
        recipe_id = self.kwargs['recipe_id']

        is_exists = PatientVisit.objects \
            .filter(
                id=visit_id,
                doctor=user
            ) \
            .exists()
        
        if not is_exists:

            raise NotFound('Patient visit not found')

        try:

            return PatientVisitRecipe.objects \
                .filter(visit_id=visit_id) \
                .get(id=recipe_id)
        
        except PatientVisit.DoesNotExist:

            raise NotFound('Visit recipe not found.')
    
    @extend_schema(tags=['patients'])
    def patch(self, request, id, recipe_id):

        visit_recipe = self.get_object()

        serializer = self.serializer_class(
            visit_recipe,
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
    
    @extend_schema(tags=['patients'])
    def delete(self, request, id, recipe_id):

        visit_recipe = self.get_object()

        visit_recipe.delete()

        return CustomResponse(message='Visit recipe deleted')


class TodayVisitsView(APIView):

    serializer_class = TodayVisitListSerializer
    pagination_class = CustomPagination

    def get_queryset(self):

        user = self.request.user

        query_params = self.request.query_params

        date_param = query_params.get('date')

        status_param = query_params.get('status')

        search = query_params.get('search')

        try:

            target_date = (
                datetime.strptime(date_param, '%Y-%m-%d').date()
                if date_param else timezone.now().date()
            )

        except ValueError:

            target_date = timezone.now().date()

        all_dates = query_params.get('all_dates') == 'true'

        queryset = PatientVisit.objects \
            .filter(patient__clinic=user.clinic) \
            .select_related('patient', 'doctor', 'doctor__doctor') \
            .prefetch_related('services', 'doctor__doctor__services__category')

        if not all_dates:

            queryset = queryset.filter(created_at__date=target_date)

        if user.role == UserRole.DOCTOR:

            queryset = queryset.filter(doctor=user)

        if status_param:

            queryset = queryset.filter(status=status_param)

        if search:

            query = Q()

            for search_term in search.split():

                query &= (
                    Q(patient__first_name__icontains=search_term) |
                    Q(patient__last_name__icontains=search_term) |
                    Q(patient__middle_name__icontains=search_term) |
                    Q(patient__phone__icontains=search_term) |
                    Q(doctor__fio__icontains=search_term) |
                    Q(queue__icontains=search_term)
                )

            queryset = queryset.filter(query)

        return queryset.order_by('-created_at' if all_dates else 'created_at')

    @extend_schema(
        tags=['patients'],
        parameters=[
            OpenApiParameter(
                name='date',
                description='YYYY-MM-DD, default today',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR
            ),
            OpenApiParameter(
                name='status',
                description='Visit status',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR
            ),
            OpenApiParameter(
                name='search',
                description='Search by patient, phone, doctor or queue',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR
            ),
            OpenApiParameter(
                name='all_dates',
                description='true: ignore date and return visits from every day, newest first',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.BOOL
            ),
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
        ],
        responses={
            status.HTTP_200_OK: TodayVisitListSerializer
        }
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
