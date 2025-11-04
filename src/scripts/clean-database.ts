/**
 * Clean Database Script
 * Simple script to guide manual cleanup via Supabase Dashboard
 */

console.log('🧹 DATABASE CLEANUP INSTRUCTIONS\n');
console.log('⚠️  IMPORTANT: This requires manual action in Supabase Dashboard\n');

console.log('📝 Steps to clean your database:');
console.log('');
console.log('1. Open your Supabase Dashboard: https://supabase.com/dashboard');
console.log('2. Go to: SQL Editor');
console.log('3. Copy and paste this SQL:\n');

console.log(`
-- Drop all tables in correct order
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS user_stores CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS stores CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_token(INTEGER) CASCADE;

-- Success message
SELECT 'Database cleaned successfully!' as status;
`);

console.log('\n4. Click "Run" to execute the SQL');
console.log('5. After cleanup, run: npm run db:migrate');
console.log('6. Then run: npm run db:seed\n');

console.log('💡 TIP: You can also manually delete tables from the "Table Editor" section\n');

process.exit(0);
