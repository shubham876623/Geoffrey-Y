"""
Authentication Service
Handles user authentication, password hashing, and JWT token generation
"""

import bcrypt
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from services.supabase_service import get_supabase_client
import logging
from config import Config

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET_KEY = Config.JWT_SECRET_KEY if hasattr(Config, 'JWT_SECRET_KEY') else os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as e:
        logger.error(f"JWT verification failed: {e}")
        return None


async def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Authenticate a user by username and password
    Returns user data if authentication successful, None otherwise
    """
    try:
        supabase = get_supabase_client()
        
        # Get user by username
        result = supabase.table("users").select("*").eq("username", username).eq("is_active", True).execute()
        
        if not result.data or len(result.data) == 0:
            logger.warning(f"User not found: {username}")
            return None
        
        user = result.data[0]
        
        # Verify password
        if not verify_password(password, user["password_hash"]):
            logger.warning(f"Invalid password for user: {username}")
            return None
        
        # Update last login
        supabase.table("users").update({
            "last_login": datetime.utcnow().isoformat()
        }).eq("id", user["id"]).execute()
        
        # Get restaurant associations for non-super_admin users
        restaurant_id = None
        restaurant_role = None
        if user["role"] != "super_admin":
            restaurant_result = supabase.table("restaurant_users").select(
                "restaurant_id, role"
            ).eq("user_id", user["id"]).execute()
            
            if restaurant_result.data and len(restaurant_result.data) > 0:
                restaurant_id = restaurant_result.data[0]["restaurant_id"]
                restaurant_role = restaurant_result.data[0]["role"]  # Role in restaurant_users table
        
        return {
            "id": user["id"],
            "username": user["username"],
            "email": user.get("email"),
            "full_name": user.get("full_name"),
            "role": user["role"],  # Base role from users table
            "restaurant_role": restaurant_role,  # Role from restaurant_users table (kds_user, frontdesk_user, restaurant_admin)
            "restaurant_id": restaurant_id
        }
    
    except Exception as e:
        logger.error(f"Error authenticating user: {e}")
        return None


async def create_user(
    username: str,
    password: str,
    role: str,
    email: Optional[str] = None,
    full_name: Optional[str] = None,
    restaurant_id: Optional[str] = None,
    created_by: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new user
    Returns created user data
    """
    try:
        import re
        
        # Validate UUID format for restaurant_id if provided
        if restaurant_id:
            uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            if not re.match(uuid_pattern, restaurant_id, re.IGNORECASE):
                raise ValueError(f"Invalid restaurant_id format. Expected UUID format (e.g., '123e4567-e89b-12d3-a456-426614174000'), got: '{restaurant_id}'")
        
        # Validate UUID format for created_by if provided
        if created_by:
            uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            if not re.match(uuid_pattern, created_by, re.IGNORECASE):
                raise ValueError(f"Invalid created_by format. Expected UUID format, got: '{created_by}'")
        
        supabase = get_supabase_client()
        
        # Hash password
        password_hash = hash_password(password)
        
        # Create user
        user_data = {
            "username": username,
            "password_hash": password_hash,
            "role": role,
            "is_active": True,
            "email": email,
            "full_name": full_name
        }
        
        if created_by:
            user_data["created_by"] = created_by
        
        result = supabase.table("users").insert(user_data).execute()
        
        if not result.data or len(result.data) == 0:
            raise Exception("Failed to create user")
        
        user = result.data[0]
        user_id = user["id"]
        
        # Link to restaurant if restaurant_id provided and not super_admin
        if restaurant_id and role != "super_admin":
            # Verify restaurant exists
            restaurant_check = supabase.table("restaurants").select("id").eq("id", restaurant_id).execute()
            if not restaurant_check.data or len(restaurant_check.data) == 0:
                raise ValueError(f"Restaurant with ID '{restaurant_id}' not found. Please check the restaurant ID.")
            
            supabase.table("restaurant_users").insert({
                "user_id": user_id,
                "restaurant_id": restaurant_id,
                "role": role,
                "created_by": created_by
            }).execute()
        
        return {
            "id": user_id,
            "username": user["username"],
            "email": user.get("email"),
            "full_name": user.get("full_name"),
            "role": user["role"]
        }
    
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise


