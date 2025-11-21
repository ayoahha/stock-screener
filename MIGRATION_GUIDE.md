# Stock History Migration Guide

## Issue

The `/historique` page is failing with database errors:

```
Could not find the table 'public.stock_history' in the schema cache
Could not find the table 'public.stock_history_stats' in the schema cache
```

## Root Cause

The `stock_history` table and `stock_history_stats` view have not been created in your Supabase database. The migration file exists (`packages/database/src/migrations/004_stock_history.sql`) but hasn't been executed yet.

## Solution

You need to run TWO migrations in your Supabase Dashboard:
1. **004_stock_history.sql** - Creates the table and views
2. **005_fix_security_issues.sql** - Fixes security warnings (REQUIRED)

### Quick Start

Run these commands to see the migration instructions:

```bash
# Step 1: Main migration (creates tables/views)
node migrate-stock-history.js

# Step 2: Security fix migration (fixes Supabase linter warnings)
node migrate-security-fix.js
```

### Manual Steps

1. **Open your Supabase SQL Editor**

   Go to: [https://supabase.com/dashboard](https://supabase.com/dashboard)

   Navigate to: SQL Editor → New Query

2. **Copy the migration SQL**

   The SQL is in: `packages/database/src/migrations/004_stock_history.sql`

   Or run: `node migrate-stock-history.js` to see the full SQL

3. **Paste and run the SQL**

   - Paste the entire SQL content into the editor
   - Click "Run" to execute

4. **Verify the migration**

   After running, you should see these new objects in your database:
   - `stock_history` table
   - `stock_history_stats` view
   - `recent_stock_updates` view

5. **Restart your app**

   ```bash
   # Stop the current server (Ctrl+C)
   pnpm start
   ```

6. **Test the historique page**

   Visit `http://localhost:3000/historique` - it should now load without errors!

### Security Fix Migration (REQUIRED)

After running the main migration, you MUST run the security fix migration to address Supabase linter warnings:

1. **Check Supabase Database Advisor**

   Navigate to: Database → Advisors

   You'll see these security warnings:
   - `security_definer_view` for `stock_history_stats`
   - `security_definer_view` for `recent_stock_updates`
   - `rls_disabled_in_public` for `stock_history`

2. **Run the security fix migration**

   ```bash
   node migrate-security-fix.js
   ```

3. **Copy and paste the SQL** from `packages/database/src/migrations/005_fix_security_issues.sql`

4. **Execute in SQL Editor**

   - Paste the SQL into a new query
   - Click "Run"

5. **Verify fixes**

   - Go back to Database → Advisors
   - All security warnings should be resolved
   - Green checkmarks for RLS and view security

6. **Restart your app** (if it was running)

   ```bash
   pnpm start
   ```

**What this fixes:**
- ✅ Changes views from `SECURITY DEFINER` to `SECURITY INVOKER` (more secure)
- ✅ Enables RLS on `stock_history` table
- ✅ Adds permissive policies for v1 (allows all operations since no auth yet)
- ✅ Prepares database for future authentication implementation

## What This Migration Creates

### `stock_history` Table
Stores all researched stocks with:
- Ticker, name, price, currency
- Financial ratios (JSON)
- Score and verdict
- Stock type classification (value/growth/dividend)
- Fetch metadata (timestamps, count)

### `stock_history_stats` View
Provides aggregate statistics:
- Total stocks count
- Count by type (value/growth/dividend)
- Average score
- Last update timestamp

### `recent_stock_updates` View
Shows the 20 most recently updated stocks

### Indexes
Multiple indexes for performance:
- Ticker, name, score, stock type
- Timestamps (last_fetched_at, updated_at)
- Full-text search on ticker and name

### Triggers
- Auto-update `updated_at` timestamp
- Auto-increment `fetch_count` on updates
- Preserve `first_added_at` on updates

## Troubleshooting

### Migration fails with "function does not exist"

Make sure you've run the initial migration (`001_initial_schema.sql`) which creates the `update_updated_at_column()` function.

Run migrations in order:
1. `001_initial_schema.sql`
2. `002_security_fixes.sql` (if exists)
3. `003_fix_search_path.sql` (if exists)
4. `004_stock_history.sql`

### Still getting errors after migration

1. Check that the migration completed successfully (no errors in SQL editor)
2. Verify the table exists: Run `SELECT * FROM stock_history LIMIT 1;` in SQL editor
3. Restart your Next.js app
4. Clear browser cache and reload

### Environment variables not found

If you see "Environment variables not found" when running the helper script:

1. Copy the example environment file:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

2. Edit `apps/web/.env.local` with your actual Supabase credentials

3. Get these values from your Supabase Dashboard:
   - Project Settings → API → Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - Project Settings → API → anon/public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Project Settings → API → service_role key (`SUPABASE_SERVICE_ROLE_KEY` - Secret!)

4. Optionally, add your FMP API key if you have one

## Files

- **Main Migration SQL**: `packages/database/src/migrations/004_stock_history.sql`
- **Security Fix SQL**: `packages/database/src/migrations/005_fix_security_issues.sql`
- **Migration Helper**: `migrate-stock-history.js`
- **Security Fix Helper**: `migrate-security-fix.js`
- **Environment Example**: `apps/web/.env.example`
- **This Guide**: `MIGRATION_GUIDE.md`

## Next Steps

After BOTH migrations are complete (004 + 005):

1. ✅ The historique page should load successfully
2. ✅ Stock searches will auto-save to history
3. ✅ You can filter, sort, and export stock history
4. ✅ Statistics will show on the history page
5. ✅ All Supabase security warnings are resolved
6. ✅ Database is prepared for future authentication

## Need Help?

If you encounter any issues:

1. Check the Supabase logs in your dashboard
2. Verify your database credentials in `.env.local`
3. Make sure you're connected to the correct Supabase project
4. Review the error messages in the browser console and server logs
