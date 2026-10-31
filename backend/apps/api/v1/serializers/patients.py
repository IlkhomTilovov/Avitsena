from rest_framework import serializers
from apps.patients.models import (
    Patient,
    PatientVisit,
    PatientPasport,
    PatientIDCard,
    PatientDriverLicense,
    PatientVisitRecipe,
    PatientAnalysis
)
from .services import ServiceSerializer
from apps.patients.choices import DocumentType, PatientVisitStatus
from apps.users.models import CustomUser
from typing import Union
from django.utils import timezone
from django.db.models import Sum, Count, Q

    
class VisitRecipeserializer(serializers.ModelSerializer):

    class Meta:
        model = PatientVisitRecipe
        fields = (
            'id',
            'name',
            'description'
        )
    
    def create(self, validated_data):

        validated_data['visit'] = self.context['visit']

        return PatientVisitRecipe.objects.create(**validated_data)


class VisitRecipeCreateSerializer(serializers.Serializer):

    recipes = VisitRecipeserializer(many=True)


class PatientAnalysisSerializer(serializers.ModelSerializer):

    file = serializers.SerializerMethodField()

    class Meta:

        model = PatientAnalysis
        fields = (
            'id',
            'visit',
            'name',
            'result',
            'file',
            'created_at'
        )
        read_only_fields = (
            'id',
            'created_at'
        )

    def get_file(self, instance) -> Union[str, None]:

        request = self.context.get('request')

        if instance.file and hasattr(instance.file, 'url') and request:

            return request.build_absolute_uri(instance.file.url)

        return None

    def create(self, validated_data):

        validated_data['patient'] = self.context['patient']

        return PatientAnalysis.objects.create(**validated_data)


class PatientPasportSerializer(serializers.ModelSerializer):

    class Meta:
        model = PatientPasport
        exclude = ('id', 'patient')


class PatientIDCardSerializer(serializers.ModelSerializer):

    class Meta:
        model = PatientIDCard
        exclude = ('id', 'patient')


class PatientDriverLicenseSerializer(serializers.ModelSerializer):

    class Meta:
        model = PatientDriverLicense
        exclude = ('id', 'patient')


class PatientListCreateSerializer(serializers.ModelSerializer):

    pasport = PatientPasportSerializer(
        required=False,
        allow_null=True,
        write_only=True
    )

    idcard = PatientIDCardSerializer(
        required=False,
        allow_null=True,
        write_only=True
    )

    driver_license = PatientDriverLicenseSerializer(
        required=False,
        allow_null=True,
        write_only=True
    )

    last_visit_date = serializers.DateField(
        read_only=True,
        default=None
    )

    code = serializers.CharField(
        read_only=True,
        default=None
    )

    visit_count = serializers.IntegerField(
        read_only=True,
        default=0
    )

    last_visit_doctor = serializers.CharField(
        read_only=True,
        default=None
    )

    today_visit_status = serializers.CharField(
        read_only=True,
        default=None
    )

    class Meta:

        model = Patient
        fields = (
            'id',
            'code',
            'first_name',
            'last_name',
            'middle_name',
            'phone',
            'home_phone',
            'document_type',
            'pasport',
            'idcard',
            'driver_license',
            'gender',
            'status',
            'date_of_birth',
            'blood_group',
            'country',
            'region',
            'address',
            'height',
            'weight',
            'last_visit_date',
            'last_visit_doctor',
            'today_visit_status',
            'visit_count',
            'created_at'
        )
        read_only_fields = (
            'id', 
            'created_at',
            'status'
        )
        extra_kwargs = {
            'document_type': {
                'write_only': True
            },
            'middle_name': {
                'write_only': True
            },
            'home_phone': {
                'write_only': True
            },
            'country': {
                'write_only': True
            },
            'region': {
                'write_only': True
            },
            'address': {
                'write_only': True
            },
            'height': {
                'write_only': True
            },
            'weight': {
                'write_only': True
            },
            'blood_group': {
                'write_only': True
            }
        }
    
    def validate(self, attrs):

        document_type = attrs.get('document_type')
        pasport_data = attrs.get('pasport')
        idcard_data = attrs.get('idcard')
        driver_license_data = attrs.get('driver_license')

        if document_type == DocumentType.PASPORT and not pasport_data:

            raise serializers.ValidationError('pasport field is required')
        
        elif document_type == DocumentType.IDCARD and not idcard_data:

            raise serializers.ValidationError('idcard field is required')
        
        elif document_type == DocumentType.DRIVER_LISENCE and not driver_license_data:

            raise serializers.ValidationError('driver_license field is required')
        
        return attrs
    
    def create(self, validated_data):

        doc_type = validated_data.get('document_type')
        pasport_data = validated_data.pop('pasport', None)
        idcard_data = validated_data.pop('idcard', None)
        driver_license_data = validated_data.pop('driver_license', None)

        validated_data['clinic'] = self.context['request'].user.clinic

        patient = Patient.objects.create(**validated_data)

        if doc_type == DocumentType.PASPORT:

            PatientPasport.objects.create(
                patient=patient,
                **pasport_data
            )
        
        elif doc_type == DocumentType.IDCARD:

            PatientIDCard.objects.create(
                patient=patient,
                **idcard_data
            )
        
        elif doc_type == DocumentType.DRIVER_LISENCE:

            PatientDriverLicense.objects.create(
                patient=patient,
                **driver_license_data
            )
        
        return patient


