# Permissions Audit — Phase 1 Diagnosis Report
**2026-04-27 — Read-only investigation, no writes performed**

> **SPEC:** `SPEC.md` (this folder)
> **Pre-flight:** `PRE_FLIGHT.json` (this folder)
> **Author:** opticup-executor (Windows desktop, Cowork session)
> **Investigator stance:** Read-only. Zero DB writes. Zero code edits. Zero form submissions.
> **Live evidence:** Chrome MCP DOM inspection on `localhost:3000` against the running ERP, signed in as Daniel (admin → ceo) on the Prizma tenant.

---

## Executive Summary

The permissions system is **structurally sound but presentationally misleading**, and three small but real defects together explain Daniel's user-visible bug ("manager doesn't see what admin sees, even though manager has all checkboxes ticked"):

1. **The number "281 permissions" is misleading.** The `permissions` table really holds **89 distinct keys** — the 281 row count is just `89 keys × ~3 tenants per key` because each key is duplicated per tenant (the table is tenant-scoped). For the **Prizma** tenant specifically, only **55 distinct keys** exist. Daniel cannot grant manager "the other ~226 keys" because they don't exist for Prizma; they belong to Group B tenants (the test stores) which use a different naming convention.

2. **The "admin sees more than manager" symptom comes from a stateful global, not from the perm system.** `js/shared.js:124` declares `let isAdmin = false`, and `modules/admin/admin.js:5` sets it to `hasPermission('settings.edit')` during `activateAdmin()`. Several inventory functions (`modules/inventory/inventory-edit.js:57,102,198,241`, etc.) gate behavior on this `isAdmin` global instead of on a granular `inventory.edit` perm. Manager has `inventory.edit` ✅ but **lacks `settings.edit`** (verified via DB query: manager is missing exactly 1 of 55 keys, and that one key is `settings.edit`). So manager → `isAdmin=false` → cannot use bulk inventory operations even though they are supposed to be allowed to edit inventory. **This is the user-visible bug.**

3. **A separate hardcoded role bypass in `modules/debt/ai/ai-config.js:13`** does `return role === 'ceo' || role === 'manager'` — bypasses the perm system entirely for AI/debt config. **Granting `debt.ai_config` to team_lead would have no effect.** This is a HARMFUL bypass.

The permission management UI (`modules/permissions/employee-list.js`) is correct — live Chrome DOM inspection confirms it renders all 55 Prizma perms × 5 roles = 275 checkboxes, save handler upserts with the correct `tenant_id` (verified — the C1_PERMISSIONS_UPSERT fix in commit `784bbc8` is in place), and there are no silent-failure paths. The UI is **NOT** the bug.

There is **schema drift between tenant groups**:
- **Group A** (Prizma + demo): roles `ceo / manager / team_lead / worker / viewer`. Uses keys like `purchase_order.*`, `goods_receipt.*`, `debt.documents.*`.
- **Group B** (3 test stores): roles `ceo / manager / senior / employee / viewer`. Uses keys like `purchasing.*`, `receipts.*`, `debt.create / .edit / .delete`.

Two parallel naming schemes coexist for the same business actions. The hardcoded `ROLE_BADGES` and `ROLE_HIERARCHY` constants in `modules/permissions/employee-list.js:6-14` only cover Group A roles — opening the employee modal on a test-store tenant **silently filters out the senior + employee role options**.

Of the 89 distinct DB keys, **31 are referenced in code** (literal strings in `data-permission` attributes or `hasPermission()`/`requirePermission()` calls). Of those 31, **3 are test-only** (`inventory.admin`, `purchasing.admin`, `shipments.admin` — only in `shared/tests/permission-test.html`) and don't exist in the DB. So **~28 keys are wired correctly**, and **~61 DB keys are not directly checked anywhere in JS code** — they're either checked indirectly through admin-mode body-class shortcuts, are the matrix-only keys for the Group B tenant scheme that the Prizma codebase doesn't use, or are genuinely dead.

