from rest_framework import serializers
from apps.inpatient.models import Room, Bed, Admission, AdmissionNote, AdmissionService
from apps.patients.models import Patient
from apps.shared.choices import AdmissionStatus, StatusTextChoices, UserRole


class BedOccupantSerializer(serializers.Serializer):

    admission_id = serializers.UUIDField()
    patient_id = serializers.UUIDField()
    patient_fio = serializers.CharField()
    admitted_at = serializers.DateTimeField()


class BedSerializer(serializers.ModelSerializer):

    occupant = serializers.SerializerMethodField()

    class Meta:

        model = Bed
        fields = (
            'id',
            'name',
            'is_active',
            'occupant'
        )

    def get_occupant(self, instance) -> BedOccupantSerializer(allow_null=True):

        # active_admissions RoomListView tomonidan prefetch qilinadi
        admissions = getattr(instance, 'active_admissions', None)

        if not admissions:

            return None

        admission = admissions[0]
        patient = admission.patient

        return {
            'admission_id': admission.id,
            'patient_id': patient.id,
            'patient_fio': f'{patient.last_name} {patient.first_name}',
            'admitted_at': admission.admitted_at
        }


class RoomSerializer(serializers.ModelSerializer):

    beds = BedSerializer(many=True, read_only=True)

    class Meta:

        model = Room
        fields = (
            'id',
            'name',
            'room_type',
            'daily_price',
            'is_active',
            'beds'
        )


class RoomWriteSerializer(serializers.ModelSerializer):

    # Yangi xona uchun shu sondagi karavot avtomatik yaratiladi
    bed_count = serializers.IntegerField(
        min_value=0,
        max_value=50,
        required=False,
        write_only=True
    )

    class Meta:

        model = Room
        fields = (
            'name',
            'room_type',
            'daily_price',
            'is_active',
            'bed_count'
        )

    def validate_name(self, value):

        value = value.strip()

        if not value:

            raise serializers.ValidationError('Xona nomini kiriting.')

        clinic = self.context['clinic']

        is_exists = Room.objects \
            .filter(clinic=clinic, name=value) \
            .exclude(id=getattr(self.instance, 'id', None)) \
            .exists()

        if is_exists:

            raise serializers.ValidationError('Bu nomli xona allaqachon mavjud.')

        return value

    def validate_is_active(self, value):

        if not value and self.instance and Admission.objects.filter(
            bed__room=self.instance,
            status=AdmissionStatus.ACTIVE
        ).exists():

            raise serializers.ValidationError("Xonada bemor yotibdi, uni o'chirib bo'lmaydi.")

        return value

    def create(self, validated_data):

        bed_count = validated_data.pop('bed_count', 0)

        room = Room.objects.create(clinic=self.context['clinic'], **validated_data)

        Bed.objects.bulk_create([
            Bed(room=room, name=str(number))
            for number in range(1, bed_count + 1)
        ])

        return room

    def update(self, instance, validated_data):

        validated_data.pop('bed_count', None)

        return super().update(instance, validated_data)


class BedWriteSerializer(serializers.ModelSerializer):

    class Meta:

        model = Bed
        fields = (
            'name',
            'is_active'
        )

    def validate_name(self, value):

        value = value.strip()

        if not value:

            raise serializers.ValidationError('Karavot nomini kiriting.')

        room = self.context['room']

        is_exists = Bed.objects \
            .filter(room=room, name=value) \
            .exclude(id=getattr(self.instance, 'id', None)) \
            .exists()

        if is_exists:

            raise serializers.ValidationError('Bu xonada shunday karavot bor.')

        return value

    def validate_is_active(self, value):

        if not value and self.instance and self.instance.admissions.filter(
            status=AdmissionStatus.ACTIVE
        ).exists():

            raise serializers.ValidationError("Karavotda bemor yotibdi, uni o'chirib bo'lmaydi.")

        return value


class AdmissionPatientSerializer(serializers.ModelSerializer):

    fio = serializers.SerializerMethodField()

    code = serializers.CharField(read_only=True, default=None)

    class Meta:

        model = Patient
        fields = (
            'id',
            'code',
            'fio',
            'phone'
        )

    def get_fio(self, instance) -> str:

        parts = [instance.last_name, instance.first_name, instance.middle_name]

        return ' '.join(part for part in parts if part)


class AdmissionNoteSerializer(serializers.ModelSerializer):

    created_by = serializers.CharField(source='created_by.fio', read_only=True, default=None)

    class Meta:

        model = AdmissionNote
        fields = (
            'id',
            'text',
            'created_by',
            'created_at'
        )
        read_only_fields = (
            'id',
            'created_at'
        )

    def validate_text(self, value):

        value = value.strip()

        if not value:

            raise serializers.ValidationError("Yozuv matnini kiriting.")

        return value


class AdmissionServiceSerializer(serializers.ModelSerializer):

    total = serializers.SerializerMethodField()

    class Meta:

        model = AdmissionService
        fields = (
            'id',
            'service',
            'name',
            'price',
            'quantity',
            'date',
            'total'
        )
        read_only_fields = (
            'id',
            'name',
            'price'
        )

    def get_total(self, instance) -> int:

        return instance.price * instance.quantity

    def validate_service(self, value):

        if value is None:

            raise serializers.ValidationError('Xizmatni tanlang.')

        if value.clinic_id != self.context['clinic'].id:

            raise serializers.ValidationError('Xizmat topilmadi.')

        return value

    def validate_quantity(self, value):

        if value < 1:

            raise serializers.ValidationError("Soni kamida 1 bo'lishi kerak.")

        return value

    def create(self, validated_data):

        service = validated_data['service']

        validated_data.update({
            'name': service.name,
            'price': int(service.price)
        })

        return super().create(validated_data)


