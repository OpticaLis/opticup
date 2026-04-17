# Mission 3: SaaS Readiness — Checklist

The "second tenant test": find anything that would break if a new optical chain
from a different country joined tomorrow with zero code changes.

## Scan Categories

### 3.1 Hardcoded Tenant Names
```bash
grep -rn "פריזמה\|prizma\|Prizma\|PRIZMA\|optica prizma" --include="*.js" --include="*.html" . | grep -v "node_modules" | grep -v ".md" | grep -v ".sql"
```
Any reference to a specific tenant name in code → HIGH.

### 3.2 Hardcoded Addresses / Contact Info
```bash
grep -rn "רחוב\|street\|address\|טלפון\|phone.*=.*['\"]0" --include="*.js" --include="*.html" . | grep -v "node_modules" | grep -v ".md"
```
Look for: specific street addresses, phone numbers, email addresses that belong to a tenant.

### 3.3 Hardcoded Tax Rates
```bash
grep -rn "0\.17\|17%\|VAT.*=\|vat.*=\|tax.*=.*[0-9]" --include="*.js" . | grep -v "node_modules"
```
Tax rate must come from tenant config, not a literal. Israel = 17% but another country differs.

### 3.4 Hardcoded Currency
```bash
grep -rn "₪\|ILS\|NIS\|שקל" --include="*.js" --include="*.html" . | grep -v "node_modules" | grep -v ".md"
```
Currency must come from tenant config table.

### 3.5 Hardcoded Language Assumptions
Look for Hebrew-specific logic that assumes all tenants speak Hebrew:
```bash
grep -rn "he-IL\|hebrew\|direction.*rtl" --include="*.js" --include="*.html" . | grep -v "node_modules" | grep -v ".md"
```
RTL should be driven by locale config, not hardcoded.

### 3.6 Hardcoded Logo / Branding
```bash
grep -rn "logo\|brand.*image\|favicon" --include="*.js" --include="*.html" . | grep -v "node_modules"
```
Check if logo paths are hardcoded or read from tenant config.

### 3.7 Hardcoded Business Logic
Look for business rules that might be tenant-specific:
- Specific payment terms
- Specific discount rules
- Specific workflow steps tied to one tenant's process

### 3.8 Global UNIQUE Constraints (Rule 18)
```sql
SELECT tc.table_name, tc.constraint_name, 
       string_agg(kcu.column_name, ', ') as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
HAVING NOT bool_or(kcu.column_name = 'tenant_id');
```
Any UNIQUE constraint without tenant_id → HIGH (blocks multi-tenant).

## Severity Guidelines

- UNIQUE without tenant_id → HIGH
- Hardcoded tenant name in code → HIGH
- Hardcoded tax rate → HIGH
- Hardcoded currency → HIGH
- Hardcoded contact info → MEDIUM
- Hardcoded language assumption → MEDIUM
- Hardcoded logo path → MEDIUM
