from rest_framework import serializers
from apps.services.models import (
    Service,
    ServiceCategory
)


class ServiceDoctorSerializer(serializers.Serializer):

    id = serializers.UUIDField()
    fio = serializers.CharField()


class ServiceSerializer(serializers.ModelSerializer):

    doctors = serializers.SerializerMethodField()

    class Meta:

        model = Service
        fields = (
            'id',
            'name',
            'price',
            'duration_minutes',
            'is_active',
            'doctors'
        )

    def get_doctors(self, instance) -> ServiceDoctorSerializer(many=True):

        return [
            {'id': doctor.user_id, 'fio': doctor.user.fio}
            for doctor in instance.doctor_set.select_related('user').all()
        ]


class ServiceItemSerializer(serializers.Serializer):

    name = serializers.CharField()
    price = serializers.FloatField()
    duration_minutes = serializers.IntegerField(required=False, allow_null=True)


class ServiceCategoryDetailSerializer(serializers.ModelSerializer):

    services = ServiceSerializer(
        many=True,
        read_only=True
    )

    service_count = serializers.SerializerMethodField()

    active_count = serializers.SerializerMethodField()

    doctor_count = serializers.SerializerMethodField()

    price_min = serializers.SerializerMethodField()

    price_max = serializers.SerializerMethodField()

    class Meta:

        model = ServiceCategory
        fields = (
            'id',
            'name',
            'services',
            'service_count',
            'active_count',
            'doctor_count',
            'price_min',
            'price_max'
        )

    def get_service_count(self, instance) -> int:

        return len(instance.services.all())

    def get_active_count(self, instance) -> int:

        return len([s for s in instance.services.all() if s.is_active])

    def get_doctor_count(self, instance) -> int:

        doctor_ids = set()

        for service in instance.services.all():

            for doctor in service.doctor_set.all():

                doctor_ids.add(doctor.user_id)

        return len(doctor_ids)

    def get_price_min(self, instance) -> float | None:

        prices = [s.price for s in instance.services.all()]

        return min(prices) if prices else None

    def get_price_max(self, instance) -> float | None:

        prices = [s.price for s in instance.services.all()]

        return max(prices) if prices else None


class ServiceDetailSerializer(serializers.ModelSerializer):

    class Meta:

        model = Service
        fields = (
            'id',
            'name',
            'category',
            'price',
            'duration_minutes',
            'is_active'
        )
        read_only_fields = (
            'id',
        )


class ServiceListCreateSerializer(serializers.ModelSerializer):

    class Meta:

        model = Service
        fields = (
            'id',
            'category',
            'name',
            'price',
            'is_active'
        )


class ServiceCreateSerializer(serializers.ModelSerializer):

    services = ServiceItemSerializer(
        many=True
    )

    class Meta:

        model = Service
        fields = (
            'category',
            'services'
        )
    
    def validate(self, attrs):

        services = attrs['services']
        category = attrs['category']

        request = self.context.get('request')

        if request and category.clinic_id != request.user.clinic_id:

            raise serializers.ValidationError('Category not found.')

        service_names = [
            service['name'] for service in services
        ]

        is_exists = Service.objects \
            .filter(
                category=category,
                name__in=service_names) \
            .exists()
        
        if is_exists:

            raise serializers.ValidationError('Some services are already available, please check and try again.')

        return attrs
  
        
class ServiceCategoryListCreateSerializer(serializers.ModelSerializer):

    services = ServiceSerializer(
        many=True,
        read_only=True
    )

    class Meta:

        model = ServiceCategory
        fields = (
            'id',
            'name',
            'services'
        )
