import { db } from "@/db"
import { categories, products } from "@/db/schema"
import { eq, count } from "drizzle-orm"
import {
  Smartphone, Laptop, Watch, Headphones,
  Gamepad2, Camera, Tag,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import CategoryCard from "./CategoryCard"

const iconMap: Record<string, LucideIcon> = {
  Smartphone, Laptop, Watch, Headphones, Gamepad2, Camera, Tag,
}

export default async function CategoriesSection() {
  const rows = await db
    .select({
      id:       categories.id,
      slug:     categories.slug,
      name:     categories.name,
      iconName: categories.iconName,
      count:    count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(
      categories.id,
      categories.slug,
      categories.name,
      categories.iconName,
      categories.sortOrder
    )
    .orderBy(categories.sortOrder)

  return (
    <section id="categorias" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comprar por <span className="text-gradient-orange">Categoría</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explorá nuestra amplia selección de electrónica en todas las categorías
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {rows.map((cat, index) => {
            const Icon = iconMap[cat.iconName] ?? Tag
            return (
              <CategoryCard
                key={cat.id}
                slug={cat.slug}
                name={cat.name}
                count={cat.count}
                delay={index * 0.1}
                icon={Icon}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
