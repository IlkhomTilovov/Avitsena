from datetime import datetime, date
from typing import Tuple, Union, Dict
import calendar


def percentage_of_change(val1, val2) -> Dict:

    match val1:

        case 0:

            return None, val2
        
        case _:

            return (val2 - val1) / val1


def get_last_month_data() -> Tuple:

    today = date.today()

    if today.month == 1:
        year = today.year - 1
        month = 12
    else:
        year = today.year
        month = today.month - 1

    start_of_prev_month = datetime(year, month, 1)

    last_day = calendar.monthrange(year, month)[1]

    end_of_prev_month = datetime(year, month, last_day)

    return start_of_prev_month, end_of_prev_month


def get_current_month_data() -> Tuple:
        
    today = date.today()

    start_of_month = today.replace(day=1)

    last_day = calendar.monthrange(today.year, today.month)[1] 

    end_of_month = today.replace(day=last_day)

    return start_of_month, end_of_month