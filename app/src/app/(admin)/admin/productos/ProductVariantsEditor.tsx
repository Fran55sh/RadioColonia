"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"
import type { GlobalAttribute, ProductSupplierOffer, ProductVariant, Supplier } from "@/db/schema"

export interface SupplierOfferRow {
  id?: string
  supplierId: string
  supplierCode: string
  costPrice: string
  stock: number
  isPreferred: boolean
}

export interface VariantRow {
  id?: string
  sku: string
  stock: number
  salePrice: string
  attributes: Record<string, string>
  supplierOffers: SupplierOfferRow[]
}

interface ProductVariantsEditorProps {
  globalAttributes: GlobalAttribute[]
  suppliers: Supplier[]
  enabledAttributeSlugs: string[]
  onEnabledAttributesChange: (slugs: string[]) => void
  variants: VariantRow[]
  onVariantsChange: (variants: VariantRow[]) => void
}

function offerToRow(o: ProductSupplierOffer): SupplierOfferRow {
  return {
    id:           o.id,
    supplierId:   o.supplierId,
    supplierCode: o.supplierCode,
    costPrice:    o.costPrice ?? "",
    stock:        o.stock,
    isPreferred:  o.isPreferred,
  }
}

export function buildInitialVariants(
  initial?: ProductVariant[],
  offersByVariantId?: Record<string, ProductSupplierOffer[]>
): VariantRow[] {
  if (!initial?.length) return []
  return initial.map((v) => ({
    id:              v.id,
    sku:             v.sku,
    stock:           v.stock,
    salePrice:       v.salePrice ?? "",
    attributes:      (v.attributes ?? {}) as Record<string, string>,
    supplierOffers:  (offersByVariantId?.[v.id] ?? []).map(offerToRow),
  }))
}

export function getEnabledSlugsFromVariants(variants: ProductVariant[]): string[] {
  const slugs = new Set<string>()
  for (const v of variants) {
    const attrs = (v.attributes ?? {}) as Record<string, string>
    Object.keys(attrs).forEach((k) => slugs.add(k))
  }
  return Array.from(slugs)
}

function emptyOffer(suppliers: Supplier[]): SupplierOfferRow {
  const preferred = suppliers.find((s) => s.isActive) ?? suppliers[0]
  return {
    supplierId:   preferred?.id ?? "",
    supplierCode: "",
    costPrice:    "",
    stock:        0,
    isPreferred:  true,
  }
}

