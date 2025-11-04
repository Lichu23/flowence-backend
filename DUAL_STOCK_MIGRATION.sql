-- ============================================================================
-- FLOWENCE: Dual Stock System Migration
-- Execute this SQL in Supabase SQL Editor
-- Date: October 12, 2025
-- ============================================================================

-- ============================================================================
-- STEP 1: Create stock_movements table (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  store_id UUID NOT NULL,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('restock', 'adjustment', 'sale', 'return')),
  stock_type VARCHAR(10) NOT NULL CHECK (stock_type IN ('deposito', 'venta')),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason VARCHAR(255) NOT NULL,
  performed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_movements_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_movements_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_store_id ON stock_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_performed_by ON stock_movements(performed_by);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_store ON stock_movements(product_id, store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_store_created ON stock_movements(store_id, created_at);

-- Add table and column comments
COMMENT ON TABLE stock_movements IS 'Audit trail for all stock movements (restock, adjustments, sales, returns)';
COMMENT ON COLUMN stock_movements.movement_type IS 'Type of movement: restock, adjustment, sale, return';
COMMENT ON COLUMN stock_movements.stock_type IS 'Which stock was affected: deposito (warehouse) or venta (sales floor)';

-- Enable Row Level Security (RLS)
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see movements from their stores
CREATE POLICY "Users can view stock movements from their stores" ON stock_movements
  FOR SELECT USING (
    store_id IN (
      SELECT us.store_id 
      FROM user_stores us 
      WHERE us.user_id = auth.uid()
    )
  );

-- RLS policy: users can only insert movements for their stores
CREATE POLICY "Users can insert stock movements for their stores" ON stock_movements
  FOR INSERT WITH CHECK (
    store_id IN (
      SELECT us.store_id 
      FROM user_stores us 
      WHERE us.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 2: Add dual stock columns to products table
-- ============================================================================

-- Add new stock columns
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS stock_deposito INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS stock_venta INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS min_stock_deposito INTEGER DEFAULT 10 NOT NULL,
  ADD COLUMN IF NOT EXISTS min_stock_venta INTEGER DEFAULT 5 NOT NULL;

-- Add constraints to ensure non-negative values
ALTER TABLE products 
  ADD CONSTRAINT chk_stock_deposito_non_negative CHECK (stock_deposito >= 0),
  ADD CONSTRAINT chk_stock_venta_non_negative CHECK (stock_venta >= 0),
  ADD CONSTRAINT chk_min_stock_deposito_positive CHECK (min_stock_deposito > 0),
  ADD CONSTRAINT chk_min_stock_venta_positive CHECK (min_stock_venta > 0);

-- ============================================================================
-- STEP 3: Migrate existing data
-- ============================================================================

-- Update existing products to distribute stock (70% warehouse, 30% sales)
UPDATE products 
SET 
  stock_deposito = FLOOR(stock * 0.7),
  stock_venta = FLOOR(stock * 0.3),
  min_stock_deposito = GREATEST(min_stock * 2, 10),
  min_stock_venta = GREATEST(min_stock, 5)
WHERE stock_deposito = 0 AND stock_venta = 0;

-- ============================================================================
-- STEP 4: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_stock_deposito ON products(stock_deposito);
CREATE INDEX IF NOT EXISTS idx_products_stock_venta ON products(stock_venta);
CREATE INDEX IF NOT EXISTS idx_products_low_stock_deposito ON products(store_id, stock_deposito, min_stock_deposito);
CREATE INDEX IF NOT EXISTS idx_products_low_stock_venta ON products(store_id, stock_venta, min_stock_venta);

-- Composite index for low stock queries
CREATE INDEX IF NOT EXISTS idx_products_dual_stock_check ON products(
  store_id, 
  stock_deposito, 
  min_stock_deposito, 
  stock_venta, 
  min_stock_venta
) WHERE is_active = true;

-- ============================================================================
-- STEP 5: Add column comments
-- ============================================================================

COMMENT ON COLUMN products.stock_deposito IS 'Stock quantity in warehouse/storage';
COMMENT ON COLUMN products.stock_venta IS 'Stock quantity on sales floor';
COMMENT ON COLUMN products.min_stock_deposito IS 'Minimum threshold for warehouse stock';
COMMENT ON COLUMN products.min_stock_venta IS 'Minimum threshold for sales floor stock';

-- ============================================================================
-- STEP 6: Create trigger to auto-update legacy stock field
-- ============================================================================

-- Function to automatically sync legacy 'stock' field
CREATE OR REPLACE FUNCTION update_legacy_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the legacy stock field to be the sum of both stocks
  NEW.stock = NEW.stock_deposito + NEW.stock_venta;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain legacy stock field automatically
DROP TRIGGER IF EXISTS trigger_update_legacy_stock ON products;
CREATE TRIGGER trigger_update_legacy_stock
  BEFORE INSERT OR UPDATE OF stock_deposito, stock_venta ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_legacy_stock();

-- ============================================================================
-- Verification Query (Run this to confirm migration was successful)
-- ============================================================================

-- Uncomment and run to verify:
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'products'
--   AND column_name IN ('stock_deposito', 'stock_venta', 'min_stock_deposito', 'min_stock_venta')
-- ORDER BY column_name;

-- Should return 4 rows showing the new columns

-- ============================================================================
-- MIGRATION COMPLETE ✅
-- ============================================================================

