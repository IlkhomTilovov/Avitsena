from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.shared.models import AbstractBaseModel
from apps.shared.choices import WarehouseCategory, StockMovementType


class WarehouseItem(AbstractBaseModel):

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='warehouse_items'
    )

    name = models.CharField(
        max_length=255
    )

    category = models.CharField(
        max_length=15,
        choices=WarehouseCategory.choices,
        default=WarehouseCategory.MEDICINE
    )

    unit = models.CharField(
        max_length=20,
        default='dona'
    )

    # Qoldiq har bir harakatda shu yerda yangilanadi, tarix esa StockMovement'da
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0')
    )

    # Qoldiq shundan kam bo'lsa "Kam qoldi" deb ogohlantiriladi
    min_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0')
    )

    # Oxirgi kirimdagi bir birlik narxi, ombor qiymatini hisoblash uchun
    last_price = models.PositiveIntegerField(
        default=0
    )

    is_active = models.BooleanField(
        default=True
    )

    class Meta:

        db_table = 'warehouse_items'
        verbose_name = _('Warehouse item')
        verbose_name_plural = _('Warehouse items')
        ordering = ('name', )
        constraints = [
            models.UniqueConstraint(fields=['clinic', 'name'], name='unique_clinic_warehouse_item_name')
        ]


class StockMovement(AbstractBaseModel):

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='stock_movements'
    )

    item = models.ForeignKey(
        WarehouseItem,
        on_delete=models.CASCADE,
        related_name='movements'
    )

    type = models.CharField(
        max_length=10,
        choices=StockMovementType.choices
    )

    # Kirimda musbat, chiqim va hisobdan chiqarishda manfiy, inventarizatsiyada farq
    change = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    balance_after = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    unit_price = models.PositiveIntegerField(
        blank=True,
        null=True
    )

    supplier = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    expiry_date = models.DateField(
        blank=True,
        null=True
    )

    note = models.TextField(
        blank=True,
        null=True
    )

    date = models.DateField(
        default=timezone.localdate
    )

    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_movements'
    )

    class Meta:

        db_table = 'warehouse_stock_movements'
        verbose_name = _('Stock movement')
        verbose_name_plural = _('Stock movements')
        ordering = ('-date', '-created_at')
        indexes = [
            models.Index(fields=['clinic', 'date']),
            models.Index(fields=['clinic', 'type'])
        ]
