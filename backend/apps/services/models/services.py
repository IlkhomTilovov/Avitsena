from django.db import models
from django.utils.translation import gettext_lazy as _
import uuid


class ServiceCategory(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    clinic = models.ForeignKey(
        'clinics.Clinic',
        related_name='service_categories',
        on_delete=models.CASCADE
    )

    name = models.CharField(
        max_length=150
    )

    class Meta:

        db_table = 'service_categories'
        verbose_name = _('Service category')
        verbose_name_plural = _('Service categories')
        constraints = [
            models.UniqueConstraint(fields=['clinic', 'name'], name='unique_clinic_category_name')
        ]


class Service(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    clinic = models.ForeignKey(
        'clinics.Clinic',
        related_name='services',
        on_delete=models.CASCADE
    )

    category = models.ForeignKey(
        ServiceCategory,
        related_name='services',
        on_delete=models.CASCADE,
        null=True
    )

    name = models.CharField(
        max_length=255
    )
    
    price = models.FloatField()

    is_active = models.BooleanField(default=True)

    class Meta:

        db_table = 'services'
        verbose_name = _('Service')
        verbose_name_plural = _('Services')
        constraints = [
            models.UniqueConstraint(fields=['category', 'name'], name='unique_category_name')
        ]