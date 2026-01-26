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


def get_menu_items(restaurant_id: str, category_id: Optional[str] = None) -> List[Dict]:
    """
    Get all menu items for a restaurant
    Optionally filter by category_id
    Returns list of items ordered by display_order
    """
    supabase = get_supabase_client()
    
    try:
        # Start query with restaurant_id filter
        query = supabase.table("menu_items") \
            .select("*") \
            .eq("restaurant_id", restaurant_id)
        
        # Add category filter if provided
        if category_id:
            query = query.eq("category_id", category_id)
        
        # Order by display_order
        result = query.order("display_order", desc=False).execute()
        
        items = result.data if result.data else []
        logger.info(f"Retrieved {len(items)} menu items for restaurant {restaurant_id}" + 
                   (f" (category: {category_id})" if category_id else ""))
        
        return items
    except Exception as e:
        logger.error(f"Error getting menu items for restaurant {restaurant_id}: {e}")
        raise Exception(f"Failed to get menu items: {str(e)}")


def get_menu_item(item_id: str) -> Optional[Dict]:
    """
    Get a single menu item by ID with its modifiers and options
    Returns item with modifiers or None if not found
    """
    supabase = get_supabase_client()
    
    try:
        # Get the menu item
        item_result = supabase.table("menu_items") \
            .select("*") \
            .eq("id", item_id) \
            .execute()
        
        if not item_result.data:
            return None
        
        item = item_result.data[0]
        
        # Get associated modifiers for this item
        modifiers_result = supabase.table("menu_item_modifiers") \
            .select("modifier_id") \
            .eq("menu_item_id", item_id) \
            .execute()
        
        modifier_ids = [row["modifier_id"] for row in (modifiers_result.data or [])]
        
        # Get full modifier details with options
        modifiers_with_options = []
        if modifier_ids:
            for modifier_id in modifier_ids:
                # Get modifier details
                modifier_result = supabase.table("menu_modifiers") \
                    .select("*") \
                    .eq("id", modifier_id) \
                    .execute()
                
                if modifier_result.data:
                    modifier = modifier_result.data[0]
                    
                    # Get options for this modifier
                    options_result = supabase.table("modifier_options") \
                        .select("*") \
                        .eq("modifier_id", modifier_id) \
                        .order("display_order", desc=False) \
                        .execute()
                    
                    modifier["options"] = options_result.data if options_result.data else []
                    modifiers_with_options.append(modifier)
        
        item["modifiers"] = modifiers_with_options
        logger.info(f"Retrieved menu item: {item.get('name')} (ID: {item_id}) with {len(modifiers_with_options)} modifiers")
        
        return item
    except Exception as e:
        logger.error(f"Error getting menu item {item_id}: {e}")
        raise Exception(f"Failed to get menu item: {str(e)}")


def create_menu_item(restaurant_id: str, item_data: Dict) -> Dict:
    """
    Create a new menu item
    Returns created menu item
    """
    supabase = get_supabase_client()
    
    # Prepare menu item record
    item_record = {
        "restaurant_id": restaurant_id,
        "name": item_data.get("name"),
        "name_chinese": item_data.get("name_chinese"),
        "description": item_data.get("description"),
        "description_chinese": item_data.get("description_chinese"),
        "price": item_data.get("price"),
        "category_id": item_data.get("category_id"),
        "image_url": item_data.get("image_url"),
        "is_available": item_data.get("is_available", True),
        "display_order": item_data.get("display_order", 0)
    }
    
    # Validate required fields
    if not item_record["name"]:
        raise ValueError("Item name is required")
    if item_record["price"] is None:
        raise ValueError("Item price is required")
    
    # Validate price is a positive number
    try:
        price = float(item_record["price"])
        if price < 0:
            raise ValueError("Price must be a positive number")
    except (ValueError, TypeError):
        raise ValueError("Price must be a valid number")
    
    try:
        result = supabase.table("menu_items").insert(item_record).execute()
        
        if not result.data:
            raise Exception("Failed to create menu item")
        
        item = result.data[0]
        logger.info(f"Created menu item: {item['name']} (ID: {item['id']})")
        
        return item
    except Exception as e:
        logger.error(f"Error creating menu item: {e}")
        raise Exception(f"Failed to create menu item: {str(e)}")


