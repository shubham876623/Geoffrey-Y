import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { getPublicMenu, getRestaurants } from '../lib/api'
import { FiShoppingCart, FiSearch, FiChevronRight, FiChevronLeft, FiStar, FiCoffee, FiZap, FiHeart, FiArrowUp, FiArrowDown, FiChevronDown, FiArrowLeft } from 'react-icons/fi'
import ItemModal from '../components/ItemModal'

// Color palette for items (cycling) - Chinese colors: Red and Green (lighter shades)
const ITEM_COLORS = [
  'from-red-300 via-red-400 to-red-500',
  'from-green-300 via-green-400 to-green-500',
  'from-red-400 via-red-500 to-red-600',
  'from-green-400 via-green-500 to-green-600',
  'from-red-300 via-red-400 to-red-500',
  'from-green-300 via-green-400 to-green-500',
]

// Utility function to convert restaurant name to URL-friendly slug
const nameToSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
}

// Utility function to convert slug back to name (for comparison)
const slugToName = (slug) => {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function Menu() {
  const navigate = useNavigate()
  const { restaurantName, category: categorySlug, page: pageParam } = useParams()
  const { restaurantId } = useParams() // Legacy support
  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('none') // 'none', 'price-asc', 'price-desc'
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [restaurants, setRestaurants] = useState([])
  const [restaurantDropdownOpen, setRestaurantDropdownOpen] = useState(false)
  const [categoryScrollPosition, setCategoryScrollPosition] = useState(0)
  const categoryCarouselRef = useRef(null)
  const [currentRestaurantId, setCurrentRestaurantId] = useState(null)
  const [currentRestaurantName, setCurrentRestaurantName] = useState(null)
  const itemsPerPage = 9
  const { getTotalItems } = useCart()

  // Load restaurants list
  const loadRestaurants = async () => {
    try {
      const response = await getRestaurants()
      const restaurantsList = response.restaurants || []
      setRestaurants(restaurantsList)
      return restaurantsList
    } catch (error) {
      console.error('Error loading restaurants:', error)
      return []
    }
  }

  // Resolve restaurant ID from name or ID
  useEffect(() => {
    const resolveRestaurant = async () => {
      const restaurantsList = await loadRestaurants()
      
      if (restaurantsList.length === 0) {
        console.error('No restaurants found')
        return
      }
      
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
          // Try to find by slug match (fuzzy matching)
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
          const category = categorySlug || ''
          const page = pageParam ? `/${pageParam}` : ''
          navigate(`/menu/${slug}${category ? `/${category}` : ''}${page}`, { replace: true })
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
          navigate(`/menu/${slug}`, { replace: true })
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
    }

    resolveRestaurant()
  }, [restaurantName, restaurantId, navigate, categorySlug, pageParam])

  // Prefetch menu when restaurant is resolved (before navigation)
  useEffect(() => {
    if (currentRestaurantId) {
      // Prefetch menu data immediately
      const prefetchMenu = async () => {
        const cachedMenu = getCachedMenu(currentRestaurantId)
        if (!cachedMenu) {
          // Start fetching in background
          try {
            const response = await getPublicMenu(currentRestaurantId)
            setCachedMenu(currentRestaurantId, response.menu)
          } catch (error) {
            // Silent fail for prefetch
            console.error('Prefetch error:', error)
          }
        }
      }
      prefetchMenu()
    }
  }, [currentRestaurantId])

  // Load menu when restaurant ID is resolved
  useEffect(() => {
    if (currentRestaurantId) {
      loadMenu()
    }
  }, [currentRestaurantId])

  // Parse page from URL
  useEffect(() => {
    if (pageParam) {
      const pageNum = parseInt(pageParam.replace('page=', ''), 10)
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum)
      }
    } else {
      setCurrentPage(1)
    }
  }, [pageParam])

  // Parse category from URL
  useEffect(() => {
    if (menu && categorySlug) {
      const category = menu.categories.find(c => 
        nameToSlug(c.name) === categorySlug || 
        c.id === categorySlug // Fallback: if it's actually an ID
      )
      if (category) {
        setSelectedCategory(category.id)
      } else {
        setSelectedCategory(null)
      }
    } else if (menu && !categorySlug) {
      // No category in URL, show all items
      setSelectedCategory(null)
    }
  }, [categorySlug, menu])

  // Update URL when category changes
  const updateCategoryInUrl = (categoryId) => {
    if (!currentRestaurantName) return
    
    const slug = nameToSlug(currentRestaurantName)
    const category = menu?.categories.find(c => c.id === categoryId)
    const categoryPath = category ? `/${nameToSlug(category.name)}` : ''
    const pagePath = currentPage > 1 ? `/page=${currentPage}` : ''
    
    navigate(`/menu/${slug}${categoryPath}${pagePath}`, { replace: true })
  }

  // Update URL when page changes
  const updatePageInUrl = (page) => {
    if (!currentRestaurantName) return
    
    const slug = nameToSlug(currentRestaurantName)
    const category = selectedCategory ? menu?.categories.find(c => c.id === selectedCategory) : null
    const categoryPath = category ? `/${nameToSlug(category.name)}` : ''
    const pagePath = page > 1 ? `/page=${page}` : ''
    
    navigate(`/menu/${slug}${categoryPath}${pagePath}`, { replace: true })
  }

  const handleRestaurantChange = (newRestaurantId) => {
    const restaurant = restaurants.find(r => r.id === newRestaurantId)
    if (restaurant) {
      const slug = nameToSlug(restaurant.name)
      navigate(`/menu/${slug}`)
    } else {
      navigate(`/menu/${newRestaurantId}`) // Fallback to ID
    }
    setRestaurantDropdownOpen(false)
  }

  // Reset to page 1 when category, search, or sort changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
      updatePageInUrl(1)
    }
  }, [selectedCategory, searchTerm, sortBy])

  // Menu caching utilities
  const getCachedMenu = (restaurantId) => {
    try {
      const cacheKey = `menu_${restaurantId}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { menu, timestamp } = JSON.parse(cached)
        // Cache valid for 5 minutes
        const cacheAge = Date.now() - timestamp
        const cacheValidTime = 5 * 60 * 1000 // 5 minutes
        if (cacheAge < cacheValidTime) {
          return menu
        } else {
          // Remove expired cache
          localStorage.removeItem(cacheKey)
        }
      }
    } catch (error) {
      console.error('Error reading menu cache:', error)
    }
    return null
  }

  const setCachedMenu = (restaurantId, menu) => {
    try {
      const cacheKey = `menu_${restaurantId}`
      localStorage.setItem(cacheKey, JSON.stringify({
        menu,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Error caching menu:', error)
    }
  }

  const loadMenu = async () => {
    if (!currentRestaurantId) return
    
    // Try to load from cache first (instant display)
    const cachedMenu = getCachedMenu(currentRestaurantId)
    if (cachedMenu) {
      setMenu(cachedMenu)
      setLoading(false) // Hide loading immediately if we have cache
      
      // If no category in URL and menu has categories, don't auto-select
      if (!categorySlug && cachedMenu?.categories?.length > 0) {
        setSelectedCategory(null)
      }
    } else {
      // No cache, show loading briefly
      setLoading(true)
    }
    
    // Always fetch fresh data in background (for updates)
    try {
      const response = await getPublicMenu(currentRestaurantId)
      const freshMenu = response.menu
      
      // Update menu with fresh data
      setMenu(freshMenu)
      
      // Cache the fresh menu
      setCachedMenu(currentRestaurantId, freshMenu)
      
      // If no category in URL and menu has categories, don't auto-select
      if (!categorySlug && freshMenu?.categories?.length > 0) {
        setSelectedCategory(null)
      }
    } catch (error) {
      console.error('Error loading menu:', error)
      // If we have cached menu, keep showing it
      // Otherwise show error state
      if (!cachedMenu) {
        setMenu(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = () => {
    if (!menu) return []
    
    let items = []
    
    // Get items from selected category
    if (selectedCategory) {
      const category = menu.categories.find(c => c.id === selectedCategory)
      if (category) items = category.items || []
    } else {
      // Get all items from all categories
      menu.categories?.forEach(cat => {
        items = [...items, ...(cat.items || [])]
      })
      items = [...items, ...(menu.items || [])]
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      items = items.filter(item => 
        item.name?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term)
      )
    }
    
    // Sort by price
    if (sortBy === 'price-asc') {
      items = [...items].sort((a, b) => (a.price || 0) - (b.price || 0))
    } else if (sortBy === 'price-desc') {
      items = [...items].sort((a, b) => (b.price || 0) - (a.price || 0))
    }
    
    return items
  }

  // Get paginated items
  const paginatedItems = () => {
    const allItems = filteredItems()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return allItems.slice(startIndex, endIndex)
  }

  // Calculate pagination info
  const totalItems = filteredItems().length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(page)
    updatePageInUrl(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1)
    }
  }

  // Handle category selection
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId)
    setCurrentPage(1) // Reset to page 1 when category changes
    
    if (!currentRestaurantName) return
    
    const slug = nameToSlug(currentRestaurantName)
    const category = categoryId ? menu?.categories.find(c => c.id === categoryId) : null
    const categoryPath = category ? `/${nameToSlug(category.name)}` : ''
    
    navigate(`/menu/${slug}${categoryPath}`, { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-stone-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-red-300 border-t-red-600 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-r-green-400 rounded-full animate-spin mx-auto" style={{ animationDuration: '1.2s' }}></div>
            <div className="absolute inset-2 w-20 h-20 border-4 border-transparent border-t-red-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
          </div>
          <p className="text-red-500 text-xl font-bold mb-2">
            Loading delicious menu...
          </p>
          <p className="text-gray-600 text-sm">Please wait</p>
        </div>
      </div>
    )
  }

  if (!menu && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-stone-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-red-500 text-lg mb-2 font-semibold">Failed to load menu</p>
          <p className="text-gray-600 text-sm mb-4">
            Please make sure:
            <br />• Backend server is running
            <br />• API URL is correct in .env file
            <br />• CORS is configured properly
          </p>
          <button 
            onClick={loadMenu}
            className="px-6 py-2 bg-red-400 text-white rounded-lg hover:bg-red-500 transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Beautiful Food Background Image with Overlay */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://media.istockphoto.com/id/1316145932/photo/table-top-view-of-spicy-food.jpg?s=2048x2048&w=is&k=20&c=azft1MVw7FNLT3CjwcHTaPuYbJLlazIMZbJRxLYVsbA=')`
          }}
        ></div>
        
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/70 via-red-900/60 to-orange-900/70"></div>
        
        {/* Additional gradient overlays for depth */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-red-200/10 to-red-300/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-green-200/10 to-green-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-amber-200/8 to-yellow-200/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Decorative Chinese patterns - subtle with better visibility */}
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.08]">
          <div className="absolute top-10 left-10 text-6xl text-red-300/40">囍</div>
          <div className="absolute top-32 right-20 text-5xl text-green-300/40">福</div>
          <div className="absolute bottom-20 left-1/4 text-4xl text-amber-300/40">龍</div>
          <div className="absolute bottom-40 right-1/3 text-5xl text-red-300/40">壽</div>
          <div className="absolute top-1/3 left-1/3 text-5xl text-red-300/40">祥</div>
          <div className="absolute bottom-1/3 right-1/4 text-4xl text-green-300/40">和</div>
        </div>
        
        {/* Floating lanterns effect */}
        <div className="absolute top-1/4 right-10 w-16 h-20 bg-gradient-to-b from-red-300/20 to-red-500/20 rounded-full blur-xl animate-float" style={{ animationDelay: '0s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/3 left-20 w-12 h-16 bg-gradient-to-b from-amber-300/20 to-yellow-400/20 rounded-full blur-xl animate-float" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-14 h-18 bg-gradient-to-b from-green-300/20 to-emerald-400/20 rounded-full blur-xl animate-float" style={{ animationDelay: '4s', animationDuration: '7s' }}></div>
        
        {/* Professional geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 50px, rgba(255, 255, 255, 0.1) 50px, rgba(255, 255, 255, 0.1) 100px)`,
          }}></div>
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 50px, rgba(255, 255, 255, 0.1) 50px, rgba(255, 255, 255, 0.1) 100px)`,
          }}></div>
        </div>
        
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
      </div>

      {/* Beautiful Chinese Restaurant Header with Search Bar */}
      <header className="relative bg-white/95 backdrop-blur-xl shadow-2xl sticky top-0 z-40 border-b-4 border-red-300/70">
        {/* Decorative top border pattern */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-300/50 to-transparent"></div>
        <div className="absolute top-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-300/30 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
          {/* Top Row: Back Button, Title and Cart */}
          <div className="flex items-center justify-between mb-3 lg:mb-4 gap-3">
            <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
              {/* Back Button */}
              <button
                onClick={() => navigate('/restaurants')}
                className="p-2.5 lg:p-3 bg-white/95 backdrop-blur-md rounded-xl lg:rounded-2xl hover:bg-white border-2 border-red-200/60 hover:border-red-400 shadow-lg hover:shadow-xl transition-all transform hover:scale-110 flex-shrink-0 group"
                aria-label="Back to restaurants"
              >
                <FiArrowLeft className="w-5 h-5 lg:w-6 lg:h-6 text-red-500 group-hover:text-red-600 transition-colors" />
              </button>
              
              <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                <h1 className="text-2xl lg:text-3xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-500 to-red-500 drop-shadow-lg truncate">
                  {menu?.restaurant_name || 'Menu'}
                </h1>
                <span className="text-xl lg:text-2xl text-red-400/60 flex-shrink-0">🍜</span>
              </div>
            </div>
            <button 
                onClick={() => {
                  if (currentRestaurantName) {
                    const slug = nameToSlug(currentRestaurantName)
                    navigate(`/cart/${slug}`)
                  } else {
                    navigate(`/cart/${currentRestaurantId}`)
                  }
                }}
              className="relative p-3 lg:p-4 bg-gradient-to-br from-red-400 via-red-500 to-red-600 text-white rounded-xl lg:rounded-2xl hover:from-red-500 hover:via-red-600 hover:to-red-700 transition-all shadow-xl hover:shadow-red-500/50 hover:scale-110 transform duration-300 group border-2 border-red-300/50 flex-shrink-0"
            >
              <FiShoppingCart className="w-5 h-5 lg:w-6 lg:h-6 group-hover:scale-110 transition-transform" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-green-400 to-emerald-500 text-white text-xs font-black rounded-full w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center shadow-xl animate-bounce-slow ring-2 ring-white/70 border-2 border-green-300">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>

          {/* Bottom Row: Restaurant Selector, Search Bar, and Sort */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Restaurant Selector */}
            {restaurants.length > 1 && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setRestaurantDropdownOpen(!restaurantDropdownOpen)}
                  className="w-full lg:w-auto px-4 py-2.5 lg:py-3 bg-white/95 backdrop-blur-md rounded-xl lg:rounded-2xl border-2 border-red-200/60 hover:border-red-400 shadow-lg hover:shadow-xl transition-all flex items-center justify-between gap-3 min-w-[180px] lg:min-w-[200px] group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs lg:text-sm font-bold text-gray-700">Restaurant:</span>
                    <span className="text-sm lg:text-base font-black text-red-500 truncate">
                      {menu?.restaurant_name || 'Select'}
                    </span>
                  </div>
                  <FiChevronDown className={`w-4 h-4 lg:w-5 lg:h-5 text-red-400 transition-transform duration-300 flex-shrink-0 ${restaurantDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Restaurant Dropdown */}
                {restaurantDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setRestaurantDropdownOpen(false)}
                    ></div>
                    <div className="absolute left-0 mt-2 w-full lg:w-[280px] bg-white/98 backdrop-blur-lg rounded-xl lg:rounded-2xl shadow-2xl border-2 border-red-200/60 overflow-hidden z-20 max-h-[300px] overflow-y-auto">
                      {restaurants.map((rest) => (
                        <button
                          key={rest.id}
                          onClick={() => handleRestaurantChange(rest.id)}
                          className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-all duration-200 ${
                            rest.id === currentRestaurantId
                              ? 'bg-gradient-to-r from-red-50 to-amber-50 text-red-600 font-black border-l-4 border-red-500'
                              : 'text-gray-700 hover:bg-red-50/50 font-semibold'
                          }`}
                        >
                          <span className="text-sm lg:text-base truncate flex-1">{rest.name}</span>
                          {rest.id === currentRestaurantId && <FiStar className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Search Bar - Beautiful Design */}
            <div className="relative flex-1 min-w-0">
              <div className="absolute inset-0 bg-gradient-to-r from-red-100/30 via-amber-100/30 to-red-100/30 rounded-xl lg:rounded-2xl blur-xl opacity-30 animate-pulse"></div>
              <div className="relative">
                {/* Beautiful Search Icon Container */}
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-400/20 rounded-lg blur-md"></div>
                    <div className="relative bg-gradient-to-br from-red-400/90 to-red-500/90 p-2 rounded-lg shadow-lg border border-red-300/50">
                      <FiSearch className="text-white w-4 h-4 lg:w-5 lg:h-5 drop-shadow-md" />
                    </div>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Search dishes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-14 lg:pl-16 pr-10 py-2.5 lg:py-3 bg-white/95 backdrop-blur-md rounded-xl lg:rounded-2xl border-2 border-red-200/60 focus:outline-none focus:ring-2 focus:ring-red-200/40 focus:border-red-400 shadow-lg hover:shadow-xl transition-all text-sm lg:text-base font-medium placeholder:text-gray-400"
                />
                {/* Clear button */}
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors z-10"
                    aria-label="Clear search"
                  >
                    <span className="text-xl font-bold">×</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sort Dropdown - Beautiful Design */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className={`w-full lg:w-auto px-4 py-2.5 lg:py-3 bg-white/95 backdrop-blur-md rounded-xl lg:rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all flex items-center justify-between gap-3 min-w-[160px] lg:min-w-[180px] group ${
                  sortDropdownOpen 
                    ? 'border-red-400 shadow-2xl ring-2 ring-red-200/50' 
                    : 'border-red-200/60 hover:border-red-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs lg:text-sm font-bold text-gray-700">Sort:</span>
                  <span className="text-sm lg:text-base font-black text-red-500">
                    {sortBy === 'none' && 'Default'}
                    {sortBy === 'price-asc' && 'Low-High'}
                    {sortBy === 'price-desc' && 'High-Low'}
                  </span>
                </div>
                <FiChevronDown className={`w-4 h-4 lg:w-5 lg:h-5 text-red-400 transition-transform duration-300 flex-shrink-0 ${sortDropdownOpen ? 'rotate-180 text-red-600' : ''}`} />
              </button>

              {/* Sort Dropdown Menu - Enhanced Beautiful Design */}
              {sortDropdownOpen && (
                <>
                  {/* Backdrop with blur */}
                  <div 
                    className="fixed inset-0 z-10 bg-black/10 backdrop-blur-sm" 
                    onClick={() => setSortDropdownOpen(false)}
                  ></div>
                  
                  {/* Dropdown Container with Enhanced Styling */}
                  <div className="absolute right-0 lg:left-0 mt-2 w-full lg:w-[240px] bg-white/99 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-red-300/60 overflow-hidden z-20 animate-fade-in ring-4 ring-red-100/30">
                    {/* Decorative top accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-400/50 to-transparent"></div>
                    
                    {/* Default Option */}
                    <button
                      onClick={() => {
                        setSortBy('none')
                        setSortDropdownOpen(false)
                      }}
                      className={`w-full px-5 py-4 text-left flex items-center gap-3 transition-all duration-200 relative group ${
                        sortBy === 'none'
                          ? 'bg-gradient-to-r from-red-50 via-amber-50 to-red-50 text-red-600 font-black border-l-4 border-red-500 shadow-inner'
                          : 'text-gray-700 hover:bg-gradient-to-r hover:from-red-50/50 hover:to-amber-50/50 font-semibold'
                      }`}
                    >
                      {sortBy === 'none' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/30 animate-shimmer"></div>
                      )}
                      <span className="relative z-10 text-sm lg:text-base flex-1">Default</span>
                      {sortBy === 'none' && (
                        <FiStar className="w-5 h-5 text-red-500 ml-auto relative z-10 fill-red-500" />
                      )}
                    </button>
                    
                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-red-200/60 to-transparent"></div>
                    
                    {/* Price: Low to High Option */}
                    <button
                      onClick={() => {
                        setSortBy('price-asc')
                        setSortDropdownOpen(false)
                      }}
                      className={`w-full px-5 py-4 text-left flex items-center gap-3 transition-all duration-200 relative group ${
                        sortBy === 'price-asc'
                          ? 'bg-gradient-to-r from-red-50 via-amber-50 to-red-50 text-red-600 font-black border-l-4 border-red-500 shadow-inner'
                          : 'text-gray-700 hover:bg-gradient-to-r hover:from-red-50/50 hover:to-amber-50/50 font-semibold'
                      }`}
                    >
                      {sortBy === 'price-asc' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/30 animate-shimmer"></div>
                      )}
                      <FiArrowUp className={`w-4 h-4 relative z-10 ${sortBy === 'price-asc' ? 'text-red-600' : 'text-gray-500'}`} />
                      <span className="relative z-10 text-sm lg:text-base flex-1">Price: Low to High</span>
                      {sortBy === 'price-asc' && (
                        <FiStar className="w-5 h-5 text-red-500 ml-auto relative z-10 fill-red-500" />
                      )}
                    </button>
                    
                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-red-200/60 to-transparent"></div>
                    
                    {/* Price: High to Low Option */}
                    <button
                      onClick={() => {
                        setSortBy('price-desc')
                        setSortDropdownOpen(false)
                      }}
                      className={`w-full px-5 py-4 text-left flex items-center gap-3 transition-all duration-200 relative group ${
                        sortBy === 'price-desc'
                          ? 'bg-gradient-to-r from-red-50 via-amber-50 to-red-50 text-red-600 font-black border-l-4 border-red-500 shadow-inner'
                          : 'text-gray-700 hover:bg-gradient-to-r hover:from-red-50/50 hover:to-amber-50/50 font-semibold'
                      }`}
                    >
                      {sortBy === 'price-desc' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/30 animate-shimmer"></div>
                      )}
                      <FiArrowDown className={`w-4 h-4 relative z-10 ${sortBy === 'price-desc' ? 'text-red-600' : 'text-gray-500'}`} />
                      <span className="relative z-10 text-sm lg:text-base flex-1">Price: High to Low</span>
                      {sortBy === 'price-desc' && (
                        <FiStar className="w-5 h-5 text-red-500 ml-auto relative z-10 fill-red-500" />
                      )}
                    </button>
                    
                    {/* Decorative bottom accent */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Category Carousel with Navigation - Fully Responsive */}
        {menu.categories && menu.categories.length > 0 && (
          <div className="mb-6 lg:mb-8 animate-fade-in">
            <div className="relative">
              {/* Left Navigation Button */}
              <button
                onClick={() => {
                  if (categoryCarouselRef.current) {
                    const scrollAmount = 300
                    categoryCarouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
                  }
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-md rounded-full p-2 lg:p-3 shadow-xl border-2 border-red-200/60 hover:border-red-400 hover:shadow-2xl transition-all transform hover:scale-110 hidden sm:flex items-center justify-center group"
                aria-label="Scroll categories left"
              >
                <FiChevronLeft className="w-5 h-5 lg:w-6 lg:h-6 text-red-500 group-hover:text-red-600 transition-colors" />
              </button>

              {/* Carousel Container with Horizontal Scroll */}
              <div 
                ref={categoryCarouselRef}
                className="overflow-x-auto scrollbar-hide pb-3 -mx-4 px-12 sm:px-16 lg:px-20 scroll-smooth"
                onScroll={(e) => setCategoryScrollPosition(e.target.scrollLeft)}
              >
                <div className="flex gap-3 lg:gap-4 min-w-max sm:min-w-0">
                  {/* All Items Button */}
                  <button
                    onClick={() => handleCategorySelect(null)}
                    className={`px-6 lg:px-8 py-3 lg:py-4 rounded-2xl lg:rounded-3xl font-display font-black text-sm lg:text-base transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 relative overflow-hidden group flex-shrink-0 border-2 ${
                      selectedCategory === null
                        ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 text-white shadow-xl scale-105 ring-2 ring-red-200/60 border-red-300'
                        : 'bg-white/95 backdrop-blur-sm text-gray-700 hover:bg-gradient-to-br hover:from-red-50 hover:to-amber-50 border-red-200/60 hover:border-red-300'
                    }`}
                  >
                    {selectedCategory === null && (
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 animate-shimmer"></div>
                    )}
                    <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                      <FiZap className="w-4 h-4 lg:w-5 lg:h-5" />
                      <span>All Items</span>
                    </span>
                  </button>
                  
                  {/* Category Buttons */}
                  {menu.categories.map((cat, index) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`px-6 lg:px-8 py-3 lg:py-4 rounded-2xl lg:rounded-3xl font-display font-black text-sm lg:text-base transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 relative overflow-hidden group flex-shrink-0 whitespace-nowrap border-2 ${
                        selectedCategory === cat.id
                          ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 text-white shadow-xl scale-105 ring-2 ring-red-200/60 border-red-300'
                          : 'bg-white/95 backdrop-blur-sm text-gray-700 hover:bg-gradient-to-br hover:from-red-50 hover:to-amber-50 border-red-200/60 hover:border-red-300'
                      }`}
                    >
                      {selectedCategory === cat.id && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 animate-shimmer"></div>
                      )}
                      <span className="relative z-10">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Navigation Button */}
              <button
                onClick={() => {
                  if (categoryCarouselRef.current) {
                    const scrollAmount = 300
                    categoryCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
                  }
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-md rounded-full p-2 lg:p-3 shadow-xl border-2 border-red-200/60 hover:border-red-400 hover:shadow-2xl transition-all transform hover:scale-110 hidden sm:flex items-center justify-center group"
                aria-label="Scroll categories right"
              >
                <FiChevronRight className="w-5 h-5 lg:w-6 lg:h-6 text-red-500 group-hover:text-red-600 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* Beautiful Chinese Restaurant Menu Items Grid - Professional Sizing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {paginatedItems().map((item, index) => {
            const colorClass = ITEM_COLORS[index % ITEM_COLORS.length]
            const iconVariants = [FiCoffee, FiStar, FiHeart, FiZap]
            const IconComponent = iconVariants[index % iconVariants.length]
            
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group relative bg-white/95 backdrop-blur-md rounded-2xl lg:rounded-3xl shadow-xl hover:shadow-2xl hover:shadow-red-200/50 transition-all cursor-pointer overflow-hidden animate-fade-in border-2 border-red-100/60 hover:border-red-300/80 transform hover:-translate-y-2 lg:hover:-translate-y-3 duration-500 flex flex-col h-full"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Decorative top accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-300/50 to-transparent"></div>
                
                {/* Image or Gradient Header Section - Professional Height */}
                <div className={`h-32 lg:h-40 relative overflow-hidden flex-shrink-0 ${!item.image_url ? `bg-gradient-to-br ${colorClass}` : ''}`}>
                  {item.image_url ? (
                    <>
                      {/* Actual Food Image */}
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to gradient if image fails to load
                          e.target.style.display = 'none'
                          e.target.parentElement.classList.add(`bg-gradient-to-br`, colorClass)
                        }}
                      />
                      {/* Overlay for better text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                      {/* Icon Badge - shown on image */}
                      <div className="absolute top-3 left-3 lg:top-4 lg:left-4 w-12 h-12 lg:w-14 lg:h-14 bg-white/35 backdrop-blur-lg rounded-xl lg:rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-xl border border-white/50">
                        <IconComponent className="w-6 h-6 lg:w-7 lg:h-7 text-white drop-shadow-lg" />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Chinese pattern overlay - only for gradient backgrounds */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-2 left-2 text-2xl text-white/30">福</div>
                        <div className="absolute bottom-2 right-2 text-xl text-white/30">囍</div>
                        <div className="absolute top-0 left-0 w-full h-full" style={{
                          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)',
                          backgroundSize: '20px 20px'
                        }}></div>
                      </div>
                      {/* Icon Badge with Chinese style - Professional Size */}
                      <div className="absolute top-3 left-3 lg:top-4 lg:left-4 w-12 h-12 lg:w-14 lg:h-14 bg-white/35 backdrop-blur-lg rounded-xl lg:rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-xl border border-white/50">
                        <IconComponent className="w-6 h-6 lg:w-7 lg:h-7 text-white drop-shadow-lg" />
                      </div>
                    </>
                  )}
                  
                  {/* Decorative corner elements */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/40"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/40"></div>
                  
                  {/* Price Badge - Chinese style - Professional Size */}
                  <div className="absolute top-3 right-3 lg:top-4 lg:right-4 bg-gradient-to-br from-white/98 to-amber-50/98 backdrop-blur-lg text-gray-900 px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl lg:rounded-2xl shadow-2xl font-display font-black text-base lg:text-lg group-hover:scale-110 transition-transform duration-300 border-2 border-amber-200/50 z-10">
                    <span className="text-xs text-amber-600 font-bold">$</span>
                    {item.price?.toFixed(2)}
                  </div>
                  
                  {/* Decorative bottom elements */}
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/40"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/40"></div>
                  
                  {/* Floating decorative circles - only for gradient backgrounds */}
                  {!item.image_url && (
                    <>
                      <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/25 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                      <div className="absolute -top-8 -left-8 w-24 h-24 bg-white/25 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    </>
                  )}
                </div>
                
                {/* Content Section with elegant styling - Professional Padding */}
                <div className="p-5 lg:p-6 relative bg-gradient-to-b from-white to-amber-50/30 flex-grow flex flex-col">
                  {/* Decorative divider */}
                  <div className="absolute top-0 left-4 right-4 lg:left-6 lg:right-6 h-px bg-gradient-to-r from-transparent via-red-200/50 to-transparent"></div>
                  
                  <h3 className="text-xl lg:text-2xl font-heading font-black text-gray-900 mb-2 lg:mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-red-500 group-hover:to-amber-500 transition-all duration-300 line-clamp-2">
                    {item.name}
                  </h3>
                  
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-4 lg:mb-5 line-clamp-2 lg:line-clamp-3 leading-relaxed font-medium flex-grow">
                      {item.description}
                    </p>
                  )}
                  
                  {/* Action Section with Chinese styling - Professional Layout */}
                  <div className="flex items-center justify-between pt-4 lg:pt-5 border-t-2 border-red-100/60 mt-auto">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-amber-600 font-bold">$</span>
                      <span className="text-2xl lg:text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">
                        {item.price?.toFixed(2)}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedItem(item)
                      }}
                      className={`px-4 py-2.5 lg:px-6 lg:py-3 bg-gradient-to-r ${colorClass} text-white rounded-xl lg:rounded-2xl hover:shadow-xl transition-all flex items-center gap-2 font-bold text-xs lg:text-sm transform hover:scale-105 lg:hover:scale-110 group/btn border-2 border-white/30 shadow-xl`}
                    >
                      <span className="hidden sm:inline">Add to Cart</span>
                      <span className="sm:hidden">Add</span>
                      <FiChevronRight className="w-4 h-4 lg:w-5 lg:h-5 group-hover/btn:translate-x-1 transition-transform" />
                      {/* Shine effect */}
                      <div className="absolute inset-0 rounded-xl lg:rounded-2xl bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                    </button>
                  </div>
                </div>
                
                {/* Advanced Hover Overlay */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`}></div>
                
                {/* Shine Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
                
                {/* Decorative bottom border */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent"></div>
              </div>
            )
          })}
        </div>

        {filteredItems().length === 0 && (
          <div className="text-center py-24 animate-fade-in">
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 bg-red-100 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative w-32 h-32 bg-red-400 rounded-full flex items-center justify-center shadow-2xl">
                <FiSearch className="w-16 h-16 text-white" />
              </div>
            </div>
            <p className="text-red-500 text-2xl font-black mb-3">
              No items found
            </p>
            <p className="text-gray-600 text-lg">Try searching for something else or browse all categories</p>
          </div>
        )}

        {/* Professional Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 lg:mt-16 animate-fade-in">
            <div className="flex flex-col items-center gap-6">
              {/* Items count info */}
              <div className="text-center">
                <p className="text-gray-600 text-sm lg:text-base font-medium">
                  Showing <span className="font-black text-red-500">{startItem}</span> to <span className="font-black text-red-500">{endItem}</span> of <span className="font-black text-red-500">{totalItems}</span> items
                </p>
              </div>

              {/* Pagination buttons */}
              <div className="flex items-center gap-2 lg:gap-3">
                {/* Previous button */}
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-4 py-2.5 lg:px-5 lg:py-3 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2 border-2 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      : 'bg-white/95 backdrop-blur-sm text-gray-700 hover:bg-gradient-to-br hover:from-red-50 hover:to-amber-50 border-red-200/60 hover:border-red-300'
                  }`}
                >
                  <FiChevronLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = 
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    
                    if (!showPage) {
                      // Show ellipsis
                      if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="px-2 text-gray-400 font-bold">
                            ...
                          </span>
                        )
                      }
                      return null
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`min-w-[2.5rem] lg:min-w-[3rem] h-10 lg:h-12 rounded-xl lg:rounded-2xl font-black text-sm lg:text-base transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 border-2 ${
                          currentPage === page
                            ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 text-white shadow-2xl scale-105 ring-4 ring-red-200/60 border-red-300'
                            : 'bg-white/95 backdrop-blur-sm text-gray-700 hover:bg-gradient-to-br hover:from-red-50 hover:to-amber-50 border-red-200/60 hover:border-red-300'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>

                {/* Next button */}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2.5 lg:px-5 lg:py-3 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2 border-2 ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      : 'bg-white/95 backdrop-blur-sm text-gray-700 hover:bg-gradient-to-br hover:from-red-50 hover:to-amber-50 border-red-200/60 hover:border-red-300'
                  }`}
                >
                  <span className="hidden sm:inline">Next</span>
                  <FiChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Item Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  )
}
