export const dynamic = "force-dynamic"

import { db } from "@/db"
import { products, orders, users, categories } from "@/db/schema"
import { eq, count, sum } from "drizzle-orm"
import { Package, ShoppingBag, Users, DollarSign } from "lucide-react"

export default async function AdminDashboard() {
  const [activeProducts] = await db.select({ value: count(products.id) }).from(products).where(eq(products.isActive, true))
  const [paidOrders]     = await db.select({ value: count(orders.id) }).from(orders).where(eq(orders.status, "paid"))
  const [totalRevenue]   = await db.select({ value: sum(orders.total) }).from(orders).where(eq(orders.status, "paid"))
  const [totalUsers]     = await db.select({ value: count(users.id) }).from(users).where(eq(users.role, "user"))
  const [totalCats]      = await db.select({ value: count(categories.id) }).from(categories)

  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(orders.createdAt)
    .limit(5)

  const stats = [
    { icon: Package,    label: "Productos activos", value: activeProducts.value,                   color: "bg-primary/10 text-primary" },
    { icon: ShoppingBag,label: "Pedidos pagados",   value: paidOrders.value,                       color: "bg-green-100 text-green-700" },
    { icon: DollarSign, label: "Ingresos totales",  value: `$${parseFloat(String(totalRevenue.value ?? "0")).toFixed(2)}`, color: "bg-blue-100 text-blue-700" },
    { icon: Users,      label: "Usuarios",          value: totalUsers.value,                       color: "bg-purple-100 text-purple-700" },
  ]

  const statusLabel: Record<string, string> = {
    pending: "Pendiente", paid: "Pagado", failed: "Fallido",
    shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado",
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-8">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card rounded-2xl border border-border p-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-card rounded-2xl border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Órdenes recientes</h2>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay órdenes aún</div>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-mono text-sm text-foreground">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-foreground">${parseFloat(order.total).toFixed(2)}</span>
                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                    {statusLabel[order.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
