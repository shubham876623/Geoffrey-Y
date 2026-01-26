import { createContext, useContext, useState, useEffect } from 'react'
import { loginUser, getCurrentUser, logoutUser as apiLogoutUser } from '../lib/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token')
    if (savedToken) {
      setToken(savedToken)
      // Try to get current user info
      loadUser(savedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const loadUser = async (authToken) => {
    try {
      const userData = await getCurrentUser(authToken)
      setUser(userData)
    } catch (error) {
      console.error('Error loading user:', error)
      // Token might be expired, clear it
      localStorage.removeItem('auth_token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      // Clear any previous user state before attempting login
      setUser(null)
      setToken(null)
      
      const response = await loginUser(username, password)
      const { access_token, user: userData } = response
      
      // Save token to localStorage
      localStorage.setItem('auth_token', access_token)
      setToken(access_token)
      setUser(userData)
      
      return { success: true, user: userData }
    } catch (error) {
      console.error('Login error:', error)
      // Ensure user state is cleared on failed login
      setUser(null)
      setToken(null)
      const message = error.response?.data?.detail || error.message || 'Login failed'
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    try {
      // Call API logout if token exists
      if (token) {
        try {
          await apiLogoutUser(token)
        } catch (error) {
          // Even if API call fails, continue with client-side cleanup
          console.warn('Logout API call failed, continuing with client-side cleanup:', error)
        }
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear all auth-related data from localStorage
      localStorage.removeItem('auth_token')
      localStorage.removeItem('access_token') // Also remove access_token if it exists
      
      // Clear any cached menu data (optional, but good practice)
      const menuCacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('menu_cache_') || key.startsWith('restaurant_cache_')
      )
      menuCacheKeys.forEach(key => localStorage.removeItem(key))
      
      // Clear sessionStorage auth data
      sessionStorage.removeItem('selectedRole')
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('access_token')
      
      // Clear state immediately before redirect
      setToken(null)
      setUser(null)
      setLoading(false)
      
      // Small delay to ensure state is cleared, then redirect
      setTimeout(() => {
        // Redirect to landing page after logout
        // Use window.location.href for a full page reload to ensure clean state
        window.location.href = '/admin-dashboard/'
      }, 100)
    }
  }

  const isAuthenticated = () => {
    return !!token && !!user
  }

  const hasRole = (role) => {
    return user?.role === role
  }

  const hasAnyRole = (roles) => {
    return user && roles.includes(user.role)
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      isAuthenticated,
      hasRole,
      hasAnyRole
    }}>
      {children}
    </AuthContext.Provider>
  )
}
