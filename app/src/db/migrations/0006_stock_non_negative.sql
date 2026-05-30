-- Red de seguridad: stock compartido ecommerce + POS no puede volverse negativo.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_stock_non_negative'
  ) THEN
    ALTER TABLE product_variants
      ADD CONSTRAINT product_variants_stock_non_negative CHECK (stock >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_non_negative'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
  END IF;
END $$;
