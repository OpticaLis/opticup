# FINDINGS — PERMISSIONS_AUDIT_PHASE1_2026_04_27

> **Location:** `modules/Module 1 - Inventory/docs/specs/PERMISSIONS_AUDIT_PHASE1_2026_04_27/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution)
> **Note:** The substantive findings of this audit are in `DIAGNOSIS_REPORT.md` §A–§J. This file logs only out-of-scope SPEC-precision and process observations.

---

## Findings

### Finding 1 — SPEC §2 framed "281 permissions" as if 281 distinct keys; actually 89 distinct ids × tenant copies

- **Code:** `M3-SPEC-01`
- **Severity:** MEDIUM (drove the framing of the audit's central question)
- **Discovered during:** §A2 DB inventory query
- **Location:** SPEC §2 Background table; SPEC §3 #5 verify command
- **Description:** SPEC repeatedly references "281 keys defined across 17 modules" and frames hypothesis H4 as "most of the 281 keys are dead". The actual structure is 89 distinct `permissions.id` values, with each duplicated across some subset of the 5 tenants (tenant-scoped per Iron Rule 14). Prizma has only 55 distinct keys; Group B test stores have 57 each. A literal "281 keys for Prizma" cannot exist — it's a 5-tenant aggregate. Discovered via a `count(DISTINCT id)` query on `permissions`; documented prominently in the DIAGNOSIS_REPORT Executive Summary so Daniel doesn't chase a phantom dead-key cleanup.
- **Reproduction:**
  ```sql
  SELECT count(*) AS rows, count(DISTINCT id) AS distinct_ids,
         array_agg(DISTINCT tenant_id) AS tenants
    FROM permissions;
  -- → rows=281, distinct_ids=89, tenants=5 UUIDs
  ```
- **Expected vs Actual:**
  - Expected (per SPEC framing): 281 distinct keys
  - Actual: 89 distinct keys × 1–5 tenants each = 281 rows
- **Suggested next action:** TECH_DEBT (Foreman SKILL — pre-flight DB-row-count framing check)
- **Rationale for action:** Tenant-scoped tables almost always have this composite-count effect. Same family as the prior FOREMAN_REVIEW Strategic Proposal A — pre-author baseline probe should disambiguate.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `js/shared.js:124` declares a stateful `isAdmin` global that couples permissions across modules

- **Code:** `M3-DEBT-01`
- **Severity:** HIGH (this is the user-visible Daniel bug)
- **Discovered during:** §E admin-bypass map enumeration
- **Location:** `js/shared.js:124` declaration; `modules/admin/admin.js:5` assignment; `modules/inventory/inventory-edit.js:57,102,198,241` consumption
- **Description:** The global `isAdmin` is set in `activateAdmin()` based on `hasPermission('settings.edit')`, then consumed by ~10 inventory bulk-edit functions instead of those functions checking `inventory.edit` directly. Manager has 54/55 keys (missing only `settings.edit`) → `isAdmin=false` → bulk inventory ops denied even though manager explicitly has `inventory.edit`. This is the user-visible bug Daniel reported. Documented at length in DIAGNOSIS_REPORT §E + §F H3 + §H Phase 2 outline (Proposal 1).
- **Reproduction:** see DIAGNOSIS_REPORT §E.2 table.
- **Expected vs Actual:**
  - Expected: each guard checks the perm key it actually represents
  - Actual: ~10 guards check `isAdmin` (couples all to `settings.edit`)
- **Suggested next action:** NEW_SPEC (Phase 2 — minimum-viable fix per §H)
- **Rationale for action:** This is the SPEC's primary actionable finding. Phase 2 should land this fix before any other consolidation work.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — `modules/debt/ai/ai-config.js:13` hardcodes ceo+manager check, bypasses the perm system

- **Code:** `M3-DEBT-02`
- **Severity:** MEDIUM (latent bug — Prizma doesn't have `debt.ai_*` keys so Daniel can't trigger; activates if Group B tenants get real use)
- **Discovered during:** Project-wide grep for `role === 'admin'\|role === 'ceo'` patterns
- **Location:** `modules/debt/ai/ai-config.js:13` — `return role === 'ceo' || role === 'manager';`
- **Description:** Direct role check that ignores the granular `debt.ai_config` perm key (which exists for Group B tenants in DB). Granting/revoking `debt.ai_config` to/from team_lead has no effect on this gate. Same harmful pattern as Daniel's recent question about manager permissions — coupling code-level role-name checks with the perm system.
- **Reproduction:**
  ```
  grep -n "role === 'ceo' || role === 'manager'" modules/debt/ai/ai-config.js
  # → 13:  return role === 'ceo' || role === 'manager';
  ```
- **Expected vs Actual:**
  - Expected: gate via `hasPermission('debt.ai_config')`
  - Actual: gate via direct role-name check
- **Suggested next action:** TECH_DEBT (queue for Phase 2 follow-up SPEC; see DIAGNOSIS_REPORT Proposal 2)
- **Rationale for action:** Single-line fix, very low risk. Bundle with the Phase 2 minimum-viable fix or land as PHASE_2.1 standalone.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — 3 test-only `*.admin` permission keys in `shared/tests/permission-test.html` are not in DB (Iron Rule 21 violation)

- **Code:** `M3-DEBT-02`
- **Severity:** LOW (test file only; no production user-visible effect)
- **Discovered during:** §A3 cross-reference Q4 (code references but DB lacks)
- **Location:** `shared/tests/permission-test.html` lines 74, 94 (and similar)
- **Description:** Three permission keys are referenced in the test page only: `inventory.admin`, `purchasing.admin`, `shipments.admin`. None exist in the `permissions` table. Iron Rule 21 (no orphans) — these are dead keys in code that no DB seed creates. The test page either needs the keys added to the DB seed (creating 3 more orphan keys to clean up later) OR the test page should be deleted (it appears stale).
- **Reproduction:** see DIAGNOSIS_REPORT §A3 Q2.
- **Expected vs Actual:**
  - Expected: every code-referenced key has a DB row
  - Actual: 3 keys referenced in test code only, never seeded
- **Suggested next action:** TECH_DEBT (DIAGNOSIS_REPORT Proposal 3 — delete test file or add the 3 keys; ask Daniel which)
- **Rationale for action:** Cheap to fix once Daniel decides whether to keep the test page.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — `ROLE_BADGES` + `ROLE_HIERARCHY` constants in `employee-list.js:6-14` are hardcoded to Group A roles only

- **Code:** `M3-DEBT-03`
- **Severity:** MEDIUM (silent UX bug for Group B tenants)
- **Discovered during:** §B per-tenant role audit
- **Location:** `modules/permissions/employee-list.js:6-14`
- **Description:** `ROLE_BADGES` covers ceo/manager/team_lead/worker/viewer (Group A); `ROLE_HIERARCHY` matches. Group B tenants (test-store-qa/v2/verify) use ceo/manager/senior/employee/viewer. On a Group B tenant, opening the employee modal silently filters out the senior+employee options because the dropdown iterates only `ROLE_BADGES.entries()` (line 149-154). The matrix render correctly shows all roles from DB, but the modal can't assign them.
- **Reproduction:**
  ```
  grep -A 6 'ROLE_BADGES' modules/permissions/employee-list.js | head -10
  # Confirms Group A only
  ```
- **Expected vs Actual:**
  - Expected: badges + hierarchy derived from DB `roles` table per tenant
  - Actual: hardcoded Group A constants
- **Suggested next action:** TECH_DEBT (DIAGNOSIS_REPORT Proposal 4)
- **Rationale for action:** Daniel works on Prizma (Group A) so he doesn't see this bug. Whoever next opens employee-management on a test-store will hit it. Phase 2 follow-up.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 6 — Save handler shows toast on RLS denial but does not log the underlying error

- **Code:** `M3-DEBT-04`
- **Severity:** LOW (diagnostic-only; doesn't block Daniel today)
- **Discovered during:** §D save-handler trace
- **Location:** `modules/permissions/employee-list.js:322` — `if (error) { toast('שגיאה...'); return; }`
- **Description:** The save handler's error path triggers a Toast but does NOT `console.error(error)` or write to `ActivityLog`. If RLS denies the write for some reason (policy gap, future schema drift), Daniel sees a Hebrew toast and has no way to diagnose without F12 + network panel inspection.
- **Reproduction:** N/A — no current scenario causes the error path.
- **Expected vs Actual:**
  - Expected: error path logs to console + ActivityLog so audit trail exists
  - Actual: silent except for the toast
- **Suggested next action:** TECH_DEBT (small UX/diagnostic fix; bundle with Phase 2)
- **Rationale for action:** 2-line change. Cheap.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 7 — Two parallel naming schemes for the same business actions across tenant groups

- **Code:** `M3-DEBT-05`
- **Severity:** MEDIUM (architectural hygiene; not user-facing today but increases maintenance burden)
- **Discovered during:** §A2 DB inventory + §B per-tenant audit
- **Location:** `permissions` table
- **Description:** Group A (Prizma + demo) and Group B (3 test stores) use entirely different keys for the same concepts:
  - `purchase_order.{approve,create,delete,edit,view}` (Group A) ↔ `purchasing.{create,delete,edit,view}` (Group B)
  - `goods_receipt.{confirm,create,export}` (Group A) ↔ `receipts.{confirm,create,edit_prices,view}` (Group B)
  - `debt.{documents.create,documents.edit,documents.cancel,payments.create,payments.cancel,prepaid.manage}` (Group A) ↔ `debt.{create,edit,delete,payments,prepaid,returns,ai_*}` (Group B)
  - `employees.{create,edit,delete,assign_role}` (Group A) ↔ `employees.{manage}` (Group B)
- **Reproduction:** DIAGNOSIS_REPORT §A2 module-by-module breakdown.
- **Expected vs Actual:**
  - Expected: one canonical naming convention
  - Actual: two parallel schemes, no migration path
- **Suggested next action:** TECH_DEBT (DIAGNOSIS_REPORT Proposals 5, 6, 7, 8 — Daniel decides flat vs nested first, then schedule a consolidation SPEC)
- **Rationale for action:** Strategic consolidation should follow Daniel's review of §G; not a Phase 2 minimum.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 8 — `modules/Module 1 - Inventory` vs `modules/Module 1 - Inventory Management` folder duplication (recurrence)

- **Code:** `M3-RECUR-01`
- **Severity:** LOW (recurrence — already TECH_DEBT in prior FOREMAN_REVIEWs)
- **Discovered during:** SPEC §8 doc-update step (SESSION_CONTEXT lives under `Inventory Management`; SPEC folder lives under `Inventory`)
- **Location:** `modules/` directory listing
- **Description:** Same finding as M1-SPEC-06 in STOREFRONT_SYNC_HIERARCHY_FIX/FINDINGS.md and recurrence in STUDIO_BRANDS_VISIBILITY_REWORK. Two parallel `Module 1` folders co-exist. Already disposed as TECH_DEBT for a folder-consolidation SPEC.
- **Reproduction:** `ls modules/ | grep -i inventory` → 2 hits.
- **Suggested next action:** DISMISS (already TECH_DEBT)
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.md.*
