import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  getComprehensiveAnalytics,
  getAnalyticsOverview,
  getRevenueTrends,
  getPopularItems,
  getOrderTimeline
} from '../lib/api'
import {
  FiBarChart,
  FiDollarSign,
  FiShoppingBag,
  FiTrendingUp,
  FiClock,
  FiLogOut,
  FiRefreshCw,
  FiCalendar,
  FiArrowLeft
} from 'react-icons/fi'
import { ToastContainer } from '../components/Toast'

export default function Analytics() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [dateRange, setDateRange] = useState('30') // days
  const [toasts, setToasts] = useState([])

  const restaurantId = user?.restaurant_id

  useEffect(() => {
    if (!user || !restaurantId) {
      navigate('/restaurant/login')
      return
    }
    loadAnalytics()
  }, [user, restaurantId, dateRange])

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const days = parseInt(dateRange)
      const endDate = new Date().toISOString()
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      
      const data = await getComprehensiveAnalytics(restaurantId, startDate, endDate)
      setAnalytics(data)
    } catch (error) {
      console.error('Error loading analytics:', error)
      showToast('Failed to load analytics data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/restaurant/login')
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-violet-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading analytics...</div>
      </div>
    )
  }

  const overview = analytics?.overview || {}
  const trends = analytics?.revenue_trends || []
  const popularItems = analytics?.popular_items || []
  const timeline = analytics?.order_timeline || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-violet-950">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <header className="bg-indigo-900/50 backdrop-blur-md border-b border-purple-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/restaurant/dashboard')}
                className="p-2 text-indigo-200 hover:text-white hover:bg-indigo-800/50 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <FiBarChart className="w-6 h-6" />
                  Analytics Dashboard
                </h1>
                <p className="text-indigo-200 text-sm">Welcome, {user?.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 bg-indigo-800/50 border border-purple-700/50 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button
                onClick={loadAnalytics}
                className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition-colors"
                title="Refresh"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                <FiLogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-800/50 to-purple-800/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-sm mb-1">Total Orders</p>
                <p className="text-3xl font-black text-white">{overview.total_orders || 0}</p>
              </div>
              <FiShoppingBag className="w-12 h-12 text-purple-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-800/50 to-violet-800/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-sm mb-1">Total Revenue</p>
                <p className="text-3xl font-black text-white">{formatCurrency(overview.total_revenue || 0)}</p>
              </div>
              <FiDollarSign className="w-12 h-12 text-violet-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-800/50 to-pink-800/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-sm mb-1">Avg Order Value</p>
                <p className="text-3xl font-black text-white">{formatCurrency(overview.average_order_value || 0)}</p>
              </div>
              <FiTrendingUp className="w-12 h-12 text-pink-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-800/50 to-red-800/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-sm mb-1">Active Orders</p>
                <p className="text-3xl font-black text-white">{overview.active_orders || 0}</p>
              </div>
              <FiClock className="w-12 h-12 text-red-400" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trends Chart */}
          <div className="bg-indigo-900/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Revenue Trends</h2>
            {trends.length > 0 ? (
              <div className="space-y-2">
                {trends.slice(-7).map((trend, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-20 text-sm text-indigo-200">{formatDate(trend.date)}</div>
                    <div className="flex-1 bg-indigo-800/30 rounded-full h-8 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-violet-500 h-full rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${(trend.revenue / Math.max(...trends.map(t => t.revenue))) * 100}%`
                        }}
                      >
                        <span className="text-white text-xs font-semibold">
                          {formatCurrency(trend.revenue)}
                        </span>
                      </div>
                    </div>
                    <div className="w-16 text-sm text-indigo-200 text-right">
                      {trend.orders} orders
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-indigo-300 text-center py-8">No revenue data available</p>
            )}
          </div>

          {/* Order Status Distribution */}
          <div className="bg-indigo-900/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Orders by Status</h2>
            {overview.orders_by_status && Object.keys(overview.orders_by_status).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(overview.orders_by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-indigo-200 capitalize">{status}</div>
                    <div className="flex-1 bg-indigo-800/30 rounded-full h-6 relative overflow-hidden">
                      <div
                        className={`h-full rounded-full flex items-center justify-end pr-2 ${
                          status === 'completed' ? 'bg-green-500' :
                          status === 'ready' ? 'bg-blue-500' :
                          status === 'preparing' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{
                          width: `${(count / overview.total_orders) * 100}%`
                        }}
                      >
                        <span className="text-white text-xs font-semibold">{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-indigo-300 text-center py-8">No status data available</p>
            )}
          </div>
        </div>

        {/* Popular Items and Order Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Items */}
          <div className="bg-indigo-900/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Popular Items</h2>
            {popularItems.length > 0 ? (
              <div className="space-y-3">
                {popularItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-indigo-800/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold">{item.item_name}</p>
                      <p className="text-indigo-300 text-sm">
                        {item.total_quantity} sold • {item.order_count} orders
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{formatCurrency(item.total_revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-indigo-300 text-center py-8">No popular items data available</p>
            )}
          </div>

          {/* Order Timeline (Hourly) */}
          <div className="bg-indigo-900/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Orders by Hour (Last 7 Days)</h2>
            {timeline.length > 0 ? (
              <div className="space-y-2">
                {timeline.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-16 text-sm text-indigo-200">
                      {item.hour}:00
                    </div>
                    <div className="flex-1 bg-indigo-800/30 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-violet-500 to-pink-500 h-full rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${(item.count / Math.max(...timeline.map(t => t.count), 1)) * 100}%`
                        }}
                      >
                        {item.count > 0 && (
                          <span className="text-white text-xs font-semibold">{item.count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-indigo-300 text-center py-8">No timeline data available</p>
            )}
          </div>
        </div>

        {/* Orders by Source - Enhanced Comparison */}
        {overview.orders_by_source && Object.keys(overview.orders_by_source).length > 0 && (
          <div className="mt-8 bg-indigo-900/50 backdrop-blur-md rounded-xl p-6 border border-purple-700/50">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FiShoppingBag className="w-5 h-5" />
              Order Source Comparison
            </h2>
            
            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {Object.entries(overview.orders_by_source).map(([source, count]) => {
                const percentage = ((count / overview.total_orders) * 100).toFixed(1)
                const isVoice = source === 'voice'
                
                return (
                  <div
                    key={source}
                    className={`p-6 rounded-xl border-2 ${
                      isVoice 
                        ? 'bg-gradient-to-br from-blue-900/50 to-indigo-900/50 border-blue-600/50' 
                        : 'bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-green-600/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className={`text-lg font-bold ${isVoice ? 'text-blue-200' : 'text-green-200'}`}>
                          {isVoice ? 'Voice Orders' : 'Self-Service Orders'}
                        </p>
                        <p className="text-indigo-300 text-sm mt-1">
                          {isVoice ? 'Phone orders via AI' : 'Web/App orders'}
                        </p>
                      </div>
                      <div className={`text-4xl font-black ${isVoice ? 'text-blue-400' : 'text-green-400'}`}>
                        {count}
                      </div>
                    </div>
                    
                    {/* Percentage Bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-indigo-200 text-sm">Percentage</span>
                        <span className={`text-sm font-bold ${isVoice ? 'text-blue-300' : 'text-green-300'}`}>
                          {percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-indigo-800/30 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full rounded-full flex items-center justify-end pr-2 ${
                            isVoice 
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                              : 'bg-gradient-to-r from-green-500 to-emerald-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        >
                          {parseFloat(percentage) > 10 && (
                            <span className="text-white text-xs font-semibold">{percentage}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Revenue from this source (if available) */}
                    <div className="mt-3 pt-3 border-t border-indigo-700/50">
                      <p className="text-indigo-300 text-xs">
                        Average: {formatCurrency((overview.total_revenue || 0) / (count || 1))} per order
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Summary Statistics */}
            <div className="bg-indigo-800/30 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-indigo-300 text-sm">Total Orders</p>
                  <p className="text-white text-2xl font-bold">{overview.total_orders || 0}</p>
                </div>
                <div>
                  <p className="text-indigo-300 text-sm">Voice Orders</p>
                  <p className="text-blue-400 text-2xl font-bold">
                    {overview.orders_by_source?.voice || 0}
                  </p>
                </div>
                <div>
                  <p className="text-indigo-300 text-sm">Self-Service Orders</p>
                  <p className="text-green-400 text-2xl font-bold">
                    {overview.orders_by_source?.self_service || 0}
                  </p>
                </div>
              </div>
              
              {/* Visual Comparison Bar */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-indigo-200 text-sm font-semibold">Source Distribution:</span>
                </div>
                <div className="flex h-8 rounded-lg overflow-hidden">
                  {overview.orders_by_source?.voice > 0 && (
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold"
                      style={{
                        width: `${((overview.orders_by_source.voice / overview.total_orders) * 100)}%`
                      }}
                    >
                      {((overview.orders_by_source.voice / overview.total_orders) * 100).toFixed(0)}% Voice
                    </div>
                  )}
                  {overview.orders_by_source?.self_service > 0 && (
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-semibold"
                      style={{
                        width: `${((overview.orders_by_source.self_service / overview.total_orders) * 100)}%`
                      }}
                    >
                      {((overview.orders_by_source.self_service / overview.total_orders) * 100).toFixed(0)}% Self-Service
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