**Recommended Phase 2 (smallest fix that solves Daniel's bug):** decouple `isAdmin` from `settings.edit` — replace the ~10 `if (!isAdmin)` guards in inventory/admin code with explicit `if (!hasPermission('inventory.edit'))` (or equivalent granular keys). Three lines per check, ~30 minutes of work, surgical and reversible. Optional follow-ups (consolidate Group A/B naming, remove the 3 test-only `*.admin` keys, sync `ROLE_BADGES` with DB-defined roles per tenant) are best deferred to a later batch and reviewed individually.

---

## §A — Permission Inventory

### §A1 — Code-side keys (every `data-permission` / `data-tab-permission` / `hasPermission()` / `requirePermission()` reference)

#### A1.1 — DOM `data-permission` attributes (49 occurrences across 3 files, 23 distinct values)

| File | Occurrences | Distinct keys |
|---|---|---|
| `inventory.html` | 22 | 11 |
| `shared/tests/permission-test.html` | 25 (test-only) | 13 (incl. 3 dead) |
| `shipments.html` | 2 | 2 |

**Distinct values across all 3 files** (23 total — 3 are pipe-multi `keyA|keyB`):

```
brands.edit
brands.view
goods_receipt.confirm
goods_receipt.create
goods_receipt.export
inventory.admin                     ← TEST-ONLY (no DB row)
inventory.delete
inventory.edit
inventory.edit|inventory.admin      ← pipe-multi (test only)
inventory.export
inventory.reduce
inventory.view
inventory.view|shipments.admin      ← pipe-multi (test only)
purchase_order.view                 (data-tab-permission only)
reports.export
settings.view                       (data-tab-permission only)
shipments.admin|purchasing.admin    ← pipe-multi (test only)
shipments.create
shipments.settings
stock_count.create
suppliers.edit
suppliers.view                      (data-tab-permission only)
sync.view                           (data-tab-permission only)
```

#### A1.2 — JS `hasPermission()` / `requirePermission()` literal-string calls (10 distinct keys)

```
debt.view
employees.assign_role
employees.create
employees.delete
employees.edit
employees.view
settings.edit
settings.view
shipments.view
stock_count.approve
```

Plus dynamic call at `index.html:188` `hasPermission(m.permission)` reads from menu config containing: `inventory.view`, `debt.view`, `shipments.view`, `settings.view` (×2 — CRM + Storefront cards), `employees.view`. All already in the literal list.

#### A1.3 — Union (deduplicated, normalized for pipe-multi) — **31 distinct keys** in active code

```
brands.edit, brands.view, debt.view,
employees.assign_role, employees.create, employees.delete, employees.edit, employees.view,
goods_receipt.confirm, goods_receipt.create, goods_receipt.export,
inventory.admin, inventory.delete, inventory.edit, inventory.export, inventory.reduce, inventory.view,
purchase_order.view, purchasing.admin,
reports.export,
settings.edit, settings.view,
shipments.admin, shipments.create, shipments.settings, shipments.view,
stock_count.approve, stock_count.create,
suppliers.edit, suppliers.view,
sync.view
```

### §A2 — DB-side keys (every row in `permissions`)

**281 rows** decompose to **89 distinct `id`s × varying tenants**:

| Module | Distinct keys | Notes |
|---|---|---|
| admin | 3 | Group B tenants only |
| ai | 4 | Group A tenants only (Prizma + demo) |
| audit | 2 | one in all 5, one in Group B only |
| brands | 2 | all 5 tenants |
| debt | 18 | massive duplication: Group A uses `debt.documents.*`+`debt.payments.*`+`debt.prepaid.manage`; Group B uses `debt.create`+`debt.edit`+`debt.delete`+`debt.payments`+`debt.prepaid`+`debt.returns`+5 `debt.ai_*` keys |
| employees | 6 | Group A uses granular `create/edit/delete/assign_role`; Group B uses single `manage`; `view` shared |
| goods_receipts | 3 | Group A only |
| inventory | 8 | 5 shared (`view/edit/delete/export/reduce`); Group B adds `create/barcode/images` |
| purchasing | 9 | Group A uses `purchase_order.*` (5 keys); Group B uses `purchasing.*` (4 keys) — same actions, different names |
| receipts | 4 | Group B only |
| reports | 2 | Group A only |
| returns | 4 | Group A only |
| settings | 2 | all 5 tenants |
| shipments | 7 | core 5 in all tenants; `delete/manifest` Group B only |
| stock_count | 8 | core 3 in all tenants; rest split between Groups |
| suppliers | 2 | all 5 tenants |
| sync | 5 | `view` shared; rest split |

**89 distinct ids total.** Full list in §A3 cross-reference table below.

### §A3 — Cross-Reference Matrix (4 quadrants)

| Quadrant | Count | Meaning |
|---|---|---|
| Q1 — In BOTH code AND DB (correctly wired) | **28** | the working keys |
| Q2 — In code, not in DB (BROKEN — UI hides element forever) | **3** | `inventory.admin`, `purchasing.admin`, `shipments.admin` (all in `shared/tests/permission-test.html` only — test scaffolding, not production HTML) |
| Q3 — In DB, not directly referenced in code (DEAD-OR-MATRIX-ONLY) | **61** | see §I |
| Q4 — Pipe-multi compositions (`a\|b`) | 3 | also test-only |

#### Q1 (Healthy — code ↔ DB match) — 28 keys

```
brands.edit, brands.view, debt.view,
employees.assign_role, employees.create, employees.delete, employees.edit, employees.view,
goods_receipt.confirm, goods_receipt.create, goods_receipt.export,
inventory.delete, inventory.edit, inventory.export, inventory.reduce, inventory.view,
purchase_order.view, reports.export,
settings.edit, settings.view,
shipments.create, shipments.settings, shipments.view,
stock_count.approve, stock_count.create,
suppliers.edit, suppliers.view,
sync.view
```

#### Q2 (Code references but DB lacks — UI silently hides forever) — 3 keys

```
inventory.admin   — only in shared/tests/permission-test.html (test scaffolding)
purchasing.admin  — only in shared/tests/permission-test.html (test scaffolding)
shipments.admin   — only in shared/tests/permission-test.html (test scaffolding)
```

These are NOT a production bug because they live only in a test page. They are an Iron-Rule-21 violation (orphan keys in code that no DB seed ever creates). Phase 2 should delete the test page or add the 3 keys to the DB seed.

#### Q3 (DB only — 61 dead-or-matrix-only) — see §I for full list

---

## §B — Per-Tenant Role Audit

### B.1 Role table (`roles`) — 25 rows total, 5 per tenant

| Tenant slug | Roles defined | Notes |
|---|---|---|
| `prizma` | ceo, manager, team_lead, viewer, worker | Group A baseline |
| `demo` | ceo, manager, team_lead, viewer, worker | Group A (matches Prizma) |
| `test-store-qa` | ceo, manager, senior, employee, viewer | Group B |
| `test-store-v2` | ceo, manager, senior, employee, viewer | Group B |
| `test-store-verify` | ceo, manager, senior, employee, viewer | Group B |

### B.2 Role × granted-perms count

| Tenant | ceo | manager | team_lead | senior | worker | employee | viewer |
|---|---|---|---|---|---|---|---|
| prizma | 55 | 54 | 45 | — | 16 | — | 16 |
| demo | 55 | 54 | 44 | — | 16 | — | 16 |
| test-store-qa | 57 | 54 | — | 29 | — | 8 | 6 |
| test-store-v2 | 57 | 54 | — | 29 | — | 8 | 6 |
| test-store-verify | 57 | 54 | — | 29 | — | 8 | 6 |

### B.3 Prizma manager — exact missing key (the user-visible bug)

```
SELECT array_agg(missing_keys) FROM (
  SELECT p.id AS missing_keys
    FROM permissions p
   WHERE p.tenant_id = '6ad0781b-...'
     AND NOT EXISTS (
       SELECT 1 FROM role_permissions rp
        WHERE rp.role_id = 'manager' AND rp.permission_id = p.id
          AND rp.tenant_id = p.tenant_id AND rp.granted = true)
);
→ ["settings.edit"]   ← Manager is missing EXACTLY ONE key on Prizma.
```

This is the key. It's not "manager has half what admin has" — it's "manager has 54 of 55 = 98%". The user perceives a much bigger gap because the missing key (`settings.edit`) is the gate for `isAdmin = true`, which in turn unlocks ~10 inventory operations that should be governed by `inventory.edit` instead.

### B.4 Tenant role drift summary

| Drift | Impact |
|---|---|
| Group A (Prizma+demo) uses `team_lead`+`worker`; Group B uses `senior`+`employee` | The hardcoded `ROLE_BADGES` in `employee-list.js:6-12` covers ONLY Group A. On a test-store tenant, opening the employee modal will hide the senior+employee options (line 149-154 only iterates ROLE_BADGES) — admin can't assign them via the UI. The matrix DOES render senior+employee correctly because it reads roles from DB. |
| `ROLE_HIERARCHY` constant (`employee-list.js:14`) hardcodes Group A order | On Group B, `ROLE_HIERARCHY.indexOf('senior')` returns `-1`. The promotion-restriction check `idx <= myIdx` becomes useless. |
| Group A & Group B use entirely different keys for same actions | `purchase_order.view` (Group A) vs `purchasing.view` (Group B); `goods_receipt.create` vs `receipts.create`; `debt.documents.cancel` vs `debt.delete`. **No code path reads both.** |
| Daniel ('admin') is on Prizma — never sees Group B drift | The drift is invisible until someone logs into a test-store tenant. |

---

## §C — UI Screen Audit (`modules/permissions/employee-list.js`)

### C.1 Live evidence (Chrome MCP DOM inspection on `localhost:3000`)

Logged in as Daniel (employee.role='admin' → mapped to ceo via LEGACY_ROLE_MAP), Prizma tenant:

```javascript
// localhost:3000/employees.html?t=prizma — perm matrix tab open
{
  "logged_in": true,
  "role": "ceo",
  "perm_count_in_session": 55,                    // sessionStorage.tenant_permissions
  "matrix_present": true,
  "checkboxes_total": 275,                        // = 55 perms × 5 roles
  "checkboxes_checked": 184,                      // sum of all role grants
  "module_header_rows": 15,                       // 15 of 17 modules represented
                                                  // (admin, audit hidden because Prizma has no admin keys
                                                  //  and only 1 audit key vs Group B's 2)
  "perm_rows": 55                                 // ALL 55 Prizma keys rendered
}
```

```javascript
// localhost:3000/inventory.html?t=prizma
{
  "data_permission_total": 22,
  "data_permission_distinct": ["brands.edit","goods_receipt.confirm","goods_receipt.create",
                               "goods_receipt.export","inventory.delete","inventory.edit",
                               "inventory.export","inventory.reduce","reports.export",
                               "stock_count.create","suppliers.edit"],
  "data_tab_permission_total": 10,
  "hidden_by_permission": 0,                      // ALL visible to ceo
  "isAdmin_global": "undefined",                  // declared `let` so not on window
  "body_has_admin_mode_class": true,              // activateAdmin() ran
  "has_settings_edit": true                       // ceo has it
}
```

### C.2 Findings

- **C.2.1 — How many of 281 keys does the screen render?** Trick question: the screen renders **all keys for the current tenant**, which for Prizma is **55** (not 281). Live evidence: `perm_rows: 55` exact match. The "281" figure is total rows across all tenants combined.
- **C.2.2 — Are there keys hidden by filter/search defaults?** **No.** Code review of `renderPermissionMatrix` (lines 257-304) shows no filter, no search, no `LIMIT`. All keys returned by the SELECT are rendered.
- **C.2.3 — Save handler trace:** see §D.
- **C.2.4 — `tenant_id` source:** `getTenantId()` (sessionStorage) at lines 263, 264, 321. Same value used in SELECT and UPSERT — no mismatch possible.
- **C.2.5 — Visual evidence:** captured in C.1 above via Chrome MCP `evaluate_script`. No screenshot needed.

---

## §D — Save-Handler Trace (`modules/permissions/employee-list.js:318-324`)

Step-by-step from UI click → SQL write:

```
1. User clicks a checkbox in the permission matrix.
2. HTML <input type="checkbox" onchange="updateRolePermission('manager','inventory.edit',this.checked)">
   fires, with the role_id, perm_id, and new boolean state baked in by renderPermissionMatrix
   (line 296).
3. updateRolePermission(roleId, permissionId, granted) — line 318:
4.   requirePermission('settings.edit') — line 319.
       - calls hasPermission('settings.edit') (auth-service.js:286).
       - sessionStorage.tenant_permissions['settings.edit'] === true → pass.
5.   sb.from(AT.ROLE_PERMS).upsert({                       — line 320-321
       role_id: roleId,
       permission_id: permissionId,
       granted: granted,
       tenant_id: getTenantId()                            ← TENANT ON WRITE (Iron Rule 22)
     }, {
       onConflict: 'role_id,permission_id,tenant_id'       ← TENANT IN CONFLICT KEY (Iron Rule 18)
     });
6.   if (error) toast('שגיאה') and return.                  — line 322
7.   else toast('הרשאות עודכנו', 's').                       — line 323
```

**Verdict:** save handler is correct. The C1_PERMISSIONS_UPSERT fix (commit `784bbc8`, closed in `M1_FIXES_2026_04_26`) added `tenant_id` to the `onConflict` clause; before that fix, two tenants editing the same `(role_id, permission_id)` would have collided. Today the handler is tenant-safe.

**Silent-failure check:** `if (error) { toast('שגיאה...'); return; }` — error path triggers a Toast but does NOT log to console, so a quietly-rejected RLS denial would only show a toast. **This is a minor weakness:** if RLS denies the write for some reason, Daniel sees a toast but no diagnostic.

---

## §E — Admin Bypass Map

### E.1 BENIGN — bypasses that match the LEGACY_ROLE_MAP intent

| Location | Code | Why benign |
|---|---|---|
| `js/auth-service.js:21` | `LEGACY_ROLE_MAP = { admin: 'ceo', manager: 'manager', employee: 'worker' }` | The legacy `employees.role` text column maps to a granular role-id when the new `employee_roles` row is missing (line 76). Daniel (`role='admin'`) → `ceo` → 55 perms. This is the canonical bridge. |
| `js/auth-service.js:302` | `if (role === 'ceo' \|\| role === 'manager') return true` inside `checkBranchAccess` | Branch-isolation bypass for senior roles. Branch isolation is a separate concern from permissions; ceo+manager seeing all branches is intentional UX. |

### E.2 CHAINED — couples one perm to a different code path

| Location | Code | Effect |
|---|---|---|
| `js/shared.js:124` | `let isAdmin = false;` | Page-load default. |
| `modules/admin/admin.js:5` | `isAdmin = hasPermission('settings.edit');` | Sets the global to true if settings.edit granted. Called from `activateAdmin()`. |
| `modules/admin/admin.js:35` | `if (hasPermission('settings.edit')) activateAdmin();` | Triggered from `resumeAppInit()` on every page load → so `isAdmin` IS set early in normal flow. |
| `modules/inventory/inventory-edit.js:57` | `if (!isAdmin) { toast('נדרשת הרשאת מנהל'); return; }` (`applyBulkUpdate`) | Bulk-update gated on `isAdmin` instead of `inventory.edit`. **Manager has inventory.edit but not settings.edit → isAdmin=false → bulk update fails for manager.** |
| `modules/inventory/inventory-edit.js:102` | same pattern (different function) | Same chained-gating issue. |
| `modules/inventory/inventory-edit.js:198` | same | Same. |
| `modules/inventory/inventory-edit.js:241` | `if (!isAdmin \|\| td.classList...)` | Inline-edit gated on `isAdmin`. Same issue. |
| `modules/inventory/inventory-actions.js:13` | `var isAdm = document.body.classList.contains('admin-mode');` | Reads body class; admin-mode added by `activateAdmin()` requiring settings.edit. Same chain. |
| `modules/inventory/inventory-table.js:136,183` | same body-class pattern | Same chain. |

### E.3 HARMFUL — bypass that defeats the perm system

| Location | Code | Effect |
|---|---|---|
| `modules/debt/ai/ai-config.js:13` | `return role === 'ceo' \|\| role === 'manager';` | Direct role check; the related DB perm key `debt.ai_config` (which exists for Group B tenants only) is never read. **Granting/revoking `debt.ai_config` has no effect.** Worse: this ignores all Group A tenants entirely (no `debt.ai_*` key on Prizma/demo). |

### E.4 SUPER-ADMIN (separate cross-tenant system, not part of this audit)

| Location | Code |
|---|---|
| `modules/storefront/studio-permissions.js:62-64` | `getTenantConfig('is_super_admin') === true ? 'super_admin' : 'tenant_admin'` |
| `js/auth-service.js:130` | `tenants.is_super_admin` selected into tenant_config | 

`is_super_admin` is a `tenants` column that grants cross-tenant Studio access. Out of scope for this audit (separate concern from per-tenant permissions).

### E.5 Summary of admin-style bypasses

- **2 BENIGN** (LEGACY_ROLE_MAP, branch-isolation).
- **6 CHAINED** (`isAdmin`/`admin-mode` class, all in inventory module, all gated on `settings.edit`).
- **1 HARMFUL** (`ai-config.js` direct role check).
- **1 SUPER-ADMIN** (out of scope).

The 6 chained occurrences in inventory are the user-visible Daniel bug. The 1 harmful occurrence in ai-config is a latent bug nobody has hit yet because the `debt.ai_*` keys are Group B only and Daniel works on Prizma.

---

## §F — Hypothesis Answers

### H1 — "The permissions UI screen filters which keys appear, so Daniel can't see the unchecked ones to grant them."

**RULED OUT.** Live Chrome MCP evidence on Prizma's perm matrix:
- 55 perm rows rendered (`perm_rows: 55`)
- DB has 55 distinct keys for Prizma
- All 55 are visible in the matrix; no filter, no search, no `LIMIT` in the SELECT (lines 261-265)

The code path `renderPermissionMatrix` fetches all perms WHERE `tenant_id = getTenantId()` (line 263) and renders all of them. Daniel can grant/revoke every one of the 55 keys.

The misperception is the "281" figure — Daniel reads "281 permissions exist" and expects to see 281 checkbox rows; he sees 55 because that's the actual count for his tenant. The other 226 belong to other tenants' schemas.

### H2 — "The save handler writes to a wrong tenant_id or fails silently for some keys."

**RULED OUT.** The save handler at `employee-list.js:318-324`:
- Includes `tenant_id: getTenantId()` in the upsert payload (line 321)
- Includes `tenant_id` in the `onConflict` clause (line 321 again)
- The `onConflict` fix landed in commit `784bbc8` per `C1_PERMISSIONS_UPSERT` SPEC

Both pieces are correct. There is one minor weakness (silent-toast on RLS denial — see §D) but no incorrect-tenant write.

### H3 — "The admin bypass is hardcoded somewhere, so Daniel sees UI other roles never get."

**PARTIAL CONFIRMED.** Three distinct hardcoded role/admin bypass mechanisms exist (see §E):

- **BENIGN bypass:** `LEGACY_ROLE_MAP` (admin → ceo) + branch-isolation `ceo||manager` exception. These are intentional and don't grant Daniel any UI a properly-granted ceo wouldn't have.
- **CHAINED bypass:** `isAdmin` global flag (set when `settings.edit` granted) gates 6+ inventory operations. **Manager has all inventory perms but lacks settings.edit → cannot use bulk inventory ops.** This is the user-visible Daniel bug. NOT a Daniel-only bypass — it's a "manager is unfairly denied" bug.
- **HARMFUL bypass:** `modules/debt/ai/ai-config.js:13` short-circuits the perm system for AI/debt config. Grants `ceo+manager` regardless of `debt.ai_config` checkbox state. Not visible to Daniel because Prizma doesn't have `debt.ai_*` keys at all (Group B only).

### H4 — "Most of the 281 keys are dead — only ~80 actually used."

**PARTIAL CONFIRMED — but the framing is slightly wrong.** The 281 is 89 distinct keys. Of those 89:
- **28 are wired to code** (Q1, see §A3)
- **61 are not directly referenced** in JS literal strings

The 61 are not all "dead" — they fall into categories:
1. **Truly dead** — no module exists for the action (e.g. `inventory.barcode`, `inventory.images`, `audit.item_history` — no UI page checks them).
2. **Group B duplicates** — semantically equivalent to a Group A key the codebase DOES check (e.g. `purchasing.view` ↔ `purchase_order.view`). The codebase only handles Group A naming, so Group B keys appear dead in code but would be checked if the codebase supported Group B tenants properly.
3. **Matrix-management-only** — keys that appear in the perm matrix for granting but no production code path actually checks them (e.g. `audit.view` is in the matrix and granted to ceo, but no JS uses it).

So "dead" is a spectrum. The cleanest breakdown:
- ~25 keys are TRULY dead in this codebase (categories 1 + 3).
- ~36 keys are Group B-only (category 2 — would activate if Group B tenants got real production use).

### H5 — "The view/RLS layer has tenant-id leaks that accidentally show some data only to certain roles."

**PARTIAL — read-only inspection finds no structural leak; runtime verification deferred to Phase 2.** NOT TESTABLE in Phase 1 without making writes (logging in as a different role, comparing UI). Phase 2 (or a separate RLS audit SPEC) should verify by:
1. Creating a `manager`-role test session for Prizma
2. Running the same DOM inspection as §C.1
3. Comparing visible-vs-hidden permission counts to expected

For now: read-only verification of `getEffectivePermissions` (auth-service.js:65-89) shows it filters `role_permissions` by `tenant_id` (line 84) and `granted=true` (line 82), and the RLS canonical-pattern policies (per CLAUDE.md §5 Iron Rule 15) on `role_permissions` should add a second layer. **No structural leak found in the read-only inspection; runtime verification deferred to Phase 2.**

---

## §G — Consolidation Proposals

Each proposal is independent. Daniel reviews and decides individually. Risk levels are LOW (mechanical change, easy rollback), MEDIUM (touches core code path, requires QA), HIGH (cross-tenant or schema change).

### Proposal 1 — Decouple `isAdmin` from `settings.edit` (THE PRIORITY FIX)

- **Keys involved:** `settings.edit` (today), `inventory.edit` / `inventory.delete` / etc. (tomorrow)
- **Rationale:** `isAdmin` currently means "has settings.edit" but is read by inventory bulk operations. This couples permissions across modules. Replace `if (!isAdmin)` checks in `modules/inventory/inventory-edit.js` and `inventory-actions.js` and `inventory-table.js` with explicit `if (!hasPermission('inventory.edit'))` (or `inventory.delete` for delete operations). Delete the `isAdmin` global from `js/shared.js:124` and the `body.classList.add('admin-mode')` in `modules/admin/admin.js:7`.
- **Impact:** Manager (and any role with granular inventory perms) gets bulk inventory operations as expected. Admin-mode body class still controllable from a stylesheet rule based on `[data-perm-settings-edit]` if needed.
- **Risk:** **MEDIUM** — touches ~10 lines across 3 files in inventory module. Need QA pass for all bulk operations on demo tenant under each role.
- **Daniel's decision:** [PENDING]

### Proposal 2 — Remove the harmful direct role check in `ai-config.js`

- **Keys involved:** `debt.ai_config` (Group B), `debt.ai_*` family
- **Rationale:** Replace `return role === 'ceo' || role === 'manager'` (`modules/debt/ai/ai-config.js:13`) with `return hasPermission('debt.ai_config')`. Today the line bypasses the perm key entirely.
- **Impact:** AI/debt config gating goes through the standard permission flow. Group B tenants now grant via the matrix. Group A tenants (no `debt.ai_*` key) won't grant — same outcome as today (denied).
- **Risk:** **LOW** — single-line change. The function is called from a small number of places; verify with grep.
- **Daniel's decision:** [PENDING]

### Proposal 3 — Delete the 3 test-only `*.admin` keys from `permission-test.html`

- **Keys involved:** `inventory.admin`, `purchasing.admin`, `shipments.admin`
- **Rationale:** These appear only in `shared/tests/permission-test.html` — not in DB, not in production code. They violate Iron Rule 21 (no orphans). Either delete the test file (it's likely outdated) or add the 3 keys to the DB seed for completeness.
- **Impact:** Removes 3 broken UI-hide-forever paths. Test page might lose its purpose; check if any QA still uses it.
- **Risk:** **LOW**
- **Daniel's decision:** [PENDING]

### Proposal 4 — Sync `ROLE_BADGES` + `ROLE_HIERARCHY` with DB-defined roles per tenant

- **Keys involved:** UI constants in `modules/permissions/employee-list.js:6-14`, hardcoded to Group A
- **Rationale:** On Group B tenants, opening the employee modal hides the senior+employee role options because the constants don't include them. Either (a) load `roles` from DB and build the badge map at runtime, or (b) inline both Group A and Group B roles into the constants.
- **Impact:** Group B tenants can assign roles via the UI as designed.
- **Risk:** **MEDIUM** — touches a UI hot path. Need QA on all 5 tenants.
- **Daniel's decision:** [PENDING]

### Proposal 5 — Consolidate the Group A / Group B duplicate naming for `purchase_order` vs `purchasing`

- **Keys involved:** `purchase_order.{approve,create,delete,edit,view}` (Group A) vs `purchasing.{create,delete,edit,view}` (Group B)
- **Rationale:** Two parallel naming schemes for identical actions. Standardize on one (recommend `purchasing.*` — shorter, table name match). Migrate Group A row IDs in `permissions` + `role_permissions` + any remaining code reference.
- **Impact:** Single source of truth across tenants. Code-side `purchase_order.view` data-tab-permission attr in inventory.html needs renaming.
- **Risk:** **HIGH** — schema migration affecting 2 tenants live + code rename. Plan as a separate SPEC.
- **Daniel's decision:** [PENDING]

### Proposal 6 — Consolidate `goods_receipt.*` (Group A) vs `receipts.*` (Group B)

- **Keys involved:** `goods_receipt.{confirm,create,export}` ↔ `receipts.{confirm,create,edit_prices,view}`
- **Rationale:** Same as Proposal 5 — two names for the same action. Note: Group B has `receipts.view` and `receipts.edit_prices` that Group A lacks; either add them as `goods_receipt.*` aliases or merge into a unified naming.
- **Impact:** Cleaner Module 1 perms.
- **Risk:** **HIGH**
- **Daniel's decision:** [PENDING]

### Proposal 7 — Consolidate the debt sub-namespace (`debt.documents.*` + `debt.payments.*` Group A vs `debt.create / .edit / .delete / .payments / .prepaid / .returns` Group B)

- **Keys involved:** ~13 distinct debt keys across the two groups
- **Rationale:** Largest namespace divergence. The Group B flat naming (`debt.create`, `debt.edit`, `debt.delete`) is simpler; the Group A nested naming (`debt.documents.create`, `debt.payments.cancel`) is more granular. Decision: pick one philosophy (flat or nested) and migrate.
- **Impact:** Major matrix simplification. Either Group A loses fine-grained payments-cancel-vs-create distinction, or Group B gains it.
- **Risk:** **HIGH** — affects every tenant. Recommend only after Daniel decides flat vs nested.
- **Daniel's decision:** [PENDING]

### Proposal 8 — Consolidate `employees.{create,edit,delete,assign_role}` (Group A) vs `employees.manage` (Group B) into one scheme

- **Keys involved:** 4 Group A keys + 1 Group B key
- **Rationale:** Group A has the modern granular split; Group B has a single coarse `employees.manage`. Adopt Group A naming everywhere; Group B's `employees.manage` becomes 4 keys.
- **Impact:** Group B tenants gain ability to grant create-but-not-delete etc.
- **Risk:** **MEDIUM-HIGH**
- **Daniel's decision:** [PENDING]

### Proposal 9 — Add Group A `purchase_order.view` to all tenants (and similar gaps)

- **Keys involved:** Several keys present in only one tenant group
- **Rationale:** The current splits seem accidental rather than intentional. A simple sweep to seed all 89 keys into all 5 tenants would unify the matrix UX.
- **Impact:** Matrix shows the same 89 rows in every tenant; admins on test stores see Group A keys too.
- **Risk:** **MEDIUM** — bulk INSERT into `permissions` for missing rows. Need to also INSERT default `role_permissions` (denied for new keys) so the matrix reflects "ungranted" not absent.
- **Daniel's decision:** [PENDING]

### Proposal 10 — Surface a "matrix-only key" badge in the UI

- **Keys involved:** All 25 truly-dead keys (the ones that appear in matrix but no code checks)
- **Rationale:** Daniel grants/revokes those keys today not knowing they have no effect. A small ⚠ badge next to "matrix-only" keys would make this visible without removing them yet.
- **Impact:** UX improvement; informs Phase 3 cleanup decisions.
- **Risk:** **LOW** — UI addition only.
- **Daniel's decision:** [PENDING]

### Proposal 11 — Replace `isAdmin` body-class pattern with `data-permission-styled` CSS scope

- **Keys involved:** `settings.edit`, all admin-mode-styled UI
- **Rationale:** Today `body.admin-mode` toggles CSS rules that show cost columns etc. Replace with `[data-perm-settings-edit] [data-cost]` selectors set by `applyUIPermissions`. More explicit.
- **Impact:** Same UX, more declarative.
- **Risk:** **MEDIUM** — touches CSS.
- **Daniel's decision:** [PENDING]

### Proposal 12 — Add a "test for permission gating" QA script

- **Keys involved:** All 28 wired keys
- **Rationale:** A scripted QA pass that logs in as each role on demo tenant and dumps the visible vs hidden DOM elements would catch future regressions like the manager/isAdmin bug. Could live in `shared/tests/`.
- **Impact:** Prevents permission regressions from shipping silently.
- **Risk:** **LOW**
- **Daniel's decision:** [PENDING]

### Proposal 13 — Document the canonical permission key naming convention in CLAUDE.md

- **Rationale:** New code keeps inventing keys (the 3 `*.admin` test keys, the Group B parallel keys) because there's no documented convention. CLAUDE.md should specify: `module.action` (lowercase, dot-separated, max 2 levels), all keys must be seeded into all tenants.
- **Impact:** Prevents next batch of orphans.
- **Risk:** **LOW**
- **Daniel's decision:** [PENDING]

---

## §H — Phase 2 SPEC Outline

### Recommended scope (minimum viable fix)

**SPEC PHASE_2_DECOUPLE_ISADMIN** — Apply Proposal 1 only.

- **Goal:** Make manager (or any role with `inventory.edit`) able to use bulk inventory operations.
- **Files modified:** `modules/inventory/inventory-edit.js`, `modules/inventory/inventory-actions.js`, `modules/inventory/inventory-table.js`, `js/shared.js`, `modules/admin/admin.js`.
- **Lines changed:** ~10 lines total. Each `if (!isAdmin)` → `if (!hasPermission('inventory.edit'))` (or `.delete` for delete operations). Delete the `let isAdmin = false;` declaration. Delete the `body.classList.add('admin-mode')` line.
- **DB writes:** ZERO (no permission grants — manager already has `inventory.edit`).
- **QA:** Demo tenant. Sign in as: ceo (works as before), manager (gains bulk ops), team_lead (still inventory.edit ✅, gains bulk ops), worker (no inventory.edit, no bulk ops — correct).
- **Estimated effort:** 60 minutes including QA.

### Optional follow-ups (separate SPECs, smaller risk)

- **PHASE_2.1 — AI_CONFIG_PERM_FIX** — Apply Proposal 2 (1 line). 15 min.
- **PHASE_2.2 — DELETE_TEST_ADMIN_KEYS** — Apply Proposal 3 (delete 3 lines from test file). 5 min.
- **PHASE_2.3 — ROLE_BADGES_FROM_DB** — Apply Proposal 4 (~30 lines). 1 hour.

### Out of scope for Phase 2

- Proposals 5-9 (cross-tenant naming consolidation) — large, requires Daniel's strategic call on flat vs nested. Defer to Phase 3.
- Proposal 11 (CSS refactor) — speculative. Defer.
- Proposal 12 (QA test script) — useful but separate. Defer to a tooling SPEC.

### Decision points for Daniel before authoring Phase 2

1. Apply Proposal 1 only (minimum) OR bundle 1+2+3 (low-risk batch)?
2. For Proposals 5-9: flat naming (Group B) or nested (Group A)?
3. Is the test page `shared/tests/permission-test.html` still needed?

---

## §I — Dead Keys (DB but not directly referenced in code)

**61 keys total.** Categorized:

### I.1 — Truly dead (no plausible code path, ~25 keys)

Keys that should be deleted unless a future feature plans to use them:

```
admin.manage, admin.system_log, admin.view                    (Group B, no admin module wired)
ai.alerts.manage, ai.config, ai.ocr.approve, ai.ocr.scan      (Group A; ai-config.js bypasses)
audit.item_history, audit.view                                 (no audit page checks them)
debt.ai_alerts, debt.ai_batch, debt.ai_config, debt.ai_historical, debt.ai_ocr   (Group B; bypassed)
debt.documents.cancel, debt.documents.create, debt.documents.edit                (Group A; checked by data-perm? No, never)
debt.payments.cancel, debt.payments.create                                       (Group A; never checked)
debt.prepaid.manage                                            (Group A; never checked)
debt.payments, debt.prepaid, debt.returns                      (Group B; never checked)
debt.create, debt.edit, debt.delete                            (Group B; never checked)
employees.manage                                               (Group B; UI uses 4 granular keys)
goods_receipt.confirm — IS in code ✓
purchase_order.approve, purchase_order.create, purchase_order.delete, purchase_order.edit (Group A; UI uses .view only)
purchasing.create, purchasing.delete, purchasing.edit, purchasing.view (Group B; never checked)
receipts.confirm, receipts.create, receipts.edit_prices, receipts.view (Group B; never checked)
returns.create, returns.credit, returns.send_to_box, returns.view (Group A; never checked in JS — UI gates? need verify)
reports.view                                                   (only reports.export checked)
shipments.delete, shipments.edit, shipments.lock, shipments.manifest (only .create / .settings / .view checked in JS)
stock_count.cancel, stock_count.delete, stock_count.filters, stock_count.report, stock_count.view, stock_count.scan (only .approve / .create checked)
sync.export, sync.import, sync.manage, sync.watcher_config     (only sync.view checked)
inventory.barcode, inventory.create, inventory.images          (Group B; never checked)
```

(Some of the above are checked by perm-matrix-only code, not production code paths.)

### I.2 — Group B duplicates (~20 keys)

These have a Group A equivalent that IS checked. They activate only if Group B tenants get real use.

```
purchasing.view ↔ purchase_order.view (in code)
receipts.create ↔ goods_receipt.create (in code)
receipts.view (no Group A equivalent)
debt.create / .edit / .delete (Group A uses .documents.* split)
... etc.
```

### I.3 — Production-required but dispatched via inheritance (the rest, ~16 keys)

Keys that the `getEffectivePermissions` flow grants to roles, but no JS guard explicitly checks. The intention may have been server-side enforcement (RLS) — verify in Phase 2.

---

## §J — Open Questions for Daniel

1. **Are the 3 test-store tenants (test-store-qa, test-store-v2, test-store-verify) actively used or vestigial?** If vestigial, deleting them collapses Group B and removes the dual-naming problem entirely.
2. **For consolidation: prefer flat (`debt.create`) or nested (`debt.documents.create`) naming?** Drives Proposals 5-7.
3. **Should `is_super_admin` (cross-tenant) be unified with the per-tenant role model, or stay separate?** Out of this audit's scope but worth strategic decision.
4. **Should the perm matrix offer "select all" / "deny all" buttons per row?** Not a fix — a UX ask.
5. **The harmless `LEGACY_ROLE_MAP` admin→ceo bridge — is it intended to stay, or should every employee be required to have an `employee_roles` row eventually?** Drives whether to deprecate `employees.role`.
6. **`shared/tests/permission-test.html` — kept for QA reference, or stale and deletable?**

---

*End of DIAGNOSIS_REPORT.md.*
