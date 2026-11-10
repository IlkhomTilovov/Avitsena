from django.db import IntegrityError, transaction
from django.db.models import Prefetch, Q
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import SAFE_METHODS
from rest_framework.views import APIView

from apps.api.v1.serializers import (
    RoomSerializer,
    RoomWriteSerializer,
    BedSerializer,
    BedWriteSerializer,
    AdmissionListSerializer,
    AdmissionDetailSerializer,
    AdmissionWriteSerializer,
    AdmissionDischargeSerializer,
    AdmissionNoteSerializer,
    AdmissionServiceSerializer
)
from apps.inpatient.models import Room, Bed, Admission, AdmissionService
from apps.shared.choices import AdmissionStatus
from apps.shared.pagination import CustomPagination
from apps.shared.permissions import IsAdmin, IsRegistratorOrAdmin
from apps.shared.response import CustomResponse


def _first_error(errors) -> str:

    # DRF xatolarini foydalanuvchiga ko'rsatsa bo'ladigan bitta matnga aylantiradi
    if isinstance(errors, dict):

        for value in errors.values():

            return _first_error(value)

    if isinstance(errors, list) and errors:

        return _first_error(errors[0])

    return str(errors)


def _error_response(message):

    return CustomResponse(
        success=False,
        message=message,
        status=status.HTTP_400_BAD_REQUEST
    )


def _rooms_queryset(clinic):

    active_admissions = Admission.objects \
        .filter(status=AdmissionStatus.ACTIVE) \
        .select_related('patient')

    beds = Bed.objects.prefetch_related(
        Prefetch('admissions', queryset=active_admissions, to_attr='active_admissions')
    )

    return Room.objects \
        .filter(clinic=clinic) \
        .prefetch_related(Prefetch('beds', queryset=beds))


def _admissions_queryset(clinic):

    return Admission.objects \
        .filter(clinic=clinic) \
        .select_related('patient', 'bed__room', 'doctor', 'created_by') \
        .prefetch_related('services', 'notes__created_by')


class AdminWritePermissionMixin:

    # Ko'rish admin va registratorga, xona va karavotlarni o'zgartirish faqat adminga
    def get_permissions(self):

        if self.request.method in SAFE_METHODS:

            return [IsRegistratorOrAdmin()]

        return [IsAdmin()]


class RoomListCreateView(AdminWritePermissionMixin, APIView):

    @extend_schema(tags=['inpatient'], responses={status.HTTP_200_OK: RoomSerializer(many=True)})
    def get(self, request):

        rooms = _rooms_queryset(request.user.clinic)

        return CustomResponse(data=RoomSerializer(rooms, many=True).data)

    @extend_schema(tags=['inpatient'], request=RoomWriteSerializer, responses={status.HTTP_201_CREATED: RoomSerializer})
    def post(self, request):

        serializer = RoomWriteSerializer(
            data=request.data,
            context={'clinic': request.user.clinic}
        )

        if not serializer.is_valid():

            return _error_response(_first_error(serializer.errors))

        with transaction.atomic():

            room = serializer.save()

        room = _rooms_queryset(request.user.clinic).get(id=room.id)

        return CustomResponse(
            data=RoomSerializer(room).data,
            status=status.HTTP_201_CREATED
        )


class RoomDetailView(AdminWritePermissionMixin, APIView):

    def get_object(self):

        try:

            return Room.objects.get(id=self.kwargs['id'], clinic=self.request.user.clinic)

        except Room.DoesNotExist:

            raise NotFound('Room not found')

    @extend_schema(tags=['inpatient'], request=RoomWriteSerializer, responses={status.HTTP_200_OK: RoomSerializer})
    def patch(self, request, id):

        room = self.get_object()

        serializer = RoomWriteSerializer(
            room,
            data=request.data,
            partial=True,
            context={'clinic': request.user.clinic}
        )

        if not serializer.is_valid():

            return _error_response(_first_error(serializer.errors))

        serializer.save()

        room = _rooms_queryset(request.user.clinic).get(id=room.id)

        return CustomResponse(data=RoomSerializer(room).data)

    @extend_schema(tags=['inpatient'])
    def delete(self, request, id):

        room = self.get_object()

        if Admission.objects.filter(bed__room=room).exists():

            return _error_response("Bu xonada bemorlar yotgan, uni o'chirib bo'lmaydi. Uni nofaol qiling.")

        room.delete()

        return CustomResponse(message='Room deleted')


