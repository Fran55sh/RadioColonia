export const dynamic = "force-dynamic"

import { db } from "@/db"
import { products, categories } from "@/db/schema"
import { eq, ilike, and, or, desc, asc } from "drizzle-orm"
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
  q?:           string
  categoria?:   string
  badge?:       string
  orden?:       string
  pagina?:      string
}

const PAGE_SIZE = 12

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
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.sortOrder))

  // Build where conditions
  const conditions = [eq(products.isActive, true)]
  if (sp.q)         conditions.push(ilike(products.name, `%${sp.q}%`))
  if (sp.categoria) {
    const cat = cats.find((c) => c.slug === sp.categoria)
    if (cat) conditions.push(eq(products.categoryId, cat.id))
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
            : sp.categoria
            ? cats.find((c) => c.slug === sp.categoria)?.name ?? "Productos"
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
                      !sp.categoria ? "bg-primary text-white" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    Todas
                  </Link>
                  {cats.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/productos?categoria=${cat.slug}`}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        sp.categoria === cat.slug ? "bg-primary text-white" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {cat.name}
                    </Link>
                  ))}
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                      const params = new URLSearchParams({
                        ...(sp.q && { q: sp.q }),
                        ...(sp.categoria && { categoria: sp.categoria }),
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
