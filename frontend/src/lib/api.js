import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_KDS_API_KEY || ''

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add API key to requests if available
if (API_KEY) {
  api.defaults.headers.common['x-api-key'] = API_KEY
  if (isDevelopment) {
    console.log('✅ API Key configured:', API_KEY.substring(0, 10) + '...')
  }
} else {
  console.error('❌ VITE_KDS_API_KEY is not set in .env file!')
  console.error('Please add VITE_KDS_API_KEY=your_key_here to frontend/.env')
}

// Log API base URL in development
if (isDevelopment) {
  console.log('🔗 API Base URL:', API_BASE_URL)
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status (pending, preparing, ready, completed)
 * @returns {Promise}
 */
export const updateOrderStatus = async (orderId, status) => {
  try {
    // Base URL already includes /api, so we add /api/orders/... to get /api/api/orders/...
    const response = await api.post(`/api/orders/${orderId}/status`, { status })
    return response.data
  } catch (error) {
    if (error.response) {
      // Server responded with error
      if (error.response.status === 403) {
        console.error('❌ 403 Forbidden - API key authentication failed!')
        if (isDevelopment) {
          console.error('Check that VITE_KDS_API_KEY in frontend/.env matches KDS_API_KEY in backend/.env')
          console.error('Current API key being sent:', API_KEY ? API_KEY.substring(0, 10) + '...' : 'NOT SET')
        }
      } else if (error.response.status === 401) {
        console.error('❌ 401 Unauthorized - API key is missing!')
        if (isDevelopment) {
          console.error('Make sure VITE_KDS_API_KEY is set in frontend/.env')
        }
      } else if (error.response.status >= 500) {
        console.error('❌ Server error:', error.response.status)
      }
      if (isDevelopment) {
        console.error('Response:', error.response.data)
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('❌ Network error - Could not reach backend server')
      if (isDevelopment) {
        console.error('Check that backend is running at:', API_BASE_URL)
      }
    } else {
      console.error('❌ Error updating order status:', error.message)
    }
    throw error
  }
}

/**
 * Get all orders (with optional filters)
 * @param {Object} filters - Optional filters (restaurant_id, status, etc.)
 * @returns {Promise}
 */
export const getOrders = async (filters = {}) => {
  try {
    // Base URL already includes /api, so we add /api/orders/... to get /api/api/orders/...
    const params = new URLSearchParams(filters)
    const response = await api.get(`/api/orders?${params.toString()}`)
    return response.data
  } catch (error) {
    if (error.response) {
      console.error('❌ Error fetching orders:', error.response.status, error.response.data)
    } else if (error.request) {
      console.error('❌ Network error - Could not reach backend server')
      if (isDevelopment) {
        console.error('Check that backend is running at:', API_BASE_URL)
      }
    } else {
      console.error('❌ Error fetching orders:', error.message)
    }
    throw error
  }
}

/**
 * Get public menu for restaurant
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise}
 */
export const getPublicMenu = async (restaurantId) => {
  try {
    // Base URL already includes /api, so we add /api/menu/... to get /api/api/menu/...
    const response = await api.get(`/api/menu/${restaurantId}/public`)
    return response.data
  } catch (error) {
    console.error('❌ Error fetching menu:', error)
    if (error.response) {
      // Server responded with error
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
      throw new Error(`Failed to load menu: ${error.response.status} ${error.response.data?.detail || error.response.data?.message || 'Unknown error'}`)
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response from server')
      throw new Error('Cannot connect to server. Please make sure the backend is running at ' + API_BASE_URL)
    } else {
      // Error setting up request
      console.error('Request setup error:', error.message)
      throw new Error(`Failed to load menu: ${error.message}`)
    }
  }
}

// ============================================
// MENU MANAGEMENT API FUNCTIONS (Restaurant Admin)
// ============================================

/**
 * Get menu categories for restaurant
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise}
 */
export const getMenuCategories = async (restaurantId) => {
  try {
    const response = await api.get(`/api/menu/${restaurantId}/categories`)
    return response.data
  } catch (error) {
    console.error('❌ Error fetching categories:', error)
    throw error
  }
}

/**
 * Create menu category
 * @param {string} restaurantId - Restaurant ID
 * @param {Object} categoryData - Category data
 * @returns {Promise}
 */
export const createMenuCategory = async (restaurantId, categoryData) => {
  try {
    const response = await api.post(`/api/menu/${restaurantId}/categories`, categoryData)
    return response.data
  } catch (error) {
    console.error('❌ Error creating category:', error)
    throw error
  }
}

/**
 * Update menu category
 * @param {string} categoryId - Category ID
 * @param {Object} categoryData - Category data
 * @returns {Promise}
 */
export const updateMenuCategory = async (categoryId, categoryData) => {
  try {
    const response = await api.put(`/api/menu/categories/${categoryId}`, categoryData)
    return response.data
  } catch (error) {
    console.error('❌ Error updating category:', error)
    throw error
  }
}

/**
 * Delete menu category
 * @param {string} categoryId - Category ID
 * @returns {Promise}
 */
export const deleteMenuCategory = async (categoryId) => {
  try {
    const response = await api.delete(`/api/menu/categories/${categoryId}`)
    return response.data
  } catch (error) {
    console.error('❌ Error deleting category:', error)
    throw error
  }
}

/**
 * Get menu items for restaurant
 * @param {string} restaurantId - Restaurant ID
 * @param {string} categoryId - Optional category ID filter
 * @returns {Promise}
 */
export const getMenuItems = async (restaurantId, categoryId = null) => {
  try {
    const params = categoryId ? { category_id: categoryId } : {}
    const response = await api.get(`/api/menu/${restaurantId}/items`, { params })
    return response.data
  } catch (error) {
    console.error('❌ Error fetching menu items:', error)
    throw error
  }
}

/**
 * Get single menu item
 * @param {string} itemId - Item ID
 * @returns {Promise}
 */
export const getMenuItem = async (itemId) => {
  try {
    const response = await api.get(`/api/menu/items/${itemId}`)
    return response.data
  } catch (error) {
    console.error('❌ Error fetching menu item:', error)
    throw error
  }
}

/**
 * Create menu item
 * @param {string} restaurantId - Restaurant ID
 * @param {Object} itemData - Item data
 * @returns {Promise}
 */
export const createMenuItem = async (restaurantId, itemData) => {
  try {
    const response = await api.post(`/api/menu/${restaurantId}/items`, itemData)
    return response.data
  } catch (error) {
    console.error('❌ Error creating menu item:', error)
    throw error
  }
}

/**
 * Update menu item
 * @param {string} itemId - Item ID
 * @param {Object} itemData - Item data
 * @returns {Promise}
 */
export const updateMenuItem = async (itemId, itemData) => {
  try {
    const response = await api.put(`/api/menu/items/${itemId}`, itemData)
    return response.data
  } catch (error) {
    console.error('❌ Error updating menu item:', error)
    throw error
  }
}

/**
 * Delete menu item
 * @param {string} itemId - Item ID
 * @returns {Promise}
 */
export const deleteMenuItem = async (itemId) => {
  try {
    const response = await api.delete(`/api/menu/items/${itemId}`)
    return response.data
  } catch (error) {
    console.error('❌ Error deleting menu item:', error)
    throw error
  }
}

/**
 * Get modifiers for restaurant
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise}
 */
export const getModifiers = async (restaurantId) => {
  try {
    const response = await api.get(`/api/menu/${restaurantId}/modifiers`)
    return response.data
  } catch (error) {
    console.error('❌ Error fetching modifiers:', error)
    throw error
  }
}

/**
 * Create modifier
 * @param {string} restaurantId - Restaurant ID
 * @param {Object} modifierData - Modifier data
 * @returns {Promise}
 */
export const createModifier = async (restaurantId, modifierData) => {
  try {
    const response = await api.post(`/api/menu/${restaurantId}/modifiers`, modifierData)
    return response.data
  } catch (error) {
    console.error('❌ Error creating modifier:', error)
    throw error
  }
}

/**
 * Update modifier
 * @param {string} modifierId - Modifier ID
 * @param {Object} modifierData - Modifier data
 * @returns {Promise}
 */
export const updateModifier = async (modifierId, modifierData) => {
  try {
    const response = await api.put(`/api/menu/modifiers/${modifierId}`, modifierData)
    return response.data
  } catch (error) {
    console.error('❌ Error updating modifier:', error)
    throw error
  }
}

/**
 * Delete modifier
 * @param {string} modifierId - Modifier ID
 * @returns {Promise}
 */
export const deleteModifier = async (modifierId) => {
  try {
    const response = await api.delete(`/api/menu/modifiers/${modifierId}`)
    return response.data
  } catch (error) {
    console.error('❌ Error deleting modifier:', error)
    throw error
  }
}

/**
 * Upload menu file for AI parsing
 * @param {string} restaurantId - Restaurant ID
 * @param {File} file - Menu file (PDF, image, CSV, text)
 * @returns {Promise}
 */
export const uploadMenuFile = async (restaurantId, file) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/api/menu/${restaurantId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  } catch (error) {
    console.error('❌ Error uploading menu file:', error)
    throw error
  }
}

/**
 * Get menu import history
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise}
 */
export const getMenuImports = async (restaurantId) => {
  try {
    const response = await api.get(`/api/menu/${restaurantId}/uploads`)
    return response.data
  } catch (error) {
    console.error('❌ Error fetching menu imports:', error)
    throw error
  }
}

/**
 * Create self-service order
 * @param {Object} orderData - Order data
 * @returns {Promise}
 */
export const createSelfServiceOrder = async (orderData) => {
  try {
    // Base URL already includes /api, so we add /api/orders/... to get /api/api/orders/...
    const response = await api.post('/api/orders/self-service', orderData)
    return response.data
  } catch (error) {
    console.error('❌ Error creating order:', error)
    throw error
  }
}

/**
 * Get list of all restaurants (public endpoint - no API key needed)
 * @returns {Promise}
 */
export const getRestaurants = async () => {
  try {
    // This is a public endpoint, so create a request without the API key
    const config = { headers: {} }
    // Delete the API key header if it exists
    if (api.defaults.headers.common['x-api-key']) {
      config.headers = { ...config.headers }
      delete config.headers['x-api-key']
    }
    const response = await axios.get(`${API_BASE_URL}/api/restaurants`, {
      ...config,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    })
    return response.data
  } catch (error) {
    console.error('❌ Error fetching restaurants:', error)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
      throw new Error(`Failed to load restaurants: ${error.response.status} ${error.response.data?.detail || error.response.data?.message || 'Unknown error'}`)
    } else if (error.request) {
      console.error('No response from server')
      throw new Error('Cannot connect to server. Please make sure the backend is running at ' + API_BASE_URL)
    } else {
      console.error('Request setup error:', error.message)
      throw new Error(`Failed to load restaurants: ${error.message}`)
    }
  }
}

