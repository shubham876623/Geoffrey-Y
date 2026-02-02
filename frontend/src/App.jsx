import { Routes, Route, Navigate } from 'react-router-dom'
import KDS from './pages/KDS'
import FrontDesk from './pages/FrontDesk'
import Menu from './pages/Menu'
import Cart from './pages/Cart'
import OrderConfirmation from './pages/OrderConfirmation'
import RestaurantSelection from './pages/RestaurantSelection'
import AdminLogin from './pages/AdminLogin'
import RestaurantLogin from './pages/RestaurantLogin'
import StaffLogin from './pages/StaffLogin'
import AdminDashboard from './pages/AdminDashboard'
import RestaurantDashboard from './pages/RestaurantDashboard'
import Analytics from './pages/Analytics'
import AdminDashboardLanding from './pages/AdminDashboardLanding'
import ProtectedRoute from './components/ProtectedRoute'
import RestaurantRedirect from './components/RestaurantRedirect'
import AdminRedirect from './components/AdminRedirect'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/restaurants" element={<RestaurantSelection />} />
      <Route path="/menu/:restaurantName/:category?/:page?" element={<Menu />} />
      <Route path="/menu/:restaurantId" element={<Menu />} /> {/* Legacy route for backward compatibility */}
      <Route path="/cart/:restaurantName/:selectedItem?" element={<Cart />} />
      <Route path="/cart/:restaurantId" element={<Cart />} /> {/* Legacy route for backward compatibility */}
      <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
      
      {/* Legacy routes (redirect to restaurant selection) */}
      <Route path="/menu" element={<Navigate to="/restaurants" replace />} />
      <Route path="/cart" element={<Navigate to="/restaurants" replace />} />
      
      {/* Authentication Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/restaurant/login" element={<RestaurantLogin />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      
      {/* Landing Page - Role Selection */}
      <Route path="/admin-dashboard" element={<AdminDashboardLanding />} />
      <Route path="/admin-dashboard/" element={<AdminDashboardLanding />} />
      <Route path="/admin-dashboard/*" element={<AdminDashboardLanding />} />
      
      {/* Root Routes - Auto-redirect based on auth */}
      <Route path="/admin" element={<AdminRedirect />} />
      <Route path="/restaurant" element={<RestaurantRedirect />} />
      
      {/* Protected Routes */}
      {/* Platform Admin Routes */}
      <Route 
        path="/admin/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Restaurant Admin Routes */}
      <Route 
        path="/restaurant/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['restaurant_admin']}>
            <RestaurantDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/restaurant/analytics" 
        element={
          <ProtectedRoute allowedRoles={['restaurant_admin']}>
            <Analytics />
          </ProtectedRoute>
        } 
      />
      
      {/* Staff Routes - KDS */}
      <Route 
        path="/kds" 
        element={
          <ProtectedRoute allowedRoles={['kds_user']}>
            <KDS />
          </ProtectedRoute>
        }             
      />
      
      {/* Staff Routes - Front Desk */}
      <Route 
        path="/front-desk" 
        element={
          <ProtectedRoute allowedRoles={['frontdesk_user']}>
            <FrontDesk />
          </ProtectedRoute>
        } 
      />
      
      {/* Default route - redirect to restaurant selection */}
      <Route path="/" element={<Navigate to="/restaurants" replace />} />
    </Routes>
  )
}

export default App
