-- Migration: Order fulfillment (pickup), contact channel, status history, variant snapshots

-- ── order_status enum values ──────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'confirmed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'preparing';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready_for_pickup';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── New enums ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE fulfillment_type AS ENUM ('pickup', 'shipping');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contact_channel AS ENUM ('whatsapp', 'email');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── orders columns ────────────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_type fulfillment_type NOT NULL DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact_channel contact_channel,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS pickup_code TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- ── order_items columns ───────────────────────────────────────────────────────

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS sku_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS variant_label_snapshot TEXT;

-- ── order_status_history ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_status_history (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status        TEXT,
  to_status          TEXT NOT NULL,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_status_history_order_idx ON order_status_history (order_id);
