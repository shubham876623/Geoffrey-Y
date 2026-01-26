import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  getMenuCategories,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getModifiers,
  createModifier,
  updateModifier,
  deleteModifier,
  uploadMenuFile,
  getMenuImports,
  getUsers,
  createUser,
  updateUserPassword,
  deactivateUser,
  deleteUser,
  getOrders
} from '../lib/api'
import {
  FiCoffee,
  FiUsers,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiLogOut,
  FiHome,
  FiX,
  FiCheckCircle,
  FiCopy,
  FiAlertCircle,
  FiUpload,
  FiFileText,
  FiShoppingBag,
  FiBarChart,
  FiKey,
  FiUserX,
  FiToggleLeft,
  FiToggleRight
} from 'react-icons/fi'
import { ToastContainer } from '../components/Toast'

export default function RestaurantDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const restaurantId = user?.restaurant_id
  
  // Stats
  const [stats, setStats] = useState({
    totalItems: 0,
    totalCategories: 0,
    totalStaff: 0,
    activeOrders: 0
  })
  
  // Menu data
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [modifiers, setModifiers] = useState([])
  
  // Staff users
  const [staffUsers, setStaffUsers] = useState([])
  
  // Orders
  const [orders, setOrders] = useState([])
  
  // Toast notifications
  const [toasts, setToasts] = useState([])
  
  // Modal states
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [showModifierForm, setShowModifierForm] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  
  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', display_order: 0, is_active: true })
  const [itemForm, setItemForm] = useState({
    name: '',
    name_chinese: '',
    description: '',
    description_chinese: '',
    price: '',
    category_id: '',
    image_url: '',
    is_available: true,
    display_order: 0
  })
  const [modifierForm, setModifierForm] = useState({
    name: '',
    name_chinese: '',
    type: 'single',
    is_required: false,
    display_order: 0
  })
  const [staffForm, setStaffForm] = useState({
    username: '',
    password: '',
    role: 'kds_user',
    email: '',
    full_name: ''
  })
  const [selectedCategory, setSelectedCategory] = useState(null) // For editing category
  const [selectedItem, setSelectedItem] = useState(null) // For editing menu item
  const [selectedModifier, setSelectedModifier] = useState(null)
  const [selectedStaffUser, setSelectedStaffUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(null)

  useEffect(() => {
    // Wait for user to load
    if (!user) {
      return
    }
    
    if (!user.restaurant_id) {
      showToast('No restaurant associated with your account. Please contact support.', 'error')
      setLoading(false)
      return
    }
    
    // Load data when restaurant_id is available
    loadData()
  }, [user])

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const loadData = async () => {
    if (!restaurantId) return
    
    try {
      setLoading(true)
      const [categoriesRes, itemsRes, modifiersRes, usersRes, ordersRes] = await Promise.all([
        getMenuCategories(restaurantId).catch(() => ({ categories: [] })),
        getMenuItems(restaurantId).catch(() => ({ items: [] })),
        getModifiers(restaurantId).catch(() => ({ modifiers: [] })),
        getUsers(restaurantId).catch(() => []),
        getOrders({ restaurant_id: restaurantId }).catch(() => ({ orders: [] }))
      ])
      
      setCategories(categoriesRes.categories || [])
      setItems(itemsRes.items || [])
      setModifiers(modifiersRes.modifiers || [])
      setStaffUsers(usersRes || [])
      setOrders(ordersRes.orders || [])
      
      setStats({
        totalItems: itemsRes.items?.length || 0,
        totalCategories: categoriesRes.categories?.length || 0,
        totalStaff: usersRes?.length || 0,
        activeOrders: ordersRes.orders?.filter(o => o.status !== 'completed')?.length || 0
      })
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Failed to load dashboard data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Category handlers
  const handleCreateCategory = async (e) => {
    e.preventDefault()
    try {
      await createMenuCategory(restaurantId, categoryForm)
      showToast('Category created successfully!', 'success')
      setShowCategoryForm(false)
      setCategoryForm({ name: '', description: '', display_order: 0, is_active: true })
      loadData()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to create category', 'error')
    }
  }

  const handleUpdateCategory = async (e) => {
    e.preventDefault()
    if (!selectedCategory) return
    try {
      await updateMenuCategory(selectedCategory.id, categoryForm)
      showToast('Category updated successfully!', 'success')
      setShowCategoryForm(false)
      setSelectedCategory(null)
      loadData()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update category', 'error')
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? Items in this category will not be deleted.')) return
    try {
      await deleteMenuCategory(categoryId)
      showToast('Category deleted successfully!', 'success')
      loadData()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to delete category', 'error')
    }
  }

  // Item handlers
  const handleCreateItem = async (e) => {
    e.preventDefault()
    try {
      await createMenuItem(restaurantId, { ...itemForm, price: parseFloat(itemForm.price) })
      showToast('Menu item created successfully!', 'success')
      setShowItemForm(false)
      setItemForm({
        name: '',
        name_chinese: '',
        description: '',
        description_chinese: '',
        price: '',
        category_id: '',
        image_url: '',
        is_available: true,
        display_order: 0
      })
      loadData()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to create menu item', 'error')
    }
  }

  const handleUpdateItem = async (e) => {
    e.preventDefault()
    if (!selectedItem) return
    try {
      await updateMenuItem(selectedItem.id, { ...itemForm, price: itemForm.price ? parseFloat(itemForm.price) : undefined })
      showToast('Menu item updated successfully!', 'success')
      setShowItemForm(false)
      setSelectedItem(null)
      loadData()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update menu item', 'error')
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return
    try {
      await deleteMenuItem(itemId)
      showToast('Menu item deleted successfully!', 'success')
      loadData()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to delete menu item', 'error')
    }
  }

  // Modifier handlers
  const handleCreateModifier = async (e) => {
    e.preventDefault()
    try {
      await createModifier(restaurantId, modifierForm)
      showToast('Modifier created successfully!', 'success')
      setShowModifierForm(false)
      setModifierForm({ name: '', name_chinese: '', type: 'single', is_required: false, display_order: 0 })
      loadData()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to create modifier', 'error')
    }
  }

  const handleUpdateModifier = async (e) => {
    e.preventDefault()
    if (!selectedModifier) return
    try {
      await updateModifier(selectedModifier.id, modifierForm)
      showToast('Modifier updated successfully!', 'success')
      setShowModifierForm(false)
      setSelectedModifier(null)
      loadData()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update modifier', 'error')
    }
  }

  const handleDeleteModifier = async (modifierId) => {
    if (!confirm('Are you sure you want to delete this modifier?')) return
    try {
      await deleteModifier(modifierId)
      showToast('Modifier deleted successfully!', 'success')
      loadData()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to delete modifier', 'error')
    }
  }

  // Upload handler
  const handleUploadMenu = async (e) => {
    e.preventDefault()
    if (!uploadFile) {
      showToast('Please select a file to upload', 'error')
      return
    }
    
    try {
      setUploadProgress('Uploading...')
      const response = await uploadMenuFile(restaurantId, uploadFile)
      showToast('Menu file uploaded successfully! AI parsing will begin shortly.', 'success')
      setShowUploadModal(false)
      setUploadFile(null)
      setUploadProgress(null)
      // Reload menu imports to show status
      loadData()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to upload menu file', 'error')
      setUploadProgress(null)
    }
  }

  // Staff user handlers
  const handleCreateStaff = async (e) => {
    e.preventDefault()
    try {
      await createUser({ ...staffForm, restaurant_id: restaurantId })
      showToast('Staff user created successfully!', 'success')
      setShowStaffForm(false)
      setStaffForm({ username: '', password: '', role: 'kds_user', email: '', full_name: '' })
      loadData()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to create staff user', 'error')
    }
  }

  const handleUpdateStaffPassword = async () => {
    if (!selectedStaffUser || !newPassword) return
    try {
      await updateUserPassword(selectedStaffUser.id, newPassword)
      showToast('Password updated successfully', 'success')
      setShowPasswordModal(false)
      setSelectedStaffUser(null)
      setNewPassword('')
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update password', 'error')
    }
  }

  const handleDeleteStaff = async (userId) => {
    if (!confirm('Are you sure you want to delete this staff user?')) return
    try {
      await deleteUser(userId)
      showToast('Staff user deleted successfully', 'success')
      loadData()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to delete staff user', 'error')
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/restaurant/login')
  }

  // Show loading while user is being loaded
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-red-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // Check if user has restaurant_id
  if (!user.restaurant_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-red-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">No restaurant associated with your account.</div>
          <p className="text-amber-200 text-sm mb-4">Please contact support to link your account to a restaurant.</p>
          <button
            onClick={async () => {
              await logout()
              navigate('/restaurant/login')
            }}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-red-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-red-950">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <header className="bg-amber-900/50 backdrop-blur-md border-b border-orange-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-white">Restaurant Admin Dashboard</h1>
              <p className="text-amber-200 text-sm">Welcome, {user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <FiLogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-4 mb-8 border-b border-orange-800/50 pb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'bg-orange-600 text-white'
                : 'text-amber-200 hover:bg-amber-800/50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'menu'
                ? 'bg-orange-600 text-white'
                : 'text-amber-200 hover:bg-amber-800/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiCoffee className="w-4 h-4" />
              Menu ({stats.totalItems})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'staff'
                ? 'bg-orange-600 text-white'
                : 'text-amber-200 hover:bg-amber-800/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiUsers className="w-4 h-4" />
              Staff ({stats.totalStaff})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'orders'
                ? 'bg-orange-600 text-white'
                : 'text-amber-200 hover:bg-amber-800/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiShoppingBag className="w-4 h-4" />
              Orders ({stats.activeOrders})
            </div>
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-amber-800/50 to-orange-800/50 backdrop-blur-md rounded-xl p-6 border border-orange-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-200 text-sm mb-1">Menu Items</p>
                    <p className="text-3xl font-black text-white">{stats.totalItems}</p>
                  </div>
                  <FiCoffee className="w-12 h-12 text-orange-400" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-800/50 to-red-800/50 backdrop-blur-md rounded-xl p-6 border border-orange-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-200 text-sm mb-1">Categories</p>
                    <p className="text-3xl font-black text-white">{stats.totalCategories}</p>
                  </div>
                  <FiFileText className="w-12 h-12 text-red-400" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-800/50 to-pink-800/50 backdrop-blur-md rounded-xl p-6 border border-orange-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-200 text-sm mb-1">Staff Users</p>
                    <p className="text-3xl font-black text-white">{stats.totalStaff}</p>
                  </div>
                  <FiUsers className="w-12 h-12 text-pink-400" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-pink-800/50 to-rose-800/50 backdrop-blur-md rounded-xl p-6 border border-orange-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-200 text-sm mb-1">Active Orders</p>
                    <p className="text-3xl font-black text-white">{stats.activeOrders}</p>
                  </div>
                  <FiShoppingBag className="w-12 h-12 text-rose-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">Menu Management</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                >
                  <FiUpload className="w-4 h-4" />
                  Upload Menu
                </button>
                <button
                onClick={() => {
                  setSelectedCategory(null)
                  setShowCategoryForm(true)
                  setCategoryForm({ name: '', description: '', display_order: 0, is_active: true })
                }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  Add Category
                </button>
                <button
                  onClick={() => {
                    setSelectedItem(null)
                    setShowItemForm(true)
                    setItemForm({
                      name: '',
                      name_chinese: '',
                      description: '',
                      description_chinese: '',
                      price: '',
                      category_id: '',
                      image_url: '',
                      is_available: true,
                      display_order: 0
                    })
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
            </div>

            {/* Categories Section */}
            <div className="bg-amber-900/50 backdrop-blur-md rounded-xl p-6 border border-orange-700/50">
              <h3 className="text-xl font-bold text-white mb-4">Categories</h3>
              {categories.length === 0 ? (
                <p className="text-amber-200">No categories yet. Create your first category!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <div key={category.id} className="bg-amber-800/50 rounded-lg p-4 border border-orange-700/50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white">{category.name}</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedCategory(category)
                              setCategoryForm({
                                name: category.name,
                                description: category.description || '',
                                display_order: category.display_order || 0,
                                is_active: category.is_active !== false
                              })
                              setShowCategoryForm(true)
                            }}
                            className="p-1 text-orange-400 hover:text-orange-300 hover:bg-orange-800/50 rounded transition-colors"
                            title="Edit"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-800/50 rounded transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {category.description && (
                        <p className="text-amber-200 text-sm mb-2">{category.description}</p>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        category.is_active !== false ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                      }`}>
                        {category.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Menu Items Section */}
            <div className="bg-amber-900/50 backdrop-blur-md rounded-xl p-6 border border-orange-700/50">
              <h3 className="text-xl font-bold text-white mb-4">Menu Items</h3>
              {items.length === 0 ? (
                <p className="text-amber-200">No menu items yet. Add your first item!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-orange-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-800/50">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-amber-800/30">
                          <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{item.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-amber-200">
                            {categories.find(c => c.id === item.category_id)?.name || 'Uncategorized'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white">${item.price?.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              item.is_available ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                            }`}>
                              {item.is_available ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedItem(item)
                                  setItemForm({
                                    name: item.name || '',
                                    name_chinese: item.name_chinese || '',
                                    description: item.description || '',
                                    description_chinese: item.description_chinese || '',
                                    price: item.price?.toString() || '',
                                    category_id: item.category_id || '',
                                    image_url: item.image_url || '',
                                    is_available: item.is_available !== false,
                                    display_order: item.display_order || 0
                                  })
                                  setShowItemForm(true)
                                }}
                                className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-800/50 rounded transition-colors"
                                title="Edit"
                              >
                                <FiEdit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
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
              )}
            </div>

            {/* Modifiers Section */}
            <div className="bg-amber-900/50 backdrop-blur-md rounded-xl p-6 border border-orange-700/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Modifiers</h3>
                <button
                  onClick={() => {
                    setSelectedModifier(null)
                    setShowModifierForm(true)
                    setModifierForm({ name: '', name_chinese: '', type: 'single', is_required: false, display_order: 0 })
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors text-sm"
                >
                  <FiPlus className="w-4 h-4" />
                  Add Modifier
                </button>
              </div>
              {modifiers.length === 0 ? (
                <p className="text-amber-200">No modifiers yet. Create modifiers for sizes, add-ons, etc.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modifiers.map((modifier) => (
                    <div key={modifier.id} className="bg-amber-800/50 rounded-lg p-4 border border-orange-700/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-white">{modifier.name}</h4>
                          <p className="text-amber-200 text-sm">
                            Type: {modifier.type === 'single' ? 'Single Select' : 'Multiple Select'}
                            {modifier.is_required && ' • Required'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedModifier(modifier)
                              setModifierForm({
                                name: modifier.name || '',
                                name_chinese: modifier.name_chinese || '',
                                type: modifier.type || 'single',
                                is_required: modifier.is_required || false,
                                display_order: modifier.display_order || 0
                              })
                              setShowModifierForm(true)
                            }}
                            className="p-1 text-orange-400 hover:text-orange-300 hover:bg-orange-800/50 rounded transition-colors"
                            title="Edit"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteModifier(modifier.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-800/50 rounded transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Staff Tab */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">Staff Management</h2>
              <button
                onClick={() => {
                  setShowStaffForm(true)
                  setStaffForm({ username: '', password: '', role: 'kds_user', email: '', full_name: '' })
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Add Staff
              </button>
            </div>

            {staffUsers.length === 0 ? (
              <div className="bg-amber-900/50 backdrop-blur-md rounded-xl p-12 text-center border border-orange-700/50">
                <FiUsers className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                <p className="text-amber-200 text-lg">No staff users yet</p>
                <p className="text-amber-300 text-sm mt-2">Create KDS and FrontDesk users for your staff</p>
              </div>
            ) : (
              <div className="bg-amber-900/50 backdrop-blur-md rounded-xl border border-orange-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-orange-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Username</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Full Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-800/50">
                      {staffUsers.map((staffUser) => (
                        <tr key={staffUser.id} className="hover:bg-amber-800/30">
                          <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{staffUser.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-amber-200">{staffUser.full_name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-amber-200">{staffUser.email || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              staffUser.role === 'kds_user' ? 'bg-orange-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {staffUser.role === 'kds_user' ? 'KDS User' : 'FrontDesk User'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              staffUser.is_active ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {staffUser.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedStaffUser(staffUser)
                                  setShowPasswordModal(true)
                                }}
                                className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-800/50 rounded transition-colors"
                                title="Change Password"
                              >
                                <FiKey className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStaff(staffUser.id)}
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

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Orders</h2>
            {orders.length === 0 ? (
              <div className="bg-amber-900/50 backdrop-blur-md rounded-xl p-12 text-center border border-orange-700/50">
                <FiShoppingBag className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                <p className="text-amber-200 text-lg">No orders yet</p>
              </div>
            ) : (
              <div className="bg-amber-900/50 backdrop-blur-md rounded-xl border border-orange-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-orange-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Order #</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-amber-200 uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-800/50">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-amber-800/30">
                          <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{order.order_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-amber-200">{order.customer_name || order.customer_phone}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              order.status === 'completed' ? 'bg-green-600 text-white' :
                              order.status === 'ready' ? 'bg-blue-600 text-white' :
                              order.status === 'preparing' ? 'bg-yellow-600 text-white' :
                              'bg-red-600 text-white'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white">${order.total_amount?.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-amber-200 text-sm">
                            {new Date(order.created_at).toLocaleString()}
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

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-amber-900 to-orange-900 rounded-2xl max-w-md w-full border border-orange-700/50">
            <div className="p-6 border-b border-orange-700/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">
                {selectedCategory ? 'Edit Category' : 'Create Category'}
              </h2>
              <button
                onClick={() => {
                  setShowCategoryForm(false)
                  setSelectedCategory(null)
                }}
                className="text-amber-200 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={selectedCategory ? handleUpdateCategory : handleCreateCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">Category Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">Description (Optional)</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">Display Order</label>
                <input
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({...categoryForm, display_order: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="category-active"
                  checked={categoryForm.is_active}
                  onChange={(e) => setCategoryForm({...categoryForm, is_active: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="category-active" className="text-amber-200 text-sm">Active</label>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold transition-colors"
                >
                  {selectedCategory ? 'Update Category' : 'Create Category'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false)
                    setSelectedCategory(null)
                  }}
                  className="px-6 py-3 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-amber-900 to-orange-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-orange-700/50">
            <div className="p-6 border-b border-orange-700/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">
                {selectedItem ? 'Edit Menu Item' : 'Create Menu Item'}
              </h2>
              <button
                onClick={() => {
                  setShowItemForm(false)
                  setSelectedItem(null)
                }}
                className="text-amber-200 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={selectedItem ? handleUpdateItem : handleCreateItem} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-amber-200 text-sm font-semibold mb-2">Item Name (English)</label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                    className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-amber-200 text-sm font-semibold mb-2">Item Name (Chinese)</label>
                  <input
                    type="text"
                    value={itemForm.name_chinese}
                    onChange={(e) => setItemForm({...itemForm, name_chinese: e.target.value})}
                    className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-amber-200 text-sm font-semibold mb-2">Description (English)</label>
                  <textarea
                    value={itemForm.description}
                    onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                    className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-amber-200 text-sm font-semibold mb-2">Description (Chinese)</label>
                  <textarea
                    value={itemForm.description_chinese}
                    onChange={(e) => setItemForm({...itemForm, description_chinese: e.target.value})}
                    className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                    rows="2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-amber-200 text-sm font-semibold mb-2">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({...itemForm, price: e.target.value})}
                    className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-amber-200 text-sm font-semibold mb-2">Category</label>
                  <select
                    value={itemForm.category_id}
                    onChange={(e) => setItemForm({...itemForm, category_id: e.target.value})}
                    className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">Image URL (Optional)</label>
                <input
                  type="url"
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm({...itemForm, image_url: e.target.value})}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="item-available"
                    checked={itemForm.is_available}
                    onChange={(e) => setItemForm({...itemForm, is_available: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label htmlFor="item-available" className="text-amber-200 text-sm">Available</label>
                </div>
                <div>
                  <label className="block text-amber-200 text-sm font-semibold mb-2">Display Order</label>
                  <input
                    type="number"
                    value={itemForm.display_order}
                    onChange={(e) => setItemForm({...itemForm, display_order: parseInt(e.target.value) || 0})}
                    className="w-24 px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold transition-colors"
                >
                  {selectedItem ? 'Update Item' : 'Create Item'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowItemForm(false)
                    setSelectedItem(null)
                  }}
                  className="px-6 py-3 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modifier Form Modal */}
      {showModifierForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-amber-900 to-orange-900 rounded-2xl max-w-lg w-full border border-orange-700/50">
            <div className="p-6 border-b border-orange-700/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">
                {selectedModifier ? 'Edit Modifier' : 'Create Modifier'}
              </h2>
              <button
                onClick={() => {
                  setShowModifierForm(false)
                  setSelectedModifier(null)
                }}
                className="text-amber-200 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={selectedModifier ? handleUpdateModifier : handleCreateModifier} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-amber-200 text-sm font-semibold mb-2">Modifier Name (English)</label>
                  <input
                    type="text"
                    value={modifierForm.name}
                    onChange={(e) => setModifierForm({...modifierForm, name: e.target.value})}
                    className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-amber-200 text-sm font-semibold mb-2">Modifier Name (Chinese)</label>
                  <input
                    type="text"
                    value={modifierForm.name_chinese}
                    onChange={(e) => setModifierForm({...modifierForm, name_chinese: e.target.value})}
                    className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">Type</label>
                <select
                  value={modifierForm.type}
                  onChange={(e) => setModifierForm({...modifierForm, type: e.target.value})}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="single">Single Select (Radio)</option>
                  <option value="multiple">Multiple Select (Checkbox)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modifier-required"
                  checked={modifierForm.is_required}
                  onChange={(e) => setModifierForm({...modifierForm, is_required: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="modifier-required" className="text-amber-200 text-sm">Required</label>
              </div>
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">Display Order</label>
                <input
                  type="number"
                  value={modifierForm.display_order}
                  onChange={(e) => setModifierForm({...modifierForm, display_order: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold transition-colors"
                >
                  {selectedModifier ? 'Update Modifier' : 'Create Modifier'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModifierForm(false)
                    setSelectedModifier(null)
                  }}
                  className="px-6 py-3 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-amber-900 to-orange-900 rounded-2xl max-w-md w-full border border-orange-700/50">
            <div className="p-6 border-b border-orange-700/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">Upload Menu</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                }}
                className="text-amber-200 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUploadMenu} className="p-6 space-y-4">
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">
                  Menu File (PDF, CSV, or Text)
                </label>
                <input
                  type="file"
                  accept=".pdf,.csv,.txt"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  required
                />
                <p className="text-amber-300 text-xs mt-2">Supported formats: PDF, CSV, TXT</p>
              </div>
              {uploadProgress && (
                <p className="text-amber-200 text-sm">{uploadProgress}</p>
              )}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold transition-colors"
                  disabled={uploadProgress}
                >
                  Upload & Parse
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                  }}
                  className="px-6 py-3 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Form Modal */}
      {showStaffForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-amber-900 to-orange-900 rounded-2xl max-w-lg w-full border border-orange-700/50">
            <div className="p-6 border-b border-orange-700/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">Create Staff User</h2>
              <button
                onClick={() => setShowStaffForm(false)}
                className="text-amber-200 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">Username</label>
                <input
                  type="text"
                  value={staffForm.username}
                  onChange={(e) => setStaffForm({...staffForm, username: e.target.value})}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">Password (min 8 chars, mixed characters)</label>
                <input
                  type="password"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({...staffForm, password: e.target.value})}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">Role</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({...staffForm, role: e.target.value})}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="kds_user">KDS User</option>
                  <option value="frontdesk_user">FrontDesk User</option>
                </select>
              </div>
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">Full Name (Optional)</label>
                <input
                  type="text"
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm({...staffForm, full_name: e.target.value})}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">Email (Optional)</label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({...staffForm, email: e.target.value})}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold transition-colors"
                >
                  Create Staff User
                </button>
                <button
                  type="button"
                  onClick={() => setShowStaffForm(false)}
                  className="px-6 py-3 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Update Modal */}
      {showPasswordModal && selectedStaffUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-amber-900 to-orange-900 rounded-2xl max-w-md w-full border border-orange-700/50">
            <div className="p-6 border-b border-orange-700/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">Update Password</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setSelectedStaffUser(null)
                  setNewPassword('')
                }}
                className="text-amber-200 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-amber-200">User: <span className="font-semibold text-white">{selectedStaffUser.username}</span></p>
              <div>
                <label className="block text-amber-200 text-sm font-semibold mb-2">
                  New Password (min 8 chars, mixed characters)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-amber-800/50 border border-orange-700/50 rounded-lg text-white placeholder-amber-400 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleUpdateStaffPassword}
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold transition-colors"
                >
                  Update Password
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setSelectedStaffUser(null)
                    setNewPassword('')
                  }}
                  className="px-6 py-3 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
