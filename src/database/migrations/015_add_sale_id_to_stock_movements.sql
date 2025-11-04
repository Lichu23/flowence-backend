-- 015_add_sale_id_to_stock_movements.sql
-- Link stock movements to sales for robust return tracking

BEGIN;

-- 1) Add sale_id column to stock_movements
ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS sale_id UUID NULL;

-- 2) Add foreign key to sales(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stock_movements_sale_id_fkey'
  ) THEN
    ALTER TABLE stock_movements
      ADD CONSTRAINT stock_movements_sale_id_fkey
      FOREIGN KEY (sale_id)
      REFERENCES sales(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Helpful indexes for queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_store_sale ON stock_movements(store_id, sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_sale ON stock_movements(product_id, sale_id);

-- Note: Backfilling sale_id from existing data is optional and environment-specific
-- because it would require parsing receipt_number from reason text and joining to sales.
-- You may run a custom backfill separately if needed.

COMMIT;