class PatientDetailSerializer(serializers.ModelSerializer):

    pasport = PatientPasportSerializer(
        required=False,
        allow_null=True
    )

    idcard = PatientIDCardSerializer(
        required=False,
        allow_null=True
    )

    driver_license = PatientDriverLicenseSerializer(
        required=False,
        allow_null=True
    )

    code = serializers.CharField(
        read_only=True,
        default=None
    )

    stats = serializers.SerializerMethodField()

    class Meta:

        model = Patient
        fields = (
            'id',
            'code',
            'first_name',
            'last_name',
            'middle_name',
            'phone',
            'home_phone',
            'gender',
            'blood_group',
            'date_of_birth',
            'country',
            'region',
            'address',
            'height',
            'weight',
            'status',
            'document_type',
            'pasport',
            'idcard',
            'driver_license',
            'allergies',
            'medications',
            'next_visit_date',
            'stats',
            'created_at',
            'updated_at'
        )
        read_only_fields = (
            'created_at',
            'updated_at'
        )

    def get_stats(self, instance) -> dict:

        visit_aggregate = instance.visits.aggregate(
            total_visits=Count('id'),
            total_paid=Sum('total_price', filter=Q(status=PatientVisitStatus.COMPLETED)),
            diagnosis_count=Count('id', filter=~Q(diagnosis='') & Q(diagnosis__isnull=False)),
            recipe_count=Count('recipes', distinct=True)
        )

        last_visit = instance.visits.order_by('-created_at').first()

        analysis_count = instance.analyses.count()

        return {
            'total_visits': visit_aggregate['total_visits'] or 0,
            'last_visit_date': last_visit.created_at if last_visit else None,
            'next_visit_date': instance.next_visit_date,
            'total_paid': visit_aggregate['total_paid'] or 0,
            'diagnosis_count': visit_aggregate['diagnosis_count'] or 0,
            'recipe_count': visit_aggregate['recipe_count'] or 0,
            'analysis_count': analysis_count,
            'payment_count': visit_aggregate['total_visits'] or 0
        }
    
    def validate(self, attrs):

        document_type = attrs.get('document_type')
        pasport_data = attrs.get('pasport')
        idcard_data = attrs.get('idcard')
        driver_license_data = attrs.get('driver_license')

        if document_type == DocumentType.PASPORT and not pasport_data:

            raise serializers.ValidationError('pasport field is required')
        
        elif document_type == DocumentType.IDCARD and not idcard_data:

            raise serializers.ValidationError('idcard field is required')
        
        elif document_type == DocumentType.DRIVER_LISENCE and not driver_license_data:

            raise serializers.ValidationError('driver_license field is required')
        
        return attrs
    
    def update(self, instance, validated_data):

        new_doc_type = validated_data.get('document_type')
        pasport_data = validated_data.pop('pasport', None)
        idcard_data = validated_data.pop('idcard', None)
        driver_license_data = validated_data.pop('driver_license', None)
        old_doc_type = instance.document_type

        patient = super().update(instance, validated_data)

        if old_doc_type in DocumentType.values and old_doc_type != new_doc_type:

            if old_doc_type == DocumentType.PASPORT:

                PatientPasport.objects.filter(patient=patient).delete()

            elif old_doc_type == DocumentType.IDCARD:

                PatientIDCard.objects.filter(patient=patient).delete()
            
            else:

                PatientDriverLicense.objects.filter(patient=patient).delete()

        if new_doc_type == DocumentType.PASPORT:

            PatientPasport.objects.update_or_create(
                patient=patient,
                defaults=pasport_data
            )

            patient.pasport.refresh_from_db()
        
        elif new_doc_type == DocumentType.IDCARD:

            PatientIDCard.objects.update_or_create(
                patient=patient,
                defaults=idcard_data
            )

            patient.idcard.refresh_from_db()
        
        elif new_doc_type == DocumentType.DRIVER_LISENCE:

            PatientDriverLicense.objects.update_or_create(
                patient=patient,
                defaults=driver_license_data
            )

            patient.driver_license.refresh_from_db()
        
        return patient


