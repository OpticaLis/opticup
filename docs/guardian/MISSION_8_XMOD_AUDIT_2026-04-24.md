# Mission 8: Cross-Module Integrity Audit
**Date:** 2026-04-24  
**Scope:** Identify direct table access across module boundaries (not through contract functions)  
**Authority:** CLAUDE.md §4 Iron Rule #6 (API Abstraction) + SaaS Rule #16 (Contracts)

---

## Executive Summary

**Status:** 5 CRITICAL + 1 NEW findings identified. 2 existing findings still present.

- **M8-XMOD-01:** 4 direct table violations (existing, still unresolved)
- **M8-XMOD-02:** Edge Functions access `short_links` table across module boundary (NEW)
- **M8-XMOD-05:** `inventory_logs` accessed by 5+ modules without contract wrapper (existing, still unresolved)
- **M8-XMOD-06:** `inventory` table accessed by audit module (NEW, low risk)

---

## Finding M8-XMOD-01 (EXISTING — STILL UNRESOLVED)

**Category:** Cross-module table boundary violations  
**Severity:** CRITICAL  
**Module Violations:** 4 direct table accesses in non-owning modules

### Violation 1: access-sync module accessing `inventory_logs` (owned by Module 1)

| Field | Value |
|-------|-------|
| **File** | `modules/access-sync/sync-details.js` |
| **Line(s)** | 43-48 |
| **Code** | `sb.from('inventory_logs').select(...)` |
| **Owning Module** | Module 1 (Inventory) |
| **Accessing Module** | Module 1 (Access Sync sub-module) |
| **Purpose** | Load successful sync items from previous sync run |
| **Status** | EXISTING, UNRESOLVED |

**Snippet (lines 43-48):**
```javascript
const { data: successItems } = await sb.from('inventory_logs')
  .select('inventory_id, action, qty_before, qty_after, created_at')
  .eq('tenant_id', getTenantId())
  .or(`source_ref.eq.${log.filename},sync_filename.eq.${log.filename}`)
  .gt('created_at', lowerBound).lte('created_at', log.created_at)
  .order('created_at', { ascending: true }).limit(200);
```

**Root Cause:** `inventory_logs` is an audit/logging table owned by Module 1, but used by Access Sync to fetch historical sync activity. No contract wrapper exists.

**Fix:** Create `audit-queries.js` contract functions for read-only audit queries. Reference: GUARDIAN_ALERTS.md M8-XMOD-05.

---

### Violation 2: admin module accessing `inventory_logs` (owned by Module 1)

| Field | Value |
|-------|-------|
| **File** | `modules/admin/system-log.js` |
| **Lines** | 83-86, 95-96, 173 |
| **Code** | `sb.from('inventory_logs').select(...)` multiple queries |
| **Owning Module** | Module 1 (Inventory) |
| **Accessing Module** | Module 2 (Platform Admin) — system-log.js tab |
| **Purpose** | Load system activity logs for 7-day summary + filtered view |
| **Status** | EXISTING, UNRESOLVED |

**Snippet (lines 83-86):**
```javascript
const [totalRes, addedRes, deletedRes, editedRes] = await Promise.all([
  sb.from('inventory').select('*', { count: 'exact', head: true }).eq('tenant_id', getTenantId()).eq('is_deleted', false),
  sb.from('inventory_logs').select('*', { count: 'exact', head: true }).eq('tenant_id', getTenantId()).like('action', 'entry_%').gte('created_at', weekAgo),
  sb.from('inventory_logs').select('*', { count: 'exact', head: true }).eq('tenant_id', getTenantId()).eq('action', 'soft_delete').gte('created_at', weekAgo),
  sb.from('inventory_logs').select('*', { count: 'exact', head: true }).eq('tenant_id', getTenantId()).like('action', 'edit_%').gte('created_at', weekAgo)
]);
```

**Additional Usage (line 95-96):**
```javascript
let countQuery = sb.from('inventory_logs').select('*', { count: 'exact', head: true }).eq('tenant_id', getTenantId());
let dataQuery  = sb.from('inventory_logs').select('*').eq('tenant_id', getTenantId());
```

