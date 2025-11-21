# Working with Claude on Stock Screener

This document provides guidelines for Claude (AI assistant) when working on the Stock Screener project.

## Project Overview

**Stock Screener** is a comprehensive stock analysis tool for European equities, focusing on French and German markets. It provides financial ratio analysis, scoring, and historical tracking.

### Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** tRPC, Supabase (PostgreSQL)
- **Data Fetching:** Playwright (Yahoo Finance scraping), FMP API
- **Monorepo:** pnpm workspaces with Turbo

### Project Structure

```
stock-screener/
├── apps/
│   └── web/                 # Next.js web application
│       ├── app/             # App router pages
│       │   ├── dashboard/   # Main stock search and analysis
│       │   └── historique/  # Stock history page
│       ├── components/      # React components
│       ├── lib/             # Utilities and configuration
│       │   └── trpc/        # tRPC client and routers
│       └── package.json
├── packages/
│   ├── database/            # Supabase client and types
│   │   ├── src/
│   │   │   ├── migrations/  # SQL migrations
│   │   │   ├── types-manual.ts  # Supabase types
│   │   │   └── client.ts    # Database client
│   │   └── scripts/         # Database utilities
│   ├── scraper/             # Data fetching (Yahoo, FMP)
│   │   └── src/
│   │       ├── providers/   # Data source implementations
│   │       ├── cache/       # Caching layer
│   │       └── resolver/    # Ticker resolution
│   ├── scoring/             # Stock scoring engine
│   │   └── src/
│   │       ├── profiles/    # Scoring profiles (value, growth, dividend)
│   │       └── classification.ts  # Auto stock classification
│   └── ui/                  # Shared UI components
├── .claude/                 # Claude-specific documentation
│   ├── WORKFLOW.md          # Development workflow
│   ├── CLAUDE.md            # This file
│   └── commands/            # Custom slash commands
└── pnpm-workspace.yaml
```

## Development Workflow

**IMPORTANT:** Always follow the workflow documented in `.claude/WORKFLOW.md`:

1. **Create an Issue** on GitHub
2. **Create a branch** from `main` (format: `<type>/<description>-<issue-number>`)
3. **Make changes** and commit regularly
4. **Push the branch** to remote
5. **Create a Pull Request** to merge into `main`
6. **Merge** after review and checks pass

**Never push directly to `main`** - always use the PR workflow.

## Working with the Codebase

### Running Type Checks

**ALWAYS** run type checks before committing:

```bash
pnpm type-check
```

This runs TypeScript compiler in check mode for the web app.

### Key Conventions

#### Import Paths

- Use workspace packages: `@stock-screener/database`, `@stock-screener/scraper`, etc.
- Use alias imports in web app: `@/components`, `@/lib`, etc.
- Export from package index files for clean imports

#### TypeScript

- Strict mode enabled across all packages
- No `any` types without good reason
- Use proper type imports: `import type { ... }`
- For Supabase operations, type assertions may be needed (temporary workaround)

#### Database Operations

```typescript
// Good - Import from package root
import { createServerClient } from '@stock-screener/database';

// Use type assertions for Supabase operations when needed
const supabase = createServerClient();
await (supabase.from('stock_history') as any).upsert(...);
```

#### File Naming

- Components: `PascalCase.tsx` (e.g., `StockSearch.tsx`)
- Utilities: `kebab-case.ts` (e.g., `ticker-resolver.ts`)
- Pages: `page.tsx` (Next.js convention)
- Types: co-located with implementation

### Important Files

#### Database Migrations

- **Location:** `packages/database/src/migrations/`
- **Format:** `XXX_description.sql`
- **Latest:** `004_stock_history.sql`
- **Run via:** Supabase Dashboard SQL editor

#### tRPC Routers

- **Location:** `apps/web/lib/trpc/routers/`
- **Routers:**
  - `stock.ts` - Stock data fetching (includes auto-save to history)
  - `history.ts` - Stock history CRUD operations
  - `scoring.ts` - Score calculation
  - `settings.ts` - User settings
  - `watchlist.ts` - Watchlist management

#### Main Pages

- **Dashboard:** `apps/web/app/dashboard/page.tsx` - Main stock search
- **History:** `apps/web/app/historique/page.tsx` - Stock history table

## Common Tasks

### Adding a New Feature

1. Create issue and branch
2. Implement feature
3. Update types if needed
4. Add to relevant router if backend change
5. Create/update components if frontend change
6. Run `pnpm type-check`
7. Test manually
8. Commit, push, and create PR

### Adding a Database Table

1. Create migration file in `packages/database/src/migrations/`
2. Update `packages/database/src/types-manual.ts`
3. Export types from `packages/database/src/index.ts`
4. Run migration in Supabase Dashboard
5. Use new types in tRPC routers

