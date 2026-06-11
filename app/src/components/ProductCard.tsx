"use client"

import { Heart, ShoppingCart, Star } from "lucide-react"
import { Button } from "./ui/button"
import { useState } from "react"
import { useCart } from "@/contexts/CartContext"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ProductCardProps {
  id:             string
  slug:           string
  image:          string
  name:           string
  price:          number
  originalPrice?: number
  rating:         number
  reviews:        number
  badge?:         string | null
  sku?:           string | null
  variantCount?:  number
  variantLabel?:  string
  delay?:         number
}

export default function ProductCard({
  id, slug, image, name, price,
  originalPrice, rating, reviews,
  badge, sku, variantCount = 0, variantLabel, delay = 0,
}: ProductCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const { addItem } = useCart()
  const router = useRouter()

  const handleAddToCart = () => {
    if (!sku || variantCount !== 1) {
      router.push(`/productos/${slug}`)
      return
    }

    addItem({ id, slug, name, price, originalPrice, image, sku, variantLabel })
    toast.success(`${name} agregado al carrito`)
  }

  return (
    <div
      className="group bg-card rounded-2xl border border-border hover:border-primary/30 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-silver p-6 overflow-hidden">
        {badge && (
          <span className="absolute top-4 left-4 bg-gradient-orange text-white text-xs font-semibold px-3 py-1 rounded-full z-10">
            {badge}
          </span>
        )}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className="absolute top-4 right-4 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all duration-300 z-10"
        >
          <Heart className={`w-5 h-5 ${isLiked ? "fill-primary text-primary" : ""}`} />
        </button>

        <Link href={`/productos/${slug}`}>
          <Image
            src={image}
            alt={name}
            width={300}
            height={300}
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 cursor-pointer"
          />
        </Link>

        {/* Quick add */}
        <div className="absolute bottom-4 left-4 right-4 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <Button variant="hero" className="w-full" size="sm" onClick={handleAddToCart}>
            <ShoppingCart className="w-4 h-4" />
            {sku && variantCount === 1 ? "Agregar" : "Ver opciones"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.floor(rating) ? "fill-primary text-primary" : "text-border"}`}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">({reviews})</span>
        </div>

        <Link href={`/productos/${slug}`}>
          <h3 className="font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors cursor-pointer">
            {name}
          </h3>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground">${price.toFixed(2)}</span>
          {originalPrice && (
            <span className="text-sm text-muted-foreground line-through">${originalPrice.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
