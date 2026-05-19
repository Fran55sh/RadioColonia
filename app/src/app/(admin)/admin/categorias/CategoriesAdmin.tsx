"use client"

import { useState, useTransition, useMemo } from "react"
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
  const [isPending, start] = useTransition()

  const parents = useMemo(
    () => categories.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  )

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Category[]>()
    for (const c of categories) {
      if (c.parentId) {
        const list = map.get(c.parentId) ?? []
        list.push(c)
        map.set(c.parentId, list)
      }
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return map
  }, [categories])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const result = await createCategory(fd)
      if (result.success) {
        toast.success("Categoría creada")
        setShowNew(false)
      } else toast.error(result.error)
    })
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const result = await updateCategory(editing.id, fd)
      if (result.success) {
        toast.success("Categoría actualizada")
        setEditing(null)
      } else toast.error(result.error)
    })
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"? Las subcategorías también se eliminarán.`)) return
    start(async () => {
      const result = await deleteCategory(id)
      if (result.success) toast.success("Categoría eliminada")
      else toast.error("Error al eliminar")
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      {showNew ? (
        <CategoryForm
          title="Nueva categoría"
          parents={parents}
          onSubmit={handleCreate}
          onCancel={() => setShowNew(false)}
          isPending={isPending}
        />
      ) : (
        <Button variant="hero" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" />
          Nueva categoría
        </Button>
      )}

      <div className="bg-card rounded-2xl border border-border divide-y divide-border">
        {parents.length === 0 && categories.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground text-center">No hay categorías.</p>
        ) : (
          parents.map((parent) => (
            <CategoryBlock
              key={parent.id}
              category={parent}
              children={childrenByParent.get(parent.id) ?? []}
              parents={parents}
              editing={editing}
              setEditing={setEditing}
              isPending={isPending}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
        {categories
          .filter((c) => c.parentId && !parents.find((p) => p.id === c.parentId))
          .map((orphan) => (
            <CategoryRow
              key={orphan.id}
              category={orphan}
              parents={parents}
              editing={editing}
              setEditing={setEditing}
              isPending={isPending}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              indent
            />
          ))}
      </div>
    </div>
  )
}

function CategoryBlock({
  category,
  children,
  parents,
  editing,
  setEditing,
  isPending,
  onUpdate,
  onDelete,
}: {
  category: Category
  children: Category[]
  parents: Category[]
  editing: Category | null
  setEditing: (c: Category | null) => void
  isPending: boolean
  onUpdate: (e: React.FormEvent<HTMLFormElement>) => void
  onDelete: (id: string, name: string) => void
}) {
  return (
  <>
      <CategoryRow
        category={category}
        parents={parents}
        editing={editing}
        setEditing={setEditing}
        isPending={isPending}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
      {children.map((child) => (
        <CategoryRow
          key={child.id}
          category={child}
          parents={parents}
          editing={editing}
          setEditing={setEditing}
          isPending={isPending}
          onUpdate={onUpdate}
          onDelete={onDelete}
          indent
        />
      ))}
    </>
  )
}

function CategoryRow({
  category,
  parents,
  editing,
  setEditing,
  isPending,
  onUpdate,
  onDelete,
  indent,
}: {
  category: Category
  parents: Category[]
  editing: Category | null
  setEditing: (c: Category | null) => void
  isPending: boolean
  onUpdate: (e: React.FormEvent<HTMLFormElement>) => void
  onDelete: (id: string, name: string) => void
  indent?: boolean
}) {
  if (editing?.id === category.id) {
    return (
      <CategoryForm
        title="Editar categoría"
        defaultValues={category}
        parents={parents.filter((p) => p.id !== category.id)}
        onSubmit={onUpdate}
        onCancel={() => setEditing(null)}
        isPending={isPending}
        compact
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-between px-6 py-4 ${indent ? "pl-12 bg-muted/20" : ""}`}
    >
      <div>
        <p className="font-medium text-foreground">
          {indent && <span className="text-muted-foreground mr-2">↳</span>}
          {category.name}
          {category.parentId && (
            <span className="ml-2 text-xs text-primary font-normal">subcategoría</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">/{category.slug} · {category.iconName}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(category)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(category.id, category.name)}
          disabled={isPending}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function CategoryForm({
  title,
  defaultValues,
  parents,
  onSubmit,
  onCancel,
  isPending,
  compact,
}: {
  title: string
  defaultValues?: Category
  parents: Category[]
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  isPending: boolean
  compact?: boolean
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={compact ? "p-4 space-y-3 border-b border-border" : "bg-card rounded-2xl border border-border p-6 space-y-4"}
    >
      {!compact && <h2 className="font-semibold text-foreground">{title}</h2>}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Nombre *</label>
          <Input name="name" defaultValue={defaultValues?.name} placeholder="Gaming" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Slug *</label>
          <Input name="slug" defaultValue={defaultValues?.slug} placeholder="gaming" required />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Categoría padre</label>
          <select
            name="parentId"
            defaultValue={defaultValues?.parentId ?? ""}
            className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Ninguna (categoría principal)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Ícono</label>
          <select
            name="iconName"
            defaultValue={defaultValues?.iconName ?? "Tag"}
            className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {ICON_OPTIONS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Orden</label>
          <Input name="sortOrder" type="number" min="0" defaultValue={defaultValues?.sortOrder ?? 0} />
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
