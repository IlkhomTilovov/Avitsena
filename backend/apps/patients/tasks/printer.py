from escpos.printer import Usb
from django.conf import settings
from environs import Env
from apps.patients.services import XPrinterService

env = Env()

env.read_env()

def print_check_for_visit():

    idVendor = 0x0483
    idProduct = 0x070b

    text = (
        "FIRMA NOMI: AVITCENA CLINIC\n" \
        "Bemor: O\'rolov Shohruh\n" \
        "Sana: 27.09.2025\n" \
        "Xizmat turi: Stomatologiya\n" \
        "Doktor: Dr.Karimov S.\n" \
        "Xona raqami: 203-xona\n" \
        "Navbat: A-017\n" \
        "To‘lov: 200 000 so‘m"
    )

    printer_service = XPrinterService(
        vendor_id=idVendor,
        product_id=idProduct
    )

    printer_service.print_check(text)