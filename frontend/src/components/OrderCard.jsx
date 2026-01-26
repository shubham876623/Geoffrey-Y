import { useState } from 'react'
import { FiClock, FiUser, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi'

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
  const [showAllItems, setShowAllItems] = useState(false)
  const MAX_VISIBLE_ITEMS = 3 // Show first 3 items, then "show more"

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
    <div className={`premium-card rounded-3xl border-l-4 ${getStatusBorderColor(order.status)} overflow-hidden transition-all duration-300 flex flex-col h-full max-h-[600px] sm:max-h-[700px] group relative bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl transform hover:-translate-y-1 ${isCompact ? 'compact-card max-h-[500px]' : ''}`}>
      {/* Premium glow effect based on status */}
      <div className={`absolute -inset-1 bg-gradient-to-r ${getStatusColor(order.status)} opacity-30 blur-2xl rounded-3xl group-hover:opacity-40 transition-opacity`}></div>
      
      {/* Header with premium gradient background - Beautiful Customer Name Focus */}
      <div className={`relative ${getStatusColor(order.status)} text-white px-5 sm:px-6 py-4 sm:py-5 flex items-start gap-3 sm:gap-4 flex-shrink-0 overflow-hidden`}>
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}></div>
        
        <div className="relative flex items-start gap-3 sm:gap-4 z-10 w-full">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/30 backdrop-blur-md flex items-center justify-center border-2 border-white/40 shadow-xl">
              <FiUser className="text-xl sm:text-2xl" />
            </div>
            <div className="absolute -inset-1 bg-white/20 rounded-2xl blur-md"></div>
          </div>
          <div className="flex-1 min-w-0 w-full">
            <div className="font-black text-lg sm:text-xl md:text-2xl leading-tight text-white drop-shadow-lg break-words hyphens-auto">
              {order.customer_name || 'Guest'}
            </div>
            <div className="text-xs sm:text-sm opacity-90 font-semibold flex items-center gap-2 mt-2">
              <FiClock className="text-xs sm:text-sm flex-shrink-0" />
              <span className="truncate">{formatTime(order.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Info with premium status badge - Compact */}
      <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-slate-50 via-purple-50/30 to-slate-50 border-b-2 border-gray-200/50 flex-shrink-0 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-60"></div>
        <div className="relative flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {showElapsedTime && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2 border-purple-200/50 shadow-md">
                <FiClock className="text-purple-600 text-sm sm:text-base" />
                <span className="font-mono font-black text-xs sm:text-sm text-purple-900">{getElapsedTime()}</span>
              </div>
            )}
            {order.items && order.items.length > 0 && (
              <div className="px-2.5 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg border border-blue-300/50 shadow-sm">
                <span className="text-xs font-black text-blue-800">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
              </div>
            )}
          </div>
          <div className={`px-3 sm:px-4 py-1.5 rounded-xl font-black text-xs ${getStatusTextColor(order.status)} bg-white shadow-lg border-2 ${getStatusBorderColor(order.status).replace('border-l-', 'border-')} backdrop-blur-sm relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-60"></div>
            <span className="relative z-10">{normalizeStatus(order.status).toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Order Items - Premium Compact Display */}
      <div className="px-5 sm:px-6 py-4 sm:py-5 flex-1 overflow-hidden min-h-0 flex flex-col">
        <div className="space-y-2.5 sm:space-y-3 flex-1 overflow-y-auto min-h-0">
          {order.items && order.items.slice(0, showAllItems ? order.items.length : MAX_VISIBLE_ITEMS).map((item, index) => (
            <div key={index} className="premium-card rounded-xl p-3 sm:p-4 border-2 border-slate-200/80 hover:border-purple-300/50 transition-all relative group/item bg-gradient-to-br from-white via-slate-50/30 to-white shadow-md hover:shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-pink-50/30 to-orange-50/30 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1.5 flex-wrap">
                      <span className="font-black text-slate-900 text-sm sm:text-base bg-gradient-to-br from-purple-200 via-pink-200 to-orange-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2 border-purple-300/50 shadow-md flex-shrink-0">
                        {item.quantity}x
                      </span>
                      <span className="font-black text-slate-900 text-sm sm:text-base text-premium break-words leading-tight">
                        {item.item_name}
                      </span>
                      {item.price && (
                        <span className="text-xs sm:text-sm font-black text-slate-700 bg-gradient-to-br from-amber-100 to-orange-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-amber-300/50 shadow-sm ml-auto flex-shrink-0">
                          ${parseFloat(item.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    {/* Chinese translation */}
                    {item.item_name_chinese && (
                      <div className="text-slate-600 text-xs ml-12 sm:ml-14 mb-1.5 font-semibold italic">
                        {item.item_name_chinese}
                      </div>
                    )}
                    
                    {/* Size, pieces, variant - Compact Premium badges */}
                    {(item.size || item.pieces || item.variant) && (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 ml-12 sm:ml-14 mt-1.5">
                        {item.size && (
                          <span className="text-xs bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 px-2 py-0.5 rounded-lg font-bold border border-blue-300/50 shadow-sm">
                            {item.size}
                          </span>
                        )}
                        {item.pieces && (
                          <span className="text-xs bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800 px-2 py-0.5 rounded-lg font-bold border border-purple-300/50 shadow-sm">
                            {item.pieces} pcs
                          </span>
                        )}
                        {item.variant && (
                          <span className="text-xs bg-gradient-to-br from-green-100 to-green-200 text-green-800 px-2 py-0.5 rounded-lg font-bold border border-green-300/50 shadow-sm">
                            {item.variant}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Special instructions - Compact */}
                    {item.special_instructions && (
                      <div className="ml-12 sm:ml-14 mt-2 text-xs text-orange-800 font-bold bg-gradient-to-br from-orange-50 to-orange-100 px-2.5 py-1 rounded-lg border border-orange-300/50 shadow-sm">
                        <FiAlertCircle className="inline mr-1.5 text-xs" />
                        {item.special_instructions}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show More/Less Toggle for long lists */}
        {order.items && order.items.length > MAX_VISIBLE_ITEMS && (
          <button
            onClick={() => setShowAllItems(!showAllItems)}
            className="mt-3 px-4 py-2 bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 hover:from-purple-200 hover:via-pink-200 hover:to-orange-200 rounded-xl border-2 border-purple-300/50 shadow-md hover:shadow-lg transition-all font-bold text-xs sm:text-sm text-purple-700 flex items-center justify-center gap-2 group/btn flex-shrink-0"
          >
            <span>{showAllItems ? 'Show Less' : `Show ${order.items.length - MAX_VISIBLE_ITEMS} More Items`}</span>
            {showAllItems ? (
              <FiChevronUp className="w-4 h-4 group-hover/btn:-translate-y-0.5 transition-transform" />
            ) : (
              <FiChevronDown className="w-4 h-4 group-hover/btn:translate-y-0.5 transition-transform" />
            )}
          </button>
        )}

        {/* Items Count Badge */}
        {order.items && order.items.length > MAX_VISIBLE_ITEMS && !showAllItems && (
          <div className="mt-3 flex items-center justify-center">
            <div className="px-3 py-1.5 bg-gradient-to-r from-purple-200/50 via-pink-200/50 to-orange-200/50 rounded-lg border border-purple-300/30">
              <span className="text-xs font-bold text-slate-700">
                +{order.items.length - MAX_VISIBLE_ITEMS} more items
              </span>
            </div>
          </div>
        )}

        {/* Total Amount - Premium */}
        {order.total_amount && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-slate-200/80 flex-shrink-0">
            <div className="flex justify-between items-center bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 border-2 border-purple-200/50 shadow-lg">
              <span className="font-black text-slate-800 text-sm sm:text-base text-premium">Total:</span>
              <span className="font-black text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-orange-600">
                ${parseFloat(order.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Special Instructions (Order Level) - Compact Premium */}
        {order.special_instructions && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-slate-200/80 flex-shrink-0">
            <div className="flex items-start gap-2 sm:gap-3 bg-gradient-to-br from-orange-100 via-orange-50 to-orange-100 border-2 border-orange-300/80 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg">
              <FiAlertCircle className="text-orange-600 mt-0.5 text-base sm:text-lg flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-black text-orange-800 text-xs sm:text-sm block mb-1 text-premium">Note:</span>
                <p className="text-xs sm:text-sm text-orange-700 font-bold break-words leading-relaxed">{order.special_instructions}</p>
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
              <div className="px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border-t-2 border-blue-300 flex-shrink-0 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                <div className="text-center text-blue-700 font-black text-sm sm:text-base py-1.5 flex items-center justify-center gap-2 sm:gap-3 relative z-10">
                  <FiCheckCircle className="text-xl sm:text-2xl" />
                  <span className="text-premium">Order Completed</span>
                </div>
              </div>
            )
          }
          return null
        }

        const buttonGradients = {
          pending: 'from-red-500 via-rose-500 to-red-600 hover:from-red-600 hover:via-rose-600 hover:to-red-700',
          preparing: 'from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700',
          ready: 'from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700'
        }

        return (
          <div className="px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-t-2 border-slate-200/80 flex-shrink-0 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-60"></div>
            <button
              onClick={() => handleStatusClick(buttonConfig.next)}
              disabled={isUpdating || !onStatusUpdate}
              className={`relative w-full bg-gradient-to-r ${buttonGradients[normalizeStatus(order.status)] || 'from-gray-500 to-gray-600'} text-white font-black py-3 sm:py-4 px-4 sm:px-5 rounded-xl shadow-xl hover:shadow-2xl text-xs sm:text-sm transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 overflow-hidden group/btn`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
              {isUpdating ? (
                <>
                  <FiRefreshCw className="animate-spin text-lg sm:text-xl relative z-10" />
                  <span className="relative z-10 font-bold text-xs sm:text-sm">Updating...</span>
                </>
              ) : (
                <>
                  <span className="text-xl sm:text-2xl relative z-10">{buttonConfig.icon}</span>
                  <span className="relative z-10 text-premium font-bold text-xs sm:text-sm">{buttonConfig.label}</span>
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

