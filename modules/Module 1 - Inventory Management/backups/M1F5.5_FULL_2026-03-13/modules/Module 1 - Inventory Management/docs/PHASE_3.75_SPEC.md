# Optic Up — Phase 3.75: Multi-Tenancy Foundation

> **Phase 3.75 — Infrastructure**
> **Dependencies:** Phase 3.5 complete
> **Location:** modules/Module 1 - Inventory Management/docs/PHASE_3.75_SPEC.md

---

## 1. Overview

Phase 3.75 is a **zero-feature phase**. It adds no UI, no buttons, no screens.
Its job is to retrofit the entire existing database and codebase for
multi-tenancy — so that every phase from 4 onward is SaaS-ready from day one.

**The rule:** After this phase, if a second optics store joins tomorrow,
their data is completely isolated from Prizma's. No code changes needed.

---

## 2. What Changes

```
Before 3.75:                          After 3.75:
┌──────────────┐                     ┌──────────────┐
│  All tables   │                     │  All tables   │
│  No tenant_id │                     │  tenant_id ✓  │
│  No RLS       │                     │  RLS ✓        │
│  Direct calls │                     │  Contracts ✓  │
└──────────────┘                     └──────────────┘
```

---

## 3. Execution Order

```
Step 1 — Create tenants table + seed Prizma as tenant #1
Step 2 — Add tenant_id to ALL existing tables (migration)
Step 3 — Backfill tenant_id for all existing rows
Step 4 — Add NOT NULL constraint + indexes
Step 5 — Create RLS policies on all tables
Step 6 — Update JS code — inject tenant_id on all writes
Step 7 — Update JS code — filter by tenant_id on all reads
Step 8 — Create shared RPC functions (contracts)
Step 9 — Verification & testing
Step 10 — Documentation update
```

---

## 4. Step 1 — Tenants Table

```sql
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                    -- "אופטיקה פריזמה"
  slug            TEXT UNIQUE NOT NULL,             -- "prizma" (URL-safe)
  logo_url        TEXT,
  default_currency TEXT DEFAULT 'ILS',              -- ISO 4217
  timezone        TEXT DEFAULT 'Asia/Jerusalem',
  locale          TEXT DEFAULT 'he-IL',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Seed Prizma
INSERT INTO tenants (name, slug, default_currency)
VALUES ('אופטיקה פריזמה', 'prizma', 'ILS');
```

**Design notes:**
- `slug` is for future URL routing: `app.opticup.com/prizma/`
- `default_currency` — used as default for new invoices (Phase 4)
- `locale` — future i18n support (Hebrew first, but not hardcoded)
- `timezone` — for date display and alert scheduling

---

## 5. Step 2 — Add tenant_id to All Existing Tables

Every table below gets `tenant_id UUID REFERENCES tenants(id)`.

### Tables requiring tenant_id:

**Core inventory:**
- `inventory`
- `inventory_logs`
- `brands`
- `models`
- `sizes`
- `colors`

**Suppliers & purchasing:**
- `suppliers`
- `purchase_orders`
- `purchase_order_items`
- `goods_receipts`
- `goods_receipt_items`

**Stock counting:**
- `stock_counts`
- `stock_count_items`

**Access bridge:**
- `sync_log`
- `pending_sales`
- `watcher_heartbeat`

**Auth & admin:**
- `employees`
- `roles`
- `permissions`
- `role_permissions`
- `employee_roles`
- `auth_sessions`

**Migration pattern (per table):**
```sql
ALTER TABLE {table_name}
  ADD COLUMN tenant_id UUID REFERENCES tenants(id);
```

---

## 6. Step 3 — Backfill Existing Data

All existing rows belong to Prizma:

```sql
-- Get Prizma's tenant_id
DO $$
DECLARE
  prizma_id UUID;
BEGIN
  SELECT id INTO prizma_id FROM tenants WHERE slug = 'prizma';

  UPDATE inventory        SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE inventory_logs   SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE brands           SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE models           SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE sizes            SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE colors           SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE suppliers        SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE purchase_orders  SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE purchase_order_items SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE goods_receipts   SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE goods_receipt_items SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE stock_counts     SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE stock_count_items SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE sync_log         SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE pending_sales    SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE watcher_heartbeat SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE employees        SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE roles            SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE permissions      SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE role_permissions SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE employee_roles   SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE auth_sessions    SET tenant_id = prizma_id WHERE tenant_id IS NULL;
END $$;
```

