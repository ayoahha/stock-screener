# Database Migration Instructions

## Migration 005: AI Usage Tracking

**Purpose**: Add tables and views for tracking AI API usage, costs, and performance.

### How to Apply

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Open `packages/database/src/migrations/005_ai_usage_tracking.sql`
   - Copy the entire contents

4. **Execute Migration**
   - Paste the SQL into the query editor
   - Click "Run" or press `Cmd/Ctrl + Enter`

5. **Verify Success**
   - You should see "Success. No rows returned" (or similar)
   - Check "Table Editor" → you should see `ai_usage_log` table
   - Check "Database" → Views → you should see 4 new views:
     - `ai_current_month_spend`
     - `ai_daily_stats`
     - `ai_top_cost_drivers`
     - `ai_model_comparison`

### What This Migration Creates

**Table**: `ai_usage_log`
- Tracks every AI API call
- Records: tokens, cost, confidence, success/failure
- Indexed for fast queries

**Views**: Analytics and monitoring
- Real-time budget tracking
- Daily usage statistics
- Cost drivers analysis
- Model performance comparison

### Rollback (if needed)

If you need to undo this migration:

```sql
-- Drop views
DROP VIEW IF EXISTS ai_model_comparison;
DROP VIEW IF EXISTS ai_top_cost_drivers;
DROP VIEW IF EXISTS ai_daily_stats;
DROP VIEW IF EXISTS ai_current_month_spend;

-- Drop table
DROP TABLE IF EXISTS ai_usage_log;
```

### Next Steps

After running this migration:
1. Configure environment variables (see `.env.example`)
2. Add your OpenRouter API key
3. Test AI fallback by searching for a stock
