"""
Helper utility functions
Simple and clean
"""

import uuid
from datetime import datetime


def generate_order_number(restaurant_id: str = None) -> str:
    """
    Generate unique order number
    Format: ORD-YYYYMMDD-001
    """
    today = datetime.now().strftime("%Y%m%d")
    random_part = str(uuid.uuid4())[:3].upper()
    return f"ORD-{today}-{random_part}"


def get_current_timestamp():
    """Get current timestamp"""
    return datetime.now()
    

def format_phone_number(phone: str) -> str:
    """
    Format phone number to standard format
    Simple formatting - add + if missing
    """
    phone = phone.strip()
    if not phone.startswith("+"):
        # Assume US number if no country code
        if len(phone) == 10:
            phone = f"+1{phone}"
        else:
            phone = f"+{phone}"
    return phone
   