def update_menu_item(item_id: str, item_data: Dict) -> Dict:
    """
    Update an existing menu item
    Returns updated menu item
    """
    supabase = get_supabase_client()
    
    # Prepare update data (only include fields that are provided)
    update_data = {}
    if "name" in item_data:
        update_data["name"] = item_data["name"]
    if "name_chinese" in item_data:
        update_data["name_chinese"] = item_data["name_chinese"]
    if "description" in item_data:
        update_data["description"] = item_data["description"]
    if "description_chinese" in item_data:
        update_data["description_chinese"] = item_data["description_chinese"]
    if "price" in item_data:
        # Validate price if provided
        try:
            price = float(item_data["price"])
            if price < 0:
                raise ValueError("Price must be a positive number")
            update_data["price"] = price
        except (ValueError, TypeError):
            raise ValueError("Price must be a valid number")
    if "category_id" in item_data:
        update_data["category_id"] = item_data["category_id"]
    if "image_url" in item_data:
        update_data["image_url"] = item_data["image_url"]
    if "is_available" in item_data:
        update_data["is_available"] = item_data["is_available"]
    if "display_order" in item_data:
        update_data["display_order"] = item_data["display_order"]
    
    if not update_data:
        raise ValueError("No fields to update")
    
    try:
        result = supabase.table("menu_items") \
            .update(update_data) \
            .eq("id", item_id) \
            .execute()
        
        if not result.data:
            raise Exception(f"Menu item {item_id} not found")
        
        item = result.data[0]
        logger.info(f"Updated menu item: {item.get('name')} (ID: {item_id})")
        
        return item
    except Exception as e:
        logger.error(f"Error updating menu item {item_id}: {e}")
        raise Exception(f"Failed to update menu item: {str(e)}")


def delete_menu_item(item_id: str) -> bool:
    """
    Delete a menu item
    Returns True if successful
    """
    supabase = get_supabase_client()
    
    try:
        # First check if menu item exists
        result = supabase.table("menu_items") \
            .select("id, name") \
            .eq("id", item_id) \
            .execute()
        
        if not result.data:
            raise Exception(f"Menu item {item_id} not found")
        
        item_name = result.data[0].get("name", "Unknown")
        
        # Delete menu item
        # Note: Related records in menu_item_modifiers will be deleted automatically via CASCADE
        supabase.table("menu_items") \
            .delete() \
            .eq("id", item_id) \
            .execute()
        
        logger.info(f"Deleted menu item: {item_name} (ID: {item_id})")
        
        return True
    except Exception as e:
        logger.error(f"Error deleting menu item {item_id}: {e}")
        raise Exception(f"Failed to delete menu item: {str(e)}")


# Menu Modifiers Functions
def get_modifiers(restaurant_id: str) -> List[Dict]:
    """
    Get all modifiers for a restaurant
    Returns list of modifiers ordered by display_order
    """
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("menu_modifiers") \
            .select("*") \
            .eq("restaurant_id", restaurant_id) \
            .order("display_order", desc=False) \
            .execute()
        
        modifiers = result.data if result.data else []
        logger.info(f"Retrieved {len(modifiers)} modifiers for restaurant {restaurant_id}")
        
        return modifiers
    except Exception as e:
        logger.error(f"Error getting modifiers for restaurant {restaurant_id}: {e}")
        raise Exception(f"Failed to get modifiers: {str(e)}")


def get_modifier(modifier_id: str) -> Optional[Dict]:
    """
    Get a single modifier by ID with its options
    Returns modifier with options or None if not found
    """
    supabase = get_supabase_client()
    
    try:
        # Get the modifier
        modifier_result = supabase.table("menu_modifiers") \
            .select("*") \
            .eq("id", modifier_id) \
            .execute()
        
        if not modifier_result.data:
            return None
        
        modifier = modifier_result.data[0]
        
        # Get options for this modifier
        options_result = supabase.table("modifier_options") \
            .select("*") \
            .eq("modifier_id", modifier_id) \
            .order("display_order", desc=False) \
            .execute()
        
        modifier["options"] = options_result.data if options_result.data else []
        logger.info(f"Retrieved modifier: {modifier.get('name')} (ID: {modifier_id}) with {len(modifier['options'])} options")
        
        return modifier
    except Exception as e:
        logger.error(f"Error getting modifier {modifier_id}: {e}")
        raise Exception(f"Failed to get modifier: {str(e)}")


