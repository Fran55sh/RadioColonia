-- Migration: Bulk import support
-- Creates product_variants table and stg_products_import staging table.
-- Safe to run on existing databases (uses IF NOT EXISTS).

-- ── Product Variants ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_variants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku               TEXT NOT NULL,
  stock             INTEGER NOT NULL DEFAULT 0,
  attributes        JSONB NOT NULL DEFAULT '{}',
  cost_price        NUMERIC(10, 2),
  sale_price        NUMERIC(10, 2),
  margin_percentage NUMERIC(5, 2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_sku_idx
  ON product_variants (sku);

CREATE INDEX IF NOT EXISTS product_variants_product_idx
  ON product_variants (product_id);

-- Ensure products.slug has its unique constraint (already exists via Drizzle, but safe to re-declare)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'products' AND indexname = 'products_slug_idx'
  ) THEN
    CREATE UNIQUE INDEX products_slug_idx ON products (slug);
  END IF;
END $$;

-- ── Staging Table ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stg_products_import (
  id              SERIAL PRIMARY KEY,
  session_id      TEXT NOT NULL,
  handle          TEXT NOT NULL,
  name            TEXT NOT NULL,
  category_slug   TEXT,
  description     TEXT,
  cost_price      NUMERIC(10, 2),
  sale_price      NUMERIC(10, 2),
  sku             TEXT NOT NULL,
  stock           INTEGER DEFAULT 0,
  attribute_name  TEXT,
  attribute_value TEXT,
  image_filename  TEXT,
  imported_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stg_products_import_session_idx
  ON stg_products_import (session_id);