class PatientVisitCreateSerializer(serializers.ModelSerializer):

    class Meta:

        model = PatientVisit
        fields = (
            'id',
            'doctor',
            'services',
            'file',
            'payment_method'
        )
    
    def validate(self, attrs):

        total_price = 0

        visit_services = attrs.get('services')

        visit_service_ids = [visit_service.id for visit_service in visit_services]

        user = attrs['doctor']

        allow_count = user.doctor.services.filter(
            id__in=visit_service_ids
        ).count()

        visit_service_count = len(visit_services)

        if allow_count != visit_service_count:

            raise serializers.ValidationError('Some services are not suitable for doctor.')
        
        for visit_service in visit_services: total_price += visit_service.price

        self.context['total_price'] = total_price

        return attrs
    
    def create(self, validated_data):

        today_date = timezone.now().date()
        services = validated_data.pop('services', [])
        registrator = self.context['request'].user
        patient = self.context['patient']
        total_price = self.context['total_price']
        doctor = validated_data['doctor']

        today_visit_count = doctor.doctor_visits \
            .filter(created_at__date=today_date) \
            .count()
        
        queue = f"A-{today_visit_count + 1}"

        validated_data.update({
            'registrator': registrator,
            'patient': patient,
            'total_price': total_price,
            'queue': queue
        })

        if validated_data.get('payment_method'):

            validated_data['cashier'] = registrator

        visit = PatientVisit.objects.create(**validated_data)

        visit.services.add(*services)

        return visit


class PatientVisitListSerializer(serializers.ModelSerializer):

    doctor = serializers.SerializerMethodField()

    room_number = serializers.SerializerMethodField()

    file = serializers.SerializerMethodField()

    payment_method_display = serializers.SerializerMethodField()

    services = ServiceSerializer(many=True)

    class Meta:

        model = PatientVisit
        fields = (
            'id',
            'doctor',
            'room_number',
            'total_price',
            'diagnosis',
            'queue',
            'status',
            'file',
            'services',
            'payment_method',
            'payment_method_display',
            'created_at'
        )

    def get_file(self, instance) -> str | None:

        request = self.context['request']

        if instance.file and hasattr(instance.file, 'url'):

            return request.build_absolute_uri(instance.file.url)

        return None

    def get_doctor(self, instance) -> str | None:

        return getattr(instance.doctor, 'fio', None)

    def get_payment_method_display(self, instance) -> str | None:

        return instance.get_payment_method_display() if instance.payment_method else None
    
    def get_room_number(self, instance) -> str | None:

        doc_user = instance.doctor

        if doc_user:
            return getattr(doc_user.doctor, 'room_number', None)
        
        return None


