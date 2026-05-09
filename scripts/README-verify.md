# Verification System — `verify.mjs`

Phase 0 builds automated verification so Bounded Autonomy runs can be trusted
end-to-end. The `verify.mjs` orchestrator and `checks/` modules live here.

## Quick Start

```bash
# Check staged files (default — runs in pre-commit hook)
npm run verify

# Check all files in the repo
npm run verify:full

# Run a single check
node scripts/verify.mjs --full --only=file-size

# Verbose output (lists every file scanned)
node scripts/verify.mjs --full --verbose
```

## Exit Codes

| Code | Meaning                      |
|------|------------------------------|
| 0    | No violations or warnings    |
| 1    | Violations found (blocking)  |
| 2    | Warnings only (non-blocking) |

## Adding a New Check

1. Create a `.mjs` file in `scripts/checks/`.
2. Export a default async function:
   ```js
   export default async function(files, options) {
     // files: string[] — absolute paths to check
     // options: { verbose: boolean }
     return {
       violations: [{ check: 'name', path: 'file', line: 1, message: '...' }],
       warnings:   [{ check: 'name', path: 'file', line: 1, message: '...' }],
     };
   }
   ```
3. `verify.mjs` auto-discovers it — no registration needed.

## Check Module Contract

- **Input:** `files` — array of absolute file paths.
- **Input:** `options` — `{ verbose: boolean }`.
- **Output:** `{ violations: [...], warnings: [...] }`.
- Each entry: `{ check, path, line, message }`.
- Checks must be pure — no side effects, no writes.

## Current Checks

| Check | Rule | Detects |
|-------|------|---------|
| `file-size` | 12 | Files over 300/350 lines |
| `null-bytes` | 31 | Cowork-VM-style null-byte corruption |
| `rule-14-tenant-id` | 14 | CREATE TABLE missing tenant_id |
| `rule-15-rls` | 15 | Tables missing RLS + policy |
| `rule-18-unique-tenant` | 18 | UNIQUE without tenant_id |
| `rule-21-orphans` | 21 | Duplicate function names across files |
| `rule-23-secrets` | 23 | Hardcoded secrets in source |
| `check-root-discipline` | §0.5 | New root-level files not on allowlist |
