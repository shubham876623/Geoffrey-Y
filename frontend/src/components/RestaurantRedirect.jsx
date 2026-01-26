import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Component that redirects /restaurant/ based on authentication status
 * - If logged in as restaurant_admin → redirect to /restaurant/dashboard
 * - If not logged in → redirect to /restaurant/login
 */
export default function RestaurantRedirect() {
  const { user, loading, hasRole } = useAuth()

  // Show nothing while loading
  if (loading) {
    return null
  }

  // If user is logged in and is restaurant_admin, redirect to dashboard
  if (user && hasRole('restaurant_admin')) {
    return <Navigate to="/restaurant/dashboard" replace />
  }

  // Otherwise, redirect to login
  return <Navigate to="/restaurant/login" replace />
}
