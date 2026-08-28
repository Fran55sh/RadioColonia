import { db } from "@/db"
import { products } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { ArrowRight } from "lucide-react"
import { Button } from "./ui/button"
import ProductCard from "./ProductCard"
import Link from "next/link"
import { cardPriceProps, loadVariantsAndTiers } from "@/lib/listingVariants"

function variantLabel(attributes: unknown): string | undefined {
  if (!attributes || typeof attributes !== "object") return undefined
  const values = Object.values(attributes as Record<string, string>).filter(Boolean)
  return values.length ? values.join(" / ") : undefined
}

export default async function ProductsSection() {
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
    .where(eq(products.isActive, true))
    .orderBy(desc(products.createdAt))
    .limit(6)

  const { variantsByProduct, tiersByVariantId } = await loadVariantsAndTiers(
    rows.map((p) => p.id)
  )

  return (
    <section id="products" className="py-16 md:py-24 bg-muted">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Productos <span className="text-gradient-orange">Destacados</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              Selección especial de nuestros electrónicos más populares
            </p>
          </div>
          <Link href="/productos">
            <Button variant="outline" className="self-start md:self-auto group">
              Ver todos
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((product, index) => {
            const productVariants = variantsByProduct.get(product.id) ?? []
            const firstVariant = productVariants[0]
            const display = cardPriceProps(
              product.price,
              productVariants,
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
                variantCount={productVariants.length}
                variantLabel={firstVariant ? variantLabel(firstVariant.attributes) : undefined}
                basePrice={
                  firstVariant?.salePrice
                    ? parseFloat(firstVariant.salePrice)
                    : parseFloat(product.price)
                }
                priceTiers={
                  firstVariant ? (tiersByVariantId[firstVariant.id] ?? []) : []
                }
                delay={index * 0.1}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
