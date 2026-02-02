"""
Webhook routes - SynthFlow webhook endpoints
Two separate endpoints:
1. /synthflow-inbound - For inbound_call events (restaurant identification)
2. /synthflow - For completed events (order processing)
"""

from fastapi import APIRouter, Request, HTTPException, Query, BackgroundTasks
from services.parser_service import parse_order_data
from services.order_service import create_order
from services.restaurant_service import get_restaurant_by_phone
from services.menu_service import get_public_menu
from utils.helpers import format_phone_number
import logging
from typing import Dict, Optional
import time
import httpx
import asyncio
import os
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhook", tags=["webhook"])

# Simple in-memory cache to store restaurant phone by model_id/call_id
# Format: {model_id: {"restaurant_phone": "+1234567890", "restaurant_id": "...", "timestamp": 1234567890}}
_restaurant_cache: Dict[str, Dict] = {}
CACHE_EXPIRY_SECONDS = 3600  # 1 hour - webhooks should arrive within seconds

# Cache to store menu data ready for Synthflow
# Format: {model_id: {"menu_data": {...}, "timestamp": 1234567890}}
_menu_cache: Dict[str, Dict] = {}


async def handle_inbound_call(webhook_data: dict):
    """
    Handle inbound_call webhook data
    Extracts restaurant phone and IMMEDIATELY sends menu data to Synthflow
    """
   
    
    call_inbound = webhook_data.get("call_inbound", {})
    
    if not call_inbound:
        # logger.error("[handle_inbound_call] [ERROR] call_inbound data is missing or empty!")
        # logger.error(f"[handle_inbound_call] webhook_data structure: {json.dumps(webhook_data, indent=2)}")
        raise HTTPException(status_code=400, detail="call_inbound data is required")
    
    # Get model_id to use as cache key
    model_id = call_inbound.get("model_id")
    # logger.info(f"[handle_inbound_call] model_id extracted: {model_id}")
    # logger.info(f"[handle_inbound_call] model_id type: {type(model_id)}")
    if not model_id:
        # logger.error("[handle_inbound_call] [ERROR] model_id is missing in call_inbound!")
        # logger.error(f"[handle_inbound_call] call_inbound content: {json.dumps(call_inbound, indent=2)}")
        raise HTTPException(status_code=400, detail="model_id is required in call_inbound")
    
    # Get restaurant phone (to_number is the restaurant's phone that received the call)
    restaurant_phone = call_inbound.get("to_number")
    # logger.info(f"[handle_inbound_call] restaurant_phone (to_number) extracted: {restaurant_phone}")
    # logger.info(f"[handle_inbound_call] restaurant_phone type: {type(restaurant_phone)}")
    if not restaurant_phone:
        # logger.error("[handle_inbound_call] [ERROR] to_number is missing in call_inbound!")
        # logger.error(f"[handle_inbound_call] call_inbound content: {json.dumps(call_inbound, indent=2)}")
        raise HTTPException(status_code=400, detail="to_number is required in call_inbound")
    
    # Normalize phone number
    # logger.info(f"[handle_inbound_call] Normalizing phone number: {restaurant_phone}")
    restaurant_phone = format_phone_number(restaurant_phone)
    # logger.info(f"[handle_inbound_call] Normalized phone number: {restaurant_phone}")
    
    # Find restaurant
    restaurant = get_restaurant_by_phone(restaurant_phone)
    if not restaurant:
        raise HTTPException(
            status_code=404,
            detail=f"Restaurant not found for phone {restaurant_phone}. Please onboard first."
        )
    
    # Store in cache using model_id as key
    # Note: Menu data will be fetched via custom action /get-menu endpoint, not automatically pushed
    _restaurant_cache[model_id] = {
        "restaurant_phone": restaurant_phone,
        "restaurant_id": restaurant["id"],
        "restaurant_name": restaurant["name"],
        "timestamp": time.time()
    }
    
    # logger.info(f"Inbound call received: {restaurant['name']} (ID: {restaurant['id']}) for model_id: {model_id}")
    
    # Return response immediately without waiting for menu fetch/send
    return {
        "status": "success",
        "message": "Inbound call data received. Menu data is being sent to Synthflow.",
        "restaurant_id": restaurant["id"],
        "restaurant_name": restaurant["name"],
        "model_id": model_id,
        "menu_ready": True
    }


