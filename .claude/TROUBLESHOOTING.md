# Troubleshooting Guide

This document contains solutions to common issues encountered during development.

## File Watcher Limit Errors (ENOSPC)

### Symptom
```
Watchpack Error (watcher): Error: ENOSPC: System limit for number of file watchers reached
```

### Cause
Linux systems have a limit on the number of files that can be watched for changes. In development environments with monorepos and many packages (like this project with Turbo and pnpm workspaces), this limit can be easily exceeded.

### Solution

**Temporary fix (until next reboot):**
```bash
sudo sysctl fs.inotify.max_user_watches=524288
sudo sysctl -p
```

**Permanent fix:**
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Verification
Check the current limit:
```bash
cat /proc/sys/fs/inotify/max_user_watches
```

### Notes
- The default limit is usually 8192, which is too low for modern monorepos
- Setting it to 524288 should be sufficient for most projects
- This change is safe and commonly recommended for development environments
- The watcher limit is per-user, so it won't affect other users on the system

## Tailwind Config Errors

### Symptom
```
ReferenceError: require is not defined
    at /home/ayo/Projects/stock-screener/apps/web/tailwind.config.ts
```

### Cause
The tailwind.config.ts file is an ES module (uses `import`/`export`), but was using CommonJS `require()` syntax for plugins.

### Solution
The tailwind.config.ts has been updated to use ES module imports:

```typescript
// ❌ Old (CommonJS in ES module)
plugins: [require('tailwindcss-animate')],

// ✅ New (ES module)
import tailwindcssAnimate from 'tailwindcss-animate';
// ...
plugins: [tailwindcssAnimate],
```

This issue has been fixed in the codebase.

## Next.js Type Errors

If you encounter TypeScript errors in Next.js components or tRPC routers:

1. Run type check to see all errors:
   ```bash
   pnpm type-check
   ```

2. Common fixes:
   - Check imports are using correct package paths (`@stock-screener/*`)
   - Verify Supabase types are up to date in `packages/database/src/types-manual.ts`
   - For Supabase operations, type assertions may be needed (temporary workaround)

3. If type errors persist after fixes, restart the dev server:
   ```bash
   pnpm dev
   ```

## Database Connection Issues

If you're having trouble connecting to Supabase:

1. Check your `.env.local` file exists in `apps/web/` with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   SUPABASE_SERVICE_ROLE_KEY=xxx
   ```

2. Verify the environment variables are loaded:
   - Restart dev server after changing `.env.local`
   - Check the "Environments" line in Next.js startup logs

3. Test connection in Supabase Dashboard:
   - Go to SQL Editor
   - Run a simple query like `SELECT * FROM stock_history LIMIT 1;`

## pnpm Install Issues

If package installation fails:

1. Clear caches and reinstall:
   ```bash
   pnpm store prune
   rm -rf node_modules
   rm pnpm-lock.yaml
   pnpm install
   ```

2. Check pnpm version:
   ```bash
   pnpm --version
   # Should be 8.x or higher
   ```

3. If using different Node versions, ensure consistency:
   ```bash
   node --version
   # Should be 18.x or higher
   ```

## Build Errors

If the build fails:

1. Run type check first:
   ```bash
   pnpm type-check
   ```

2. Clear Next.js cache:
   ```bash
   rm -rf apps/web/.next
   pnpm dev
   ```

3. For Turbo cache issues:
   ```bash
   pnpm turbo clean
   pnpm install
   pnpm dev
   ```

## Getting Help

If you encounter an issue not covered here:

1. Check recent commits for similar fixes
2. Review `.claude/CLAUDE.md` and `.claude/WORKFLOW.md`
3. Search GitHub issues
4. Create a new issue with:
   - Error message (full stack trace)
   - Steps to reproduce
   - Environment info (OS, Node version, pnpm version)
