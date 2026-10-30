from apps.finance.models import Expense
from django.contrib import admin


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'clinic',
        'category',
        'title',
        'amount',
        'status',
        'date'
    )

    list_filter = (
        'category',
        'status',
        'payment_method'
    )
