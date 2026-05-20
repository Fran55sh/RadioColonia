import type { Order } from "@/db/schema"

export function normalizeArgentinaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("549") && digits.length >= 12) return digits
  if (digits.startsWith("54") && digits.length >= 11) return digits
  if (digits.startsWith("0")) return `54${digits.slice(1)}`
  if (digits.length === 10) return `549${digits}`
  if (digits.length === 11 && digits.startsWith("9")) return `54${digits}`
  return `549${digits}`
}

export function buildReadyForPickupMessage(order: {
  id: string
  shippingFullName: string | null
  pickupCode: string | null
}): string {
  const shortId = order.id.slice(0, 8).toUpperCase()
  const name = order.shippingFullName ?? "Cliente"
  const code = order.pickupCode ? `\nCódigo de retiro: *${order.pickupCode}*` : ""
  const address =
    process.env.NEXT_PUBLIC_PICKUP_ADDRESS ?? "Radio Colonia (consultar dirección)"

  return (
    `Hola ${name}! Tu pedido *#${shortId}* de Radio Colonia está *listo para retirar*.${code}\n\n` +
    `Retirás en: ${address}\n\n` +
    `Gracias por tu compra.`
  )
}

export function getWhatsAppNotifyUrl(phone: string, message: string): string {
  const normalized = normalizeArgentinaPhone(phone)
  const text = encodeURIComponent(message)
  return `https://wa.me/${normalized}?text=${text}`
}

export function orderForWhatsApp(order: Order) {
  return {
    id: order.id,
    shippingFullName: order.shippingFullName,
    pickupCode: order.pickupCode,
  }
}
