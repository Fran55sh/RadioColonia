"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  CONTACT_CHANNEL_LABELS,
} from "@/lib/order-status"
import type { OrderStatus } from "@/db/schema"

export interface AdminOrderRow {
  id: string
  status: OrderStatus
  total: string
  createdAt: Date
  shippingFullName: string | null
  shippingPhone: string | null
  customerEmail: string | null
  preferredContactChannel: "whatsapp" | "email" | null
  pickupCode: string | null
  fulfillmentType: "pickup" | "shipping"
}

const FILTER_STATUSES: Array<OrderStatus | "all"> = [
  "all",
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "delivered",
  "cancelled",
]

export default function OrdersAdminTable({
  orders,
  initialStatus,
  initialQ,
}: {
  orders: AdminOrderRow[]
  initialStatus: string
  initialQ: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(initialQ)
  const [isPending, start] = useTransition()

  function applyFilters(status: string) {
    start(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (status === "all") params.delete("status")
      else params.set("status", status)
      if (q.trim()) params.set("q", q.trim())
      else params.delete("q")
      router.push(`/admin/ordenes?${params.toString()}`)
    })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    applyFilters(searchParams.get("status") ?? "all")
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Buscar nombre, teléfono, email o ID..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          Buscar
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTER_STATUSES.map((s) => (
          <Button
            key={s}
            type="button"
            variant={initialStatus === s ? "default" : "outline"}
            size="sm"
            disabled={isPending}
            onClick={() => applyFilters(s)}
          >
            {s === "all" ? "Todas" : ORDER_STATUS_LABELS[s]}
          </Button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {["ID", "Cliente", "Contacto", "Total", "Estado", "Fecha", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-foreground">
                      #{order.id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {order.shippingFullName ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    <p>{order.shippingPhone}</p>
                    <p className="text-xs">{order.customerEmail}</p>
                    {order.preferredContactChannel && (
                      <span className="text-xs">
                        {CONTACT_CHANNEL_LABELS[order.preferredContactChannel]}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-foreground">
                    ${parseFloat(order.total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("es-AR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/ordenes/${order.id}`}>
                      <Button variant="outline" size="sm">
                        Ver
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No hay órdenes con estos filtros
          </div>
        )}
      </div>
    </div>
  )
}
