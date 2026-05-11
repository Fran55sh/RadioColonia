import Link from "next/link"
import { LucideIcon } from "lucide-react"

interface CategoryCardProps {
  slug:      string
  name:      string
  count?:    number
  delay?:    number
  icon:      LucideIcon
}

export default function CategoryCard({ slug, name, count, delay = 0, icon: Icon }: CategoryCardProps) {
  return (
    <Link
      href={`/categorias/${slug}`}
      className="group flex flex-col items-center gap-3 p-6 bg-card rounded-2xl border border-border hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in cursor-pointer"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="w-14 h-14 rounded-xl bg-gradient-silver flex items-center justify-center group-hover:bg-gradient-orange transition-all duration-300">
        <Icon className="w-7 h-7 text-charcoal group-hover:text-white transition-colors duration-300" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{name}</h3>
        {count !== undefined && (
          <p className="text-sm text-muted-foreground">{count} productos</p>
        )}
      </div>
    </Link>
  )
}
