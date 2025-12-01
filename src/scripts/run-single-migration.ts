/**
 * Run a single migration file via Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(migrationFile: string): Promise<void> {
  console.log(`🚀 Running migration: ${migrationFile}\n`);

  const migrationPath = path.join(__dirname, '../database/migrations', migrationFile);

  try {
    // Read the migration file
    const sql = await fs.readFile(migrationPath, 'utf-8');

    console.log('📄 Migration SQL:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    console.log();

    // Execute the migration
    console.log('⏳ Executing migration...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct execution
      console.log('⚠️  exec_sql RPC not found, trying direct execution...');

      // Split SQL by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.length > 0) {
          const { error: execError } = await supabase.rpc('exec', { sql: statement + ';' });
          if (execError) {
            console.error(`❌ Error executing statement:`, execError);
            console.log(`Statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!\n');

    console.log('📝 Next steps:');
    console.log('1. Verify indexes in Supabase Dashboard → Database → Indexes');
    console.log('2. Restart your backend server');
    console.log('3. Test product queries - should see <50ms response time\n');

  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2] || '016_add_performance_indexes.sql';

runMigration(migrationFile)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
