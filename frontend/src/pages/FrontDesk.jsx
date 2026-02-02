import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import OrderCard from '../components/OrderCard'
import ErrorDisplay from '../components/ErrorDisplay'
import { useAuth } from '../context/AuthContext'
import { cancelOrder } from '../lib/api'
import { FiRefreshCw, FiClock, FiUsers, FiZap, FiLogOut, FiMonitor } from 'react-icons/fi'

const FrontDesk = () => {
  const { logout } = useAuth()
  
  const handleLogout = async () => {
    await logout()
  }
  
  // Check if Supabase is configured
  if (!isSupabaseConfigured) {
    return (
      <ErrorDisplay
        title="Configuration Error"
        message="Supabase is not configured. Please set up your environment variables."
        details={`Missing environment variables:
VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? '✓ Set' : '✗ Missing'}
VITE_SUPABASE_KEY: ${import.meta.env.VITE_SUPABASE_KEY ? '✓ Set' : '✗ Missing'}`}
      />
    )
  }
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch orders from Supabase
  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Transform data to include items array
      const transformedOrders = (data || []).map(order => ({
        ...order,
        items: order.order_items || []
      }))

      setOrders(transformedOrders)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching orders:', error)
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }

  // Filter orders by status
  useEffect(() => {
    if (selectedStatus === 'all') {
      setFilteredOrders(orders)
    } else {
      setFilteredOrders(orders.filter(o => o.status === selectedStatus))
    }
  }, [orders, selectedStatus])

  // Initial fetch
  useEffect(() => {
    fetchOrders()
  }, [])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      fetchOrders()
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes-frontdesk')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order change detected:', payload)
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Handle order cancellation
  const handleCancelOrder = async (orderId, reason) => {
    try {
      await cancelOrder(orderId, reason)
      await fetchOrders()
    } catch (error) {
      console.error('Failed to cancel order:', error)
      throw error
    }
  }

  // Status filter options
  const statusFilters = [
    { value: 'all', label: 'All Orders', count: orders.length, color: 'from-blue-500 via-cyan-500 to-blue-500' },
    { value: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length, color: 'from-red-500 to-rose-500' },
    { value: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'preparing').length, color: 'from-amber-500 to-orange-500' },
    { value: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'ready').length, color: 'from-green-500 to-emerald-500' },
    { value: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length, color: 'from-blue-500 to-cyan-500' },
    { value: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length, color: 'from-gray-500 to-slate-500' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col overflow-hidden relative">
      {/* Professional Front Desk Background Image */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1578366941741-9e517759c620?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
            opacity: 0.4
          }}
        ></div>
        {/* Dark overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-800/80 to-slate-900/85"></div>
      </div>
      
      {/* Professional KDS Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-5 z-0">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255,255,255,.05) 25%, rgba(255,255,255,.05) 26%, transparent 27%, transparent 74%, rgba(255,255,255,.05) 75%, rgba(255,255,255,.05) 76%, transparent 77%, transparent)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>
      
      {/* Subtle Status Color Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 via-green-500 to-blue-500 opacity-20"></div>
      </div>
      
      {/* Professional Header */}
      <header className="relative bg-slate-800/95 backdrop-blur-md border-b-2 border-slate-700/50 px-6 sm:px-8 py-4 sm:py-5 flex-shrink-0 z-10 shadow-2xl overflow-hidden">
        {/* Header Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1578366941741-9e517759c620?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)'
          }}
        ></div>
        {/* Header Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-800/90 via-slate-800/85 to-slate-800/90"></div>
        
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Front Desk Icon Badge */}
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center border-2 border-slate-600 shadow-xl">
                <FiMonitor className="text-2xl sm:text-3xl text-blue-400" />
              </div>
              <div className="absolute -inset-1 bg-blue-400/20 rounded-xl blur-md"></div>
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3 flex-wrap">
                <span className="text-white">
                  FRONT DESK DISPLAY
                </span>
                <span className="text-xs sm:text-sm font-bold bg-blue-500 text-white px-3 py-1 rounded-md border border-blue-400 shadow-lg flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  MONITOR
                </span>
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1.5 flex items-center gap-2 font-medium flex-wrap">
                <FiUsers className="text-slate-500" />
                <span><span className="text-white font-semibold">{orders.length}</span> total orders</span>
                <FiClock className="text-slate-500" />
                <span>Last updated: <span className="text-white font-semibold">{lastUpdate.toLocaleTimeString()}</span></span>
                {autoRefresh && (
                  <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/30 flex items-center gap-1">
                    <FiZap className="text-xs" />
                    Auto-refresh
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-1.5 border-2 ${
                autoRefresh 
                  ? 'bg-green-600 text-white border-green-500 hover:bg-green-700' 
                  : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
              }`}
            >
              <FiZap className={`text-sm sm:text-base ${autoRefresh ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Auto</span>
            </button>
            <button
              onClick={fetchOrders}
              className="px-4 sm:px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg border-2 border-slate-600 hover:border-slate-500 transition-all shadow-lg hover:shadow-xl font-semibold text-xs sm:text-sm flex items-center gap-2"
            >
              <FiRefreshCw className={`text-sm sm:text-base ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-4 sm:px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg border-2 border-red-500 hover:border-red-400 transition-all shadow-lg hover:shadow-xl font-semibold text-xs sm:text-sm flex items-center gap-2"
            >
              <FiLogOut className="text-sm sm:text-base" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
        </div>
      </header>

      {/* Professional Status Filters */}
      <div className="relative bg-slate-800/95 backdrop-blur-md border-b-2 border-slate-700/50 px-6 sm:px-8 py-3 flex-shrink-0 z-10 overflow-x-auto shadow-lg overflow-hidden">
        {/* Filters Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1578366941741-9e517759c620?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)'
          }}
        ></div>
        {/* Filters Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-800/90 via-slate-800/85 to-slate-800/90"></div>
        
        <div className="relative z-10 flex items-center gap-2 sm:gap-3 min-w-max">
          {statusFilters.map((filter) => {
            // Professional color mapping for Front Desk
            const statusColors = {
              'all': selectedStatus === filter.value ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-650',
              'pending': selectedStatus === filter.value ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-red-600/20',
              'preparing': selectedStatus === filter.value ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-amber-600/20',
              'ready': selectedStatus === filter.value ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-green-600/20',
              'completed': selectedStatus === filter.value ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-blue-600/20',
              'cancelled': selectedStatus === filter.value ? 'bg-gray-600 border-gray-500 text-white shadow-lg shadow-gray-500/30' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-gray-600/20'
            }
            const buttonClass = statusColors[filter.value] || statusColors['all']
            
            return (
              <button
                key={filter.value}
                onClick={() => setSelectedStatus(filter.value)}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 border-2 flex-shrink-0 flex items-center gap-2 ${buttonClass}`}
              >
                <span className="whitespace-nowrap">{filter.label}</span>
                {filter.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-md text-xs font-black ${
                    selectedStatus === filter.value
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-slate-600 text-slate-200 border border-slate-500'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Orders Grid */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center animate-fade-in">
              <div className="relative inline-block mb-6">
                <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
              </div>
              <p className="text-slate-300 text-lg sm:text-xl font-bold mb-2">
                Loading orders...
              </p>
              <p className="text-slate-500 text-sm">Please wait</p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center animate-fade-in">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 bg-slate-800 rounded-xl flex items-center justify-center border-2 border-slate-700 shadow-xl">
                  <FiClock className="w-10 h-10 text-slate-500" />
                </div>
              </div>
              <p className="text-slate-300 text-xl sm:text-2xl font-bold mb-2">
                No orders found
              </p>
              <p className="text-slate-500 text-sm sm:text-base">
                {selectedStatus === 'all' 
                  ? 'No orders at the moment'
                  : `No ${selectedStatus} orders at the moment`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 auto-rows-max`}>
            {filteredOrders.map((order, index) => (
              <div
                key={order.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <OrderCard
                  order={order}
                  isInteractive={false}
                  showElapsedTime={true}
                  isCompact={false}
                  onCancel={handleCancelOrder}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default FrontDesk