### Adding a tRPC Endpoint

1. Edit or create router in `apps/web/lib/trpc/routers/`
2. Add to `_app.ts` if new router
3. Use proper Zod validation
4. Return properly typed data
5. Call from frontend with `trpc.<router>.<procedure>.useQuery()` or `useMutation()`

### Fixing Type Errors

1. Run `pnpm type-check` to see errors
2. Fix from the bottom up (packages before apps)
3. Use type assertions (`as any`) only as last resort
4. Document why if type assertion is needed
5. Re-run `pnpm type-check` to verify

## Database Schema

### Main Tables

- **`stock_history`** - All researched stocks with ratios, scores, and classification
  - Auto-populated on every stock search
  - Includes: ticker, name, price, ratios (JSON), score, verdict, stock_type
  - Last fetched timestamp for "Mettre à jour" functionality

- **`stock_cache`** - 5-minute TTL cache for API responses

- **`watchlists`** - User watchlists (not yet implemented in UI)

- **`user_settings`** - User preferences

- **`custom_scoring_profiles`** - Custom scoring profiles

### Main Views

- **`stock_history_stats`** - Aggregate statistics (total stocks, by type, average score)

## Auto-Save Behavior

**Important:** Every stock search automatically saves to `stock_history`:

1. User searches for a ticker (e.g., "CAP.PA")
2. `stock.fetch()` fetches data from Yahoo Finance or FMP
3. Stock is automatically classified (value/growth/dividend)
4. Score is calculated using appropriate profile
5. **Auto-saved** to `stock_history` table (upsert by ticker)
6. Data returned to frontend

This means the history page populates automatically without user action.

## Troubleshooting

### TypeScript Errors with Supabase

**Issue:** Supabase generated types may cause issues with upsert operations.

**Solution:** Use type assertions:
```typescript
await (supabase.from('table_name') as any).upsert(...)
```

### Missing Dependencies

**Issue:** Import errors for packages like `date-fns`.

**Solution:** Add to `apps/web/package.json`:
```json
{
  "dependencies": {
    "date-fns": "^3.0.0"
  }
}
```

### Supabase Connection Issues

**Issue:** Migration script fails due to network.

**Solution:** Run migrations manually in Supabase Dashboard:
1. Copy SQL from `packages/database/src/migrations/`
2. Go to Supabase Dashboard → SQL Editor
3. Paste and run

## Best Practices for Claude

### Before Making Changes

1. **Understand the context** - Read relevant files
2. **Check existing patterns** - Match the codebase style
3. **Plan the approach** - Think through implications

### When Writing Code

1. **Follow TypeScript strict mode** - No shortcuts
2. **Use existing utilities** - Don't reinvent
3. **Keep functions focused** - Single responsibility
4. **Add comments** - Especially for complex logic
5. **Match existing style** - Consistent formatting

### After Making Changes

1. **Run type check** - `pnpm type-check`
2. **Test manually** - Don't just assume it works
3. **Review your changes** - Check git diff
4. **Write clear commits** - Follow conventions
5. **Update docs** - If you added a feature

### Communication

1. **Be clear about changes** - Explain what and why
2. **Show relevant code** - Use code blocks
3. **Provide next steps** - What user should do
4. **Ask when uncertain** - Don't guess critical decisions

## Environment Setup

User should have a `.env.local` file in `apps/web/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
FMP_API_KEY=xxx (optional)
```

## Testing Strategy

- **Type checking:** `pnpm type-check` (required before commit)
- **Manual testing:** Always test in browser
- **Unit tests:** Limited (add when needed)
- **E2E tests:** Playwright tests exist (`apps/web/e2e/`)

## Git Conventions

### Commit Messages

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `chore` - Maintenance
- `test` - Tests

**Example:**
```
feat: Add CSV export to history page

- Implemented CSV generation utility
- Added download button with icon
- Handles all columns with proper formatting

Closes #123
```

### Branch Names

- `feature/<description>-<issue>`
- `fix/<description>-<issue>`
- `docs/<description>-<issue>`

**Example:**
```
feature/add-csv-export-123
fix/type-errors-history-124
```

## Key Principles

1. **Main branch is sacred** - Never push directly
2. **Type safety matters** - Fix all TypeScript errors
3. **Test before committing** - No broken commits
4. **Document as you go** - Update docs with features
5. **Follow conventions** - Consistency is key

## Resources

- **Workflow:** `.claude/WORKFLOW.md`
- **Database Migrations:** `packages/database/src/migrations/`
- **tRPC Routers:** `apps/web/lib/trpc/routers/`
- **Components:** `apps/web/components/`

## When in Doubt

1. Check existing similar code
2. Read the relevant documentation
3. Ask the user for clarification
4. Default to the safest option
