import { XCircle, ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function CheckoutErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order } = await searchParams

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>

        <h1 className="text-3xl font-bold text-foreground">Pago rechazado</h1>

        <p className="text-muted-foreground text-lg">
          Tu pago no pudo procesarse. Podés intentar nuevamente o usar otro método de pago.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/carrito">
            <Button variant="hero">
              <RefreshCw className="w-4 h-4" />
              Intentar nuevamente
            </Button>
          </Link>
          <Link href="/productos">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4" />
              Ver productos
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
