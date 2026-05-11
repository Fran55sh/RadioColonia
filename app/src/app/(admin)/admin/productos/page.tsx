export const dynamic = "force-dynamic"

import { db } from "@/db"
import { products, categories } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import ProductsTable from "./ProductsTable"

export default async function AdminProductosPage() {
  const rows = await db
    .select({
      id:         products.id,
      name:       products.name,
      price:      products.price,
      stock:      products.stock,
      isActive:   products.isActive,
      badge:      products.badge,
      image:      products.image,
      category:   categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.createdAt))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Productos</h1>
          <p className="text-muted-foreground">{rows.length} producto(s) en total</p>
        </div>
        <Link href="/admin/productos/nuevo">
          <Button variant="hero">
            <Plus className="w-4 h-4" />
            Nuevo producto
          </Button>
        </Link>
      </div>

      <ProductsTable products={rows} />
    </div>
  )
}
