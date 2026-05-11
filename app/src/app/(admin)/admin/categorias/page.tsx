export const dynamic = "force-dynamic"

import { db } from "@/db"
import { categories } from "@/db/schema"
import { asc } from "drizzle-orm"
import CategoriesAdmin from "./CategoriesAdmin"

export default async function AdminCategoriasPage() {
  const cats = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-8">Categorías</h1>
      <CategoriesAdmin categories={cats} />
    </div>
  )
}
