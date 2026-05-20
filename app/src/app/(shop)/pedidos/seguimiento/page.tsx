import { Suspense } from "react"
import TrackOrderForm from "./TrackOrderForm"

export default function SeguimientoPedidoPage() {
  return (
    <div className="py-12">
      <div className="container mx-auto px-4 max-w-lg">
        <h1 className="text-3xl font-bold text-foreground mb-2">Seguir mi pedido</h1>
        <p className="text-muted-foreground mb-8">
          Ingresá el número de pedido y el email o teléfono que usaste al comprar.
        </p>
        <Suspense fallback={<div className="text-muted-foreground">Cargando...</div>}>
          <TrackOrderForm />
        </Suspense>
      </div>
    </div>
  )
}
