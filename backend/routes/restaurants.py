"""
Restaurant routes - onboarding and management
Simple and clean
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional, List
from services.restaurant_service import create_restaurant, get_restaurant_by_id, get_all_restaurants, update_restaurant, delete_restaurant
from services.auth_service import create_user, hash_password, get_users_by_restaurant
from routes.auth import get_current_user, require_role
from config import Config
from pydantic import BaseModel
import logging
import secrets
import string
import re

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


class RestaurantUpdate(BaseModel):
    """
    Restaurant update model
    All fields are optional - only provided fields will be updated
    """
    name: Optional[str] = None
    phone: Optional[str] = None
    printnode_api_key: Optional[str] = None
    printnode_printer_id: Optional[str] = None
    twilio_phone: Optional[str] = None


@router.post("")
async def create_restaurant_endpoint(
    restaurant_data: RestaurantCreate,
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """
    Create new restaurant (onboarding endpoint)
    Requires super_admin authentication via JWT token
    """
    
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
        
        restaurant_id = restaurant["id"]
        logger.info(f"Restaurant created: {restaurant['name']} (ID: {restaurant_id})")
        
        # Generate unique username based on restaurant name
        # Convert restaurant name to lowercase, remove special chars, replace spaces with underscore
        username_base = re.sub(r'[^a-z0-9]', '', restaurant_data.name.lower().replace(' ', '_'))
        # Take first 15 chars and append last 4 chars of restaurant ID for uniqueness
        unique_suffix = restaurant_id.split('-')[-1][:4]
        username = f"{username_base[:15]}_{unique_suffix}"
        
        # Generate secure random password (12 characters with mix of letters, digits, and special chars)
        # Ensure it meets password requirements: at least 8 chars, letters, numbers, special chars
        password_chars = string.ascii_letters + string.digits + "!@#$%"
        # Generate password ensuring it has at least one of each required type
        password = (
            secrets.choice(string.ascii_lowercase) +  # At least one lowercase letter
            secrets.choice(string.ascii_uppercase) +  # At least one uppercase letter
            secrets.choice(string.digits) +            # At least one number
            secrets.choice("!@#$%") +                  # At least one special char
            ''.join(secrets.choice(password_chars) for _ in range(8))  # Additional 8 random chars
        )
        # Shuffle the password to randomize character positions
        password_list = list(password)
        secrets.SystemRandom().shuffle(password_list)
        password = ''.join(password_list)
        
        # Create restaurant admin user automatically
        try:
            admin_user = await create_user(
                username=username,
                password=password,
                role="restaurant_admin",
                email=None,  # Can be added later by restaurant admin
                full_name=f"{restaurant_data.name} Admin",
                restaurant_id=restaurant_id,
                created_by=current_user["id"]  # Created by super admin
            )
            
            logger.info(f"Restaurant admin user created: {username} for restaurant {restaurant_id}")
            
            return {
                "status": "success",
                "message": "Restaurant onboarded successfully",
                "restaurant": {
                    "id": restaurant_id,
                    "name": restaurant["name"],
                    "phone": restaurant["phone"]
                },
                "credentials": {
                    "username": username,
                    "password": password,  # Return password only once during creation
                    "role": "restaurant_admin",
                    "restaurant_id": restaurant_id
                },
                "important": "Save these credentials! They cannot be retrieved again. Share with restaurant owner."
            }
        except Exception as user_error:
            logger.error(f"Restaurant created but failed to create admin user: {user_error}")
            # Restaurant was created but admin user failed
            # Return restaurant info but indicate admin user needs to be created manually
            return {
                "status": "partial_success",
                "message": "Restaurant created but admin user creation failed",
                "restaurant": {
                    "id": restaurant_id,
                    "name": restaurant["name"],
                    "phone": restaurant["phone"]
                },
                "warning": "Restaurant admin user needs to be created manually. Use /api/auth/users endpoint.",
                "error": str(user_error)
            }
        
    except Exception as e:
        logger.error(f"Error creating restaurant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating restaurant: {str(e)}")


@router.get("")
async def list_restaurants():
    """
    Get list of all restaurants (public endpoint for restaurant selection)
    Returns list of restaurants with basic info (no sensitive data)
    """
    try:
        restaurants = get_all_restaurants()
        
        # Remove sensitive data before returning
        for restaurant in restaurants:
            if restaurant.get("printnode_api_key"):
                restaurant["printnode_api_key"] = "***hidden***"
        
        return {
            "status": "success",
            "restaurants": restaurants
        }
    except Exception as e:
        logger.error(f"Error listing restaurants: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing restaurants: {str(e)}")


@router.get("/onboarding-api-key")
async def get_onboarding_api_key(
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """
    Get onboarding API key (super admin only)
    This key can be used for programmatic restaurant creation if needed
    """
    if not Config.ONBOARDING_API_KEY:
        raise HTTPException(status_code=500, detail="Onboarding API key not configured")
    
    return {
        "onboarding_api_key": Config.ONBOARDING_API_KEY
    }


@router.get("/{restaurant_id}")
async def get_restaurant(
    restaurant_id: str,
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """Get restaurant by ID (super admin only - returns full details including API keys)"""
    restaurant = get_restaurant_by_id(restaurant_id)
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Return full details for super admin (including API keys for editing)
    return restaurant


@router.put("/{restaurant_id}")
async def update_restaurant_endpoint(
    restaurant_id: str,
    restaurant_data: RestaurantUpdate,
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """Update restaurant details (super admin only)"""
    try:
        # Validate PrintNode printer ID if provided
        if restaurant_data.printnode_printer_id is not None:
            try:
                printer_id_int = int(restaurant_data.printnode_printer_id)
                if printer_id_int <= 0:
                    raise HTTPException(
                        status_code=400,
                        detail="PrintNode printer ID must be a positive number"
                    )
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid PrintNode printer ID: '{restaurant_data.printnode_printer_id}'. It must be a number."
                )
        
        # Validate API key format if provided
        if restaurant_data.printnode_api_key is not None and len(restaurant_data.printnode_api_key.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="PrintNode API key appears invalid"
            )
        
        # Update restaurant
        updated_restaurant = update_restaurant(
            restaurant_id=restaurant_id,
            name=restaurant_data.name,
            phone=restaurant_data.phone,
            printnode_api_key=restaurant_data.printnode_api_key,
            printnode_printer_id=restaurant_data.printnode_printer_id,
            twilio_phone=restaurant_data.twilio_phone
        )
        
        logger.info(f"Restaurant updated: {restaurant_id} by {current_user['username']}")
        
        return {
            "status": "success",
            "message": "Restaurant updated successfully",
            "restaurant": updated_restaurant
        }
        
    except Exception as e:
        logger.error(f"Error updating restaurant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating restaurant: {str(e)}")


@router.delete("/{restaurant_id}")
async def delete_restaurant_endpoint(
    restaurant_id: str,
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """Delete restaurant and all related data (super admin only)"""
    try:
        success = delete_restaurant(restaurant_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete restaurant")
        
        logger.info(f"Restaurant deleted: {restaurant_id} by {current_user['username']}")
        
        return {
            "status": "success",
            "message": "Restaurant and all related data deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error deleting restaurant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting restaurant: {str(e)}")


@router.get("/{restaurant_id}/staff")
async def get_restaurant_staff(
    restaurant_id: str,
    current_user: dict = Depends(require_role(["super_admin", "restaurant_admin"]))
):
    """
    Get list of staff users for a restaurant
    - Super admins can view any restaurant's staff
    - Restaurant admins can only view their own restaurant's staff
    Returns list of staff users (kds_user, frontdesk_user) excluding restaurant_admin
    """
    try:
        # Verify restaurant exists
        restaurant = get_restaurant_by_id(restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        # Check if restaurant admin is accessing their own restaurant
        if current_user["role"] == "restaurant_admin":
            # Get restaurant_id from current user's restaurant_users association
            from services.supabase_service import get_supabase_client
            supabase = get_supabase_client()
            user_restaurant_result = supabase.table("restaurant_users").select("restaurant_id").eq(
                "user_id", current_user["id"]
            ).eq("role", "restaurant_admin").execute()
            
            if not user_restaurant_result.data or len(user_restaurant_result.data) == 0:
                raise HTTPException(status_code=403, detail="You don't have access to this restaurant")
            
            user_restaurant_id = user_restaurant_result.data[0]["restaurant_id"]
            if user_restaurant_id != restaurant_id:
                raise HTTPException(status_code=403, detail="You can only view staff for your own restaurant")
        
        # Get all users for this restaurant
        users = await get_users_by_restaurant(restaurant_id)
        
        # Filter to only staff users (kds_user, frontdesk_user) - exclude restaurant_admin
        # Use restaurant_role from restaurant_users table (not the role from users table)
        staff_users = []
        for u in users:
            # Get the role from restaurant_users table (restaurant_role), not users table
            user_role = u.get("restaurant_role")  # This is the role in restaurant_users table
            if not user_role:
                # Fallback to users table role if restaurant_role not available
                user_role = u.get("role")
            
            # Only include kds_user and frontdesk_user - explicitly exclude restaurant_admin
            if user_role in ["kds_user", "frontdesk_user"]:
                staff_users.append({
                    "id": u["id"],
                    "username": u["username"],
                    "email": u.get("email"),
                    "full_name": u.get("full_name"),
                    "role": user_role,  # Use restaurant_role (kds_user or frontdesk_user)
                    "is_active": u.get("is_active", True),
                    "created_at": u.get("created_at"),
                    "last_login": u.get("last_login")
                })
        
        logger.info(f"Retrieved {len(staff_users)} staff users for restaurant {restaurant_id}")
        
        return {
            "status": "success",
            "staff": staff_users,
            "count": len(staff_users)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting restaurant staff: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting restaurant staff: {str(e)}")

