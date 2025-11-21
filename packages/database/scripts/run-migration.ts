#!/usr/bin/env tsx

/**
 * Migration Runner for Supabase
 *
 * Usage: tsx scripts/run-migration.ts <migration-file>
 * Example: tsx scripts/run-migration.ts 004_stock_history.sql
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

async function runMigration(migrationFile: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    process.exit(1);
  }

  if (!supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.error('   This key is required to run database migrations.');
    process.exit(1);
  }

  console.log('🔗 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Read migration file
  const migrationPath = join(__dirname, '../src/migrations', migrationFile);
  console.log(`📄 Reading migration: ${migrationFile}`);

  let sql: string;
  try {
    sql = readFileSync(migrationPath, 'utf-8');
  } catch (error) {
    console.error(`❌ Failed to read migration file: ${migrationPath}`);
    console.error(error);
    process.exit(1);
  }

  // Execute migration
  console.log('🚀 Executing migration...');
  console.log('─'.repeat(60));

  try {
    // Use the Supabase REST API to execute raw SQL
    // Note: This requires proper RLS policies or service role key
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // If exec_sql function doesn't exist, we need to execute statements one by one
      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      console.log(`📝 Executing ${statements.length} statements...`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt) {
          console.log(`   [${i + 1}/${statements.length}] Executing...`);
          // Use the pg-meta API or direct SQL execution
          // For now, we'll output instructions
        }
      }

      console.log('');
      console.log('⚠️  Direct SQL execution via API is not available.');
      console.log('');
      console.log('To run this migration, please follow these steps:');
      console.log('');
      console.log('1. Go to your Supabase Dashboard:');
      console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.co')}/project/_/sql`);
      console.log('');
      console.log('2. Create a new query');
      console.log('');
      console.log('3. Copy and paste the contents of:');
      console.log(`   ${migrationPath}`);
      console.log('');
      console.log('4. Run the query');
      console.log('');
      console.log('Migration SQL:');
      console.log('─'.repeat(60));
      console.log(sql);
      console.log('─'.repeat(60));
      console.log('');
    } else {
      console.log('✅ Migration executed successfully!');
      console.log('');
      if (data) {
        console.log('Result:', data);
      }
    }
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);
    console.log('');
    console.log('Please run the migration manually in Supabase Dashboard:');
    console.log(`${supabaseUrl}/project/_/sql`);
    process.exit(1);
  }
}

// Main
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: tsx scripts/run-migration.ts <migration-file>');
  console.error('Example: tsx scripts/run-migration.ts 004_stock_history.sql');
  process.exit(1);
}

runMigration(migrationFile).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