class AdmissionBillSerializer(serializers.Serializer):

    days = serializers.IntegerField()
    daily_price = serializers.IntegerField()
    stay_total = serializers.IntegerField()
    services_total = serializers.IntegerField()
    total = serializers.IntegerField()


class AdmissionListSerializer(serializers.ModelSerializer):

    patient = AdmissionPatientSerializer(read_only=True)

    room = serializers.CharField(source='bed.room.name', read_only=True)

    room_type = serializers.CharField(source='bed.room.room_type', read_only=True)

    bed = serializers.CharField(source='bed.name', read_only=True)

    doctor = serializers.CharField(source='doctor.fio', read_only=True, default=None)

    days = serializers.IntegerField(read_only=True)

    total = serializers.IntegerField(read_only=True)

    class Meta:

        model = Admission
        fields = (
            'id',
            'patient',
            'room',
            'room_type',
            'bed',
            'doctor',
            'status',
            'admitted_at',
            'discharged_at',
            'reason',
            'discharge_diagnosis',
            'days',
            'total'
        )


class AdmissionDetailSerializer(AdmissionListSerializer):

    bed_id = serializers.UUIDField(source='bed.id', read_only=True)

    doctor_id = serializers.UUIDField(source='doctor.id', read_only=True, default=None)

    created_by = serializers.CharField(source='created_by.fio', read_only=True, default=None)

    notes = AdmissionNoteSerializer(many=True, read_only=True)

    services = AdmissionServiceSerializer(many=True, read_only=True)

    bill = serializers.SerializerMethodField()

    class Meta(AdmissionListSerializer.Meta):

        fields = AdmissionListSerializer.Meta.fields + (
            'bed_id',
            'doctor_id',
            'daily_price',
            'discharge_notes',
            'created_by',
            'notes',
            'services',
            'bill'
        )

    def get_bill(self, instance) -> AdmissionBillSerializer:

        return {
            'days': instance.days,
            'daily_price': instance.daily_price,
            'stay_total': instance.stay_total,
            'services_total': instance.services_total,
            'total': instance.total
        }


class AdmissionWriteSerializer(serializers.ModelSerializer):

    class Meta:

        model = Admission
        fields = (
            'patient',
            'bed',
            'doctor',
            'admitted_at',
            'daily_price',
            'reason'
        )
        extra_kwargs = {
            'patient': {'required': True},
            'bed': {'required': True},
            'daily_price': {'required': False},
            'admitted_at': {'required': False}
        }

    def validate_patient(self, value):

        if self.instance and value != self.instance.patient:

            raise serializers.ValidationError("Bemorni almashtirib bo'lmaydi.")

        if value.clinic_id != self.context['clinic'].id:

            raise serializers.ValidationError('Bemor topilmadi.')

        if value.status != StatusTextChoices.ACTIVE:

            raise serializers.ValidationError('Bemor nofaol.')

        return value

    def validate_bed(self, value):

        if value.room.clinic_id != self.context['clinic'].id:

            raise serializers.ValidationError('Karavot topilmadi.')

        if not value.is_active or not value.room.is_active:

            raise serializers.ValidationError('Bu karavot ishlatilmayapti.')

        is_busy = value.admissions \
            .filter(status=AdmissionStatus.ACTIVE) \
            .exclude(id=getattr(self.instance, 'id', None)) \
            .exists()

        if is_busy:

            raise serializers.ValidationError('Bu karavot band.')

        return value

    def validate_doctor(self, value):

        if value and (value.role != UserRole.DOCTOR or value.clinic_id != self.context['clinic'].id):

            raise serializers.ValidationError('Shifokor topilmadi.')

        return value

    def validate(self, attrs):

        if self.instance and self.instance.status != AdmissionStatus.ACTIVE:

            raise serializers.ValidationError("Chiqarilgan bemorni o'zgartirib bo'lmaydi.")

        patient = attrs.get('patient')

        if not self.instance and patient and patient.admissions.filter(status=AdmissionStatus.ACTIVE).exists():

            raise serializers.ValidationError({'patient': 'Bu bemor allaqachon statsionarda yotibdi.'})

        return attrs

    def create(self, validated_data):

        if 'daily_price' not in validated_data:

            validated_data['daily_price'] = validated_data['bed'].room.daily_price

        validated_data.update({
            'clinic': self.context['clinic'],
            'created_by': self.context['user']
        })

        return super().create(validated_data)


class AdmissionDischargeSerializer(serializers.Serializer):

    discharged_at = serializers.DateTimeField(required=False)

    discharge_diagnosis = serializers.CharField(required=False, allow_blank=True)

    discharge_notes = serializers.CharField(required=False, allow_blank=True)

    def validate_discharged_at(self, value):

        if value < self.context['admission'].admitted_at:

            raise serializers.ValidationError("Chiqish sanasi kelgan sanadan oldin bo'lishi mumkin emas.")

        return value
