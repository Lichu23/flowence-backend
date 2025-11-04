-- Migration: 002_create_stores
-- Description: Create stores table for multi-store management
-- Date: 2025-10-09

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'USD',
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  low_stock_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on owner_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);

-- Create index on name for searching
CREATE INDEX IF NOT EXISTS idx_stores_name ON stores(name);

-- Add trigger to update updated_at
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE stores IS 'Stores table for multi-store management';
COMMENT ON COLUMN stores.id IS 'Unique store identifier';
COMMENT ON COLUMN stores.owner_id IS 'Reference to the user who owns this store';
COMMENT ON COLUMN stores.name IS 'Store name';
COMMENT ON COLUMN stores.address IS 'Store physical address';
COMMENT ON COLUMN stores.phone IS 'Store contact phone number';
COMMENT ON COLUMN stores.currency IS 'Store currency code (ISO 4217)';
COMMENT ON COLUMN stores.tax_rate IS 'Store tax rate percentage (e.g., 16.00 for 16%)';
COMMENT ON COLUMN stores.low_stock_threshold IS 'Stock level to trigger low stock alerts';
COMMENT ON COLUMN stores.created_at IS 'Timestamp when store was created';
COMMENT ON COLUMN stores.updated_at IS 'Timestamp when store was last updated';

