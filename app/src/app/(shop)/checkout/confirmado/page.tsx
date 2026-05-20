import { CheckCircle, ArrowRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function CheckoutConfirmadoPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order } = await searchParams

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-foreground">¡Pedido recibido!</h1>

        <p className="text-muted-foreground text-lg">
          Tu pedido está <strong className="text-foreground">pendiente de confirmación</strong>.
          Te contactaremos por el canal que elegiste cuando esté listo para retirar en el local.
        </p>

        {order && (
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Número de pedido</p>
            <p className="font-mono text-sm text-foreground">{order}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {order && (
            <Link href={`/pedidos/seguimiento?order=${order}`}>
              <Button variant="outline">
                <Search className="w-4 h-4 mr-2" />
                Seguir pedido
              </Button>
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
