import { redirect } from "next/navigation"

/** Reservado para Mercado Pago (ENABLE_MERCADOPAGO=true). */
export default async function CheckoutExitoPage({
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
