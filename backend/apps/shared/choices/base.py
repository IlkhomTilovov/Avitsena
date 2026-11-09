from django.db.models import TextChoices
from django.utils.translation import gettext_lazy as _


class UserGender(TextChoices):
    MALE = 'male', _('Male')
    FEMALE = 'female', _('Female')


class UserRole(TextChoices):
    SUPERADMIN = 'superadmin', _('Super admin')
    ADMIN = 'admin', _('Admin')
    REGISTRATOR = 'registrator', _('Registrator')
    DOCTOR = 'doctor', _('Doctor')


class StatusTextChoices(TextChoices):
    ACTIVE = 'active', _('Active')
    INACTIVE = 'inactive', _('Inactive')


class PaymentMethod(TextChoices):
    CASH = 'cash', _('Naqd')
    CARD = 'card', _('Karta')
    CLICK_PAYME = 'click_payme', _('Click/Payme')
    TRANSFER = 'transfer', _("O'tkazma")


class ExpenseCategory(TextChoices):
    MEDICINE = 'medicine', _('Dori va materiallar')
    EQUIPMENT = 'equipment', _("Jihozlar ta'miri")
    RENT = 'rent', _('Ijara')
    SALARY = 'salary', _('Ish haqi')
    OTHER = 'other', _('Boshqa')


class ExpenseStatus(TextChoices):
    COMPLETED = 'completed', _('Bajarildi')
    CANCELLED = 'cancelled', _('Bekor qilindi')


class FinanceTransactionType(TextChoices):
    KIRIM = 'kirim', _('Kirim')
    CHIQIM = 'chiqim', _('Chiqim')


class FinanceCategoryColor(TextChoices):
    TEAL = 'teal', _('Teal')
    CYAN = 'cyan', _('Cyan')
    BLUE = 'blue', _('Blue')
    PURPLE = 'purple', _('Purple')
    ORANGE = 'orange', _('Orange')
    RED = 'red', _('Red')
    GRAY = 'gray', _('Gray')


class AdmissionStatus(TextChoices):
    ACTIVE = 'active', _('Yotibdi')
    DISCHARGED = 'discharged', _('Chiqarilgan')
