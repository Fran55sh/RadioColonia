export const dynamic = "force-dynamic"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { orders } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import Link from "next/link"
import { Package, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const statusLabel: Record<string, string> = {
  pending:   "Pendiente",
  paid:      "Pagado",
  failed:    "Fallido",
  shipped:   "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
}

const statusColor: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  paid:      "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  failed:    "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  shipped:   "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
}

export default async function OrdenesPage() {
  const session = await auth()
  if (!session?.user) return null

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.createdAt))

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mis pedidos</h1>
        <p className="text-muted-foreground mb-8">{userOrders.length} pedido(s) en total</p>

        {userOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Aún no tenés pedidos</h2>
            <p className="text-muted-foreground mb-6">Explorá nuestros productos y hacé tu primer compra</p>
            <Link href="/productos">
              <Button variant="hero">Ver productos</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {userOrders.map((order) => (
              <Link key={order.id} href={`/cuenta/ordenes/${order.id}`}>
                <div className="bg-card rounded-2xl border border-border p-5 hover:border-primary/40 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColor[order.status]}`}>
                          {statusLabel[order.status]}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("es-AR", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-foreground">${parseFloat(order.total).toFixed(2)}</span>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
