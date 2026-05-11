"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { Pencil, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteProduct } from "@/server/actions/products"
import { toast } from "sonner"

interface ProductRow {
  id:       string
  name:     string
  price:    string
  stock:    number
  isActive: boolean
  badge:    string | null
  image:    string
  category: string | null
}

export default function ProductsTable({ products }: { products: ProductRow[] }) {
  const [isPending, start] = useTransition()

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    start(async () => {
      const result = await deleteProduct(id)
      if (result.success) toast.success("Producto eliminado")
      else toast.error("Error al eliminar")
    })
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No hay productos. <Link href="/admin/productos/nuevo" className="text-primary hover:underline">Crear el primero</Link>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Producto</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoría</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Precio</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Stock</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-silver flex-shrink-0 overflow-hidden">
                      <Image src={product.image} alt={product.name} width={48} height={48} className="w-full h-full object-contain p-1" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground line-clamp-1">{product.name}</p>
                      {product.badge && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{product.badge}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{product.category ?? "—"}</td>
                <td className="px-6 py-4 text-sm font-semibold text-foreground">${parseFloat(product.price).toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-foreground">{product.stock}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    product.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {product.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Link href={`/admin/productos/${product.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(product.id, product.name)}
                      disabled={isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
