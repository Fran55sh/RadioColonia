export const dynamic = "force-dynamic"

import { db } from "@/db"
import { products, categories } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"
import ProductCard from "@/components/ProductCard"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ parentSlug: string; subSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subSlug } = await params
  const [cat] = await db
    .select({ name: categories.name })
    .from(categories)
    .where(eq(categories.slug, subSlug))
    .limit(1)
  return { title: cat ? `${cat.name} — Radio Colonia` : "Categoría — Radio Colonia" }
}

export default async function SubcategoryPage({ params }: Props) {
  const { parentSlug, subSlug } = await params

  const [parent] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, parentSlug))
    .limit(1)

  const [subcategory] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, subSlug))
    .limit(1)

  if (!parent || !subcategory || subcategory.parentId !== parent.id) {
    notFound()
  }

  const rows = await db
    .select({
      id:            products.id,
      slug:          products.slug,
      name:          products.name,
      price:         products.price,
      originalPrice: products.originalPrice,
      image:         products.image,
      badge:         products.badge,
      rating:        products.rating,
      reviews:       products.reviews,
    })
    .from(products)
    .where(and(eq(products.categoryId, subcategory.id), eq(products.isActive, true)))
    .orderBy(desc(products.createdAt))

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <nav className="text-sm text-muted-foreground mb-2">
            <Link href="/" className="hover:text-primary">Inicio</Link>
            <span className="mx-2">/</span>
            <Link href="/categorias" className="hover:text-primary">Categorías</Link>
            <span className="mx-2">/</span>
            <Link href={`/categorias/${parent.slug}`} className="hover:text-primary">
              {parent.name}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{subcategory.name}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{subcategory.name}</h1>
          <p className="text-muted-foreground mt-2">{rows.length} productos disponibles</p>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-4">No hay productos en esta subcategoría</p>
            <Link href={`/categorias/${parent.slug}`}>
              <Button variant="hero">Ver categoría {parent.name}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rows.map((product, index) => (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                image={product.image}
                name={product.name}
                price={parseFloat(product.price)}
                originalPrice={product.originalPrice ? parseFloat(product.originalPrice) : undefined}
                rating={parseFloat(product.rating)}
                reviews={product.reviews}
                badge={product.badge}
                delay={index * 0.05}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
