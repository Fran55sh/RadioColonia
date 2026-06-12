-- Facturación electrónica POS: datos fiscales de clientes y comprobantes ARCA.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pos_clientes' AND column_name = 'documento_tipo_afip'
  ) THEN
    ALTER TABLE pos_clientes ADD COLUMN documento_tipo_afip VARCHAR(16);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pos_clientes' AND column_name = 'condicion_iva_receptor_id'
  ) THEN
    ALTER TABLE pos_clientes ADD COLUMN condicion_iva_receptor_id INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pos_clientes' AND column_name = 'razon_social'
  ) THEN
    ALTER TABLE pos_clientes ADD COLUMN razon_social VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pos_clientes' AND column_name = 'domicilio_fiscal'
  ) THEN
    ALTER TABLE pos_clientes ADD COLUMN domicilio_fiscal TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pos_clientes' AND column_name = 'padron_checked_at'
  ) THEN
    ALTER TABLE pos_clientes ADD COLUMN padron_checked_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pos_clientes' AND column_name = 'padron_raw'
  ) THEN
    ALTER TABLE pos_clientes ADD COLUMN padron_raw JSONB;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS pos_comprobantes_fiscales (
  id                          SERIAL PRIMARY KEY,
  venta_id                    INTEGER NOT NULL REFERENCES pos_ventas (id) ON DELETE CASCADE,
  estado                      VARCHAR(16) NOT NULL DEFAULT 'pendiente'
                              CHECK (estado IN ('pendiente', 'emitido', 'error', 'anulado')),
  ambiente                    VARCHAR(8) NOT NULL DEFAULT 'dev',
  emisor_cuit                 VARCHAR(11) NOT NULL,
  punto_venta                 INTEGER NOT NULL,
  cbte_tipo                   INTEGER NOT NULL,
  cbte_nro                    INTEGER,
  fecha_cbte                  DATE,
  cae                         VARCHAR(20),
  cae_vencimiento             DATE,
  qr_url                      TEXT,
  doc_tipo                    INTEGER,
  doc_nro                     BIGINT,
  condicion_iva_receptor_id   INTEGER,
  neto_gravado                NUMERIC(14, 2) NOT NULL DEFAULT 0,
  iva_total                   NUMERIC(14, 2) NOT NULL DEFAULT 0,
  exento                      NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total                       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  error_code                  VARCHAR(32),
  error_message               TEXT,
  raw_response                JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (venta_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_comprobantes_fiscales_estado
  ON pos_comprobantes_fiscales (estado, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_comprobantes_fiscales_numero
  ON pos_comprobantes_fiscales (ambiente, punto_venta, cbte_tipo, cbte_nro)
  WHERE cbte_nro IS NOT NULL AND estado = 'emitido';