class BedCreateView(AdminWritePermissionMixin, APIView):

    @extend_schema(tags=['inpatient'], request=BedWriteSerializer, responses={status.HTTP_201_CREATED: BedSerializer})
    def post(self, request, id):

        try:

            room = Room.objects.get(id=id, clinic=request.user.clinic)

        except Room.DoesNotExist:

            raise NotFound('Room not found')

        serializer = BedWriteSerializer(data=request.data, context={'room': room})

        if not serializer.is_valid():

            return _error_response(_first_error(serializer.errors))

        bed = serializer.save(room=room)

        return CustomResponse(
            data=BedSerializer(bed).data,
            status=status.HTTP_201_CREATED
        )


class BedDetailView(AdminWritePermissionMixin, APIView):

    def get_object(self):

        try:

            return Bed.objects \
                .select_related('room') \
                .get(id=self.kwargs['id'], room__clinic=self.request.user.clinic)

        except Bed.DoesNotExist:

            raise NotFound('Bed not found')

    @extend_schema(tags=['inpatient'], request=BedWriteSerializer, responses={status.HTTP_200_OK: BedSerializer})
    def patch(self, request, id):

        bed = self.get_object()

        serializer = BedWriteSerializer(
            bed,
            data=request.data,
            partial=True,
            context={'room': bed.room}
        )

        if not serializer.is_valid():

            return _error_response(_first_error(serializer.errors))

        bed = serializer.save()

        return CustomResponse(data=BedSerializer(bed).data)

    @extend_schema(tags=['inpatient'])
    def delete(self, request, id):

        bed = self.get_object()

        if bed.admissions.exists():

            return _error_response("Bu karavotda bemor yotgan, uni o'chirib bo'lmaydi. Uni nofaol qiling.")

        bed.delete()

        return CustomResponse(message='Bed deleted')