async def send_menu_to_synthflow_by_restaurant_id(restaurant_id: str, restaurant_phone: str, model_id: str):
    """
    Fetch menu data and send to Synthflow webhook - simple function that takes just restaurant_id
    This runs asynchronously so it doesn't block the inbound webhook response
    """
    try:
        # logger.info(f"[send_menu_to_synthflow_by_restaurant_id] Starting for restaurant_id: {restaurant_id}, model_id: {model_id}")
        
        # Get restaurant name
        from services.restaurant_service import get_restaurant_by_id
        restaurant = get_restaurant_by_id(restaurant_id)
        if not restaurant:
            # logger.error(f"[send_menu_to_synthflow_by_restaurant_id] Restaurant not found: {restaurant_id}")
            return
        
        restaurant_name = restaurant.get("name", "Unknown")
        
        # Fetch menu data
        from services.menu_service import get_public_menu
        menu_data = get_public_menu(restaurant_id)
        
        # Format menu data for Synthflow (simplified format)
        all_items_simple = []
        
        # Get items from categories
        for category in menu_data.get("categories", []):
            for item in category.get("items", []):
                all_items_simple.append({
                    "name": item.get("name", ""),
                    "name_chinese": item.get("name_chinese", ""),
                    "description": item.get("description", ""),
                    "price": float(item.get("price", 0)) if item.get("price") else 0.0,
                    "category": category.get("name", "")
                })
        
        # Add items without category
        for item in menu_data.get("items", []):
            all_items_simple.append({
                "name": item.get("name", ""),
                "name_chinese": item.get("name_chinese", ""),
                "description": item.get("description", ""),
                "price": float(item.get("price", 0)) if item.get("price") else 0.0,
                "category": None
            })
        
        # logger.info(f"[send_menu_to_synthflow_by_restaurant_id] Menu data fetched: {len(all_items_simple)} items for {restaurant_name}")
        
        # Cache the formatted menu data
        _menu_cache[model_id] = {
            "menu_data": {
                "success": True,
                "restaurant_id": restaurant_id,
                "restaurant_name": restaurant_name,
                "menu": {
                    "items": all_items_simple,
                    "categories": [
                        {
                            "name": cat.get("name", ""),
                            "description": cat.get("description", ""),
                            "item_count": len(cat.get("items", []))
                        }
                        for cat in menu_data.get("categories", [])
                    ],
                    "total_items": len(all_items_simple)
                },
                "usage": "Use this menu data to help customers. Each item has a name, price, and description. Prices are in USD. When taking orders, mention item names and the system will automatically look up prices."
            },
            "timestamp": time.time()
        }
        
        # Prepare menu data payload for Synthflow
        menu_payload = {
            "success": True,
            "restaurant_id": restaurant_id,
            "restaurant_name": restaurant_name,
            "restaurant_phone": restaurant_phone,
            "model_id": model_id,
            "menu": {
                "items": all_items_simple,
                "categories": [
                    {
                        "name": cat.get("name", ""),
                        "description": cat.get("description", ""),
                        "item_count": len(cat.get("items", []))
                    }
                    for cat in menu_data.get("categories", [])
                ],
                "total_items": len(all_items_simple)
            },
            "usage": "Use this menu data to help customers. Each item has a name, price, and description. Prices are in USD. When taking orders, mention item names and the system will automatically look up prices."
        }
       
        
    except Exception as e:
        # logger.error(f"[send_menu_to_synthflow_by_restaurant_id] Error for restaurant {restaurant_id}, model_id {model_id}: {e}")
        import traceback
        # logger.error(traceback.format_exc())




