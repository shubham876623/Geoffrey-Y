import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import OrderCard from '../components/OrderCard'
import ErrorDisplay from '../components/ErrorDisplay'
import { useAuth } from '../context/AuthContext'
import { FiRefreshCw, FiClock, FiUsers, FiZap, FiLogOut } from 'react-icons/fi'

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

  // Status filter options with gradient colors
  const statusFilters = [
    { value: 'all', label: 'All Orders', count: orders.length, color: 'from-blue-500 via-cyan-500 to-blue-500' },
    { value: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length, color: 'from-red-500 to-rose-500' },
    { value: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'preparing').length, color: 'from-amber-500 to-orange-500' },
    { value: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'ready').length, color: 'from-green-500 to-emerald-500' },
    { value: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length, color: 'from-purple-500 to-indigo-500' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-cyan-950 via-indigo-950 to-purple-950 text-white flex flex-col overflow-hidden relative">
      {/* Animated Background Decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-gradient-to-br from-purple-600/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan-600/10 to-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      {/* Premium Header */}
      <header className="relative bg-gradient-to-r from-white/10 via-blue-500/10 to-white/10 backdrop-blur-md border-b border-blue-300/20 px-6 sm:px-8 py-5 sm:py-6 flex-shrink-0 z-10 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-3 h-16 sm:h-20 bg-gradient-to-b from-blue-400 via-cyan-400 to-indigo-400 rounded-full shadow-lg shadow-blue-500/50"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-blue-300 to-cyan-400 rounded-full blur-md opacity-50 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3 flex-wrap">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-300 to-indigo-300 drop-shadow-2xl">
                  Front Desk Display
                </span>
                <span className="text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-1.5 rounded-full border-2 border-blue-400/50 shadow-lg animate-pulse">
                  MONITOR
                </span>
              </h1>
              <p className="text-blue-200 text-sm sm:text-base mt-2 flex items-center gap-2 font-semibold flex-wrap">
                <FiUsers className="w-4 h-4" />
                <span className="text-white font-bold">{orders.length}</span> total orders
                <span className="relative flex h-2.5 w-2.5 ml-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                Last updated: <span className="text-white font-bold">{lastUpdate.toLocaleTimeString()}</span>
                {autoRefresh && <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-400/30">Auto-refresh ON</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl transform hover:scale-105 ${
                autoRefresh 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-2 border-green-400/50' 
                  : 'bg-white/10 text-blue-200 border-2 border-blue-300/30 backdrop-blur-sm'
              }`}
            >
              <FiZap className={`inline mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
              Auto
            </button>
            <button
              onClick={fetchOrders}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:via-cyan-600 hover:to-indigo-600 transition-all shadow-xl hover:shadow-2xl font-bold text-sm transform hover:scale-105 flex items-center gap-2"
            >
              <FiRefreshCw className={`text-base ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-xl hover:shadow-2xl font-bold text-sm transform hover:scale-105 flex items-center gap-2"
            >
              <FiLogOut className="text-base" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Premium Status Filters */}
      <div className="relative bg-gradient-to-r from-white/5 via-blue-500/5 to-white/5 backdrop-blur-md border-b border-blue-300/20 px-6 sm:px-8 py-4 flex-shrink-0 z-10 overflow-x-auto">
        <div className="flex items-center gap-3 sm:gap-4 pb-2 min-w-max">
          {statusFilters.map((filter, index) => (
            <button
              key={filter.value}
              onClick={() => setSelectedStatus(filter.value)}
              className={`px-5 sm:px-8 py-3 sm:py-4 rounded-2xl font-black text-sm sm:text-base transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 relative overflow-hidden group flex-shrink-0 ${
                selectedStatus === filter.value
                  ? `bg-gradient-to-r ${filter.color} text-white shadow-2xl scale-105 ring-4 ring-white/20`
                  : 'bg-white/10 backdrop-blur-sm text-blue-200 hover:bg-white/20 border-2 border-blue-300/30'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {selectedStatus === filter.value && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent animate-shimmer"></div>
              )}
              <span className="relative z-10 flex items-center gap-3 whitespace-nowrap">
                {filter.label}
                {filter.count > 0 && (
                  <span className={`px-3 py-1 rounded-full text-xs font-black relative z-10 ${
                    selectedStatus === filter.value
                      ? 'bg-white/30 text-white backdrop-blur-sm border border-white/50'
                      : 'bg-blue-600/50 text-blue-200 border border-blue-400/50'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center animate-fade-in">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 border-4 border-blue-400 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-indigo-400 rounded-full animate-spin mx-auto" style={{ animationDuration: '1.2s' }}></div>
              </div>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-300 to-indigo-300 text-xl sm:text-2xl font-black mb-2">
                Loading orders...
              </p>
              <p className="text-blue-300 text-sm">Please wait</p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center animate-fade-in">
              <div className="relative inline-block mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-600/30 via-cyan-600/30 to-indigo-600/30 rounded-full blur-2xl animate-pulse absolute inset-0"></div>
                <div className="relative w-32 h-32 bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-500 rounded-full flex items-center justify-center shadow-2xl">
                  <FiClock className="w-16 h-16 text-white" />
                </div>
              </div>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-300 to-indigo-300 text-2xl sm:text-3xl font-black mb-3">
                No orders found
              </p>
              <p className="text-blue-300 text-base sm:text-lg">
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
