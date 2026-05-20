export const dynamic = "force-dynamic"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { orders, orderItems } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/order-status"
import type { OrderStatus } from "@/db/schema"

const pickupAddress =
  process.env.NEXT_PUBLIC_PICKUP_ADDRESS ?? "Radio Colonia — consultar en el local"

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return null

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, session.user.id)))
    .limit(1)

  if (!order) notFound()

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))

  const status = order.status as OrderStatus

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link
          href="/cuenta/ordenes"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a mis pedidos
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Pedido #{order.id.slice(0, 8)}
            </h1>
            <p className="text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString("es-AR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <span
            className={`text-sm font-semibold px-3 py-1.5 rounded-full ${ORDER_STATUS_COLORS[status]}`}
          >
            {ORDER_STATUS_LABELS[status]}
          </span>
        </div>

        {order.pickupCode && status === "ready_for_pickup" && (
          <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground">Código de retiro</p>
            <p className="text-2xl font-mono font-bold text-primary">{order.pickupCode}</p>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Productos
          </h2>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">{item.nameSnapshot}</p>
                  {item.variantLabelSnapshot && (
                    <p className="text-sm text-muted-foreground">
                      {item.variantLabelSnapshot}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                </div>
                <p className="font-semibold text-foreground">
                  ${(parseFloat(item.priceSnapshot) * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 mt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${parseFloat(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
              <span>Total</span>
              <span>${parseFloat(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Retiro en el local
          </h2>
          <p className="text-muted-foreground">{pickupAddress}</p>
          {order.shippingPhone && (
            <p className="text-sm text-muted-foreground mt-2">
              Contacto: {order.shippingPhone}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/productos">
            <Button variant="hero">Seguir comprando</Button>
          </Link>
          <Link href={`/pedidos/seguimiento?order=${order.id}`}>
            <Button variant="outline">Actualizar estado</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
