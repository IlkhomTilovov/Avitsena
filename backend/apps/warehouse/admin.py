from apps.warehouse.models import WarehouseItem, StockMovement
from django.contrib import admin


@admin.register(WarehouseItem)
class WarehouseItemAdmin(admin.ModelAdmin):

    list_display = (
        'name',
        'clinic',
        'category',
        'quantity',
        'unit',
        'min_quantity',
        'is_active'
    )

    list_filter = (
        'clinic',
        'category',
        'is_active'
    )


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):

    list_display = (
        'item',
        'type',
        'change',
        'balance_after',
        'date',
        'created_by'
    )

    list_filter = (
        'clinic',
        'type'
    )
