"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import {
  resolveUnitPrice,
  type PriceTier,
} from "@/lib/quantityPricing"

export interface CartItem {
  id:            string
  name:          string
  price:         number
  basePrice:     number
  priceTiers:    PriceTier[]
  originalPrice?: number
  image:         string
  quantity:      number
  slug:          string
  sku?:          string
  variantLabel?: string
}

interface CartContextType {
  items:          CartItem[]
  isOpen:         boolean
  openCart:       () => void
  closeCart:      () => void
  toggleCart:     () => void
  addItem:        (item: Omit<CartItem, "quantity" | "price"> & {
    price?: number
    quantity?: number
    basePrice?: number
    priceTiers?: PriceTier[]
  }) => void
  removeItem:     (cartKey: string) => void
  updateQuantity: (cartKey: string, quantity: number) => void
  clearCart:      () => void
  totalItems:     number
  totalPrice:     number
}

/** Items with the same product id but different SKU must be separate cart entries */
export function cartKey(item: Pick<CartItem, "id" | "sku">) {
  return item.sku ? `${item.id}::${item.sku}` : item.id
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}

function withResolvedPrice(
  item: Omit<CartItem, "quantity" | "price"> & {
    price?: number
    basePrice?: number
    priceTiers?: PriceTier[]
  },
  quantity: number
): CartItem {
  const basePrice = item.basePrice ?? item.price ?? 0
  const priceTiers = item.priceTiers ?? []
  const price = resolveUnitPrice(basePrice, priceTiers, quantity)
  return {
    id:            item.id,
    name:          item.name,
    image:         item.image,
    slug:          item.slug,
    sku:           item.sku,
    variantLabel:  item.variantLabel,
    originalPrice: item.originalPrice,
    basePrice,
    priceTiers,
    price,
    quantity,
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems]   = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const openCart  = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)
  const toggleCart = () => setIsOpen((p) => !p)

  const addItem = (
    newItem: Omit<CartItem, "quantity" | "price"> & {
      price?: number
      quantity?: number
      basePrice?: number
      priceTiers?: PriceTier[]
    }
  ) => {
    const addQty = Math.max(1, newItem.quantity ?? 1)
    const key = cartKey(newItem)
    setItems((prev) => {
      const existing = prev.find((i) => cartKey(i) === key)
      if (existing) {
        const nextQty = existing.quantity + addQty
        return prev.map((i) =>
          cartKey(i) === key
            ? withResolvedPrice(
                {
                  ...i,
                  basePrice: newItem.basePrice ?? i.basePrice,
                  priceTiers: newItem.priceTiers ?? i.priceTiers,
                },
                nextQty
              )
            : i
        )
      }
      return [...prev, withResolvedPrice(newItem, addQty)]
    })
    openCart()
  }

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => cartKey(i) !== key))
  }

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity < 1) { removeItem(key); return }
    setItems((prev) =>
      prev.map((i) =>
        cartKey(i) === key ? withResolvedPrice(i, quantity) : i
      )
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
