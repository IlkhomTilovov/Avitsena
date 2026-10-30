from rest_framework import serializers
from apps.finance.models import Expense


class ExpenseSerializer(serializers.ModelSerializer):

    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )

    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    payment_method_display = serializers.CharField(
        source='get_payment_method_display',
        read_only=True
    )

    created_by = serializers.SerializerMethodField()

    class Meta:

        model = Expense
        fields = (
            'id',
            'category',
            'category_display',
            'title',
            'amount',
            'payment_method',
            'payment_method_display',
            'status',
            'status_display',
            'date',
            'created_by',
            'created_at'
        )

    def get_created_by(self, instance) -> str | None:

        return getattr(instance.created_by, 'fio', None)


class ExpenseCreateSerializer(serializers.ModelSerializer):

    class Meta:

        model = Expense
        fields = (
            'id',
            'category',
            'title',
            'amount',
            'payment_method',
            'date'
        )

    def validate_amount(self, value):

        if value <= 0:

            raise serializers.ValidationError("Summa noldan katta bo'lishi kerak.")

        return value

    def create(self, validated_data):

        request = self.context['request']

        validated_data.update({
            'clinic': request.user.clinic,
            'created_by': request.user
        })

        return Expense.objects.create(**validated_data)


class ExpenseUpdateSerializer(serializers.ModelSerializer):

    class Meta:

        model = Expense
        fields = (
            'category',
            'title',
            'amount',
            'payment_method',
            'status',
            'date'
        )

    def validate_amount(self, value):

        if value <= 0:

            raise serializers.ValidationError("Summa noldan katta bo'lishi kerak.")

        return value
