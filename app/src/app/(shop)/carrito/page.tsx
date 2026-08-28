"use client"

import { useCart, cartKey } from "@/contexts/CartContext"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function CarritoPage() {
  const { items, updateQuantity, removeItem, clearCart, totalPrice, totalItems } = useCart()

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
          <ShoppingBag className="w-12 h-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Tu carrito está vacío</h1>
        <p className="text-muted-foreground mb-8">Explorá nuestros productos y agregá lo que te guste</p>
        <Link href="/productos">
          <Button variant="hero" size="xl">
            <ArrowLeft className="w-5 h-5" />
            Explorar productos
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Tu Carrito <span className="text-gradient-orange">({totalItems})</span>
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const key = cartKey(item)
              return (
              <div key={key} className="flex gap-4 p-4 bg-card rounded-2xl border border-border">
                <div className="w-24 h-24 rounded-xl bg-gradient-silver flex-shrink-0 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/productos/${item.slug}`}>
                    <h3 className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 mb-1">
                      {item.name}
                    </h3>
                  </Link>
                  {item.variantLabel && (
                    <p className="text-xs text-muted-foreground mb-1">{item.variantLabel}</p>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-foreground text-lg">${item.price.toFixed(2)}</span>
                    {Math.abs(item.price - item.basePrice) > 0.009 ? (
                      <span className="text-sm text-muted-foreground line-through">
                        ${item.basePrice.toFixed(2)}
                      </span>
                    ) : item.originalPrice ? (
                      <span className="text-sm text-muted-foreground line-through">
                        ${item.originalPrice.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                  {Math.abs(item.price - item.basePrice) > 0.009 && (
                    <p className="text-xs text-primary mb-2">Descuento por cantidad aplicado</p>
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
                      <span className="w-10 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline" size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(key, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
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
              </div>
            )})}

            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={clearCart}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Vaciar carrito
            </Button>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-foreground mb-4">Resumen del pedido</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                  <span className="text-foreground">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío</span>
                  <span className="text-primary font-medium">Gratis</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <Link href="/checkout">
                <Button variant="hero" size="xl" className="w-full group mb-3">
                  Proceder al pago
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/productos">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4" />
                  Seguir comprando
                </Button>
              </Link>

              {/* Trust badges */}
              <div className="mt-6 pt-6 border-t border-border space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-primary">✓</span> Pago seguro con Mercado Pago
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-primary">✓</span> Envío gratis en todos los pedidos
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-primary">✓</span> 2 años de garantía incluida
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
