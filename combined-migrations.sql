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



