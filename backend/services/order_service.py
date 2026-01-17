"""
Order service - handles order creation and management
Simple, clean, easy to understand
"""

from supabase import Client
from services.supabase_service import get_supabase_client
from services.translation_service import get_chinese_translation
from utils.helpers import generate_order_number, get_current_timestamp, format_phone_number
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

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
        create_order_items(order_id, items)
    
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


def create_order_items(order_id: str, items: List[Dict]):
    """
    Create order items for an order
    Handles bilingual support (English + Chinese)
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
            "item_name_chinese": item_name_chinese,  # Bilingual support
            "quantity": item.get("quantity", 1),
            "size": item.get("size"),
            "pieces": item.get("pieces"),
            "variant": item.get("variant"),
            "price": item.get("price"),
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
    valid_statuses = ["pending", "preparing", "ready", "completed"]
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