def create_modifier(restaurant_id: str, modifier_data: Dict) -> Dict:
    """
    Create a new modifier
    Returns created modifier
    """
    supabase = get_supabase_client()
    
    # Prepare modifier record
    modifier_record = {
        "restaurant_id": restaurant_id,
        "name": modifier_data.get("name"),
        "name_chinese": modifier_data.get("name_chinese"),
        "type": modifier_data.get("type"),  # 'single' or 'multiple'
        "is_required": modifier_data.get("is_required", False),
        "display_order": modifier_data.get("display_order", 0)
    }
    
    # Validate required fields
    if not modifier_record["name"]:
        raise ValueError("Modifier name is required")
    if not modifier_record["type"]:
        raise ValueError("Modifier type is required (must be 'single' or 'multiple')")
    if modifier_record["type"] not in ["single", "multiple"]:
        raise ValueError("Modifier type must be 'single' or 'multiple'")
    
    try:
        result = supabase.table("menu_modifiers").insert(modifier_record).execute()
        
        if not result.data:
            raise Exception("Failed to create modifier")
        
        modifier = result.data[0]
        logger.info(f"Created modifier: {modifier['name']} (ID: {modifier['id']})")
        
        return modifier
    except Exception as e:
        logger.error(f"Error creating modifier: {e}")
        raise Exception(f"Failed to create modifier: {str(e)}")


def update_modifier(modifier_id: str, modifier_data: Dict) -> Dict:
    """
    Update an existing modifier
    Returns updated modifier
    """
    supabase = get_supabase_client()
    
    # Prepare update data (only include fields that are provided)
    update_data = {}
    if "name" in modifier_data:
        update_data["name"] = modifier_data["name"]
    if "name_chinese" in modifier_data:
        update_data["name_chinese"] = modifier_data["name_chinese"]
    if "type" in modifier_data:
        # Validate type if provided
        if modifier_data["type"] not in ["single", "multiple"]:
            raise ValueError("Modifier type must be 'single' or 'multiple'")
        update_data["type"] = modifier_data["type"]
    if "is_required" in modifier_data:
        update_data["is_required"] = modifier_data["is_required"]
    if "display_order" in modifier_data:
        update_data["display_order"] = modifier_data["display_order"]
    
    if not update_data:
        raise ValueError("No fields to update")
    
    try:
        result = supabase.table("menu_modifiers") \
            .update(update_data) \
            .eq("id", modifier_id) \
            .execute()
        
        if not result.data:
            raise Exception(f"Modifier {modifier_id} not found")
        
        modifier = result.data[0]
        logger.info(f"Updated modifier: {modifier.get('name')} (ID: {modifier_id})")
        
        return modifier
    except Exception as e:
        logger.error(f"Error updating modifier {modifier_id}: {e}")
        raise Exception(f"Failed to update modifier: {str(e)}")


def delete_modifier(modifier_id: str) -> bool:
    """
    Delete a modifier
    Returns True if successful
    """
    supabase = get_supabase_client()
    
    try:
        # First check if modifier exists
        result = supabase.table("menu_modifiers") \
            .select("id, name") \
            .eq("id", modifier_id) \
            .execute()
        
        if not result.data:
            raise Exception(f"Modifier {modifier_id} not found")
        
        modifier_name = result.data[0].get("name", "Unknown")
        
        # Delete modifier
        # Note: Related records in modifier_options and menu_item_modifiers will be deleted automatically via CASCADE
        supabase.table("menu_modifiers") \
            .delete() \
            .eq("id", modifier_id) \
            .execute()
        
        logger.info(f"Deleted modifier: {modifier_name} (ID: {modifier_id})")
        
        return True
    except Exception as e:
        logger.error(f"Error deleting modifier {modifier_id}: {e}")
        raise Exception(f"Failed to delete modifier: {str(e)}")


