-- Normalize SKUs to lowercase so POS can use equality on product_variants_sku_idx
-- (avoids LOWER(pv.sku) which defeats the unique index).

UPDATE product_variants
SET sku = LOWER(sku)
WHERE sku <> LOWER(sku);
