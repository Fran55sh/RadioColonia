"use server"

import { db } from "@/db"
import { orders, orderItems, products } from "@/db/schema"
import { eq } from "drizzle-orm"
import { mpPreference } from "@/lib/mercadopago"
import { addressSchema } from "@/lib/validators"
import { auth } from "@/lib/auth"
import { z } from "zod"

interface CartItemInput {
  id:       string
  name:     string
  price:    number
  quantity: number
  image?:   string
}

export async function createOrder(
  addressData: z.infer<typeof addressSchema>,
  cartItems:   CartItemInput[]
) {
  if (!cartItems || cartItems.length === 0) {
    return { error: "El carrito está vacío" }
  }

  const parsed = addressSchema.safeParse(addressData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const session = await auth()
  const userId  = session?.user?.id ?? null

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const total    = subtotal

  // Create order
  const [order] = await db.insert(orders).values({
    userId,
    status:           "pending",
    subtotal:         subtotal.toFixed(2),
    shipping:         "0",
    total:            total.toFixed(2),
    shippingFullName: parsed.data.fullName,
    shippingPhone:    parsed.data.phone,
    shippingStreet:   parsed.data.street,
    shippingCity:     parsed.data.city,
    shippingProvince: parsed.data.province,
    shippingZip:      parsed.data.zip,
    shippingCountry:  parsed.data.country,
  }).returning()

  // Create order items
  await db.insert(orderItems).values(
    cartItems.map((item) => ({
      orderId:       order.id,
      productId:     item.id,
      nameSnapshot:  item.name,
      priceSnapshot: item.price.toFixed(2),
      quantity:      item.quantity,
    }))
  )

  // Create Mercado Pago preference
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
        auto_return:      "approved",
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
        statement_descriptor: "RADIO COLONIA",
      },
    })

    await db
      .update(orders)
      .set({ mpPreferenceId: preference.id })
      .where(eq(orders.id, order.id))

    return {
      orderId:       order.id,
      preferenceId:  preference.id,
      initPoint:     preference.init_point,
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
