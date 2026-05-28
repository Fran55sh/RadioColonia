export const dynamic = "force-dynamic"

import { db } from "@/db"
import { categories, globalAttributes } from "@/db/schema"
import { asc } from "drizzle-orm"
import { getAllSuppliers } from "@/server/actions/suppliers"
import ProductForm from "../ProductForm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Link2 } from "lucide-react"

export default async function NuevoProductoPage() {
  const [cats, attrs, supplierList] = await Promise.all([
    db
      .select({
        id:       categories.id,
        name:     categories.name,
        parentId: categories.parentId,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder)),
    db.select().from(globalAttributes).orderBy(asc(globalAttributes.sortOrder)),
    getAllSuppliers(),
  ])

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo producto</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Producto de catálogo con SKU universal, o vinculá solo un código de proveedor.
          </p>
        </div>
        <Link href="/admin/productos/vincular">
          <Button variant="outline" size="sm">
            <Link2 className="w-4 h-4" />
            Solo código proveedor → SKU padre
          </Button>
        </Link>
      </div>
      <ProductForm categories={cats} globalAttributes={attrs} suppliers={supplierList} />
    </div>
  )
}
