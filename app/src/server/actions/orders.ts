"use server"

import { db } from "@/db"
import {
  orders,
  orderItems,
  orderStatusHistory,
  products,
  productVariants,
} from "@/db/schema"
import type { OrderStatus } from "@/db/schema"
import { and, desc, eq, ilike, or, sql } from "drizzle-orm"
import { mpPreference } from "@/lib/mercadopago"
import { checkoutContactSchema } from "@/lib/validators"
import type { CheckoutContactInput } from "@/lib/validators"
import { formatZodError } from "@/lib/zodErrors"
import { auth } from "@/lib/auth"
import {
  canTransitionPickup,
  generatePickupCode,
} from "@/lib/order-status"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export interface CartItemInput {
  id:            string
  name:          string
  price:         number
  quantity:      number
  image?:        string
  sku?:          string
  variantLabel?: string
}

function isMercadoPagoEnabled(): boolean {
  return process.env.ENABLE_MERCADOPAGO === "true"
}

function pricesMatch(server: number, client: number): boolean {
  return Math.abs(server - client) < 0.02
}

async function resolveLineItem(item: CartItemInput) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, item.id), eq(products.isActive, true)))
    .limit(1)

  if (!product) {
    return { error: `Producto no disponible: ${item.name}` as const }
  }

  if (item.sku?.trim()) {
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, product.id),
          eq(productVariants.sku, item.sku.trim())
        )
      )
      .limit(1)

    if (!variant) {
      return { error: `Variante no encontrada (${item.sku})` as const }
    }

    const unitPrice = variant.salePrice
      ? parseFloat(variant.salePrice)
      : parseFloat(product.price)

    if (!pricesMatch(unitPrice, item.price)) {
      return { error: `El precio de "${item.name}" cambió. Actualizá el carrito.` as const }
    }

    if (variant.stock < item.quantity) {
      return {
        error: `Stock insuficiente para "${item.name}" (${variant.stock} disponibles)`,
      } as const
    }

    return {
      ok: {
        productId:     product.id,
        name:          product.name,
        unitPrice,
        quantity:      item.quantity,
        skuSnapshot:   variant.sku,
        variantLabel:  item.variantLabel ?? null,
      },
    } as const
  }

  const unitPrice = parseFloat(product.price)
  if (!pricesMatch(unitPrice, item.price)) {
    return { error: `El precio de "${item.name}" cambió. Actualizá el carrito.` as const }
  }

  if (product.stock < item.quantity) {
    return {
      error: `Stock insuficiente para "${item.name}" (${product.stock} disponibles)`,
    } as const
  }

  return {
    ok: {
      productId:     product.id,
      name:          product.name,
      unitPrice,
      quantity:      item.quantity,
      skuSnapshot:   null as string | null,
      variantLabel:  null as string | null,
    },
  } as const
}

async function recordStatusChange(
  orderId: string,
  fromStatus: string | null,
  toStatus: string,
  changedByUserId: string | null,
  note?: string
) {
  await db.insert(orderStatusHistory).values({
    orderId,
    fromStatus,
    toStatus,
    changedByUserId,
    note: note ?? null,
  })
}

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function decrementStockForOrderTx(tx: DbTx, orderId: string) {
  const items = await tx
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))

  for (const item of items) {
    if (!item.productId) continue

    if (item.skuSnapshot) {
      await tx
        .update(productVariants)
        .set({
          stock: sql`${productVariants.stock} - ${item.quantity}`,
        })
        .where(
          and(
            eq(productVariants.productId, item.productId),
            eq(productVariants.sku, item.skuSnapshot)
          )
        )
    } else {
      await tx
        .update(products)
        .set({
          stock: sql`${products.stock} - ${item.quantity}`,
        })
        .where(eq(products.id, item.productId))
    }
  }
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return { error: "No autorizado" as const }
  }
  return { userId: session.user.id as string }
}

// ── Checkout ──────────────────────────────────────────────────────────────────

