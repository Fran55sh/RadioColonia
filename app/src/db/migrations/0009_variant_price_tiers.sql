-- 0009: Quantity-based price tiers per SKU + staging columns for multi-attr / tiers CSV

CREATE TABLE IF NOT EXISTS product_variant_price_tiers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  min_qty    INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pvpt_min_qty_ck    CHECK (min_qty >= 2),
  CONSTRAINT pvpt_unit_price_ck CHECK (unit_price > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS pvpt_variant_min_qty_idx
  ON product_variant_price_tiers (variant_id, min_qty);

CREATE INDEX IF NOT EXISTS pvpt_variant_id_idx
  ON product_variant_price_tiers (variant_id);

-- Staging columns for bulk import (multi-attribute JSON + price tiers JSON)
ALTER TABLE stg_products_import
  ADD COLUMN IF NOT EXISTS attributes_json  JSONB,
  ADD COLUMN IF NOT EXISTS price_tiers_json JSONB;
