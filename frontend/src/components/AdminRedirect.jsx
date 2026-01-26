import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Component that redirects /admin/ based on authentication status
 * - If logged in as super_admin → redirect to /admin/dashboard
 * - If not logged in → redirect to /admin/login
 */
export default function AdminRedirect() {
  const { user, loading, hasRole } = useAuth()

  // Show nothing while loading
  if (loading) {
    return null
  }

  // If user is logged in and is super_admin, redirect to dashboard
  if (user && hasRole('super_admin')) {
    return <Navigate to="/admin/dashboard" replace />
  }

  // Otherwise, redirect to login
  return <Navigate to="/admin/login" replace />
}
