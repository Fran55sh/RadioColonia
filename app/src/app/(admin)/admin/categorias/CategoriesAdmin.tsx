"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createCategory, updateCategory, deleteCategory } from "@/server/actions/categories"
import { toast } from "sonner"
import { Pencil, Trash2, Plus, X } from "lucide-react"
import type { Category } from "@/db/schema"

const ICON_OPTIONS = [
  "Smartphone", "Laptop", "Watch", "Headphones",
  "Gamepad2", "Camera", "Tv", "Tablet", "Tag",
]

export default function CategoriesAdmin({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [isPending, start]   = useTransition()

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const result = await createCategory(fd)
      if (result.success) { toast.success("Categoría creada"); setShowNew(false) }
      else toast.error(result.error)
    })
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const result = await updateCategory(editing.id, fd)
      if (result.success) { toast.success("Categoría actualizada"); setEditing(null) }
      else toast.error(result.error)
    })
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    start(async () => {
      const result = await deleteCategory(id)
      if (result.success) toast.success("Categoría eliminada")
      else toast.error("Error al eliminar")
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Add new */}
      {showNew ? (
        <form onSubmit={handleCreate} className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Nueva categoría</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nombre *</label>
              <Input name="name" placeholder="Gaming" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Slug *</label>
              <Input name="slug" placeholder="gaming" required />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Ícono</label>
              <select name="iconName" className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Orden</label>
              <Input name="sortOrder" type="number" min="0" defaultValue="0" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="hero" size="sm" disabled={isPending}>Crear</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button variant="hero" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" />
          Nueva categoría
        </Button>
      )}

      {/* Categories list */}
      <div className="bg-card rounded-2xl border border-border divide-y divide-border">
        {categories.map((cat) => (
          <div key={cat.id}>
            {editing?.id === cat.id ? (
              <form onSubmit={handleUpdate} className="p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input name="name" defaultValue={cat.name} required />
                  <Input name="slug" defaultValue={cat.slug} required />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <select name="iconName" defaultValue={cat.iconName} className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <Input name="sortOrder" type="number" min="0" defaultValue={cat.sortOrder} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="hero" size="sm" disabled={isPending}>Guardar</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-foreground">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">/{cat.slug} · {cat.iconName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(cat)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(cat.id, cat.name)}
                    disabled={isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
