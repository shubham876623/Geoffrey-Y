import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { 
  getRestaurants, 
  getRestaurant, 
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getOnboardingApiKey,
  getUsers, 
  createUser, 
  updateUserPassword, 
  deactivateUser, 
  deleteUser 
} from '../lib/api'
import { 
  FiCoffee, 
  FiUsers, 
  FiPlus, 
  FiEye, 
  FiKey, 
  FiTrash2, 
  FiUserX, 
  FiLogOut, 
  FiHome,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiCheckCircle,
  FiCopy,
  FiAlertCircle
} from 'react-icons/fi'
import { ToastContainer } from '../components/Toast'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [restaurants, setRestaurants] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    totalUsers: 0,
    activeOrders: 0
  })

  // Restaurant form state
  const [showRestaurantForm, setShowRestaurantForm] = useState(false)
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    phone: '',
    printnode_api_key: '',
    printnode_printer_id: '',
    twilio_phone: ''
  })
  const [onboardingApiKey, setOnboardingApiKey] = useState('')
  const [restaurantCredentials, setRestaurantCredentials] = useState(null)
  
  // Restaurant details modal state
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [showRestaurantDetails, setShowRestaurantDetails] = useState(false)
  const [isEditingRestaurant, setIsEditingRestaurant] = useState(false)
  const [restaurantDetailsForm, setRestaurantDetailsForm] = useState({
    name: '',
    phone: '',
    printnode_api_key: '',
    printnode_printer_id: '',
    twilio_phone: ''
  })

  // User form state
  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'super_admin',
    email: '',
    full_name: '',
    restaurant_id: ''
  })
  const [selectedUser, setSelectedUser] = useState(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  
  // Toast notifications state
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [restaurantsRes, usersRes, apiKeyRes] = await Promise.all([
        getRestaurants(),
        getUsers(),
        getOnboardingApiKey().catch(() => ({ onboarding_api_key: '' })) // Gracefully handle if fails
      ])
      
      setRestaurants(restaurantsRes.restaurants || [])
      setUsers(usersRes || [])
      setOnboardingApiKey(apiKeyRes.onboarding_api_key || '')
      setStats({
        totalRestaurants: restaurantsRes.restaurants?.length || 0,
        totalUsers: usersRes?.length || 0,
        activeOrders: 0 // TODO: Add orders endpoint
      })
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRestaurant = async (e) => {
    e.preventDefault()
    try {
      const response = await createRestaurant(restaurantForm)
      setRestaurantCredentials(response.credentials)
      setRestaurantForm({
        name: '',
        phone: '',
        printnode_api_key: '',
        printnode_printer_id: '',
        twilio_phone: ''
      })
      setShowRestaurantForm(false)
      loadData()
      showToast('Restaurant created successfully!', 'success')
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to create restaurant', 'error')
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      await createUser(userForm)
      setUserForm({
        username: '',
        password: '',
        role: 'super_admin',
        email: '',
        full_name: '',
        restaurant_id: ''
      })
      setShowUserForm(false)
      loadData()
      showToast('User created successfully!', 'success')
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to create user', 'error')
    }
  }

  const handleUpdatePassword = async () => {
    if (!selectedUser || !newPassword) return
    
    try {
      await updateUserPassword(selectedUser.id, newPassword)
      setShowPasswordModal(false)
      setSelectedUser(null)
      setNewPassword('')
      showToast('Password updated successfully', 'success')
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update password', 'error')
    }
  }

  const handleDeactivateUser = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return
    
    try {
      await deactivateUser(userId)
      loadData()
      showToast('User deactivated successfully', 'success')
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to deactivate user', 'error')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    
    try {
      await deleteUser(userId)
      loadData()
      showToast('User deleted successfully', 'success')
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to delete user', 'error')
    }
  }

  const handleViewRestaurantDetails = async (restaurantId) => {
    try {
      const restaurant = await getRestaurant(restaurantId)
      setSelectedRestaurant(restaurant)
      setRestaurantDetailsForm({
        name: restaurant.name || '',
        phone: restaurant.phone || '',
        printnode_api_key: restaurant.printnode_api_key || '',
        printnode_printer_id: restaurant.printnode_printer_id || '',
        twilio_phone: restaurant.twilio_phone || ''
      })
      setIsEditingRestaurant(false)
      setShowRestaurantDetails(true)
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to load restaurant details', 'error')
    }
  }

  const handleUpdateRestaurant = async (e) => {
    e.preventDefault()
    if (!selectedRestaurant) return
    
    try {
      await updateRestaurant(selectedRestaurant.id, restaurantDetailsForm)
      showToast('Restaurant updated successfully!', 'success')
      setIsEditingRestaurant(false)
      loadData() // Reload restaurants list
      // Reload restaurant details
      const updated = await getRestaurant(selectedRestaurant.id)
      setSelectedRestaurant(updated)
      setRestaurantDetailsForm({
        name: updated.name || '',
        phone: updated.phone || '',
        printnode_api_key: updated.printnode_api_key || '',
        printnode_printer_id: updated.printnode_printer_id || '',
        twilio_phone: updated.twilio_phone || ''
      })
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update restaurant', 'error')
    }
  }

  const handleDeleteRestaurant = async (restaurantId, restaurantName) => {
    if (!confirm(`Are you sure you want to delete "${restaurantName}"?\n\nThis will permanently delete:\n- The restaurant\n- All menu items and categories\n- All orders and order history\n- All users associated with this restaurant\n- All other related data\n\nThis action cannot be undone!`)) {
      return
    }
    
    try {
      await deleteRestaurant(restaurantId)
      showToast(`Restaurant "${restaurantName}" and all related data deleted successfully`, 'success')
      loadData() // Reload restaurants list
      // Close details modal if it's open for this restaurant
      if (selectedRestaurant && selectedRestaurant.id === restaurantId) {
        setShowRestaurantDetails(false)
        setSelectedRestaurant(null)
      }
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to delete restaurant', 'error')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    showToast('Copied to clipboard!', 'success', 2000)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-violet-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-violet-950">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <header className="bg-indigo-900/50 backdrop-blur-md border-b border-purple-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-white">Platform Admin Dashboard</h1>
              <p className="text-indigo-200 text-sm">Welcome, {user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
              <FiLogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-4 mb-8 border-b border-purple-800/50 pb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white'
                : 'text-indigo-200 hover:bg-indigo-800/50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('restaurants')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'restaurants'
                ? 'bg-purple-600 text-white'
                : 'text-indigo-200 hover:bg-indigo-800/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiCoffee className="w-4 h-4" />
              Restaurants ({stats.totalRestaurants})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white'
                : 'text-indigo-200 hover:bg-indigo-800/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiUsers className="w-4 h-4" />
              Users ({stats.totalUsers})
            </div>
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-indigo-800/50 to-purple-800/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">Total Restaurants</p>
                    <p className="text-3xl font-black text-white">{stats.totalRestaurants}</p>
                  </div>
                  <FiCoffee className="w-12 h-12 text-purple-400" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-800/50 to-violet-800/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">Total Users</p>
                    <p className="text-3xl font-black text-white">{stats.totalUsers}</p>
                  </div>
                  <FiUsers className="w-12 h-12 text-violet-400" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-violet-800/50 to-pink-800/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">Active Orders</p>
                    <p className="text-3xl font-black text-white">{stats.activeOrders}</p>
                  </div>
                  <FiHome className="w-12 h-12 text-pink-400" />
                </div>
              </div>
            </div>
            
            {/* Onboarding API Key Section */}
            {onboardingApiKey && (
              <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
                <h3 className="text-xl font-bold text-white mb-4">Onboarding API Key</h3>
                <p className="text-indigo-200 text-sm mb-4">
                  Use this API key for programmatic restaurant creation if needed. Authentication is now handled via JWT token.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={onboardingApiKey}
                    readOnly
                    className="flex-1 px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(onboardingApiKey)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                    title="Copy API Key"
                  >
                    <FiCopy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">Restaurants</h2>
              <button
                onClick={() => setShowRestaurantForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Onboard Restaurant
              </button>
            </div>

            {restaurants.length === 0 ? (
              <div className="bg-indigo-900/50 backdrop-blur-md rounded-xl p-12 text-center border border-purple-700/50">
                <FiCoffee className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <p className="text-indigo-200 text-lg">No restaurants yet</p>
                <p className="text-indigo-300 text-sm mt-2">Start by onboarding your first restaurant</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurants.map((restaurant) => (
                  <div
                    key={restaurant.id}
                    className="bg-indigo-900/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50 hover:border-purple-600 transition-colors"
                  >
                    <h3 className="text-xl font-bold text-white mb-2">{restaurant.name}</h3>
                    <p className="text-indigo-200 text-sm mb-4">Phone: {restaurant.phone}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewRestaurantDetails(restaurant.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition-colors"
                      >
                        <FiEye className="w-4 h-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => handleDeleteRestaurant(restaurant.id, restaurant.name)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                        title="Delete Restaurant"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">Users</h2>
              <button
                onClick={() => setShowUserForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Create User
              </button>
            </div>

            {users.length === 0 ? (
              <div className="bg-indigo-900/50 backdrop-blur-md rounded-xl p-12 text-center border border-purple-700/50">
                <FiUsers className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <p className="text-indigo-200 text-lg">No users yet</p>
              </div>
            ) : (
              <div className="bg-indigo-900/50 backdrop-blur-md rounded-xl border border-purple-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-purple-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-200 uppercase">Username</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-200 uppercase">Full Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-200 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-200 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-200 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-200 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-800/50">
                      {users.map((userItem) => (
                        <tr key={userItem.id} className="hover:bg-indigo-800/30">
                          <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{userItem.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-indigo-200">{userItem.full_name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-indigo-200">{userItem.email || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              userItem.role === 'super_admin' ? 'bg-purple-600 text-white' :
                              userItem.role === 'restaurant_admin' ? 'bg-indigo-600 text-white' :
                              'bg-violet-600 text-white'
                            }`}>
                              {userItem.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              userItem.is_active ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {userItem.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedUser(userItem)
                                  setShowPasswordModal(true)
                                }}
                                className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-800/50 rounded transition-colors"
                                title="Change Password"
                              >
                                <FiKey className="w-4 h-4" />
                              </button>
                              {userItem.is_active && (
                                <button
                                  onClick={() => handleDeactivateUser(userItem.id)}
                                  className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-800/50 rounded transition-colors"
                                  title="Deactivate"
                                >
                                  <FiUserX className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(userItem.id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-800/50 rounded transition-colors"
                                title="Delete"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restaurant Form Modal */}
      {showRestaurantForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-700/50">
            <div className="p-6 border-b border-purple-700/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">Onboard New Restaurant</h2>
              <button
                onClick={() => {
                  setShowRestaurantForm(false)
                  setRestaurantCredentials(null)
                }}
                className="text-indigo-200 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateRestaurant} className="p-6 space-y-4">
              <div>
                <label className="block text-indigo-200 text-sm font-semibold mb-2">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  value={restaurantForm.name}
                  onChange={(e) => setRestaurantForm({...restaurantForm, name: e.target.value})}
                  className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                  placeholder="Restaurant Name"
                  required
                />
              </div>
              <div>
                <label className="block text-indigo-200 text-sm font-semibold mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={restaurantForm.phone}
                  onChange={(e) => setRestaurantForm({...restaurantForm, phone: e.target.value})}
                  className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                  placeholder="+1234567890"
                  required
                />
              </div>
              <div>
                <label className="block text-indigo-200 text-sm font-semibold mb-2">
                  PrintNode API Key
                </label>
                <input
                  type="text"
                  value={restaurantForm.printnode_api_key}
                  onChange={(e) => setRestaurantForm({...restaurantForm, printnode_api_key: e.target.value})}
                  className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                  placeholder="PrintNode API Key"
                  required
                />
              </div>
              <div>
                <label className="block text-indigo-200 text-sm font-semibold mb-2">
                  PrintNode Printer ID
                </label>
                <input
                  type="text"
                  value={restaurantForm.printnode_printer_id}
                  onChange={(e) => setRestaurantForm({...restaurantForm, printnode_printer_id: e.target.value})}
                  className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                  placeholder="Printer ID (numeric)"
                  required
                />
              </div>
              <div>
                <label className="block text-indigo-200 text-sm font-semibold mb-2">
                  Twilio Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={restaurantForm.twilio_phone}
                  onChange={(e) => setRestaurantForm({...restaurantForm, twilio_phone: e.target.value})}
                  className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                  placeholder="+1234567890"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
                >
                  Create Restaurant
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRestaurantForm(false)
                    setRestaurantCredentials(null)
                  }}
                  className="px-6 py-3 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restaurant Credentials Modal */}
      {restaurantCredentials && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl max-w-md w-full border border-purple-700/50">
            <div className="p-6 border-b border-purple-700/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <FiAlertCircle className="w-6 h-6 text-yellow-400" />
                Save Credentials
              </h2>
              <button
                onClick={() => setRestaurantCredentials(null)}
                className="text-indigo-200 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-yellow-400 font-semibold">
                ⚠️ Save these credentials! They cannot be retrieved again.
              </p>
              <div className="bg-indigo-950/50 rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-1">Username</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={restaurantCredentials.username}
                      readOnly
                      className="flex-1 px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(restaurantCredentials.username)}
                      className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                      title="Copy"
                    >
                      <FiCopy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-1">Password</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={restaurantCredentials.password}
                      readOnly
                      className="flex-1 px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(restaurantCredentials.password)}
                      className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                      title="Copy"
                    >
                      <FiCopy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-1">Role</label>
                  <input
                    type="text"
                    value={restaurantCredentials.role}
                    readOnly
                    className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white"
                  />
                </div>
              </div>
              <button
                onClick={() => setRestaurantCredentials(null)}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl max-w-lg w-full border border-purple-700/50">
            <div className="p-6 border-b border-purple-700/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">Create New User</h2>
              <button
                onClick={() => setShowUserForm(false)}
                className="text-indigo-200 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-indigo-200 text-sm font-semibold mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                  className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-indigo-200 text-sm font-semibold mb-2">
                  Password (min 8 chars, mixed characters)
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-indigo-200 text-sm font-semibold mb-2">
                  Role
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                  className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="restaurant_admin">Restaurant Admin</option>
                  <option value="kds_user">KDS User</option>
                  <option value="frontdesk_user">Front Desk User</option>
                </select>
              </div>
              <div>
                <label className="block text-indigo-200 text-sm font-semibold mb-2">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                  className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-indigo-200 text-sm font-semibold mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                />
              </div>
              {(userForm.role !== 'super_admin') && (
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-2">
                    Restaurant ID (Required for non-super-admin)
                  </label>
                  <input
                    type="text"
                    value={userForm.restaurant_id}
                    onChange={(e) => setUserForm({...userForm, restaurant_id: e.target.value})}
                    className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                    required={userForm.role !== 'super_admin'}
                  />
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="px-6 py-3 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Update Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl max-w-md w-full border border-purple-700/50">
            <div className="p-6 border-b border-purple-700/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">Update Password</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setSelectedUser(null)
                  setNewPassword('')
                }}
                className="text-indigo-200 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-indigo-200">User: <span className="font-semibold text-white">{selectedUser.username}</span></p>
              <div>
                <label className="block text-indigo-200 text-sm font-semibold mb-2">
                  New Password (min 8 chars, mixed characters)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleUpdatePassword}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
                >
                  Update Password
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setSelectedUser(null)
                    setNewPassword('')
                  }}
                  className="px-6 py-3 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Details Modal */}
      {showRestaurantDetails && selectedRestaurant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-700/50">
            <div className="p-6 border-b border-purple-700/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">
                {isEditingRestaurant ? 'Edit Restaurant' : 'Restaurant Details'}
              </h2>
              <div className="flex items-center gap-2">
                {!isEditingRestaurant && (
                  <>
                    <button
                      onClick={() => setIsEditingRestaurant(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRestaurant(selectedRestaurant.id, selectedRestaurant.name)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowRestaurantDetails(false)
                    setSelectedRestaurant(null)
                    setIsEditingRestaurant(false)
                  }}
                  className="text-indigo-200 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {isEditingRestaurant ? (
              <form onSubmit={handleUpdateRestaurant} className="p-6 space-y-4">
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-2">
                    Restaurant Name
                  </label>
                  <input
                    type="text"
                    value={restaurantDetailsForm.name}
                    onChange={(e) => setRestaurantDetailsForm({...restaurantDetailsForm, name: e.target.value})}
                    className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={restaurantDetailsForm.phone}
                    onChange={(e) => setRestaurantDetailsForm({...restaurantDetailsForm, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-2">
                    PrintNode API Key
                  </label>
                  <input
                    type="text"
                    value={restaurantDetailsForm.printnode_api_key}
                    onChange={(e) => setRestaurantDetailsForm({...restaurantDetailsForm, printnode_api_key: e.target.value})}
                    className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500 font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-2">
                    PrintNode Printer ID
                  </label>
                  <input
                    type="text"
                    value={restaurantDetailsForm.printnode_printer_id}
                    onChange={(e) => setRestaurantDetailsForm({...restaurantDetailsForm, printnode_printer_id: e.target.value})}
                    className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-2">
                    Twilio Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={restaurantDetailsForm.twilio_phone}
                    onChange={(e) => setRestaurantDetailsForm({...restaurantDetailsForm, twilio_phone: e.target.value})}
                    className="w-full px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white placeholder-indigo-400 focus:outline-none focus:border-purple-500"
                    placeholder="+1234567890"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingRestaurant(false)
                      // Reset form to original values
                      setRestaurantDetailsForm({
                        name: selectedRestaurant.name || '',
                        phone: selectedRestaurant.phone || '',
                        printnode_api_key: selectedRestaurant.printnode_api_key || '',
                        printnode_printer_id: selectedRestaurant.printnode_printer_id || '',
                        twilio_phone: selectedRestaurant.twilio_phone || ''
                      })
                    }}
                    className="px-6 py-3 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-1">Restaurant ID</label>
                  <p className="text-white font-mono text-sm bg-indigo-800/50 px-4 py-2 rounded-lg">{selectedRestaurant.id}</p>
                </div>
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-1">Restaurant Name</label>
                  <p className="text-white">{selectedRestaurant.name}</p>
                </div>
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-1">Phone Number</label>
                  <p className="text-white">{selectedRestaurant.phone}</p>
                </div>
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-1">PrintNode API Key</label>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-mono text-sm bg-indigo-800/50 px-4 py-2 rounded-lg flex-1">{selectedRestaurant.printnode_api_key || 'Not set'}</p>
                    {selectedRestaurant.printnode_api_key && (
                      <button
                        onClick={() => copyToClipboard(selectedRestaurant.printnode_api_key)}
                        className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                        title="Copy"
                      >
                        <FiCopy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-1">PrintNode Printer ID</label>
                  <p className="text-white">{selectedRestaurant.printnode_printer_id}</p>
                </div>
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-1">Twilio Phone</label>
                  <p className="text-white">{selectedRestaurant.twilio_phone || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-indigo-200 text-sm font-semibold mb-1">Restaurant Admin Username</label>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-mono text-sm bg-indigo-800/50 px-4 py-2 rounded-lg flex-1">
                      {selectedRestaurant.admin_username || 'Not found'}
                    </p>
                    {selectedRestaurant.admin_username && (
                      <button
                        onClick={() => copyToClipboard(selectedRestaurant.admin_username)}
                        className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                        title="Copy Username"
                      >
                        <FiCopy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4">
                  <p className="text-yellow-200 text-sm">
                    <strong>Note:</strong> The password was only shown during restaurant creation. 
                    If you need to reset the password, use the "Change Password" option in the Users tab.
                  </p>
                </div>
                {selectedRestaurant.created_at && (
                  <div>
                    <label className="block text-indigo-200 text-sm font-semibold mb-1">Created At</label>
                    <p className="text-white text-sm">{new Date(selectedRestaurant.created_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
