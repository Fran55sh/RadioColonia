export const dynamic = "force-dynamic"

import { buildMediaInventory } from "@/lib/media-inventory"
import { listProductsForMediaAssignment } from "@/server/actions/media"
import MediaManager from "./MediaManager"

export default async function AdminImagenesPage() {
  const [inventory, productsResult] = await Promise.all([
    buildMediaInventory(),
    listProductsForMediaAssignment(),
  ])

  const products =
    "products" in productsResult ? productsResult.products : []

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Imágenes</h1>
        <p className="text-muted-foreground">
          Archivos en el volumen de subidas y su vínculo con productos
        </p>
      </div>
      <MediaManager initialInventory={inventory} products={products} />
    </div>
  )
}
