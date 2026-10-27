from django.db import migrations


DEFAULT_CLINIC_NAME = 'Titan Renesans'


def backfill_default_clinic(apps, schema_editor):

    Clinic = apps.get_model('clinics', 'Clinic')
    CustomUser = apps.get_model('users', 'CustomUser')
    Patient = apps.get_model('patients', 'Patient')
    ServiceCategory = apps.get_model('services', 'ServiceCategory')
    Service = apps.get_model('services', 'Service')

    has_unassigned_rows = (
        CustomUser.objects.filter(clinic__isnull=True).exists()
        or Patient.objects.filter(clinic__isnull=True).exists()
        or ServiceCategory.objects.filter(clinic__isnull=True).exists()
        or Service.objects.filter(clinic__isnull=True).exists()
    )

    if not has_unassigned_rows:

        return

    clinic, _ = Clinic.objects.get_or_create(
        name=DEFAULT_CLINIC_NAME
    )

    CustomUser.objects.filter(clinic__isnull=True).update(clinic=clinic)
    Patient.objects.filter(clinic__isnull=True).update(clinic=clinic)
    ServiceCategory.objects.filter(clinic__isnull=True).update(clinic=clinic)
    Service.objects.filter(clinic__isnull=True).update(clinic=clinic)


def noop_reverse(apps, schema_editor):

    pass


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0001_initial'),
        ('users', '0003_customuser_clinic_alter_customuser_role_and_more'),
        ('services', '0004_service_clinic_servicecategory_clinic_and_more'),
        ('patients', '0007_patient_clinic'),
    ]

    operations = [
        migrations.RunPython(backfill_default_clinic, noop_reverse),
    ]
