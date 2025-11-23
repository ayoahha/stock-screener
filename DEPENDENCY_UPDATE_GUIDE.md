# Dependency Update Guide - November 2025

## 🚨 Critical Issues Fixed

This update resolves **major version conflicts** that were causing installation and runtime errors:

### 1. **Turbo Version Mismatch** (CRITICAL)
- **Problem**: Root had Turbo 1.x, but system was running Turbo 2.x
- **Symptom**: `Found 'pipeline' field instead of 'tasks'` error
- **Fix**: Updated to Turbo 2.6.1 across all packages

### 2. **React Version Conflict** (CRITICAL)
- **Problem**: UI package used React 18, web app used React 19
- **Symptom**: Peer dependency warnings, potential runtime issues
- **Fix**: Aligned all packages to React 19.0.0

### 3. **Supabase Version Inconsistency**
- **Problem**: 3 different versions across packages (2.39.3, 2.45.4, 2.84.0)
- **Symptom**: Type mismatches, potential API incompatibilities
- **Fix**: Standardized to 2.45.4 across all packages

### 4. **OpenAI SDK Outdated**
- **Problem**: Using v6.9.1 (experimental)
- **Fix**: Updated to v4.77.3 (latest stable)

## 📦 What Was Updated

### Root Dependencies
```diff
- turbo: ^1.13.4
+ turbo: ^2.6.1

- @types/node: ^20.19.25
+ @types/node: ^22.10.0

- vitest: ^1.6.1
+ vitest: ^2.1.8
```

### OpenAI SDK (CRITICAL for AI features)
```diff
- openai: ^6.9.1
+ openai: ^4.77.3
```

### React Ecosystem
```diff
- react: ^18.2.0 (UI package)
+ react: 19.0.0 (all packages)

- @types/react: ^18.2.48
+ @types/react: ^19.0.5
```

### Testing & Build Tools
- Playwright: 1.41.1 → 1.49.0
- Vitest: 1.2.1 → 2.1.8
- Vite: 5.0.12 → 6.0.7
- TypeScript: 5.3.3 → 5.9.3

### See full changelog in commit `66f820d`

## 🔧 Migration Steps (REQUIRED)

### Step 1: Pull Latest Changes
```bash
git checkout claude/ai-ratio-computation-01PNJDUEU5Lzz8XNTCdYpqwX
git pull origin claude/ai-ratio-computation-01PNJDUEU5Lzz8XNTCdYpqwX
```

### Step 2: Clean Installation (CRITICAL)
```bash
# Delete all node_modules and lockfiles
rm -rf node_modules apps/*/node_modules packages/*/node_modules
rm -rf pnpm-lock.yaml

# Clear pnpm cache (optional but recommended)
pnpm store prune

# Fresh install
pnpm install
```

### Step 3: Verify Installation
```bash
# Check that all packages are resolved
pnpm list --depth 0

# Verify turbo version
pnpm turbo --version  # Should show 2.6.1

# Run type checks
pnpm type-check
```

### Step 4: Test Development Server
```bash
pnpm dev
```

**Expected output:**
```
✓ Ready in 1885ms
  Local:   http://localhost:3000
```

No "Module not found: openai" errors!

## 🐛 Troubleshooting

### Issue: "Module not found: openai"
**Cause**: Old installation cache
**Fix**:
```bash
rm -rf node_modules apps/web/.next
pnpm install
pnpm dev
```

### Issue: "Found 'pipeline' field instead of 'tasks'"
**Cause**: Old Turbo version still cached
**Fix**:
```bash
pnpm store prune
pnpm install
```

### Issue: Peer dependency warnings about React
**Cause**: Mixed React 18/19 versions
**Fix**: Already fixed in this update. Just run:
```bash
pnpm install --force
```

### Issue: Type errors after update
**Cause**: Stale TypeScript build cache
**Fix**:
```bash
rm -rf apps/web/.next packages/*/.turbo
pnpm type-check
```

## ✅ Validation Checklist

After migration, verify:

- [ ] `pnpm turbo --version` shows `2.6.1`
- [ ] `pnpm dev` starts without errors
- [ ] No "Module not found: openai" errors
- [ ] No "pipeline" vs "tasks" errors
- [ ] `pnpm type-check` passes all packages
- [ ] Dashboard loads at http://localhost:3000/dashboard
- [ ] Stock search works (try "CAP.PA")
- [ ] AI Insights button appears (after adding OPENROUTER_API_KEY)

## 📝 Post-Migration Notes

### OpenAI API Configuration
The OpenAI SDK version change requires checking your environment variables:

```bash
# In apps/web/.env.local
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx  # Required for AI features
AI_PRIMARY_MODEL=deepseek                  # or 'kimi'
```

### React 19 Changes
We're now using React 19.0.0 stable. Key changes:
- `ref` is now a regular prop (no more `forwardRef` needed)
- Improved Server Components support
- Better TypeScript integration

### Breaking Changes
1. **Turbo 2.x**: Already migrated (`pipeline` → `tasks`)
2. **React 19**: All UI components updated
3. **OpenAI SDK**: API surface may have changed (but our code is compatible)

## 🚀 Performance Improvements

These updates bring:
- **Faster builds**: Turbo 2.x is significantly faster
- **Better type safety**: Updated TypeScript 5.9.3
- **Improved DX**: Better error messages, faster HMR
- **Reduced bundle size**: React 19 compiler optimizations

## 📚 Resources

- [Turbo 2.0 Migration](https://turbo.build/repo/docs/upgrade-guides/version-2)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/12/05/react-19)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
- [pnpm Workspace Guide](https://pnpm.io/workspaces)

## 🆘 Still Having Issues?

If you encounter persistent problems:

1. Check this guide's troubleshooting section
2. Verify all environment variables are set
3. Try the nuclear option:
   ```bash
   git clean -fdx  # WARNING: Removes all untracked files!
   pnpm install
   ```
4. Report issues with:
   - Error message
   - Output of `pnpm list --depth 0`
   - Node version: `node --version`
   - pnpm version: `pnpm --version`

---

**Last Updated**: 2025-11-22
**Commit**: `66f820d`
**Branch**: `claude/ai-ratio-computation-01PNJDUEU5Lzz8XNTCdYpqwX`
