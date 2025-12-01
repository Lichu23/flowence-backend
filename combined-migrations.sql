-- =============================================
-- FLOWENCE MULTI-STORE MIGRATIONS
-- =============================================
-- Execute this in Supabase SQL Editor


-- =============================================
-- Migration: 000_init.sql
-- =============================================

-- Migration: 000_init
-- Description: Initial setup and extensions
-- Date: 2025-10-09

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional security functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create function to generate random tokens
CREATE OR REPLACE FUNCTION generate_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON EXTENSION "uuid-ossp" IS 'Extension for UUID generation';
COMMENT ON EXTENSION "pgcrypto" IS 'Extension for cryptographic functions';
COMMENT ON FUNCTION generate_token IS 'Function to generate random tokens for invitations';




-- =============================================
-- Migration: 001_create_users.sql
-- =============================================

-- Migration: 001_create_users
-- Description: Create users table for authentication
-- Date: 2025-10-09

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE users IS 'Users table for authentication and authorization';
COMMENT ON COLUMN users.id IS 'Unique user identifier';
COMMENT ON COLUMN users.email IS 'User email address (unique)';
COMMENT ON COLUMN users.password_hash IS 'Hashed password using bcrypt';
COMMENT ON COLUMN users.name IS 'User full name';
COMMENT ON COLUMN users.role IS 'User role: owner or employee';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when user was last updated';




-- =============================================
-- Migration: 002_create_stores.sql
-- =============================================

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




-- =============================================
-- Migration: 003_create_user_stores.sql
-- =============================================

-- Migration: 003_create_user_stores
-- Description: Create user_stores junction table for many-to-many relationship
-- Date: 2025-10-09

-- Create user_stores junction table
CREATE TABLE IF NOT EXISTS user_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure a user can only have one relationship per store
  UNIQUE(user_id, store_id)
);

-- Create composite index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_stores_user_id ON user_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stores_store_id ON user_stores(store_id);
CREATE INDEX IF NOT EXISTS idx_user_stores_user_role ON user_stores(user_id, role);

-- Add comments
COMMENT ON TABLE user_stores IS 'Junction table linking users to stores (many-to-many)';
COMMENT ON COLUMN user_stores.id IS 'Unique relationship identifier';
COMMENT ON COLUMN user_stores.user_id IS 'Reference to user';
COMMENT ON COLUMN user_stores.store_id IS 'Reference to store';
COMMENT ON COLUMN user_stores.role IS 'User role in this specific store';
COMMENT ON COLUMN user_stores.created_at IS 'Timestamp when relationship was created';




-- =============================================
-- Migration: 004_create_products.sql
-- =============================================

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




-- =============================================
-- Migration: 005_create_sales.sql
-- =============================================

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




-- =============================================
-- Migration: 006_create_invitations.sql
-- =============================================