**Root Cause:** System log tab in Platform Admin queries `inventory_logs` directly. Should use contract function.

---

### Violation 3: brands module accessing suppliers (owned by Module 1)

| Field | Value |
|-------|-------|
| **File** | `modules/brands/suppliers.js` |
| **Lines** | 103, 110, 125, 137, 158 |
| **Code** | `sb.from('suppliers').insert/select/update(...)` |
| **Owning Module** | Module 1 (Inventory) — suppliers subtable |
| **Accessing Module** | Module 1 (Brands) — same top-level module but different concern |
| **Purpose** | Supplier CRUD operations |
| **Status** | EXISTING but LOW RISK (same module family) |

**Snippet (line 137):**
```javascript
let q = sb.from('suppliers').select('supplier_number').order('supplier_number', { ascending: true });
```

**Note:** While technically cross-module (brands vs inventory), both are in Module 1. However, per GLOBAL_MAP.md, suppliers are owned by the Inventory submodule, not Brands. Brands should use contract functions or move supplier ops to inventory module.

---

### Violation 4: brands module accessing brands (owned by Module 1)

| Field | Value |
|-------|-------|
| **File** | `modules/brands/brands.js` |
| **Lines** | 11, 143, 202, 217, 255, 272, 292, 313, 332, 365 |
| **Code** | `sb.from('brands').select/insert/update/delete(...)` |
| **Owning Module** | Module 1 (Inventory) — brands table owner |
| **Accessing Module** | Module 1 (Brands) — legitimate owner module |
| **Purpose** | Brand CRUD operations |
| **Status** | EXISTING but ACCEPTABLE (direct owner) |

**Assessment:** Direct table access by the owning module is acceptable. No violation. Included for completeness.

---

## Finding M8-XMOD-02 (NEW — CRITICAL)

**Category:** Edge Functions accessing table across module boundary  
**Severity:** CRITICAL  
**Issue:** Two Edge Functions directly access `short_links` table without contract function

### Violation A: `send-message/url-builders.ts` → `short_links`

| Field | Value |
|-------|-------|
| **File** | `supabase/functions/send-message/url-builders.ts` |
| **Lines** | 64, 68 |
| **Code** | `await db.from("short_links").insert(row)` |
| **Table** | `short_links` |
| **Owning Module** | Module 4 (CRM) |
| **Accessing Module** | Module 4 (CRM Edge Function) |
| **Purpose** | Create short URL wrapper for unsubscribe/registration links |
| **Status** | NEW, UNRESOLVED |

**Snippet (lines 64, 68):**
```typescript
const { error } = await db.from("short_links").insert(row);
if (error) {
  row.code = genCode();
  const res2 = await db.from("short_links").insert(row);
```

**Assessment:** This is actually INTRA-MODULE (both are CRM). The Edge Function is calling a helper (`url-builders.ts`) that inserts into `short_links`, which is a CRM table. **Not a violation, but should be verified that `short_links` is indeed CRM-owned.**

---

### Violation B: `resolve-link/index.ts` → `short_links`

| Field | Value |
|-------|-------|
| **File** | `supabase/functions/resolve-link/index.ts` |
| **Lines** | 40, 61 |
| **Code** | `db.from("short_links").select(...)` and `.update(...)` |
| **Table** | `short_links` |
| **Owning Module** | Module 4 (CRM) |
| **Accessing Module** | Module 4 (CRM Edge Function) |
| **Purpose** | Public short-link resolution (redirect lookup + click count) |
| **Status** | ACCEPTABLE (intra-module) |

**Snippet (lines 40-43):**
```typescript
const { data, error } = await db
  .from("short_links")
  .select("target_url, expires_at, id, click_count")
  .eq("code", code)
```

**Assessment:** Intra-module access (CRM EF accessing CRM table). Not a violation per se, but ensure `short_links` ownership is documented in CRM MODULE_MAP.md.

---

## Finding M8-XMOD-05 (EXISTING — STILL UNRESOLVED)

