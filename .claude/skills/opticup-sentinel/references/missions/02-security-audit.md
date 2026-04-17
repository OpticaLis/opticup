# Mission 2: Security Audit — Checklist

Find security vulnerabilities in the codebase and database.

## Scan Categories

### 2.1 XSS (Cross-Site Scripting)
```bash
grep -rn "innerHTML" --include="*.js" --include="*.html" . | grep -v "node_modules"
```
For each hit, trace the value being assigned:
- Static HTML template → SAFE
- User input (form field, URL param, DB value from user) → CRITICAL
- DB value from admin/config → MEDIUM (should still use escapeHtml)

Also check:
```bash
grep -rn "document\.write\|eval(" --include="*.js" . | grep -v "node_modules"
```

### 2.2 Missing RLS Policies
Use Supabase MCP `execute_sql`:
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT tablename FROM pg_tables t
  JOIN pg_policies p ON t.tablename = p.tablename
  WHERE t.schemaname = 'public'
);
```
Any table without RLS → CRITICAL.

### 2.3 Wrong RLS Pattern
Check all RLS policies use the canonical JWT-claim pattern:
```sql
SELECT pol.polname, tab.relname, pg_get_expr(pol.polqual, pol.polrelid)
FROM pg_policy pol
JOIN pg_class tab ON pol.polrelid = tab.oid
WHERE tab.relnamespace = 'public'::regnamespace;
```
Flag any policy that uses `auth.uid()` instead of the JWT-claim pattern → CRITICAL.

### 2.4 Tables Without tenant_id
```sql
SELECT table_name FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
AND NOT EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema = t.table_schema
  AND c.table_name = t.table_name
  AND c.column_name = 'tenant_id'
);
```
Any table without tenant_id (except system tables like `tenants` itself) → CRITICAL.

### 2.5 Secrets in Code
```bash
grep -rn "sk_live\|sk_test\|api_key\|apiKey\|API_KEY\|secret_key\|SECRET" --include="*.js" --include="*.html" --include="*.json" . | grep -v "node_modules" | grep -v "package.json" | grep -v "package-lock"
```
Also check for:
```bash
grep -rn "supabase.*anon.*key\|service_role" --include="*.js" . | grep -v "node_modules" | grep -v ".env"
```
Any hardcoded key/secret → CRITICAL.

### 2.6 Missing tenant_id in Writes
```bash
grep -rn "\.insert(\|\.upsert(" --include="*.js" . | grep -v "node_modules"
```
For each write operation, verify `tenant_id` is included in the payload.
Missing tenant_id in a write → HIGH (Rule 22: defense-in-depth).

### 2.7 Direct Table Access from Storefront
If storefront code exists in this repo (e.g., storefront studio):
```bash
grep -rn "sb\.from(" --include="*.js" modules/storefront/ . 2>/dev/null
```
Storefront code should use Views and RPCs only → HIGH if direct access found.

### 2.8 PIN Verification Bypass
Check that PIN verification always goes through the `pin-auth` Edge Function:
```bash
grep -rn "pin\|PIN" --include="*.js" . | grep -v "node_modules" | grep -v "\.md"
```
Look for: client-side PIN comparison, PIN stored in localStorage/variables.
Any client-side PIN handling → CRITICAL.

## Severity Guidelines

- XSS with user input → CRITICAL
- Missing RLS → CRITICAL
- Wrong RLS pattern (auth.uid) → CRITICAL
- Missing tenant_id on table → CRITICAL
- Secrets in code → CRITICAL
- PIN bypass → CRITICAL
- Missing tenant_id in writes → HIGH
- Direct table access from storefront → HIGH
- innerHTML with admin/config data → MEDIUM
