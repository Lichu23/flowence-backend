-- Add dual stock fields to products table
-- This migration adds warehouse stock and sales floor stock fields

-- Add new stock columns to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS stock_deposito INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS stock_venta INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS min_stock_deposito INTEGER DEFAULT 10 NOT NULL,
  ADD COLUMN IF NOT EXISTS min_stock_venta INTEGER DEFAULT 5 NOT NULL;

-- Add constraints to ensure stock values are non-negative
ALTER TABLE products 
  ADD CONSTRAINT chk_stock_deposito_non_negative CHECK (stock_deposito >= 0),
  ADD CONSTRAINT chk_stock_venta_non_negative CHECK (stock_venta >= 0),
  ADD CONSTRAINT chk_min_stock_deposito_positive CHECK (min_stock_deposito > 0),
  ADD CONSTRAINT chk_min_stock_venta_positive CHECK (min_stock_venta > 0);

-- Update existing products to have consistent stock values
-- Set warehouse stock to 70% of total stock and sales stock to 30%
-- This is a reasonable default distribution for existing data
UPDATE products 
SET 
  stock_deposito = FLOOR(stock * 0.7),
  stock_venta = FLOOR(stock * 0.3),
  min_stock_deposito = GREATEST(min_stock * 2, 10), -- Set warehouse minimum higher
  min_stock_venta = GREATEST(min_stock, 5) -- Keep sales minimum similar to current
WHERE stock_deposito = 0 AND stock_venta = 0; -- Only update if not already set

-- Create indexes for the new stock fields
CREATE INDEX IF NOT EXISTS idx_products_stock_deposito ON products(stock_deposito);
CREATE INDEX IF NOT EXISTS idx_products_stock_venta ON products(stock_venta);
CREATE INDEX IF NOT EXISTS idx_products_low_stock_deposito ON products(store_id, stock_deposito, min_stock_deposito);
CREATE INDEX IF NOT EXISTS idx_products_low_stock_venta ON products(store_id, stock_venta, min_stock_venta);

-- Create composite index for low stock queries
CREATE INDEX IF NOT EXISTS idx_products_dual_stock_check ON products(
  store_id, 
  stock_deposito, 
  min_stock_deposito, 
  stock_venta, 
  min_stock_venta
) WHERE is_active = true;

-- Add comments for documentation
COMMENT ON COLUMN products.stock_deposito IS 'Stock quantity in warehouse/storage';
COMMENT ON COLUMN products.stock_venta IS 'Stock quantity on sales floor';
COMMENT ON COLUMN products.min_stock_deposito IS 'Minimum threshold for warehouse stock';
COMMENT ON COLUMN products.min_stock_venta IS 'Minimum threshold for sales floor stock';

-- Create a function to automatically update the legacy 'stock' field when dual stocks change
CREATE OR REPLACE FUNCTION update_legacy_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the legacy stock field to be the sum of both stocks
  NEW.stock = NEW.stock_deposito + NEW.stock_venta;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically maintain legacy stock field
DROP TRIGGER IF EXISTS trigger_update_legacy_stock ON products;
CREATE TRIGGER trigger_update_legacy_stock
  BEFORE INSERT OR UPDATE OF stock_deposito, stock_venta ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_legacy_stock();
