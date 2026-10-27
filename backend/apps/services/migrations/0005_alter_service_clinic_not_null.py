import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0002_backfill_default_clinic'),
        ('services', '0004_service_clinic_servicecategory_clinic_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='service',
            name='clinic',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='services', to='clinics.clinic'),
        ),
        migrations.AlterField(
            model_name='servicecategory',
            name='clinic',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='service_categories', to='clinics.clinic'),
        ),
    ]