@router.post("/synthflow-inbound")
async def synthflow_inbound_webhook(request: Request):
    """
    Handle inbound_call webhook from SynthFlow
    Extracts restaurant phone and stores it in cache using model_id
    SynthFlow sends this after call ends with inbound call data
    """
    try:
        # logger.info("=" * 80)
        # logger.info("[synthflow_inbound_webhook] ========== RAW WEBHOOK RECEIVED ==========")
        # logger.info(f"[synthflow_inbound_webhook] Request method: {request.method}")
        # logger.info(f"[synthflow_inbound_webhook] Request URL: {request.url}")
        # logger.info(f"[synthflow_inbound_webhook] Request headers: {dict(request.headers)}")
        
        # Get raw body and parse JSON
        body_bytes = await request.body()
        # logger.info(f"[synthflow_inbound_webhook] Raw body length: {len(body_bytes)} bytes")
        # logger.info(f"[synthflow_inbound_webhook] Raw body (first 500 chars): {body_bytes[:500]}")
        
        # Parse JSON from body
        try:
            webhook_data = json.loads(body_bytes.decode('utf-8'))
            # logger.info(f"[synthflow_inbound_webhook] Parsed JSON - data keys: {list(webhook_data.keys())}")
            # logger.info(f"[synthflow_inbound_webhook] Full webhook data: {json.dumps(webhook_data, indent=2)}")
        except json.JSONDecodeError as e:
            # logger.error(f"[synthflow_inbound_webhook] [ERROR] Failed to parse JSON: {e}")
            # logger.error(f"[synthflow_inbound_webhook] Raw body content: {body_bytes.decode('utf-8', errors='ignore')}")
            raise HTTPException(status_code=400, detail=f"Invalid JSON in webhook body: {str(e)}")
        
        # logger.info("=" * 80)
        
        return await handle_inbound_call(webhook_data)
    except HTTPException:
        raise
    except Exception as e:
        # logger.error(f"[synthflow_inbound_webhook] Inbound webhook error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing inbound webhook: {str(e)}")


