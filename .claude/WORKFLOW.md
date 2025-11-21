# Development Workflow

This document describes the standard development workflow for the Stock Screener project.

## Branch Strategy

**Main Branch:** `main`
- The `main` branch is the primary branch
- All feature branches are created from `main`
- All pull requests merge into `main`
- Always keep `main` stable and deployable

## Standard Workflow

### 1. Create an Issue

Before starting any work, create a GitHub Issue to track the task:

```bash
# Use GitHub CLI (if available)
gh issue create --title "Feature: Add export to CSV" --body "Description of the feature..."

# Or create manually on GitHub
# https://github.com/ayoahha/stock-screener/issues/new
```

**Issue Guidelines:**
- Use clear, descriptive titles
- Prefix with type: `Feature:`, `Fix:`, `Refactor:`, `Docs:`
- Include acceptance criteria
- Add labels if applicable

### 2. Create a Feature Branch

Always create a new branch from the latest `main`:

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create a new feature branch
# Format: <type>/<short-description>-<issue-number>
git checkout -b feature/add-csv-export-123

# Examples:
# feature/add-csv-export-123
# fix/type-errors-in-history-124
# refactor/improve-scoring-algorithm-125
# docs/update-readme-126
```

**Branch Naming Convention:**
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `docs/*` - Documentation updates
- `chore/*` - Maintenance tasks

### 3. Make Changes

Work on your branch, committing regularly:

```bash
# Make changes to files
# ...

# Stage and commit
git add .
git commit -m "feat: Add CSV export functionality

- Implemented CSV generation for history data
- Added download button to history page
- Includes all columns with proper formatting

Closes #123"
```

**Commit Message Guidelines:**
- Use conventional commits format
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Include issue reference in body
- Use `Closes #123` to auto-close issues

### 4. Push to Remote

Push your branch to the remote repository:

```bash
# Push with upstream tracking
git push -u origin feature/add-csv-export-123

# For subsequent pushes
git push
```

### 5. Create a Pull Request

Create a PR to merge your branch into `main`:

```bash
# Using GitHub CLI
gh pr create \
  --base main \
  --head feature/add-csv-export-123 \
  --title "Feature: Add CSV export functionality" \
  --body "## Summary

  This PR adds CSV export functionality to the history page.

  ## Changes

  - Added CSV generation utility
  - Added download button to history page
  - Updated documentation

  ## Testing

  - [x] Tested CSV generation with various data sets
  - [x] Verified download works in all browsers
  - [x] All type checks pass

  Closes #123"

# Or create manually on GitHub
# https://github.com/ayoahha/stock-screener/compare/main...feature/add-csv-export-123
```

**PR Guidelines:**
- Use clear, descriptive titles
- Include summary of changes
- Reference related issues
- Include testing checklist
- Request review if needed

### 6. Review and Merge

After review and approval:

1. **Ensure all checks pass:**
   - TypeScript type checks
   - Linting
   - Tests (if applicable)

2. **Merge the PR:**
   - Use "Squash and merge" for clean history
   - Or "Merge commit" if preserving commit history is important
   - Delete the branch after merging

```bash
# After merge, update local main
git checkout main
git pull origin main

# Delete local feature branch
git branch -d feature/add-csv-export-123
```

## Pre-Commit Checklist

Before committing, always:

- [ ] Run type checks: `pnpm type-check`
- [ ] Run linting: `pnpm lint` (if applicable)
- [ ] Test the changes manually
- [ ] Ensure no console errors in browser
- [ ] Update documentation if needed

## Quick Reference

```bash
# Start new work
git checkout main
git pull origin main
git checkout -b feature/my-feature-123

# Work and commit
git add .
git commit -m "feat: My feature description"

# Push and create PR
git push -u origin feature/my-feature-123
gh pr create --base main

# After merge
git checkout main
git pull origin main
git branch -d feature/my-feature-123
```

## Emergency Fixes

For critical bugs in production:

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b fix/critical-bug-456

# Make fix, commit, push, and create PR immediately
git add .
git commit -m "fix: Critical bug in authentication"
git push -u origin fix/critical-bug-456
gh pr create --base main
```

## Best Practices

1. **Keep branches small and focused**
   - One feature/fix per branch
   - Easier to review and merge
   - Reduces merge conflicts

2. **Commit often with clear messages**
   - Atomic commits are better
   - Makes it easier to revert if needed

3. **Keep main up to date**
   - Pull from main frequently
   - Rebase your branch if needed

4. **Test before pushing**
   - Always run type checks
   - Test manually
   - Ensure no regressions

5. **Clean up after yourself**
   - Delete merged branches
   - Keep repository clean

## Troubleshooting

### Merge Conflicts

```bash
# Update your branch with latest main
git checkout main
git pull origin main
git checkout your-feature-branch
git merge main

# Resolve conflicts in files
# Then commit the merge
git add .
git commit -m "Merge main into feature branch"
git push
```

### Need to update branch after review

```bash
# Make additional changes
git add .
git commit -m "fix: Address review comments"
git push
```

### Accidentally committed to main

```bash
# Move changes to a new branch
git branch feature/my-forgotten-branch
git reset --hard origin/main
git checkout feature/my-forgotten-branch
git push -u origin feature/my-forgotten-branch
```
