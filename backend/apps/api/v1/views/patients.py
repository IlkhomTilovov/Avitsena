from rest_framework.views import APIView
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter
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
    TodayVisitListSerializer
)
from apps.patients.models import Patient, PatientVisit, PatientVisitRecipe
from rest_framework.exceptions import NotFound
from apps.shared.choices import StatusTextChoices, UserRole
from django.db.models import Q, OuterRef, Subquery, DateField, Exists
from django.db.models.functions import Cast
from django.utils import timezone
from datetime import datetime


class PatientListCreateView(APIView):

    serializer_class = PatientListCreateSerializer
    pagination_class = CustomPagination

    def get_queryset(self):

        user = self.request.user

        query_params = self.request.query_params

        search = query_params.get('search')

        gender = query_params.get('gender')

        status = query_params.get('status')

        last_visit_subquery = PatientVisit.objects \
            .filter(patient=OuterRef('id')) \
            .only('created_at') \
            .order_by('-created_at')

        queryset = Patient.objects \
            .filter(clinic=user.clinic) \
            .annotate(
                last_visit_date=Cast(
                Subquery(
                    last_visit_subquery.values('created_at')[:1]
                ),
                output_field=DateField()
            ))

        if gender:

            queryset = queryset.filter(gender=gender)

        if status:

            queryset = queryset.filter(status=status)
        
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

        try:

            target_date = (
                datetime.strptime(date_param, '%Y-%m-%d').date()
                if date_param else timezone.now().date()
            )

        except ValueError:

            target_date = timezone.now().date()

        queryset = PatientVisit.objects \
            .filter(
                patient__clinic=user.clinic,
                created_at__date=target_date
            ) \
            .select_related('patient', 'doctor', 'doctor__doctor') \
            .prefetch_related('services', 'doctor__doctor__services__category')

        if user.role == UserRole.DOCTOR:

            queryset = queryset.filter(doctor=user)

        if status_param:

            queryset = queryset.filter(status=status_param)

        return queryset.order_by('created_at')

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
