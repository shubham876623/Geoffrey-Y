import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRestaurants, getPublicMenu } from '../lib/api'
import { FiCoffee, FiArrowRight, FiLoader, FiAlertCircle, FiHome, FiSearch, FiX } from 'react-icons/fi'

export default function RestaurantSelection() {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState([])
  const [filteredRestaurants, setFilteredRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadRestaurants()
  }, [])

  const loadRestaurants = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getRestaurants()
      const restaurantsList = response.restaurants || []
      setRestaurants(restaurantsList)
      setFilteredRestaurants(restaurantsList)
    } catch (err) {
      console.error('Error loading restaurants:', err)
      setError(err.message || 'Failed to load restaurants')
    } finally {
      setLoading(false)
    }
  }

  // Filter restaurants based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRestaurants(restaurants)
    } else {
      const term = searchTerm.toLowerCase().trim()
      const filtered = restaurants.filter(restaurant =>
        restaurant.name.toLowerCase().includes(term)
      )
      setFilteredRestaurants(filtered)
    }
  }, [searchTerm, restaurants])

  // Utility function to convert restaurant name to URL-friendly slug
  const nameToSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
  }

  // Prefetch menu when hovering over restaurant card
  const prefetchMenu = async (restaurantId) => {
    try {
      const cacheKey = `menu_${restaurantId}`
      const cached = localStorage.getItem(cacheKey)
      
      // Only prefetch if not cached or cache is old (> 5 minutes)
      if (!cached) {
        const response = await getPublicMenu(restaurantId)
        localStorage.setItem(cacheKey, JSON.stringify({
          menu: response.menu,
          timestamp: Date.now()
        }))
      } else {
        const { timestamp } = JSON.parse(cached)
        const cacheAge = Date.now() - timestamp
        const cacheValidTime = 5 * 60 * 1000 // 5 minutes
        if (cacheAge >= cacheValidTime) {
          // Cache expired, prefetch fresh data
          const response = await getPublicMenu(restaurantId)
          localStorage.setItem(cacheKey, JSON.stringify({
            menu: response.menu,
            timestamp: Date.now()
          }))
        }
      }
    } catch (error) {
      // Silent fail for prefetch
      console.error('Prefetch error:', error)
    }
  }

  const handleSelectRestaurant = (restaurant) => {
    const slug = nameToSlug(restaurant.name)
    // Prefetch menu data before navigation
    prefetchMenu(restaurant.id)
    navigate(`/menu/${slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative w-20 h-20 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-pink-400 rounded-full animate-spin" style={{ animationDuration: '1.2s' }}></div>
          </div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-orange-600 mb-2">
            Loading Restaurants
          </h2>
          <p className="text-gray-600 font-medium">Please wait while we fetch the best dining options...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-800 mb-2">Error Loading Restaurants</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadRestaurants}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (restaurants.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <FiHome className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-800 mb-2">No Restaurants Available</h2>
          <p className="text-gray-600">There are no restaurants available at this time.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Professional Background Image with Overlay */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`
          }}
        ></div>
        
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-pink-900/50 to-orange-900/60"></div>
        
        {/* Additional gradient overlays for depth */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-200/10 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-pink-200/10 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-orange-200/10 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '4s' }}></div>
        
        {/* Professional geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(255, 255, 255, 0.1) 100px, rgba(255, 255, 255, 0.1) 200px)`,
          }}></div>
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 100px, rgba(255, 255, 255, 0.1) 100px, rgba(255, 255, 255, 0.1) 200px)`,
          }}></div>
        </div>
        
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Professional Header */}
        <div className="text-center mb-10 sm:mb-12">
          {/* Logo/Icon with professional styling */}
          <div className="inline-flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 via-pink-400/30 to-orange-400/30 rounded-3xl blur-2xl animate-pulse"></div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-3xl shadow-2xl flex items-center justify-center ring-4 ring-white/50">
              <FiCoffee className="w-12 h-12 sm:w-14 sm:h-14 text-white drop-shadow-lg" />
            </div>
          </div>
          
          {/* Professional Typography with better contrast */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black text-white mb-3 sm:mb-4 tracking-tight drop-shadow-2xl">
            Select Restaurant
          </h1>
          <p className="text-lg sm:text-xl text-white/90 font-body font-medium mb-8 max-w-2xl mx-auto drop-shadow-lg">
            Discover exceptional dining experiences. Choose a restaurant to explore their menu.
          </p>
          
          {/* Professional Search Bar */}
          <div className="max-w-2xl mx-auto mb-10">
            <div className="relative">
              {/* Enhanced glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-200/40 via-pink-200/40 to-orange-200/40 rounded-2xl blur-2xl opacity-60"></div>
              
              <div className="relative">
                {/* Professional Search Icon */}
                <div className="absolute left-5 top-1/2 transform -translate-y-1/2 z-10">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-400/30 rounded-xl blur-lg"></div>
                    <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl shadow-lg border border-purple-300/50 ring-2 ring-white/20">
                      <FiSearch className="text-white w-5 h-5 drop-shadow-md" />
                    </div>
                  </div>
                </div>
                
                <input
                  type="text"
                  placeholder="Search by restaurant name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-16 pr-14 py-4 sm:py-5 bg-white/98 backdrop-blur-lg rounded-2xl border-2 border-purple-200/70 focus:outline-none focus:ring-4 focus:ring-purple-300/50 focus:border-purple-500 shadow-2xl hover:shadow-purple-200/50 transition-all text-base sm:text-lg font-semibold placeholder:text-gray-500 placeholder:font-normal"
                />
                
                {/* Professional Clear button */}
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-5 top-1/2 transform -translate-y-1/2 p-2.5 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 transition-all shadow-md hover:shadow-lg z-10 ring-1 ring-purple-200/50"
                    aria-label="Clear search"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Professional Search results count */}
            {searchTerm && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                <p className="text-sm text-white font-semibold px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                  {filteredRestaurants.length === 0 
                    ? 'No restaurants found' 
                    : `${filteredRestaurants.length} ${filteredRestaurants.length === 1 ? 'restaurant' : 'restaurants'} found`
                  }
                </p>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              </div>
            )}
          </div>
        </div>

        {/* Professional Restaurant Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredRestaurants.length === 0 && searchTerm ? (
            <div className="col-span-full">
              <div className="max-w-md mx-auto text-center py-16 px-6 bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-purple-100/50">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100 rounded-full mb-6 ring-4 ring-purple-50">
                  <FiSearch className="w-10 h-10 text-purple-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">No restaurants found</h3>
                <p className="text-gray-600 mb-6 font-medium">Try searching with a different term or browse all restaurants</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-8 py-3.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all shadow-lg"
                >
                  Clear Search
                </button>
              </div>
            </div>
          ) : (
            filteredRestaurants.map((restaurant, index) => (
              <button
                key={restaurant.id}
                onClick={() => handleSelectRestaurant(restaurant)}
                onMouseEnter={() => prefetchMenu(restaurant.id)}
                className="group relative bg-white/98 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl hover:shadow-purple-500/30 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden border-2 border-white/30 hover:border-white/50"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Professional gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-pink-50/80 to-orange-50/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Professional Icon with ring */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 via-pink-400/30 to-orange-400/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative w-18 h-18 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:shadow-2xl transition-all duration-500 ring-4 ring-white/50">
                      <FiHome className="w-9 h-9 sm:w-10 sm:h-10 text-white drop-shadow-lg" />
                    </div>
                  </div>

                  {/* Professional Restaurant Name */}
                  <h3 className="text-2xl sm:text-3xl font-heading font-black text-gray-900 mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:via-pink-600 group-hover:to-orange-600 transition-all duration-500 leading-tight">
                    {restaurant.name}
                  </h3>

                  {/* Professional CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 group-hover:border-purple-200 transition-colors duration-300">
                    <span className="text-sm font-bold text-gray-600 group-hover:text-purple-600 transition-colors duration-300 uppercase tracking-wide">
                      View Menu
                    </span>
                    <div className="flex items-center gap-2 text-purple-600 group-hover:text-purple-700 font-bold group-hover:translate-x-2 transition-transform duration-300">
                      <span className="text-sm">Explore</span>
                      <FiArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Professional shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                {/* Bottom accent */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-300/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
