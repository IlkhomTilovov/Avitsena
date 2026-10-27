from apps.clinics.models import Clinic
from django.contrib import admin


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'name',
        'status'
    )
