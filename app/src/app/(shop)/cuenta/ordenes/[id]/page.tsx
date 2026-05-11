import { auth } from "@/lib/auth"
import { db } from "@/db"
import { orders, orderItems } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Package } from "lucide-react"
import { Button } from "@/components/ui/button"

const statusLabel: Record<string, string> = {
  pending:   "Pendiente de pago",
  paid:      "Pago confirmado",
  failed:    "Pago rechazado",
  shipped:   "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
}

const statusColor: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  paid:      "bg-green-100 text-green-800",
  failed:    "bg-red-100 text-red-800",
  shipped:   "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-gray-100 text-gray-800",
}

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

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link href="/cuenta/ordenes" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a mis pedidos
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pedido #{order.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString("es-AR", {
                year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${statusColor[order.status]}`}>
            {statusLabel[order.status]}
          </span>
        </div>

        {/* Items */}
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
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Envío</span>
              <span className="text-primary">Gratis</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
              <span>Total</span>
              <span>${parseFloat(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Shipping info */}
        {order.shippingFullName && (
          <div className="bg-card rounded-2xl border border-border p-6 mb-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Dirección de envío
            </h2>
            <div className="text-muted-foreground space-y-1">
              <p className="text-foreground font-medium">{order.shippingFullName}</p>
              <p>{order.shippingPhone}</p>
              <p>{order.shippingStreet}</p>
              <p>{order.shippingCity}, {order.shippingProvince} ({order.shippingZip})</p>
              <p>{order.shippingCountry}</p>
            </div>
          </div>
        )}

        {order.mpPaymentId && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">
              ID de pago MP: <span className="font-mono text-foreground">{order.mpPaymentId}</span>
            </p>
          </div>
        )}

        <div className="mt-8">
          <Link href="/productos">
            <Button variant="hero">Seguir comprando</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
