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
  const allCats = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder))

  const parents = allCats.filter((c) => !c.parentId)
  const childrenByParent = new Map<string, typeof allCats>()
  for (const c of allCats) {
    if (c.parentId) {
      const list = childrenByParent.get(c.parentId) ?? []
      list.push(c)
      childrenByParent.set(c.parentId, list)
    }
  }

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Categorías</h1>
        <p className="text-muted-foreground mb-8">Explorá nuestra selección por categoría</p>
        <div className="space-y-10">
          {parents.map((parent) => {
            const Icon = iconMap[parent.iconName] ?? Tag
            const children = childrenByParent.get(parent.id) ?? []
            return (
              <section key={parent.id}>
                <Link
                  href={`/categorias/${parent.slug}`}
                  className="group flex items-center gap-4 mb-4"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-silver flex items-center justify-center group-hover:bg-gradient-orange transition-all">
                    <Icon className="w-7 h-7 text-charcoal group-hover:text-white transition-colors" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {parent.name}
                  </h2>
                </Link>
                {children.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pl-4">
                    {children.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/categorias/${parent.slug}/${sub.slug}`}
                        className="px-4 py-3 bg-card rounded-xl border border-border hover:border-primary/40 text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    href={`/categorias/${parent.slug}`}
                    className="text-sm text-primary hover:underline pl-4"
                  >
                    Ver productos →
                  </Link>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