class AdmissionListCreateView(APIView):

    permission_classes = (IsRegistratorOrAdmin, )
    pagination_class = CustomPagination

    def get_queryset(self):

        query_params = self.request.query_params

        queryset = _admissions_queryset(self.request.user.clinic)

        status_param = query_params.get('status')

        if status_param:

            queryset = queryset.filter(status=status_param)

        patient_id = query_params.get('patient')

        if patient_id:

            queryset = queryset.filter(patient_id=patient_id)

        search = query_params.get('search')

        if search:

            query = Q()

            for search_term in search.split():

                query &= (
                    Q(patient__first_name__icontains=search_term) |
                    Q(patient__last_name__icontains=search_term) |
                    Q(patient__middle_name__icontains=search_term) |
                    Q(patient__phone__icontains=search_term) |
                    Q(bed__room__name__icontains=search_term) |
                    Q(doctor__fio__icontains=search_term)
                )

            queryset = queryset.filter(query)

        return queryset

    @extend_schema(
        tags=['inpatient'],
        parameters=[
            OpenApiParameter(name='status', description='active | discharged', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='patient', description='Patient id', location=OpenApiParameter.QUERY, type=OpenApiTypes.UUID),
            OpenApiParameter(name='search', description='Patient, phone, room or doctor', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
            OpenApiParameter(name='page', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT),
            OpenApiParameter(name='per_page', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT)
        ],
        responses={status.HTTP_200_OK: AdmissionListSerializer(many=True)}
    )
    def get(self, request):

        paginator = self.pagination_class()

        page = paginator.paginate_queryset(self.get_queryset(), request)

        return paginator.get_paginated_response(
            AdmissionListSerializer(page, many=True).data
        )

    @extend_schema(tags=['inpatient'], request=AdmissionWriteSerializer, responses={status.HTTP_201_CREATED: AdmissionDetailSerializer})
    def post(self, request):

        serializer = AdmissionWriteSerializer(
            data=request.data,
            context={'clinic': request.user.clinic, 'user': request.user}
        )

        if not serializer.is_valid():

            return _error_response(_first_error(serializer.errors))

        try:

            with transaction.atomic():

                admission = serializer.save()

        except IntegrityError:

            # Ikki xodim bir vaqtda bir karavotga yoki bir bemorni yotqizsa
            return _error_response('Karavot yoki bemor allaqachon band.')

        admission = _admissions_queryset(request.user.clinic).get(id=admission.id)

        return CustomResponse(
            data=AdmissionDetailSerializer(admission).data,
            status=status.HTTP_201_CREATED
        )


class AdmissionObjectMixin:

    permission_classes = (IsRegistratorOrAdmin, )

    def get_admission(self, id):

        try:

            return _admissions_queryset(self.request.user.clinic).get(id=id)

        except Admission.DoesNotExist:

            raise NotFound('Admission not found')

    def detail_response(self, admission, status_code=status.HTTP_200_OK):

        admission = self.get_admission(admission.id)

        return CustomResponse(
            data=AdmissionDetailSerializer(admission).data,
            status=status_code
        )


class AdmissionDetailView(AdmissionObjectMixin, APIView):

    @extend_schema(tags=['inpatient'], responses={status.HTTP_200_OK: AdmissionDetailSerializer})
    def get(self, request, id):

        return CustomResponse(
            data=AdmissionDetailSerializer(self.get_admission(id)).data
        )

    @extend_schema(tags=['inpatient'], request=AdmissionWriteSerializer, responses={status.HTTP_200_OK: AdmissionDetailSerializer})
    def patch(self, request, id):

        admission = self.get_admission(id)

        serializer = AdmissionWriteSerializer(
            admission,
            data=request.data,
            partial=True,
            context={'clinic': request.user.clinic, 'user': request.user}
        )

        if not serializer.is_valid():

            return _error_response(_first_error(serializer.errors))

        try:

            with transaction.atomic():

                serializer.save()

        except IntegrityError:

            return _error_response('Bu karavot band.')

        return self.detail_response(admission)


class AdmissionDischargeView(AdmissionObjectMixin, APIView):

    @extend_schema(tags=['inpatient'], request=AdmissionDischargeSerializer, responses={status.HTTP_200_OK: AdmissionDetailSerializer})
    def post(self, request, id):

        admission = self.get_admission(id)

        if admission.status != AdmissionStatus.ACTIVE:

            return _error_response('Bemor allaqachon chiqarilgan.')

        serializer = AdmissionDischargeSerializer(
            data=request.data,
            context={'admission': admission}
        )

        if not serializer.is_valid():

            return _error_response(_first_error(serializer.errors))

        data = serializer.validated_data

        admission.status = AdmissionStatus.DISCHARGED
        admission.discharged_at = data.get('discharged_at') or timezone.now()
        admission.discharge_diagnosis = data.get('discharge_diagnosis') or None
        admission.discharge_notes = data.get('discharge_notes') or None
        admission.payment_method = data['payment_method']
        # Hisob chiqish vaqtida yopiladi, shu summa to'langan deb yoziladi
        admission.paid_amount = admission.total
        admission.save()

        return self.detail_response(admission)


class AdmissionNoteCreateView(AdmissionObjectMixin, APIView):

    @extend_schema(tags=['inpatient'], request=AdmissionNoteSerializer, responses={status.HTTP_201_CREATED: AdmissionDetailSerializer})
    def post(self, request, id):

        admission = self.get_admission(id)

        if admission.status != AdmissionStatus.ACTIVE:

            return _error_response("Chiqarilgan bemorga yozuv qo'shib bo'lmaydi.")

        serializer = AdmissionNoteSerializer(data=request.data)

        if not serializer.is_valid():

            return _error_response(_first_error(serializer.errors))

        serializer.save(admission=admission, created_by=request.user)

        return self.detail_response(admission, status.HTTP_201_CREATED)


class AdmissionServiceCreateView(AdmissionObjectMixin, APIView):

    @extend_schema(tags=['inpatient'], request=AdmissionServiceSerializer, responses={status.HTTP_201_CREATED: AdmissionDetailSerializer})
    def post(self, request, id):

        admission = self.get_admission(id)

        if admission.status != AdmissionStatus.ACTIVE:

            return _error_response("Chiqarilgan bemorga muolaja qo'shib bo'lmaydi.")

        serializer = AdmissionServiceSerializer(
            data=request.data,
            context={'clinic': request.user.clinic}
        )

        if not serializer.is_valid():

            return _error_response(_first_error(serializer.errors))

        serializer.save(admission=admission, created_by=request.user)

        return self.detail_response(admission, status.HTTP_201_CREATED)


class AdmissionServiceDetailView(AdmissionObjectMixin, APIView):

    @extend_schema(tags=['inpatient'], responses={status.HTTP_200_OK: AdmissionDetailSerializer})
    def delete(self, request, id, service_id):

        admission = self.get_admission(id)

        if admission.status != AdmissionStatus.ACTIVE:

            return _error_response("Chiqarilgan bemorning hisobini o'zgartirib bo'lmaydi.")

        deleted, _ = AdmissionService.objects \
            .filter(id=service_id, admission=admission) \
            .delete()

        if not deleted:

            raise NotFound('Admission service not found')

        return self.detail_response(admission)
