import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { FiX, FiPlus, FiMinus, FiStar, FiCoffee } from 'react-icons/fi'

export default function ItemModal({ item, onClose }) {
  const [quantity, setQuantity] = useState(1)
  const [modifierSelections, setModifierSelections] = useState({})
  const [instructions, setInstructions] = useState('')
  const { addToCart } = useCart()

  const handleModifierChange = (modifierName, optionName, isMultiple) => {
    if (isMultiple) {
      setModifierSelections(prev => {
        const current = prev[modifierName] || []
        const exists = current.includes(optionName)
        return {
          ...prev,
          [modifierName]: exists
            ? current.filter(o => o !== optionName)
            : [...current, optionName]
        }
      })
    } else {
      setModifierSelections(prev => ({
        ...prev,
        [modifierName]: optionName
      }))
    }
  }

  const handleAddToCart = () => {
    addToCart(item, modifierSelections, quantity, instructions)
    onClose()
  }

  const calculatePrice = () => {
    let total = item.price || 0
    // Add modifier price adjustments
    item.modifiers?.forEach(modifier => {
      const selected = modifierSelections[modifier.name]
      if (selected) {
        modifier.options?.forEach(option => {
          if (modifier.type === 'single' && option.name === selected) {
            total += option.price_adjustment || 0
          } else if (modifier.type === 'multiple' && Array.isArray(selected) && selected.includes(option.name)) {
            total += option.price_adjustment || 0
          }
        })
      }
    })
    return total * quantity
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="item-modal-zoom-out bg-white/95 backdrop-blur-md rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-red-100/50 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Premium Header with Chinese Colors */}
        <div className="sticky top-0 bg-gradient-to-r from-amber-50 via-yellow-50 to-stone-50 border-b border-red-200/50 px-8 py-6 flex items-center justify-between backdrop-blur-sm z-10">
          <div>
            <h2 className="text-3xl font-black text-red-700 mb-1">
              {item.name}
            </h2>
            <div className="flex items-center gap-1 mt-1">
              <FiStar className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <FiStar className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <FiStar className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-white/80 hover:bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 transform duration-200"
          >
            <FiX className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Premium Gradient Banner (instead of image) - Red/Green alternating */}
        <div className="relative h-48 bg-gradient-to-br from-red-500 via-red-600 to-red-700 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)',
              backgroundSize: '32px 32px'
            }}></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-white/30 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl">
              <FiCoffee className="w-14 h-14 text-white" />
            </div>
          </div>
          {/* Decorative Circles */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
        </div>

        <div className="p-8 bg-gradient-to-b from-white to-amber-50/30">
          {/* Description */}
          {item.description && (
            <div className="mb-8 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-red-100/50">
              <p className="text-gray-700 leading-relaxed text-lg">{item.description}</p>
            </div>
          )}

          {/* Enhanced Modifiers */}
          {item.modifiers && item.modifiers.length > 0 && (
            <div className="space-y-6 mb-8">
              {item.modifiers.map(modifier => (
                <div key={modifier.id} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-red-100/50">
                  <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                    {modifier.name}
                    {modifier.is_required && <span className="text-red-600 ml-1 text-xl">*</span>}
                  </h3>
                  <div className="space-y-3">
                    {modifier.options?.map(option => {
                      const isSelected = modifier.type === 'single'
                        ? modifierSelections[modifier.name] === option.name
                        : (modifierSelections[modifier.name] || []).includes(option.name)
                      
                      return (
                        <label
                          key={option.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (modifier.type === 'single') {
                              handleModifierChange(modifier.name, option.name, false)
                            } else {
                              handleModifierChange(modifier.name, option.name, true)
                            }
                          }}
                          className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                            isSelected
                              ? 'border-red-500 bg-red-50 shadow-lg scale-[1.02]'
                              : 'border-gray-200 hover:border-red-300 bg-white/80 hover:bg-red-50/30'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {modifier.type === 'single' ? (
                              <input
                                type="radio"
                                name={modifier.name}
                                checked={isSelected}
                                onChange={() => {}}
                                className="hidden"
                              />
                            ) : (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="hidden"
                              />
                            )}
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected 
                                ? modifier.type === 'single'
                                  ? 'border-red-600 bg-red-600' 
                                  : 'border-green-600 bg-green-600'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                modifier.type === 'single' ? (
                                  <div className="w-3 h-3 bg-white rounded-full"></div>
                                ) : (
                                  <FiX className="w-4 h-4 text-white rotate-45" />
                                )
                              )}
                            </div>
                            <span className="font-medium text-gray-900">{option.name}</span>
                          </div>
                          {option.price_adjustment !== 0 && (
                            <span className={`font-bold text-base ${
                              option.price_adjustment > 0 
                                ? 'text-green-600' 
                                : 'text-gray-600'
                            }`}>
                              {option.price_adjustment > 0 ? '+' : ''}${option.price_adjustment.toFixed(2)}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Special Instructions */}
          <div className="mb-8 bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-red-100/50">
            <label className="block font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              Special Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Any special requests? (optional)"
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-300/50 focus:border-red-500 transition-all bg-white/80 text-gray-700 placeholder:text-gray-400 resize-none"
              rows="3"
            />
          </div>

          {/* Enhanced Quantity */}
          <div className="mb-8 bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-red-100/50">
            <label className="block font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              Quantity
            </label>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl hover:scale-110 transform duration-200 flex items-center justify-center font-bold"
              >
                <FiMinus className="w-6 h-6" />
              </button>
              <span className="text-4xl font-black text-red-700 w-16 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl hover:scale-110 transform duration-200 flex items-center justify-center font-bold"
              >
                <FiPlus className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Premium Footer */}
        <div className="sticky bottom-0 bg-gradient-to-r from-white via-amber-50/95 to-white backdrop-blur-md border-t-2 border-red-200/50 px-8 py-6 flex items-center justify-between shadow-2xl">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total</p>
            <p className="text-4xl font-black text-red-700">
              ${calculatePrice().toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            className="px-10 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all shadow-xl hover:shadow-2xl font-bold text-lg transform hover:scale-105 duration-200"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}
