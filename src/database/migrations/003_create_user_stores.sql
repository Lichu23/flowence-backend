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