---

## 7. Step 4 — NOT NULL + Indexes

After backfill confirms zero NULLs:

```sql
-- Per table:
ALTER TABLE {table_name}
  ALTER COLUMN tenant_id SET NOT NULL;

-- Index for performance (every table):
CREATE INDEX idx_{table_name}_tenant
  ON {table_name}(tenant_id);
```

**Composite indexes** — tables frequently queried with tenant + another field:
```sql
CREATE INDEX idx_inventory_tenant_barcode ON inventory(tenant_id, barcode);
CREATE INDEX idx_inventory_tenant_brand ON inventory(tenant_id, brand_id);
CREATE INDEX idx_inventory_logs_tenant_date ON inventory_logs(tenant_id, created_at);
CREATE INDEX idx_purchase_orders_tenant_supplier ON purchase_orders(tenant_id, supplier_id);
CREATE INDEX idx_employees_tenant_pin ON employees(tenant_id, pin);
```

---

## 8. Step 5 — RLS Policies

### 8.1 How tenant_id flows

```
Login (PIN) → employee record → employee.tenant_id
           → stored in sessionStorage as tenant_id
           → passed to Supabase via:
              supabase.rpc('set_tenant', { tid: tenant_id })
              OR
              supabase.headers['x-tenant-id'] = tenant_id
```

**Decision needed:** The exact mechanism for passing tenant_id to Supabase
(RPC set_config vs custom header vs service role with manual filtering).
The secondary chat should evaluate what works best with our current
Supabase client setup.

### 8.2 RLS Policy Pattern

```sql
-- Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation ON {table_name}
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Service role bypass (for migrations, admin tools)
CREATE POLICY service_bypass ON {table_name}
  FOR ALL
  TO service_role
  USING (true);
```

Apply to ALL tables listed in Step 2.

### 8.3 Important: Existing RLS

If any tables already have RLS policies from Phase 3, those policies
must be updated to ALSO include tenant_id filtering. Don't just add a
new policy — review and merge with existing ones.

---

## 9. Step 6 — Update JS Writes

Every Supabase `.insert()` and `.upsert()` call must include `tenant_id`.

### 9.1 Central tenant_id source

In `shared.js` (or a new `tenant-service.js` if cleaner):

```javascript
function getTenantId() {
  return sessionStorage.getItem('tenant_id');
}
```

### 9.2 Update pattern

**Before:**
```javascript
await supabase.from('inventory').insert({ barcode, brand_id, ... });
```

**After:**
```javascript
await supabase.from('inventory').insert({
  barcode, brand_id, ...,
  tenant_id: getTenantId()
});
```

### 9.3 Files to update

Every JS file that does `.insert()`, `.upsert()`, or `.update()`:
- `js/supabase-ops.js`
- `modules/inventory/*.js`
- `modules/purchasing/*.js`
- `modules/goods-receipts/*.js`
- `modules/audit/*.js`
- `modules/brands/*.js`
- `modules/access-sync/*.js`
- `modules/admin/*.js`

**The secondary chat must grep the codebase** for all `.insert(`, `.upsert(`,
`.update(` calls and patch each one.

---

## 10. Step 7 — Update JS Reads

Every Supabase `.select()` call should filter by tenant_id.

**Even though RLS handles this at the DB level**, explicit filtering
in JS provides defense-in-depth and makes the code self-documenting.

**Before:**
```javascript
const { data } = await supabase.from('inventory').select('*');
```

**After:**
```javascript
const { data } = await supabase
  .from('inventory')
  .select('*')
  .eq('tenant_id', getTenantId());
```

Same grep approach — find all `.select(` and `.from(` calls.

---

## 11. Step 8 — Shared RPC Functions (Contracts)

These are Supabase RPC functions that other modules can call.
Phase 4, 5, 6 will rely on these — not direct table access.

### 11.1 Inventory contracts (from existing module):

