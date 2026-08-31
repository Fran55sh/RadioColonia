-- Normalize SKUs to lowercase (POS uses equality on product_variants_sku_idx).
-- If uppercase/lowercase duplicates exist, keep one row (prefer already lowercase),
-- merge stock, then delete extras before lowercasing the rest.

BEGIN;

CREATE TEMP TABLE _sku_case_dupes ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    id,
    sku,
    stock,
    LOWER(sku) AS sku_lower,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(sku)
      ORDER BY (sku = LOWER(sku)) DESC, created_at ASC, id ASC
    ) AS rn
  FROM product_variants
),
groups AS (
  SELECT sku_lower
  FROM ranked
  GROUP BY sku_lower
  HAVING COUNT(*) > 1
)
SELECT
  k.id AS keeper_id,
  d.id AS dupe_id,
  d.stock AS dupe_stock
FROM ranked k
JOIN ranked d ON d.sku_lower = k.sku_lower AND d.rn > 1
JOIN groups g ON g.sku_lower = k.sku_lower
WHERE k.rn = 1;

UPDATE product_variants pv
SET stock = pv.stock + agg.extra
FROM (
  SELECT keeper_id, SUM(dupe_stock) AS extra
  FROM _sku_case_dupes
  GROUP BY keeper_id
) agg
WHERE pv.id = agg.keeper_id;

DELETE FROM product_variants
WHERE id IN (SELECT dupe_id FROM _sku_case_dupes);

UPDATE product_variants
SET sku = LOWER(sku)
WHERE sku <> LOWER(sku);

COMMIT;
