# Database Migrations

This directory contains SQL migration files for the Stock Screener database.

## Migration Order

Migrations should be run in numerical order:

1. ✅ **001_initial_schema.sql** - Creates initial tables (user_settings, watchlists, custom_scoring_profiles, stock_cache)
2. ✅ **002_security_fixes.sql** - Security improvements for initial schema
3. ✅ **003_fix_search_path.sql** - Fixes PostgreSQL search path issues
4. ⚠️ **004_stock_history.sql** - Creates stock_history table and views (SEE BELOW)
5. 🔒 **005_fix_security_issues.sql** - Fixes RLS and view security warnings (REQUIRED after 004)
6. 🔒 **006_fix_function_search_path.sql** - Fixes function search_path warning (REQUIRED after 004)

## Important: Migration 004 + 005 + 006

If you've run migration **004_stock_history.sql**, you **MUST** also run **005_fix_security_issues.sql** and **006_fix_function_search_path.sql** to address all Supabase security warnings.

### Why?

Migration 004 creates the stock_history infrastructure but has these security issues:
- Views use `SECURITY DEFINER` (dangerous)
- RLS is disabled on `stock_history` table (flagged as security risk)
- Function `increment_fetch_count` has mutable search_path (potential security issue)

Migration 005 fixes view and RLS issues:
- Changes views to `SECURITY INVOKER` (more secure)
- Enables RLS on `stock_history` table
- Adds permissive policies for v1 (no auth yet)

Migration 006 fixes function security:
- Sets explicit `search_path = public` on `increment_fetch_count` function
- Prevents potential SQL injection via search_path manipulation

### Quick Start

```bash
# Display migration 004 SQL
node migrate-stock-history.js

# Display migration 005 SQL (RLS and view security)
node migrate-security-fix.js

# Migration 006 SQL is short, copy from file directly
cat packages/database/src/migrations/006_fix_function_search_path.sql
```

## Running Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the SQL from the migration file
4. Paste and run

### Option 2: Using Helper Scripts

```bash
# From project root
node migrate-stock-history.js      # Shows 004 SQL
node migrate-security-fix.js        # Shows 005 SQL
```

## Verifying Migrations

After running migrations, verify in Supabase Dashboard:

1. **Tables**: Database → Tables
   - Check that `stock_history` exists
   - Verify RLS is enabled (green shield icon)

2. **Views**: Database → Views
   - Check that `stock_history_stats` exists
   - Check that `recent_stock_updates` exists

3. **Security**: Database → Advisors
   - Should have no errors or warnings
   - All security checks should pass

## Migration Details

### 004_stock_history.sql

Creates:
- `stock_history` table with columns:
  - ticker, name, price, currency, source
  - ratios (JSONB)
  - score, verdict, stock_type
  - Timestamps (created_at, updated_at, last_fetched_at, first_added_at)
  - fetch_count
- `stock_history_stats` view (aggregate statistics)
- `recent_stock_updates` view (last 20 updates)
- Multiple indexes for performance
- Triggers for auto-updating timestamps

### 005_fix_security_issues.sql

Fixes:
- Recreates views with `SECURITY INVOKER` instead of `SECURITY DEFINER`
- Enables RLS on `stock_history` table
- Adds four permissive policies:
  - Allow public read access
  - Allow public insert access
  - Allow public update access
  - Allow public delete access

These permissive policies are safe for v1 (no authentication) and can be replaced with proper policies when auth is implemented.

### 006_fix_function_search_path.sql

Fixes:
- Recreates `increment_fetch_count()` function with explicit `search_path = public`
- Adds `SECURITY DEFINER` with secure search_path setting
- Prevents potential security issues from search_path manipulation

This is a small but important security fix that ensures the function always operates in the expected schema context.

## Troubleshooting

### "Function does not exist"

Make sure you've run migration 001 first, which creates the `update_updated_at_column()` function.

### Security warnings still present

1. Make sure you ran migrations 005 AND 006
2. Refresh the Database Advisors page
3. Check that RLS is enabled on `stock_history`
4. Verify views are using SECURITY INVOKER:
   ```sql
   SELECT viewname, security_type
   FROM pg_views
   WHERE schemaname = 'public'
   AND viewname IN ('stock_history_stats', 'recent_stock_updates');
   ```
5. Verify function has search_path set:
   ```sql
   SELECT p.proname, p.prosecdef, pg_get_function_identity_arguments(p.oid)
   FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public' AND p.proname = 'increment_fetch_count';
   ```

### App still fails to connect

1. Verify environment variables are set in `apps/web/.env.local`
2. Restart your Next.js app
3. Check Supabase logs for errors
4. Verify service role key has necessary permissions

## Need Help?

See the main **MIGRATION_GUIDE.md** in the project root for detailed step-by-step instructions.
