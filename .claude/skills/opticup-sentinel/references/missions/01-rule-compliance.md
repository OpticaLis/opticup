# Mission 1: Rule Compliance — Checklist

Scan the codebase for violations of all 30 Iron Rules.

## How to Run

For each rule below, run the specified check. Report any violation found.

### Rule 1: Atomic Quantity Changes
```bash
grep -rn "quantity\s*=" --include="*.js" . | grep -v "quantity = quantity" | grep -v "node_modules"
```
Look for: direct quantity assignment instead of atomic RPC increment/decrement.
False positives: variable declarations, non-DB quantity assignments.

### Rule 2: writeLog on Changes
Search for `.update(` and `.insert(` calls that modify quantity or price fields.
Check if `writeLog()` is called nearby (within 10 lines after).
```bash
grep -rn "\.update(" --include="*.js" . | grep -v "node_modules"
```

### Rule 3: Soft Delete Only
```bash
grep -rn "\.delete()" --include="*.js" . | grep -v "node_modules" | grep -v "is_deleted"
```
Look for: hard delete calls without `is_deleted` flag pattern.

### Rule 4: Barcode Format
```bash
grep -rn "barcode" --include="*.js" . | grep -v "node_modules"
```
Verify format generation follows BBDDDDD pattern. Flag any modification to barcode logic.

### Rule 5: FIELD_MAP Completeness
1. Read `shared.js` and extract all FIELD_MAP entries
2. Scan DB schema for all columns
3. Report any DB field not in FIELD_MAP (excluding system fields like id, created_at, updated_at)

### Rule 6: index.html Location
```bash
ls -la index.html
```
Must exist in repo root.

### Rule 7: API Abstraction
```bash
grep -rn "sb\.from(" --include="*.js" . | grep -v "node_modules" | grep -v "shared.js"
```
Every hit outside shared.js is a potential violation. Check if it's a specialized join
that can't go through helpers.

### Rule 8: Security & Sanitization
```bash
grep -rn "innerHTML" --include="*.js" --include="*.html" . | grep -v "node_modules"
```
For each hit: check if the value comes from user input. If yes — violation.
Safe: static HTML, template literals with no user data.

### Rule 9: No Hardcoded Business Values
```bash
grep -rn "פריזמה\|prizma\|Prizma\|PRIZMA" --include="*.js" --include="*.html" . | grep -v "node_modules" | grep -v ".md"
```
Also check for hardcoded: phone numbers, addresses, tax rates (17%, 0.17),
currency symbols, logo paths.

### Rule 10: Name Collision Check
Not auditable statically — this is a process rule. Skip in automated scan.

### Rule 11: Sequential Numbers via RPC
```bash
grep -rn "SELECT.*MAX.*FROM\|select.*max.*from" --include="*.js" . | grep -v "node_modules"
```
Look for: client-side MAX+1 patterns for sequential number generation.

### Rule 12: File Size
```bash
find . -name "*.js" -not -path "*/node_modules/*" -exec wc -l {} + | sort -rn | head -20
```
Flag any file over 300 lines (warning) or over 350 lines (violation).

### Rule 13: Views-Only External
Check storefront-related code for direct table access instead of Views/RPC.

### Rules 14-15: tenant_id and RLS
Use Supabase MCP to list tables and check:
- Every table has tenant_id column
- Every table has RLS enabled with the canonical JWT-claim pattern

### Rule 18: UNIQUE Constraints
Use Supabase MCP to check all UNIQUE constraints include tenant_id.

### Rules 16, 17, 19, 20: Manual review
These are design rules — check during code review, not automated scan.
Note in report: "Rules 16, 17, 19, 20 require manual architectural review."

### Rules 21-23: Hygiene
- Rule 21: Check for duplicate function names across files
- Rule 22: Check `.insert(` and `.upsert(` calls include tenant_id
- Rule 23: Check for secrets (API keys, passwords, tokens in code)
```bash
grep -rn "sk_live\|sk_test\|password\s*=\s*['\"]" --include="*.js" . | grep -v "node_modules"
```

## Severity Guidelines

- Missing tenant_id or RLS → CRITICAL
- innerHTML with user input → CRITICAL
- Secrets in code → CRITICAL
- Hardcoded business values → HIGH
- File over 350 lines → HIGH
- File over 300 lines → MEDIUM
- Direct sb.from() outside shared.js → MEDIUM
- Missing writeLog → MEDIUM
