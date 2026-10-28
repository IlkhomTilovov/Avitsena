from django.db import models, transaction
from apps.shared.models import AbstractBaseModel
from apps.patients.choices import (
    BloodGroup,
    PatientVisitStatus,
    DocumentType
)
from apps.shared.choices import UserGender, UserRole
from apps.shared.choices import StatusTextChoices
from django.utils.translation import gettext_lazy as _
from apps.patients.utils import upload_to_uuid
import uuid


class Patient(AbstractBaseModel):

    clinic = models.ForeignKey(
        'clinics.Clinic',
        related_name='patients',
        on_delete=models.CASCADE
    )

    number = models.PositiveIntegerField(
        editable=False,
        null=True
    )

    first_name = models.CharField(
        max_length=150
    )

    last_name = models.CharField(
        max_length=150
    )

    middle_name = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    phone = models.CharField(
        max_length=13,
        null=True
    )

    home_phone = models.CharField(
        max_length=13,
        blank=True,
        null=True
    )

    gender = models.CharField(
        default=6,
        choices=UserGender.choices
    )

    blood_group = models.CharField(
        max_length=3,
        choices=BloodGroup.choices,
        blank=True,
        null=True
    )

    date_of_birth = models.DateField()

    country = models.CharField(
        max_length=150,
        default='uz'
    )

    region = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    address = models.TextField(
        blank=True,
        null=True
    )

    height = models.FloatField(
        blank=True,
        null=True
    )

    weight = models.FloatField(
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=8,
        default=StatusTextChoices.ACTIVE,
        choices=StatusTextChoices.choices
    )

    document_type = models.CharField(
        max_length=15,
        choices=DocumentType.choices,
        blank=True,
        null=True
    )

    is_returning = models.BooleanField(default=False)

    class Meta:

        db_table = 'patients'
        verbose_name = _('Partient')
        verbose_name_plural = _('Partients')
        ordering = ('-created_at', )
        constraints = [
            models.UniqueConstraint(fields=['clinic', 'number'], name='unique_clinic_patient_number')
        ]

    @property
    def code(self):

        if self.number is None:

            return None

        return f'AV-{self.number:04d}'

    def save(self, *args, **kwargs):

        if self.number is None:

            with transaction.atomic():

                last = Patient.objects \
                    .select_for_update() \
                    .filter(clinic=self.clinic) \
                    .order_by('-number') \
                    .first()

                self.number = (last.number if last and last.number else 0) + 1

        super().save(*args, **kwargs)


class PatientPasport(models.Model):

    patient = models.OneToOneField(
        Patient,
        on_delete=models.CASCADE,
        related_name='pasport'
    )

    series = models.CharField(max_length=2)

    number = models.CharField(max_length=7)

    jshr = models.CharField(max_length=14)

    issued_by = models.CharField(max_length=255)

    issued_date = models.DateField()

    expiry_date = models.DateField()

    class Meta:

        db_table = 'patient_pasports'
        verbose_name = _('Patient pasport')
        verbose_name_plural = _('Patient pasports')


class PatientIDCard(models.Model):

    patient = models.OneToOneField(
        Patient,
        on_delete=models.CASCADE,
        related_name='idcard'
    )

    series = models.CharField(max_length=2)

    number = models.CharField(max_length=7)

    jshr = models.CharField(max_length=14)

    issued_by = models.CharField(max_length=255)

    issued_date = models.DateField()

    expiry_date = models.DateField()

    class Meta:
        
        db_table = 'patient_idcards'
        verbose_name = _('Patient IDCard')
        verbose_name_plural = _('Patient IDCards')


class PatientDriverLicense(models.Model):

    patient = models.OneToOneField(
        Patient,
        on_delete=models.CASCADE,
        related_name='driver_license'
    )

    number = models.CharField(
        max_length=50,
        unique=True
    )

    jshr = models.CharField(max_length=14)

    class Meta:

        db_table = 'patient_driver_licenses'
        verbose_name = _('Patient driver license')
        verbose_name_plural = _('Patient driver licenses')


class PatientVisit(AbstractBaseModel):

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='visits'
    )

    registrator = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={
            'role__in': [
                UserRole.ADMIN, 
                UserRole.REGISTRATOR
            ]
        },
        related_name='registered_visits'
    )

    doctor = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='doctor_visits',
        limit_choices_to={'role': UserRole.DOCTOR}
    )

    services = models.ManyToManyField(
        'services.Service',
        blank=True
    )

    queue = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    file = models.FileField(
        upload_to=upload_to_uuid,
        blank=True,
        null=True
    )

    diagnosis = models.TextField(
        blank=True,
        null=True
    )

    total_price = models.IntegerField(default=0)

    status = models.CharField(
        choices=PatientVisitStatus.choices,
        default=PatientVisitStatus.PENDING
    )

    class Meta:
        db_table = 'patient_visits'
        verbose_name = _('Patient visit')
        verbose_name_plural = _('Patient visits')
        ordering = ('-created_at', )


class PatientVisitRecipe(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    visit = models.ForeignKey(
        PatientVisit,
        on_delete=models.CASCADE,
        related_name='recipes'
    )

    name = models.CharField(
        max_length=255
    )

    description = models.TextField(
        blank=True,
        null=True
    )

    class Meta:

        db_table = 'patient_visit_recipes'
        verbose_name = _('Patient visit recipe')
        verbose_name_plural = _('Patient visit recipes')

