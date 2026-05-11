"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createProduct, updateProduct } from "@/server/actions/products"
import { toast } from "sonner"
import { Upload, Loader2 } from "lucide-react"
import type { Product } from "@/db/schema"

interface CategoryOption { id: string; name: string }

export default function ProductForm({
  categories,
  product,
}: {
  categories: CategoryOption[]
  product?:   Product
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, start] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState(product?.image ?? "")
  const [error, setError] = useState<string | null>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    const data = await res.json()
    if (data.url) {
      setImageUrl(data.url)
      toast.success("Imagen subida")
    } else {
      toast.error("Error al subir imagen")
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set("image", imageUrl)
    fd.set("isActive", fd.get("isActive") ? "true" : "false")

    start(async () => {
      const result = product
        ? await updateProduct(product.id, fd)
        : await createProduct(fd)

      if (result.error) {
        setError(result.error)
      } else {
        toast.success(product ? "Producto actualizado" : "Producto creado")
        router.push("/admin/productos")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 bg-card rounded-2xl border border-border p-8">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Image upload */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Imagen del producto</label>
        <div
          className="flex items-center gap-4 p-4 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          {imageUrl ? (
            <div className="w-20 h-20 rounded-lg bg-gradient-silver overflow-hidden flex-shrink-0">
              <Image src={imageUrl} alt="Preview" width={80} height={80} className="w-full h-full object-contain p-1" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {uploading ? "Subiendo..." : "Hacé clic para subir imagen"}
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (máx. 10MB). Se convierte a WebP 800px.</p>
          </div>
          {uploading && <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <input type="hidden" name="image" value={imageUrl} />
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Nombre *</label>
        <Input name="name" defaultValue={product?.name} placeholder="Pro Max Smartphone 256GB" required />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Descripción *</label>
        <textarea
          name="description"
          defaultValue={product?.description}
          placeholder="Descripción del producto..."
          required
          rows={3}
          className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-50 transition-colors resize-none"
        />
      </div>

      {/* Price + Original Price */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Precio *</label>
          <Input name="price" type="number" step="0.01" min="0" defaultValue={product?.price} placeholder="999.99" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Precio original (opcional)</label>
          <Input name="originalPrice" type="number" step="0.01" min="0" defaultValue={product?.originalPrice ?? ""} placeholder="1199.99" />
        </div>
      </div>

      {/* Stock + Badge */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Stock *</label>
          <Input name="stock" type="number" min="0" defaultValue={product?.stock} placeholder="50" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Badge (opcional)</label>
          <Input name="badge" defaultValue={product?.badge ?? ""} placeholder="Nuevo, Sale, -30%..." />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Categoría</label>
        <select
          name="categoryId"
          defaultValue={product?.categoryId ?? ""}
          className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
        >
          <option value="">Sin categoría</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Rating + Reviews */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Rating (0-5)</label>
          <Input name="rating" type="number" step="0.1" min="0" max="5" defaultValue={product?.rating ?? "0"} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Reviews</label>
          <Input name="reviews" type="number" min="0" defaultValue={product?.reviews ?? 0} />
        </div>
      </div>

      {/* Active */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          name="isActive"
          id="isActive"
          defaultChecked={product?.isActive ?? true}
          className="w-4 h-4 accent-primary rounded"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-foreground">
          Producto activo (visible en la tienda)
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="hero" disabled={isPending || uploading}>
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : (product ? "Actualizar" : "Crear producto")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/productos")}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
