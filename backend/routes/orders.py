"""
Orders API routes - handle order status updates
Simple and clean
"""

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from services.order_service import update_order_status, get_order_by_id, create_self_service_order
from config import Config
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orders", tags=["orders"])


class StatusUpdateRequest(BaseModel):
    status: str


class SelfServiceOrderItem(BaseModel):
    menu_item_id: str
    quantity: int = 1
    modifier_selections: Dict = {}
    special_instructions: Optional[str] = None


class SelfServiceOrderRequest(BaseModel):
    restaurant_id: str
    items: List[SelfServiceOrderItem]
    customer_phone: str
    customer_name: Optional[str] = None
    customer_session_id: Optional[str] = None
    special_instructions: Optional[str] = None
    estimated_ready_time: Optional[str] = None


def verify_api_key(x_api_key: str = Header(None)):
    """Verify API key for KDS access"""
    if not x_api_key:
        logger.warning("Missing API key in request")
        raise HTTPException(status_code=401, detail="Missing API key")
    
    # Debug logging (only first 10 chars for security)
    received_key_preview = x_api_key[:10] + "..." if len(x_api_key) > 10 else x_api_key
    expected_key_preview = Config.KDS_API_KEY[:10] + "..." if Config.KDS_API_KEY and len(Config.KDS_API_KEY) > 10 else Config.KDS_API_KEY
    
    logger.info(f"API key check - Received: {received_key_preview}, Expected: {expected_key_preview}")
    
    if not Config.KDS_API_KEY:
        logger.error("KDS_API_KEY is not set in backend .env file!")
        raise HTTPException(status_code=500, detail="Server configuration error: KDS_API_KEY not set")
    
    if x_api_key != Config.KDS_API_KEY:
        logger.warning(f"API key mismatch - Received length: {len(x_api_key)}, Expected length: {len(Config.KDS_API_KEY)}")
        raise HTTPException(status_code=403, detail="Invalid API key")
    
    return True


@router.post("/{order_id}/status")
async def update_status(
    order_id: str,
    request: StatusUpdateRequest,
    x_api_key: str = Header(None)
):
    """
    Update order status
    Requires API key authentication
    """
    # Verify API key
    verify_api_key(x_api_key)
    
    try:
        updated_order = update_order_status(order_id, request.status, changed_by="kds")
        return {
            "success": True,
            "order": updated_order
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating order status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update order status: {str(e)}")


@router.get("/{order_id}")
async def get_order(
    order_id: str,
    x_api_key: str = Header(None)
):
    """
    Get order by ID
    Requires API key authentication
    """
    # Verify API key
    verify_api_key(x_api_key)
    
    order = get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order


@router.post("/self-service")
async def create_self_service_order_endpoint(request: SelfServiceOrderRequest):
    """
    Create a self-service order from customer ordering interface
    
    Purpose:
    - Creates order from self-service ordering (website/app)
    - Handles menu_item_id references (not just item names)
    - Calculates prices with modifiers automatically
    - Stores modifier_selections in order_items
    - Sets order_source='self_service'
    
    Request:
    - restaurant_id: Restaurant ID
    - items: List of items with menu_item_id, quantity, modifier_selections
    - customer_phone: Customer phone number
    - customer_name: Customer name (optional)
    - customer_session_id: Session ID for tracking (optional)
    
    Returns:
    - Order confirmation with order_id and order_number
    """
    try:
        # Convert Pydantic model to dict
        order_data = {
            "restaurant_id": request.restaurant_id,
            "items": [
                {
                    "menu_item_id": item.menu_item_id,
                    "quantity": item.quantity,
                    "modifier_selections": item.modifier_selections,
                    "special_instructions": item.special_instructions
                }
                for item in request.items
            ],
            "customer_phone": request.customer_phone,
            "customer_name": request.customer_name,
            "customer_session_id": request.customer_session_id,
            "special_instructions": request.special_instructions,
            "estimated_ready_time": request.estimated_ready_time
        }
        
        # Create order
        order = create_self_service_order(order_data, request.restaurant_id)
        
        logger.info(f"Self-service order created: {order['order_number']} (ID: {order['id']})")
        
        return {
            "success": True,
            "message": "Order created successfully",
            "order": {
                "id": order["id"],
                "order_number": order["order_number"],
                "status": order["status"],
                "total_amount": order["total_amount"],
                "estimated_ready_time": order.get("estimated_ready_time")
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating self-service order: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

