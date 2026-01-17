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

export default api

