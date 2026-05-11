export const dynamic = "force-dynamic"

import { db } from "@/db"
import { orders, users } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import Link from "next/link"

const statusLabel: Record<string, string> = {
  pending: "Pendiente", paid: "Pagado", failed: "Fallido",
  shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado",
}

const statusColor: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  paid:      "bg-green-100 text-green-800",
  failed:    "bg-red-100 text-red-800",
  shipped:   "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-gray-100 text-gray-600",
}

export default async function AdminOrdenesPage() {
  const allOrders = await db
    .select({
      id:        orders.id,
      status:    orders.status,
      total:     orders.total,
      createdAt: orders.createdAt,
      userName:  users.name,
      userEmail: users.email,
      shippingFullName: orders.shippingFullName,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Órdenes</h1>
        <p className="text-muted-foreground">{allOrders.length} orden(es) en total</p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {["ID", "Cliente", "Total", "Estado", "Fecha"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allOrders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-foreground">#{order.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {order.userName ?? order.shippingFullName ?? "Anónimo"}
                    <p className="text-xs text-muted-foreground">{order.userEmail ?? ""}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-foreground">
                    ${parseFloat(order.total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[order.status]}`}>
                      {statusLabel[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("es-AR", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {allOrders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No hay órdenes aún</div>
        )}
      </div>
    </div>
  )
}