```sql
-- Already exists or should exist:
-- get_inventory_by_supplier(p_supplier_id, p_tenant_id) → inventory rows
-- get_low_stock_brands(p_tenant_id) → brands below threshold
-- update_quantity(p_barcode, p_delta, p_employee_id, p_tenant_id) → atomic update
```

### 11.2 Auth contracts:

```sql
-- validate_pin(p_pin, p_tenant_id) → employee record or null
-- get_employee_permissions(p_employee_id, p_tenant_id) → permissions array
```

### 11.3 Documentation

Each RPC function must be documented in MODULE_SPEC.md under a new
"Contracts" section:

```markdown
## Contracts (RPC Functions)

| Function | Input | Output | Used By |
|----------|-------|--------|---------|
| get_inventory_by_supplier | supplier_id, tenant_id | inventory[] | Phase 6 (supplier portal) |
| validate_pin | pin, tenant_id | employee | All modules |
```

---

## 12. Step 9 — Verification Checklist

### DB verification:
- [ ] `tenants` table exists with Prizma row
- [ ] ALL tables have `tenant_id UUID NOT NULL`
- [ ] ALL tables have `tenant_id` index
- [ ] ALL tables have RLS enabled
- [ ] ALL tables have tenant_isolation policy
- [ ] Zero rows with NULL tenant_id anywhere

### JS verification:
- [ ] Login stores tenant_id in sessionStorage
- [ ] Every .insert() includes tenant_id
- [ ] Every .select() filters by tenant_id
- [ ] All existing functionality works exactly as before
- [ ] No console errors

### Isolation test:
- [ ] Create test tenant "test-store"
- [ ] Insert test row in inventory with test tenant_id
- [ ] Login as Prizma employee → test row NOT visible
- [ ] Delete test tenant and test data

### Regression:
- [ ] Inventory CRUD works
- [ ] PO creation works
- [ ] Goods receipt works
- [ ] Stock counting works
- [ ] Access sync works
- [ ] Employee management works
- [ ] Login/logout works
- [ ] All 32 existing E2E tests pass

---

## 13. Step 10 — Documentation Update

- `ROADMAP.md` — add Phase 3.75 row, mark ✅
- `SESSION_CONTEXT.md` — note multi-tenancy is active
- `MODULE_SPEC.md` — add Contracts section
- `CHANGELOG.md` — new section
- `db-schema.sql` — update all table definitions

---

## 14. What's NOT in Phase 3.75

| Feature | Where |
|---------|-------|
| Tenant management UI (add/edit tenants) | Future admin module |
| Tenant onboarding flow | Future SaaS module |
| Per-tenant branding/logo | Future SaaS module |
| Billing/subscription per tenant | Future SaaS module |
| Cross-tenant reporting | Future admin module |
| Migration of roles/permissions to be tenant-scoped templates | Phase 4 or standalone |
| Removing dev_bypass | Pre-production hardening |
| PIN migration to 5 digits + constraint | Pre-production hardening |

---

## 15. Risk Notes

### Breaking changes
This phase touches EVERY table and EVERY JS file. High risk of regression.
The secondary chat should:
1. Work table-by-table, testing after each migration
2. Keep a rollback SQL script ready
3. Test login flow immediately after employees table changes

### Performance
Adding tenant_id to all queries adds negligible overhead if indexes are
in place. The composite indexes in Step 4 are critical — don't skip them.

### Supabase RLS + anon key
Currently the app likely uses Supabase anon key. With RLS, we need to
ensure the tenant context is set correctly for each request. The secondary
chat must investigate: does our current auth flow (PIN-based, not Supabase
Auth) work with RLS `current_setting()`? If not, alternative approaches:
- Service role key with manual tenant filtering (simpler but less secure)
- Supabase Auth with custom claims (more secure but bigger refactor)
- RPC wrapper functions that accept tenant_id as parameter

**This is the biggest technical decision of the phase.** The secondary chat
should prototype both approaches and recommend.

---

## 16. File Size Budget

| File | Estimated Lines |
|------|----------------|
| Migration SQL (all steps) | ~200 |
| New: tenant-service.js | ~30 |
| Changes across existing JS files | ~150 total (small per file) |
| New RPC functions SQL | ~80 |
| No new HTML files | — |
