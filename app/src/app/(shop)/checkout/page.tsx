"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/CartContext"
import { createOrder } from "@/server/actions/orders"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, ShoppingBag, Loader2, MapPin } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"

const pickupAddress =
  process.env.NEXT_PUBLIC_PICKUP_ADDRESS ?? "Radio Colonia — consultar dirección en el local"

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCart()
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    preferredContactChannel: "whatsapp" as "whatsapp" | "email",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "preferredContactChannel"
          ? (value as "whatsapp" | "email")
          : value,
    }))
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
        id:            i.id,
        name:          i.name,
        price:         i.price,
        quantity:      i.quantity,
        image:         i.image,
        sku:           i.sku,
        variantLabel:  i.variantLabel,
      })))

      if ("error" in result && result.error) {
        setError(result.error)
        return
      }

      if ("initPoint" in result && result.initPoint) {
        clearCart()
        window.location.href = result.initPoint
        return
      }
      if ("sandboxInitPoint" in result && result.sandboxInitPoint) {
        clearCart()
        window.location.href = result.sandboxInitPoint
        return
      }

      if ("success" in result && result.orderId) {
        clearCart()
        router.push(`/checkout/confirmado?order=${result.orderId}`)
        return
      }

      if ("orderId" in result && result.orderId && !("success" in result)) {
        toast.warning("Pedido creado, pero hubo un problema con el pago. Contactanos.")
        clearCart()
        router.push(`/checkout/confirmado?order=${result.orderId}`)
      }
    })
  }

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-foreground mb-2">Confirmar pedido</h1>
        <p className="text-muted-foreground mb-8">Retiro en el local — sin envío a domicilio por ahora</p>

        <div className="mb-8 p-4 rounded-2xl border border-primary/30 bg-primary/5 flex gap-3">
          <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Retirás en el local</p>
            <p className="text-sm text-muted-foreground">{pickupAddress}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Te avisaremos por tu canal preferido cuando el pedido esté listo para retirar.
              El pago se coordina en el local.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">Datos de contacto</h2>

            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="grid sm:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email *
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="tu@email.com"
                    required
                  />
                </div>
              </div>

              <fieldset>
                <legend className="block text-sm font-medium text-foreground mb-2">
                  ¿Cómo preferís que te avisemos? *
                </legend>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="preferredContactChannel"
                      value="whatsapp"
                      checked={form.preferredContactChannel === "whatsapp"}
                      onChange={handleChange}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="preferredContactChannel"
                      value="email"
                      checked={form.preferredContactChannel === "email"}
                      onChange={handleChange}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">Email</span>
                  </label>
                </div>
              </fieldset>

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
                  <>Confirmar pedido <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Al confirmar, tu pedido queda pendiente de aceptación por el local.
              </p>
            </form>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">Resumen del pedido</h2>
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              {items.map((item) => (
                <div key={item.sku ? `${item.id}::${item.sku}` : item.id} className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gradient-silver flex-shrink-0 overflow-hidden">
                    <Image src={item.image} alt={item.name} width={64} height={64} className="w-full h-full object-contain p-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{item.name}</p>
                    {item.variantLabel && (
                      <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                    )}
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
                  <span className="text-muted-foreground">Retiro en local</span>
                  <span className="text-primary font-medium">Sin cargo</span>
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
