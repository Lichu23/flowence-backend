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
