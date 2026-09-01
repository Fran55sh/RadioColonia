import { asc } from "drizzle-orm"
import { productVariants } from "@/db/schema"

/** Consistent variant ordering: CSV / admin row order, then stable tie-breakers. */
export const variantOrderBy = [
  asc(productVariants.sortOrder),
  asc(productVariants.createdAt),
  asc(productVariants.id),
] as const
