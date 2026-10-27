from django.db.models import TextChoices
from django.utils.translation import gettext_lazy as _


class UserGender(TextChoices):
    MALE = 'male', _('Male')
    FEMALE = 'female', _('Female')


class UserRole(TextChoices):
    SUPERADMIN = 'superadmin', _('Super admin')
    ADMIN = 'admin', _('Admin')
    REGISTRATOR = 'registrator', _('Registrator')
    DOCTOR = 'doctor', _('Doctor')


class StatusTextChoices(TextChoices):
    ACTIVE = 'active', _('Active')
    INACTIVE = 'inactive', _('Inactive')