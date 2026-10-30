from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.shared.models import AbstractBaseModel
from apps.shared.choices import (
    PaymentMethod,
    ExpenseCategory,
    ExpenseStatus,
    UserRole
)


class Expense(AbstractBaseModel):

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='expenses'
    )

    category = models.CharField(
        max_length=15,
        choices=ExpenseCategory.choices
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
