"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSupplier, updateSupplier, deleteSupplier } from "@/server/actions/suppliers"
import { toast } from "sonner"
import { Pencil, Trash2, Plus, X } from "lucide-react"
import type { Supplier } from "@/db/schema"

function SupplierForm({
  title,
  supplier,
  onSubmit,
  onCancel,
  isPending,
}: {
  title: string
  supplier?: Supplier
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-card rounded-2xl border border-border p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nombre *</label>
          <Input name="name" defaultValue={supplier?.name} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Slug *</label>
          <Input
            name="slug"
            defaultValue={supplier?.slug}
            placeholder="proveedor-abc"
            pattern="[a-z0-9-]+"
            required
            disabled={supplier?.slug === "sin-asignar"}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Contacto</label>
          <Input name="contactName" defaultValue={supplier?.contactName ?? ""} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <Input name="email" type="email" defaultValue={supplier?.email ?? ""} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Teléfono</label>
          <Input name="phone" defaultValue={supplier?.phone ?? ""} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Notas</label>
        <textarea
          name="notes"
          defaultValue={supplier?.notes ?? ""}
          rows={2}
          className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          name="isActive"
          id="supplierIsActive"
          defaultChecked={supplier?.isActive ?? true}
          className="w-4 h-4 accent-primary"
        />
        <label htmlFor="supplierIsActive" className="text-sm font-medium">
          Proveedor activo
        </label>
      </div>

      <Button type="submit" variant="hero" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  )
}

export default function SuppliersAdmin({ suppliers }: { suppliers: Supplier[] }) {
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [isPending, start] = useTransition()

  function parseForm(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget)
    fd.set("isActive", fd.get("isActive") ? "true" : "false")
    return fd
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    start(async () => {
      const result = await createSupplier(parseForm(e))
      if (result.success) {
        toast.success("Proveedor creado")
        setShowNew(false)
      } else toast.error(result.error)
    })
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    start(async () => {
      const result = await updateSupplier(editing.id, parseForm(e))
      if (result.success) {
        toast.success("Proveedor actualizado")
        setEditing(null)
      } else toast.error(result.error)
    })
  }

  async function handleDelete(id: string, name: string, slug: string) {
    if (slug === "sin-asignar") {
      toast.error("No se puede eliminar el proveedor por defecto")
      return
    }
    if (!confirm(`¿Eliminar proveedor "${name}"?`)) return
    start(async () => {
      const result = await deleteSupplier(id)
      if (result.success) toast.success("Proveedor eliminado")
      else toast.error(result.error ?? "Error al eliminar")
    })
  }

  return (
    <div className="max-w-3xl space-y-6">
      {showNew ? (
        <SupplierForm
          title="Nuevo proveedor"
          onSubmit={handleCreate}
          onCancel={() => setShowNew(false)}
          isPending={isPending}
        />
      ) : (
        <Button variant="hero" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" />
          Nuevo proveedor
        </Button>
      )}

      {editing && (
        <SupplierForm
          title="Editar proveedor"
          supplier={editing}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
          isPending={isPending}
        />
      )}

      <div className="bg-card rounded-2xl border border-border divide-y divide-border">
        {suppliers.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground text-center">
            No hay proveedores registrados.
          </p>
        ) : (
          suppliers.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-6 py-4 gap-4"
            >
              <div>
                <p className="font-medium text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  slug: {s.slug}
                  {!s.isActive && " · inactivo"}
                </p>
                {(s.email || s.phone) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {[s.contactName, s.email, s.phone].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowNew(false)
                    setEditing(s)
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  disabled={s.slug === "sin-asignar"}
                  onClick={() => handleDelete(s.id, s.name, s.slug)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
