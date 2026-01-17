import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import OrderCard from '../components/OrderCard'
import ErrorDisplay from '../components/ErrorDisplay'
import { FiRefreshCw, FiClock } from 'react-icons/fi'

const FrontDesk = () => {
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
      // Set empty array on error so UI can still render
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
          fetchOrders() // Refetch on any change
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Status filter options
  const statusFilters = [
    { value: 'all', label: 'All Orders', count: orders.length },
    { value: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
    { value: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'preparing').length },
    { value: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'ready').length },
    { value: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length }
  ]

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col overflow-hidden animated-bg relative">
      {/* Animated background overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none"></div>
      
      {/* Header - Premium Design */}
      <header className="glass-effect border-b border-white/10 px-8 py-4 flex-shrink-0 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-2 h-14 bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 rounded-full shadow-lg shadow-blue-500/50"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-blue-300 to-blue-500 rounded-full blur-sm opacity-50"></div>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3 text-premium">
                <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-blue-600 bg-clip-text text-transparent drop-shadow-lg">
                  Front Desk Display
                </span>
                <span className="text-xs font-normal bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full border border-blue-500/30">
                  MONITOR
                </span>
              </h1>
              <p className="text-slate-300 text-sm mt-1.5 flex items-center gap-2 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Last updated: <span className="text-white font-semibold">{lastUpdate.toLocaleTimeString()}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchOrders}
              className="btn-premium flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-bold relative z-10"
            >
              <FiRefreshCw className={`text-base ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Status Filters - Premium Design */}
      <div className="glass-effect border-b border-white/10 px-8 py-4 flex-shrink-0 relative z-10">
        <div className="flex items-center gap-3 flex-wrap">
          {statusFilters.map((filter, index) => (
            <button
              key={filter.value}
              onClick={() => setSelectedStatus(filter.value)}
              className={`px-5 py-2.5 rounded-xl font-bold transition-all duration-300 text-sm flex items-center gap-2.5 transform hover:scale-105 active:scale-95 relative overflow-hidden ${
                selectedStatus === filter.value
                  ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/50 border border-blue-400/30'
                  : 'glass-effect text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {selectedStatus === filter.value && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <span className="relative z-10">{filter.label}</span>
              {filter.count > 0 && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold relative z-10 ${
                  selectedStatus === filter.value
                    ? 'bg-white/25 text-white backdrop-blur-sm border border-white/30'
                    : 'bg-slate-700/50 text-slate-200 border border-slate-600/50'
                }`}>
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid - Premium Scrollable */}
      <main className="flex-1 overflow-auto p-8 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center animate-slide-in">
              <div className="relative inline-block">
                <FiRefreshCw className="animate-spin text-6xl text-blue-400 mx-auto mb-6" />
                <div className="absolute inset-0 bg-blue-400/30 blur-2xl rounded-full animate-pulse"></div>
              </div>
              <p className="text-slate-300 text-xl font-semibold mt-6 text-premium">Loading orders...</p>
              <div className="mt-4 w-48 h-1 bg-slate-700 rounded-full overflow-hidden mx-auto">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-shimmer"></div>
              </div>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center animate-slide-in">
              <div className="relative inline-block mb-6">
                <FiClock className="text-8xl text-slate-600 mx-auto animate-float" />
                <div className="absolute inset-0 bg-slate-600/30 blur-3xl rounded-full"></div>
              </div>
              <p className="text-slate-200 text-3xl font-bold mb-3 text-premium">No orders found</p>
              <p className="text-slate-400 text-base">
                {selectedStatus === 'all' 
                  ? 'No orders at the moment'
                  : `No ${selectedStatus} orders at the moment`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 auto-rows-max">
            {filteredOrders.map((order, index) => (
              <div
                key={order.id}
                className="animate-slide-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <OrderCard
                  order={order}
                  isInteractive={false}
                  showElapsedTime={true}
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

