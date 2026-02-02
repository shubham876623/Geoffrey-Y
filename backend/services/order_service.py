"""
Order service - handles order creation and management
Simple, clean, easy to understand
"""

from supabase import Client
from services.supabase_service import get_supabase_client
from services.translation_service import get_chinese_translation
from services.menu_service import get_menu_item, get_menu_item_price
from utils.helpers import generate_order_number, get_current_timestamp, format_phone_number
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# Tax rate (7.25%)
TAX_RATE = 0.0725

# create oderd

def create_order_receipt(order_id:str)->str:
    """
    create_order_receipt function create an order recipt for the  given ordeee id.
    it takes the  ordern id and return the order recipt in html format 



        """

def create_order(order_data: Dict, restaurant_id: str) -> Dict:
    """
    Create a new order in database
    Returns created order with ID
    """
    supabase = get_supabase_client()
        
    
    # Generate order number
    order_number = generate_order_number(restaurant_id)
    
    # Prepare order record
    order_record = {
        "restaurant_id": restaurant_id,
        "order_number": order_number,
        "customer_phone": format_phone_number(order_data.get("customer_phone", "")),
        "customer_name": order_data.get("customer_name"),
        "status": "pending",
        "total_amount": order_data.get("total_amount"),
        "estimated_ready_time": order_data.get("estimated_ready_time"),
        "special_instructions": order_data.get("special_instructions"),
        "created_at": get_current_timestamp().isoformat()
    }
    
    # Insert order
    result = supabase.table("orders").insert(order_record).execute()
    
    if not result.data:
        raise Exception("Failed to create order")
    
    order = result.data[0]
    order_id = order["id"]
    
    # Insert order items
    items = order_data.get("items", [])
    if items:
        create_order_items(order_id, items, restaurant_id)
    
    # Log status change
    log_status_change(order_id, "pending", "system")
    
    logger.info(f"Order created: {order_number} (ID: {order_id})")
    
    # Auto-print order receipt
    try:
        from services.printer_service import print_order
        print_order(order_id)
        logger.info(f"Print job sent for order {order_number}")
    except Exception as e:
        # Don't fail order creation if printing fails
        logger.error(f"Failed to print order {order_number}: {e}")
    
    # Send "Order Received" SMS (non-blocking)
    try:
        from services.sms_service import send_order_status_sms
        sms_result = send_order_status_sms(order, "pending")
        if sms_result.get("success"):
            logger.info(f"Order Received SMS sent for order {order_number}")
        else:
            logger.warning(f"Order Received SMS failed for order {order_number}: {sms_result.get('error')}")
    except Exception as e:
        # Don't fail order creation if SMS fails
        logger.error(f"Error sending Order Received SMS for order {order_number}: {e}")
    
    return order


def calculate_modifier_price_adjustment(menu_item_id: str, modifier_selections: Dict) -> float:
    """
    Calculate total price adjustment from modifier selections
    
    Purpose:
    - Gets menu item modifiers and their options
    - Looks up selected options from modifier_selections
    - Calculates total price adjustment (sum of all selected option price_adjustments)
    
    Args:
    - menu_item_id: ID of the menu item
    - modifier_selections: Dict like {"Size": "Large", "Spice Level": "Hot", "Add-ons": ["Extra Sauce"]}
    
    Returns:
    - Total price adjustment (float) - can be positive, negative, or zero
    """
    try:
        # Get menu item with all modifiers and options
        menu_item = get_menu_item(menu_item_id)
        if not menu_item:
            logger.warning(f"Menu item {menu_item_id} not found for modifier calculation")
            return 0.0
        
        modifiers = menu_item.get("modifiers", [])
        total_adjustment = 0.0
        
        for modifier in modifiers:
            modifier_name = modifier.get("name")
            modifier_type = modifier.get("type", "single")  # "single" or "multiple"
            options = modifier.get("options", [])
            
            # Get selected value(s) for this modifier
            selected = modifier_selections.get(modifier_name)
            if not selected:
                continue  # No selection for this modifier
            
            # Handle single selection (radio button)
            if modifier_type == "single":
                if isinstance(selected, str):
                    # Find the selected option
                    for option in options:
                        if option.get("name") == selected:
                            price_adjustment = float(option.get("price_adjustment", 0))
                            total_adjustment += price_adjustment
                            logger.debug(f"Modifier '{modifier_name}': selected '{selected}', adjustment: ${price_adjustment}")
                            break
            
            # Handle multiple selections (checkboxes)
            elif modifier_type == "multiple":
                if isinstance(selected, list):
                    # Find each selected option
                    for selected_option_name in selected:
                        for option in options:
                            if option.get("name") == selected_option_name:
                                price_adjustment = float(option.get("price_adjustment", 0))
                                total_adjustment += price_adjustment
                                logger.debug(f"Modifier '{modifier_name}': selected '{selected_option_name}', adjustment: ${price_adjustment}")
                                break
        
        logger.info(f"Total modifier price adjustment for item {menu_item_id}: ${total_adjustment:.2f}")
        return total_adjustment
        
    except Exception as e:
        logger.error(f"Error calculating modifier price adjustment: {e}", exc_info=True)
        # Return 0 on error - don't fail order creation
        return 0.0