class PatientVisitUpdateSerializer(serializers.ModelSerializer):

    class Meta:

        model = PatientVisit
        fields = (
            'doctor',
            'services',
            'diagnosis',
            'file',
            'status'
        )
    
    def validate(self, attrs):

        visit_services = attrs.get('services')

        user = attrs.get('doctor') if attrs.get('doctor') else self.context['doctor']

        if visit_services:

            if not user:

                raise serializers.ValidationError('No associated doctor found')

            total_price = 0

            visit_service_ids = [
                visit_service.id for visit_service in visit_services
            ]

            allow_count = user.doctor.services.filter(
                id__in=visit_service_ids
            ).count()

            visit_service_count = len(visit_service_ids)

            if allow_count != visit_service_count:

                raise serializers.ValidationError('Some services are not suitable for doctor')

            for visit_service in visit_services: total_price += visit_service.price

            self.context['total_price'] = total_price

        return attrs


    def update(self, instance, validated_data):

        visit_services = validated_data.pop('services', None)
        total_price = self.context.get('total_price')

        if total_price:

            validated_data['total_price'] = total_price

        patient_visit = super().update(instance, validated_data)

        if visit_services:

            patient_visit.services.set(visit_services)

        return patient_visit
    

class PatientVisitDetailSerializer(serializers.ModelSerializer):

    doctor = serializers.SerializerMethodField()

    room_number = serializers.SerializerMethodField()

    services = ServiceSerializer(many=True)

    recipes = VisitRecipeserializer(many=True)

    file = serializers.SerializerMethodField()

    payment_method_display = serializers.SerializerMethodField()

    class Meta:

        model = PatientVisit
        fields = (
            'id',
            'doctor',
            'room_number',
            'services',
            'recipes',
            'diagnosis',
            'queue',
            'file',
            'total_price',
            'status',
            'payment_method',
            'payment_method_display',
            'created_at',
            'updated_at'
        )

    def get_file(self, instance) -> str | None:

        request = self.context['request']

        if instance.file and hasattr(instance.file, 'url'):

            return request.build_absolute_uri(instance.file.url)

        return None

    def get_doctor(self, instance) -> str | None:

        return getattr(instance.doctor, 'fio', None)

    def get_payment_method_display(self, instance) -> str | None:

        return instance.get_payment_method_display() if instance.payment_method else None

    def get_room_number(self, instance) -> str | None:

        doc_user = instance.doctor

        if doc_user:
            return getattr(doc_user.doctor, 'room_number', None)

        return None


class TodayVisitPatientSerializer(serializers.ModelSerializer):

    fio = serializers.SerializerMethodField()

    class Meta:

        model = Patient
        fields = (
            'id',
            'fio',
            'phone'
        )

    def get_fio(self, instance) -> str:

        parts = [instance.last_name, instance.first_name, instance.middle_name]

        return ' '.join(part for part in parts if part)


class TodayVisitDoctorSerializer(serializers.ModelSerializer):

    specialty = serializers.SerializerMethodField()

    class Meta:

        model = CustomUser
        fields = (
            'id',
            'fio',
            'specialty'
        )

    def get_specialty(self, instance) -> str | None:

        doctor = getattr(instance, 'doctor', None)

        if not doctor:

            return None

        service = next(iter(doctor.services.all()), None)

        if service and service.category:

            return service.category.name

        return None


class TodayVisitListSerializer(serializers.ModelSerializer):

    patient = TodayVisitPatientSerializer()

    doctor = TodayVisitDoctorSerializer()

    services = ServiceSerializer(many=True)

    payment_method_display = serializers.SerializerMethodField()

    class Meta:

        model = PatientVisit
        fields = (
            'id',
            'patient',
            'doctor',
            'services',
            'queue',
            'status',
            'total_price',
            'payment_method',
            'payment_method_display',
            'created_at'
        )

    def get_payment_method_display(self, instance) -> str | None:

        return instance.get_payment_method_display() if instance.payment_method else None
