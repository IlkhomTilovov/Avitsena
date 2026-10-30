from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.shared.models import AbstractBaseModel


class SupportMessage(AbstractBaseModel):

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='support_messages'
    )

    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='support_messages'
    )

    message = models.TextField()

    delivered = models.BooleanField(
        default=False
    )

    class Meta:

        db_table = 'support_messages'
        verbose_name = _('Support message')
        verbose_name_plural = _('Support messages')
        ordering = ('-created_at', )
