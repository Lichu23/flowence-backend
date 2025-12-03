-- Migration: 017_add_business_size_to_stores
-- Description: Add business_size column to stores table for navigation customization
-- Date: 2025-12-02

-- Add business_size column to stores table
ALTER TABLE stores
ADD COLUMN business_size VARCHAR(20) CHECK (business_size IN ('small', 'medium_large'));

-- Add index for filtering by business size
CREATE INDEX IF NOT EXISTS idx_stores_business_size ON stores(business_size);

-- Add comment
COMMENT ON COLUMN stores.business_size IS 'Business size category (small or medium_large) - used to customize owner navigation';
