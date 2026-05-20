"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  updateOrderInternalNotes,
  updateOrderStatus,
} from "@/server/actions/orders"
import type { Order, OrderItem, OrderStatusHistory } from "@/db/schema"
import type { OrderStatus } from "@/db/schema"
import { Button } from "@/components/ui/button"
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PICKUP_STATUS_TRANSITIONS,
  CONTACT_CHANNEL_LABELS,
  FULFILLMENT_TYPE_LABELS,
} from "@/lib/order-status"
import {
  buildReadyForPickupMessage,
  getWhatsAppNotifyUrl,
  orderForWhatsApp,
} from "@/lib/whatsapp"
import { toast } from "sonner"
import { ArrowLeft, MessageCircle, Loader2 } from "lucide-react"

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  confirmed:         "Confirmar pedido",
  preparing:         "Iniciar preparación",
  ready_for_pickup:  "Marcar listo para retiro",
  delivered:         "Marcar como retirado",
  cancelled:         "Cancelar pedido",
}

export default function OrderDetailAdmin({
  order,
  items,
  history,
}: {
  order: Order
  items: OrderItem[]
  history: OrderStatusHistory[]
}) {
  const [notes, setNotes] = useState(order.internalNotes ?? "")
  const [isPending, start] = useTransition()

  const current = order.status as OrderStatus
  const nextActions = PICKUP_STATUS_TRANSITIONS[current] ?? []

  function handleStatus(newStatus: OrderStatus) {
    const label = ACTION_LABELS[newStatus] ?? newStatus
    if (!confirm(`¿${label}?`)) return

    start(async () => {
      const result = await updateOrderStatus(order.id, newStatus)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(`Estado: ${ORDER_STATUS_LABELS[newStatus]}`)

      if (
        newStatus === "ready_for_pickup" &&
        result.order.preferredContactChannel === "whatsapp" &&
        result.order.shippingPhone
      ) {
        const msg = buildReadyForPickupMessage(orderForWhatsApp(result.order))
        const url = getWhatsAppNotifyUrl(result.order.shippingPhone, msg)
        window.open(url, "_blank", "noopener,noreferrer")
        toast.info("Se abrió WhatsApp para avisar al cliente")
      } else if (
        newStatus === "ready_for_pickup" &&
        result.order.preferredContactChannel === "email"
      ) {
        toast.info("Avisá al cliente por email que el pedido está listo para retirar")
      }
    })
  }

  function saveNotes() {
    start(async () => {
      const result = await updateOrderInternalNotes(order.id, notes)
      if ("error" in result) toast.error(result.error)
      else toast.success("Notas guardadas")
    })
  }

  function openWhatsApp() {
    if (!order.shippingPhone) {
      toast.error("El pedido no tiene teléfono")
      return
    }
    const msg = buildReadyForPickupMessage(orderForWhatsApp(order))
    window.open(getWhatsAppNotifyUrl(order.shippingPhone, msg), "_blank", "noopener,noreferrer")
  }

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/admin/ordenes"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a órdenes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Pedido #{order.id.slice(0, 8)}
          </h1>
          <p className="text-muted-foreground text-sm font-mono">{order.id}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {FULFILLMENT_TYPE_LABELS[order.fulfillmentType]}
          </p>
        </div>
        <span
          className={`text-sm font-semibold px-3 py-1.5 rounded-full ${ORDER_STATUS_COLORS[current]}`}
        >
          {ORDER_STATUS_LABELS[current]}
        </span>
      </div>

      <div className="grid gap-6 mb-8">
        <section className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Cliente</h2>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="text-foreground">{order.shippingFullName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Teléfono</dt>
              <dd className="text-foreground">{order.shippingPhone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-foreground">{order.customerEmail}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Canal preferido</dt>
              <dd className="text-foreground">
                {order.preferredContactChannel
                  ? CONTACT_CHANNEL_LABELS[order.preferredContactChannel]
                  : "—"}
              </dd>
            </div>
            {order.pickupCode && (
              <div>
                <dt className="text-muted-foreground">Código de retiro</dt>
                <dd className="font-mono text-lg font-bold text-primary">
                  {order.pickupCode}
                </dd>
              </div>
            )}
          </dl>
          {(current === "ready_for_pickup" || order.pickupCode) &&
            order.shippingPhone && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={openWhatsApp}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Avisar por WhatsApp
              </Button>
            )}
        </section>

        <section className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Productos</h2>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{item.nameSnapshot}</p>
                  {item.variantLabelSnapshot && (
                    <p className="text-muted-foreground">{item.variantLabelSnapshot}</p>
                  )}
                  {item.skuSnapshot && (
                    <p className="text-xs text-muted-foreground font-mono">
                      SKU: {item.skuSnapshot}
                    </p>
                  )}
                  <p className="text-muted-foreground">x{item.quantity}</p>
                </div>
                <p className="font-semibold">
                  ${(parseFloat(item.priceSnapshot) * item.quantity).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-right font-bold text-lg mt-4 border-t border-border pt-4">
            Total ${parseFloat(order.total).toFixed(2)}
          </p>
        </section>

        <section className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Acciones</h2>
          <div className="flex flex-wrap gap-2">
            {nextActions.map((status) => (
              <Button
                key={status}
                type="button"
                variant={status === "cancelled" ? "outline" : "hero"}
                size="sm"
                disabled={isPending}
                onClick={() => handleStatus(status)}
                className={
                  status === "cancelled"
                    ? "text-destructive border-destructive/50"
                    : ""
                }
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  ACTION_LABELS[status] ?? ORDER_STATUS_LABELS[status]
                )}
              </Button>
            ))}
            {nextActions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay más acciones para este estado.
              </p>
            )}
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-2">Notas internas</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
            placeholder="Notas solo visibles para el equipo..."
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={isPending}
            onClick={saveNotes}
          >
            Guardar notas
          </Button>
        </section>

        {history.length > 0 && (
          <section className="bg-card rounded-2xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-4">Historial</h2>
            <ul className="space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="text-muted-foreground">
                  <span className="text-foreground">
                    {new Date(h.createdAt).toLocaleString("es-AR")}
                  </span>
                  {" — "}
                  {h.fromStatus
                    ? `${ORDER_STATUS_LABELS[h.fromStatus as OrderStatus] ?? h.fromStatus} → `
                    : ""}
                  {ORDER_STATUS_LABELS[h.toStatus as OrderStatus] ?? h.toStatus}
                  {h.note ? ` (${h.note})` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
