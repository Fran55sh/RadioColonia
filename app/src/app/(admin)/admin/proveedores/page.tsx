export const dynamic = "force-dynamic"

import { getAllSuppliers } from "@/server/actions/suppliers"
import SuppliersAdmin from "./SuppliersAdmin"

export default async function ProveedoresPage() {
  const suppliers = await getAllSuppliers()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-2">Proveedores</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Gestioná proveedores y sus códigos internos desde cada producto/variante (SKU universal).
      </p>
      <SuppliersAdmin suppliers={suppliers} />
    </div>
  )
}
