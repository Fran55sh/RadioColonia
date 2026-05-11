import { Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function CheckoutPendientePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order } = await searchParams

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
          <Clock className="w-12 h-12 text-yellow-600" />
        </div>

        <h1 className="text-3xl font-bold text-foreground">Pago pendiente</h1>

        <p className="text-muted-foreground text-lg">
          Tu pago está siendo procesado. Te notificaremos cuando se confirme. Esto puede tardar unos minutos.
        </p>

        {order && (
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Número de pedido</p>
            <p className="font-mono text-sm text-foreground">{order}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {order && (
            <Link href={`/cuenta/ordenes/${order}`}>
              <Button variant="outline">Ver estado del pedido</Button>
            </Link>
          )}
          <Link href="/productos">
            <Button variant="hero">
              Seguir comprando
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
