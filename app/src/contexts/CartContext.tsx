"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export interface CartItem {
  id:            string
  name:          string
  price:         number
  originalPrice?: number
  image:         string
  quantity:      number
  slug:          string
}

interface CartContextType {
  items:          CartItem[]
  isOpen:         boolean
  openCart:       () => void
  closeCart:      () => void
  toggleCart:     () => void
  addItem:        (item: Omit<CartItem, "quantity">) => void
  removeItem:     (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart:      () => void
  totalItems:     number
  totalPrice:     number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems]   = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const openCart  = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)
  const toggleCart = () => setIsOpen((p) => !p)

  const addItem = (newItem: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === newItem.id)
      if (existing) {
        return prev.map((i) =>
          i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...newItem, quantity: 1 }]
    })
    openCart()
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) { removeItem(id); return }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    )
  }

  const clearCart = () => setItems([])

  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items, isOpen,
        openCart, closeCart, toggleCart,
        addItem, removeItem, updateQuantity, clearCart,
        totalItems, totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
