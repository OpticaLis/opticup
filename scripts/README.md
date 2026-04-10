# OpticUp Scripts

## InventorySync Watcher

Node.js script that watches a Dropbox folder for Excel sales files from Access and automatically processes them into Supabase (updates inventory quantities + writes audit logs).

### Setup

```bash
cd scripts
npm install
```

### Run

```bash
node sync-watcher.js
```

### Watch folder

```
C:\Users\User\Dropbox\InventorySync\sales\
```

### File format

- Filename: `opticup_sales_YYYYMMDD_HHMMSS.xlsx`
- Sheet name: `sales_template`
- Row 1: English column headers
- Row 2: Hebrew descriptions
- Row 3+: Data rows

### Required columns

| Column | Description |
|--------|-------------|
| barcode | Inventory barcode (BBDDDDD) |
| quantity | Positive integer |
| transaction_date | YYYY-MM-DD |

### Optional columns

| Column | Description |
|--------|-------------|
| action_type | `sale` (default) or `return` |
| order_number | POS order number |
| employee_id | Employee ID from POS |
| sale_amount | Full price before discounts |
| discount | Fixed discount amount |
| discount_1 | Additional discount 1 |
| discount_2 | Additional discount 2 |
| final_amount | Final price paid |
| coupon_code | Coupon code used |
| campaign | Campaign name |
| lens_included | `yes` / `no` |
| lens_category | Lens category |

### Folder structure

```
Dropbox/InventorySync/
  sales/       <- Access drops Excel files here
  processed/   <- Successfully processed files (timestamped)
  failed/      <- Files that failed processing
```

### Behavior

- On startup: processes any existing files in `sales/`
- Then watches for new `.xlsx` files
- Waits 2 seconds for file copy to finish before processing
- Uses Supabase RPC for atomic quantity updates
- Writes audit logs to `inventory_logs` table
- Writes sync summary to `sync_log` table
- Never crashes — all errors are caught per file

---

## Verification System — `verify.mjs`

Phase 0 builds automated verification so Bounded Autonomy runs can be trusted
end-to-end. The `verify.mjs` orchestrator and `checks/` modules live here.

### Quick Start

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

### Exit Codes

| Code | Meaning                      |
|------|------------------------------|
| 0    | No violations or warnings    |
| 1    | Violations found (blocking)  |
| 2    | Warnings only (non-blocking) |

### Adding a New Check

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

### Check Module Contract

- **Input:** `files` — array of absolute file paths.
- **Input:** `options` — `{ verbose: boolean }`.
- **Output:** `{ violations: [...], warnings: [...] }`.
- Each entry: `{ check, path, line, message }`.
- Checks must be pure — no side effects, no writes.

### Current Checks

| Check | Rule | Detects |
|-------|------|---------|
| `file-size` | — | Files over 300/350 lines |
| `rule-14-tenant-id` | 14 | CREATE TABLE missing tenant_id |
| `rule-15-rls` | 15 | Tables missing RLS + policy |
| `rule-18-unique-tenant` | 18 | UNIQUE without tenant_id |
| `rule-21-orphans` | 21 | Duplicate function names across files |
| `rule-23-secrets` | 23 | Hardcoded secrets in source |
