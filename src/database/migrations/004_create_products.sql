-- Migration: 004_create_products
-- Description: Create products table with store association
-- Date: 2025-10-09

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  barcode VARCHAR(100),
  sku VARCHAR(100),
  category VARCHAR(100),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  cost DECIMAL(10,2) NOT NULL CHECK (cost >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  unit VARCHAR(50) NOT NULL DEFAULT 'unit',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- Unique constraints for barcode and SKU per store
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_barcode ON products(store_id, barcode) 
WHERE barcode IS NOT NULL AND barcode != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_sku ON products(store_id, sku) 
WHERE sku IS NOT NULL AND sku != '';

-- Add trigger to update updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE products IS 'Products table with store-specific inventory';
COMMENT ON COLUMN products.id IS 'Unique product identifier';
COMMENT ON COLUMN products.store_id IS 'Reference to the store this product belongs to';
COMMENT ON COLUMN products.name IS 'Product name';
COMMENT ON COLUMN products.barcode IS 'Product barcode (unique per store)';
COMMENT ON COLUMN products.sku IS 'Product SKU (unique per store)';
COMMENT ON COLUMN products.price IS 'Product selling price';
COMMENT ON COLUMN products.cost IS 'Product cost price for profit calculation';
COMMENT ON COLUMN products.stock IS 'Current stock quantity';
COMMENT ON COLUMN products.min_stock IS 'Minimum stock threshold for low stock alerts';
COMMENT ON COLUMN products.unit IS 'Unit of measurement (unit, kg, box, etc.)';
COMMENT ON COLUMN products.category IS 'Product category';
COMMENT ON COLUMN products.description IS 'Product description';
COMMENT ON COLUMN products.image_url IS 'URL to product image';
COMMENT ON COLUMN products.is_active IS 'Whether product is active for sales';
COMMENT ON COLUMN products.created_at IS 'Timestamp when product was created';
COMMENT ON COLUMN products.updated_at IS 'Timestamp when product was last updated';

