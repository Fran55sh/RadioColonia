"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createGlobalAttribute,
  updateGlobalAttribute,
  deleteGlobalAttribute,
} from "@/server/actions/globalAttributes"
import { slugify } from "@/lib/slugify"
import { toast } from "sonner"
import { Pencil, Trash2, Plus, X } from "lucide-react"
import type { GlobalAttribute } from "@/db/schema"

export default function GlobalAttributesAdmin({
  attributes,
}: {
  attributes: GlobalAttribute[]
}) {
  const [editing, setEditing] = useState<GlobalAttribute | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [isPending, start] = useTransition()

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const result = await createGlobalAttribute(fd)
      if (result.success) {
        toast.success("Atributo creado")
        setShowNew(false)
      } else toast.error(result.error)
    })
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const result = await updateGlobalAttribute(editing.id, fd)
      if (result.success) {
        toast.success("Atributo actualizado")
        setEditing(null)
      } else toast.error(result.error)
    })
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar atributo "${name}"?`)) return
    start(async () => {
      const result = await deleteGlobalAttribute(id)
      if (result.success) toast.success("Atributo eliminado")
      else toast.error(result.error ?? "Error al eliminar")
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      {showNew ? (
        <AttributeForm
          title="Nuevo atributo"
          onSubmit={handleCreate}
          onCancel={() => setShowNew(false)}
          isPending={isPending}
        />
      ) : (
        <Button variant="hero" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" />
          Nuevo atributo
        </Button>
      )}

      <div className="bg-card rounded-2xl border border-border divide-y divide-border">
        {attributes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground text-center">
            No hay atributos. Creá al menos uno (ej. color, talle) antes de agregar variantes a productos.
          </p>
        ) : (
          attributes.map((attr) => (
            <div key={attr.id}>
              {editing?.id === attr.id ? (
                <AttributeForm
                  title="Editar atributo"
                  defaultValues={attr}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditing(null)}
                  isPending={isPending}
                  compact
                />
              ) : (
                <div className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-medium text-foreground">{attr.name}</p>
                    <p className="text-xs text-muted-foreground">
                      slug: <code className="text-primary">{attr.slug}</code> · orden {attr.sortOrder}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditing(attr)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(attr.id, attr.name)}
                      disabled={isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function AttributeForm({
  title,
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  compact,
}: {
  title: string
  defaultValues?: GlobalAttribute
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  isPending: boolean
  compact?: boolean
}) {
  const [slug, setSlug] = useState(defaultValues?.slug ?? "")
  const [name, setName] = useState(defaultValues?.name ?? "")

  return (
    <form
      onSubmit={onSubmit}
      className={compact ? "p-4 space-y-3" : "bg-card rounded-2xl border border-border p-6 space-y-4"}
    >
      {!compact && <h2 className="font-semibold text-foreground">{title}</h2>}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Nombre *</label>
          <Input
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (!defaultValues) setSlug(slugify(e.target.value))
            }}
            placeholder="Color"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Slug *</label>
          <Input
            name="slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="color"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Clave en JSONB de variantes</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Orden</label>
          <Input
            name="sortOrder"
            type="number"
            min="0"
            defaultValue={defaultValues?.sortOrder ?? 0}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="hero" size="sm" disabled={isPending}>
          {defaultValues ? "Guardar" : "Crear"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </form>
  )
}
