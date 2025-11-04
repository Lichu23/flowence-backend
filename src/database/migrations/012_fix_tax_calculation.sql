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

