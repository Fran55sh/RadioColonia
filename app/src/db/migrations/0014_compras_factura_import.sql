-- 0014: Importación de facturas PDF → OC recibida + stock↑
-- Idempotente. Autoridad: migrador ecommerce.

-- CUIT dedicado en suppliers (antes vivía en notes)
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS cuit VARCHAR(13);

UPDATE suppliers
SET cuit = NULLIF(
  regexp_replace(
    substring(notes FROM 'CUIT:\s*([0-9\-]+)'),
    '[^0-9]',
    '',
    'g'
  ),
  ''
)
WHERE cuit IS NULL
  AND notes ~* 'CUIT:\s*[0-9]';

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_cuit_unique_idx
  ON suppliers (cuit)
  WHERE cuit IS NOT NULL AND length(cuit) > 0;

-- Órdenes de compra: origen y recepción
ALTER TABLE pos_ordenes_compra
  ADD COLUMN IF NOT EXISTS origen VARCHAR(32) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS recibido_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recibido_por VARCHAR(64);

-- Líneas OC: datos de factura
ALTER TABLE pos_ordenes_compra_lineas
  ADD COLUMN IF NOT EXISTS descuento NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS importe NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS descripcion_factura TEXT;

-- Facturas de compra: partes fiscales + vínculo OC/PDF
ALTER TABLE pos_facturas_compra
  ADD COLUMN IF NOT EXISTS tipo_comprobante VARCHAR(8),
  ADD COLUMN IF NOT EXISTS punto_venta VARCHAR(8),
  ADD COLUMN IF NOT EXISTS numero VARCHAR(16),
  ADD COLUMN IF NOT EXISTS orden_id INTEGER REFERENCES pos_ordenes_compra (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pdf_storage_key TEXT;

-- Backfill partes desde numero_comprobante existente
UPDATE pos_facturas_compra
SET
  tipo_comprobante = COALESCE(tipo_comprobante, 'X'),
  punto_venta = COALESCE(punto_venta, '0000'),
  numero = COALESCE(
    numero,
    CASE
      WHEN numero_comprobante ~ '^[A-Z]-?[0-9]+-[0-9]+$' THEN
        split_part(regexp_replace(numero_comprobante, '^[A-Z]-?', ''), '-', 2)
      ELSE left(numero_comprobante, 16)
    END
  )
WHERE numero IS NULL OR tipo_comprobante IS NULL OR punto_venta IS NULL;

-- Defaults NOT NULL para filas nuevas
ALTER TABLE pos_facturas_compra
  ALTER COLUMN tipo_comprobante SET DEFAULT 'A',
  ALTER COLUMN punto_venta SET DEFAULT '0001',
  ALTER COLUMN numero SET DEFAULT '00000000';

UPDATE pos_facturas_compra
SET
  tipo_comprobante = COALESCE(tipo_comprobante, 'A'),
  punto_venta = COALESCE(punto_venta, '0001'),
  numero = COALESCE(numero, '00000000')
WHERE tipo_comprobante IS NULL OR punto_venta IS NULL OR numero IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pos_facturas_compra_proveedor_id_numero_comprobante_key'
  ) THEN
    ALTER TABLE pos_facturas_compra
      DROP CONSTRAINT pos_facturas_compra_proveedor_id_numero_comprobante_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS pos_facturas_compra_fiscal_unique_idx
  ON pos_facturas_compra (proveedor_id, tipo_comprobante, punto_venta, numero);

-- Importaciones PDF (borrador → ejecutado)
CREATE TABLE IF NOT EXISTS pos_compras_importaciones (
  id                 SERIAL PRIMARY KEY,
  estado             VARCHAR(32) NOT NULL DEFAULT 'borrador'
                       CHECK (estado IN ('borrador', 'listo', 'ejecutado', 'cancelado')),
  proveedor_id       UUID REFERENCES suppliers (id) ON DELETE SET NULL,
  pdf_storage_key    TEXT NOT NULL,
  pdf_original_name  TEXT,
  pdf_mime           VARCHAR(128),
  pdf_size           INTEGER,
  extracted_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  warnings           JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message      TEXT,
  orden_id           INTEGER REFERENCES pos_ordenes_compra (id) ON DELETE SET NULL,
  factura_id         INTEGER REFERENCES pos_facturas_compra (id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at        TIMESTAMPTZ,
  executed_by        VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS pos_compras_importaciones_estado_idx
  ON pos_compras_importaciones (estado);

CREATE INDEX IF NOT EXISTS pos_compras_importaciones_created_idx
  ON pos_compras_importaciones (created_at DESC);
