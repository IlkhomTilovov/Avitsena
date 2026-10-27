from rest_framework import serializers
from apps.services.models import (
    Service,
    ServiceCategory
)


class ServiceSerializer(serializers.ModelSerializer):

    class Meta:

        model = Service
        fields = (
            'id',
            'name',
            'price'
        )


class ServiceItemSerializer(serializers.Serializer):

    name = serializers.CharField()
    price = serializers.FloatField()


class ServiceCategoryDetailSerializer(serializers.ModelSerializer):

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


class ServiceDetailSerializer(serializers.ModelSerializer):

    class Meta:

        model = Service
        fields = (
            'id',
            'name',
            'category',
            'price'
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
