export const dynamic = "force-dynamic"

import { db } from "@/db"
import { products, categories, productVariants } from "@/db/schema"
import { eq, desc, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, FileSpreadsheet } from "lucide-react"
import ProductsTable from "./ProductsTable"

const parentCategory = alias(categories, "parent_category")

export default async function AdminProductosPage() {
  const rows = await db
    .select({
      id:           products.id,
      name:         products.name,
      price:        products.price,
      stock:        products.stock,
      isActive:     products.isActive,
      badge:        products.badge,
      image:        products.image,
      categoryName: categories.name,
      parentName:   parentCategory.name,
      variantCount: sql<number>`cast(count(${productVariants.id}) as int)`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(parentCategory, eq(categories.parentId, parentCategory.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .groupBy(
      products.id,
      products.name,
      products.price,
      products.stock,
      products.isActive,
      products.badge,
      products.image,
      categories.name,
      parentCategory.name
    )
    .orderBy(desc(products.createdAt))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Productos</h1>
          <p className="text-muted-foreground">{rows.length} producto(s) en total</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/productos/importar">
            <Button variant="dark">
              <FileSpreadsheet className="w-4 h-4" />
              Importar CSV
            </Button>
          </Link>
          <Link href="/admin/productos/nuevo">
            <Button variant="hero">
              <Plus className="w-4 h-4" />
              Nuevo producto
            </Button>
          </Link>
        </div>
      </div>

      <ProductsTable products={rows} />
    </div>
  )
}
