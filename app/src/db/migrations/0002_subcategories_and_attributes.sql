-- Migration: Subcategories (2 levels) + global attributes catalog + GIN indexes

-- ── Subcategories ─────────────────────────────────────────────────────────────

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id UUID
    REFERENCES categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories (parent_id);

-- ── Global Attributes Catalog ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS global_attributes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS global_attributes_slug_idx ON global_attributes (slug);

-- Seed default attributes (idempotent)
INSERT INTO global_attributes (name, slug, sort_order)
VALUES
  ('Color',     'color',     1),
  ('Talle',     'talle',     2),
  ('Voltaje',   'voltaje',   3),
  ('Capacidad', 'capacidad', 4)
ON CONFLICT (slug) DO NOTHING;

-- ── GIN indexes for variant attribute filters ─────────────────────────────────

CREATE INDEX IF NOT EXISTS product_variants_attributes_gin_idx
  ON product_variants
  USING GIN (attributes jsonb_path_ops);

CREATE INDEX IF NOT EXISTS product_variants_attributes_keys_gin_idx
  ON product_variants
  USING GIN (attributes);
