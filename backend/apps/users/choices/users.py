from django.db.models import TextChoices
from django.utils.translation import gettext_lazy as _


class UserStatus(TextChoices):
    ACTIVE = 'active', _('Active')
    INACTIVE = 'inactive', _('Inactive')

