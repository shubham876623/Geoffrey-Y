"""
SMS service - handles sending SMS notifications via Twilio
Simple and clean
"""

from twilio.rest import Client
from config import Config
from services.restaurant_service import get_restaurant_by_id
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

# Initialize Twilio client (lazy loading - only if credentials are available)
_twilio_client: Optional[Client] = None


def get_twilio_client() -> Optional[Client]:
    """Get Twilio client instance (lazy initialization)"""
    global _twilio_client
    
    if _twilio_client is not None:
        return _twilio_client
    
    # Check if Twilio credentials are available
    if not Config.TWILIO_ACCOUNT_SID or not Config.TWILIO_AUTH_TOKEN:
        logger.warning("Twilio credentials not configured (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing)")
        return None
    
    try:
        _twilio_client = Client(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN)
        logger.info("Twilio client initialized successfully")
        return _twilio_client
    except Exception as e:
        logger.error(f"Failed to initialize Twilio client: {e}")
        return None


def format_sms_message(
    order_number: str, 
    status: str, 
    restaurant_name: str,
    customer_name: Optional[str] = None
) -> str:
    """
    Format SMS message based on order status
    Uses client-specified message format
    Returns formatted message string
    """
    # Format message based on status (client-specified templates)
    if status == "pending":
        # Order Received message
        message = f"{restaurant_name}: Order Received\n"
        message += "We've received your order and it's being prepared.\n"
        message += "We'll notify you when it's ready for pickup."
    elif status == "ready":
        # Order Ready message
        message = f"{restaurant_name}: Order Ready\n"
        message += "Your order is now ready for pickup.\n"
        message += "Please come by at your convenience.\n"
        message += "Thank you!"
    elif status == "cancelled":
        # Order Cancelled message
        message = f"{restaurant_name}: Order Cancelled\n"
        message += f"Your order #{order_number} has been cancelled.\n"
        message += "If you have any questions, please contact us.\n"
        message += "We apologize for any inconvenience."
    else:
        # No SMS for other statuses (should not reach here)
        return ""
    
    return message


def get_twilio_phone_number(restaurant_id: Optional[str] = None) -> Optional[str]:
    """
    Get Twilio phone number to use for sending SMS
    Priority:
    1. Restaurant-specific twilio_phone (if restaurant_id provided and restaurant has twilio_phone)
    2. Global TWILIO_PHONE_NUMBER from Config
    Returns phone number or None if not configured
    """
    # Try restaurant-specific phone first
    if restaurant_id:
        try:
            restaurant = get_restaurant_by_id(restaurant_id)
            if restaurant and restaurant.get("twilio_phone"):
                logger.info(f"Using restaurant-specific Twilio phone: {restaurant['twilio_phone']}")
                return restaurant["twilio_phone"]
        except Exception as e:
            logger.warning(f"Failed to get restaurant Twilio phone: {e}")
    
    # Fall back to global config
    if Config.TWILIO_PHONE_NUMBER:
        logger.info(f"Using global Twilio phone: {Config.TWILIO_PHONE_NUMBER}")
        return Config.TWILIO_PHONE_NUMBER
    
    logger.warning("No Twilio phone number configured (neither restaurant-specific nor global)")
    return None


