from rest_framework import serializers
from apps.finance.models import Expense, FinanceCategory
from apps.shared.choices import FinanceTransactionType, PAYMENT_METHODS_IN_USE


class FinanceCategorySerializer(serializers.ModelSerializer):

    type_display = serializers.CharField(
        source='get_type_display',
        read_only=True
    )

    class Meta:

        model = FinanceCategory
        fields = (
            'id',
            'type',
            'type_display',
            'name',
            'icon',
            'color',
            'is_system',
            'archived',
            'created_at'
        )


class FinanceCategoryCreateSerializer(serializers.ModelSerializer):

    class Meta:

        model = FinanceCategory
        fields = (
            'id',
            'type',
            'name',
            'icon',
            'color'
        )

    def validate_name(self, value):

        value = value.strip()

        if not value:

            raise serializers.ValidationError("Nomi kiritilishi kerak.")

        return value

    def create(self, validated_data):

        validated_data.update({
            'clinic': self.context['clinic']
        })

        return FinanceCategory.objects.create(**validated_data)


class FinanceCategoryUpdateSerializer(serializers.ModelSerializer):

    class Meta:

        model = FinanceCategory
        fields = (
            'name',
            'icon',
            'color',
            'archived'
        )

    def validate_name(self, value):

        value = value.strip()

        if not value:

            raise serializers.ValidationError("Nomi kiritilishi kerak.")

        return value

    def validate(self, attrs):

        if self.instance and self.instance.is_system:

            attrs.pop('archived', None)

        return attrs


class ExpenseSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source='category.name',
        read_only=True
    )

    category_icon = serializers.CharField(
        source='category.icon',
        read_only=True
    )

    category_color = serializers.CharField(
        source='category.color',
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

    type = serializers.CharField(source='category.type', read_only=True)

    class Meta:

        model = Expense
        fields = (
            'id',
            'type',
            'category',
            'category_name',
            'category_icon',
            'category_color',
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

    payment_method = serializers.ChoiceField(
        choices=PAYMENT_METHODS_IN_USE,
        error_messages={'required': "To'lov turini tanlang: naqd yoki karta."}
    )

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

    def validate_category(self, value):

        if value.clinic_id != self.context['clinic'].id:

            raise serializers.ValidationError("Kategoriya topilmadi.")

        # Qabul to'lovlari avtomatik hisoblanadi, ularni qo'lda kiritib bo'lmaydi
        if value.is_system:

            raise serializers.ValidationError("Bu kategoriyaga qo'lda yozib bo'lmaydi.")

        if value.archived:

            raise serializers.ValidationError("Bu kategoriya arxivlangan.")

        return value

    def create(self, validated_data):

        request = self.context['request']

        validated_data.update({
            'clinic': self.context['clinic'],
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

    def validate_category(self, value):

        if value.clinic_id != self.instance.clinic_id:

            raise serializers.ValidationError("Kategoriya topilmadi.")

        if value.is_system or value.type != self.instance.category.type:

            raise serializers.ValidationError("Kategoriya turi mos emas.")

        return value
