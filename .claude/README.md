# .claude Directory

This directory contains documentation and tools specifically for working with Claude AI on the Stock Screener project.

## 📚 Documentation

### [WORKFLOW.md](./WORKFLOW.md)
**Development workflow and Git conventions**

Essential reading for understanding how to contribute to the project:
- Branch strategy (main branch workflow)
- Issue → Branch → PR → Merge process
- Commit message conventions
- Pre-commit checklist
- Best practices

**Read this first** before making any changes.

### [CLAUDE.md](./CLAUDE.md)
**Claude-specific guidelines and project context**

Comprehensive guide for Claude AI when working on this project:
- Project structure overview
- Tech stack details
- Key conventions and patterns
- Common tasks and how to accomplish them
- Troubleshooting guide
- Database schema reference

## 🛠️ Tools

### Custom Slash Commands

Located in `./commands/` directory:

- **`/create-prompt`** - Expert prompt engineering tool for creating optimized prompts

To use: Type `/create-prompt [description]` in Claude Code.

## 📋 Quick Reference

### Starting Work

```bash
# 1. Create issue on GitHub
gh issue create --title "Feature: My feature"

# 2. Create branch from main
git checkout main
git pull origin main
git checkout -b feature/my-feature-123

# 3. Make changes, commit, push
git add .
git commit -m "feat: My feature description"
git push -u origin feature/my-feature-123

# 4. Create PR
gh pr create --base main
```

### Before Committing

```bash
# Always run type check
pnpm type-check

# Ensure no errors
# If errors, fix them before committing
```

### After PR Merge

```bash
# Update local main
git checkout main
git pull origin main

# Delete feature branch
git branch -d feature/my-feature-123
```

## 🎯 Key Principles

1. **Never push directly to main** - Always use PR workflow
2. **Type check before committing** - `pnpm type-check` must pass
3. **One feature per branch** - Keep changes focused
4. **Clear commit messages** - Follow conventional commits
5. **Test manually** - Don't rely on type checks alone

## 📁 Project Structure

```
stock-screener/
├── apps/
│   └── web/               # Next.js application
│       ├── app/           # Pages (dashboard, historique)
│       ├── components/    # React components
│       └── lib/trpc/      # tRPC routers
├── packages/
│   ├── database/          # Supabase client + migrations
│   ├── scraper/           # Data fetching (Yahoo, FMP)
│   ├── scoring/           # Stock scoring engine
│   └── ui/                # Shared components
└── .claude/               # This directory
    ├── README.md          # This file
    ├── WORKFLOW.md        # Git workflow
    ├── CLAUDE.md          # Claude guidelines
    └── commands/          # Custom commands
```

## 🔗 Important Links

- **Repository:** https://github.com/ayoahha/stock-screener
- **Main Branch:** `main`
- **Issue Tracker:** https://github.com/ayoahha/stock-screener/issues

## 📝 Common Tasks

### Add New Feature
1. Create issue
2. Create branch from main
3. Implement feature
4. Run `pnpm type-check`
5. Commit and push
6. Create PR

### Fix Bug
1. Create issue (if not exists)
2. Create fix branch
3. Fix and test
4. Run `pnpm type-check`
5. Commit and push
6. Create PR

### Update Documentation
1. Edit relevant files
2. Commit with `docs:` prefix
3. Push and create PR

## 🆘 Getting Help

1. **Check documentation first:**
   - `WORKFLOW.md` for Git workflow
   - `CLAUDE.md` for project details

2. **Look at existing code:**
   - Find similar functionality
   - Match existing patterns

3. **Ask user for clarification:**
   - Don't guess on important decisions
   - Confirm approach before big changes

## ⚙️ Configuration

### Environment Variables

Required in `apps/web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Package Manager

- Use `pnpm` (not npm or yarn)
- Workspace configuration in `pnpm-workspace.yaml`

## 🧪 Testing

```bash
# Type checking (required before commit)
pnpm type-check

# Manual testing
# Test in browser at http://localhost:3000
```

## 🔄 Update Process

When documentation needs updates:

1. Edit files in `.claude/`
2. Commit with clear message
3. Push to branch and create PR
4. Merge to main after review

---

**Last Updated:** 2025-01-21
**Version:** 1.0.0
