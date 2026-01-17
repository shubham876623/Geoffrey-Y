import { useState } from 'react'
import { FiClock, FiUser, FiCheckCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi'

/**
 * OrderCard Component
 * Displays a single order with all details
 * Supports both interactive (KDS) and read-only (Front Desk) modes
 */
const OrderCard = ({ 
  order, 
  onStatusUpdate, 
  isInteractive = true,
  showElapsedTime = true,
  isCompact = false
}) => {
  const [isUpdating, setIsUpdating] = useState(false)

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!order.created_at) return '00:00:00'
    
    const created = new Date(order.created_at)
    const now = new Date()
    const diff = Math.floor((now - created) / 1000) // seconds
    
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    })
  }

  // Normalize status to lowercase
  const normalizeStatus = (status) => {
    if (!status) return 'pending'
    return String(status).toLowerCase().trim()
  }

  // Get status color - Updated per client feedback:
  // Red: pending, Yellow: preparing, Green: ready, Blue: completed
  const getStatusColor = (status) => {
    const normalized = normalizeStatus(status)
    const colors = {
      pending: 'bg-red-500',
      preparing: 'bg-yellow-500',
      ready: 'bg-green-500',
      completed: 'bg-blue-500'
    }
    return colors[normalized] || 'bg-gray-500'
  }

  // Get status text color
  const getStatusTextColor = (status) => {
    const normalized = normalizeStatus(status)
    const colors = {
      pending: 'text-red-600',
      preparing: 'text-yellow-600',
      ready: 'text-green-600',
      completed: 'text-blue-600'
    }
    return colors[normalized] || 'text-gray-600'
  }

  // Get status border color
  const getStatusBorderColor = (status) => {
    const normalized = normalizeStatus(status)
    const colors = {
      pending: 'border-l-red-500',
      preparing: 'border-l-yellow-500',
      ready: 'border-l-green-500',
      completed: 'border-l-blue-500'
    }
    return colors[normalized] || 'border-l-gray-500'
  }

  // Handle status update
  const handleStatusClick = async (newStatus) => {
    if (!isInteractive || isUpdating || !onStatusUpdate) return
    
    setIsUpdating(true)
    try {
      await onStatusUpdate(order.id, newStatus)
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Get next status button configuration
  const getNextStatusButton = () => {
    if (!isInteractive) return null

    const currentStatus = normalizeStatus(order.status)
    
    // Status progression: pending → preparing → ready → completed
    const statusFlow = {
      pending: { 
        next: 'preparing', 
        label: 'Start Preparing', 
        color: 'bg-red-500 hover:bg-red-600',
        icon: '👨‍🍳'
      },
      preparing: { 
        next: 'ready', 
        label: 'Ready for Pickup', 
        color: 'bg-yellow-500 hover:bg-yellow-600',
        icon: '✅'
      },
      ready: { 
        next: 'completed', 
        label: 'Mark Completed', 
        color: 'bg-green-500 hover:bg-green-600',
        icon: '✓'
      }
    }

    return statusFlow[currentStatus] || null
  }

  return (
    <div className={`premium-card rounded-2xl border-l-4 ${getStatusBorderColor(order.status)} overflow-hidden transition-all duration-300 flex flex-col h-full group relative ${isCompact ? 'compact-card' : ''}`}>
      {/* Premium glow effect based on status */}
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${getStatusColor(order.status)} opacity-20 blur-xl rounded-2xl group-hover:opacity-30 transition-opacity`}></div>
      
      {/* Header with premium gradient background */}
      <div className={`relative ${getStatusColor(order.status)} text-white px-5 py-4 flex items-center justify-between flex-shrink-0 overflow-hidden`}>
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}></div>
        
        <div className="relative flex items-center gap-4 z-10">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
              <FiUser className="text-xl" />
            </div>
            <div className="absolute -inset-1 bg-white/20 rounded-xl blur-md"></div>
          </div>
          <div>
            <span className="font-extrabold text-xl block leading-tight text-premium drop-shadow-lg">
              {order.customer_name || 'Guest'}
            </span>
            <span className="text-xs opacity-95 font-semibold flex items-center gap-1.5 mt-0.5">
              <FiClock className="text-xs" />
              {formatTime(order.created_at)}
            </span>
          </div>
        </div>
        <div className="relative flex items-center gap-2 z-10">
          <span className="text-xs font-extrabold bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/40 shadow-lg">
            {order.order_number}
          </span>
        </div>
      </div>

      {/* Order Info with premium status badge */}
      <div className="px-5 py-3 bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 border-b border-gray-200/50 flex-shrink-0 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showElapsedTime && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-slate-100 to-slate-200 px-3 py-1.5 rounded-xl border border-slate-300/50 shadow-sm">
                <FiClock className="text-slate-600 text-sm" />
                <span className="font-mono font-extrabold text-sm text-slate-800">{getElapsedTime()}</span>
              </div>
            )}
          </div>
          <div className={`px-4 py-1.5 rounded-full font-extrabold text-xs ${getStatusTextColor(order.status)} bg-white shadow-lg border-2 backdrop-blur-sm relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>
            <span className="relative z-10">{normalizeStatus(order.status).toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Order Items - Premium Scrollable */}
      <div className="px-5 py-4 flex-1 overflow-y-auto">
        <div className="space-y-3">
          {order.items && order.items.map((item, index) => (
            <div key={index} className="premium-card rounded-xl p-4 border border-slate-200/80 hover:border-slate-300 transition-all relative group/item">
              <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/50 to-white rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="font-extrabold text-slate-900 text-base bg-gradient-to-br from-slate-200 to-slate-300 px-3 py-1 rounded-lg border border-slate-300/50 shadow-sm">
                        {item.quantity}x
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm text-premium">
                        {item.item_name}
                      </span>
                    </div>
                    
                    {/* Chinese translation */}
                    {item.item_name_chinese && (
                      <div className="text-slate-600 text-xs ml-14 mb-2 font-semibold italic">
                        {item.item_name_chinese}
                      </div>
                    )}
                    
                    {/* Size, pieces, variant - Premium badges */}
                    <div className="flex flex-wrap gap-2 ml-14 mt-1.5">
                      {item.size && (
                        <span className="text-xs bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 px-2.5 py-1 rounded-lg font-bold border border-blue-300/50 shadow-sm">
                          {item.size}
                        </span>
                      )}
                      {item.pieces && (
                        <span className="text-xs bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800 px-2.5 py-1 rounded-lg font-bold border border-purple-300/50 shadow-sm">
                          {item.pieces} pieces
                        </span>
                      )}
                      {item.variant && (
                        <span className="text-xs bg-gradient-to-br from-green-100 to-green-200 text-green-800 px-2.5 py-1 rounded-lg font-bold border border-green-300/50 shadow-sm">
                          {item.variant}
                        </span>
                      )}
                      {item.price && (
                        <span className="text-xs font-extrabold text-slate-800 bg-gradient-to-br from-slate-100 to-slate-200 px-2.5 py-1 rounded-lg border border-slate-300/50 shadow-sm">
                          ${parseFloat(item.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    {/* Special instructions */}
                    {item.special_instructions && (
                      <div className="ml-14 mt-2 text-xs text-orange-700 font-semibold bg-gradient-to-br from-orange-50 to-orange-100 px-3 py-1.5 rounded-lg border border-orange-300/50 shadow-sm">
                        <FiAlertCircle className="inline mr-1.5 text-sm" />
                        {item.special_instructions}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total Amount - Premium */}
        {order.total_amount && (
          <div className="mt-4 pt-4 border-t-2 border-slate-200/80">
            <div className="flex justify-between items-center bg-gradient-to-r from-slate-100 via-white to-slate-100 rounded-xl px-4 py-3 border border-slate-200/80 shadow-sm">
              <span className="font-bold text-slate-700 text-sm text-premium">Total:</span>
              <span className="font-extrabold text-2xl text-slate-900 text-premium bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent">
                ${parseFloat(order.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Special Instructions (Order Level) - Premium */}
        {order.special_instructions && (
          <div className="mt-4 pt-4 border-t border-slate-200/80">
            <div className="flex items-start gap-3 bg-gradient-to-br from-orange-50 via-orange-100/50 to-orange-50 border-2 border-orange-200/80 rounded-xl px-4 py-3 shadow-sm">
              <FiAlertCircle className="text-orange-500 mt-0.5 text-lg flex-shrink-0" />
              <div>
                <span className="font-extrabold text-orange-700 text-xs block mb-1.5 text-premium">Order Note:</span>
                <p className="text-sm text-orange-600 font-semibold">{order.special_instructions}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Button (KDS only) - Premium with advanced effects */}
      {isInteractive && (() => {
        const buttonConfig = getNextStatusButton()
        
        if (!buttonConfig) {
          // Order is completed or has unknown status
          const normalizedStatus = normalizeStatus(order.status)
          if (normalizedStatus === 'completed') {
            return (
              <div className="px-5 py-4 bg-gradient-to-r from-blue-50 via-blue-50 to-blue-50 border-t-2 border-blue-200 flex-shrink-0 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                <div className="text-center text-blue-700 font-extrabold text-sm py-1 flex items-center justify-center gap-2 relative z-10">
                  <span className="text-2xl">✓</span>
                  <span className="text-premium">Order Completed</span>
                </div>
              </div>
            )
          }
          return null
        }

        const buttonGradients = {
          pending: 'from-red-500 via-red-500 to-red-600 hover:from-red-600 hover:via-red-600 hover:to-red-700',
          preparing: 'from-yellow-500 via-yellow-500 to-yellow-600 hover:from-yellow-600 hover:via-yellow-600 hover:to-yellow-700',
          ready: 'from-green-500 via-green-500 to-green-600 hover:from-green-600 hover:via-green-600 hover:to-green-700'
        }

        return (
          <div className="px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-t-2 border-slate-200/80 flex-shrink-0 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>
            <button
              onClick={() => handleStatusClick(buttonConfig.next)}
              disabled={isUpdating || !onStatusUpdate}
              className={`relative w-full bg-gradient-to-r ${buttonGradients[normalizeStatus(order.status)] || 'from-gray-500 to-gray-600'} text-white font-extrabold py-3.5 px-5 rounded-xl shadow-xl hover:shadow-2xl text-sm transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 overflow-hidden group/btn`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
              {isUpdating ? (
                <>
                  <FiRefreshCw className="animate-spin text-lg relative z-10" />
                  <span className="relative z-10">Updating...</span>
                </>
              ) : (
                <>
                  <span className="text-xl relative z-10">{buttonConfig.icon}</span>
                  <span className="relative z-10 text-premium">{buttonConfig.label}</span>
                </>
              )}
            </button>
          </div>
        )
      })()}
    </div>
  )
}

export default OrderCard