def create_self_service_order(order_data: Dict, restaurant_id: str) -> Dict:
    """
    Create a self-service order from customer ordering interface
    
    Purpose:
    - Creates order from self-service ordering (website/app)
    - Handles menu_item_id references (not just item names)
    - Calculates prices with modifiers automatically
    - Stores modifier_selections in order_items
    - Sets order_source='self_service'
    
    Args:
    - order_data: Dict with restaurant_id, items, customer_phone, customer_name
    - restaurant_id: Restaurant ID
    
    Returns:
    - Created order with order_id
    """
    supabase = get_supabase_client()
    
    # Validate required fields
    items = order_data.get("items", [])
    if not items:
        raise ValueError("Order must have at least one item")
    
    customer_phone = order_data.get("customer_phone")
    if not customer_phone:
        raise ValueError("Customer phone is required")
    
    # Calculate totals for each item and overall order
    subtotal = 0.0
    order_items_data = []
    
    for item_data in items:
        menu_item_id = item_data.get("menu_item_id")
        quantity = item_data.get("quantity", 1)
        modifier_selections = item_data.get("modifier_selections", {})
        
        if not menu_item_id:
            raise ValueError("menu_item_id is required for each item")
        
        # Get menu item details (price, name, etc.)
        menu_item = get_menu_item(menu_item_id)
        if not menu_item:
            raise ValueError(f"Menu item {menu_item_id} not found")
        
        if not menu_item.get("is_available"):
            raise ValueError(f"Menu item '{menu_item.get('name')}' is not available")
        
        # Calculate base price + modifier adjustments
        base_price = float(menu_item.get("price", 0))
        modifier_adjustment = calculate_modifier_price_adjustment(menu_item_id, modifier_selections)
        item_unit_price = base_price + modifier_adjustment
        item_total = item_unit_price * quantity
        
        subtotal += item_total
        
        # Prepare order item data (order_items table stores item_name, not menu_item_id)
        order_item = {
            "item_name": menu_item.get("name"),
            "item_name_chinese": menu_item.get("name_chinese"),
            "quantity": quantity,
            "price": item_unit_price,  # Unit price after modifiers
            "modifier_selections": modifier_selections,  # Store modifier selections as JSONB
            "special_instructions": item_data.get("special_instructions")
        }
        
        order_items_data.append(order_item)
        
        logger.info(f"Order item: {menu_item.get('name')} x{quantity} @ ${item_unit_price:.2f} = ${item_total:.2f}")
    
    # Calculate tax and total
    tax_amount = subtotal * TAX_RATE
    total_amount = subtotal + tax_amount
    
    logger.info(f"Order calculation: Subtotal: ${subtotal:.2f}, Tax (7.25%): ${tax_amount:.2f}, Total: ${total_amount:.2f}")
    
    # Generate order number
    order_number = generate_order_number(restaurant_id)
    
    # Prepare order record
    order_record = {
        "restaurant_id": restaurant_id,
        "order_number": order_number,
        "customer_phone": format_phone_number(customer_phone),
        "customer_name": order_data.get("customer_name"),
        "status": "pending",
        "total_amount": round(total_amount, 2),
        "estimated_ready_time": order_data.get("estimated_ready_time"),
        "special_instructions": order_data.get("special_instructions"),
        "order_source": "self_service",  # Mark as self-service order
        "customer_session_id": order_data.get("customer_session_id"),  # Optional session tracking
        "created_at": get_current_timestamp().isoformat()
    }
    
    # Insert order
    result = supabase.table("orders").insert(order_record).execute()
    
    if not result.data:
        raise Exception("Failed to create order")
    
    order = result.data[0]
    order_id = order["id"]
    
    # Create order items with modifier_selections
    create_self_service_order_items(order_id, order_items_data)
    
    # Log status change
    log_status_change(order_id, "pending", "system")
    
    logger.info(f"Self-service order created: {order_number} (ID: {order_id}), Total: ${total_amount:.2f}")
    
    # Auto-print order receipt
    try:
        from services.printer_service import print_order
        print_order(order_id)
        logger.info(f"Print job sent for order {order_number}")
    except Exception as e:
        logger.error(f"Failed to print order {order_number}: {e}")
    
    # Send "Order Received" SMS (non-blocking)
    try:
        from services.sms_service import send_order_status_sms
        sms_result = send_order_status_sms(order, "pending")
        if sms_result.get("success"):
            logger.info(f"Order Received SMS sent for order {order_number}")
        else:
            logger.warning(f"Order Received SMS failed for order {order_number}: {sms_result.get('error')}")
    except Exception as e:
        logger.error(f"Error sending Order Received SMS for order {order_number}: {e}")
    
    return order


