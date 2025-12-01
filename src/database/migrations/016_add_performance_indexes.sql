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
