"use client"

import { useEffect, useState, useTransition } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Star, ShoppingCart, ArrowLeft, Truck, Shield, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/CartContext"
import { toast } from "sonner"

interface ProductDetail {
  id:            string
  slug:          string
  name:          string
  description:   string
  price:         string
  originalPrice: string | null
  image:         string
  badge:         string | null
  stock:         number
  rating:        string
  reviews:       number
  categoryName:  string | null
}

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const { addItem } = useCart()

  useEffect(() => {
    fetch(`/api/products/${params.slug}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data.product)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.slug])

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Producto no encontrado</h1>
        <Link href="/productos">
          <Button variant="hero">Ver productos</Button>
        </Link>
      </div>
    )
  }

  const price         = parseFloat(product.price)
  const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null
  const discount      = originalPrice ? Math.round((1 - price / originalPrice) * 100) : null
  const rating        = parseFloat(product.rating)

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id:    product.id,
        slug:  product.slug,
        name:  product.name,
        price,
        originalPrice: originalPrice ?? undefined,
        image: product.image,
      })
    }
    toast.success(`${product.name} agregado al carrito`)
  }

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
          <span>/</span>
          <Link href="/productos" className="hover:text-primary transition-colors">Productos</Link>
          {product.categoryName && (
            <>
              <span>/</span>
              <span>{product.categoryName}</span>
            </>
          )}
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Image */}
          <div className="relative">
            <div className="aspect-square bg-gradient-silver rounded-3xl p-8 relative overflow-hidden">
              {product.badge && (
                <span className="absolute top-6 left-6 bg-gradient-orange text-white text-sm font-semibold px-4 py-1.5 rounded-full z-10">
                  {product.badge}
                </span>
              )}
              <Image
                src={product.image}
                alt={product.name}
                width={500}
                height={500}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            {product.categoryName && (
              <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                {product.categoryName}
              </span>
            )}

            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i < Math.floor(rating) ? "fill-primary text-primary" : "text-border"}`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {rating} ({product.reviews.toLocaleString()} reseñas)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-foreground">${price.toFixed(2)}</span>
              {originalPrice && (
                <>
                  <span className="text-xl text-muted-foreground line-through">${originalPrice.toFixed(2)}</span>
                  <span className="bg-primary/10 text-primary text-sm font-semibold px-2 py-0.5 rounded-lg">
                    -{discount}%
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            <p className="text-muted-foreground text-lg leading-relaxed">{product.description}</p>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? "bg-green-500" : "bg-destructive"}`} />
              <span className="text-sm font-medium text-foreground">
                {product.stock > 0
                  ? `${product.stock} en stock`
                  : "Sin stock"}
              </span>
            </div>

            {/* Quantity + Add */}
            {product.stock > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-2">
                  <Button
                    variant="ghost" size="icon"
                    className="h-9 w-9"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                  >-</Button>
                  <span className="w-8 text-center font-medium">{qty}</span>
                  <Button
                    variant="ghost" size="icon"
                    className="h-9 w-9"
                    onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  >+</Button>
                </div>

                <Button
                  variant="hero" size="xl"
                  className="flex-1 group"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Agregar al carrito
                </Button>
              </div>
            )}

            {/* Trust features */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              {[
                { icon: Truck,       label: "Envío gratis" },
                { icon: Shield,      label: "2 años garantía" },
                { icon: RotateCcw,   label: "30 días devolución" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
