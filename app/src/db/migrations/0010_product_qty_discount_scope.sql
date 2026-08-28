-- 0010: Descuento por cantidad compartido (producto) vs por SKU (variante)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS qty_discount_scope TEXT NOT NULL DEFAULT 'per_variant';

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_qty_discount_scope_ck;
ALTER TABLE products
  ADD CONSTRAINT products_qty_discount_scope_ck
  CHECK (qty_discount_scope IN ('per_variant', 'shared'));

CREATE TABLE IF NOT EXISTS product_price_tiers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty    INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ppt_min_qty_ck    CHECK (min_qty >= 2),
  CONSTRAINT ppt_unit_price_ck CHECK (unit_price > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ppt_product_min_qty_idx
  ON product_price_tiers (product_id, min_qty);

CREATE INDEX IF NOT EXISTS ppt_product_id_idx
  ON product_price_tiers (product_id);