async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user by ID, including restaurant_id for non-super_admin users"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if result.data and len(result.data) > 0:
            user = result.data[0]
            # Remove password hash from response
            user.pop("password_hash", None)
            
            # Get restaurant_id and restaurant_role for non-super_admin users
            restaurant_id = None
            restaurant_role = None
            if user.get("role") != "super_admin":
                restaurant_result = supabase.table("restaurant_users").select(
                    "restaurant_id, role"
                ).eq("user_id", user_id).execute()
                
                if restaurant_result.data and len(restaurant_result.data) > 0:
                    restaurant_id = restaurant_result.data[0]["restaurant_id"]
                    restaurant_role = restaurant_result.data[0]["role"]  # Role from restaurant_users table
            
            return {
                "id": user["id"],
                "username": user["username"],
                "email": user.get("email"),
                "full_name": user.get("full_name"),
                "role": user["role"],  # Base role from users table
                "restaurant_role": restaurant_role,  # Role from restaurant_users table
                "is_active": user.get("is_active", True),
                "restaurant_id": restaurant_id
            }
        return None
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        return None


async def get_users_by_restaurant(restaurant_id: str) -> list:
    """Get all users associated with a restaurant"""
    try:
        supabase = get_supabase_client()
        # Use two-step query to avoid relationship ambiguity
        # Step 1: Get restaurant_users associations
        ru_result = supabase.table("restaurant_users").select(
            "user_id, role"
        ).eq("restaurant_id", restaurant_id).execute()
        
        if not ru_result.data:
            return []
        
        # Step 2: Get user IDs and create role map
        user_ids = [ru["user_id"] for ru in ru_result.data]
        role_map = {ru["user_id"]: ru["role"] for ru in ru_result.data}
        
        # Step 3: Get users by IDs
        users_result = supabase.table("users").select("*").in_("id", user_ids).execute()
        
        users = []
        if users_result.data:
            for user in users_result.data:
                user.pop("password_hash", None)
                user["restaurant_role"] = role_map.get(user["id"])
                users.append(user)
        
        return users
    except Exception as e:
        logger.error(f"Error getting restaurant users: {e}", exc_info=True)
        return []


async def update_user_password(user_id: str, new_password: str) -> bool:
    """Update user password"""
    try:
        supabase = get_supabase_client()
        password_hash = hash_password(new_password)
        
        supabase.table("users").update({
            "password_hash": password_hash
        }).eq("id", user_id).execute()
        
        return True
    except Exception as e:
        logger.error(f"Error updating password: {e}")
        return False


async def deactivate_user(user_id: str) -> bool:
    """Deactivate a user account"""
    try:
        supabase = get_supabase_client()
        supabase.table("users").update({
            "is_active": False
        }).eq("id", user_id).execute()
        
        return True
    except Exception as e:
        logger.error(f"Error deactivating user: {e}")
        return False


async def delete_user(user_id: str) -> bool:
    """
    Delete a user account
    Handles foreign key constraints by updating created_by references
    """
    try:
        supabase = get_supabase_client()
        
        # First, update all users that were created by this user
        # Set their created_by to NULL to break the foreign key constraint
        supabase.table("users").update({"created_by": None}).eq("created_by", user_id).execute()
        
        # Also update restaurant_users table if this user created any restaurant user assignments
        supabase.table("restaurant_users").update({"created_by": None}).eq("created_by", user_id).execute()
        
        # Now delete the user
        supabase.table("users").delete().eq("id", user_id).execute()
        
        return True
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise  # Re-raise to get proper error handling
