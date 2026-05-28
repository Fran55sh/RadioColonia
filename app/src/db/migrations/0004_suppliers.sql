-- Migration: Suppliers and product supplier offers (SKU universal + internal codes)

CREATE TABLE IF NOT EXISTS suppliers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  contact_name TEXT,
  email        TEXT,
  phone        TEXT,
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_slug_idx ON suppliers (slug);

CREATE TABLE IF NOT EXISTS product_supplier_offers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id       UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  supplier_id      UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_code    TEXT NOT NULL,
  cost_price       NUMERIC(10, 2),
  stock            INTEGER NOT NULL DEFAULT 0,
  is_preferred     BOOLEAN NOT NULL DEFAULT FALSE,
  last_cost_update TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_supplier_offers_supplier_code_idx
  ON product_supplier_offers (supplier_id, supplier_code);

CREATE UNIQUE INDEX IF NOT EXISTS product_supplier_offers_variant_supplier_idx
  ON product_supplier_offers (variant_id, supplier_id);

CREATE INDEX IF NOT EXISTS product_supplier_offers_variant_idx
  ON product_supplier_offers (variant_id);

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS supplier_id_snapshot UUID,
  ADD COLUMN IF NOT EXISTS supplier_code_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS cost_price_snapshot NUMERIC(10, 2);

-- Default supplier for legacy cost data
INSERT INTO suppliers (name, slug, notes, is_active)
VALUES (
  'Proveedor sin asignar',
  'sin-asignar',
  'Creado automáticamente al migrar costos desde variantes',
  TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- Migrate existing variant cost_price into supplier offers
INSERT INTO product_supplier_offers (
  variant_id,
  supplier_id,
  supplier_code,
  cost_price,
  stock,
  is_preferred,
  last_cost_update
)
SELECT
  pv.id,
  s.id,
  pv.sku,
  pv.cost_price,
  pv.stock,
  TRUE,
  NOW()
FROM product_variants pv
CROSS JOIN suppliers s
WHERE s.slug = 'sin-asignar'
  AND pv.cost_price IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM product_supplier_offers pso
    WHERE pso.variant_id = pv.id
      AND pso.supplier_id = s.id
  );
