export const dynamic = "force-dynamic"

import { db } from "@/db"
import { categories } from "@/db/schema"
import { asc } from "drizzle-orm"
import Link from "next/link"
import { Smartphone, Laptop, Watch, Headphones, Gamepad2, Camera, Tag } from "lucide-react"
import type { LucideIcon } from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  Smartphone, Laptop, Watch, Headphones, Gamepad2, Camera, Tag,
}

export default async function CategoriasPage() {
  const cats = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder))

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Categorías</h1>
        <p className="text-muted-foreground mb-8">Explorá nuestra selección por categoría</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {cats.map((cat) => {
            const Icon = iconMap[cat.iconName] ?? Tag
            return (
              <Link
                key={cat.id}
                href={`/categorias/${cat.slug}`}
                className="group flex flex-col items-center gap-4 p-8 bg-card rounded-2xl border border-border hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-silver flex items-center justify-center group-hover:bg-gradient-orange transition-all duration-300">
                  <Icon className="w-8 h-8 text-charcoal group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-lg">
                  {cat.name}
                </h3>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