/**
 * Get single restaurant by ID (super admin only - returns full details)
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise}
 */
export const getRestaurant = async (restaurantId) => {
  try {
    // Uses JWT token from interceptor
    const response = await api.get(`/api/restaurants/${restaurantId}`)
    return response.data
  } catch (error) {
    console.error('❌ Error fetching restaurant:', error)
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

/**
 * Update restaurant details (super admin only)
 * @param {string} restaurantId - Restaurant ID
 * @param {Object} restaurantData - Restaurant data to update (all fields optional)
 * @returns {Promise}
 */
export const updateRestaurant = async (restaurantId, restaurantData) => {
  try {
    // Uses JWT token from interceptor
    const response = await api.put(`/api/restaurants/${restaurantId}`, restaurantData)
    return response.data
  } catch (error) {
    console.error('❌ Error updating restaurant:', error)
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

/**
 * Delete restaurant and all related data (super admin only)
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise}
 */
export const deleteRestaurant = async (restaurantId) => {
  try {
    // Uses JWT token from interceptor
    const response = await api.delete(`/api/restaurants/${restaurantId}`)
    return response.data
  } catch (error) {
    console.error('❌ Error deleting restaurant:', error)
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

/**
 * Get onboarding API key (super admin only)
 * @returns {Promise}
 */
export const getOnboardingApiKey = async () => {
  try {
    const response = await api.get('/api/restaurants/onboarding-api-key')
    return response.data
  } catch (error) {
    console.error('❌ Error fetching onboarding API key:', error)
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

/**
 * Create new restaurant (requires super admin authentication via JWT)
 * @param {Object} restaurantData - Restaurant data (name, phone, printnode_api_key, printnode_printer_id, twilio_phone)
 * @returns {Promise}
 */
export const createRestaurant = async (restaurantData) => {
  try {
    // JWT token is automatically added by the request interceptor
    const response = await api.post('/api/restaurants', restaurantData)
    return response.data
  } catch (error) {
    console.error('❌ Error creating restaurant:', error)
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

// ============================================
// AUTHENTICATION API FUNCTIONS
// ============================================

/**
 * Login user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise}
 */
export const loginUser = async (username, password) => {
  try {
    // Note: Backend has root_path="/api", so actual endpoint is /api/auth/login
    // But with baseURL='http://localhost:8000', we need /api/api/auth/login 
    // OR change backend configuration. Testing with /api/auth/login first:
    const response = await api.post('/api/auth/login', { username, password })
    return response.data
  } catch (error) {
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

/**
 * Get current authenticated user
 * @param {string} token - JWT token
 * @returns {Promise}
 */
export const getCurrentUser = async (token) => {
  try {
    const response = await api.get('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return response.data
  } catch (error) {
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

/**
 * Logout user (placeholder - can extend with backend logout if needed)
 * @param {string} token - JWT token
 * @returns {Promise}
 */
export const logoutUser = async (token) => {
  // For now, logout is handled client-side
  // Can add server-side logout endpoint later if needed
  return Promise.resolve()
}

/**
 * Change password for current user
 * @param {string} token - JWT token
 * @param {string} oldPassword - Old password
 * @param {string} newPassword - New password
 * @returns {Promise}
 */
export const changePassword = async (token, oldPassword, newPassword) => {
  try {
    const response = await api.post('/api/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return response.data
  } catch (error) {
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

/**
 * Get all users (admin only)
 * @param {string} restaurantId - Optional restaurant ID filter
 * @returns {Promise}
 */
export const getUsers = async (restaurantId = null) => {
  try {
    const params = restaurantId ? { restaurant_id: restaurantId } : {}
    const response = await api.get('/api/auth/users', { params })
    return response.data
  } catch (error) {
    console.error('❌ Error fetching users:', error)
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

/**
 * Create new user (admin only)
 * @param {Object} userData - User data (username, password, role, email, full_name, restaurant_id)
 * @returns {Promise}
 */
export const createUser = async (userData) => {
  try {
    const response = await api.post('/api/auth/users', userData)
    return response.data
  } catch (error) {
    console.error('❌ Error creating user:', error)
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

/**
 * Update user password (admin only)
 * @param {string} userId - User ID
 * @param {string} newPassword - New password
 * @returns {Promise}
 */
export const updateUserPassword = async (userId, newPassword) => {
  try {
    const response = await api.put(`/api/auth/users/${userId}/password`, {
      new_password: newPassword
    })
    return response.data
  } catch (error) {
    console.error('❌ Error updating user password:', error)
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

/**
 * Deactivate user (admin only)
 * @param {string} userId - User ID
 * @returns {Promise}
 */
export const deactivateUser = async (userId) => {
  try {
    const response = await api.put(`/api/auth/users/${userId}/deactivate`)
    return response.data
  } catch (error) {
    console.error('❌ Error deactivating user:', error)
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

/**
 * Delete user (admin only)
 * @param {string} userId - User ID
 * @returns {Promise}
 */
export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/api/auth/users/${userId}`)
    return response.data
  } catch (error) {
    console.error('❌ Error deleting user:', error)
    if (error.response) {
      throw error
    } else if (error.request) {
      throw new Error('Cannot connect to server')
    } else {
      throw error
    }
  }
}

// Add request interceptor to include auth token in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default api

