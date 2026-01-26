import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([])

  // Load cart from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cart')
    if (saved) {
      try {
        setCart(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading cart:', e)
      }
    }
  }, [])

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (item, modifiers = {}, quantity = 1, instructions = '') => {
    setCart(prev => {
      const existing = prev.find(
        i => i.menu_item_id === item.id && 
        JSON.stringify(i.modifier_selections) === JSON.stringify(modifiers)
      )
      
      if (existing) {
        return prev.map(i => 
          i.id === existing.id 
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      
      return [...prev, {
        id: `${item.id}-${Date.now()}`,
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity,
        modifier_selections: modifiers,
        special_instructions: instructions
      }]
    })
  }

  const updateQuantity = (id, qty) => {
    if (qty <= 0) {
      removeFromCart(id)
      return
    }
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: qty } : item
    ))
  }

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const clearCart = () => {
    setCart([])
    localStorage.removeItem('cart')
  }

  const getTotalItems = () => cart.reduce((sum, item) => sum + item.quantity, 0)
  
  const getSubtotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  const getTax = () => getSubtotal() * 0.0725
  
  const getTotal = () => getSubtotal() + getTax()

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      getTotalItems,
      getSubtotal,
      getTax,
      getTotal
    }}>
      {children}
    </CartContext.Provider>
  )
}
