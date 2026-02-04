import { useState } from 'react'
import { FiClock, FiUser, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiChevronDown, FiChevronUp, FiX, FiPhone } from 'react-icons/fi'
import { kdsUiTranslations } from '../lib/kdsUiTranslations'

/**
 * OrderCard Component
 * Displays a single order with all details
 * Supports both interactive (KDS) and read-only (Front Desk) modes
 */
const OrderCard = ({ 
  order, 
  onStatusUpdate, 
  onCancel,
  isInteractive = true,
  showElapsedTime = true,
  isCompact = false,
  language = 'en' // 'en' for English, 'zh' for Chinese
}) => {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showAllItems, setShowAllItems] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const MAX_VISIBLE_ITEMS = 3 // Show first 3 items, then "show more"
  const t = kdsUiTranslations[language] || kdsUiTranslations.en

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
      completed: 'bg-blue-500',
      cancelled: 'bg-gray-500'
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
      completed: 'text-blue-600',
      cancelled: 'text-gray-600'
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
      completed: 'border-l-blue-500',
      cancelled: 'border-l-gray-500'
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

  // Handle cancel order
  const handleCancelClick = () => setShowCancelModal(true)
  const handleCancelConfirm = async () => {
    if (!onCancel) return
    setIsCancelling(true)
    try {
      await onCancel(order.id, cancellationReason || undefined)
      setShowCancelModal(false)
      setCancellationReason('')
    } catch (error) {
      console.error('Failed to cancel order:', error)
    } finally {
      setIsCancelling(false)
    }
  }
  const handleCancelModalClose = () => {
    if (!isCancelling) {
      setShowCancelModal(false)
      setCancellationReason('')
    }
  }

  // Get next status button configuration
  const getNextStatusButton = () => {
    if (!isInteractive) return null

    const currentStatus = normalizeStatus(order.status)
    
    // Status progression: pending → preparing → ready → completed (labels from t in render)
    const statusFlow = {
      pending: { 
        next: 'preparing', 
        labelKey: 'startPreparing', 
        color: 'bg-red-500 hover:bg-red-600',
        icon: '👨‍🍳'
      },
      preparing: { 
        next: 'ready', 
        labelKey: 'readyForPickup', 
        color: 'bg-yellow-500 hover:bg-yellow-600',
        icon: '✅'
      },
      ready: { 
        next: 'completed', 
        labelKey: 'markCompleted', 
        color: 'bg-green-500 hover:bg-green-600',
        icon: '✓'
      }
    }

    return statusFlow[currentStatus] || null
  }

  return (
    <div className={`premium-card rounded-xl border-l-4 ${getStatusBorderColor(order.status)} overflow-hidden transition-all duration-300 flex flex-col h-full max-h-[600px] sm:max-h-[700px] group relative bg-slate-800 border-2 border-slate-700 shadow-2xl hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] transform hover:-translate-y-0.5 ${isCompact ? 'compact-card max-h-[500px]' : ''}`}>
      {/* Professional status glow effect */}
      <div className={`absolute -inset-0.5 ${getStatusColor(order.status)} opacity-20 blur-sm rounded-xl group-hover:opacity-30 transition-opacity`}></div>
      
      {/* Professional Header with Status Color */}
      <div className={`relative ${getStatusColor(order.status)} text-white px-4 sm:px-5 py-3 sm:py-4 flex items-start gap-3 sm:gap-4 flex-shrink-0 overflow-hidden border-b-2 border-black/20`}>
        {/* Subtle pattern overlay for texture */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
          backgroundSize: '20px 20px'
        }}></div>
        
        <div className="relative flex items-start gap-3 sm:gap-4 z-10 w-full">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-lg">
              <FiUser className="text-lg sm:text-xl" />
            </div>
          </div>
          <div className="flex-1 min-w-0 w-full">
            <div className="font-black text-base sm:text-lg md:text-xl leading-tight text-white drop-shadow-md break-words hyphens-auto">
              {order.customer_name || 'Guest'}
            </div>
            {order.customer_phone && (
              <div className="text-xs sm:text-sm opacity-90 font-semibold flex items-center gap-2 mt-1">
                <FiPhone className="text-xs sm:text-sm flex-shrink-0" />
                <span className="truncate">{order.customer_phone}</span>
              </div>
            )}
            <div className="text-xs sm:text-sm opacity-90 font-semibold flex items-center gap-2 mt-1">
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
                <span className="text-xs font-black text-blue-800">{order.items.length} {order.items.length === 1 ? t.item : t.items}</span>
              </div>
            )}
          </div>
          <div className={`px-3 sm:px-4 py-1.5 rounded-xl font-black text-xs ${getStatusTextColor(order.status)} bg-white shadow-lg border-2 ${getStatusBorderColor(order.status).replace('border-l-', 'border-')} backdrop-blur-sm relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-60"></div>
            <span className="relative z-10">{t[normalizeStatus(order.status)] || normalizeStatus(order.status).toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Professional Order Items Display */}
      <div className="px-4 sm:px-5 py-3 sm:py-4 flex-1 overflow-hidden min-h-0 flex flex-col bg-slate-800">
        <div className="space-y-2 sm:space-y-2.5 flex-1 overflow-y-auto min-h-0">
          {order.items && order.items.slice(0, showAllItems ? order.items.length : MAX_VISIBLE_ITEMS).map((item, index) => (
            <div key={index} className="rounded-lg p-2.5 sm:p-3 border border-slate-700 hover:border-slate-600 transition-all relative group/item bg-slate-700/50 hover:bg-slate-700 shadow-sm">
              <div className="relative z-10">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1.5 flex-wrap">
                      <span className="font-black text-white text-xs sm:text-sm bg-amber-500 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded border border-amber-400 shadow-sm flex-shrink-0">
                        {item.quantity}x
                      </span>
                      <div className="flex-1 min-w-0">
                        {/* Menu items kept the same (always show original name) */}
                        <div className="font-bold text-white text-sm sm:text-base break-words leading-tight">
                          {item.item_name}
                        </div>
                        {language === 'en' && item.item_name_chinese && (
                          <div className="text-red-400 text-xs sm:text-sm font-semibold mt-0.5 break-words leading-tight">
                            {item.item_name_chinese}
                          </div>
                        )}
                      </div>
                      {item.price && (
                        <span className="text-xs font-bold text-amber-300 bg-slate-600 px-2 py-0.5 rounded border border-slate-500 shadow-sm ml-auto flex-shrink-0">
                          ${parseFloat(item.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    {/* Size, pieces, variant - Professional badges */}
                    {(item.size || item.pieces || item.variant) && (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 ml-10 sm:ml-12 mt-1.5">
                        {item.size && (
                          <span className="text-xs bg-slate-600 text-slate-200 px-2 py-0.5 rounded border border-slate-500 font-semibold">
                            {item.size}
                          </span>
                        )}
                        {item.pieces && (
                          <span className="text-xs bg-slate-600 text-slate-200 px-2 py-0.5 rounded border border-slate-500 font-semibold">
                            {item.pieces} pcs
                          </span>
                        )}
                        {item.variant && (
                          <span className="text-xs bg-slate-600 text-slate-200 px-2 py-0.5 rounded border border-slate-500 font-semibold">
                            {item.variant}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Special instructions - kept same as menu items */}
                    {item.special_instructions && (
                      <div className="ml-10 sm:ml-12 mt-2 text-xs text-amber-300 font-semibold bg-slate-600/50 px-2.5 py-1 rounded border border-amber-500/30 shadow-sm">
                        <FiAlertCircle className="inline mr-1.5 text-xs text-amber-400" />
                        <div className="text-amber-300">{item.special_instructions}</div>
                        {language === 'en' && item.special_instructions_chinese && (
                          <div className="text-amber-200 font-semibold mt-1">{item.special_instructions_chinese}</div>
                        )}
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
            className="mt-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-slate-500 shadow-md hover:shadow-lg transition-all font-semibold text-xs sm:text-sm text-slate-200 flex items-center justify-center gap-2 group/btn flex-shrink-0"
          >
            <span>{showAllItems ? t.showLess : (typeof t.showMoreItems === 'function' ? t.showMoreItems(order.items.length - MAX_VISIBLE_ITEMS) : `Show ${order.items.length - MAX_VISIBLE_ITEMS} More Items`)}</span>
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
            <div className="px-3 py-1.5 bg-slate-700 rounded-lg border border-slate-600">
              <span className="text-xs font-semibold text-slate-300">
                {typeof t.moreItems === 'function' ? t.moreItems(order.items.length - MAX_VISIBLE_ITEMS) : `+${order.items.length - MAX_VISIBLE_ITEMS} more items`}
              </span>
            </div>
          </div>
        )}

        {/* Total Amount - Professional */}
        {order.total_amount && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700 flex-shrink-0">
            <div className="flex justify-between items-center bg-slate-700 rounded-lg px-4 sm:px-5 py-2.5 sm:py-3 border border-slate-600 shadow-lg">
              <span className="font-bold text-slate-300 text-sm sm:text-base">{t.total}</span>
              <span className="font-black text-xl sm:text-2xl text-amber-400">
                ${parseFloat(order.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Special Instructions (Order Level) - Professional */}
        {order.special_instructions && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700 flex-shrink-0">
            <div className="flex items-start gap-2 sm:gap-3 bg-slate-700/50 border border-amber-500/30 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg">
              <FiAlertCircle className="text-amber-400 mt-0.5 text-base sm:text-lg flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-amber-300 text-xs sm:text-sm block mb-1">{t.note}</span>
                <p className="text-xs sm:text-sm text-amber-200 font-semibold break-words leading-relaxed">{order.special_instructions}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Button: KDS (status + cancel) or Front Desk (cancel only) */}
      {(isInteractive || onCancel) && (() => {
        const normalizedStatus = normalizeStatus(order.status)
        if (normalizedStatus === 'completed') {
          return (
            <div className="px-4 sm:px-5 py-3 sm:py-4 bg-slate-700 border-t-2 border-slate-600 flex-shrink-0 relative">
              <div className="text-center text-blue-400 font-bold text-sm sm:text-base py-1.5 flex items-center justify-center gap-2 sm:gap-3 relative z-10">
                <FiCheckCircle className="text-lg sm:text-xl" />
                <span>{t.orderCompleted}</span>
              </div>
            </div>
          )
        }
        if (normalizedStatus === 'cancelled') {
          return (
            <div className="px-4 sm:px-5 py-3 sm:py-4 bg-slate-700 border-t-2 border-slate-600 flex-shrink-0 relative">
              <div className="text-center text-slate-400 font-bold text-sm sm:text-base py-1.5 flex items-center justify-center gap-2 sm:gap-3 relative z-10">
                <FiX className="text-lg sm:text-xl" />
                <span>{t.orderCancelled}</span>
              </div>
            </div>
          )
        }
        // Active order (pending, preparing, ready): show status button if KDS, and Cancel if onCancel provided
        const buttonConfig = isInteractive ? getNextStatusButton() : null
        const buttonColors = {
          pending: 'bg-red-600 hover:bg-red-700 border-red-500',
          preparing: 'bg-amber-600 hover:bg-amber-700 border-amber-500',
          ready: 'bg-green-600 hover:bg-green-700 border-green-500'
        }
        if (buttonConfig) {
          return (
            <div className="px-4 sm:px-5 py-3 sm:py-4 bg-slate-800 border-t-2 border-slate-700 flex-shrink-0 relative space-y-2">
              <button
                onClick={() => handleStatusClick(buttonConfig.next)}
                disabled={isUpdating || !onStatusUpdate}
                className={`relative w-full ${buttonColors[normalizeStatus(order.status)] || 'bg-slate-600 hover:bg-slate-700 border-slate-500'} text-white font-bold py-3 sm:py-4 px-4 sm:px-5 rounded-lg border-2 shadow-xl hover:shadow-2xl text-xs sm:text-sm transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3`}
              >
                {isUpdating ? (
                  <>
                    <FiRefreshCw className="animate-spin text-base sm:text-lg" />
                    <span className="font-semibold text-xs sm:text-sm">{t.updating}</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg sm:text-xl">{buttonConfig.icon}</span>
                    <span className="font-bold text-xs sm:text-sm">{t[buttonConfig.labelKey]}</span>
                  </>
                )}
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={handleCancelClick}
                  disabled={isCancelling}
                  className="relative w-full bg-gray-600 hover:bg-gray-700 border-2 border-gray-500 text-white font-bold py-2 sm:py-2.5 px-4 rounded-lg shadow-lg hover:shadow-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                >
                  <FiX className="text-sm" />
                  <span>{t.cancelOrder}</span>
                </button>
              )}
            </div>
          )
        }
        // Front Desk (or any view with onCancel but no status buttons): show only Cancel button
        if (onCancel) {
          return (
            <div className="px-4 sm:px-5 py-3 sm:py-4 bg-slate-800 border-t-2 border-slate-700 flex-shrink-0 relative">
              <button
                type="button"
                onClick={handleCancelClick}
                disabled={isCancelling}
                className="relative w-full bg-gray-600 hover:bg-gray-700 border-2 border-gray-500 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg shadow-lg hover:shadow-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
              >
                <FiX className="text-sm" />
                <span>{t.cancelOrder}</span>
              </button>
            </div>
          )
        }
        return null
      })()}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={handleCancelModalClose}>
          <div className="bg-slate-800 border-2 border-slate-600 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">{t.cancelOrderTitle}</h3>
            <p className="text-slate-300 text-sm mb-4">{t.cancelOrderDescription}</p>
            <input
              type="text"
              value={cancellationReason}
              onChange={e => setCancellationReason(e.target.value)}
              placeholder={t.reasonOptional}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-600 bg-slate-700 text-white placeholder-slate-500 mb-4 focus:border-red-500 focus:outline-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelModalClose}
                disabled={isCancelling}
                className="px-4 py-2 rounded-lg border-2 border-slate-600 text-slate-300 hover:bg-slate-700 font-semibold disabled:opacity-50"
              >
                {t.back}
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={isCancelling}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 border-2 border-red-500 text-white font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {isCancelling ? <FiRefreshCw className="animate-spin" /> : <FiX />}
                {isCancelling ? t.cancelling : t.confirmCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderCard

