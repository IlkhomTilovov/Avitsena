from django.db import models
from apps.shared.models import AbstractBaseModel
from apps.shared.choices import StatusTextChoices
from django.utils.translation import gettext_lazy as _


class Clinic(AbstractBaseModel):

    name = models.CharField(
        max_length=255,
        unique=True
    )

    phone = models.CharField(
        max_length=13,
        blank=True,
        null=True
    )

    address = models.TextField(
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=8,
        default=StatusTextChoices.ACTIVE,
        choices=StatusTextChoices.choices
    )

    class Meta:

        db_table = 'clinics'
        verbose_name = _('Clinic')
        verbose_name_plural = _('Clinics')
        ordering = ('-created_at', )
