from django.db import migrations


def backfill_patient_number(apps, schema_editor):

    Patient = apps.get_model('patients', 'Patient')
    Clinic = apps.get_model('clinics', 'Clinic')

    for clinic in Clinic.objects.all():

        patients = Patient.objects \
            .filter(clinic=clinic) \
            .order_by('created_at')

        number = 1

        for patient in patients:

            patient.number = number

            patient.save(update_fields=['number'])

            number += 1


def noop_reverse(apps, schema_editor):

    pass


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0009_patient_number_patient_unique_clinic_patient_number'),
    ]

    operations = [
        migrations.RunPython(backfill_patient_number, noop_reverse),
    ]
