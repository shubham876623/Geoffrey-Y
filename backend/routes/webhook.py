"""
Webhook routes - SynthFlow webhook endpoints
Two separate endpoints:
1. /synthflow-inbound - For inbound_call events (restaurant identification)
2. /synthflow - For completed events (order processing)
"""

from fastapi import APIRouter, Request, HTTPException
from services.parser_service import parse_order_data
from services.order_service import create_order
from services.restaurant_service import get_restaurant_by_phone
from utils.helpers import format_phone_number
import logging
from typing import Dict, Optional
import time

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhook", tags=["webhook"])

# Simple in-memory cache to store restaurant phone by model_id/call_id
# Format: {model_id: {"restaurant_phone": "+1234567890", "restaurant_id": "...", "timestamp": 1234567890}}
_restaurant_cache: Dict[str, Dict] = {}
CACHE_EXPIRY_SECONDS = 3600  # 1 hour - webhooks should arrive within seconds


def handle_inbound_call(webhook_data: dict):
    """
    Handle inbound_call webhook data
    Extracts restaurant phone and stores it in cache using model_id
    """
    # Get call_inbound data
    call_inbound = webhook_data.get("call_inbound", {})
    if not call_inbound:
        raise HTTPException(status_code=400, detail="call_inbound data is required")
    
    # Get model_id to use as cache key
    model_id = call_inbound.get("model_id")
    if not model_id:
        raise HTTPException(status_code=400, detail="model_id is required in call_inbound")
    
    # Get restaurant phone (to_number is the restaurant's phone that received the call)
    restaurant_phone = call_inbound.get("to_number")
    if not restaurant_phone:
        raise HTTPException(status_code=400, detail="to_number is required in call_inbound")
    
    # Normalize phone number
    restaurant_phone = format_phone_number(restaurant_phone)
    
    # Find restaurant
    restaurant = get_restaurant_by_phone(restaurant_phone)
    if not restaurant:
        raise HTTPException(
            status_code=404,
            detail=f"Restaurant not found for phone {restaurant_phone}. Please onboard first."
        )
    
    # Store in cache using model_id as key
    _restaurant_cache[model_id] = {
        "restaurant_phone": restaurant_phone,
        "restaurant_id": restaurant["id"],
        "restaurant_name": restaurant["name"],
        "timestamp": time.time()
    }
    
    logger.info(f"Inbound call cached: {restaurant['name']} (ID: {restaurant['id']}) for model_id: {model_id}")
    
    return {
        "status": "success",
        "message": "Inbound call data received and cached",
        "restaurant_id": restaurant["id"],
        "restaurant_name": restaurant["name"],
        "model_id": model_id
    }


@router.post("/synthflow-inbound")
async def synthflow_inbound_webhook(request: Request):
    """
    Handle inbound_call webhook from SynthFlow
    Extracts restaurant phone and stores it in cache using model_id
    SynthFlow sends this after call ends with inbound call data
    """
    try:
        webhook_data = await request.json()
        logger.info(f"Inbound webhook received")
        return handle_inbound_call(webhook_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Inbound webhook error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing inbound webhook: {str(e)}")


def handle_completed_call(webhook_data: dict):
    """
    Handle completed webhook data
    Processes order from transcript
    Uses model_id to find restaurant phone from cache (set by inbound webhook)
    """
    # Get model_id or call_id from call object
    call_data = webhook_data.get("call", {})
    if not call_data:
        raise HTTPException(status_code=400, detail="call data is required in completed webhook")
    
    # Try to get model_id first, then call_id
    model_id = call_data.get("model_id") or call_data.get("call_id")
    if not model_id:
        raise HTTPException(status_code=400, detail="model_id or call_id is required in call object")
    
    # Get restaurant info from cache
    cached_data = _restaurant_cache.get(model_id)
    if not cached_data:
        # Clean old cache entries
        clean_expired_cache()
        raise HTTPException(
            status_code=404,
            detail=f"Restaurant data not found for model_id {model_id}. Ensure inbound webhook is sent first."
        )
    
    # Check if cache entry is expired
    if time.time() - cached_data["timestamp"] > CACHE_EXPIRY_SECONDS:
        del _restaurant_cache[model_id]
        raise HTTPException(
            status_code=400,
            detail=f"Cache entry expired for model_id {model_id}"
        )
    
    restaurant_id = cached_data["restaurant_id"]
    restaurant_name = cached_data["restaurant_name"]
    logger.info(f"Found restaurant from cache: {restaurant_name} (ID: {restaurant_id}) for model_id: {model_id}")
    
    # Parse order from transcript
    parsed_order = parse_order_data(webhook_data)
    
    # Validate required fields
    if not parsed_order.get("customer_phone"):
        raise HTTPException(status_code=400, detail="Customer phone is required")
    
    if not parsed_order.get("items") or len(parsed_order["items"]) == 0:
        raise HTTPException(status_code=400, detail="Order must have at least one item")
    
    # Create order
    order = create_order(parsed_order, restaurant_id)
    
    logger.info(f"Order created: {order['order_number']} for restaurant {restaurant_name}")
    
    # Clean up cache after successful order creation
    if model_id in _restaurant_cache:
        del _restaurant_cache[model_id]
    
    return {
        "status": "success",
        "message": "Order processed",
        "order_number": order["order_number"],
        "order_id": order["id"]
    }


@router.post("/synthflow")
async def synthflow_webhook(request: Request):
    """
    Handle completed webhook from SynthFlow
    Processes order from transcript
    Uses model_id to find restaurant phone from cache (set by inbound webhook)
    """
    try:
        webhook_data = await request.json()
        logger.info(f"Completed webhook received: status={webhook_data.get('status')}")
        return handle_completed_call(webhook_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Completed webhook error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing completed webhook: {str(e)}")


def clean_expired_cache():
    """Remove expired cache entries"""
    current_time = time.time()
    expired_keys = [
        key for key, value in _restaurant_cache.items()
        if current_time - value["timestamp"] > CACHE_EXPIRY_SECONDS
    ]
    for key in expired_keys:
        del _restaurant_cache[key]
    if expired_keys:
        logger.info(f"Cleaned {len(expired_keys)} expired cache entries")
