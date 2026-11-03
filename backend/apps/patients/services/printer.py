from escpos.printer import (
    Usb,
    Network,
    Serial
)
import logging

logger = logging.getLogger(__name__)

class XPrinterService:
    """XPrinter service"""

    def __init__(self, vendor_id: int, product_id: int):
        
        self.printer = None
        self.vendor_id = vendor_id
        self.product_id = product_id

    def connect_printer(self) -> bool:
        """Printerga ulanish"""

        try:

            self.printer = Usb(
                idVendor=self.vendor_id,
                idProduct=self.product_id
            )

            logger.info(f"Printerga muvaffaqiyatli ulanildi: idVendor:{self.vendor_id}")
            return True
        
        except Exception as e:

            logger.error(f"Printerga ulanishda xatolik yuz berdi: {e}")
            return False

    def print_check(self, text: str):
        """Check chiqarish"""

        try:

            if not self.printer:
                if not self.connect_printer():
                    raise Exception("Printer bilan ulanib bo'lmadi")
                

                
            # self.printer.set(align="center")
            # self.printer.text('FIRMA NOMI: `AVITCENA CLINIC`')
            self.printer.set(align="left")
            self.printer.text(text)
            self.printer.cut()

            logger.info("Chek muvaffaqiyatli chop etildi")
            self.close_connect()

        except Exception as e:

            logger.error(f"Check chop etishda xatolik yuz berdi: {e}")
            raise

    def close_connect(self) -> None:
        """Printer bilan ulanishni yopish"""

        try:

            if self.printer:

                self.printer.close()
                self.printer = None
                logger.info("Printer bilan ulanish yopildi")

        except Exception as e:

            logger.error(f"Printer bilan ulanish yopilishda xatolik yuz berdi: {e}")

