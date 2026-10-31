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


class SupportMessageListSerializer(serializers.ModelSerializer):

    clinic_name = serializers.CharField(
        source='clinic.name',
        read_only=True
    )

    user_fio = serializers.CharField(
        source='user.fio',
        read_only=True,
        default=None
    )

    user_phone = serializers.CharField(
        source='user.phone',
        read_only=True,
        default=None
    )

    user_role = serializers.CharField(
        source='user.get_role_display',
        read_only=True,
        default=None
    )

    class Meta:

        model = SupportMessage
        fields = (
            'id',
            'clinic',
            'clinic_name',
            'user_fio',
            'user_phone',
            'user_role',
            'message',
            'delivered',
            'reply',
            'replied_by',
            'replied_at',
            'reply_source',
            'created_at'
        )


class SupportMessageReplySerializer(serializers.Serializer):

    reply = serializers.CharField()

    def validate_reply(self, value):

        value = value.strip()

        if not value:

            raise serializers.ValidationError("Javob matni kiritilishi kerak.")

        return value