def create_self_service_order_items(order_id: str, items: List[Dict]):
    """
    Create order items for self-service order
    Handles modifier_selections JSONB field
    
    Purpose:
    - Creates order_items with modifier_selections stored as JSONB
    - Stores item details from menu_items table
    - Handles bilingual support
    """
    supabase = get_supabase_client()
    
    order_items = []
    for item in items:
        item_name = item.get("item_name", "")
        
        # Get Chinese translation if not provided
        item_name_chinese = item.get("item_name_chinese")
        if not item_name_chinese and item_name:
            item_name_chinese = get_chinese_translation(item_name)
        
        order_item = {
            "order_id": order_id,
            "item_name": item_name,
            "item_name_chinese": item_name_chinese,
            "quantity": item.get("quantity", 1),
            "price": item.get("price"),
            "modifier_selections": item.get("modifier_selections"),  # JSONB field
            "special_instructions": item.get("special_instructions"),
            "special_instructions_chinese": item.get("special_instructions_chinese")
        }
        order_items.append(order_item)
    
    # Insert all items at once
    if order_items:
        supabase.table("order_items").insert(order_items).execute()
        logger.info(f"Created {len(order_items)} order items for self-service order {order_id}")


def create_order_items(order_id: str, items: List[Dict], restaurant_id: str = None):
    """
    Create order items for an order
    Handles bilingual support (English + Chinese)
    Automatically looks up prices from menu_items table if not provided
    
    Purpose:
    - Creates order_items records for an order
    - Automatically looks up prices from menu database if not provided
    - Ensures all orders have prices for receipt generation
    
    Why automatic price lookup:
    - Voice orders come in with item names only (no prices)
    - Agent should NOT state prices during phone calls
    - Receipt must show prices automatically
    - Prices come from menu_items table for consistency
    
    Real-world example:
    - Voice order: "I want 2 Spring Rolls"
    - Item data: {item_name: "Spring Rolls", quantity: 2, price: null}
    - System looks up "Spring Rolls" in menu_items -> finds $5.99
    - Order item created: {item_name: "Spring Rolls", quantity: 2, price: 5.99}
    - Receipt shows: "Spring Rolls x2 - $11.98"
    """
    supabase = get_supabase_client()
    
    order_items = []
    for item in items:
        item_name = item.get("item_name", "")
        
        # Get Chinese translation if not provided
        item_name_chinese = item.get("item_name_chinese")
        if not item_name_chinese and item_name:
            item_name_chinese = get_chinese_translation(item_name)
        
        # AUTOMATIC PRICE LOOKUP (Task 4.3 - Client Requirement)
        # If price is not provided, automatically look it up from menu_items table
        price = item.get("price")
        if price is None and restaurant_id and item_name:
            looked_up_price = get_menu_item_price(restaurant_id, item_name)
            if looked_up_price is not None:
                price = looked_up_price
                logger.info(f"Auto-looked up price for '{item_name}': ${price:.2f}")
            else:
                logger.warning(f"Could not find price for item '{item_name}' in restaurant {restaurant_id}")
        
        order_item = {
            "order_id": order_id,
            "item_name": item_name,
            "item_name_chinese": item_name_chinese,  # Bilingual support
            "quantity": item.get("quantity", 1),
            "size": item.get("size"),
            "pieces": item.get("pieces"),
            "variant": item.get("variant"),
            "price": price,  # Now includes auto-looked-up prices
            "special_instructions": item.get("special_instructions")
        }
        order_items.append(order_item)
    
    # Insert all items at once
    if order_items:
        supabase.table("order_items").insert(order_items).execute()
        logger.info(f"Created {len(order_items)} order items for order {order_id}")


def log_status_change(order_id: str, status: str, changed_by: str = "system"):
    """Log order status change"""
    supabase = get_supabase_client()
    
    status_record = {
        "order_id": order_id,
        "status": status,
        "changed_by": changed_by,
        "changed_at": get_current_timestamp().isoformat()
    }
    
    supabase.table("order_status_history").insert(status_record).execute()


