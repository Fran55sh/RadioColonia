export const dynamic = "force-dynamic"

import { db } from "@/db"
import { products, orders, users } from "@/db/schema"
import { eq, count, sum, inArray } from "drizzle-orm"
import { Package, Users, Clock, MapPin } from "lucide-react"
import Link from "next/link"
import { ORDER_STATUS_LABELS } from "@/lib/order-status"
import type { OrderStatus } from "@/db/schema"

export default async function AdminDashboard() {
  const [activeProducts] = await db
    .select({ value: count(products.id) })
    .from(products)
    .where(eq(products.isActive, true))

  const [pendingOrders] = await db
    .select({ value: count(orders.id) })
    .from(orders)
    .where(eq(orders.status, "pending"))

  const [readyPickup] = await db
    .select({ value: count(orders.id) })
    .from(orders)
    .where(eq(orders.status, "ready_for_pickup"))

  const [totalUsers] = await db
    .select({ value: count(users.id) })
    .from(users)
    .where(eq(users.role, "user"))

  const revenueStatuses = [
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "delivered",
    "paid",
  ] as const

  const [totalRevenue] = await db
    .select({ value: sum(orders.total) })
    .from(orders)
    .where(inArray(orders.status, [...revenueStatuses]))

  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(orders.createdAt)
    .limit(5)

  const stats = [
    {
      icon: Clock,
      label: "Pendientes de confirmar",
      value: pendingOrders.value,
      color: "bg-yellow-100 text-yellow-800",
      href: "/admin/ordenes?status=pending",
    },
    {
      icon: MapPin,
      label: "Listos para retiro",
      value: readyPickup.value,
      color: "bg-emerald-100 text-emerald-800",
      href: "/admin/ordenes?status=ready_for_pickup",
    },
    {
      icon: Package,
      label: "Productos activos",
      value: activeProducts.value,
      color: "bg-primary/10 text-primary",
      href: "/admin/productos",
    },
    {
      icon: Users,
      label: "Usuarios",
      value: totalUsers.value,
      color: "bg-purple-100 text-purple-700",
      href: undefined,
    },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Ventas confirmadas (sin cancelados): $
        {parseFloat(String(totalRevenue.value ?? "0")).toFixed(2)}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map(({ icon: Icon, label, value, color, href }) => {
          const card = (
            <div className="bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          )
          return href ? (
            <Link key={label} href={href}>
              {card}
            </Link>
          ) : (
            <div key={label}>{card}</div>
          )
        })}
      </div>

      <div className="bg-card rounded-2xl border border-border">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Órdenes recientes</h2>
          <Link
            href="/admin/ordenes"
            className="text-sm text-primary hover:underline"
          >
            Ver todas
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay órdenes aún</div>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/ordenes/${order.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
              >
                <div>
                  <p className="font-mono text-sm text-foreground">
                    #{order.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.shippingFullName} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-foreground">
                    ${parseFloat(order.total).toFixed(2)}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                    {ORDER_STATUS_LABELS[order.status as OrderStatus] ??
                      order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
