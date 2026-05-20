import type { OrderStatus } from "@/db/schema"

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending:           "Pendiente de confirmación",
  confirmed:         "Confirmado",
  preparing:         "En preparación",
  ready_for_pickup:  "Listo para retirar",
  paid:              "Pagado",
  failed:            "Pago fallido",
  shipped:           "Enviado",
  delivered:         "Entregado",
  cancelled:         "Cancelado",
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending:           "bg-yellow-100 text-yellow-800",
  confirmed:         "bg-blue-100 text-blue-800",
  preparing:         "bg-indigo-100 text-indigo-800",
  ready_for_pickup:  "bg-emerald-100 text-emerald-800",
  paid:              "bg-green-100 text-green-800",
  failed:            "bg-red-100 text-red-800",
  shipped:           "bg-blue-100 text-blue-800",
  delivered:         "bg-emerald-100 text-emerald-800",
  cancelled:         "bg-gray-100 text-gray-600",
}

/** Transiciones permitidas para retiro en local (flujo sin MP). */
export const PICKUP_STATUS_TRANSITIONS: Partial<
  Record<OrderStatus, OrderStatus[]>
> = {
  pending:          ["confirmed", "cancelled"],
  confirmed:        ["preparing", "cancelled"],
  preparing:        ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["delivered", "cancelled"],
}

export function canTransitionPickup(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  const allowed = PICKUP_STATUS_TRANSITIONS[from]
  return allowed?.includes(to) ?? false
}

export function generatePickupCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000)
  return String(n)
}

export const CONTACT_CHANNEL_LABELS = {
  whatsapp: "WhatsApp",
  email:    "Email",
} as const

export const FULFILLMENT_TYPE_LABELS = {
  pickup:   "Retiro en el local",
  shipping: "Envío a domicilio",
} as const
