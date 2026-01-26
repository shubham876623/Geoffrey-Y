"""
Landing page and routes organization
Provides a beautiful landing page with role-based route information
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import HTMLResponse, JSONResponse
from services.auth_service import verify_token, get_user_by_id
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)

# Router for /admin landing page (no prefix)
router = APIRouter(tags=["landing"])

# Router for /api/routes endpoint (with /api prefix)
api_router = APIRouter(prefix="/api", tags=["landing"])


def get_routes_by_role(role: str, restaurant_role: Optional[str] = None) -> Dict:
    """
    Get available routes/pages based on user role
    Returns organized structure of available pages
    """
    # Use restaurant_role if available (more specific)
    actual_role = restaurant_role if restaurant_role else role
    
    routes = {
        "super_admin": {
            "title": "Super Admin Dashboard",
            "description": "Platform administration and management",
            "routes": [
                {
                    "path": "/admin/dashboard",
                    "name": "Admin Dashboard",
                    "icon": "🏠",
                    "description": "Main administration dashboard"
                },
                {
                    "path": "/admin/restaurants",
                    "name": "Restaurants",
                    "icon": "🍽️",
                    "description": "Manage restaurants"
                },
                {
                    "path": "/admin/users",
                    "name": "Users",
                    "icon": "👥",
                    "description": "Manage all users"
                },
                {
                    "path": "/admin/orders",
                    "name": "All Orders",
                    "icon": "📋",
                    "description": "View all orders across restaurants"
                }
            ]
        },
        "restaurant_admin": {
            "title": "Restaurant Admin Dashboard",
            "description": "Restaurant management and operations",
            "routes": [
                {
                    "path": "/restaurant/dashboard",
                    "name": "Dashboard",
                    "icon": "🏠",
                    "description": "Restaurant overview and analytics"
                },
                {
                    "path": "/restaurant/menu",
                    "name": "Menu Management",
                    "icon": "📝",
                    "description": "Manage menu items and categories"
                },
                {
                    "path": "/restaurant/orders",
                    "name": "Orders",
                    "icon": "📋",
                    "description": "View and manage orders"
                },
                {
                    "path": "/restaurant/staff",
                    "name": "Staff Management",
                    "icon": "👥",
                    "description": "Manage staff users (KDS and Frontend)"
                },
                {
                    "path": "/restaurant/settings",
                    "name": "Settings",
                    "icon": "⚙️",
                    "description": "Restaurant settings and configuration"
                }
            ]
        },
        "kds_user": {
            "title": "Kitchen Display System",
            "description": "View and manage kitchen orders",
            "routes": [
                {
                    "path": "/kds",
                    "name": "KDS Dashboard",
                    "icon": "👨‍🍳",
                    "description": "Kitchen display system for order management"
                },
                {
                    "path": "/kds/orders",
                    "name": "Active Orders",
                    "icon": "📋",
                    "description": "View active orders in kitchen"
                }
            ]
        },
        "frontdesk_user": {
            "title": "Front Desk",
            "description": "Customer-facing order management",
            "routes": [
                {
                    "path": "/frontdesk",
                    "name": "Front Desk Dashboard",
                    "icon": "🖥️",
                    "description": "Front desk order management"
                },
                {
                    "path": "/frontdesk/orders",
                    "name": "Orders",
                    "icon": "📋",
                    "description": "Manage customer orders"
                },
                {
                    "path": "/frontdesk/menu",
                    "name": "Menu",
                    "icon": "📝",
                    "description": "View menu for customers"
                }
            ]
        }
    }
    
    return routes.get(actual_role, {
        "title": "Unknown Role",
        "description": "No routes available",
        "routes": []
    })


@api_router.get("/routes", response_model=Dict)
async def get_available_routes(
    authorization: Optional[str] = Header(None)
):
    """
    Get available routes/pages for the current user
    Returns organized structure of pages user can access
    If not authenticated, returns public routes
    """
    try:
        # Try to get current user if token is provided
        current_user = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            payload = verify_token(token)
            
            if payload:
                user_id = payload.get("sub")
                if user_id:
                    current_user = await get_user_by_id(user_id)
                    if current_user:
                        # Add restaurant_role from token if available
                        restaurant_role_from_token = payload.get("restaurant_role")
                        if restaurant_role_from_token:
                            current_user["restaurant_role"] = restaurant_role_from_token
        
        if current_user is None or not current_user.get("is_active", True):
            # Return public routes (login page)
            return {
                "authenticated": False,
                "login_url": "/admin",
                "routes": {
                    "title": "Welcome",
                    "description": "Please login to access your dashboard",
                    "routes": [
                        {
                            "path": "/login",
                            "name": "Login",
                            "icon": "🔐",
                            "description": "Login to access your account"
                        }
                    ]
                }
            }
        
        # Get user roles
        user_role = current_user.get("role")
        restaurant_role = current_user.get("restaurant_role")
        
        # Get routes for user's role
        routes_info = get_routes_by_role(user_role, restaurant_role)
        
        return {
            "authenticated": True,
            "user": {
                "username": current_user.get("username"),
                "full_name": current_user.get("full_name"),
                "role": user_role,
                "restaurant_role": restaurant_role,
                "actual_role": restaurant_role if restaurant_role else user_role
            },
            "routes": routes_info
        }
    except Exception as e:
        logger.error(f"Error getting routes: {e}", exc_info=True)
        # Return public routes on error
        return {
            "authenticated": False,
            "login_url": "/admin",
            "routes": {
                "title": "Welcome",
                "description": "Please login to access your dashboard",
                "routes": [
                    {
                        "path": "/login",
                        "name": "Login",
                        "icon": "🔐",
                        "description": "Login to access your account"
                    }
                ]
            }
        }


@router.get("/admin-dashboard")
async def landing_page():
    """
    Redirect to frontend landing page
    The landing page is now served from the frontend at http://localhost:5173/admin-dashboard/
    """
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="http://localhost:5173/admin-dashboard/", status_code=302)
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restaurant Management System - Login</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 1200px;
                width: 100%;
                padding: 40px;
            }
            
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            
            .header h1 {
                color: #333;
                font-size: 2.5em;
                margin-bottom: 10px;
            }
            
            .header p {
                color: #666;
                font-size: 1.1em;
            }
            
            .login-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 25px;
                margin-bottom: 40px;
            }
            
            .login-card {
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                border-radius: 15px;
                padding: 30px;
                text-align: center;
                transition: transform 0.3s, box-shadow 0.3s;
                cursor: pointer;
                border: 2px solid transparent;
            }
            
            .login-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                border-color: #667eea;
            }
            
            .login-card.super-admin {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
            }
            
            .login-card.restaurant-admin {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                color: white;
            }
            
            .login-card.kds {
                background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
                color: white;
            }
            
            .login-card.frontdesk {
                background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
                color: white;
            }
            
            .login-card .icon {
                font-size: 3em;
                margin-bottom: 15px;
            }
            
            .login-card h3 {
                font-size: 1.5em;
                margin-bottom: 10px;
            }
            
            .login-card p {
                font-size: 0.9em;
                opacity: 0.9;
                margin-bottom: 20px;
            }
            
            .login-form {
                display: none;
                margin-top: 20px;
            }
            
            .login-card.active .login-form {
                display: block;
            }
            
            .form-group {
                margin-bottom: 15px;
                text-align: left;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
            }
            
            .form-group input {
                width: 100%;
                padding: 12px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                font-size: 1em;
            }
            
            .form-group input::placeholder {
                color: rgba(255, 255, 255, 0.7);
            }
            
            .btn-login {
                width: 100%;
                padding: 12px;
                background: white;
                color: #333;
                border: none;
                border-radius: 8px;
                font-size: 1em;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s;
            }
            
            .btn-login:hover {
                transform: scale(1.05);
            }
            
            .routes-section {
                margin-top: 40px;
                padding-top: 40px;
                border-top: 2px solid #eee;
            }
            
            .routes-section h2 {
                color: #333;
                margin-bottom: 20px;
                text-align: center;
            }
            
            .routes-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .route-item {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 10px;
                text-align: center;
                transition: background 0.3s;
            }
            
            .route-item:hover {
                background: #e9ecef;
            }
            
            .route-item .icon {
                font-size: 2em;
                margin-bottom: 10px;
            }
            
            .route-item h4 {
                color: #333;
                margin-bottom: 5px;
            }
            
            .route-item p {
                color: #666;
                font-size: 0.85em;
            }
            
            .error-message {
                background: #fee;
                color: #c33;
                padding: 10px;
                border-radius: 8px;
                margin-top: 10px;
                display: none;
            }
            
            .success-message {
                background: #efe;
                color: #3c3;
                padding: 10px;
                border-radius: 8px;
                margin-top: 10px;
                display: none;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍽️ Restaurant Management System</h1>
                <p>Select your role to continue</p>
            </div>
            
            <div class="login-cards" id="role-selection">
                <div class="login-card super-admin" onclick="selectRole('super_admin')">
                    <div class="icon">👑</div>
                    <h3>Super Admin</h3>
                    <p>Platform administration and management</p>
                    <button class="btn-login" style="margin-top: 20px;">Continue as Super Admin</button>
                </div>
                
                <div class="login-card restaurant-admin" onclick="selectRole('restaurant_admin')">
                    <div class="icon">🏢</div>
                    <h3>Restaurant Admin</h3>
                    <p>Restaurant management and operations</p>
                    <button class="btn-login" style="margin-top: 20px;">Continue as Restaurant Admin</button>
                </div>
                
                <div class="login-card kds" onclick="selectRole('kds_user')">
                    <div class="icon">👨‍🍳</div>
                    <h3>KDS User (Staff)</h3>
                    <p>Kitchen Display System</p>
                    <button class="btn-login" style="margin-top: 20px;">Continue as KDS User</button>
                </div>
                
                <div class="login-card frontdesk" onclick="selectRole('frontdesk_user')">
                    <div class="icon">🖥️</div>
                    <h3>Front Desk (Staff)</h3>
                    <p>Customer-facing order management</p>
                    <button class="btn-login" style="margin-top: 20px;">Continue as Front Desk</button>
                </div>
            </div>
            
        </div>
        
        <script>
            // Backend API base URL
            // If frontend is on port 5173, backend is on port 8000
            const API_BASE = (window.location.port === '5173' || window.location.hostname === 'localhost' && window.location.port === '')
                ? 'http://localhost:8000'  // Frontend dev -> Backend
                : window.location.origin;   // Same origin (production)
            
            let selectedRole = null;
            
            // Role display names
            const roleNames = {
                'super_admin': 'Super Admin',
                'restaurant_admin': 'Restaurant Admin',
                'kds_user': 'KDS User (Staff)',
                'frontdesk_user': 'Front Desk (Staff)'
            };
            
            const roleDescriptions = {
                'super_admin': 'Platform administration and management',
                'restaurant_admin': 'Restaurant management and operations',
                'kds_user': 'Kitchen Display System',
                'frontdesk_user': 'Customer-facing order management'
            };
            
            // Check if user is already logged in on page load
            window.addEventListener('DOMContentLoaded', async function() {
                await checkExistingLogin();
            });
            
            async function checkExistingLogin() {
                const token = localStorage.getItem('token');
                if (!token) return;
                
                try {
                    // Check current user info
                    const response = await fetch(`${API_BASE}/api/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (response.ok) {
                        const user = await response.json();
                        const actualRole = user.actual_role || user.role;
                        
                        // User is logged in, redirect to their dashboard
                        redirectToDashboard(actualRole);
                    } else {
                        // Token invalid, clear it
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        localStorage.removeItem('role');
                    }
                } catch (error) {
                    console.error('Error checking login:', error);
                }
            }
            
            function selectRole(role) {
                // Redirect to appropriate login page based on role
                const loginRoutes = {
                    'super_admin': '/admin/login',
                    'restaurant_admin': '/restaurant/login',
                    'kds_user': '/staff/login',
                    'frontdesk_user': '/staff/login'
                };
                
                const loginRoute = loginRoutes[role];
                if (loginRoute) {
                    // Store selected role in sessionStorage for the login page to use
                    sessionStorage.setItem('selectedRole', role);
                    window.location.href = loginRoute;
                } else {
                    console.error('Unknown role:', role);
                }
            }
            
            function goBackToRoleSelection() {
                selectedRole = null;
                document.getElementById('role-selection').style.display = 'grid';
                document.getElementById('login-section').style.display = 'none';
            }
            
            async function performLogin() {
                if (!selectedRole) {
                    showError('Please select a role first');
                    return;
                }
                
                const username = document.getElementById('login-username').value;
                const password = document.getElementById('login-password').value;
                const errorDiv = document.getElementById('login-error');
                
                if (!username || !password) {
                    showError('Please enter username and password');
                    return;
                }
                
                try {
                    const response = await fetch(`${API_BASE}/api/auth/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        // Check if logged in user has the selected role
                        const actualRole = data.role;
                        
                        if (actualRole !== selectedRole) {
                            showError(`This account is for ${roleNames[actualRole]}, not ${roleNames[selectedRole]}. Please select the correct role.`);
                            // Clear form and go back
                            setTimeout(() => {
                                goBackToRoleSelection();
                            }, 2000);
                            return;
                        }
                        
                        // Store token
                        localStorage.setItem('token', data.access_token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        localStorage.setItem('role', data.role);
                        
                        // Redirect based on role
                        redirectToDashboard(actualRole);
                    } else {
                        showError(data.detail || 'Login failed. Please check your credentials.');
                    }
                } catch (error) {
                    showError('Network error. Please try again.');
                    console.error('Login error:', error);
                }
            }
            
            function redirectToDashboard(role) {
                const redirectMap = {
                    'super_admin': '/admin/dashboard',
                    'restaurant_admin': '/restaurant/dashboard',
                    'kds_user': '/kds',
                    'frontdesk_user': '/frontdesk'
                };
                
                const redirectUrl = redirectMap[role] || '/';
                window.location.href = redirectUrl;
            }
            
            function showError(message) {
                const errorDiv = document.getElementById('login-error');
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
            }
            
            // Load available routes if user is logged in
            async function loadRoutes() {
                const token = localStorage.getItem('token');
                if (!token) return;
                
                try {
                    const response = await fetch(`${API_BASE}/api/routes`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (data.authenticated && data.routes) {
                        const routesGrid = document.getElementById('routes-grid');
                        routesGrid.innerHTML = '';
                        
                        data.routes.routes.forEach(route => {
                            const routeItem = document.createElement('div');
                            routeItem.className = 'route-item';
                            routeItem.innerHTML = `
                                <div class="icon">${route.icon}</div>
                                <h4>${route.name}</h4>
                                <p>${route.description}</p>
                            `;
                            routeItem.onclick = () => {
                                window.location.href = route.path;
                            };
                            routesGrid.appendChild(routeItem);
                        });
                    }
                } catch (error) {
                    console.error('Error loading routes:', error);
                }
            }
            
            // Load routes on page load
            loadRoutes();
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