export async function createOrder(
  contactData: CheckoutContactInput,
  cartItems: CartItemInput[]
) {
  if (!cartItems?.length) {
    return { error: "El carrito está vacío" }
  }

  const parsed = checkoutContactSchema.safeParse(contactData)
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) }
  }

  const session = await auth()
  const userId  = session?.user?.id ?? null

  const resolvedLines: Array<{
    productId: string
    name: string
    unitPrice: number
    quantity: number
    skuSnapshot: string | null
    variantLabel: string | null
  }> = []

  for (const item of cartItems) {
    const result = await resolveLineItem(item)
    if ("error" in result) return { error: result.error }
    resolvedLines.push(result.ok)
  }

  const subtotal = resolvedLines.reduce(
    (s, l) => s + l.unitPrice * l.quantity,
    0
  )
  const total = subtotal

  const [order] = await db
    .insert(orders)
    .values({
      userId,
      status:                  "pending",
      fulfillmentType:         "pickup",
      subtotal:                subtotal.toFixed(2),
      shipping:                "0",
      total:                   total.toFixed(2),
      customerEmail:           parsed.data.email,
      preferredContactChannel: parsed.data.preferredContactChannel,
      shippingFullName:        parsed.data.fullName,
      shippingPhone:           parsed.data.phone,
      shippingCountry:         "Argentina",
    })
    .returning()

  await db.insert(orderItems).values(
    resolvedLines.map((line) => ({
      orderId:              order.id,
      productId:            line.productId,
      nameSnapshot:         line.name,
      priceSnapshot:        line.unitPrice.toFixed(2),
      quantity:             line.quantity,
      skuSnapshot:          line.skuSnapshot,
      variantLabelSnapshot: line.variantLabel,
    }))
  )

  await recordStatusChange(order.id, null, "pending", userId, "Pedido creado")

  if (isMercadoPagoEnabled()) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    try {
      const preference = await mpPreference.create({
        body: {
          external_reference: order.id,
          items: cartItems.map((item) => ({
            id:          item.id,
            title:       item.name,
            quantity:    item.quantity,
            unit_price:  item.price,
            currency_id: "ARS",
            picture_url: item.image ? `${appUrl}${item.image}` : undefined,
          })),
          back_urls: {
            success: `${appUrl}/checkout/exito?order=${order.id}`,
            failure: `${appUrl}/checkout/error?order=${order.id}`,
            pending: `${appUrl}/checkout/pendiente?order=${order.id}`,
          },
          auto_return:          "approved",
          notification_url:     `${appUrl}/api/webhooks/mercadopago`,
          statement_descriptor: "RADIO COLONIA",
        },
      })

      await db
        .update(orders)
        .set({ mpPreferenceId: preference.id })
        .where(eq(orders.id, order.id))

      return {
        orderId:          order.id,
        preferenceId:     preference.id,
        initPoint:        preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
      }
    } catch (err) {
      console.error("MP preference error:", err)
      return {
        orderId: order.id,
        error:   "Error al conectar con Mercado Pago",
      }
    }
  }

  revalidatePath("/admin/ordenes")
  return { success: true as const, orderId: order.id }
}

// ── Seguimiento (invitado) ────────────────────────────────────────────────────

const trackOrderSchema = z.object({
  orderId: z.string().uuid("ID de pedido inválido"),
  contact: z.string().min(3, "Ingresá email o teléfono"),
})

