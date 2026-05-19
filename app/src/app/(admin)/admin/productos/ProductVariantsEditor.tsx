"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"
import type { GlobalAttribute, ProductVariant } from "@/db/schema"

export interface VariantRow {
  id?: string
  sku: string
  stock: number
  costPrice: string
  salePrice: string
  attributes: Record<string, string>
}

interface ProductVariantsEditorProps {
  globalAttributes: GlobalAttribute[]
  initialVariants?: ProductVariant[]
  enabledAttributeSlugs: string[]
  onEnabledAttributesChange: (slugs: string[]) => void
  variants: VariantRow[]
  onVariantsChange: (variants: VariantRow[]) => void
}

function variantToRow(v: ProductVariant): VariantRow {
  const attrs = (v.attributes ?? {}) as Record<string, string>
  return {
    id:        v.id,
    sku:       v.sku,
    stock:     v.stock,
    costPrice: v.costPrice ?? "",
    salePrice: v.salePrice ?? "",
    attributes: attrs,
  }
}

export function buildInitialVariants(initial?: ProductVariant[]): VariantRow[] {
  if (!initial?.length) return []
  return initial.map(variantToRow)
}

export function getEnabledSlugsFromVariants(variants: ProductVariant[]): string[] {
  const slugs = new Set<string>()
  for (const v of variants) {
    const attrs = (v.attributes ?? {}) as Record<string, string>
    Object.keys(attrs).forEach((k) => slugs.add(k))
  }
  return Array.from(slugs)
}

export default function ProductVariantsEditor({
  globalAttributes,
  initialVariants,
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
      { sku: "", stock: 0, costPrice: "", salePrice: "", attributes: emptyAttrs },
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

      {enabledAttributeSlugs.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Variantes</h3>
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
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium">SKU *</th>
                    {enabledAttributeSlugs.map((slug) => (
                      <th key={slug} className="text-left px-3 py-2 font-medium">
                        {attrBySlug[slug]?.name ?? slug}
                      </th>
                    ))}
                    <th className="text-left px-3 py-2 font-medium">Stock</th>
                    <th className="text-left px-3 py-2 font-medium">Precio venta</th>
                    <th className="text-left px-3 py-2 font-medium">Costo</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {variants.map((row, index) => (
                    <tr key={row.id ?? index} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <Input
                          value={row.sku}
                          onChange={(e) => updateVariant(index, { sku: e.target.value })}
                          placeholder="SKU-001"
                          className="h-8 min-w-[100px]"
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
                            updateVariant(index, { stock: parseInt(e.target.value, 10) || 0 })
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
                          onChange={(e) => updateVariant(index, { salePrice: e.target.value })}
                          className="h-8 w-24"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={row.costPrice}
                          onChange={(e) => updateVariant(index, { costPrice: e.target.value })}
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
                  ))}
                </tbody>
              </table>
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
      costPrice:  r.costPrice ? parseFloat(r.costPrice) : null,
      salePrice:  r.salePrice ? parseFloat(r.salePrice) : null,
      attributes: Object.fromEntries(
        Object.entries(r.attributes).filter(([, v]) => v.trim() !== "")
      ),
    }))
}