def send_sms(
    to_phone: str,
    order_number: str,
    status: str,
    restaurant_name: str,
    restaurant_id: Optional[str] = None,
    customer_name: Optional[str] = None
) -> Dict:
    """
    Send SMS notification for order status change
    Args:
        to_phone: Customer phone number (E.164 format recommended, e.g., +1234567890)
        order_number: Order number to include in message
        status: Order status (pending for "Order Received", ready for "Order Ready")
        restaurant_name: Restaurant name to include in message
        restaurant_id: Optional restaurant ID (to use restaurant-specific Twilio phone)
        customer_name: Optional customer name (currently not used but kept for compatibility)
    Returns:
        Dict with 'success' (bool) and 'message_id' (str) or 'error' (str)
    """
    # Send SMS for "pending" (Order Received), "ready" (Order Ready), or "cancelled" (Order Cancelled) status
    if status not in ["pending", "ready", "cancelled"]:
        logger.info(f"Skipping SMS for status '{status}' (order {order_number}) - SMS only sent for 'pending', 'ready', or 'cancelled'")
        return {"success": False, "error": f"SMS not sent for status '{status}' - only sent for 'pending', 'ready', or 'cancelled'"}
    
    # Get Twilio client
    client = get_twilio_client()
    if not client:
        error_msg = "Twilio client not available (credentials not configured)"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}
    
    # Get Twilio phone number
    from_phone = get_twilio_phone_number(restaurant_id)
    if not from_phone:
        error_msg = "Twilio phone number not configured"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}
    
    # Format message
    try:
        message_body = format_sms_message(order_number, status, restaurant_name, customer_name)
    except Exception as e:
        error_msg = f"Failed to format SMS message: {e}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}
    
    # Send SMS
    try:
        logger.info(f"Sending SMS to {to_phone} for order {order_number} (status: {status})")
        
        message = client.messages.create(
            body=message_body,
            from_=from_phone,
            to=to_phone
        )
        
        logger.info(f"SMS sent successfully to {to_phone} (Message SID: {message.sid})")
        return {
            "success": True,
            "message_id": message.sid,
            "status": message.status,
            "to_phone": to_phone,
            "from_phone": from_phone
        }
        
    except Exception as e:
        error_msg = f"Failed to send SMS to {to_phone}: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}


def send_order_status_sms(order: Dict, new_status: str) -> Dict:
    """
    Convenience function to send SMS for order status change
    Extracts order information and calls send_sms
    Args:
        order: Order dictionary (must include order_number, customer_phone, customer_name, restaurant_id)
        new_status: New order status
    Returns:
        Dict with SMS send result
    """
    try:
        customer_phone = order.get("customer_phone")
        order_number = order.get("order_number")
        customer_name = order.get("customer_name")
        restaurant_id = order.get("restaurant_id")
        
        if not customer_phone:
            error_msg = "Customer phone number not found in order"
            logger.warning(error_msg)
            return {"success": False, "error": error_msg}
        
        if not order_number:
            error_msg = "Order number not found in order"
            logger.warning(error_msg)
            return {"success": False, "error": error_msg}
        
        # Get restaurant name
        restaurant_name = "the restaurant"
        if restaurant_id:
            try:
                restaurant = get_restaurant_by_id(restaurant_id)
                if restaurant and restaurant.get("name"):
                    restaurant_name = restaurant["name"]
            except Exception as e:
                logger.warning(f"Failed to get restaurant name for SMS: {e}")
        
        return send_sms(
            to_phone=customer_phone,
            order_number=order_number,
            status=new_status,
            restaurant_name=restaurant_name,
            restaurant_id=restaurant_id,
            customer_name=customer_name
        )
        
    except Exception as e:
        error_msg = f"Error in send_order_status_sms: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}


def send_order_cancellation_sms(order: Dict, cancellation_reason: Optional[str] = None) -> Dict:
    """
    Convenience function to send cancellation SMS to customer
    Args:
        order: Order dictionary (must include order_number, customer_phone, customer_name, restaurant_id)
        cancellation_reason: Optional reason for cancellation (not included in SMS for privacy)
    Returns:
        Dict with SMS send result
    """
    try:
        customer_phone = order.get("customer_phone")
        order_number = order.get("order_number")
        customer_name = order.get("customer_name")
        restaurant_id = order.get("restaurant_id")
        
        if not customer_phone:
            error_msg = "Customer phone number not found in order"
            logger.warning(error_msg)
            return {"success": False, "error": error_msg}
        
        if not order_number:
            error_msg = "Order number not found in order"
            logger.warning(error_msg)
            return {"success": False, "error": error_msg}
        
        # Get restaurant name
        restaurant_name = "the restaurant"
        if restaurant_id:
            try:
                restaurant = get_restaurant_by_id(restaurant_id)
                if restaurant and restaurant.get("name"):
                    restaurant_name = restaurant["name"]
            except Exception as e:
                logger.warning(f"Failed to get restaurant name for SMS: {e}")
        
        return send_sms(
            to_phone=customer_phone,
            order_number=order_number,
            status="cancelled",
            restaurant_name=restaurant_name,
            restaurant_id=restaurant_id,
            customer_name=customer_name
        )
        
    except Exception as e:
        error_msg = f"Error in send_order_cancellation_sms: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

