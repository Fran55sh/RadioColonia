export const dynamic = "force-dynamic"

import { db } from "@/db"
import { categories } from "@/db/schema"
import { asc } from "drizzle-orm"
import ProductForm from "../ProductForm"

export default async function NuevoProductoPage() {
  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.sortOrder))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-8">Nuevo producto</h1>
      <ProductForm categories={cats} />
    </div>
  )
}
