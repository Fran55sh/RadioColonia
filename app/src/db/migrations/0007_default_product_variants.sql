-- Todo producto vendible debe tener al menos una variante.
-- Backfill para productos legacy que todavía vendían desde products.stock.

INSERT INTO product_variants (
  product_id,
  sku,
  stock,
  attributes,
  cost_price,
  sale_price,
  margin_percentage
)
SELECT
  p.id,
  UPPER(regexp_replace(p.slug, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || LEFT(p.id::text, 8),
  p.stock,
  '{}'::jsonb,
  NULL,
  NULL,
  NULL
FROM products p
WHERE NOT EXISTS (
  SELECT 1
  FROM product_variants pv
  WHERE pv.product_id = p.id
);
