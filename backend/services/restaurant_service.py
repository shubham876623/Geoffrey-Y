"""
Restaurant service - handles restaurant creation and management
Simple and clean
"""

from services.supabase_service import get_supabase_client
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


def normalize_phone(phone: str) -> str:
    """Normalize phone number for comparison"""
    if not phone:
        return ""
    
    # Remove spaces, dashes, parentheses
    normalized = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    # Ensure + prefix
    if normalized and not normalized.startswith("+"):
        # If it's 10 digits, assume US number
        if len(normalized) == 10:
            normalized = f"+1{normalized}"
        else:
            normalized = f"+{normalized}"
    
    return normalized
    

def create_restaurant(
    name: str,
    phone: str,  # Restaurant phone number (required - used to identify restaurant)
    printnode_api_key: str,
    printnode_printer_id: str,
    twilio_phone: Optional[str] = None
) -> Dict:
    """
    Create a new restaurant
    Phone number is required - used to identify restaurant from SynthFlow webhook
    Returns created restaurant with ID
    """
    supabase = get_supabase_client()
    
    # Normalize phone number
    normalized_phone = normalize_phone(phone)
    
    # Check if restaurant with this phone already exists
    existing = get_restaurant_by_phone(normalized_phone)
    if existing:
        raise Exception(f"Restaurant with phone {normalized_phone} already exists")
    
    restaurant_record = {
        "name": name,
        "phone": normalized_phone,  # Required - used for identification
        "printnode_api_key": printnode_api_key,
        "printnode_printer_id": printnode_printer_id,
        "twilio_phone": twilio_phone
    }
    
    # Insert restaurant
    result = supabase.table("restaurants").insert(restaurant_record).execute()
    
    if not result.data:
        raise Exception("Failed to create restaurant")
    
    restaurant = result.data[0]
    logger.info(f"Restaurant created: {name} (ID: {restaurant['id']}) with phone: {normalized_phone}")
    
    return restaurant


def get_restaurant_by_id(restaurant_id: str) -> Optional[Dict]:
    """Get restaurant by ID"""
    supabase = get_supabase_client()
    
    result = supabase.table("restaurants").select("*").eq("id", restaurant_id).execute()
    
    if not result.data:
        return None
    
    return result.data[0]


def get_restaurant_by_phone(phone: str) -> Optional[Dict]:
    """
    Get restaurant by phone number
    Phone number is used to identify which restaurant received the order
    """
    supabase = get_supabase_client()
    
    # Normalize phone number (remove spaces, dashes, etc.)
    normalized_phone = normalize_phone(phone)
    
    # Try exact match first
    result = supabase.table("restaurants").select("*").eq("phone", normalized_phone).execute()
    
    if result.data:
        return result.data[0]
    
    # Try with + prefix
    if not normalized_phone.startswith("+"):
        result = supabase.table("restaurants").select("*").eq("phone", f"+{normalized_phone}").execute()
        if result.data:
            return result.data[0]
    
    # Try without + prefix
    if normalized_phone.startswith("+"):
        result = supabase.table("restaurants").select("*").eq("phone", normalized_phone[1:]).execute()
        if result.data:
            return result.data[0]
    
    return None


def get_restaurant_by_printnode_id(printnode_printer_id: str) -> Optional[Dict]:
    """Get restaurant by PrintNode printer ID"""
    supabase = get_supabase_client()
    
    result = supabase.table("restaurants").select("*").eq("printnode_printer_id", printnode_printer_id).execute()
    
    if not result.data:
        return None
    
    return result.data[0]