def handle_completed_call(webhook_data: dict):
    """
    Handle completed webhook data
    Processes order from transcript
    Uses model_id to find restaurant phone from cache (set by inbound webhook)
    Falls back to getting restaurant from phone number if cache is missing
    """
    # logger.info("=" * 80)
    # logger.info("[handle_completed_call] ========== PROCESSING COMPLETED CALL ==========")
    
    # Get model_id or call_id from call object
    call_data = webhook_data.get("call", {})
    if not call_data:
        # logger.error("[handle_completed_call] [ERROR] call data is missing")
        raise HTTPException(status_code=400, detail="call data is required in completed webhook")
    
    # Try to get model_id first, then call_id
    model_id = call_data.get("model_id") or call_data.get("call_id")
    # logger.info(f"[handle_completed_call] model_id: {model_id}")
    
    if not model_id:
        # logger.error("[handle_completed_call] [ERROR] model_id is missing")
        raise HTTPException(status_code=400, detail="model_id or call_id is required in call object")
    
    # Get restaurant info from cache
    # logger.info(f"[handle_completed_call] Checking cache for model_id: {model_id}")
    # logger.info(f"[handle_completed_call] Current cache keys: {list(_restaurant_cache.keys())}")
    cached_data = _restaurant_cache.get(model_id)
    
    if not cached_data:
        # logger.warning(f"[handle_completed_call] [WARNING] Restaurant data not found in cache for model_id: {model_id}")
        # logger.warning(f"[handle_completed_call] Attempting fallback: Get restaurant from phone number")
        
        # Clean old cache entries
        clean_expired_cache()
        
        # FALLBACK: Try to get restaurant from phone number
        # Try multiple sources: call.to, call.to_number, executed_actions (get_menu action), lead.phone_number (last resort)
        phone_number = None
        
        # Option 1: Try call.to or call.to_number (restaurant's phone that received the call)
        if call_data.get("to") or call_data.get("to_number"):
            phone_number = call_data.get("to") or call_data.get("to_number")
            # logger.info(f"[handle_completed_call] Found phone in call data: {phone_number}")
        
        # Option 2: Try to extract from executed_actions (get_menu action URL)
        if not phone_number:
            executed_actions = webhook_data.get("executed_actions", {})
            for action_name, action_data in executed_actions.items():
                if action_data.get("name") == "get_menu":
                    action_config = action_data.get("parameters_hard_coded", {}).get("action_config", {})
                    url = action_config.get("url", "")
                    # Extract phone from URL like: ...?phone=+17756183060
                    if "phone=" in url:
                        try:
                            phone_number = url.split("phone=")[1].split("&")[0].split(" ")[0]
                            # logger.info(f"[handle_completed_call] Extracted phone from get_menu action URL: {phone_number}")
                            break
                        except:
                            pass
        
        # Option 3: Try lead.phone_number (customer's phone - not ideal but last resort)
        if not phone_number:
            lead_data = webhook_data.get("lead", {})
            phone_number = lead_data.get("phone_number")
            if phone_number:
                # logger.warning(f"[handle_completed_call] Using lead phone number (customer's phone) - may not be correct: {phone_number}")
                pass
        
        if phone_number:
            # logger.info(f"[handle_completed_call] Using phone number for restaurant lookup: {phone_number}")
            try:
                # Normalize phone number
                phone_number = format_phone_number(phone_number)
                # logger.info(f"[handle_completed_call] Normalized phone: {phone_number}")
                
                # Find restaurant by phone
                restaurant = get_restaurant_by_phone(phone_number)
                if restaurant:
                    # logger.info(f"[handle_completed_call] [SUCCESS] Found restaurant via phone fallback: {restaurant['name']}")
                    restaurant_id = restaurant["id"]
                    restaurant_name = restaurant["name"]
                    
                    # Store in cache for future use
                    _restaurant_cache[model_id] = {
                        "restaurant_phone": phone_number,
                        "restaurant_id": restaurant_id,
                        "restaurant_name": restaurant_name,
                        "timestamp": time.time()
                    }
                    # logger.info(f"[handle_completed_call] Stored in cache for future calls")
                else:
                    # logger.error(f"[handle_completed_call] [ERROR] Restaurant not found for phone: {phone_number}")
                    # logger.error(f"[handle_completed_call] Available call data: {json.dumps(call_data, indent=2)}")
                    raise HTTPException(
                        status_code=404,
                        detail=f"Restaurant not found for phone {phone_number}. Please ensure restaurant is onboarded with this phone number."
                    )
            except HTTPException:
                raise
            except Exception as e:
                # logger.error(f"[handle_completed_call] [ERROR] Fallback failed: {e}")
                import traceback
                # logger.error(traceback.format_exc())
                raise HTTPException(
                    status_code=404,
                    detail=f"Restaurant data not found for model_id {model_id}. Ensure inbound webhook is sent first or restaurant phone is available in call data."
                )
        else:
            # logger.error(f"[handle_completed_call] [ERROR] No phone number found in call data, executed_actions, or lead data")
            # logger.error(f"[handle_completed_call] Call data: {json.dumps(call_data, indent=2)}")
            raise HTTPException(
                status_code=404,
                detail=f"Restaurant data not found for model_id {model_id}. Ensure inbound webhook is sent first or restaurant phone is available."
            )
    else:
        # logger.info(f"[handle_completed_call] Found restaurant in cache: {cached_data.get('restaurant_name')}")
        
        # Check if cache entry is expired
        if time.time() - cached_data["timestamp"] > CACHE_EXPIRY_SECONDS:
            # logger.warning(f"[handle_completed_call] Cache entry expired for model_id: {model_id}")
            del _restaurant_cache[model_id]
            raise HTTPException(
                status_code=400,
                detail=f"Cache entry expired for model_id {model_id}"
            )
        
        restaurant_id = cached_data["restaurant_id"]
        restaurant_name = cached_data["restaurant_name"]
        # logger.info(f"[handle_completed_call] Using restaurant from cache: {restaurant_name} (ID: {restaurant_id})")
    
    # Parse order from transcript
    parsed_order = parse_order_data(webhook_data)
    
    # Validate required fields
    if not parsed_order.get("customer_phone"):
        raise HTTPException(status_code=400, detail="Customer phone is required")
    
    if not parsed_order.get("items") or len(parsed_order["items"]) == 0:
        raise HTTPException(status_code=400, detail="Order must have at least one item")
    
    # Create order
    order = create_order(parsed_order, restaurant_id)
    
    # logger.info(f"Order created: {order['order_number']} for restaurant {restaurant_name}")
    
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
@router.get("/synthflow")  # Add GET for testing/health checks
async def synthflow_webhook(request: Request):
    """
    Handle completed webhook from SynthFlow
    Processes order from transcript
    Uses model_id to find restaurant phone from cache (set by inbound webhook)
    """
    try:
        # logger.info("=" * 80)
        # logger.info(f"[synthflow_webhook] ========== WEBHOOK RECEIVED ==========")
        # logger.info(f"[synthflow_webhook] Method: {request.method}")
        # logger.info(f"[synthflow_webhook] URL: {request.url}")
        # logger.info(f"[synthflow_webhook] Headers: {dict(request.headers)}")
        
        # Handle GET requests (for testing/health checks)
        if request.method == "GET":
            # logger.info("[synthflow_webhook] GET request received - returning endpoint info")
            return {
                "status": "ok",
                "endpoint": "/api/webhook/synthflow",
                "method": "POST",
                "description": "Synthflow completed webhook endpoint",
                "usage": "Send POST request with completed call data"
            }
        
        # Handle POST requests (actual webhook)
        try:
            body_bytes = await request.body()
            # logger.info(f"[synthflow_webhook] Raw body length: {len(body_bytes)} bytes")
            # logger.info(f"[synthflow_webhook] Raw body (first 500 chars): {body_bytes[:500]}")
            
            webhook_data = json.loads(body_bytes.decode('utf-8'))
            # logger.info(f"[synthflow_webhook] Parsed JSON - keys: {list(webhook_data.keys())}")
            # logger.info(f"[synthflow_webhook] Full webhook data: {json.dumps(webhook_data, indent=2)}")
        except json.JSONDecodeError as e:
            # logger.error(f"[synthflow_webhook] [ERROR] Failed to parse JSON: {e}")
            # logger.error(f"[synthflow_webhook] Raw body content: {body_bytes.decode('utf-8', errors='ignore')}")
            raise HTTPException(status_code=400, detail=f"Invalid JSON in webhook body: {str(e)}")
        
        # logger.info(f"[synthflow_webhook] Completed webhook received: status={webhook_data.get('status')}")
        # logger.info("=" * 80)
        
        return handle_completed_call(webhook_data)
    except HTTPException:
        raise
    except Exception as e:
        # logger.error(f"[synthflow_webhook] Completed webhook error: {e}", exc_info=True)
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
        # logger.info(f"Cleaned {len(expired_keys)} expired cache entries")
        pass


