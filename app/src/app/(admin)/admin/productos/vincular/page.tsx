export const dynamic = "force-dynamic"

import Link from "next/link"
import { getAllSuppliers } from "@/server/actions/suppliers"
import LinkSupplierCodeForm from "../LinkSupplierCodeForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function VincularCodigoPage() {
  const suppliers = await getAllSuppliers()

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/productos">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver a productos
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Vincular código de proveedor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Asigná un código interno (ej. 121-1200) a un SKU de venta existente (ej. utp6-020).
        </p>
      </div>
      <LinkSupplierCodeForm suppliers={suppliers} />
    </div>
  )
}