def update_order_status(order_id: str, new_status: str, changed_by: str = "kds") -> Dict:
    """
    Update order status
    Validates status transition, logs the change, and sends SMS notification
    Returns updated order
    """
    supabase = get_supabase_client()
    
    # Valid statuses
    valid_statuses = ["pending", "preparing", "ready", "completed", "cancelled"]
    if new_status not in valid_statuses:
        raise ValueError(f"Invalid status: {new_status}. Must be one of: {valid_statuses}")
    
    # Get current order
    order = get_order_by_id(order_id)
    if not order:
        raise Exception(f"Order {order_id} not found")
    
    current_status = order.get("status")
    
    # Update order status
    result = supabase.table("orders").update({
        "status": new_status,
        "updated_at": get_current_timestamp().isoformat()
    }).eq("id", order_id).execute()
    
    if not result.data:
        raise Exception("Failed to update order status")
    
    # Log status change
    log_status_change(order_id, new_status, changed_by)
    
    logger.info(f"Order {order.get('order_number')} status updated: {current_status} -> {new_status}")
    
    # Get updated order
    updated_order = get_order_by_id(order_id)
    
    # Send SMS notification (async, non-blocking)
    # Only send SMS when status changes to "ready"
    if current_status != new_status and new_status == "ready":
        try:
            from services.sms_service import send_order_status_sms
            sms_result = send_order_status_sms(updated_order, new_status)
            if sms_result.get("success"):
                logger.info(f"SMS notification sent for order {order.get('order_number')} (status: {new_status})")
            else:
                logger.warning(f"SMS notification failed for order {order.get('order_number')}: {sms_result.get('error')}")
        except Exception as e:
            # Don't fail status update if SMS fails
            logger.error(f"Error sending SMS notification for order {order.get('order_number')}: {e}")
    
    return updated_order


def cancel_order(order_id: str, cancellation_reason: Optional[str] = None, cancelled_by: str = "admin") -> Dict:
    """
    Cancel an order
    Business rules:
    - Can only cancel orders that are not already completed or cancelled
    - Logs cancellation reason
    - Sends cancellation SMS to customer
    - Returns cancelled order
    """
    supabase = get_supabase_client()
    
    # Get current order
    order = get_order_by_id(order_id)
    if not order:
        raise Exception(f"Order {order_id} not found")
    
    current_status = order.get("status")
    
    # Business rule: Cannot cancel already completed or cancelled orders
    if current_status == "completed":
        raise ValueError("Cannot cancel a completed order")
    
    if current_status == "cancelled":
        raise ValueError("Order is already cancelled")
    
    # Update order status to cancelled
    update_data = {
        "status": "cancelled",
        "updated_at": get_current_timestamp().isoformat()
    }
    
    # Add cancellation reason if provided (store in special_instructions or add new field)
    # For now, we'll append to special_instructions
    if cancellation_reason:
        existing_instructions = order.get("special_instructions", "") or ""
        cancellation_note = f"[CANCELLED: {cancellation_reason}]"
        if existing_instructions:
            update_data["special_instructions"] = f"{existing_instructions}\n{cancellation_note}"
        else:
            update_data["special_instructions"] = cancellation_note
    
    result = supabase.table("orders").update(update_data).eq("id", order_id).execute()
    
    if not result.data:
        raise Exception("Failed to cancel order")
    
    # Log status change
    log_status_change(order_id, "cancelled", cancelled_by)
    
    logger.info(f"Order {order.get('order_number')} cancelled by {cancelled_by}. Reason: {cancellation_reason or 'Not provided'}")
    
    # Get updated order
    cancelled_order = get_order_by_id(order_id)
    
    # Send cancellation SMS to customer (non-blocking)
    try:
        from services.sms_service import send_order_cancellation_sms
        sms_result = send_order_cancellation_sms(cancelled_order, cancellation_reason)
        if sms_result.get("success"):
            logger.info(f"Cancellation SMS sent for order {order.get('order_number')}")
        else:
            logger.warning(f"Cancellation SMS failed for order {order.get('order_number')}: {sms_result.get('error')}")
    except Exception as e:
        # Don't fail cancellation if SMS fails
        logger.error(f"Error sending cancellation SMS for order {order.get('order_number')}: {e}")
    
    return cancelled_order


def get_order_by_id(order_id: str) -> Optional[Dict]:
    """Get order by ID with items"""
    supabase = get_supabase_client()
    
    # Get order
    order_result = supabase.table("orders").select("*").eq("id", order_id).execute()
    
    if not order_result.data:
        return None
    
    order = order_result.data[0]
    
    # Get order items
    items_result = supabase.table("order_items").select("*").eq("order_id", order_id).execute()
    order["items"] = items_result.data if items_result.data else []
    
    return order
