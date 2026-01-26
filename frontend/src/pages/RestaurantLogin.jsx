import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiCoffee, FiUser, FiLock, FiLoader, FiArrowRight, FiAlertCircle } from 'react-icons/fi'

export default function RestaurantLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Trim whitespace from username and password
    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()

    try {
      const result = await login(trimmedUsername, trimmedPassword)
      
      if (result.success) {
        // Check role and redirect accordingly
        if (result.user.role === 'restaurant_admin') {
          navigate('/restaurant/dashboard')
        } else {
          // Access denied - clear auth state to prevent unwanted redirects
          setError('Access denied. This page is for restaurant administrators only.')
          // Clear the auth state since this user shouldn't be logged in here
          localStorage.removeItem('auth_token')
          localStorage.removeItem('access_token')
          // Force a page reload to clear any cached state
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 via-red-950 to-rose-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-amber-600/30 to-orange-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-gradient-to-br from-red-600/30 to-rose-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-orange-600/20 to-amber-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl shadow-xl mb-6 relative">
              <FiCoffee className="w-10 h-10 text-white" />
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
              Restaurant Admin
            </h1>
            <p className="text-amber-200 text-sm sm:text-base font-medium">
              Sign in to manage your restaurant
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/50 rounded-2xl flex items-center gap-3 animate-fade-in">
              <FiAlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
              <p className="text-red-200 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label className="block text-amber-200 text-sm font-semibold mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiUser className="w-5 h-5 text-amber-300" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-amber-300/70 focus:outline-none focus:ring-4 focus:ring-amber-500/50 focus:border-amber-400 transition-all font-medium"
                  placeholder="Enter your username"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-amber-200 text-sm font-semibold mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiLock className="w-5 h-5 text-amber-300" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-amber-300/70 focus:outline-none focus:ring-4 focus:ring-amber-500/50 focus:border-amber-400 transition-all font-medium"
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white rounded-2xl font-bold text-lg hover:from-amber-600 hover:via-orange-600 hover:to-red-600 transition-all shadow-xl hover:shadow-2xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-amber-300 text-sm">
              Restaurant Administrator Access Only
            </p>
          </div>
        </div>

        {/* Back to Landing Page */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/admin-dashboard')}
            className="text-amber-300 hover:text-white text-sm font-medium transition-colors"
          >
            ← Back to Role Selection
          </button>
        </div>
      </div>
    </div>
  )
}
