from django.db.models import TextChoices
from django.utils.translation import gettext_lazy as _


class BloodGroup(TextChoices):
    
    A_POSITIVE = 'A+', 'A+'
    A_NEGATIVE = 'A-', 'A-'
    B_POSITIVE = 'B+', 'B+'
    B_NEGATIVE = 'B-', 'B-'
    AB_POSITIVE = 'AB+', 'AB+'
    AB_NEGATIVE = 'AB-', 'AB-'
    O_POSITIVE = 'O+', 'O+'
    O_NEGATIVE = 'O-', 'O-'


class DocumentType(TextChoices):

    PASPORT = 'pasport', _('Pasport')
    IDCARD = 'idcard', _('IDCARD')
    DRIVER_LISENCE = 'driver_lisence', _('Driver lisence')


class PatientVisitStatus(TextChoices):

    PENDING = 'pending', _('Pending')
    IN_PROGRESS = 'in_progress', _('In progress')
    CANCELLED = 'cancelled', _('Cancelled')
    COMPLETED = 'completed', _('Completed')