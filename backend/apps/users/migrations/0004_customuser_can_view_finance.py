from django.db import migrations, models


FINANCE_OWNER_USERNAME = 'admin'


def grant_finance_access(apps, schema_editor):

    CustomUser = apps.get_model('users', 'CustomUser')

    # Same lookup as LoginView, so this is the account that logs in with this username.
    owner = CustomUser.objects \
        .filter(username=FINANCE_OWNER_USERNAME, status='active') \
        .order_by('-created_at') \
        .first()

    if owner:

        owner.can_view_finance = True
        owner.save(update_fields=['can_view_finance'])


def noop_reverse(apps, schema_editor):

    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_customuser_clinic_alter_customuser_role_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='can_view_finance',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(grant_finance_access, noop_reverse),
    ]
