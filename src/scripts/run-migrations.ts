/**
 * Database Migration Instructions
 * Guide to run migrations via Supabase Dashboard
 */

import { promises as fs } from 'fs';
import path from 'path';

interface MigrationFile {
  filename: string;
  number: number;
  fullPath: string;
}

async function generateMigrationSQL(): Promise<void> {
  console.log('📦 Generating combined migration SQL...\n');

  const migrationsDir = path.join(__dirname, '../database/migrations');
  
  try {
    const files = await fs.readdir(migrationsDir);
    
    const migrations: MigrationFile[] = files
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const parts = file.split('_');
        const number = parseInt(parts[0] || '0');
        return {
          filename: file,
          number: number,
          fullPath: path.join(migrationsDir, file)
        };
      })
      .sort((a, b) => a.number - b.number);

    console.log(`Found ${migrations.length} migration files:\n`);
    
    let combinedSQL = '-- =============================================\n';
    combinedSQL += '-- FLOWENCE MULTI-STORE MIGRATIONS\n';
    combinedSQL += '-- =============================================\n';
    combinedSQL += '-- Execute this in Supabase SQL Editor\n\n';

    for (const migration of migrations) {
      console.log(`  ✓ ${migration.filename}`);
      
      const sql = await fs.readFile(migration.fullPath, 'utf-8');
      
      combinedSQL += `\n-- =============================================\n`;
      combinedSQL += `-- Migration: ${migration.filename}\n`;
      combinedSQL += `-- =============================================\n\n`;
      combinedSQL += sql;
      combinedSQL += '\n\n';
    }

    // Write combined SQL to output file
    const outputPath = path.join(__dirname, '../../combined-migrations.sql');
    await fs.writeFile(outputPath, combinedSQL, 'utf-8');

    console.log('\n✅ Combined migrations generated!\n');
    console.log('📝 Next steps:');
    console.log('1. Open: server/combined-migrations.sql');
    console.log('2. Copy all the SQL');
    console.log('3. Open Supabase Dashboard → SQL Editor');
    console.log('4. Paste and run the SQL');
    console.log('5. Then run: npm run db:seed\n');

  } catch (error) {
    console.error('❌ Error generating migrations:', error);
    process.exit(1);
  }
}

generateMigrationSQL()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
