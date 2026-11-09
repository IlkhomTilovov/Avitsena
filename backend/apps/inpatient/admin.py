from apps.inpatient.models import Room, Bed, Admission
from django.contrib import admin


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):

    list_display = (
        'name',
        'clinic',
        'room_type',
        'daily_price',
        'is_active'
    )

    list_filter = (
        'clinic',
        'room_type',
        'is_active'
    )


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):

    list_display = (
        'name',
        'room',
        'is_active'
    )


@admin.register(Admission)
class AdmissionAdmin(admin.ModelAdmin):

    list_display = (
        'patient',
        'bed',
        'status',
        'admitted_at',
        'discharged_at'
    )

    list_filter = (
        'clinic',
        'status'
    )
