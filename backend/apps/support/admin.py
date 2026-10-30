from apps.support.models import SupportMessage
from django.contrib import admin


@admin.register(SupportMessage)
class SupportMessageAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'clinic',
        'user',
        'delivered',
        'created_at'
    )

    list_filter = (
        'delivered',
        'clinic'
    )
