"""
Restaurant service - handles restaurant creation and management
Simple and clean
"""

from services.supabase_service import get_supabase_client
from typing import Dict, Optional, List
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
    """Get restaurant by ID, including restaurant admin username"""
    supabase = get_supabase_client()
    
    result = supabase.table("restaurants").select("*").eq("id", restaurant_id).execute()
    
    if not result.data:
        return None
    
    restaurant = result.data[0]
    
    # Get restaurant admin username
    try:
        # Find the restaurant_admin user for this restaurant
        user_result = supabase.table("restaurant_users").select("user_id").eq("restaurant_id", restaurant_id).eq("role", "restaurant_admin").execute()
        
        if user_result.data and len(user_result.data) > 0:
            user_id = user_result.data[0].get("user_id")
            if user_id:
                # Get username from users table
                direct_user = supabase.table("users").select("username").eq("id", user_id).execute()
                if direct_user.data:
                    restaurant["admin_username"] = direct_user.data[0].get("username")
                else:
                    restaurant["admin_username"] = None
            else:
                restaurant["admin_username"] = None
        else:
            restaurant["admin_username"] = None
    except Exception as e:
        logger.warning(f"Could not fetch restaurant admin username: {e}")
        restaurant["admin_username"] = None
    
    return restaurant


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


def get_all_restaurants() -> List[Dict]:
    """Get all restaurants (for restaurant selection)"""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("restaurants").select("id, name, phone, created_at").order("name", desc=False).execute()
        
        restaurants = result.data if result.data else []
        logger.info(f"Retrieved {len(restaurants)} restaurants")
        
        return restaurants
    except Exception as e:
        logger.error(f"Error getting all restaurants: {e}")
        raise Exception(f"Failed to get restaurants: {str(e)}")


def update_restaurant(
    restaurant_id: str,
    name: Optional[str] = None,
    phone: Optional[str] = None,
    printnode_api_key: Optional[str] = None,
    printnode_printer_id: Optional[str] = None,
    twilio_phone: Optional[str] = None
) -> Dict:
    """
    Update restaurant details
    Only updates fields that are provided (not None)
    """
    supabase = get_supabase_client()
    
    # Build update dict with only provided fields
    update_data = {}
    if name is not None:
        update_data["name"] = name
    if phone is not None:
        update_data["phone"] = normalize_phone(phone)
    if printnode_api_key is not None:
        update_data["printnode_api_key"] = printnode_api_key
    if printnode_printer_id is not None:
        update_data["printnode_printer_id"] = printnode_printer_id
    if twilio_phone is not None:
        update_data["twilio_phone"] = twilio_phone
    
    if not update_data:
        raise Exception("No fields to update")
    
    # Update restaurant
    result = supabase.table("restaurants").update(update_data).eq("id", restaurant_id).execute()
    
    if not result.data:
        raise Exception("Failed to update restaurant or restaurant not found")
    
    restaurant = result.data[0]
    logger.info(f"Restaurant updated: {restaurant_id}")
    
    return restaurant


def delete_restaurant(restaurant_id: str) -> bool:
    """
    Delete restaurant and all related data (cascade delete)
    This will delete:
    - Restaurant users (restaurant_users table)
    - Menu categories
    - Menu items
    - Menu modifiers
    - Menu imports
    - Orders and order items
    - User sessions for this restaurant
    - Users that are ONLY associated with this restaurant (not super_admin)
    """
    supabase = get_supabase_client()
    
    try:
        # First, get restaurant to verify it exists
        restaurant = get_restaurant_by_id(restaurant_id)
        if not restaurant:
            raise Exception("Restaurant not found")
        
        # Get all users associated with this restaurant BEFORE deleting restaurant_users
        restaurant_users_result = supabase.table("restaurant_users").select("user_id").eq("restaurant_id", restaurant_id).execute()
        user_ids = [ru["user_id"] for ru in (restaurant_users_result.data or [])]
        
        # Identify users that should be deleted (only associated with this restaurant, not super_admin)
        users_to_delete = []
        for user_id in user_ids:
            # Check if user is super_admin (super_admins are not restaurant-specific)
            user_result = supabase.table("users").select("role").eq("id", user_id).execute()
            if user_result.data:
                user_role = user_result.data[0].get("role")
                # Only delete if not super_admin (restaurant_admin, kds_user, frontdesk_user are restaurant-specific)
                if user_role != "super_admin":
                    # Check if user has any other restaurant associations (excluding this restaurant)
                    other_restaurants = supabase.table("restaurant_users").select("restaurant_id").eq("user_id", user_id).neq("restaurant_id", restaurant_id).execute()
                    # If no other restaurant associations, mark for deletion
                    if not other_restaurants.data or len(other_restaurants.data) == 0:
                        users_to_delete.append(user_id)
        
        # Delete orders first (order_items will cascade via foreign key)
        supabase.table("orders").delete().eq("restaurant_id", restaurant_id).execute()
        logger.info(f"Deleted orders for restaurant {restaurant_id}")
        
        # Delete menu items (modifier links will cascade)
        supabase.table("menu_items").delete().eq("restaurant_id", restaurant_id).execute()
        logger.info(f"Deleted menu items for restaurant {restaurant_id}")
        
        # Delete menu modifiers
        supabase.table("menu_modifiers").delete().eq("restaurant_id", restaurant_id).execute()
        logger.info(f"Deleted menu modifiers for restaurant {restaurant_id}")
        
        # Delete menu categories
        supabase.table("menu_categories").delete().eq("restaurant_id", restaurant_id).execute()
        logger.info(f"Deleted menu categories for restaurant {restaurant_id}")
        
        # Delete menu imports
        supabase.table("menu_imports").delete().eq("restaurant_id", restaurant_id).execute()
        logger.info(f"Deleted menu imports for restaurant {restaurant_id}")
        
        # Delete user sessions for this restaurant
        supabase.table("user_sessions").delete().eq("restaurant_id", restaurant_id).execute()
        logger.info(f"Deleted user sessions for restaurant {restaurant_id}")
        
        # Delete restaurant_users associations
        supabase.table("restaurant_users").delete().eq("restaurant_id", restaurant_id).execute()
        logger.info(f"Deleted restaurant_users associations for restaurant {restaurant_id}")
        
        # Delete users that are ONLY associated with this restaurant
        for user_id in users_to_delete:
            supabase.table("users").delete().eq("id", user_id).execute()
            logger.info(f"Deleted user {user_id} associated with restaurant {restaurant_id}")
        
        # Finally, delete the restaurant itself
        supabase.table("restaurants").delete().eq("id", restaurant_id).execute()
        logger.info(f"Restaurant deleted: {restaurant_id}")
        
        return True
    except Exception as e:
        logger.error(f"Error deleting restaurant: {e}", exc_info=True)
        raise Exception(f"Failed to delete restaurant: {str(e)}")

