"""
Authentication routes
Handles login, registration, and user management
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List, Tuple
from pydantic import BaseModel, EmailStr
from services.auth_service import (
    authenticate_user,
    create_user,
    get_user_by_id,
    get_users_by_restaurant,
    update_user_password,
    deactivate_user,
    delete_user,
    create_access_token,
    verify_token
)
import logging
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()


# Request/Response Models
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    redirect_url: Optional[str] = None  # URL to redirect based on role
    role: str  # User's role for frontend routing


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str  # super_admin, restaurant_admin, kds_user, frontdesk_user
    email: Optional[str] = None
    full_name: Optional[str] = None
    restaurant_id: Optional[str] = None  # Required for non-super_admin roles


class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    is_active: bool
    restaurant_id: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class UpdatePasswordRequest(BaseModel):
    new_password: str


# Dependency to get current user from token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Extract and verify user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user = await get_user_by_id(user_id)
    if user is None or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User not found or inactive")
    
    return user


def require_role(allowed_roles: List[str]):
    """Dependency factory for role-based access control"""
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker


def require_exact_role(required_role: str):
    """Dependency factory for exact role-based access control (for KDS/Frontend pages)"""
    async def exact_role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        # Check both role from users table and restaurant_role from restaurant_users table
        user_role = current_user.get("role")
        restaurant_role = current_user.get("restaurant_role")
        
        # Use restaurant_role if available (more specific), otherwise use role
        actual_role = restaurant_role if restaurant_role else user_role
        
        if actual_role != required_role:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required role: {required_role}, but user has role: {actual_role}"
            )
        return current_user
    return exact_role_checker


def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validate password requirements:
    - At least 8 characters
    - Contains at least one letter
    - Contains at least one number
    - Contains at least one special character
    
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    # Check for at least one letter
    if not re.search(r'[a-zA-Z]', password):
        return False, "Password must contain at least one letter"
    
    # Check for at least one number
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    
    # Check for at least one special character
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
        return False, "Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:'\",.<>/? etc.)"
    
    return True, ""


# Authentication Endpoints
@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """
    User login endpoint
    Returns JWT token, user information, and redirect URL based on role
    
    Role-based redirects:
    - super_admin -> /admin/dashboard
    - restaurant_admin -> /restaurant/dashboard
    - kds_user -> /kds
    - frontdesk_user -> /frontdesk
    """
    user = await authenticate_user(login_data.username, login_data.password)
    
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Get the actual role (restaurant_role from restaurant_users table if available)
    user_role = user.get("role")  # Role from users table
    restaurant_role = user.get("restaurant_role")  # Role from restaurant_users table
    
    # Use restaurant_role if available (more specific), otherwise use role
    actual_role = restaurant_role if restaurant_role else user_role
    
    # Determine redirect URL based on role
    redirect_url = None
    if actual_role == "super_admin":
        redirect_url = "/admin/dashboard"
    elif actual_role == "restaurant_admin":
        redirect_url = "/restaurant/dashboard"
    elif actual_role == "kds_user":
        redirect_url = "/kds"
    elif actual_role == "frontdesk_user":
        redirect_url = "/frontdesk"
    else:
        # Default redirect for unknown roles
        redirect_url = "/login"
    
    # Create JWT token (include both roles for flexibility)
    token_data = {
        "sub": user["id"],
        "username": user["username"],
        "role": user_role,  # Base role from users table
        "restaurant_role": restaurant_role  # Specific role from restaurant_users table
    }
    
    access_token = create_access_token(token_data)
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user["id"],
            "username": user["username"],
            "email": user.get("email"),
            "full_name": user.get("full_name"),
            "role": user_role,  # Base role
            "restaurant_role": restaurant_role,  # Restaurant-specific role
            "restaurant_id": user.get("restaurant_id")
        },
        redirect_url=redirect_url,
        role=actual_role  # The actual role to use for routing
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    # Get actual role (restaurant_role if available)
    user_role = current_user.get("role")
    restaurant_role = current_user.get("restaurant_role")
    actual_role = restaurant_role if restaurant_role else user_role
    
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user.get("email"),
        "full_name": current_user.get("full_name"),
        "role": user_role,  # Base role
        "restaurant_role": restaurant_role,  # Restaurant-specific role
        "actual_role": actual_role,  # The role to use for routing
        "is_active": current_user.get("is_active", True),
        "restaurant_id": current_user.get("restaurant_id")
    }


@router.get("/check-role/{required_role}")
async def check_user_role(
    required_role: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Check if current user has the exact required role
    Used by frontend to verify access before showing pages
    
    Returns:
    - 200 if user has the required role
    - 403 if user doesn't have the required role
    - 401 if not authenticated
    """
    # Get actual role (restaurant_role if available)
    user_role = current_user.get("role")
    restaurant_role = current_user.get("restaurant_role")
    actual_role = restaurant_role if restaurant_role else user_role
    
    if actual_role != required_role:
        return {
            "has_access": False,
            "required_role": required_role,
            "user_role": actual_role,
            "redirect_url": "/login",
            "login_url": "/admin-dashboard",  # Landing page with role-based login
            "message": f"Access denied. Required role: {required_role}, but user has role: {actual_role}"
        }
    
    # Determine redirect URL based on role
    redirect_url = None
    if actual_role == "super_admin":
        redirect_url = "/admin/dashboard"
    elif actual_role == "restaurant_admin":
        redirect_url = "/restaurant/dashboard"
    elif actual_role == "kds_user":
        redirect_url = "/kds"
    elif actual_role == "frontdesk_user":
        redirect_url = "/frontdesk"
    
    return {
        "has_access": True,
        "required_role": required_role,
        "user_role": actual_role,
        "redirect_url": redirect_url,
        "message": "Access granted"
    }


