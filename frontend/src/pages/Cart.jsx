import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { createSelfServiceOrder, getRestaurants } from '../lib/api'
import { FiTrash2, FiPlus, FiMinus, FiArrowLeft, FiShoppingCart, FiUser, FiPhone, FiCheckCircle } from 'react-icons/fi'

// Utility function to convert restaurant name to URL-friendly slug
const nameToSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
}

// Request browser notification permission
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch (error) {
      console.log('Notification permission request failed:', error)
    }
  }
}

// Show browser notification
const showNotification = (title, options = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'order-notification',
        requireInteraction: false,
        ...options
      })
    } catch (error) {
      console.log('Failed to show notification:', error)
    }
  }
}

export default function Cart() {
  const navigate = useNavigate()
  const { restaurantName, restaurantId, selectedItem } = useParams()
  const { cart, updateQuantity, removeFromCart, getSubtotal, getTax, getTotal, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [currentRestaurantId, setCurrentRestaurantId] = useState(null)
  const [currentRestaurantName, setCurrentRestaurantName] = useState(null)
  const [resolvingRestaurant, setResolvingRestaurant] = useState(true)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: ''
  })

  // Resolve restaurant ID from name or ID
  useEffect(() => {
    const resolveRestaurant = async () => {
      try {
        const response = await getRestaurants()
        const restaurantsList = response.restaurants || []
        
        let resolvedId = null
        let resolvedName = null

        // If restaurantName is provided (new URL format)
        if (restaurantName) {
          const restaurant = restaurantsList.find(r => 
            nameToSlug(r.name) === restaurantName || 
            r.id === restaurantName // Fallback: if it's actually an ID
          )
          if (restaurant) {
            resolvedId = restaurant.id
            resolvedName = restaurant.name
          } else {
            // Try fuzzy matching
            const matched = restaurantsList.find(r => {
              const slug = nameToSlug(r.name)
              return slug === restaurantName || slug.includes(restaurantName) || restaurantName.includes(slug)
            })
            if (matched) {
              resolvedId = matched.id
              resolvedName = matched.name
            } else {
              console.error(`Restaurant not found: ${restaurantName}`)
              navigate('/restaurants')
              return
            }
          }
        } 
        // Legacy support: if restaurantId is provided (old URL format)
        else if (restaurantId) {
          const restaurant = restaurantsList.find(r => r.id === restaurantId)
          if (restaurant) {
            resolvedId = restaurant.id
            resolvedName = restaurant.name
            // Redirect to new URL format
            const slug = nameToSlug(restaurant.name)
            const itemPath = selectedItem ? `/${selectedItem}` : ''
            navigate(`/cart/${slug}${itemPath}`, { replace: true })
            return
          } else {
            resolvedId = restaurantId
          }
        }
        // Fallback to env variable
        else {
          const fallbackId = import.meta.env.VITE_RESTAURANT_ID || '39dd6e40-d130-48c9-af31-cfdb26f781db'
          const restaurant = restaurantsList.find(r => r.id === fallbackId)
          if (restaurant) {
            resolvedId = restaurant.id
            resolvedName = restaurant.name
            const slug = nameToSlug(restaurant.name)
            navigate(`/cart/${slug}`, { replace: true })
            return
          } else {
            resolvedId = fallbackId
          }
        }

        if (!resolvedId) {
          console.error('Could not resolve restaurant ID')
          navigate('/restaurants')
          return
        }

        setCurrentRestaurantId(resolvedId)
        setCurrentRestaurantName(resolvedName)
      } catch (error) {
        console.error('Error resolving restaurant:', error)
        navigate('/restaurants')
      } finally {
        setResolvingRestaurant(false)
      }
    }

    resolveRestaurant()
  }, [restaurantName, restaurantId, selectedItem, navigate])

  useEffect(() => {
    // Request notification permission on component mount
    requestNotificationPermission()
  }, [])

  const handleCheckout = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      showNotification('Missing Information', {
        body: 'Please enter your name and phone number',
        icon: '⚠️'
      })
      return
    }

    if (cart.length === 0) {
      showNotification('Empty Cart', {
        body: 'Your cart is empty',
        icon: '🛒'
      })
      return
    }

    try {
      setLoading(true)
      const orderData = {
        restaurant_id: currentRestaurantId,
        items: cart.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          modifier_selections: item.modifier_selections,
          special_instructions: item.special_instructions
        })),
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone
      }

      const response = await createSelfServiceOrder(orderData)
      
      if (response.success) {
        // Show success notification
        showNotification('Order Placed Successfully! 🎉', {
          body: `Order #${response.order.id} has been placed. Total: $${getTotal().toFixed(2)}`,
          icon: '✅',
          tag: `order-${response.order.id}`,
          requireInteraction: false
        })

        clearCart()
        navigate(`/order-confirmation/${response.order.id}`, {
          state: { order: response.order }
        })
      }
    } catch (error) {
      console.error('Checkout error:', error)
      showNotification('Order Failed', {
        body: 'Failed to place order. Please try again.',
        icon: '❌'
      })
    } finally {
      setLoading(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 via-rose-50 to-orange-50 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-orange-200/30 to-rose-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative text-center animate-fade-in">
          <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 rounded-full flex items-center justify-center shadow-2xl">
            <FiShoppingCart className="w-16 h-16 text-white" />
          </div>
          <p className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 text-2xl font-black mb-6">
            Your cart is empty
          </p>
          <button
            onClick={() => {
              if (currentRestaurantName) {
                const slug = nameToSlug(currentRestaurantName)
                navigate(`/menu/${slug}`)
              } else {
                navigate(`/menu/${currentRestaurantId}`)
              }
            }}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-2xl hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 transition-all shadow-xl hover:shadow-2xl font-bold text-lg transform hover:scale-105"
          >
            Browse Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 via-rose-50 to-orange-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-orange-200/30 to-rose-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Premium Header */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8 animate-slide-up">
          <button
            onClick={() => {
              if (currentRestaurantName) {
                const slug = nameToSlug(currentRestaurantName)
                navigate(`/menu/${slug}`)
              } else {
                navigate(`/menu/${currentRestaurantId}`)
              }
            }}
            className="p-3 bg-white/90 backdrop-blur-sm rounded-2xl hover:bg-white shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
          >
            <FiArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-orange-600">
              Your Cart
            </h1>
            <p className="text-sm text-gray-600 mt-1">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Premium Cart Items */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {cart.map((item, index) => (
              <div 
                key={item.id} 
                className="bg-white/90 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all animate-fade-in border border-purple-100/50 hover:border-purple-300 transform hover:-translate-y-1"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:via-pink-600 group-hover:to-orange-600 transition-all">
                      {item.name}
                    </h3>
                    
                    {Object.keys(item.modifier_selections || {}).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {Object.entries(item.modifier_selections).map(([key, value]) => (
                          <div 
                            key={key}
                            className="px-3 py-1 bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 rounded-full text-xs sm:text-sm font-semibold text-gray-700 border border-purple-200/50"
                          >
                            <span className="font-bold text-purple-600">{key}:</span> {Array.isArray(value) ? value.join(', ') : value}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {item.special_instructions && (
                      <div className="mb-3 p-3 bg-amber-50/80 rounded-xl border-l-4 border-amber-400">
                        <p className="text-sm text-gray-700 italic">📝 {item.special_instructions}</p>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <p className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        ${item.price?.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <div className="flex items-center gap-2 bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 rounded-xl p-1 border-2 border-purple-200/50">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg transform hover:scale-110 flex items-center justify-center font-bold"
                      >
                        <FiMinus className="w-5 h-5" />
                      </button>
                      <span className="px-4 py-2 text-lg font-bold text-gray-900 min-w-[3rem] text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg transform hover:scale-110 flex items-center justify-center font-bold"
                      >
                        <FiPlus className="w-5 h-5" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-12 h-12 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-110 flex items-center justify-center"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Premium Checkout Summary - Sticky */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-2xl sticky top-6 border border-purple-100/50 animate-scale-in">
              <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-orange-600 mb-6 flex items-center gap-2">
                <FiShoppingCart className="w-7 h-7 text-purple-500" />
                Order Summary
              </h2>
              
              {/* Customer Info */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <FiUser className="w-4 h-4 text-purple-500" />
                    Name
                  </label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="w-full px-5 py-3 bg-white/80 border-2 border-purple-200/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-300/50 focus:border-purple-400 transition-all text-gray-900 placeholder:text-gray-400 font-medium"
                    placeholder="Your name"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <FiPhone className="w-4 h-4 text-purple-500" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="w-full px-5 py-3 bg-white/80 border-2 border-purple-200/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-300/50 focus:border-purple-400 transition-all text-gray-900 placeholder:text-gray-400 font-medium"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="border-t-2 border-purple-200/50 pt-6 space-y-3 mb-6">
                <div className="flex justify-between text-gray-700 font-semibold">
                  <span>Subtotal</span>
                  <span className="text-lg">${getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700 font-semibold">
                  <span>Tax (7.25%)</span>
                  <span className="text-lg">${getTax().toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t-2 border-purple-200/50">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900">Total</span>
                  <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600">
                    ${getTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading || !customerInfo.name || !customerInfo.phone}
                className="w-full py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-2xl hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 transition-all shadow-xl hover:shadow-2xl font-bold text-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="w-6 h-6" />
                    <span>Place Order</span>
                  </>
                )}
              </button>

              {/* Notification Permission Hint */}
              {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                <p className="text-xs text-gray-500 mt-4 text-center">
                  💡 Enable notifications to get order updates
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
