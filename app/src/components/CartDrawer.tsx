"use client"

import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from "lucide-react"
import { Button } from "./ui/button"
import { useCart, cartKey } from "@/contexts/CartContext"
import { useEffect } from "react"
import Link from "next/link"

export default function CartDrawer() {
  const {
    items, isOpen, closeCart,
    updateQuantity, removeItem,
    totalItems, totalPrice, clearCart,
  } = useCart()

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-midnight/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-background border-l border-border z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-orange flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Tu Carrito</h2>
                <p className="text-sm text-muted-foreground">{totalItems} items</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={closeCart} className="hover:bg-secondary">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Tu carrito está vacío</h3>
                <p className="text-muted-foreground mb-6">Agregá productos para comenzar</p>
                <Button variant="hero" onClick={closeCart}>Seguir comprando</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const key = cartKey(item)
                  const tierApplied = Math.abs(item.price - item.basePrice) > 0.009
                  return (
                    <div
                      key={key}
                      className="flex gap-4 p-4 bg-card rounded-xl border border-border animate-fade-in"
                    >
                      <div className="w-20 h-20 rounded-lg bg-gradient-silver flex-shrink-0 overflow-hidden">
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain p-2" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground line-clamp-2 text-sm mb-0.5">{item.name}</h4>
                        {item.variantLabel && (
                          <p className="text-xs text-primary mb-1">{item.variantLabel}</p>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">${item.price.toFixed(2)}</span>
                          {tierApplied ? (
                            <span className="text-xs text-muted-foreground line-through">
                              ${item.basePrice.toFixed(2)}
                            </span>
                          ) : item.originalPrice ? (
                            <span className="text-xs text-muted-foreground line-through">
                              ${item.originalPrice.toFixed(2)}
                            </span>
                          ) : null}
                        </div>
                        {tierApplied && (
                          <p className="text-[10px] text-primary mb-2">Descuento por cantidad</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline" size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(key, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-medium text-foreground">{item.quantity}</span>
                            <Button
                              variant="outline" size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(key, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem(key)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-destructive"
                  onClick={clearCart}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Vaciar carrito
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-border p-6 space-y-4 bg-card">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío</span>
                  <span className="text-primary font-medium">Gratis</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
              <Link href="/checkout" onClick={closeCart}>
                <Button variant="hero" size="xl" className="w-full group">
                  Pagar
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" className="w-full" onClick={closeCart}>
                Seguir comprando
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
