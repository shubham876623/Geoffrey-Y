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
    Format phone number to US standard format (+1XXXXXXXXXX)
    Always assumes US-based phone numbers
    """
    if not phone:
        return ""
    
    phone = phone.strip()
    
    # Remove any spaces, dashes, parentheses
    phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    # If already has +1, return as is
    if phone.startswith("+1"):
        return phone
    
    # If starts with + but not +1, remove + and treat as US
    if phone.startswith("+"):
        phone = phone[1:]  # Remove the +
    
    # Remove leading 1 if present (US country code without +)
    if phone.startswith("1") and len(phone) == 11:
        phone = phone[1:]  # Remove leading 1
    
    # If it's 10 digits, add +1
    if len(phone) == 10 and phone.isdigit():
        return f"+1{phone}"
    
    # If it's already 11 digits starting with 1, add +
    if len(phone) == 11 and phone.startswith("1") and phone.isdigit():
        return f"+{phone}"
    
    # For any other format, try to extract 10 digits and add +1
    # Extract only digits
    digits_only = ''.join(filter(str.isdigit, phone))
    
    if len(digits_only) == 10:
        return f"+1{digits_only}"
    elif len(digits_only) == 11 and digits_only.startswith("1"):
        # Remove leading 1 and add +1
        return f"+1{digits_only[1:]}"
    elif len(digits_only) >= 10:
        # Take last 10 digits (in case of extra digits)
        return f"+1{digits_only[-10:]}"
    
    # If we can't format it properly, return as is with +1 prefix
    if phone.isdigit():
        return f"+1{phone}"
    
    return phone
   

