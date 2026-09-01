-- 0013: Preserve variant display order (CSV row order / admin table order)

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS product_variants_product_sort_idx
  ON product_variants (product_id, sort_order);

WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY product_id
      ORDER BY created_at ASC, id ASC
    ) - 1 AS rn
  FROM product_variants
)
UPDATE product_variants pv
SET sort_order = numbered.rn
FROM numbered
WHERE pv.id = numbered.id;
