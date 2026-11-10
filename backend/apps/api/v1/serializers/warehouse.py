from decimal import Decimal
from rest_framework import serializers
from apps.shared.choices import PAYMENT_METHODS_IN_USE, StockMovementType
from apps.warehouse.models import WarehouseItem, StockMovement


def quantity_field(**kwargs):

    # Miqdor JSON'da matn emas, son bo'lib borishi uchun
    return serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=False,
        **kwargs
    )


class WarehouseItemSerializer(serializers.ModelSerializer):

    category_display = serializers.CharField(source='get_category_display', read_only=True)

    quantity = quantity_field(read_only=True)

    min_quantity = quantity_field(read_only=True)

    value = serializers.SerializerMethodField()

    stock_status = serializers.SerializerMethodField()

    class Meta:

        model = WarehouseItem
        fields = (
            'id',
            'name',
            'category',
            'category_display',
            'unit',
            'quantity',
            'min_quantity',
            'last_price',
            'value',
            'stock_status',
            'is_active'
        )

    def get_value(self, instance) -> int:

        return int(instance.quantity * instance.last_price)

    def get_stock_status(self, instance) -> str:

        if instance.quantity <= 0:

            return 'out'

        if instance.quantity <= instance.min_quantity:

            return 'low'

        return 'ok'


class WarehouseItemWriteSerializer(serializers.ModelSerializer):

    min_quantity = quantity_field(min_value=Decimal('0'), required=False)

    class Meta:

        model = WarehouseItem
        fields = (
            'name',
            'category',
            'unit',
            'min_quantity',
            'is_active'
        )

    def validate_name(self, value):

        value = value.strip()

        if not value:

            raise serializers.ValidationError('Mahsulot nomini kiriting.')

        is_exists = WarehouseItem.objects \
            .filter(clinic=self.context['clinic'], name__iexact=value) \
            .exclude(id=getattr(self.instance, 'id', None)) \
            .exists()

        if is_exists:

            raise serializers.ValidationError('Bu nomli mahsulot omborda bor.')

        return value

    def validate_unit(self, value):

        value = value.strip()

        if not value:

            raise serializers.ValidationError("O'lchov birligini kiriting.")

        return value


class StockMovementSerializer(serializers.ModelSerializer):

    item_name = serializers.CharField(source='item.name', read_only=True)

    unit = serializers.CharField(source='item.unit', read_only=True)

    type_display = serializers.CharField(source='get_type_display', read_only=True)

    change = quantity_field(read_only=True)

    balance_after = quantity_field(read_only=True)

    total = serializers.SerializerMethodField()

    created_by = serializers.CharField(source='created_by.fio', read_only=True, default=None)

    class Meta:

        model = StockMovement
        fields = (
            'id',
            'item',
            'item_name',
            'unit',
            'type',
            'type_display',
            'change',
            'balance_after',
            'unit_price',
            'total',
            'payment_method',
            'supplier',
            'expiry_date',
            'note',
            'date',
            'created_by',
            'created_at'
        )

    def get_total(self, instance) -> int | None:

        if instance.unit_price is None:

            return None

        return int(abs(instance.change) * instance.unit_price)


class StockMovementCreateSerializer(serializers.Serializer):

    item = serializers.PrimaryKeyRelatedField(queryset=WarehouseItem.objects.all())

    type = serializers.ChoiceField(choices=StockMovementType.choices)

    # Kirim/chiqimda harakat miqdori, inventarizatsiyada sanalgan haqiqiy qoldiq
    quantity = quantity_field(min_value=Decimal('0'))

    unit_price = serializers.IntegerField(min_value=0, required=False, allow_null=True)

    payment_method = serializers.ChoiceField(
        choices=PAYMENT_METHODS_IN_USE,
        required=False,
        allow_null=True
    )

    supplier = serializers.CharField(required=False, allow_blank=True, max_length=255)

    expiry_date = serializers.DateField(required=False, allow_null=True)

    note = serializers.CharField(required=False, allow_blank=True)

    date = serializers.DateField(required=False)

    def validate_item(self, value):

        if value.clinic_id != self.context['clinic'].id:

            raise serializers.ValidationError('Mahsulot topilmadi.')

        if not value.is_active:

            raise serializers.ValidationError('Bu mahsulot nofaol.')

        return value

    def validate(self, attrs):

        movement_type = attrs['type']
        quantity = attrs['quantity']

        if movement_type != StockMovementType.ADJUST and quantity <= 0:

            raise serializers.ValidationError({'quantity': "Miqdor noldan katta bo'lishi kerak."})

        if movement_type == StockMovementType.IN and attrs.get('unit_price') and not attrs.get('payment_method'):

            raise serializers.ValidationError({'payment_method': "Xarid uchun to'lov turini tanlang: naqd yoki karta."})

        if movement_type == StockMovementType.WRITE_OFF and not attrs.get('note', '').strip():

            raise serializers.ValidationError({'note': 'Hisobdan chiqarish sababini yozing.'})

        return attrs
