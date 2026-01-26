import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiShield, FiHome, FiCoffee, FiTv } from 'react-icons/fi'

/**
 * Admin Dashboard Landing Page
 * Role selection page that redirects to appropriate login pages
 */
function AdminDashboardLanding() {
  const navigate = useNavigate()
  const { user, token, loading } = useAuth()

  // Check if user is already logged in (must have both user AND token)
  useEffect(() => {
    // Wait for auth to finish loading before checking
    // Only redirect if user has BOTH a valid user object AND a token
    if (!loading && user && token) {
      const actualRole = user.actual_role || user.role || user.restaurant_role
      if (actualRole) {
        redirectToDashboard(actualRole)
      }
    }
  }, [user, token, loading, navigate])

  const selectRole = (role) => {
    // Redirect to appropriate login page based on role
    const loginRoutes = {
      'super_admin': '/admin/login',
      'restaurant_admin': '/restaurant/login',
      'kds_user': '/staff/login',
      'frontdesk_user': '/staff/login'
    }
    
    const loginRoute = loginRoutes[role]
    if (loginRoute) {
      // Store selected role in sessionStorage (optional)
      sessionStorage.setItem('selectedRole', role)
      navigate(loginRoute)
    }
  }

  const redirectToDashboard = (role) => {
    const redirectMap = {
      'super_admin': '/admin/dashboard',
      'restaurant_admin': '/restaurant/dashboard',
      'kds_user': '/kds',
      'frontdesk_user': '/frontdesk'
    }
    
    const redirectUrl = redirectMap[role] || '/'
    navigate(redirectUrl)
  }

  const roles = [
    {
      id: 'super_admin',
      icon: FiShield,
      title: 'Super Admin',
      description: 'Platform administration and management',
      gradient: 'from-pink-500 via-rose-500 to-pink-600',
      hoverGradient: 'hover:from-pink-600 hover:via-rose-600 hover:to-pink-700',
      textColor: 'text-pink-600',
      hoverTextColor: 'hover:text-pink-700',
      bgColor: 'bg-pink-50',
      ringColor: 'ring-pink-200/60',
      iconBg: 'bg-pink-100/20'
    },
    {
      id: 'restaurant_admin',
      icon: FiHome,
      title: 'Restaurant Admin',
      description: 'Restaurant management and operations',
      gradient: 'from-blue-500 via-cyan-500 to-blue-600',
      hoverGradient: 'hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700',
      textColor: 'text-blue-600',
      hoverTextColor: 'hover:text-blue-700',
      bgColor: 'bg-blue-50',
      ringColor: 'ring-blue-200/60',
      iconBg: 'bg-blue-100/20'
    },
    {
      id: 'kds_user',
      icon: FiCoffee,
      title: 'KDS User (Staff)',
      description: 'Kitchen Display System',
      gradient: 'from-green-500 via-emerald-500 to-green-600',
      hoverGradient: 'hover:from-green-600 hover:via-emerald-600 hover:to-green-700',
      textColor: 'text-green-600',
      hoverTextColor: 'hover:text-green-700',
      bgColor: 'bg-green-50',
      ringColor: 'ring-green-200/60',
      iconBg: 'bg-green-100/20'
    },
    {
      id: 'frontdesk_user',
      icon: FiTv,
      title: 'Front Desk (Staff)',
      description: 'Customer-facing order management',
      gradient: 'from-yellow-500 via-orange-500 to-yellow-600',
      hoverGradient: 'hover:from-yellow-600 hover:via-orange-600 hover:to-yellow-700',
      textColor: 'text-orange-600',
      hoverTextColor: 'hover:text-orange-700',
      bgColor: 'bg-orange-50',
      ringColor: 'ring-orange-200/60',
      iconBg: 'bg-orange-100/20'
    }
  ]

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Professional Background Image with Overlay */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1628652338396-6bc0b0140e58?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`
          }}
        ></div>
        
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/70 via-purple-900/60 to-pink-900/70"></div>
        
        {/* Additional gradient overlays for depth */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-200/10 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-purple-200/10 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-pink-200/10 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '4s' }}></div>
        
        {/* Professional geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(255, 255, 255, 0.1) 100px, rgba(255, 255, 255, 0.1) 200px)`,
          }}></div>
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 100px, rgba(255, 255, 255, 0.1) 100px, rgba(255, 255, 255, 0.1) 200px)`,
          }}></div>
        </div>
        
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Professional Header */}
        <div className="text-center mb-10 sm:mb-12">
          {/* Logo/Icon with professional styling */}
          <div className="inline-flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/30 via-purple-400/30 to-pink-400/30 rounded-3xl blur-2xl animate-pulse"></div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl flex items-center justify-center ring-4 ring-white/70 backdrop-blur-sm">
              <FiShield className="w-12 h-12 sm:w-14 sm:h-14 text-white drop-shadow-2xl" />
            </div>
          </div>
          
          {/* Professional Typography with better contrast */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black text-white mb-3 sm:mb-4 tracking-tight drop-shadow-2xl">
            Restaurant Management System
          </h1>
          <p className="text-lg sm:text-xl text-white/90 font-body font-medium mb-8 max-w-2xl mx-auto drop-shadow-lg">
            Select your role to access the appropriate dashboard
          </p>
        </div>

        {/* Role Selection Cards - Perfect Sizing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {roles.map((role, index) => {
            const IconComponent = role.icon
            return (
              <div
                key={role.id}
                onClick={() => selectRole(role.id)}
                className={`group relative bg-gradient-to-br ${role.gradient} backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl hover:shadow-purple-500/30 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden border-2 border-white/30 hover:border-white/50 cursor-pointer`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                
                {/* Top accent line */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent to-transparent opacity-100 transition-opacity duration-500`}
                  style={{
                    background: role.id === 'super_admin' ? 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.6), transparent)' :
                              role.id === 'restaurant_admin' ? 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.6), transparent)' :
                              role.id === 'kds_user' ? 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.6), transparent)' :
                              'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.6), transparent)'
                  }}
                ></div>
                
                {/* Icon Container */}
                <div className={`relative mb-6 flex items-center justify-center`}>
                  <div className={`absolute inset-0 bg-white/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500`}></div>
                  <div className={`relative w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-500 transform group-hover:scale-110 ring-4 ring-white/50`}>
                    <IconComponent className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-lg" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="relative z-10">
                  <h3 className={`text-2xl sm:text-3xl font-heading font-black text-white mb-3 transition-colors duration-500 leading-tight`}>
                    {role.title}
                  </h3>
                  <p className={`text-sm sm:text-base font-body text-white/90 mb-6 transition-colors duration-500 leading-relaxed`}>
                    {role.description}
                  </p>
                  
                  {/* CTA Button */}
                  <button 
                    className={`w-full py-3.5 px-6 bg-white rounded-xl font-display font-bold text-sm sm:text-base transition-all duration-300 group-hover:bg-white/90 shadow-lg group-hover:shadow-xl transform group-hover:scale-105 border-2 border-white/30`}
                    style={{
                      color: role.id === 'super_admin' ? 'rgb(219, 39, 119)' :
                             role.id === 'restaurant_admin' ? 'rgb(37, 99, 235)' :
                             role.id === 'kds_user' ? 'rgb(22, 163, 74)' :
                             'rgb(249, 115, 22)'
                    }}
                  >
                    Continue as {role.title.split(' ')[0]}
                  </button>
                </div>
                
                {/* Bottom accent line */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent to-transparent opacity-100 transition-opacity duration-500`}
                  style={{
                    background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.4), transparent)'
                  }}
                ></div>
                
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardLanding
