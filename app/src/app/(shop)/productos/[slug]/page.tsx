"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Star, ShoppingCart, Truck, Shield, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/CartContext"
import { toast } from "sonner"
import {
  normalizeTiers,
  resolveUnitPrice,
  type PriceTier,
} from "@/lib/quantityPricing"

interface ProductVariant {
  id:         string
  sku:        string
  stock:      number
  salePrice:  string | null
  attributes: Record<string, string>
  priceTiers: PriceTier[]
}

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

function matchesAttrs(
  variant: ProductVariant,
  selectedAttrs: Record<string, string>
): boolean {
  return Object.entries(selectedAttrs).every(
    ([k, v]) => variant.attributes[k] === v
  )
}

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>()
  const [product,  setProduct]  = useState<ProductDetail | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [attributeLabels, setAttributeLabels] = useState<Record<string, string>>({})
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(true)
  const [qty,      setQty]      = useState(1)
  const { addItem } = useCart()

  useEffect(() => {
    fetch(`/api/products/${params.slug}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data.product)
        const v: ProductVariant[] = (data.variants ?? []).map((row: ProductVariant) => ({
          ...row,
          attributes: (row.attributes ?? {}) as Record<string, string>,
          priceTiers: normalizeTiers(row.priceTiers ?? []),
        }))
        setVariants(v)
        setAttributeLabels(data.attributeLabels ?? {})
        if (v.length > 0) {
          setSelectedAttrs({ ...v[0].attributes })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.slug])

  const selected = useMemo(() => {
    if (variants.length === 0) return null
    const exact = variants.find((v) => matchesAttrs(v, selectedAttrs))
    return exact ?? variants[0]
  }, [variants, selectedAttrs])

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

  const basePrice = selected?.salePrice
    ? parseFloat(selected.salePrice)
    : parseFloat(product.price)
  const tiers = selected?.priceTiers ?? []
  const price = resolveUnitPrice(basePrice, tiers, qty)
  const tierActive = Math.abs(price - basePrice) > 0.009
  const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null
  const discount = originalPrice && !tierActive
    ? Math.round((1 - price / originalPrice) * 100)
    : null
  const rating = parseFloat(product.rating)
  const activeStock = selected ? selected.stock : 0
  const lineTotal = price * qty

  const attributeKeys = variants.length > 0
    ? Array.from(new Set(variants.flatMap((v) => Object.keys(v.attributes))))
    : []

  function attrDisplayName(slug: string) {
    return attributeLabels[slug] ?? slug
  }

  function buildVariantLabel(v: ProductVariant) {
    return Object.entries(v.attributes)
      .map(([k, val]) => `${attrDisplayName(k)}: ${val}`)
      .join(" / ")
  }

  function selectAttrValue(attrKey: string, val: string) {
    const next = { ...selectedAttrs, [attrKey]: val }
    const exact = variants.find((v) => matchesAttrs(v, next))
    if (exact) {
      setSelectedAttrs({ ...exact.attributes })
      return
    }
    const fallback = variants.find((v) => v.attributes[attrKey] === val)
    if (fallback) {
      setSelectedAttrs({ ...fallback.attributes })
    }
  }

  function isValueAvailable(attrKey: string, val: string): boolean {
    const trial = { ...selectedAttrs, [attrKey]: val }
    return variants.some(
      (v) => matchesAttrs(v, trial) && v.stock > 0
    ) || variants.some(
      (v) => v.attributes[attrKey] === val && v.stock > 0
    )
  }

  const handleAddToCart = () => {
    if (!selected) {
      toast.error("Este producto todavía no tiene un SKU vendible.")
      return
    }

    addItem({
      id:            product.id,
      slug:          product.slug,
      name:          product.name,
      basePrice,
      priceTiers:    tiers,
      originalPrice: originalPrice ?? undefined,
      image:         product.image,
      sku:           selected.sku,
      variantLabel:  buildVariantLabel(selected) || undefined,
      quantity:      qty,
    })

    toast.success(
      `${product.name}${selected ? ` (${buildVariantLabel(selected)})` : ""} agregado al carrito`
    )
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
            <div className="space-y-1">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-4xl font-bold text-foreground">${price.toFixed(2)}</span>
                {tierActive && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${basePrice.toFixed(2)}
                  </span>
                )}
                {!tierActive && originalPrice && (
                  <>
                    <span className="text-xl text-muted-foreground line-through">
                      ${originalPrice.toFixed(2)}
                    </span>
                    {discount && discount > 0 && (
                      <span className="bg-primary/10 text-primary text-sm font-semibold px-2 py-0.5 rounded-lg">
                        -{discount}%
                      </span>
                    )}
                  </>
                )}
                {tierActive && (
                  <span className="bg-primary/10 text-primary text-sm font-semibold px-2 py-0.5 rounded-lg">
                    Precio por cantidad
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Precio por unidad · Total:{" "}
                <span className="font-semibold text-foreground">${lineTotal.toFixed(2)}</span>
              </p>
            </div>

            {tiers.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left px-4 py-2 font-medium">Cantidad</th>
                      <th className="text-right px-4 py-2 font-medium">Precio unitario</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={!tierActive ? "bg-primary/5" : undefined}>
                      <td className="px-4 py-2">1+</td>
                      <td className="px-4 py-2 text-right font-medium">${basePrice.toFixed(2)}</td>
                    </tr>
                    {tiers.map((t) => {
                      const active =
                        resolveUnitPrice(basePrice, tiers, qty) === t.unitPrice &&
                        qty >= t.minQty
                      return (
                        <tr
                          key={t.minQty}
                          className={active ? "bg-primary/10" : undefined}
                        >
                          <td className="px-4 py-2">Desde {t.minQty}</td>
                          <td className="px-4 py-2 text-right font-medium">
                            ${t.unitPrice.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Description */}
            <p className="text-muted-foreground text-lg leading-relaxed">{product.description}</p>

            {/* Variant selectors */}
            {variants.length > 0 && attributeKeys.map((attrKey) => {
              const values = Array.from(
                new Set(
                  variants
                    .filter((v) => v.attributes[attrKey] !== undefined)
                    .map((v) => v.attributes[attrKey])
                )
              )

              return (
                <div key={attrKey} className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    {attrDisplayName(attrKey)}
                    {selectedAttrs[attrKey] && (
                      <span className="ml-2 text-primary font-normal">{selectedAttrs[attrKey]}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {values.map((val) => {
                      const isSelected = selectedAttrs[attrKey] === val
                      const available = isValueAvailable(attrKey, val)

                      return (
                        <button
                          key={val}
                          disabled={!available && !isSelected}
                          onClick={() => selectAttrValue(attrKey, val)}
                          className={`
                            px-4 py-2 rounded-xl text-sm font-medium border transition-all
                            ${isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary text-foreground hover:border-primary/50"}
                            ${!available && !isSelected ? "opacity-40 cursor-not-allowed line-through" : "cursor-pointer"}
                          `}
                        >
                          {val}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Stock */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${activeStock > 0 ? "bg-green-500" : "bg-destructive"}`} />
              <span className="text-sm font-medium text-foreground">
                {activeStock > 0 ? `${activeStock} en stock` : "Sin stock"}
              </span>
            </div>

            {/* Quantity + Add */}
            {activeStock > 0 && (
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
                    onClick={() => setQty(Math.min(activeStock, qty + 1))}
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
                { icon: Truck,      label: "Envío gratis" },
                { icon: Shield,     label: "2 años garantía" },
                { icon: RotateCcw,  label: "30 días devolución" },
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
