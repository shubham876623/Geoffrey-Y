"""
Orders API routes - handle order status updates
Simple and clean
"""

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from services.order_service import update_order_status, get_order_by_id
from config import Config
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orders", tags=["orders"])


class StatusUpdateRequest(BaseModel):
    status: str


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

