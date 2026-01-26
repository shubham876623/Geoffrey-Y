import { useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { FiCheckCircle, FiHome, FiShoppingBag, FiClock, FiDollarSign, FiStar } from 'react-icons/fi'

// Show browser notification
const showNotification = (title, options = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'order-confirmation',
        requireInteraction: true,
        ...options
      })
    } catch (error) {
      console.log('Failed to show notification:', error)
    }
  }
}

export default function OrderConfirmation() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const order = location.state?.order

  useEffect(() => {
    if (order) {
      // Show notification when order is confirmed
      const total = order.total_amount || order.total || 0
      const orderId = order.id || order.order_number || id
      showNotification('Order Confirmed! 🎉', {
        body: `Order #${String(orderId).slice(0, 8)} has been placed successfully. Total: $${total.toFixed(2)}`,
        icon: '✅',
        tag: `order-confirm-${orderId}`
      })
    }
  }, [order, id])

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 via-rose-50 to-orange-50 flex items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="relative text-center animate-fade-in">
          <p className="text-red-600 text-xl sm:text-2xl font-bold mb-6">Order not found</p>
          <button
            onClick={() => navigate('/menu')}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-2xl hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 transition-all shadow-xl hover:shadow-2xl font-bold text-lg transform hover:scale-105"
          >
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  const total = order.total_amount || order.total || 0
  const orderId = order.id || order.order_number || id

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 via-rose-50 to-orange-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-orange-200/30 to-rose-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative max-w-lg w-full bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-10 text-center animate-scale-in border border-purple-100/50">
        {/* Success Icon with Animation */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full blur-2xl animate-pulse opacity-50"></div>
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
            <FiCheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
          </div>
          {/* Sparkle Effect */}
          <FiStar className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse fill-yellow-400" />
          <FiStar className="absolute -bottom-2 -left-2 w-6 h-6 text-pink-400 animate-pulse fill-pink-400" style={{ animationDelay: '0.5s' }} />
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-orange-600 mb-3">
          Order Confirmed!
        </h1>
        <p className="text-gray-600 text-lg mb-8 font-medium">Thank you for your order. We'll prepare it right away!</p>
        
        {/* Order Details */}
        <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-2xl p-6 sm:p-8 mb-8 text-left space-y-4 border-2 border-purple-200/50">
          <div className="flex items-center justify-between pb-4 border-b-2 border-purple-200/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FiShoppingBag className="w-5 h-5 text-white" />
              </div>
              <span className="text-gray-600 font-semibold">Order #</span>
            </div>
            <span className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              {String(orderId).slice(0, 8)}
            </span>
          </div>
          
          <div className="flex items-center justify-between pb-4 border-b-2 border-purple-200/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <FiClock className="w-5 h-5 text-white" />
              </div>
              <span className="text-gray-600 font-semibold">Status</span>
            </div>
            <span className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm sm:text-base shadow-lg capitalize">
              {order.status || 'pending'}
            </span>
          </div>

          {order.estimated_ready_time && (
            <div className="flex items-center justify-between pb-4 border-b-2 border-purple-200/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <FiClock className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-600 font-semibold">Estimated Ready</span>
              </div>
              <span className="font-bold text-gray-900">
                {order.estimated_ready_time}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <FiDollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="text-gray-600 font-semibold">Total</span>
            </div>
            <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-emerald-600 to-green-700">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>

        <p className="text-gray-600 mb-6 text-sm sm:text-base">
          You will receive an SMS confirmation shortly. We'll notify you when your order is ready!
        </p>

        <button
          onClick={() => navigate('/menu')}
          className="w-full py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-2xl hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 transition-all shadow-xl hover:shadow-2xl font-bold text-lg transform hover:scale-105 flex items-center justify-center gap-3"
        >
          <FiHome className="w-6 h-6" />
          <span>Back to Menu</span>
        </button>

        {/* Notification Info */}
        {typeof Notification !== 'undefined' && Notification.permission === 'granted' && (
          <p className="text-xs text-gray-500 mt-6 flex items-center justify-center gap-2">
            <FiCheckCircle className="w-4 h-4 text-green-500" />
            You'll receive notifications about your order status
          </p>
        )}
      </div>
    </div>
  )
}
