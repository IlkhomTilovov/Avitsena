from rest_framework import serializers
from apps.users.models import CustomUser, Doctor
from rest_framework_simplejwt.tokens import RefreshToken
from apps.shared.choices import UserRole
from .services import ServiceCategoryDetailSerializer
from drf_spectacular.utils import extend_schema_field
from typing import List, Dict
from apps.patients.models import PatientVisit
from collections import defaultdict
from django.utils import timezone   
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from datetime import timedelta


class DoctorUpdateCreateSerializer(serializers.ModelSerializer):

    class Meta:

        model = Doctor
        fields = (
            'experience_year',
            'room_number',
            'services',
        )
    

class DoctorSerializer(serializers.ModelSerializer):

    class Meta:

        model = Doctor
        fields = (
            'experience_year',
            'room_number'
        )


class DoctorDetailSerializer(serializers.ModelSerializer):

    categories = serializers.SerializerMethodField()

    patients_stats = serializers.SerializerMethodField()

    class Meta:

        model = Doctor
        fields = (
            'categories',
            'experience_year',
            'room_number',
            'patients_stats'
        )
    
    def get_patients_stats(self, instance):

        end_date = timezone.now().date()

        start_date = end_date - timedelta(days=30)

        visits = PatientVisit.objects \
            .filter(
                doctor=instance.user,
                created_at__date__range=(start_date, end_date)
            )
        
        total_patients = visits.values('patient') \
            .distinct() \
            .count()
        
        total_visits = visits.count()

        total_revenue = visits \
            .aggregate(Sum('total_price'))['total_price__sum']
        
        daily_stats = visits.annotate(visit_date=TruncDate('created_at')) \
            .values('visit_date') \
            .annotate(
                visit_count=Count('id'),
                patient_count=Count('patient', distinct=True),
                revenue=Sum('total_price')
            ) \
            .order_by('visit_date')
        
        daily_data = {
            item['visit_date']: {
                'visit_count': item['visit_count'],
                'patient_count': item['patient_count'],
                'revenue': item['revenue']
            }
            for item in daily_stats
        }

        date_range = []

        current_date = start_date

        while current_date <= end_date:

            date_range.append({
                'date': current_date,
                'visit_count': daily_data.get(current_date, {}).get('visit_count', 0),
                'patient_count': daily_data.get(current_date, {}).get('patient_count', 0),
                'revenue': daily_data.get(current_date, {}).get('revenue', 0.0),
            })

            current_date += timedelta(days=1)

        return {
            'total_visits': total_visits,
            'total_patients': total_patients,
            'total_revenue': total_revenue,
            'daily_stats': date_range
        }

    
    @extend_schema_field(ServiceCategoryDetailSerializer())
    def get_categories(self, instance) -> List[Dict]:

        categories = defaultdict(lambda: {
            "id": None,
            "name": None,
            "services": []
        })

        services = instance.services.all()

        for service in services:

            category = service.category

            if category is not None:

                categories[category.id]["id"] = category.id
                categories[category.id]["name"] = category.name
                categories[category.id]["services"].append({
                    "id": service.id,
                    "name": service.name,
                    "price": service.price
                })

        categories = list(categories.values())
        
        return categories


class UserPasswordSetSerializer(serializers.Serializer):

    new_password = serializers.CharField(
        min_length=8,
        max_length=128
    )


class UserPasswordChangeSerializer(serializers.Serializer):

    old_password = serializers.CharField(
        min_length=8,
        max_length=128
    )

    new_password = serializers.CharField(
        min_length=8,
        max_length=128
    )


class LogoutSerializer(serializers.Serializer):

    refresh_token = serializers.CharField()


class LoginSerializer(serializers.Serializer):

    login = serializers.CharField(max_length=150)

    password = serializers.CharField(max_length=128)


class UserDetailSerializer(serializers.ModelSerializer):

    doctor = DoctorDetailSerializer()

    class Meta:
        
        model = CustomUser
        fields = (
            'id',
            'fio',
            'username',
            'role',
            'phone',
            'doctor',
            'status',
            'more'
        )


class UserUpdateSerializer(serializers.ModelSerializer):

    doctor = DoctorUpdateCreateSerializer()

    class Meta:
        
        model = CustomUser
        fields = (
            'fio',
            'username',
            'role',
            'phone',
            'doctor',
            'status',
            'more'
        )
    
    def update(self, instance, validated_data):

        doctor_data = validated_data.pop('doctor', None)

        user = super().update(instance, validated_data)

        if hasattr(instance, 'doctor') and doctor_data:

            services = doctor_data.pop('services', None)

            Doctor.objects \
                .filter(user=instance) \
                .update(**doctor_data)
            
            instance.doctor.refresh_from_db()
            
            if services:

                instance.doctor.services.set(set(services))
            
        return user


class UserProfileSerializer(serializers.ModelSerializer):

    refresh_token = serializers.SerializerMethodField(read_only=True)

    access_token = serializers.SerializerMethodField(read_only=True)

    doctor = DoctorDetailSerializer()

    class Meta:
        
        model = CustomUser
        fields = (
            'id',
            'access_token',
            'refresh_token',
            'fio',
            'username',
            'role',
            'phone',
            'doctor',
            'status',
            'more'
        )
        read_only_fields = (
            'status',
            'role'
        )
    
    def get_refresh_token(self, instance) -> str:
         
        return str(RefreshToken.for_user(instance))
    
    def get_access_token(self, instance) -> str:
         
        return str(RefreshToken.for_user(instance).access_token)


class UserProfileUpdateSerializer(serializers.ModelSerializer):

    doctor = DoctorUpdateCreateSerializer()

    class Meta:
        
        model = CustomUser
        fields = (
            'fio',
            'username',
            'phone',
            'doctor',
            'more'
        )
    
    def update(self, instance, validated_data):

        doctor_data = validated_data.pop('doctor', None)

        user = super().update(instance, validated_data)

        if hasattr(instance, 'doctor') and doctor_data:

            services = doctor_data.pop('services', None)

            Doctor.objects \
                .filter(user=instance) \
                .update(**doctor_data)
            
            instance.doctor.refresh_from_db()
            
            if services:

                instance.doctor.services.set(set(services))
            
        return user
    

class UserListSerializer(serializers.ModelSerializer):

    doctor = DoctorSerializer()

    class Meta:
        
        model = CustomUser
        fields = (
            'id',
            'fio',
            'username',
            'role',
            'phone',
            'status',
            'doctor'
        )


class UserCreatSerializer(serializers.ModelSerializer):

    doctor = DoctorUpdateCreateSerializer(
        required=False,
        write_only=True,
        allow_null=True
    )

    password = serializers.CharField(
        min_length=8,
        max_length=128
    )

    class Meta:
        
        model = CustomUser
        fields = (
            'id',
            'fio',
            'username',
            'password',
            'role',
            'phone',
            'status',
            'doctor'
        )
        extra_kwargs = {
            'password': {
                'write_only': True
            }
        }
        read_only_fields = (
            'status',
        )

    def create(self, validated_data):

        doctor_data = validated_data.pop('doctor', None)

        validated_data['clinic'] = self.context['request'].user.clinic

        user = CustomUser.objects.create_user(**validated_data)

        if user.role == UserRole.DOCTOR and doctor_data:

            services = doctor_data.pop('services', [])

            doctor = Doctor.objects.create(user=user, **doctor_data)

            doctor.services.add(*services)
        
        return user
    