-- Migration: 005_create_sales
-- Description: Create sales and sale_items tables with store association
-- Date: 2025-10-09

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  tax DECIMAL(10,2) NOT NULL CHECK (tax >= 0),
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'other')),
  payment_status VARCHAR(50) DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for sales
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON sales(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);

-- Create indexes for sale_items
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Add comments for sales
COMMENT ON TABLE sales IS 'Sales transactions table with store association';
COMMENT ON COLUMN sales.id IS 'Unique sale identifier';
COMMENT ON COLUMN sales.store_id IS 'Reference to the store where sale occurred';
COMMENT ON COLUMN sales.user_id IS 'Reference to the user who processed the sale';
COMMENT ON COLUMN sales.subtotal IS 'Sale subtotal before tax';
COMMENT ON COLUMN sales.tax IS 'Tax amount';
COMMENT ON COLUMN sales.total IS 'Total sale amount including tax';
COMMENT ON COLUMN sales.payment_method IS 'Payment method used';
COMMENT ON COLUMN sales.payment_status IS 'Payment status';
COMMENT ON COLUMN sales.notes IS 'Additional notes about the sale';
COMMENT ON COLUMN sales.created_at IS 'Timestamp when sale was created';

-- Add comments for sale_items
COMMENT ON TABLE sale_items IS 'Individual items in a sale';
COMMENT ON COLUMN sale_items.id IS 'Unique sale item identifier';
COMMENT ON COLUMN sale_items.sale_id IS 'Reference to the sale';
COMMENT ON COLUMN sale_items.product_id IS 'Reference to the product sold';
COMMENT ON COLUMN sale_items.quantity IS 'Quantity of product sold';
COMMENT ON COLUMN sale_items.unit_price IS 'Price per unit at time of sale';
COMMENT ON COLUMN sale_items.subtotal IS 'Total for this line item (quantity * unit_price)';
COMMENT ON COLUMN sale_items.created_at IS 'Timestamp when item was added to sale';

