export const dynamic = "force-dynamic"

import { db } from "@/db"
import { products, categories } from "@/db/schema"
import { eq, asc } from "drizzle-orm"
import { notFound } from "next/navigation"
import ProductForm from "../ProductForm"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProductoPage({ params }: Props) {
  const { id } = await params

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  if (!product) notFound()

  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.sortOrder))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-8">Editar producto</h1>
      <ProductForm categories={cats} product={product} />
    </div>
  )
}
