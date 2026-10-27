from rest_framework import serializers
from django.db import transaction
from apps.clinics.models import Clinic
from apps.users.models import CustomUser
from apps.shared.choices import UserRole


class ClinicAdminCreateSerializer(serializers.Serializer):

    fio = serializers.CharField(max_length=255)

    username = serializers.CharField(max_length=150)

    phone = serializers.CharField(max_length=13)

    password = serializers.CharField(
        min_length=8,
        max_length=128
    )

    def validate_phone(self, value):

        if CustomUser.objects.filter(phone=value).exists():

            raise serializers.ValidationError('User with this phone already exists.')

        return value


class ClinicListSerializer(serializers.ModelSerializer):

    class Meta:

        model = Clinic
        fields = (
            'id',
            'name',
            'phone',
            'address',
            'status',
            'created_at'
        )


class ClinicDetailSerializer(serializers.ModelSerializer):

    class Meta:

        model = Clinic
        fields = (
            'id',
            'name',
            'phone',
            'address',
            'status',
            'created_at',
            'updated_at'
        )
        read_only_fields = (
            'created_at',
            'updated_at'
        )


class ClinicCreateSerializer(serializers.ModelSerializer):

    admin = ClinicAdminCreateSerializer(
        write_only=True
    )

    class Meta:

        model = Clinic
        fields = (
            'id',
            'name',
            'phone',
            'address',
            'status',
            'admin'
        )
        read_only_fields = (
            'status',
        )

    def create(self, validated_data):

        admin_data = validated_data.pop('admin')

        with transaction.atomic():

            clinic = Clinic.objects.create(**validated_data)

            CustomUser.objects.create_user(
                role=UserRole.ADMIN,
                clinic=clinic,
                **admin_data
            )

        return clinic
