"use client"

import { useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { trackGuestOrder } from "@/server/actions/orders"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Package } from "lucide-react"
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/lib/order-status"
import type { OrderStatus } from "@/db/schema"
import type { Order, OrderItem } from "@/db/schema"

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  pending:
    "Tu pedido fue recibido y está pendiente de confirmación por el local.",
  confirmed: "Tu pedido fue confirmado. Lo estamos preparando.",
  preparing: "Estamos preparando tu pedido.",
  ready_for_pickup:
    "¡Tu pedido está listo para retirar en el local! Revisá el código de retiro si te lo enviamos.",
  delivered: "Pedido retirado. ¡Gracias por tu compra!",
  cancelled: "Este pedido fue cancelado.",
}

export default function TrackOrderForm() {
  const searchParams = useSearchParams()
  const [orderId, setOrderId] = useState(searchParams.get("order") ?? "")
  const [contact, setContact] = useState("")
  const [result, setResult] = useState<{
    order: Order
    items: OrderItem[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    start(async () => {
      const res = await trackGuestOrder(orderId.trim(), contact.trim())
      if ("error" in res) {
        setError(res.error ?? "No se pudo consultar el pedido")
        return
      }
      if (!("order" in res)) return
      setResult({ order: res.order, items: res.items })
    })
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Número de pedido *
          </label>
          <Input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="UUID del pedido (copiado al confirmar)"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Email o teléfono con el que compraste *
          </label>
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="tu@email.com o +54..."
            required
          />
        </div>
        <Button type="submit" variant="hero" disabled={isPending} className="w-full">
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Consultar estado"
          )}
        </Button>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </form>

      {result && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Pedido #{result.order.id.slice(0, 8)}
            </h2>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${ORDER_STATUS_COLORS[result.order.status as OrderStatus]}`}
            >
              {ORDER_STATUS_LABELS[result.order.status as OrderStatus]}
            </span>
          </div>

          <p className="text-muted-foreground">
            {STATUS_MESSAGES[result.order.status as OrderStatus] ??
              "Consultá con el local si tenés dudas."}
          </p>

          {result.order.pickupCode && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">Código de retiro</p>
              <p className="text-2xl font-mono font-bold text-primary">
                {result.order.pickupCode}
              </p>
            </div>
          )}

          <ul className="divide-y divide-border text-sm">
            {result.items.map((item) => (
              <li key={item.id} className="flex justify-between py-2">
                <span>
                  {item.nameSnapshot} x{item.quantity}
                </span>
                <span className="font-medium">
                  ${(parseFloat(item.priceSnapshot) * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-right font-bold">
            Total ${parseFloat(result.order.total).toFixed(2)}
          </p>
        </div>
      )}
    </div>
  )
}
