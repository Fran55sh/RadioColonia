"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getCatalogSkuExact,
  linkSupplierCodeToParentSku,
  searchCatalogSkus,
  type CatalogSkuOption,
} from "@/server/actions/variants"
import type { Supplier } from "@/db/schema"
import { toast } from "sonner"
import { Link2, Loader2, Search } from "lucide-react"

export default function LinkSupplierCodeForm({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [parentSku, setParentSku] = useState("")
  const [parentInfo, setParentInfo] = useState<CatalogSkuOption | null>(null)
  const [skuSuggestions, setSkuSuggestions] = useState<CatalogSkuOption[]>([])
  const [supplierId, setSupplierId] = useState(
    () => suppliers.find((s) => s.isActive)?.id ?? suppliers[0]?.id ?? ""
  )
  const [supplierCode, setSupplierCode] = useState("")
  const [costPrice, setCostPrice] = useState("")
  const [supplierStock, setSupplierStock] = useState(0)
  const [addToSaleStock, setAddToSaleStock] = useState(true)
  const [isPreferred, setIsPreferred] = useState(false)

  useEffect(() => {
    const q = parentSku.trim()
    if (q.length < 1) {
      setSkuSuggestions([])
      setParentInfo(null)
      return
    }

    const timer = setTimeout(async () => {
      const exact = await getCatalogSkuExact(q)
      setParentInfo(exact)

      if (q.length >= 2) {
        const list = await searchCatalogSkus(q)
        setSkuSuggestions(list)
      } else {
        setSkuSuggestions([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [parentSku])

  function pickSuggestion(s: CatalogSkuOption) {
    setParentSku(s.sku)
    setParentInfo(s)
    setSkuSuggestions([])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    start(async () => {
      const result = await linkSupplierCodeToParentSku({
        parentSku:      parentSku.trim(),
        supplierId,
        supplierCode:   supplierCode.trim(),
        costPrice:      costPrice ? parseFloat(costPrice) : null,
        supplierStock,
        addToSaleStock,
        isPreferred,
      })

      if ("error" in result && result.error) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(
        `Código "${supplierCode}" vinculado al SKU ${result.parentSku}. Stock actualizado en la tienda.`
      )
      router.push(`/admin/productos/${result.productId}`)
    })
  }

  const activeSuppliers = suppliers.filter((s) => s.isActive)

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="bg-card rounded-2xl border border-border p-8 space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
            {error}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Usá esta opción cuando recibís mercadería con el <strong>código del proveedor</strong> (ej.{" "}
          <code className="text-primary">121-1200</code>) y querés sumar stock al{" "}
          <strong>SKU de venta</strong> existente (ej. <code className="text-primary">utp6-020</code>).
        </p>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            SKU vendible *
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={parentSku}
              onChange={(e) => setParentSku(e.target.value)}
              placeholder="utp6-020"
              className="pl-9"
              list="catalog-sku-list"
              required
              autoComplete="off"
            />
            <datalist id="catalog-sku-list">
              {skuSuggestions.map((s) => (
                <option key={s.variantId} value={s.sku}>
                  {s.productName}
                </option>
              ))}
            </datalist>
          </div>
          {skuSuggestions.length > 0 && parentSku.trim() && !parentInfo && (
            <ul className="border border-border rounded-xl divide-y divide-border max-h-40 overflow-y-auto text-sm">
              {skuSuggestions.map((s) => (
                <li key={s.variantId}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted/50"
                    onClick={() => pickSuggestion(s)}
                  >
                    <span className="font-mono text-primary">{s.sku}</span>
                    <span className="text-muted-foreground"> — {s.productName}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      (stock venta: {s.stock})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {parentInfo && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">{parentInfo.productName}</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                SKU <span className="font-mono">{parentInfo.sku}</span> · Stock en tienda:{" "}
                <strong>{parentInfo.stock}</strong>
                {parentInfo.salePrice && (
                  <> · Precio variante: ${parseFloat(parentInfo.salePrice).toFixed(2)}</>
                )}
              </p>
            </div>
          )}
          {parentSku.trim() && !parentInfo && skuSuggestions.length === 0 && (
            <p className="text-xs text-amber-600">
              No se encontró ese SKU. Creá primero el producto con su SKU vendible.
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Proveedor *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Código interno del proveedor *</label>
            <Input
              value={supplierCode}
              onChange={(e) => setSupplierCode(e.target.value)}
              placeholder="121-1200"
              required
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Costo (opcional)</label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="1150"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Stock del proveedor *</label>
            <Input
              type="number"
              min={0}
              value={supplierStock}
              onChange={(e) => setSupplierStock(parseInt(e.target.value, 10) || 0)}
              required
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="accent-primary"
              checked={addToSaleStock}
              onChange={(e) => setAddToSaleStock(e.target.checked)}
            />
            Sumar este stock al <strong>SKU de venta</strong> ({parentInfo?.sku || parentSku || "…"})
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="accent-primary"
              checked={isPreferred}
              onChange={(e) => setIsPreferred(e.target.checked)}
            />
            Marcar este proveedor como preferido para compras
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" variant="hero" disabled={isPending || !parentInfo}>
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Vinculando...
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4" />
              Vincular al SKU vendible
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/productos")}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
