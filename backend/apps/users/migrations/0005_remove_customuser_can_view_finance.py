from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_customuser_can_view_finance'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='customuser',
            name='can_view_finance',
        ),
    ]
