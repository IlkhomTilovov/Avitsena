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

    telegram_message_id = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    reply = models.TextField(
        null=True,
        blank=True
    )

    replied_by = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    replied_at = models.DateTimeField(
        null=True,
        blank=True
    )

    REPLY_SOURCE_APP = 'app'
    REPLY_SOURCE_TELEGRAM = 'telegram'
    REPLY_SOURCE_CHOICES = (
        (REPLY_SOURCE_APP, 'App'),
        (REPLY_SOURCE_TELEGRAM, 'Telegram'),
    )

    reply_source = models.CharField(
        max_length=16,
        choices=REPLY_SOURCE_CHOICES,
        null=True,
        blank=True
    )

    class Meta:

        db_table = 'support_messages'
        verbose_name = _('Support message')
        verbose_name_plural = _('Support messages')
        ordering = ('-created_at', )
