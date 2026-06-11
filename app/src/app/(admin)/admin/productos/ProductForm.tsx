"use client"

import { useState, useTransition, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createProduct, updateProduct } from "@/server/actions/products"
import { toast } from "sonner"
import { Upload, Loader2 } from "lucide-react"
import type { GlobalAttribute, Product, ProductSupplierOffer, ProductVariant, Supplier } from "@/db/schema"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LinkSupplierCodeForm from "./LinkSupplierCodeForm"
import ProductVariantsEditor, {
  buildInitialVariants,
  createEmptyVariantRow,
  getEnabledSlugsFromVariants,
  variantsToPayload,
  type VariantRow,
} from "./ProductVariantsEditor"

function initialVariantRows(
  product: Product | undefined,
  initialVariants: ProductVariant[],
  offersByVariantId: Record<string, ProductSupplierOffer[]>,
  suppliers: Supplier[]
): VariantRow[] {
  const built = buildInitialVariants(initialVariants, offersByVariantId)
  if (built.length > 0) return built
  if (!product) return [createEmptyVariantRow(suppliers)]
  return [
    createEmptyVariantRow(suppliers, {
      stock: product.stock,
    }),
  ]
}

export interface CategoryOption {
  id:       string
  name:     string
  parentId: string | null
}

export default function ProductForm({
  categories,
  globalAttributes,
  suppliers,
  product,
  initialVariants = [],
  initialOffersByVariantId = {},
}: {
  categories:       CategoryOption[]
  globalAttributes: GlobalAttribute[]
  suppliers:        Supplier[]
  product?:         Product
  initialVariants?: ProductVariant[]
  initialOffersByVariantId?: Record<string, ProductSupplierOffer[]>
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, start] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState(product?.image ?? "")
  const [error, setError] = useState<string | null>(null)

  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  )

  const initialCategory = product?.categoryId
    ? categories.find((c) => c.id === product.categoryId)
    : null

  const [parentCategoryId, setParentCategoryId] = useState<string>(
    initialCategory?.parentId ?? initialCategory?.id ?? ""
  )
  const [subcategoryId, setSubcategoryId] = useState<string>(
    initialCategory?.parentId ? initialCategory.id : ""
  )

  const subcategories = useMemo(
    () => categories.filter((c) => c.parentId === parentCategoryId),
    [categories, parentCategoryId]
  )

  const effectiveCategoryId = subcategoryId || parentCategoryId || ""

  const [variants, setVariants] = useState<VariantRow[]>(() =>
    initialVariantRows(product, initialVariants, initialOffersByVariantId, suppliers)
  )
  const [enabledAttributeSlugs, setEnabledAttributeSlugs] = useState<string[]>(() =>
    getEnabledSlugsFromVariants(initialVariants)
  )

  useEffect(() => {
    if (subcategories.length === 0) {
      setSubcategoryId("")
    } else if (subcategoryId && !subcategories.find((s) => s.id === subcategoryId)) {
      setSubcategoryId("")
    }
  }, [parentCategoryId, subcategories, subcategoryId])

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
    fd.set("categoryId", effectiveCategoryId)

    const variantPayload = variantsToPayload(variants)
    if (variantPayload.length === 0) {
      setError("Cargá al menos un SKU vendible con stock.")
      return
    }

    const totalStock = variantPayload.reduce((sum, v) => sum + v.stock, 0)
    fd.set("stock", String(totalStock))

    start(async () => {
      const result = product
        ? await updateProduct(product.id, fd, variantPayload)
        : await createProduct(fd, variantPayload)

      if ("error" in result && result.error) {
        setError(
          "details" in result && result.details?.length
            ? `${result.error}: ${result.details.join(" ")}`
            : result.error
        )
      } else {
        toast.success(product ? "Producto actualizado" : "Producto creado")
        if (!product && "productId" in result && result.productId) {
          router.push(`/admin/productos/${result.productId}`)
        } else {
          router.push("/admin/productos")
        }
      }
    })
  }

  if (!product) {
    return (
      <Tabs defaultValue="catalog" className="max-w-3xl flex flex-col">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="catalog" className="flex-1">
            Producto nuevo
          </TabsTrigger>
          <TabsTrigger value="link" className="flex-1">
            Código proveedor → SKU vendible
          </TabsTrigger>
        </TabsList>
        <TabsContent value="catalog">
          {renderCatalogForm()}
        </TabsContent>
        <TabsContent value="link">
          <LinkSupplierCodeForm suppliers={suppliers} />
        </TabsContent>
      </Tabs>
    )
  }

  return renderCatalogForm()

  function renderCatalogForm() {
    return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      <div className="bg-card rounded-2xl border border-border p-8 space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
            {error}
          </div>
        )}

        <h2 className="text-lg font-semibold text-foreground">Información general</h2>

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
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (máx. 10MB)</p>
            </div>
            {uploading && <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Nombre *</label>
          <Input name="name" defaultValue={product?.name} placeholder="Pro Max Smartphone 256GB" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Descripción *</label>
          <textarea
            name="description"
            defaultValue={product?.description}
            placeholder="Descripción del producto..."
            required
            rows={3}
            className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary resize-none"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Precio base *</label>
            <Input name="price" type="number" step="0.01" min="0" defaultValue={product?.price} required />
            <p className="text-xs text-muted-foreground mt-1">
              Precio de lista del producto. Si una variante no tiene precio propio, usa este valor.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Precio original</label>
            <Input name="originalPrice" type="number" step="0.01" min="0" defaultValue={product?.originalPrice ?? ""} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Badge</label>
          <Input name="badge" defaultValue={product?.badge ?? ""} placeholder="Nuevo, Sale..." />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Categoría</label>
            <select
              value={parentCategoryId}
              onChange={(e) => {
                setParentCategoryId(e.target.value)
                setSubcategoryId("")
              }}
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Sin categoría</option>
              {parentCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Subcategoría</label>
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={!parentCategoryId || subcategories.length === 0}
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">
                {subcategories.length === 0 ? "Sin subcategorías" : "Todas / general"}
              </option>
              {subcategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

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

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            name="isActive"
            id="isActive"
            defaultChecked={product?.isActive ?? true}
            className="w-4 h-4 accent-primary rounded"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-foreground">
            Producto activo
          </label>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">SKU vendible y proveedores</h2>
        <p className="text-sm text-muted-foreground">
          Cada fila es un <strong>SKU vendible</strong> (ej. utp6-020): la unidad que se escanea en POS y descuenta stock en la tienda.
          El stock se carga acá, no en la información general. Debajo podés vincular{" "}
          <strong>códigos internos del proveedor</strong> (ej. lta020) con costo y stock de compra.
          Si solo tenés un código de proveedor para un SKU que ya existe, usá la pestaña{" "}
          <strong>Código proveedor → SKU vendible</strong>.
        </p>
        <ProductVariantsEditor
          globalAttributes={globalAttributes}
          suppliers={suppliers}
          enabledAttributeSlugs={enabledAttributeSlugs}
          onEnabledAttributesChange={setEnabledAttributeSlugs}
          variants={variants}
          onVariantsChange={setVariants}
          minVariants={1}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" variant="hero" disabled={isPending || uploading}>
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
            </>
          ) : product ? (
            "Actualizar"
          ) : (
            "Crear producto"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/productos")}>
          Cancelar
        </Button>
      </div>
    </form>
    )
  }
}
