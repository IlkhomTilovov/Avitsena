from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.shared.models import AbstractBaseModel
from apps.shared.choices import AdmissionStatus


class Room(AbstractBaseModel):

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='rooms'
    )

    name = models.CharField(
        max_length=100
    )

    daily_price = models.PositiveIntegerField(
        default=0
    )

    is_active = models.BooleanField(
        default=True
    )

    class Meta:

        db_table = 'inpatient_rooms'
        verbose_name = _('Room')
        verbose_name_plural = _('Rooms')
        ordering = ('name', )
        constraints = [
            models.UniqueConstraint(fields=['clinic', 'name'], name='unique_clinic_room_name')
        ]


class Bed(AbstractBaseModel):

    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='beds'
    )

    name = models.CharField(
        max_length=50
    )

    is_active = models.BooleanField(
        default=True
    )

    class Meta:

        db_table = 'inpatient_beds'
        verbose_name = _('Bed')
        verbose_name_plural = _('Beds')
        ordering = ('name', )
        constraints = [
            models.UniqueConstraint(fields=['room', 'name'], name='unique_room_bed_name')
        ]


class Admission(AbstractBaseModel):

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='admissions'
    )

    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='admissions'
    )

    bed = models.ForeignKey(
        Bed,
        on_delete=models.PROTECT,
        related_name='admissions'
    )

    doctor = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inpatient_admissions'
    )

    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_admissions'
    )

    status = models.CharField(
        max_length=12,
        choices=AdmissionStatus.choices,
        default=AdmissionStatus.ACTIVE
    )

    admitted_at = models.DateTimeField(
        default=timezone.now
    )

    discharged_at = models.DateTimeField(
        blank=True,
        null=True
    )

    # Narx yotqizilgan paytdagi xona narxidan olinadi, keyin xona narxi o'zgarsa ham saqlanib qoladi
    daily_price = models.PositiveIntegerField(
        default=0
    )

    reason = models.TextField(
        blank=True,
        null=True
    )

    discharge_diagnosis = models.TextField(
        blank=True,
        null=True
    )

    discharge_notes = models.TextField(
        blank=True,
        null=True
    )

    class Meta:

        db_table = 'inpatient_admissions'
        verbose_name = _('Admission')
        verbose_name_plural = _('Admissions')
        ordering = ('-admitted_at', )
        indexes = [
            models.Index(fields=['clinic', 'status'])
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['bed'],
                condition=Q(status=AdmissionStatus.ACTIVE),
                name='unique_active_admission_per_bed'
            ),
            models.UniqueConstraint(
                fields=['patient'],
                condition=Q(status=AdmissionStatus.ACTIVE),
                name='unique_active_admission_per_patient'
            )
        ]

    @property
    def days(self) -> int:

        # Kelgan kun hisoblanadi, ketgan kun hisoblanmaydi; kamida 1 kun
        end = self.discharged_at or timezone.now()

        return max(
            1,
            (timezone.localdate(end) - timezone.localdate(self.admitted_at)).days
        )

    @property
    def stay_total(self) -> int:

        return self.days * self.daily_price

    @property
    def services_total(self) -> int:

        return sum(item.price * item.quantity for item in self.services.all())

    @property
    def total(self) -> int:

        return self.stay_total + self.services_total


class AdmissionNote(AbstractBaseModel):

    admission = models.ForeignKey(
        Admission,
        on_delete=models.CASCADE,
        related_name='notes'
    )

    text = models.TextField()

    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admission_notes'
    )

    class Meta:

        db_table = 'inpatient_admission_notes'
        verbose_name = _('Admission note')
        verbose_name_plural = _('Admission notes')
        ordering = ('-created_at', )


class AdmissionService(AbstractBaseModel):

    admission = models.ForeignKey(
        Admission,
        on_delete=models.CASCADE,
        related_name='services'
    )

    service = models.ForeignKey(
        'services.Service',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # Xizmat keyin o'zgartirilsa yoki o'chirilsa ham hisob o'zgarmasligi uchun
    name = models.CharField(
        max_length=255
    )

    price = models.PositiveIntegerField()

    quantity = models.PositiveIntegerField(
        default=1
    )

    date = models.DateField(
        default=timezone.localdate
    )

    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admission_services'
    )

    class Meta:

        db_table = 'inpatient_admission_services'
        verbose_name = _('Admission service')
        verbose_name_plural = _('Admission services')
        ordering = ('-date', '-created_at')
