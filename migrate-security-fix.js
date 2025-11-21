#!/usr/bin/env node

/**
 * Security Fix Migration Runner
 * This script addresses Supabase linter security warnings
 * Run this AFTER 004_stock_history.sql
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
console.log('  Security Fix Migration - 005_fix_security_issues.sql');
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
const migrationPath = join(__dirname, 'packages/database/src/migrations/005_fix_security_issues.sql');
const sql = readFileSync(migrationPath, 'utf-8');

console.log('🔒 Security Fix Migration');
console.log('');
console.log('This migration addresses Supabase linter security warnings:');
console.log('');
console.log('Issues Fixed:');
console.log('  ❌ SECURITY DEFINER views (stock_history_stats, recent_stock_updates)');
console.log('  ❌ RLS disabled on stock_history table');
console.log('');
console.log('Changes:');
console.log('  ✓ Recreate views with SECURITY INVOKER (more secure)');
console.log('  ✓ Enable RLS on stock_history table');
console.log('  ✓ Add permissive policies for v1 (no auth yet)');
console.log('');
console.log('⚠️  IMPORTANT: Run this AFTER 004_stock_history.sql');
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
  console.log('4. Verify in Database Advisor that security warnings are resolved');
  console.log('');
} else {
  console.log('📝 To run this migration:');
  console.log('');
  console.log('1. Set up your .env.local file in apps/web/ with your Supabase credentials');
  console.log('2. Open your Supabase Dashboard SQL Editor');
  console.log('3. Copy the SQL below and paste it into the editor');
  console.log('4. Click "Run" to execute the migration');
  console.log('5. Verify in Database Advisor that security warnings are resolved');
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
console.log('   1. Check Supabase Dashboard → Database → Advisors');
console.log('   2. Verify all security warnings are resolved');
console.log('   3. Restart your Next.js app if it was running');
console.log('   4. Test /historique page to ensure it still works');
console.log('');
console.log('📄 The SQL is also available at:');
console.log(`   ${migrationPath}`);
console.log('');
console.log('═'.repeat(80));
console.log('');
