"""
Restaurant routes - onboarding and management
Simple and clean
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from services.restaurant_service import create_restaurant, get_restaurant_by_id
from config import Config
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/restaurants", tags=["restaurants"])


class RestaurantCreate(BaseModel):
    """
    Restaurant creation model
    
    Required fields:
    - name: Restaurant name
    - phone: Restaurant phone number (used to identify restaurant from webhooks)
    - printnode_api_key: PrintNode API key (get from https://app.printnode.com → Account → API)
    - printnode_printer_id: PrintNode printer ID (get from https://app.printnode.com → Printers → Copy the numeric ID)
    
    Optional:
    - twilio_phone: Twilio phone number for SMS notifications
    """
    name: str
    phone: str  # Restaurant phone number (required - used to identify restaurant)
    printnode_api_key: str
    printnode_printer_id: str  # Should be a numeric ID from PrintNode dashboard
    twilio_phone: Optional[str] = None


@router.post("")
async def create_restaurant_endpoint(
    restaurant_data: RestaurantCreate,
    x_api_key: str = Header(..., description="Onboarding API key (required)")
):
    """
    Create new restaurant (onboarding endpoint)
    Requires API key authentication via x-api-key header
    """
    # Verify API key
    if not Config.ONBOARDING_API_KEY:
        logger.error("ONBOARDING_API_KEY not configured in server")
        raise HTTPException(status_code=500, detail="Server configuration error")
    
    if x_api_key != Config.ONBOARDING_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    try:
        # Validate PrintNode printer ID (should be numeric)
        try:
            printer_id_int = int(restaurant_data.printnode_printer_id)
            if printer_id_int <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="PrintNode printer ID must be a positive number. Get it from https://app.printnode.com → Printers"
                )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid PrintNode printer ID: '{restaurant_data.printnode_printer_id}'. It must be a number. Get it from https://app.printnode.com → Printers → Copy the numeric ID"
            )
        
        # Validate API key format (basic check - should be a string)
        if not restaurant_data.printnode_api_key or len(restaurant_data.printnode_api_key.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="PrintNode API key appears invalid. Get it from https://app.printnode.com → Account → API"
            )
        
        # Create restaurant
        restaurant = create_restaurant(
            name=restaurant_data.name,
            phone=restaurant_data.phone,  # Required - restaurant phone number
            printnode_api_key=restaurant_data.printnode_api_key,
            printnode_printer_id=restaurant_data.printnode_printer_id,
            twilio_phone=restaurant_data.twilio_phone
        )
        
        logger.info(f"Restaurant created: {restaurant['name']} (ID: {restaurant['id']})")
        
        return {
            "status": "success",
            "message": "Restaurant onboarded successfully",
            "restaurant_id": restaurant["id"],
            "restaurant_name": restaurant["name"]
        }
        
    except Exception as e:
        logger.error(f"Error creating restaurant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating restaurant: {str(e)}")


@router.get("/{restaurant_id}")
async def get_restaurant(restaurant_id: str):
    """Get restaurant by ID"""
    restaurant = get_restaurant_by_id(restaurant_id)
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Don't return API key for security
    if restaurant.get("printnode_api_key"):
        restaurant["printnode_api_key"] = "***hidden***"
    
    return restaurant

