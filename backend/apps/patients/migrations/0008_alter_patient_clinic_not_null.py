import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0002_backfill_default_clinic'),
        ('patients', '0007_patient_clinic'),
    ]

    operations = [
        migrations.AlterField(
            model_name='patient',
            name='clinic',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='patients', to='clinics.clinic'),
        ),
    ]
