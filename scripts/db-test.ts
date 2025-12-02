/**
 * Database Connection Test Script
 *
 * Tests the database connection (PostgreSQL or Supabase)
 * Usage: pnpm db:test
 */

import 'dotenv/config';

async function main() {
  console.log('=================================');
  console.log('Database Connection Test');
  console.log('=================================\n');

  // Detect backend
  const isPostgres = !!(process.env.DATABASE_URL || process.env.POSTGRES_HOST);
  const isSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);

  console.log('Environment:');
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
  console.log(`  POSTGRES_HOST: ${process.env.POSTGRES_HOST || 'Not set'}`);
  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'}`);
  console.log('');

  if (isPostgres) {
    console.log('Backend: PostgreSQL (local/Docker)\n');
    await testPostgres();
  } else if (isSupabase) {
    console.log('Backend: Supabase (cloud)\n');
    await testSupabase();
  } else {
    console.log('No database configuration found!');
    console.log('');
    console.log('For PostgreSQL (Docker), set:');
    console.log('  DATABASE_URL=postgresql://stockscreener:stockscreener@localhost:5432/stockscreener');
    console.log('');
    console.log('For Supabase, set:');
    console.log('  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co');
    console.log('  SUPABASE_SERVICE_ROLE_KEY=xxx');
    process.exit(1);
  }
}

async function testPostgres() {
  const { testConnection, getPool } = await import('@stock-screener/database');

  try {
    console.log('Testing PostgreSQL connection...');
    const connected = await testConnection();

    if (!connected) {
      console.log('\nConnection failed! Check your configuration.');
      process.exit(1);
    }

    console.log('\nRunning test queries...');
    const pool = getPool();

    // Test 1: Check tables exist
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\nTables found:');
    tablesResult.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });

    // Test 2: Count stock history
    const countResult = await pool.query('SELECT COUNT(*) as count FROM stock_history');
    console.log(`\nStock history entries: ${countResult.rows[0].count}`);

    // Test 3: Check views
    const viewsResult = await pool.query(`
      SELECT table_name as view_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\nViews found:');
    viewsResult.rows.forEach((row) => {
      console.log(`  - ${row.view_name}`);
    });

    console.log('\n=================================');
    console.log('All tests passed!');
    console.log('=================================');
  } catch (error) {
    console.error('\nError:', error);
    process.exit(1);
  }
}

async function testSupabase() {
  const { createServerClient } = await import('@stock-screener/database');

  try {
    console.log('Testing Supabase connection...');
    const supabase = createServerClient();

    // Test: Query stock_history_stats
    const { data, error } = await (supabase as any)
      .from('stock_history_stats')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('\nError:', error);
      process.exit(1);
    }

    console.log('\nConnection successful!');
    if (data) {
      console.log('Stats:', data);
    } else {
      console.log('No stock history data yet.');
    }

    console.log('\n=================================');
    console.log('All tests passed!');
    console.log('=================================');
  } catch (error) {
    console.error('\nError:', error);
    process.exit(1);
  }
}

main().catch(console.error);
