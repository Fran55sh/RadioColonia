export const dynamic = "force-dynamic"

import { db } from "@/db"
import { products, categories, productVariants } from "@/db/schema"
import { eq, ilike, and, inArray, desc, asc } from "drizzle-orm"
import ProductCard from "@/components/ProductCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Productos — Radio Colonia",
  description: "Explorá toda nuestra selección de electrónica premium.",
}

interface SearchParams {
  q?:            string
  categoria?:    string
  subcategoria?: string
  badge?:        string
  orden?:        string
  pagina?:       string
}

const PAGE_SIZE = 12

function variantLabel(attributes: unknown): string | undefined {
  if (!attributes || typeof attributes !== "object") return undefined
  const values = Object.values(attributes as Record<string, string>).filter(Boolean)
  return values.length ? values.join(" / ") : undefined
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const page  = Number(sp.pagina ?? 1)
  const offset = (page - 1) * PAGE_SIZE

  // Fetch categories for filter sidebar
  const cats = await db
    .select({
      id:       categories.id,
      slug:     categories.slug,
      name:     categories.name,
      parentId: categories.parentId,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder))

  const parentCats = cats.filter((c) => !c.parentId)

  // Build where conditions
  const conditions = [eq(products.isActive, true)]
  if (sp.q) conditions.push(ilike(products.name, `%${sp.q}%`))

  if (sp.subcategoria) {
    const sub = cats.find((c) => c.slug === sp.subcategoria)
    if (sub) conditions.push(eq(products.categoryId, sub.id))
  } else if (sp.categoria) {
    const parent = parentCats.find((c) => c.slug === sp.categoria)
    if (parent) {
      const childIds = cats.filter((c) => c.parentId === parent.id).map((c) => c.id)
      conditions.push(inArray(products.categoryId, [parent.id, ...childIds]))
    }
  }
  if (sp.badge)     conditions.push(eq(products.badge, sp.badge))

  const orderBy = sp.orden === "precio-asc"
    ? asc(products.price)
    : sp.orden === "precio-desc"
    ? desc(products.price)
    : desc(products.createdAt)

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
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(PAGE_SIZE)
    .offset(offset)

  const variants = rows.length
    ? await db
        .select({
          productId:  productVariants.productId,
          sku:        productVariants.sku,
          salePrice:  productVariants.salePrice,
          attributes: productVariants.attributes,
        })
        .from(productVariants)
        .where(inArray(productVariants.productId, rows.map((p) => p.id)))
        .orderBy(asc(productVariants.createdAt))
    : []

  const variantsByProduct = new Map<string, typeof variants>()
  for (const variant of variants) {
    const list = variantsByProduct.get(variant.productId) ?? []
    list.push(variant)
    variantsByProduct.set(variant.productId, list)
  }

  const totalRows = await db
    .select({ id: products.id })
    .from(products)
    .where(and(...conditions))
  const totalPages = Math.ceil(totalRows.length / PAGE_SIZE)

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          {sp.q
            ? `Resultados para "${sp.q}"`
            : sp.subcategoria
            ? cats.find((c) => c.slug === sp.subcategoria)?.name ?? "Productos"
            : sp.categoria
            ? parentCats.find((c) => c.slug === sp.categoria)?.name ?? "Productos"
            : "Todos los Productos"}
        </h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <h2 className="font-semibold text-foreground mb-4">Filtros</h2>

              {/* Search */}
              <form className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-2">Buscar</label>
                <div className="flex gap-2">
                  <Input
                    name="q"
                    defaultValue={sp.q}
                    placeholder="Nombre del producto..."
                    className="text-sm"
                  />
                  <Button type="submit" size="sm" variant="hero">OK</Button>
                </div>
              </form>

              {/* Categories */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Categoría</h3>
                <div className="space-y-1">
                  <Link
                    href="/productos"
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      !sp.categoria && !sp.subcategoria
                        ? "bg-primary text-white"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    Todas
                  </Link>
                  {parentCats.map((parent) => {
                    const subs = cats.filter((c) => c.parentId === parent.id)
                    const isParentActive =
                      sp.categoria === parent.slug && !sp.subcategoria
                    return (
                      <div key={parent.id}>
                        <Link
                          href={`/productos?categoria=${parent.slug}`}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isParentActive
                              ? "bg-primary text-white"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          {parent.name}
                        </Link>
                        {subs.length > 0 && (
                          <div className="ml-3 mt-1 space-y-1 border-l border-border pl-2">
                            {subs.map((sub) => (
                              <Link
                                key={sub.id}
                                href={`/productos?categoria=${parent.slug}&subcategoria=${sub.slug}`}
                                className={`block px-2 py-1.5 rounded-lg text-xs transition-colors ${
                                  sp.subcategoria === sub.slug
                                    ? "bg-primary text-white"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Ordenar por</h3>
                <div className="space-y-1">
                  {[
                    { value: "", label: "Más recientes" },
                    { value: "precio-asc",  label: "Precio: menor a mayor" },
                    { value: "precio-desc", label: "Precio: mayor a menor" },
                  ].map(({ value, label }) => {
                    const params = new URLSearchParams({
                      ...(sp.q && { q: sp.q }),
                      ...(sp.categoria && { categoria: sp.categoria }),
                      ...(sp.subcategoria && { subcategoria: sp.subcategoria }),
                      ...(value && { orden: value }),
                    })
                    return (
                      <Link
                        key={value}
                        href={`/productos?${params}`}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          (sp.orden ?? "") === value ? "bg-primary text-white" : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            {rows.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg mb-4">No se encontraron productos</p>
                <Link href="/productos">
                  <Button variant="hero">Ver todos</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                  {rows.map((product, index) => {
                    const productVariantRows = variantsByProduct.get(product.id) ?? []
                    const firstVariant = productVariantRows[0]
                    return (
                      <ProductCard
                        key={product.id}
                        id={product.id}
                        slug={product.slug}
                        image={product.image}
                        name={product.name}
                        price={
                          firstVariant?.salePrice
                            ? parseFloat(firstVariant.salePrice)
                            : parseFloat(product.price)
                        }
                        originalPrice={product.originalPrice ? parseFloat(product.originalPrice) : undefined}
                        rating={parseFloat(product.rating)}
                        reviews={product.reviews}
                        badge={product.badge}
                        sku={firstVariant?.sku}
                        variantCount={productVariantRows.length}
                        variantLabel={firstVariant ? variantLabel(firstVariant.attributes) : undefined}
                        delay={index * 0.05}
                      />
                    )
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                      const params = new URLSearchParams({
                        ...(sp.q && { q: sp.q }),
                        ...(sp.categoria && { categoria: sp.categoria }),
                        ...(sp.subcategoria && { subcategoria: sp.subcategoria }),
                        ...(sp.orden && { orden: sp.orden }),
                        pagina: String(p),
                      })
                      return (
                        <Link key={p} href={`/productos?${params}`}>
                          <Button
                            variant={p === page ? "hero" : "outline"}
                            size="sm"
                          >
                            {p}
                          </Button>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
