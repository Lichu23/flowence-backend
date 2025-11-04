-- =============================================
-- CLEAN DATABASE SCRIPT
-- =============================================
-- Execute this in Supabase SQL Editor to clean old schema
-- and prepare for new multi-store architecture

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- =============================================
-- 1. DROP ALL TABLES (in order)
-- =============================================
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS user_stores CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS stores CASCADE;

-- =============================================
-- 2. DROP ALL TRIGGERS
-- =============================================
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;

-- =============================================
-- 3. DROP ALL FUNCTIONS
-- =============================================
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_modified_column() CASCADE;
DROP FUNCTION IF EXISTS generate_token(INTEGER) CASCADE;

-- =============================================
-- 4. DROP ALL EXTENSIONS (if needed)
-- =============================================
-- Note: Be careful with this in production
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
-- DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- =============================================
-- 5. VERIFY CLEANUP
-- =============================================
SELECT 
  '✅ Database cleaned successfully!' as status,
  'Ready for new migrations' as message,
  NOW() as timestamp;

-- List remaining tables (should be empty or only system tables)
SELECT 
  table_name 
FROM 
  information_schema.tables 
WHERE 
  table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY 
  table_name;

