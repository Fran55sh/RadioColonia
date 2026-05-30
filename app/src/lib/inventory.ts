import { db } from "@/db"
import { productVariants, products } from "@/db/schema"
import { and, eq, gte, sql } from "drizzle-orm"

export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export class InsufficientStockError extends Error {
  constructor(
    message: string,
    readonly details?: { sku?: string; productId?: string; requested: number; available?: number },
  ) {
    super(message)
    this.name = "InsufficientStockError"
  }
}

/**
 * Descuenta stock de variante con bloqueo de fila (FOR UPDATE) y UPDATE condicional.
 * Misma semántica que el POS: falla si no hay stock suficiente al momento del decremento.
 */
export async function decrementVariantStockTx(
  tx: DbTx,
  productId: string,
  sku: string,
  quantity: number,
): Promise<void> {
  const [locked] = await tx
    .select({
      id: productVariants.id,
      stock: productVariants.stock,
      sku: productVariants.sku,
    })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productId),
        eq(productVariants.sku, sku),
      ),
    )
    .for("update")
    .limit(1)

  if (!locked) {
    throw new InsufficientStockError(`Variante no encontrada: ${sku}`, {
      sku,
      productId,
      requested: quantity,
    })
  }

  if (locked.stock < quantity) {
    throw new InsufficientStockError(
      `Stock insuficiente para ${sku} (${locked.stock} disponibles, pedido ${quantity})`,
      { sku, productId, requested: quantity, available: locked.stock },
    )
  }

  const updated = await tx
    .update(productVariants)
    .set({ stock: sql`${productVariants.stock} - ${quantity}` })
    .where(
      and(
        eq(productVariants.id, locked.id),
        gte(productVariants.stock, quantity),
      ),
    )
    .returning({ stock: productVariants.stock })

  if (updated.length === 0) {
    throw new InsufficientStockError(
      `Stock insuficiente para ${sku} (conflicto concurrente)`,
      { sku, productId, requested: quantity },
    )
  }
}

/**
 * Descuenta stock a nivel producto (sin variante) con FOR UPDATE + UPDATE condicional.
 */
export async function decrementProductStockTx(
  tx: DbTx,
  productId: string,
  quantity: number,
  productName?: string,
): Promise<void> {
  const [locked] = await tx
    .select({
      id: products.id,
      stock: products.stock,
      name: products.name,
    })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.isActive, true)))
    .for("update")
    .limit(1)

  if (!locked) {
    throw new InsufficientStockError(`Producto no disponible: ${productId}`, {
      productId,
      requested: quantity,
    })
  }

  if (locked.stock < quantity) {
    const label = productName ?? locked.name
    throw new InsufficientStockError(
      `Stock insuficiente para "${label}" (${locked.stock} disponibles, pedido ${quantity})`,
      { productId, requested: quantity, available: locked.stock },
    )
  }

  const updated = await tx
    .update(products)
    .set({ stock: sql`${products.stock} - ${quantity}` })
    .where(and(eq(products.id, locked.id), gte(products.stock, quantity)))
    .returning({ stock: products.stock })

  if (updated.length === 0) {
    const label = productName ?? locked.name
    throw new InsufficientStockError(
      `Stock insuficiente para "${label}" (conflicto concurrente)`,
      { productId, requested: quantity },
    )
  }
}