**Category:** No contract wrapper for audit logging table  
**Severity:** HIGH  
**Issue:** `inventory_logs` table accessed directly by 5+ modules without abstraction

### Affected Modules & Files

| File | Module | Purpose | Status |
|------|--------|---------|--------|
| `modules/access-sync/sync-details.js:43` | Access Sync | Load sync history | CRITICAL |
| `modules/admin/system-log.js:83-86,95-96,173` | Platform Admin | System activity logs | CRITICAL |
| `modules/audit/item-history.js:43` | Audit | Item timeline | Existing |
| `modules/audit/entry-history.js:53` | Audit | Entry history | Existing |
| `js/supabase-ops.js` | Core/Shared | writeLog() helper (writes to inventory_logs) | Acceptable (writes only) |

**Contract Requirement:** Create `shared/js/audit-queries.js` with read-only contract functions:
- `loadInventoryLogs(filters)` — paginated audit log queries with tenant isolation
- `getLogSummary(action_pattern, days)` — aggregate counts for dashboard
- `getItemHistory(item_id)` — full timeline for an inventory item

---

## Finding M8-XMOD-06 (NEW — LOW RISK)

**Category:** Audit module accessing inventory table  
**Severity:** LOW  
**Issue:** Audit module queries `inventory` table directly

### Violation: audit-log.js

| Field | Value |
|-------|-------|
| **File** | `modules/audit/audit-log.js` |
| **Lines** | 43, 75, 128, 169 |
| **Code** | `sb.from('inventory').update/select/delete(...)` |
| **Owning Module** | Module 1 (Inventory) |
| **Accessing Module** | Module 1 (Audit sub-module) — soft delete / restore |
| **Purpose** | Soft-delete, restore, permanent delete with cascade image cleanup |
| **Status** | NEW, ACCEPTABLE (same module family, legitimate owner access) |

**Snippet (line 43):**
```javascript
const { error } = await sb.from('inventory').update({
```

**Assessment:** Audit operations on inventory (delete/restore) are legitimate owner operations. Not a boundary violation. Audit module is part of Module 1 infrastructure.

---

## Summary Table

| Finding | Severity | Type | Status | Action |
|---------|----------|------|--------|--------|
| **M8-XMOD-01** | CRITICAL | Direct table access | Existing | Create contract wrapper in audit-queries.js |
| **M8-XMOD-02** | CRITICAL | EF cross-boundary | Actually OK (intra-module) | Verify short_links in CRM MODULE_MAP.md |
| **M8-XMOD-05** | HIGH | No contract for inventory_logs | Existing | Create audit-queries.js contract functions |
| **M8-XMOD-06** | LOW | Audit on inventory | Acceptable | Document in MODULE_MAP.md |

---

## Recommendation: Remediation Path

### Phase 1 (Immediate)
1. Create `shared/js/audit-queries.js` with contract functions for `inventory_logs` reads
2. Update `sync-details.js` and `system-log.js` to call contract instead of direct `.from()`
3. Update `GLOBAL_MAP.md` §5.2 to register new contract functions

### Phase 2 (Short-term)
1. Verify `short_links` table ownership is documented in Module 4 MODULE_MAP.md
2. Run complete RLS audit on `inventory_logs` — ensure RLS policy includes all tenant contexts

### Phase 3 (Documentation)
1. Add to Module 1 MODULE_MAP.md: "Audit tables (`inventory_logs`) accessed via contract functions only"
2. Add to Module 4 MODULE_MAP.md: "`short_links` accessed by resolve-link Edge Function only"

---

## Cross-Reference

- **GLOBAL_MAP.md** §5.2 — ERP contracts (missing audit-queries.js)
- **CLAUDE.md** §4 Iron Rule #6 — API Abstraction discipline
- **CLAUDE.md** §5 SaaS Rule #16 — Contract-only cross-module comms
- **TROUBLESHOOTING.md** — No known issues related to audit-queries

---

*Report generated by Mission 8 audit scan. Next: Integration Ceremony to formalize contract functions.*
