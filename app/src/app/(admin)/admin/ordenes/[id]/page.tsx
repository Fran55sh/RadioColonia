export const dynamic = "force-dynamic"

import { getOrderByIdAdmin } from "@/server/actions/orders"
import { notFound } from "next/navigation"
import OrderDetailAdmin from "../OrderDetailAdmin"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  const result = await getOrderByIdAdmin(id)

  if ("error" in result) notFound()

  return (
    <OrderDetailAdmin
      order={result.order}
      items={result.items}
      history={result.history}
    />
  )
}
