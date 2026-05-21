export const dynamic = "force-dynamic"

import { Suspense } from "react"
import { listOrdersAdmin } from "@/server/actions/orders"
import type { OrderStatus } from "@/db/schema"
import OrdersAdminTable from "./OrdersAdminTable"

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "paid",
  "failed",
  "shipped",
  "delivered",
  "cancelled",
]

export default async function AdminOrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status: statusParam, q } = await searchParams
  const statusFilter =
    statusParam && VALID_STATUSES.includes(statusParam as OrderStatus)
      ? (statusParam as OrderStatus)
      : undefined

  const result = await listOrdersAdmin({
    status: statusFilter,
    q: q ?? undefined,
  })

  const orders = "orders" in result ? (result.orders ?? []) : []

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Órdenes</h1>
        <p className="text-muted-foreground">
          {orders.length} pedido(s) — retiro en local
        </p>
      </div>

      <Suspense fallback={<div className="text-muted-foreground">Cargando...</div>}>
        <OrdersAdminTable
          orders={orders as Parameters<typeof OrdersAdminTable>[0]["orders"]}
          initialStatus={statusFilter ?? "all"}
          initialQ={q ?? ""}
        />
      </Suspense>
    </div>
  )
}
