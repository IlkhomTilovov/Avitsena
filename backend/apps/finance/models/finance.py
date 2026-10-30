from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.shared.models import AbstractBaseModel
from apps.shared.choices import (
    PaymentMethod,
    ExpenseStatus,
    FinanceTransactionType,
    FinanceCategoryColor,
    UserRole
)


class FinanceCategory(AbstractBaseModel):

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='finance_categories'
    )

    type = models.CharField(
        max_length=10,
        choices=FinanceTransactionType.choices
    )

    name = models.CharField(
        max_length=150
    )

    icon = models.CharField(
        max_length=30,
        default='tag'
    )

    color = models.CharField(
        max_length=10,
        choices=FinanceCategoryColor.choices,
        default=FinanceCategoryColor.GRAY
    )

    is_system = models.BooleanField(
        default=False
    )

    archived = models.BooleanField(
        default=False
    )

    class Meta:

        db_table = 'finance_categories'
        verbose_name = _('Finance category')
        verbose_name_plural = _('Finance categories')
        ordering = ('-is_system', 'name')
        indexes = [
            models.Index(fields=['clinic', 'type']),
            models.Index(fields=['archived'])
        ]


class Expense(AbstractBaseModel):

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='expenses'
    )

    category = models.ForeignKey(
        FinanceCategory,
        on_delete=models.PROTECT,
        related_name='expenses',
        limit_choices_to={
            'type': FinanceTransactionType.CHIQIM
        }
    )

    title = models.CharField(
        max_length=255
    )

    amount = models.IntegerField()

    payment_method = models.CharField(
        max_length=15,
        choices=PaymentMethod.choices,
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=10,
        choices=ExpenseStatus.choices,
        default=ExpenseStatus.COMPLETED
    )

    date = models.DateField(
        default=timezone.localdate
    )

    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses',
        limit_choices_to={
            'role__in': [
                UserRole.ADMIN,
                UserRole.REGISTRATOR
            ]
        }
    )

    class Meta:

        db_table = 'expenses'
        verbose_name = _('Expense')
        verbose_name_plural = _('Expenses')
        ordering = ('-date', '-created_at')
        indexes = [
            models.Index(fields=['clinic', 'date']),
            models.Index(fields=['category']),
            models.Index(fields=['status'])
        ]
