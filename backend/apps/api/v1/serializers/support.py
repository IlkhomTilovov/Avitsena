from rest_framework import serializers
from apps.support.models import SupportMessage


class SupportMessageCreateSerializer(serializers.ModelSerializer):

    class Meta:

        model = SupportMessage
        fields = (
            'id',
            'message',
            'created_at'
        )
        read_only_fields = ('id', 'created_at')

    def validate_message(self, value):

        value = value.strip()

        if not value:

            raise serializers.ValidationError("Xabar matni kiritilishi kerak.")

        return value

    def create(self, validated_data):

        request = self.context['request']

        return SupportMessage.objects.create(
            clinic=request.user.clinic,
            user=request.user,
            **validated_data
        )
