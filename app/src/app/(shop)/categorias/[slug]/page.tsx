export const dynamic = "force-dynamic"

import { db } from "@/db"
import { products, categories } from "@/db/schema"
import { eq, and, desc, inArray } from "drizzle-orm"
import ProductCard from "@/components/ProductCard"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { cardPriceProps, loadVariantsAndTiers } from "@/lib/listingVariants"

interface Props {
  params: Promise<{ slug: string }>
}

function variantLabel(attributes: unknown): string | undefined {
  if (!attributes || typeof attributes !== "object") return undefined
  const values = Object.values(attributes as Record<string, string>).filter(Boolean)
  return values.length ? values.join(" / ") : undefined
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [cat] = await db
    .select({ name: categories.name })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1)
  return { title: cat ? `${cat.name} — Radio Colonia` : "Categoría — Radio Colonia" }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1)

  if (!category) notFound()

  const subcategories = category.parentId
    ? []
    : await db
        .select()
        .from(categories)
        .where(eq(categories.parentId, category.id))
        .orderBy(categories.sortOrder)

  const categoryIds =
    !category.parentId && subcategories.length > 0
      ? [category.id, ...subcategories.map((s) => s.id)]
      : [category.id]

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
    .where(
      and(
        inArray(products.categoryId, categoryIds),
        eq(products.isActive, true)
      )
    )
    .orderBy(desc(products.createdAt))

  const { variantsByProduct, tiersByVariantId } = await loadVariantsAndTiers(
    rows.map((p) => p.id)
  )

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <nav className="text-sm text-muted-foreground mb-2">
            <Link href="/" className="hover:text-primary">Inicio</Link>
            <span className="mx-2">/</span>
            <Link href="/categorias" className="hover:text-primary">Categorías</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{category.name}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{category.name}</h1>
          <p className="text-muted-foreground mt-2">{rows.length} productos disponibles</p>

          {subcategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/categorias/${category.slug}/${sub.slug}`}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm hover:border-primary hover:text-primary transition-colors"
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-4">No hay productos en esta categoría</p>
            <Link href="/productos">
              <Button variant="hero">Ver todos los productos</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rows.map((product, index) => {
              const productVariantRows = variantsByProduct.get(product.id) ?? []
              const firstVariant = productVariantRows[0]
              const display = cardPriceProps(
                product.price,
                productVariantRows,
                tiersByVariantId
              )
              return (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  slug={product.slug}
                  image={product.image}
                  name={product.name}
                  price={display.price}
                  priceMin={display.priceMin}
                  priceMax={display.priceMax}
                  originalPrice={product.originalPrice ? parseFloat(product.originalPrice) : undefined}
                  rating={parseFloat(product.rating)}
                  reviews={product.reviews}
                  badge={product.badge}
                  sku={firstVariant?.sku}
                  variantCount={productVariantRows.length}
                  variantLabel={firstVariant ? variantLabel(firstVariant.attributes) : undefined}
                  basePrice={
                    firstVariant?.salePrice
                      ? parseFloat(firstVariant.salePrice)
                      : parseFloat(product.price)
                  }
                  priceTiers={
                    firstVariant ? (tiersByVariantId[firstVariant.id] ?? []) : []
                  }
                  delay={index * 0.05}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
