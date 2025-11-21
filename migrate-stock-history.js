#!/usr/bin/env node

/**
 * Migration runner for stock_history table
 * This script will execute the 004_stock_history.sql migration
 */

const { readFileSync } = require('fs');
const { join } = require('path');

// Try to load environment from apps/web/.env.local
try {
  const envPath = join(__dirname, 'apps/web/.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  });
} catch (error) {
  // .env.local not found, will check for env vars below
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('');
console.log('═'.repeat(80));
console.log('  Stock History Migration - 004_stock_history.sql');
console.log('═'.repeat(80));
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.log('⚠️  Environment variables not found');
  console.log('');
  console.log('To run this migration, you need to set the following environment variables:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY');
  console.log('');
  console.log('These should be in apps/web/.env.local file');
  console.log('');
}

// Read migration SQL
const migrationPath = join(__dirname, 'packages/database/src/migrations/004_stock_history.sql');
const sql = readFileSync(migrationPath, 'utf-8');

console.log('📋 Migration Instructions');
console.log('');
console.log('This migration will create:');
console.log('  ✓ stock_history table - stores all researched stocks');
console.log('  ✓ stock_history_stats view - aggregate statistics');
console.log('  ✓ recent_stock_updates view - recent updates');
console.log('  ✓ Indexes for performance');
console.log('  ✓ Triggers for auto-updating timestamps');
console.log('');
console.log('─'.repeat(80));
console.log('');

if (supabaseUrl) {
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  console.log('🔗 Your Supabase Project:');
  console.log(`   ${supabaseUrl}`);
  console.log('');
  console.log('📝 To run this migration:');
  console.log('');
  console.log('1. Open your Supabase SQL Editor:');
  if (projectRef) {
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  } else {
    console.log(`   ${supabaseUrl}/project/_/sql`);
  }
  console.log('');
  console.log('2. Copy the SQL below and paste it into the editor');
  console.log('');
  console.log('3. Click "Run" to execute the migration');
  console.log('');
} else {
  console.log('📝 To run this migration:');
  console.log('');
  console.log('1. Set up your .env.local file in apps/web/ with your Supabase credentials');
  console.log('2. Open your Supabase Dashboard SQL Editor');
  console.log('3. Copy the SQL below and paste it into the editor');
  console.log('4. Click "Run" to execute the migration');
  console.log('');
}

console.log('─'.repeat(80));
console.log('SQL MIGRATION:');
console.log('─'.repeat(80));
console.log('');
console.log(sql);
console.log('');
console.log('─'.repeat(80));
console.log('');
console.log('💡 After running the migration:');
console.log('   - Restart your Next.js app (pnpm start)');
console.log('   - Visit /historique to verify it works');
console.log('');
console.log('📄 The SQL is also available at:');
console.log(`   ${migrationPath}`);
console.log('');
console.log('═'.repeat(80));
console.log('');