def link_item_modifier(item_id: str, modifier_id: str) -> bool:
    """
    Link a modifier to a menu item
    This allows the menu item to have that modifier available for customization
    Returns True if successful
    """
    supabase = get_supabase_client()
    
    try:
        # Check if item exists
        item_result = supabase.table("menu_items") \
            .select("id, name") \
            .eq("id", item_id) \
            .execute()
        
        if not item_result.data:
            raise Exception(f"Menu item {item_id} not found")
        
        # Check if modifier exists
        modifier_result = supabase.table("menu_modifiers") \
            .select("id, name") \
            .eq("id", modifier_id) \
            .execute()
        
        if not modifier_result.data:
            raise Exception(f"Modifier {modifier_id} not found")
        
        # Check if link already exists
        existing_link = supabase.table("menu_item_modifiers") \
            .select("*") \
            .eq("menu_item_id", item_id) \
            .eq("modifier_id", modifier_id) \
            .execute()
        
        if existing_link.data:
            logger.info(f"Modifier {modifier_id} already linked to item {item_id}")
            return True
        
        # Create link
        supabase.table("menu_item_modifiers").insert({
            "menu_item_id": item_id,
            "modifier_id": modifier_id
        }).execute()
        
        item_name = item_result.data[0].get("name", "Unknown")
        modifier_name = modifier_result.data[0].get("name", "Unknown")
        logger.info(f"Linked modifier '{modifier_name}' (ID: {modifier_id}) to item '{item_name}' (ID: {item_id})")
        
        return True
    except Exception as e:
        logger.error(f"Error linking modifier {modifier_id} to item {item_id}: {e}")
        raise Exception(f"Failed to link modifier: {str(e)}")


def unlink_item_modifier(item_id: str, modifier_id: str) -> bool:
    """
    Unlink a modifier from a menu item
    This removes the customization option from that item
    Returns True if successful
    """
    supabase = get_supabase_client()
    
    try:
        # Check if link exists
        existing_link = supabase.table("menu_item_modifiers") \
            .select("*") \
            .eq("menu_item_id", item_id) \
            .eq("modifier_id", modifier_id) \
            .execute()
        
        if not existing_link.data:
            logger.info(f"Modifier {modifier_id} is not linked to item {item_id}")
            return True
        
        # Delete link
        supabase.table("menu_item_modifiers") \
            .delete() \
            .eq("menu_item_id", item_id) \
            .eq("modifier_id", modifier_id) \
            .execute()
        
        logger.info(f"Unlinked modifier {modifier_id} from item {item_id}")
        
        return True
    except Exception as e:
        logger.error(f"Error unlinking modifier {modifier_id} from item {item_id}: {e}")
        raise Exception(f"Failed to unlink modifier: {str(e)}")


def create_menu_import(restaurant_id: str, file_name: str, file_type: str) -> Dict:
    """
    Create a menu import record in database
    
    Purpose:
    - Tracks menu file uploads before parsing
    - Stores file metadata (name, type) and status
    - Allows tracking of upload history for debugging
    
    """
    supabase = get_supabase_client()
    
    # Validate file_type
    allowed_types = ['pdf', 'image', 'csv', 'text']
    if file_type.lower() not in allowed_types:
        raise ValueError(f"Invalid file type. Must be one of: {', '.join(allowed_types)}")
    
    # Prepare menu_import record
    # Note: file_path is not stored in database - files are saved in uploads/ directory
    # with UUID filename, can be found using import_id
    import_record = {
        "restaurant_id": restaurant_id,
        "file_name": file_name,
        "file_type": file_type.lower(),
        "status": "pending"
    }
    
    try:
        # Log what we're trying to insert (for debugging)
        logger.info(f"Attempting to insert menu import: restaurant_id={restaurant_id}, file_name={file_name}, file_type={file_type}")
        
        result = supabase.table("menu_imports") \
            .insert(import_record) \
            .execute()
        
        if not result.data or len(result.data) == 0:
            logger.error("Insert returned no data - possible database or RLS issue")
            raise Exception("Failed to create menu import record - no data returned from database")
        
        import_data = result.data[0]
        logger.info(f"Successfully created menu import record {import_data['id']} for restaurant {restaurant_id}")
        
        return import_data
    except ValueError:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error creating menu import record: {error_msg}", exc_info=True)
        
        # Provide more specific error messages
        if "foreign key" in error_msg.lower() or "restaurant" in error_msg.lower():
            raise Exception(f"Restaurant ID {restaurant_id} does not exist in database. Please create restaurant first.")
        elif "table" in error_msg.lower() and "does not exist" in error_msg.lower():
            raise Exception("menu_imports table does not exist. Please run database migration.")
        else:
            raise Exception(f"Failed to create menu import: {error_msg}")


