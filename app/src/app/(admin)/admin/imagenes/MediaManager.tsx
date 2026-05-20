"use client"

import { useMemo, useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  RefreshCw,
  Trash2,
  Pencil,
  ImageOff,
  HardDrive,
  Link2,
  Unlink,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteOrphanMedia, getMediaInventory } from "@/server/actions/media"
import type { MediaFileEntry, MediaInventory } from "@/lib/media-inventory"
import { toast } from "sonner"

type FileFilter = "all" | "assigned" | "orphan"
type ViewTab = "files" | "broken"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

const statusLabels: Record<MediaFileEntry["status"], string> = {
  assigned: "Asignada",
  orphan: "Huérfana",
}

const statusStyles: Record<MediaFileEntry["status"], string> = {
  assigned: "bg-green-100 text-green-700",
  orphan: "bg-amber-100 text-amber-800",
}

export default function MediaManager({
  initialInventory,
}: {
  initialInventory: MediaInventory
}) {
  const [inventory, setInventory] = useState(initialInventory)
  const [fileFilter, setFileFilter] = useState<FileFilter>("all")
  const [viewTab, setViewTab] = useState<ViewTab>("files")
  const [isPending, start] = useTransition()

  const filteredFiles = useMemo(() => {
    if (fileFilter === "all") return inventory.files
    return inventory.files.filter((f) => f.status === fileFilter)
  }, [inventory.files, fileFilter])

  function refresh() {
    start(async () => {
      const result = await getMediaInventory()
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      setInventory(result.inventory)
      toast.success("Inventario actualizado")
    })
  }

  function handleDelete(filename: string) {
    if (
      !confirm(
        `¿Eliminar "${filename}" del servidor? Esta acción no se puede deshacer.`
      )
    ) {
      return
    }
    start(async () => {
      const result = await deleteOrphanMedia(filename)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Imagen eliminada")
      const refreshed = await getMediaInventory()
      if ("inventory" in refreshed) {
        setInventory(refreshed.inventory)
      }
    })
  }

  const { summary } = inventory

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-xl">
          {summary.productsStaticOrPlaceholder > 0 && (
            <>
              {summary.productsStaticOrPlaceholder} producto(s) usan placeholder o
              imágenes estáticas en{" "}
              <code className="text-xs bg-muted px-1 rounded">/products/</code>{" "}
              (no listadas aquí).
            </>
          )}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isPending}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isPending ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={HardDrive}
          label="Archivos en disco"
          value={summary.totalFiles}
          color="bg-muted text-foreground"
        />
        <SummaryCard
          icon={Link2}
          label="Asignadas"
          value={summary.assigned}
          color="bg-green-100 text-green-700"
        />
        <SummaryCard
          icon={Unlink}
          label="Huérfanas"
          value={summary.orphans}
          color="bg-amber-100 text-amber-800"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Enlaces rotos"
          value={summary.brokenLinks}
          color="bg-red-100 text-red-700"
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        <TabButton
          active={viewTab === "files"}
          onClick={() => setViewTab("files")}
        >
          Archivos ({summary.totalFiles})
        </TabButton>
        <TabButton
          active={viewTab === "broken"}
          onClick={() => setViewTab("broken")}
        >
          Enlaces rotos ({summary.brokenLinks})
        </TabButton>
      </div>

      {viewTab === "files" && (
        <>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "Todas"],
                ["assigned", "Asignadas"],
                ["orphan", "Huérfanas"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                variant={fileFilter === key ? "default" : "outline"}
                size="sm"
                onClick={() => setFileFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          {filteredFiles.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground">
              <ImageOff className="w-10 h-10 mx-auto mb-3 opacity-50" />
              No hay archivos en esta vista.
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Vista previa
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Archivo
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Producto(s)
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredFiles.map((file) => (
                      <FileRow
                        key={file.filename}
                        file={file}
                        onDelete={handleDelete}
                        disabled={isPending}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {viewTab === "broken" && (
        <>
          {inventory.brokenLinks.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground">
              No hay productos con enlaces rotos a{" "}
              <code className="text-xs bg-muted px-1 rounded">/uploads/</code>.
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        URL guardada
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inventory.brokenLinks.map((row) => (
                      <tr
                        key={row.productId}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-foreground">
                            {row.productName}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              row.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {row.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs text-muted-foreground break-all">
                            {row.imageUrl}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            Archivo no encontrado
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/admin/productos/${row.productId}`}>
                            <Button variant="outline" size="sm">
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar producto
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}

function FileRow({
  file,
  onDelete,
  disabled,
}: {
  file: MediaFileEntry
  onDelete: (filename: string) => void
  disabled: boolean
}) {
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-6 py-4">
        <div className="w-16 h-16 rounded-lg bg-gradient-silver overflow-hidden flex-shrink-0">
          <Image
            src={file.url}
            alt={file.filename}
            width={64}
            height={64}
            className="w-full h-full object-contain p-1"
          />
        </div>
      </td>
      <td className="px-6 py-4">
        <p className="font-mono text-sm text-foreground">{file.filename}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatBytes(file.sizeBytes)} · {formatDate(file.modifiedAt)}
        </p>
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline mt-1 inline-block"
        >
          Abrir en nueva pestaña
        </a>
      </td>
      <td className="px-6 py-4">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[file.status]}`}
        >
          {statusLabels[file.status]}
        </span>
      </td>
      <td className="px-6 py-4">
        {file.products.length === 0 ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          <ul className="space-y-1">
            {file.products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/productos/${p.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {p.name}
                </Link>
                {!p.isActive && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (inactivo)
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        {file.status === "orphan" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(file.filename)}
            disabled={disabled}
            title="Eliminar archivo huérfano"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  )
}
