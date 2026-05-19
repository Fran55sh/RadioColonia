export const dynamic = "force-dynamic"

import { db } from "@/db"
import { categories, globalAttributes } from "@/db/schema"
import { asc } from "drizzle-orm"
import ProductForm from "../ProductForm"

export default async function NuevoProductoPage() {
  const [cats, attrs] = await Promise.all([
    db
      .select({
        id:       categories.id,
        name:     categories.name,
        parentId: categories.parentId,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder)),
    db.select().from(globalAttributes).orderBy(asc(globalAttributes.sortOrder)),
  ])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-8">Nuevo producto</h1>
      <ProductForm categories={cats} globalAttributes={attrs} />
    </div>
  )
}