export async function trackGuestOrder(
  orderId: string,
  contact: string
) {
  const parsed = trackOrderSchema.safeParse({ orderId, contact })
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) }
  }

  const contactTrim = parsed.data.contact.trim()
  const isEmail = contactTrim.includes("@")

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, parsed.data.orderId))
    .limit(1)

  if (!order) {
    return { error: "No encontramos un pedido con esos datos" }
  }

  const phoneMatch =
    order.shippingPhone &&
    order.shippingPhone.replace(/\D/g, "").includes(
      contactTrim.replace(/\D/g, "").slice(-8)
    )
  const emailMatch =
    order.customerEmail &&
    order.customerEmail.toLowerCase() === contactTrim.toLowerCase()

  if (isEmail ? !emailMatch : !phoneMatch && !emailMatch) {
    return { error: "No encontramos un pedido con esos datos" }
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))

  return { order, items }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function listOrdersAdmin(filters?: {
  status?: OrderStatus
  q?: string
}) {
  const authResult = await requireAdmin()
  if ("error" in authResult) return { error: authResult.error }

  const conditions = []
  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status))
  }
  if (filters?.q?.trim()) {
    const q = `%${filters.q.trim()}%`
    conditions.push(
      or(
        ilike(orders.shippingFullName, q),
        ilike(orders.shippingPhone, q),
        ilike(orders.customerEmail, q),
        ilike(orders.id, q)
      )!
    )
  }

  const rows = await db
    .select({
      id:               orders.id,
      status:           orders.status,
      total:            orders.total,
      createdAt:        orders.createdAt,
      shippingFullName: orders.shippingFullName,
      shippingPhone:    orders.shippingPhone,
      customerEmail:    orders.customerEmail,
      preferredContactChannel: orders.preferredContactChannel,
      pickupCode:       orders.pickupCode,
      fulfillmentType:  orders.fulfillmentType,
    })
    .from(orders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt))

  return { orders: rows }
}

export async function getOrderByIdAdmin(orderId: string) {
  const authResult = await requireAdmin()
  if ("error" in authResult) return { error: authResult.error }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) return { error: "Pedido no encontrado" }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))

  const history = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(desc(orderStatusHistory.createdAt))

  return { order, items, history }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
) {
  const authResult = await requireAdmin()
  if ("error" in authResult) return { error: authResult.error }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) return { error: "Pedido no encontrado" }

  const current = order.status as OrderStatus

  if (order.fulfillmentType === "pickup") {
    if (!canTransitionPickup(current, newStatus)) {
      return {
        error: `No se puede pasar de "${current}" a "${newStatus}"`,
      }
    }
  } else if (newStatus === "cancelled") {
    // shipping: solo cancelar por ahora
    if (current === "delivered" || current === "cancelled") {
      return { error: "No se puede cancelar este pedido" }
    }
  } else {
    return { error: "Envío a domicilio aún no está habilitado" }
  }

  const now = new Date()
  const updates: Partial<typeof orders.$inferInsert> = {
    status:    newStatus,
    updatedAt: now,
  }

  if (newStatus === "confirmed") {
    updates.confirmedAt = now
  }
  if (newStatus === "ready_for_pickup") {
    updates.readyAt = now
    if (!order.pickupCode) {
      updates.pickupCode = generatePickupCode()
    }
  }
  if (newStatus === "delivered") {
    updates.deliveredAt = now
  }

  await db.transaction(async (tx) => {
    await tx.update(orders).set(updates).where(eq(orders.id, orderId))

    if (newStatus === "confirmed" && current === "pending") {
      await decrementStockForOrderTx(tx, orderId)
    }

    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus:        current,
      toStatus:          newStatus,
      changedByUserId:   authResult.userId,
      note:              note ?? null,
    })
  })

  revalidatePath("/admin/ordenes")
  revalidatePath(`/admin/ordenes/${orderId}`)
  revalidatePath("/cuenta/ordenes")
  revalidatePath(`/cuenta/ordenes/${orderId}`)
  revalidatePath("/")

  const [updated] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  return { success: true as const, order: updated! }
}

export async function updateOrderInternalNotes(
  orderId: string,
  notes: string
) {
  const authResult = await requireAdmin()
  if ("error" in authResult) return { error: authResult.error }

  await db
    .update(orders)
    .set({ internalNotes: notes.trim() || null, updatedAt: new Date() })
    .where(eq(orders.id, orderId))

  revalidatePath(`/admin/ordenes/${orderId}`)
  return { success: true as const }
}

export async function countOrdersByStatus(status: OrderStatus) {
  const authResult = await requireAdmin()
  if ("error" in authResult) return { count: 0 }

  const [row] = await db
    .select({ value: sql<number>`cast(count(*) as int)` })
    .from(orders)
    .where(eq(orders.status, status))

  return { count: row?.value ?? 0 }
}
