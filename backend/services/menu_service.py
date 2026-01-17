"""
Menu service - handles menu management operations
Simple, clean, easy to understand
"""

from supabase import Client
from services.supabase_service import get_supabase_client
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


def get_categories(restaurant_id: str) -> List[Dict]:
    """
    Get all menu categories for a restaurant
    Returns list of categories ordered by display_order
    """
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("menu_categories") \
            .select("*") \
            .eq("restaurant_id", restaurant_id) \
            .eq("is_active", True) \
            .order("display_order", desc=False) \
            .execute()
        
        categories = result.data if result.data else []
        logger.info(f"Retrieved {len(categories)} categories for restaurant {restaurant_id}")
        
        return categories
    except Exception as e:
        logger.error(f"Error getting categories for restaurant {restaurant_id}: {e}")
        raise Exception(f"Failed to get categories: {str(e)}")


def create_category(restaurant_id: str, category_data: Dict) -> Dict:
    """
    Create a new menu category
    Returns created category
    """
    supabase = get_supabase_client()
    
    # Prepare category record
    category_record = {
        "restaurant_id": restaurant_id,
        "name": category_data.get("name"),
        "description": category_data.get("description"),
        "display_order": category_data.get("display_order", 0),
        "is_active": category_data.get("is_active", True)
    }
    
    # Validate required fields
    if not category_record["name"]:
        raise ValueError("Category name is required")
    
    try:
        result = supabase.table("menu_categories").insert(category_record).execute()
        
        if not result.data:
            raise Exception("Failed to create category")
        
        category = result.data[0]
        logger.info(f"Created category: {category['name']} (ID: {category['id']})")
        
        return category
    except Exception as e:
        logger.error(f"Error creating category: {e}")
        raise Exception(f"Failed to create category: {str(e)}")


def update_category(category_id: str, category_data: Dict) -> Dict:
    """
    Update an existing menu category
    Returns updated category
    """
    supabase = get_supabase_client()
    
    # Prepare update data (only include fields that are provided)
    update_data = {}
    if "name" in category_data:
        update_data["name"] = category_data["name"]
    if "description" in category_data:
        update_data["description"] = category_data["description"]
    if "display_order" in category_data:
        update_data["display_order"] = category_data["display_order"]
    if "is_active" in category_data:
        update_data["is_active"] = category_data["is_active"]
    
    if not update_data:
        raise ValueError("No fields to update")
    
    try:
        result = supabase.table("menu_categories") \
            .update(update_data) \
            .eq("id", category_id) \
            .execute()
        
        if not result.data:
            raise Exception(f"Category {category_id} not found")
        
        category = result.data[0]
        logger.info(f"Updated category: {category['name']} (ID: {category_id})")
        
        return category
    except Exception as e:
        logger.error(f"Error updating category {category_id}: {e}")
        raise Exception(f"Failed to update category: {str(e)}")


def delete_category(category_id: str) -> bool:
    """
    Delete a menu category
    Returns True if successful
    """
    supabase = get_supabase_client()
    
    try:
        # First check if category exists
        result = supabase.table("menu_categories") \
            .select("id, name") \
            .eq("id", category_id) \
            .execute()
        
        if not result.data:
            raise Exception(f"Category {category_id} not found")
        
        category_name = result.data[0].get("name", "Unknown")
        
        # Delete category
        supabase.table("menu_categories") \
            .delete() \
            .eq("id", category_id) \
            .execute()
        
        logger.info(f"Deleted category: {category_name} (ID: {category_id})")
        
        return True
    except Exception as e:
        logger.error(f"Error deleting category {category_id}: {e}")
        raise Exception(f"Failed to delete category: {str(e)}")


def get_category_by_id(category_id: str) -> Optional[Dict]:
    """
    Get a single category by ID
    Returns category or None if not found
    """
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("menu_categories") \
            .select("*") \
            .eq("id", category_id) \
            .execute()
        
        if not result.data:
            return None
        
        return result.data[0]
    except Exception as e:
        logger.error(f"Error getting category {category_id}: {e}")
        raise Exception(f"Failed to get category: {str(e)}")
