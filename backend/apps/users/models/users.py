from django.db import models
from django.contrib.auth.models import AbstractUser
from apps.shared.models import AbstractBaseModel
from apps.users.choices import (
    UserStatus
)
from apps.shared.choices import UserRole
from apps.users.managers import CustomUserManager
from django.utils.translation import gettext_lazy as _


class CustomUser(AbstractUser, AbstractBaseModel):

    role = models.CharField(
        max_length=15,
        choices=UserRole.choices
    )

    status = models.CharField(
        max_length=8,
        default=UserStatus.ACTIVE,
        choices=UserStatus.choices
    )

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.SET_NULL,
        related_name='users',
        null=True,
        blank=True
    )

    username = models.CharField(
        max_length=150
    )

    fio = models.CharField(
        max_length=255
    )

    phone = models.CharField(
        max_length=13,
        unique=True
    )

    more = models.TextField(
        blank=True,
        null=True
    )

    objects = CustomUserManager()

    REQUIRED_FIELDS = (
        'username',
    )

    USERNAME_FIELD = 'phone'

    class Meta:

        db_table = 'users'
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        ordering = ('-created_at', )
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['status']),
            models.Index(fields=['fio']),
            models.Index(fields=['phone'])
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['username', 'clinic'],
                name='unique_username_per_clinic'
            )
        ]


class Doctor(models.Model):

    user = models.OneToOneField(
        CustomUser,
        related_name='doctor',
        on_delete=models.CASCADE,
        limit_choices_to={'role': UserRole.DOCTOR}
    )

    room_number = models.PositiveIntegerField(
        null=True
    )

    experience_year = models.FloatField(
        blank=True,
        null=True
    )

    services = models.ManyToManyField(
        'services.Service'
    )

    class Meta:

        db_table = 'doctors'
        verbose_name = _('Doctor')
        verbose_name_plural = _('Doctors')


# class DoctorService(models.Model):

#     id = models.UUIDField(
#         primary_key=True,
#         default=uuid.uuid4,
#         editable=False
#     )

#     doctor = models.ForeignKey(
#         Doctor,
#         on_delete=models.CASCADE,
#         related_name='services'
#     )

#     service = models.ForeignKey(
#         'services.Service',
#         on_delete=models.CASCADE
#     )

#     class Meta:
#         db_table = 'doctor_services'
#         verbose_name = _('Doctor service')
#         verbose_name_plural = _('Doctor services')

    
