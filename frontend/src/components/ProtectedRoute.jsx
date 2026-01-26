import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiLoader } from 'react-icons/fi'

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading, isAuthenticated } = useAuth()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg font-semibold">Loading...</p>
        </div>
      </div>
    )
  }

  // Check if user is authenticated
  if (!isAuthenticated()) {
    // Redirect to appropriate login based on allowed roles
    if (allowedRoles.includes('super_admin')) {
      return <Navigate to="/admin/login" replace />
    } else if (allowedRoles.includes('restaurant_admin')) {
      return <Navigate to="/restaurant/login" replace />
    } else if (allowedRoles.includes('kds_user') || allowedRoles.includes('frontdesk_user')) {
      return <Navigate to="/staff/login" replace />
    }
    return <Navigate to="/" replace />
  }

  // Check if user has required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect based on user's actual role
    if (user?.role === 'super_admin') {
      return <Navigate to="/admin/dashboard" replace />
    } else if (user?.role === 'restaurant_admin') {
      return <Navigate to="/restaurant/dashboard" replace />
    } else if (user?.role === 'kds_user') {
      return <Navigate to="/kds" replace />
    } else if (user?.role === 'frontdesk_user') {
      return <Navigate to="/front-desk" replace />
    }
    return <Navigate to="/" replace />
  }

  return children
}