@router.get("/check-route")
async def check_route_access(
    path: str,
    authorization: Optional[str] = Header(None)
):
    """
    Check if user has access to a specific frontend route/path
    Used by frontend route guards to verify access before showing pages
    
    Example: GET /api/auth/check-route?path=/kds
    
    Returns:
    - has_access: true/false
    - redirect_url: Where to redirect if access denied
    - login_url: Landing page URL for login
    """
    # Map frontend paths to required roles
    path_role_map = {
        "/kds": "kds_user",
        "/kds/": "kds_user",
        "/kds/*": "kds_user",
        "/frontdesk": "frontdesk_user",
        "/frontdesk/": "frontdesk_user",
        "/frontdesk/*": "frontdesk_user",
        "/restaurant/dashboard": "restaurant_admin",
        "/restaurant/": "restaurant_admin",
        "/restaurant/*": "restaurant_admin",
        "/admin/dashboard": "super_admin",
        "/admin/": "super_admin",
        "/admin/*": "super_admin"
    }
    
    # Find required role for path (check exact match first, then prefix)
    required_role = None
    for route_path, role in path_role_map.items():
        if path == route_path.replace("/*", ""):
            required_role = role
            break
        elif route_path.endswith("/*") and path.startswith(route_path.replace("/*", "")):
            required_role = role
            break
    
    if not required_role:
        # Public route or unknown route - allow access
        return {
            "has_access": True,
            "path": path,
            "required_role": None,
            "message": "Public route or route not protected"
        }
    
    # Check if user is authenticated
    if not authorization or not authorization.startswith("Bearer "):
        return {
            "has_access": False,
            "path": path,
            "required_role": required_role,
            "redirect_url": "/login",
            "login_url": "/api/landing",
            "message": "Authentication required. Please login."
        }
    
    # Verify token and get user
    try:
        token = authorization.replace("Bearer ", "")
        from services.auth_service import verify_token, get_user_by_id
        
        payload = verify_token(token)
        if not payload:
            return {
                "has_access": False,
                "path": path,
                "required_role": required_role,
                "redirect_url": "/login",
                "login_url": "/api/landing",
                "message": "Invalid or expired token. Please login again."
            }
        
        user_id = payload.get("sub")
        if not user_id:
            return {
                "has_access": False,
                "path": path,
                "required_role": required_role,
                "redirect_url": "/login",
                "login_url": "/api/landing",
                "message": "Invalid token. Please login again."
            }
        
        user = await get_user_by_id(user_id)
        if not user or not user.get("is_active", True):
            return {
                "has_access": False,
                "path": path,
                "required_role": required_role,
                "redirect_url": "/login",
                "login_url": "/api/landing",
                "message": "User not found or inactive. Please login again."
            }
        
        # Get actual role
        user_role = user.get("role")
        restaurant_role = user.get("restaurant_role") or payload.get("restaurant_role")
        actual_role = restaurant_role if restaurant_role else user_role
        
        # Check if user has required role
        if actual_role != required_role:
            return {
                "has_access": False,
                "path": path,
                "required_role": required_role,
                "user_role": actual_role,
                "redirect_url": "/login",
                "login_url": "/api/landing",
                "message": f"Access denied. This page requires {required_role} role, but you have {actual_role} role."
            }
        
        # Access granted
        return {
            "has_access": True,
            "path": path,
            "required_role": required_role,
            "user_role": actual_role,
            "message": "Access granted"
        }
        
    except Exception as e:
        logger.error(f"Error checking route access: {e}", exc_info=True)
        return {
            "has_access": False,
            "path": path,
            "required_role": required_role,
            "redirect_url": "/login",
            "login_url": "/api/landing",
            "message": "Error verifying access. Please login again."
        }


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change password for current user"""
    # Verify old password
    from services.auth_service import authenticate_user
    user = await authenticate_user(current_user["username"], password_data.old_password)
    
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid current password")
    
    # Validate new password
    is_valid, error_message = validate_password(password_data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Update password
    success = await update_user_password(current_user["id"], password_data.new_password)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update password")
    
    return {"message": "Password updated successfully"}


# User Management Endpoints (for admins)
@router.post("/users", response_model=UserResponse)
async def create_user_endpoint(
    user_data: CreateUserRequest,
    current_user: dict = Depends(require_role(["super_admin", "restaurant_admin"]))
):
    """
    Create a new user
    - Super admins can create any user
    - Restaurant admins can only create kds_user and frontdesk_user for their restaurant
    """
    # Validate password
    is_valid, error_message = validate_password(user_data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Validate role permissions
    if current_user["role"] == "restaurant_admin":
        if user_data.role not in ["kds_user", "frontdesk_user"]:
            raise HTTPException(
                status_code=403,
                detail="Restaurant admins can only create KDS and Front Desk users"
            )
        if not user_data.restaurant_id:
            raise HTTPException(
                status_code=400,
                detail="restaurant_id is required for restaurant admin created users"
            )
    
    # Get restaurant_id for restaurant_admin
    if current_user["role"] == "restaurant_admin" and not user_data.restaurant_id:
        # Get restaurant_id from current user's restaurant_users table
        from services.supabase_service import get_supabase_client
        supabase = get_supabase_client()
        result = supabase.table("restaurant_users").select("restaurant_id").eq(
            "user_id", current_user["id"]
        ).eq("role", "restaurant_admin").execute()
        
        if result.data and len(result.data) > 0:
            user_data.restaurant_id = result.data[0]["restaurant_id"]
        else:
            raise HTTPException(status_code=403, detail="Restaurant admin not associated with a restaurant")
    
    try:
        user = await create_user(
            username=user_data.username,
            password=user_data.password,
            role=user_data.role,
            email=user_data.email,
            full_name=user_data.full_name,
            restaurant_id=user_data.restaurant_id,
            created_by=current_user["id"]
        )
        
        return UserResponse(
            id=user["id"],
            username=user["username"],
            email=user.get("email"),
            full_name=user.get("full_name"),
            role=user["role"],
            is_active=True
        )
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    restaurant_id: Optional[str] = None,
    current_user: dict = Depends(require_role(["super_admin", "restaurant_admin"]))
):
    """
    List users
    - Super admins see all users
    - Restaurant admins see only their restaurant's users
    """
    try:
        if current_user["role"] == "super_admin":
            # Super admin sees all users
            from services.supabase_service import get_supabase_client
            supabase = get_supabase_client()
            result = supabase.table("users").select("*").execute()
            
            users = []
            if result.data:
                for user in result.data:
                    user.pop("password_hash", None)
                    users.append(UserResponse(
                        id=user["id"],
                        username=user["username"],
                        email=user.get("email"),
                        full_name=user.get("full_name"),
                        role=user["role"],
                        is_active=user.get("is_active", True)
                    ))
            return users
        else:
            # Restaurant admin sees only their restaurant users
            if not restaurant_id:
                # Get restaurant_id from current user
                from services.supabase_service import get_supabase_client
                supabase = get_supabase_client()
                result = supabase.table("restaurant_users").select("restaurant_id").eq(
                    "user_id", current_user["id"]
                ).eq("role", "restaurant_admin").execute()
                
                if result.data and len(result.data) > 0:
                    restaurant_id = result.data[0]["restaurant_id"]
                else:
                    return []
            
            users = await get_users_by_restaurant(restaurant_id)
            # Filter to only staff users (kds_user, frontdesk_user) - exclude restaurant_admin
            # Use restaurant_role from restaurant_users table for filtering
            staff_users = []
            for u in users:
                # Get the role from restaurant_users table (restaurant_role), not users table
                user_role = u.get("restaurant_role")  # This is the role in restaurant_users table
                if not user_role:
                    # Fallback to users table role if restaurant_role not available
                    user_role = u.get("role")
                
                # Only include kds_user and frontdesk_user - explicitly exclude restaurant_admin
                if user_role in ["kds_user", "frontdesk_user"]:
                    staff_users.append(UserResponse(
                        id=u["id"],
                        username=u["username"],
                        email=u.get("email"),
                        full_name=u.get("full_name"),
                        role=user_role,  # Use restaurant_role (kds_user or frontdesk_user)
                        is_active=u.get("is_active", True)
                    ))
            return staff_users
    
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}/password")
async def update_user_password_endpoint(
    user_id: str,
    password_data: UpdatePasswordRequest,
    current_user: dict = Depends(require_role(["super_admin", "restaurant_admin"]))
):
    """Update another user's password (admin only)"""
    # Validate new password
    is_valid, error_message = validate_password(password_data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Restaurant admins can only update users in their restaurant
    if current_user["role"] == "restaurant_admin":
        from services.supabase_service import get_supabase_client
        supabase = get_supabase_client()
        # Check if user belongs to restaurant admin's restaurant
        result = supabase.table("restaurant_users").select("restaurant_id").eq(
            "user_id", user_id
        ).execute()
        
        admin_result = supabase.table("restaurant_users").select("restaurant_id").eq(
            "user_id", current_user["id"]
        ).eq("role", "restaurant_admin").execute()
        
        if not result.data or not admin_result.data:
            raise HTTPException(status_code=403, detail="User not found or insufficient permissions")
        
        user_restaurant = result.data[0]["restaurant_id"]
        admin_restaurant = admin_result.data[0]["restaurant_id"]
        
        if user_restaurant != admin_restaurant:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    success = await update_user_password(user_id, password_data.new_password)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update password")
    
    return {"message": "Password updated successfully"}


@router.put("/users/{user_id}/deactivate")
async def deactivate_user_endpoint(
    user_id: str,
    current_user: dict = Depends(require_role(["super_admin", "restaurant_admin"]))
):
    """Deactivate a user account"""
    # Similar permission checks as above
    if current_user["role"] == "restaurant_admin":
        from services.supabase_service import get_supabase_client
        supabase = get_supabase_client()
        result = supabase.table("restaurant_users").select("restaurant_id").eq(
            "user_id", user_id
        ).execute()
        
        admin_result = supabase.table("restaurant_users").select("restaurant_id").eq(
            "user_id", current_user["id"]
        ).eq("role", "restaurant_admin").execute()
        
        if not result.data or not admin_result.data:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        if result.data[0]["restaurant_id"] != admin_result.data[0]["restaurant_id"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    success = await deactivate_user(user_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to deactivate user")
    
    return {"message": "User deactivated successfully"}


@router.delete("/users/{user_id}")
async def delete_user_endpoint(
    user_id: str,
    current_user: dict = Depends(require_role(["super_admin", "restaurant_admin"]))
):
    """Delete a user account"""
    # Similar permission checks
    if current_user["role"] == "restaurant_admin":
        from services.supabase_service import get_supabase_client
        supabase = get_supabase_client()
        result = supabase.table("restaurant_users").select("restaurant_id").eq(
            "user_id", user_id
        ).execute()
        
        admin_result = supabase.table("restaurant_users").select("restaurant_id").eq(
            "user_id", current_user["id"]
        ).eq("role", "restaurant_admin").execute()
        
        if not result.data or not admin_result.data:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        if result.data[0]["restaurant_id"] != admin_result.data[0]["restaurant_id"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    success = await delete_user(user_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete user")
    
    return {"message": "User deleted successfully"}
