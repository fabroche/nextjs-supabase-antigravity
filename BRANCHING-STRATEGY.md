# Branching Strategy

> Reusable branching convention for all projects. Reference this document in your project's memory or CLAUDE.md.

---

## Branch Naming Convention

```
<type>/<scope>-<short-description>
```

### Types

| Type | Purpose | Example |
|------|---------|---------|
| `feature/` | New functionality or sprint work | `feature/sprint2-reports-tab` |
| `fix/` | Bug fixes | `fix/metrics-view-date-filter` |
| `hotfix/` | Urgent production fixes | `hotfix/auth-session-expired` |
| `docs/` | Documentation-only changes | `docs/update-migration-readme` |
| `refactor/` | Code restructuring, no behavior change | `refactor/extract-auth-hook` |
| `chore/` | Tooling, deps, config, CI/CD | `chore/upgrade-nextjs-17` |
| `test/` | Adding or fixing tests | `test/auth-flow-e2e` |

### Rules

1. **Always lowercase**, use hyphens (`-`) as word separators — never underscores or camelCase
2. **Scope is optional** but recommended for sprint work (e.g., `sprint2`, `auth`, `dashboard`)
3. **Keep it short** — max ~50 characters. The branch name should be scannable, not a full description
4. **Use the ticket/sprint ID** when applicable (e.g., `feature/sprint2-reports-tab`)
5. **No personal prefixes** — avoid `john/feature-x`. Use the type prefix instead

### Examples

```
feature/sprint2-reports-tab
feature/sprint3-realtime-notifications
fix/business-metrics-upper-bound
hotfix/auth-cookie-expiry
docs/sprint4-plan
refactor/sidebar-component
chore/add-eslint-rules
test/otp-verification
```

---

## Branch Lifecycle

```
main
 └── feature/sprint2-reports-tab
      ├── work, commit, push
      ├── open PR → main
      ├── review + merge (squash or merge commit)
      └── delete branch after merge
```

### Flow

1. **Create branch** from `main` (always up to date)
2. **Work and commit** with [Conventional Commits](https://www.conventionalcommits.org/)
3. **Push and open PR** targeting `main`
4. **Merge via PR** — squash merge for feature branches, merge commit for multi-commit branches with meaningful history
5. **Delete branch** after merge — keep `main` as the only long-lived branch

### Protected Branch

- `main` is the production branch — never push directly
- All changes go through PRs

---

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional-scope>): <description>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `perf`, `ci`, `build`

**Examples**:
```
feat(reports): add date range picker component
fix(auth): handle expired OTP gracefully
docs: update claude.md with Sprint 2 changes
chore: install papaparse for CSV export
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Create branch | `git checkout -b feature/sprint2-reports-tab main` |
| Push + set upstream | `git push -u origin feature/sprint2-reports-tab` |
| Create PR | `gh pr create --base main` |
| Delete after merge | `git branch -d feature/sprint2-reports-tab` |

---

_Version: 1.0_