-- Migration: 006_create_invitations
-- Description: Create invitations table for store-specific employee invitations
-- Date: 2025-10-09

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'employee' CHECK (role IN ('owner', 'employee')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitations_store_id ON invitations(store_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_store_status ON invitations(store_id, status);

-- Add trigger to update updated_at
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE invitations IS 'Invitations table for store-specific employee invitations';
COMMENT ON COLUMN invitations.id IS 'Unique invitation identifier';
COMMENT ON COLUMN invitations.store_id IS 'Reference to the store for this invitation';
COMMENT ON COLUMN invitations.email IS 'Email address of invited user';
COMMENT ON COLUMN invitations.token IS 'Unique token for invitation link';
COMMENT ON COLUMN invitations.role IS 'Role to be assigned when invitation is accepted';
COMMENT ON COLUMN invitations.status IS 'Current status of invitation';
COMMENT ON COLUMN invitations.invited_by IS 'User who sent the invitation';
COMMENT ON COLUMN invitations.expires_at IS 'Expiration timestamp for invitation';
COMMENT ON COLUMN invitations.accepted_at IS 'Timestamp when invitation was accepted';
COMMENT ON COLUMN invitations.created_at IS 'Timestamp when invitation was created';
COMMENT ON COLUMN invitations.updated_at IS 'Timestamp when invitation was last updated';




-- =============================================
-- Migration: 009_create_stock_movements.sql
-- =============================================

-- Create stock_movements table for audit trail
-- This table tracks all stock movements (restock, adjustments, sales, returns)

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  store_id UUID NOT NULL,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('restock', 'adjustment', 'sale', 'return')),
  stock_type VARCHAR(10) NOT NULL CHECK (stock_type IN ('deposito', 'venta')),
  quantity_change INTEGER NOT NULL, -- Positive for increase, negative for decrease
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

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_store ON stock_movements(product_id, store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_store_created ON stock_movements(store_id, created_at);

-- Add comments for documentation
COMMENT ON TABLE stock_movements IS 'Audit trail for all stock movements (restock, adjustments, sales, returns)';
COMMENT ON COLUMN stock_movements.id IS 'Unique identifier for the stock movement';
COMMENT ON COLUMN stock_movements.product_id IS 'Reference to the product that was moved';
COMMENT ON COLUMN stock_movements.store_id IS 'Reference to the store where the movement occurred';
COMMENT ON COLUMN stock_movements.movement_type IS 'Type of movement: restock, adjustment, sale, return';
COMMENT ON COLUMN stock_movements.stock_type IS 'Which stock was affected: deposito (warehouse) or venta (sales floor)';
COMMENT ON COLUMN stock_movements.quantity_change IS 'Amount changed (positive for increase, negative for decrease)';
COMMENT ON COLUMN stock_movements.quantity_before IS 'Stock quantity before the movement';
COMMENT ON COLUMN stock_movements.quantity_after IS 'Stock quantity after the movement';
COMMENT ON COLUMN stock_movements.reason IS 'Reason for the stock movement';
COMMENT ON COLUMN stock_movements.performed_by IS 'User who performed the movement';
COMMENT ON COLUMN stock_movements.notes IS 'Additional notes about the movement';
COMMENT ON COLUMN stock_movements.created_at IS 'When the movement was recorded';

-- Enable Row Level Security (RLS) if using Supabase
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for stock movements - users can only see movements from their stores
CREATE POLICY "Users can view stock movements from their stores" ON stock_movements
  FOR SELECT USING (
    store_id IN (
      SELECT us.store_id 
      FROM user_stores us 
      WHERE us.user_id = auth.uid()
    )
  );

-- Create RLS policy for inserting stock movements - users can only insert movements for their stores
CREATE POLICY "Users can insert stock movements for their stores" ON stock_movements
  FOR INSERT WITH CHECK (
    store_id IN (
      SELECT us.store_id 
      FROM user_stores us 
      WHERE us.user_id = auth.uid()
    )
  );



-- =============================================
-- Migration: 010_add_dual_stock_to_products.sql
-- =============================================

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



-- =============================================
-- Migration: 011_create_sales.sql
-- =============================================

-- Sales and Sale Items tables
create table if not exists sales (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  user_id uuid not null references users(id),
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text not null check (payment_method in ('cash','card','mixed')),
  payment_status text not null default 'completed' check (payment_status in ('completed','refunded','cancelled','pending')),
  receipt_number text not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists sales_receipt_unique on sales(store_id, receipt_number);
create index if not exists sales_store_idx on sales(store_id);
create index if not exists sales_created_idx on sales(created_at desc);

create table if not exists sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  product_sku text,
  product_barcode text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  subtotal numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  stock_type text not null default 'venta' check (stock_type in ('venta','deposito')),
  created_at timestamptz default now()
);

create index if not exists sale_items_sale_idx on sale_items(sale_id);
create index if not exists sale_items_product_idx on sale_items(product_id);

comment on table sales is 'Sales per store';
comment on table sale_items is 'Items per sale';




-- =============================================
-- Migration: 012_fix_tax_calculation.sql
-- =============================================

-- Migration: 012_fix_tax_calculation
-- Description: Fix incorrect tax calculations in existing sales
-- Date: 2025-10-15
-- Issue: tax was calculated as subtotal * tax_rate instead of subtotal * (tax_rate / 100)

-- Step 1: Add temporary column to track which sales were fixed
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_fixed BOOLEAN DEFAULT FALSE;

-- Step 2: Recalculate tax and total for existing sales
-- This assumes tax_rate is stored as a percentage (e.g., 16.00 for 16%)
UPDATE sales s
SET 
  tax = ROUND(s.subtotal * (st.tax_rate / 100), 2),
  total = ROUND(s.subtotal + (s.subtotal * (st.tax_rate / 100)) - COALESCE(s.discount, 0), 2),
  tax_fixed = TRUE
FROM stores st
WHERE s.store_id = st.id
  AND s.tax_fixed = FALSE
  AND s.tax != ROUND(s.subtotal * (st.tax_rate / 100), 2); -- Only update if tax is wrong

-- Step 3: Report on fixed sales
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count FROM sales WHERE tax_fixed = TRUE;
  RAISE NOTICE 'Fixed % sales with incorrect tax calculation', fixed_count;
END $$;

-- Step 4: Optional - Remove the tracking column after verification
-- Uncomment the line below after verifying the fix worked correctly
-- ALTER TABLE sales DROP COLUMN IF EXISTS tax_fixed;

-- Add comment
COMMENT ON COLUMN sales.tax_fixed IS 'Temporary column to track sales that had tax recalculated (can be removed after verification)';

-- Example: Show before/after for verification
-- SELECT 
--   id, 
--   subtotal,
--   tax as old_tax,
--   ROUND(subtotal * (16.00 / 100), 2) as corrected_tax,
--   total as old_total,
--   ROUND(subtotal + (subtotal * (16.00 / 100)), 2) as corrected_total
-- FROM sales 
-- WHERE tax_fixed = TRUE
-- LIMIT 10;




-- =============================================
-- Migration: 013_create_refresh_tokens.sql
-- =============================================

-- Migration: 013_create_refresh_tokens
-- Description: Create refresh_tokens table for persistent session management
-- Date: 2025-10-15

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);

-- Add comments
COMMENT ON TABLE refresh_tokens IS 'Persistent refresh tokens for session management';
COMMENT ON COLUMN refresh_tokens.id IS 'Unique refresh token identifier';
COMMENT ON COLUMN refresh_tokens.user_id IS 'User who owns this refresh token';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Hashed version of the refresh token (for security)';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'When this token expires (defaults to 90 days)';
COMMENT ON COLUMN refresh_tokens.is_revoked IS 'Whether this token has been revoked (logout)';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'When this token was revoked';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'Browser/device information';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP address where token was created';
COMMENT ON COLUMN refresh_tokens.created_at IS 'When this token was created';
COMMENT ON COLUMN refresh_tokens.last_used_at IS 'Last time this token was used for refresh';

-- Cleanup function: Remove expired tokens older than 30 days
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM refresh_tokens 
  WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_refresh_tokens();');




-- =============================================
-- Migration: 014_add_store_settings.sql
-- =============================================

-- Migration: 014_add_store_settings
-- Description: Add additional store configuration settings
-- Date: 2025-10-19

-- Add new columns to stores table for enhanced configuration
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS date_format VARCHAR(50) DEFAULT 'MM/DD/YYYY',
ADD COLUMN IF NOT EXISTS time_format VARCHAR(20) DEFAULT '12h',
ADD COLUMN IF NOT EXISTS receipt_header TEXT,
ADD COLUMN IF NOT EXISTS receipt_footer TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#1E40AF';

-- Add comments for new columns
COMMENT ON COLUMN stores.timezone IS 'Store timezone (e.g., America/New_York, Europe/London)';
COMMENT ON COLUMN stores.date_format IS 'Date display format (e.g., MM/DD/YYYY, DD/MM/YYYY)';
COMMENT ON COLUMN stores.time_format IS 'Time display format (12h or 24h)';
COMMENT ON COLUMN stores.receipt_header IS 'Custom text to display at the top of receipts';
COMMENT ON COLUMN stores.receipt_footer IS 'Custom text to display at the bottom of receipts (e.g., thank you message)';
COMMENT ON COLUMN stores.logo_url IS 'URL to store logo image';
COMMENT ON COLUMN stores.primary_color IS 'Primary brand color (hex format)';
COMMENT ON COLUMN stores.secondary_color IS 'Secondary brand color (hex format)';



-- =============================================
-- Migration: 015_add_sale_id_to_stock_movements.sql
-- =============================================

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



-- =============================================
-- Migration: 016_add_performance_indexes.sql
-- =============================================

-- Migration: 016_add_performance_indexes
-- Description: Add composite and optimized indexes to improve query performance
-- Date: 2025-12-01
-- Issue: Product queries taking 882ms - reducing to <50ms with proper indexing

-- Composite index for the most common query pattern (store + category + active)
-- This index is used when filtering products by store, category, and active status
-- Covers queries like: WHERE store_id = ? AND category = ? AND is_active = true
CREATE INDEX IF NOT EXISTS idx_products_store_category_active
ON products(store_id, category, is_active);

-- Descending index for sorting by created_at DESC
-- This index is used for ORDER BY created_at DESC queries
-- Much faster than ascending index when sorting in descending order
CREATE INDEX IF NOT EXISTS idx_products_created_at_desc
ON products(created_at DESC);

-- Composite index for low stock alerts with active filter
-- Optimizes queries that check stock levels against minimums for active products
CREATE INDEX IF NOT EXISTS idx_products_low_stock_active
ON products(store_id, is_active, stock_venta, min_stock_venta)
WHERE is_active = true;

-- Composite index for category filtering with active status
-- Optimizes category dropdown and filter queries
CREATE INDEX IF NOT EXISTS idx_products_category_active
ON products(category, is_active)
WHERE category IS NOT NULL;

-- Add comments for documentation
COMMENT ON INDEX idx_products_store_category_active IS 'Composite index for common product filtering queries (store + category + active)';
COMMENT ON INDEX idx_products_created_at_desc IS 'Descending index for sorting products by creation date (newest first)';
COMMENT ON INDEX idx_products_low_stock_active IS 'Partial index for low stock alert queries on active products';
COMMENT ON INDEX idx_products_category_active IS 'Partial index for category filtering on active products';


