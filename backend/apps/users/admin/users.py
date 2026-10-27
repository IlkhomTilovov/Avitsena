from apps.users.models import CustomUser
from django.contrib import admin

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'username'
    )