def get_menu_imports(restaurant_id: str, status: Optional[str] = None) -> List[Dict]:
    """
    Get all menu imports for a restaurant
    
    Purpose:
    - Retrieves upload history for a restaurant
    - Allows admin/staff to see all uploaded files
    - Track upload status and history
    
    Why needed:
    - Upload history: See all files that were uploaded
    - Status tracking: Check which uploads are pending, processing, completed, or failed
    - Debugging: View upload records to troubleshoot issues
    - Admin dashboard: Display upload list in admin UI
 
    """
    supabase = get_supabase_client()
    
    try:
        query = supabase.table("menu_imports") \
            .select("*") \
            .eq("restaurant_id", restaurant_id)
        
        # Filter by status if provided
        if status:
            query = query.eq("status", status)
        
        result = query.order("created_at", desc=True).execute()
        
        imports = result.data if result.data else []
        logger.info(f"Retrieved {len(imports)} menu imports for restaurant {restaurant_id}")
        
        return imports
    except Exception as e:
        logger.error(f"Error getting menu imports for restaurant {restaurant_id}: {e}")
        raise Exception(f"Failed to get menu imports: {str(e)}")


def get_menu_import(import_id: str) -> Optional[Dict]:
    """
    Get a single menu import by ID
    
    Purpose:
    - Get details of a specific upload
    - Check upload status and parsed data
    - View error messages if parsing failed
    

    """
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("menu_imports") \
            .select("*") \
            .eq("id", import_id) \
            .execute()
        
        if not result.data or len(result.data) == 0:
            return None
        
        import_data = result.data[0]
        logger.info(f"Retrieved menu import {import_id}")
        
        return import_data
    except Exception as e:
        logger.error(f"Error getting menu import {import_id}: {e}")
        raise Exception(f"Failed to get menu import: {str(e)}")


def get_public_menu(restaurant_id: str) -> Dict:
    """
    Get complete menu for customer ordering (public endpoint)
    
    Purpose:
    - Retrieves all menu data in a customer-friendly format
    - Returns categories, items (with modifiers), and modifiers organized for ordering
    
   
    """
    supabase = get_supabase_client()
    
    try:
        # Get categories (active only)
        categories = get_categories(restaurant_id)
        
        # Get all menu items (available only)
        all_items_result = supabase.table("menu_items") \
            .select("*") \
            .eq("restaurant_id", restaurant_id) \
            .eq("is_available", True) \
            .order("display_order", desc=False) \
            .execute()
        
        all_items = all_items_result.data if all_items_result.data else []
        
        # Get all modifiers with options (for restaurant)
        modifiers = get_modifiers(restaurant_id)
        
        # Get modifier options for all modifiers
        modifiers_with_options = []
        for modifier in modifiers:
            modifier_with_options = get_modifier(modifier["id"])
            if modifier_with_options:
                modifiers_with_options.append(modifier_with_options)
        
        # Get menu item modifiers (links between items and modifiers)
        item_modifiers_map = {}
        if all_items:
            item_ids = [item["id"] for item in all_items]
            
            # OPTIMIZED: Get all item-modifier links in ONE query instead of N queries (N+1 problem fix)
            # This reduces 128 queries down to just 1 query
            links_result = supabase.table("menu_item_modifiers") \
                .select("menu_item_id, modifier_id") \
                .in_("menu_item_id", item_ids) \
                .execute()
            
            # Build map: item_id -> [modifier_id, modifier_id, ...]
            if links_result.data:
                for link in links_result.data:
                    item_id = link["menu_item_id"]
                    modifier_id = link["modifier_id"]
                    if item_id not in item_modifiers_map:
                        item_modifiers_map[item_id] = []
                    item_modifiers_map[item_id].append(modifier_id)
        
        # Attach modifiers to items
        items_with_modifiers = []
        for item in all_items:
            item_id = item["id"]
            item_modifier_ids = item_modifiers_map.get(item_id, [])
            
            # Get full modifier details for this item
            item_modifiers = []
            for modifier in modifiers_with_options:
                if modifier["id"] in item_modifier_ids:
                    item_modifiers.append(modifier)
            
            # Add modifiers to item
            item["modifiers"] = item_modifiers
            items_with_modifiers.append(item)
        
        # Organize items by category
        categories_with_items = []
        items_without_category = []
        
        for category in categories:
            category_items = [item for item in items_with_modifiers if item.get("category_id") == category["id"]]
            category["items"] = category_items
            categories_with_items.append(category)
        
        # Items without category
        items_without_category = [item for item in items_with_modifiers if not item.get("category_id")]
        
        # Get restaurant info (name, etc.)
        from services.restaurant_service import get_restaurant_by_id
        restaurant = get_restaurant_by_id(restaurant_id)
        restaurant_name = restaurant.get("name", "Restaurant") if restaurant else "Restaurant"
        
        logger.info(f"Retrieved public menu for restaurant {restaurant_id}: "
                   f"{len(categories_with_items)} categories, {len(items_with_modifiers)} items, "
                   f"{len(modifiers_with_options)} modifiers")
        
        return {
            "restaurant_id": restaurant_id,
            "restaurant_name": restaurant_name,
            "categories": categories_with_items,
            "items": items_without_category,  # Items not in any category
            "modifiers": modifiers_with_options
        }
        
    except Exception as e:
        logger.error(f"Error getting public menu for restaurant {restaurant_id}: {e}")
        raise Exception(f"Failed to get public menu: {str(e)}")


