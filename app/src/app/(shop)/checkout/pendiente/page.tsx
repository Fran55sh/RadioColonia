import { redirect } from "next/navigation"

/** Reservado para pagos pendientes de Mercado Pago. */
export default async function CheckoutPendientePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order } = await searchParams
  if (order) {
    redirect(`/checkout/confirmado?order=${order}`)
  }
  redirect("/checkout/confirmado")
}