def clean_expired_menu_cache():
    """Remove expired menu cache entries"""
    current_time = time.time()
    expired_keys = [
        key for key, value in _menu_cache.items()
        if current_time - value["timestamp"] > CACHE_EXPIRY_SECONDS
    ]
    for key in expired_keys:
        del _menu_cache[key]
    if expired_keys:
        # logger.info(f"Cleaned {len(expired_keys)} expired menu cache entries")
        pass


@router.get("/get-menu")
@router.post("/get-menu")
async def get_menu_for_restaurant(
    request: Request,
    phone: Optional[str] = Query(None, description="Restaurant phone number"),
    restaurant_phone: Optional[str] = Query(None, description="Restaurant phone number (alternative)"),
    to_number: Optional[str] = Query(None, description="Restaurant phone number (alternative)")
):
    """
    Get menu data for a restaurant by phone number
    This endpoint is designed to be called by Synthflow custom actions during a call
    
    Usage in Synthflow:
    - Create a custom action
    - Set URL: https://api.ordrlynow.com/api/webhook/get-menu?phone={{call_inbound.to_number}}
    - Or pass in request body: {"phone": "{{call_inbound.to_number}}"}
    
    Returns menu data in format ready for agent to use
    """
    try:
        # logger.info("=" * 80)
        # logger.info("[get_menu_for_restaurant] ========== MENU REQUEST RECEIVED ==========")
        
        # Try to get phone from query params first
        phone_number = phone or restaurant_phone or to_number
        
        # If not in query, try request body
        if not phone_number:
            try:
                body = await request.json()
                # logger.info(f"[get_menu_for_restaurant] Request body: {json.dumps(body, indent=2)}")
                phone_number = body.get("phone") or body.get("restaurant_phone") or body.get("to_number")
            except:
                pass
        
        # If still not found, try form data
        if not phone_number:
            try:
                form_data = await request.form()
                phone_number = form_data.get("phone") or form_data.get("restaurant_phone") or form_data.get("to_number")
            except:
                pass
        
        # logger.info(f"[get_menu_for_restaurant] Phone number extracted: {phone_number}")
        
        if not phone_number:
            # logger.error("[get_menu_for_restaurant] [ERROR] Phone number is required!")
            raise HTTPException(
                status_code=400,
                detail="Phone number is required. Pass as query parameter 'phone' or in request body."
            )
        
        # Normalize phone number
        phone_number = format_phone_number(phone_number)
        # logger.info(f"[get_menu_for_restaurant] Normalized phone: {phone_number}")
        
        # Find restaurant
        restaurant = get_restaurant_by_phone(phone_number)
        if not restaurant:
            # logger.error(f"[get_menu_for_restaurant] [ERROR] Restaurant not found for phone: {phone_number}")
            raise HTTPException(
                status_code=404,
                detail=f"Restaurant not found for phone {phone_number}. Please onboard the restaurant first."
            )
        
        restaurant_id = restaurant["id"]
        restaurant_name = restaurant["name"]
        # logger.info(f"[get_menu_for_restaurant] Restaurant found: {restaurant_name} (ID: {restaurant_id})")
        
        # Fetch menu data
        menu_data = get_public_menu(restaurant_id)
        # logger.info(f"[get_menu_for_restaurant] Menu data fetched for restaurant: {restaurant_name}")
        
        # Format menu data for Synthflow (same format as webhook)
        all_items_simple = []
        
        # Get items from categories
        for category in menu_data.get("categories", []):
            for item in category.get("items", []):
                all_items_simple.append({
                    "name": item.get("name", ""),
                    "name_chinese": item.get("name_chinese", ""),
                    "description": item.get("description", ""),
                    "price": float(item.get("price", 0)) if item.get("price") else 0.0,
                    "category": category.get("name", "")
                })
        
        # Add items without category
        for item in menu_data.get("items", []):
            all_items_simple.append({
                "name": item.get("name", ""),
                "name_chinese": item.get("name_chinese", ""),
                "description": item.get("description", ""),
                "price": float(item.get("price", 0)) if item.get("price") else 0.0,
                "category": None
            })
        
        # logger.info(f"[get_menu_for_restaurant] Formatted {len(all_items_simple)} items")
        
        # Prepare response
        response_data = {
            "success": True,
            "restaurant_id": restaurant_id,
            "restaurant_name": restaurant_name,
            "restaurant_phone": phone_number,
            "menu": {
                "items": all_items_simple,
                "categories": [
                    {
                        "name": cat.get("name", ""),
                        "description": cat.get("description", ""),
                        "item_count": len(cat.get("items", []))
                    }
                    for cat in menu_data.get("categories", [])
                ],
                "total_items": len(all_items_simple)
            },
            "usage": "Use this menu data to help customers. Each item has a name, price, and description. Prices are in USD. When taking orders, mention item names and the system will automatically look up prices."
        }
        
        # logger.info(f"[get_menu_for_restaurant] [SUCCESS] Returning menu data for {restaurant_name}")
        # logger.info("=" * 80)
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        # logger.error(f"[get_menu_for_restaurant] [ERROR] {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching menu data: {str(e)}")