export default function ProductVariantsEditor({
  globalAttributes,
  suppliers,
  enabledAttributeSlugs,
  onEnabledAttributesChange,
  variants,
  onVariantsChange,
}: ProductVariantsEditorProps) {
  function toggleAttribute(slug: string) {
    if (enabledAttributeSlugs.includes(slug)) {
      onEnabledAttributesChange(enabledAttributeSlugs.filter((s) => s !== slug))
      onVariantsChange(
        variants.map((v) => {
          const { [slug]: _, ...rest } = v.attributes
          return { ...v, attributes: rest }
        })
      )
    } else {
      onEnabledAttributesChange([...enabledAttributeSlugs, slug])
    }
  }

  function addVariant() {
    const emptyAttrs: Record<string, string> = {}
    for (const slug of enabledAttributeSlugs) {
      emptyAttrs[slug] = ""
    }
    onVariantsChange([
      ...variants,
      {
        sku: "",
        stock: 0,
        salePrice: "",
        attributes: emptyAttrs,
        supplierOffers: suppliers.length ? [emptyOffer(suppliers)] : [],
      },
    ])
  }

  function updateVariant(index: number, patch: Partial<VariantRow>) {
    onVariantsChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  function updateAttribute(index: number, slug: string, value: string) {
    onVariantsChange(
      variants.map((v, i) =>
        i === index ? { ...v, attributes: { ...v.attributes, [slug]: value } } : v
      )
    )
  }

  function removeVariant(index: number) {
    onVariantsChange(variants.filter((_, i) => i !== index))
  }

  function addOffer(variantIndex: number) {
    const variant = variants[variantIndex]
    updateVariant(variantIndex, {
      supplierOffers: [...variant.supplierOffers, emptyOffer(suppliers)],
    })
  }

  function updateOffer(
    variantIndex: number,
    offerIndex: number,
    patch: Partial<SupplierOfferRow>
  ) {
    const variant = variants[variantIndex]
    const offers = variant.supplierOffers.map((o, i) => {
      if (i !== offerIndex) {
        if (patch.isPreferred) return { ...o, isPreferred: false }
        return o
      }
      return { ...o, ...patch }
    })
    updateVariant(variantIndex, { supplierOffers: offers })
  }

  function removeOffer(variantIndex: number, offerIndex: number) {
    const variant = variants[variantIndex]
    updateVariant(variantIndex, {
      supplierOffers: variant.supplierOffers.filter((_, i) => i !== offerIndex),
    })
  }

  if (globalAttributes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        No hay atributos globales.{" "}
        <a href="/admin/atributos" className="text-primary underline">
          Creá atributos
        </a>{" "}
        (ej. color, talle) antes de agregar variantes.
      </div>
    )
  }

  const attrBySlug = Object.fromEntries(globalAttributes.map((a) => [a.slug, a]))
  const supplierById = Object.fromEntries(suppliers.map((s) => [s.id, s]))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Atributos para este producto</h3>
        <div className="flex flex-wrap gap-2">
          {globalAttributes.map((attr) => (
            <label
              key={attr.id}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                enabledAttributeSlugs.includes(attr.slug)
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <input
                type="checkbox"
                className="accent-primary"
                checked={enabledAttributeSlugs.includes(attr.slug)}
                onChange={() => toggleAttribute(attr.slug)}
              />
              {attr.name}
              <span className="text-xs opacity-60">({attr.slug})</span>
            </label>
          ))}
        </div>
      </div>

      {suppliers.length === 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Creá al menos un proveedor en{" "}
          <a href="/admin/proveedores" className="underline">
            Proveedores
          </a>{" "}
          para cargar códigos internos y costos.
        </p>
      )}

      {enabledAttributeSlugs.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Variantes (SKU universal)</h3>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus className="w-4 h-4" />
              Agregar variante
            </Button>
          </div>

          {variants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin variantes: el producto usa precio y stock del formulario principal.
            </p>
          ) : (
            <div className="space-y-6">
              {variants.map((row, index) => (
                <div
                  key={row.id ?? index}
                  className="rounded-xl border border-border overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-3 py-2 font-medium">SKU universal *</th>
                          {enabledAttributeSlugs.map((slug) => (
                            <th key={slug} className="text-left px-3 py-2 font-medium">
                              {attrBySlug[slug]?.name ?? slug}
                            </th>
                          ))}
                          <th className="text-left px-3 py-2 font-medium">Stock venta</th>
                          <th className="text-left px-3 py-2 font-medium">Precio venta</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2">
                            <Input
                              value={row.sku}
                              onChange={(e) => updateVariant(index, { sku: e.target.value })}
                              placeholder="utp6-020"
                              className="h-8 min-w-[120px]"
                            />
                          </td>
                          {enabledAttributeSlugs.map((slug) => (
                            <td key={slug} className="px-3 py-2">
                              <Input
                                value={row.attributes[slug] ?? ""}
                                onChange={(e) => updateAttribute(index, slug, e.target.value)}
                                placeholder={attrBySlug[slug]?.name}
                                className="h-8 min-w-[80px]"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              value={row.stock}
                              onChange={(e) =>
                                updateVariant(index, {
                                  stock: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={row.salePrice}
                              onChange={(e) =>
                                updateVariant(index, { salePrice: e.target.value })
                              }
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeVariant(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Proveedores (códigos internos — solo admin)
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={suppliers.length === 0}
                        onClick={() => addOffer(index)}
                      >
                        <Plus className="w-3 h-3" />
                        Agregar proveedor
                      </Button>
                    </div>

                    {row.supplierOffers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Sin ofertas de proveedor para este SKU.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {row.supplierOffers.map((offer, oi) => (
                          <div
                            key={offer.id ?? oi}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
                          >
                            <div className="sm:col-span-3">
                              <label className="text-xs text-muted-foreground">Proveedor</label>
                              <select
                                value={offer.supplierId}
                                onChange={(e) =>
                                  updateOffer(index, oi, { supplierId: e.target.value })
                                }
                                className="flex h-8 w-full rounded-lg border border-border bg-background px-2 text-xs"
                              >
                                <option value="">Seleccionar...</option>
                                {suppliers
                                  .filter((s) => s.isActive)
                                  .map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-xs text-muted-foreground">Código interno</label>
                              <Input
                                value={offer.supplierCode}
                                onChange={(e) =>
                                  updateOffer(index, oi, { supplierCode: e.target.value })
                                }
                                placeholder="lta020"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-xs text-muted-foreground">Costo</label>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={offer.costPrice}
                                onChange={(e) =>
                                  updateOffer(index, oi, { costPrice: e.target.value })
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-xs text-muted-foreground">Stock prov.</label>
                              <Input
                                type="number"
                                min={0}
                                value={offer.stock}
                                onChange={(e) =>
                                  updateOffer(index, oi, {
                                    stock: parseInt(e.target.value, 10) || 0,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="sm:col-span-2 flex items-center gap-2 pb-1">
                              <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="accent-primary"
                                  checked={offer.isPreferred}
                                  onChange={(e) =>
                                    updateOffer(index, oi, { isPreferred: e.target.checked })
                                  }
                                />
                                Preferido
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive ml-auto"
                                onClick={() => removeOffer(index, oi)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            {offer.supplierId && supplierById[offer.supplierId] && (
                              <p className="sm:col-span-12 text-[10px] text-muted-foreground -mt-1">
                                {supplierById[offer.supplierId].name} · slug:{" "}
                                {supplierById[offer.supplierId].slug}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function variantsToPayload(rows: VariantRow[]) {
  return rows
    .filter((r) => r.sku.trim())
    .map((r) => ({
      id:         r.id,
      sku:        r.sku.trim(),
      stock:      r.stock,
      costPrice:  null as number | null,
      salePrice:  r.salePrice ? parseFloat(r.salePrice) : null,
      attributes: Object.fromEntries(
        Object.entries(r.attributes).filter(([, v]) => v.trim() !== "")
      ),
      supplierOffers: r.supplierOffers
        .filter((o) => o.supplierId && o.supplierCode.trim())
        .map((o) => ({
          id:           o.id,
          supplierId:   o.supplierId,
          supplierCode: o.supplierCode.trim(),
          costPrice:    o.costPrice ? parseFloat(o.costPrice) : null,
          stock:        o.stock,
          isPreferred:  o.isPreferred,
        })),
    }))
}
