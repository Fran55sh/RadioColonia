-- 0015: Facturas de compra manuales — IVA por línea, descuento total, origen importación
-- Idempotente. Autoridad: migrador ecommerce.

-- Líneas OC: descuento %, alícuota e importes fiscales por línea
ALTER TABLE pos_ordenes_compra_lineas
  ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(7, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alicuota_iva NUMERIC(5, 2) NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS neto_linea NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS iva_linea NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS total_linea NUMERIC(14, 2);

-- Factura: descuento comercial a nivel comprobante (sobre neto, antes de IVA)
ALTER TABLE pos_facturas_compra
  ADD COLUMN IF NOT EXISTS descuento_total NUMERIC(14, 2) NOT NULL DEFAULT 0;

-- Origen del borrador de importación (pdf / texto / manual)
ALTER TABLE pos_compras_importaciones
  ADD COLUMN IF NOT EXISTS origen VARCHAR(16) NOT NULL DEFAULT 'pdf';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pos_compras_importaciones_origen_check'
  ) THEN
    ALTER TABLE pos_compras_importaciones
      ADD CONSTRAINT pos_compras_importaciones_origen_check
      CHECK (origen IN ('pdf', 'texto', 'manual'));
  END IF;
END $$;

-- Backfill origen según sentinel de storage
UPDATE pos_compras_importaciones
SET origen = CASE
  WHEN pdf_storage_key = 'manual' THEN 'manual'
  WHEN pdf_storage_key = 'text-only' OR pdf_mime = 'text/plain' THEN 'texto'
  ELSE 'pdf'
END
WHERE origen = 'pdf'
  AND (
    pdf_storage_key IN ('manual', 'text-only')
    OR pdf_mime = 'text/plain'
  );

CREATE INDEX IF NOT EXISTS pos_compras_importaciones_origen_idx
  ON pos_compras_importaciones (origen);