@router.get("/synthflow-menu")
@router.post("/synthflow-menu")
async def get_menu_during_call(
    request: Request,
    restaurant_phone: Optional[str] = Query(None, description="Restaurant phone number (to_number from call_inbound webhook)")
):
    """
    Get menu data for Synthflow agent during an active call
    
    This endpoint returns menu data based on restaurant phone number.
    It looks up the restaurant by phone and returns the menu data.
    
    Supports both GET and POST methods:
    - GET: restaurant_phone as query parameter
    - POST: restaurant_phone in query parameter or request body
    
    Flow:
    1. Synthflow calls this endpoint with restaurant_phone (to_number from call_inbound)
    2. System looks up restaurant by phone number
    3. Returns menu data for that restaurant
    
    The menu data includes:
    - Restaurant information
    - All menu items with names, prices, descriptions
    - Categories organized with items
    - Bilingual support (English and Chinese)
    
    Usage in Synthflow:
    - Call this endpoint during the call when menu data is needed
    - Pass the restaurant_phone (to_number from call_inbound webhook)
    - Menu data is fetched and returned immediately
    """
    try:
        # Get restaurant_phone from query parameter or request body
        if not restaurant_phone:
            # Try to get from request body if POST
            if request.method == "POST":
                try:
                    body = await request.json()
                    restaurant_phone = body.get("restaurant_phone") or body.get("to_number")
                except:
                    pass
        
        if not restaurant_phone:
            raise HTTPException(
                status_code=400,
                detail="restaurant_phone is required (as query parameter or in request body)"
            )
        
        # Normalize phone number
        normalized_phone = format_phone_number(restaurant_phone)
        
        # Find restaurant by phone
        restaurant = get_restaurant_by_phone(normalized_phone)
        if not restaurant:
            raise HTTPException(
                status_code=404,
                detail=f"Restaurant not found for phone {restaurant_phone}. Please ensure restaurant is onboarded."
            )
        
        restaurant_id = restaurant["id"]
        restaurant_name = restaurant["name"]
        
        # logger.info(f"Fetching menu for Synthflow: {restaurant_name} (ID: {restaurant_id}) by phone: {restaurant_phone}")
        
        # Get menu data for this restaurant
        from services.menu_service import get_public_menu
        menu_data = get_public_menu(restaurant_id)
        
        # Format response for Synthflow (simplified format)
        # Create a flat list of items with essential info for easy searching
        all_items_simple = []
        
        # Get items from categories
        for category in menu_data.get("categories", []):
            for item in category.get("items", []):
                all_items_simple.append({
                    "name": item.get("name", ""),
                    "name_chinese": item.get("name_chinese", ""),
                    "description": item.get("description", ""),
                    "price": float(item.get("price", 0)) if item.get("price") else 0.0,
                    "category": category.get("name", "")
                })
        
        # Add items without category
        for item in menu_data.get("items", []):
            all_items_simple.append({
                "name": item.get("name", ""),
                "name_chinese": item.get("name_chinese", ""),
                "description": item.get("description", ""),
                "price": float(item.get("price", 0)) if item.get("price") else 0.0,
                "category": None
            })
        
        # logger.info(f"Menu data provided to Synthflow: {len(all_items_simple)} items for {restaurant_name}")
        
        return {
            "success": True,
            "restaurant_id": restaurant_id,
            "restaurant_name": restaurant_name,
            "menu": {
                "items": all_items_simple,
                "categories": [
                    {
                        "name": cat.get("name", ""),
                        "description": cat.get("description", ""),
                        "item_count": len(cat.get("items", []))
                    }
                    for cat in menu_data.get("categories", [])
                ],
                "total_items": len(all_items_simple)
            },
            "usage": "Use this menu data to help customers. Each item has a name, price, and description. Prices are in USD. When taking orders, mention item names and the system will automatically look up prices."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # logger.error(f"Error getting menu for Synthflow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get menu data: {str(e)}")
