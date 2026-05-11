"use client"

import { useState, useTransition } from "react"
import { useCart } from "@/contexts/CartContext"
import { createOrder } from "@/server/actions/orders"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, ShoppingBag, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart()
  const [error, setError]   = useState<string | null>(null)
  const [isPending, start]  = useTransition()

  const [form, setForm] = useState({
    fullName: "", phone: "", street: "",
    city: "", province: "", zip: "", country: "Argentina",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
          <ShoppingBag className="w-12 h-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Tu carrito está vacío</h1>
        <Link href="/productos">
          <Button variant="hero" size="xl">Ver productos</Button>
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    start(async () => {
      const result = await createOrder(form, items.map((i) => ({
        id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image,
      })))

      if (result.error) {
        setError(result.error)
        return
      }

      // Redirect to Mercado Pago
      if (result.initPoint || result.sandboxInitPoint) {
        clearCart()
        const url = result.initPoint ?? result.sandboxInitPoint!
        window.location.href = url
      } else {
        // fallback - order created but MP failed
        toast.warning("Pedido creado, pero Mercado Pago no está disponible. Contactanos para coordinar el pago.")
        clearCart()
      }
    })
  }

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Form */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">Datos de envío</h2>

            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Nombre completo *
                  </label>
                  <Input
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Teléfono *
                  </label>
                  <Input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+54 11 1234-5678"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Dirección *
                </label>
                <Input
                  name="street"
                  value={form.street}
                  onChange={handleChange}
                  placeholder="Calle 123, Piso 2, Depto B"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Ciudad *</label>
                  <Input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Buenos Aires"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Provincia *</label>
                  <Input
                    name="province"
                    value={form.province}
                    onChange={handleChange}
                    placeholder="CABA"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">CP *</label>
                  <Input
                    name="zip"
                    value={form.zip}
                    onChange={handleChange}
                    placeholder="1001"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="xl"
                className="w-full group mt-4"
                disabled={isPending}
              >
                {isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
                ) : (
                  <>Pagar con Mercado Pago <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Serás redirigido a Mercado Pago para completar el pago de forma segura.
              </p>
            </form>
          </div>

          {/* Order summary */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">Resumen del pedido</h2>
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gradient-silver flex-shrink-0 overflow-hidden">
                    <Image src={item.image} alt={item.name} width={64} height={64} className="w-full h-full object-contain p-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{item.name}</p>
                    <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío</span>
                  <span className="text-primary font-medium">Gratis</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-2">
                  <span>Total</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
