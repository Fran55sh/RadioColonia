import { NextResponse } from "next/server"
import { db } from "@/db"
import { products, categories } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const [product] = await db
    .select({
      id:            products.id,
      slug:          products.slug,
      name:          products.name,
      description:   products.description,
      price:         products.price,
      originalPrice: products.originalPrice,
      image:         products.image,
      badge:         products.badge,
      stock:         products.stock,
      rating:        products.rating,
      reviews:       products.reviews,
      categoryName:  categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1)

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ product })
}