def get_menu_item_price(restaurant_id: str, item_name: str) -> Optional[float]:
    """
    Look up menu item price by name (fuzzy matching)
    
    Purpose:
    - Automatically find prices for voice orders when only item names are provided
    - Uses fuzzy matching to handle variations in item names
    - Returns price from menu_items table if found
    
    Why needed:
    - Voice orders come in with item names only (no prices)
    - Agent should NOT state prices during phone calls
    - Receipt must show prices automatically from database
    - Ensures price consistency across all orders
    
    Real-world example:
    - Voice order: "I want 2 Spring Rolls"
    - System looks up "Spring Rolls" in menu_items table
    - Finds item with name "Spring Rolls" -> price $5.99
    - Automatically uses $5.99 for the order
    - Receipt shows: "Spring Rolls x2 - $11.98"
    
    Matching strategy:
    1. Exact match (case-insensitive)
    2. Partial match (item name contains search term)
    3. Returns first match found
    
    Returns:
    - float: Price if found
    - None: If item not found
    """
    supabase = get_supabase_client()
    
    if not item_name or not item_name.strip():
        return None
    
    try:
        # Get all menu items for restaurant (available items only)
        result = supabase.table("menu_items") \
            .select("id, name, price") \
            .eq("restaurant_id", restaurant_id) \
            .eq("is_available", True) \
            .execute()
        
        items = result.data if result.data else []
        
        if not items:
            logger.warning(f"No menu items found for restaurant {restaurant_id}")
            return None
        
        # Normalize search term (lowercase, strip whitespace)
        search_term = item_name.strip().lower()
        
        # Strategy 1: Exact match (case-insensitive)
        for item in items:
            if item.get("name", "").strip().lower() == search_term:
                price = item.get("price")
                if price is not None:
                    logger.info(f"Exact match found: '{item_name}' -> ${price:.2f}")
                    return float(price)
        
        # Strategy 2: Partial match (item name contains search term)
        for item in items:
            item_name_lower = item.get("name", "").strip().lower()
            if search_term in item_name_lower or item_name_lower in search_term:
                price = item.get("price")
                if price is not None:
                    logger.info(f"Partial match found: '{item_name}' -> '{item.get('name')}' -> ${price:.2f}")
                    return float(price)
        
        # No match found
        logger.warning(f"No price found for item '{item_name}' in restaurant {restaurant_id}")
        return None
        
    except Exception as e:
        logger.error(f"Error looking up price for item '{item_name}' in restaurant {restaurant_id}: {e}")
        return None
