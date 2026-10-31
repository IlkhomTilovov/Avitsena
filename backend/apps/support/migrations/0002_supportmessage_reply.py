# Generated manually to add admin reply support (app + Telegram) to SupportMessage

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('support', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='supportmessage',
            name='telegram_message_id',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='supportmessage',
            name='reply',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='supportmessage',
            name='replied_by',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='supportmessage',
            name='replied_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='supportmessage',
            name='reply_source',
            field=models.CharField(
                blank=True,
                choices=[('app', 'App'), ('telegram', 'Telegram')],
                max_length=16,
                null=True,
            ),
        ),
    ]
