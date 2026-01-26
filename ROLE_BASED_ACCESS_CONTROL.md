# Role-Based Access Control & Redirects

## Overview

Implemented role-based access control with automatic redirects based on user roles. Users are redirected to the appropriate dashboard after login based on their exact role.

## Features

### 1. **Login Endpoint Enhanced**
**Endpoint:** `POST /api/auth/login`

**Response includes:**
- `access_token`: JWT token
- `user`: User information with both `role` and `restaurant_role`
- `redirect_url`: URL to redirect based on role
- `role`: The actual role to use for routing

**Role-based redirects:**
- `super_admin` → `/admin/dashboard`
- `restaurant_admin` → `/restaurant/dashboard`
- `kds_user` → `/kds`
- `frontdesk_user` → `/frontdesk`

### 2. **Exact Role Checker**
**Function:** `require_exact_role(required_role: str)`

Used to protect routes that require a specific role (e.g., KDS page requires `kds_user`, Frontend page requires `frontdesk_user`).

**Example:**
```python
@router.get("/kds")
async def kds_page(current_user: dict = Depends(require_exact_role("kds_user"))):
    # Only kds_user can access this
    return {"message": "KDS Dashboard"}
```

### 3. **Role Verification Endpoint**
**Endpoint:** `GET /api/auth/check-role/{required_role}`

Used by frontend to verify if the current user has the exact required role before showing pages.

**Response:**
```json
{
  "has_access": true/false,
  "required_role": "kds_user",
  "user_role": "kds_user",
  "redirect_url": "/kds",
  "message": "Access granted" or "Access denied..."
}
```

## Frontend Implementation Guide

### 1. **After Login**
```javascript
// After successful login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
});

const data = await response.json();

// Store token
localStorage.setItem('token', data.access_token);
localStorage.setItem('user', JSON.stringify(data.user));
localStorage.setItem('role', data.role);

// Redirect based on role
window.location.href = data.redirect_url;
```

### 2. **Route Protection (React/Vue Example)**
```javascript
// Before showing KDS page
async function checkKdsAccess() {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/auth/check-role/kds_user', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  if (!data.has_access) {
    // Redirect to login
    window.location.href = '/login';
    return false;
  }
  
  return true;
}

// Use in component
useEffect(() => {
  checkKdsAccess().then(hasAccess => {
    if (!hasAccess) {
      // Component will redirect, don't render
      return;
    }
    // Render KDS page
  });
}, []);
```

### 3. **Route Guards (React Router Example)**
```javascript
// ProtectedRoute component
function ProtectedRoute({ requiredRole, children }) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login';
      return;
    }
    
    fetch(`/api/auth/check-role/${requiredRole}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.has_access) {
        setHasAccess(true);
      } else {
        window.location.href = '/login';
      }
      setLoading(false);
    })
    .catch(() => {
      window.location.href = '/login';
      setLoading(false);
    });
  }, [requiredRole]);
  
  if (loading) return <div>Loading...</div>;
  if (!hasAccess) return null;
  
  return children;
}

// Usage
<Route 
  path="/kds" 
  element={
    <ProtectedRoute requiredRole="kds_user">
      <KdsPage />
    </ProtectedRoute>
  } 
/>
```

## Role Hierarchy

1. **super_admin**: Can access all areas
2. **restaurant_admin**: Can access restaurant dashboard and management
3. **kds_user**: Can only access KDS (Kitchen Display System)
4. **frontdesk_user**: Can only access Frontend (Customer-facing interface)

## Important Notes

- **restaurant_role** takes precedence over **role** for restaurant-specific users
- Users with `kds_user` role can ONLY access `/kds` page
- Users with `frontdesk_user` role can ONLY access `/frontdesk` page
- If user doesn't have the exact role, they are redirected to `/login`
- All role checks use `restaurant_role` from `restaurant_users` table if available

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login with username/password, returns token and redirect_url |
| `/api/auth/me` | GET | Get current user info with roles |
| `/api/auth/check-role/{role}` | GET | Check if user has exact role, returns access status |

## Security

- All endpoints require JWT token in `Authorization: Bearer {token}` header
- Tokens expire after 7 days (configurable)
- Role checks are performed on both backend and should be verified on frontend
- Invalid or expired tokens return 401 Unauthorized
- Wrong role returns 403 Forbidden
