# Frontend Route Guard Implementation

## Overview

When users try to access role-specific pages (like `/kds`, `/frontdesk`, etc.), the frontend should check if they're logged in and have the correct role. If not, redirect them to the login page.

## Backend Endpoints

### 1. **Check Route Access**
**Endpoint:** `GET /api/auth/check-route?path={path}`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `path`: Frontend route path (e.g., `/kds`, `/frontdesk`, `/restaurant/dashboard`)

**Response (Access Granted):**
```json
{
  "has_access": true,
  "path": "/kds",
  "required_role": "kds_user",
  "user_role": "kds_user",
  "message": "Access granted"
}
```

**Response (Access Denied - Not Logged In):**
```json
{
  "has_access": false,
  "path": "/kds",
  "required_role": "kds_user",
  "redirect_url": "/login",
  "login_url": "/api/landing",
  "message": "Authentication required. Please login."
}
```

**Response (Access Denied - Wrong Role):**
```json
{
  "has_access": false,
  "path": "/kds",
  "required_role": "kds_user",
  "user_role": "restaurant_admin",
  "redirect_url": "/login",
  "login_url": "/api/landing",
  "message": "Access denied. This page requires kds_user role, but you have restaurant_admin role."
}
```

### 2. **Check Role**
**Endpoint:** `GET /api/auth/check-role/{required_role}`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** Same structure as check-route

## Frontend Implementation

### React Example

```javascript
// RouteGuard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function RouteGuard({ children, requiredRole, path }) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAccess() {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // No token - redirect to login
        window.location.href = '/api/landing';
        return;
      }

      try {
        // Check route access
        const response = await fetch(
          `/api/auth/check-route?path=${encodeURIComponent(path)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (data.has_access) {
          setHasAccess(true);
        } else {
          // Access denied - redirect to login
          if (data.login_url) {
            window.location.href = data.login_url;
          } else {
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Error checking access:', error);
        window.location.href = '/api/landing';
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [path, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!hasAccess) {
    return null; // Will redirect
  }

  return children;
}

// Usage in App.jsx or router
import { Route } from 'react-router-dom';
import RouteGuard from './RouteGuard';
import KdsPage from './pages/KdsPage';

<Route 
  path="/kds" 
  element={
    <RouteGuard path="/kds" requiredRole="kds_user">
      <KdsPage />
    </RouteGuard>
  } 
/>
```

### Vue.js Example

```javascript
// RouteGuard.vue
<template>
  <div v-if="loading">Loading...</div>
  <slot v-else-if="hasAccess" />
</template>

<script>
export default {
  name: 'RouteGuard',
  props: {
    requiredRole: String,
    path: String
  },
  data() {
    return {
      hasAccess: false,
      loading: true
    };
  },
  async mounted() {
    await this.checkAccess();
  },
  methods: {
    async checkAccess() {
      const token = localStorage.getItem('token');
      
      if (!token) {
        window.location.href = '/api/landing';
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/check-route?path=${encodeURIComponent(this.path)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (data.has_access) {
          this.hasAccess = true;
        } else {
          window.location.href = data.login_url || '/api/landing';
        }
      } catch (error) {
        console.error('Error checking access:', error);
        window.location.href = '/api/landing';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

// Usage in router
import RouteGuard from '@/components/RouteGuard.vue';
import KdsPage from '@/pages/KdsPage.vue';

{
  path: '/kds',
  component: () => import('@/components/RouteGuard.vue'),
  children: [
    {
      path: '',
      component: KdsPage,
      meta: { requiredRole: 'kds_user', routePath: '/kds' }
    }
  ]
}
```

### Simple JavaScript (Vanilla)

```javascript
// routeGuard.js
async function checkRouteAccess(path) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    window.location.href = '/api/landing';
    return false;
  }

  try {
    const response = await fetch(
      `/api/auth/check-route?path=${encodeURIComponent(path)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (data.has_access) {
      return true;
    } else {
      // Redirect to login
      window.location.href = data.login_url || '/api/landing';
      return false;
    }
  } catch (error) {
    console.error('Error checking access:', error);
    window.location.href = '/api/landing';
    return false;
  }
}

// Use before showing page
if (window.location.pathname === '/kds') {
  checkRouteAccess('/kds').then(hasAccess => {
    if (!hasAccess) {
      // Will redirect, don't render page
      return;
    }
    // Render KDS page
    renderKdsPage();
  });
}
```

## Route Protection Map

| Frontend Path | Required Role |
|---------------|---------------|
| `/kds` | `kds_user` |
| `/kds/*` | `kds_user` |
| `/frontdesk` | `frontdesk_user` |
| `/frontdesk/*` | `frontdesk_user` |
| `/restaurant/dashboard` | `restaurant_admin` |
| `/restaurant/*` | `restaurant_admin` |
| `/admin/dashboard` | `super_admin` |
| `/admin/*` | `super_admin` |

## Flow Diagram

```
User tries to access /kds
    ↓
Frontend checks: Is token in localStorage?
    ↓ No
Redirect to /api/landing
    ↓ Yes
Call GET /api/auth/check-route?path=/kds
    ↓
Backend checks: Valid token? Correct role?
    ↓ No
Return { has_access: false, login_url: "/api/landing" }
    ↓
Frontend redirects to /api/landing
    ↓ Yes
Return { has_access: true }
    ↓
Frontend shows /kds page
```

## Best Practices

1. **Check on Route Change**: Verify access whenever route changes
2. **Store Token Securely**: Use localStorage or httpOnly cookies
3. **Handle Token Expiry**: Redirect to login if token is expired
4. **Show Loading State**: Display loading while checking access
5. **Error Handling**: Handle network errors gracefully
6. **Redirect to Landing**: Use `/api/landing` for unified login experience

## Testing

1. Try accessing `/kds` without token → Should redirect to `/api/landing`
2. Try accessing `/kds` with wrong role token → Should redirect to `/api/landing`
3. Try accessing `/kds` with correct role token → Should show KDS page
4. Try accessing `/frontdesk` with kds_user token → Should redirect (wrong role)
