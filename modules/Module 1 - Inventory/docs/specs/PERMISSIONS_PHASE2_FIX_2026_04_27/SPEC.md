# SPEC — PERMISSIONS_PHASE2_FIX_2026_04_27

> **Location:** `modules/Module 1 - Inventory/docs/specs/PERMISSIONS_PHASE2_FIX_2026_04_27/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Cowork session)
> **Authored on:** 2026-04-27
> **Module:** Cross-cutting (auth-service.js + admin/inventory + permissions UI + DB schema)
> **Phase:** Hotfix bundle (Phase 2 of permissions audit — Phase 1 closed in `PERMISSIONS_AUDIT_PHASE1_2026_04_27`)
> **Author signature:** Cowork-strategic — 2026-04-27 night, fourth hotfix
> **Severity:** HIGH — Daniel-reported manager-can't-bulk bug + accumulated permissions debt

---

## 1. Goal

Fix the user-visible "manager doesn't see what admin sees" bug + ship 8 related permission-system improvements in a single coordinated SPEC. Specifically:

1. Decouple the global `isAdmin` from `settings.edit` so granular `inventory.edit` actually grants bulk inventory ops. (Daniel's reported bug.)
2. Remove the harmful direct role-check bypass in AI debt config.
3. Delete 3 dead test-only `*.admin` permission keys + the test page that references them.
4. Consolidate the dual-naming permission keys to short form (`debt.create`, `purchasing.view`, `receipts.create`, `employees.manage`).
5. Seed the unified canonical key set into all surviving tenants (Prizma + Demo).
6. Load `ROLE_BADGES` + `ROLE_HIERARCHY` from the DB instead of hardcoded constants.
7. Add "select all" / "deny all" buttons to each permissions matrix row for fast role provisioning.
8. Delete the 3 test-store tenants (`test-store-qa`, `test-store-v2`, `test-store-verify`) that Daniel confirmed are unused — collapses Group A/B drift.
9. Delete `shared/tests/permission-test.html` (stale, 6+ months untouched, references 3 dead keys).

After this SPEC: 2 tenants survive (Prizma + Demo), one canonical naming scheme, ~80 unified permission keys, no admin-coupling bug, no harmful role bypass, no dead test scaffolding, fast row-bulk in the permissions matrix.

---

## 2. Background & Motivation

This is the fix-side companion to `PERMISSIONS_AUDIT_PHASE1_2026_04_27`. The Phase 1 audit (closed 2026-04-27) found:

- **Daniel's user-visible bug** (Manager doesn't see bulk inventory ops): `js/shared.js:124` declares `let isAdmin = false`, set in `modules/admin/admin.js:5` to `hasPermission('settings.edit')`. ~10 inventory functions consume the global instead of checking `inventory.edit` directly. Manager has 54/55 Prizma keys — missing only `settings.edit` — so `isAdmin=false` and bulk ops are denied even though manager has `inventory.edit`.
- **Harmful role bypass**: `modules/debt/ai/ai-config.js:13` — `return role === 'ceo' || role === 'manager'` — bypasses `debt.ai_config` permission entirely. Latent bug (Prizma doesn't have `debt.ai_*` keys, only Group B does).
- **Dual-naming chaos**: Group A (Prizma + Demo) uses `purchase_order.*` / `goods_receipt.*` / `debt.documents.*` / 4 granular `employees.*` keys. Group B (3 test stores) uses `purchasing.*` / `receipts.*` / `debt.{create,edit,delete}` / `employees.manage`. ~30 keys are dual-named for the same actions.
- **Hardcoded UI constants**: `ROLE_BADGES` + `ROLE_HIERARCHY` in `modules/permissions/employee-list.js:6-14` only know Group A roles (ceo/manager/team_lead/worker/viewer). On Group B tenants the employee-modal silently hides the senior/employee role options.
- **Test scaffolding orphans**: `shared/tests/permission-test.html` references 3 keys that don't exist in DB (`inventory.admin`, `purchasing.admin`, `shipments.admin`). Iron Rule 21 violation. File untouched 6+ months, no automation references.

Daniel's decisions (this conversation, 2026-04-27):

- Decision 1: **Delete the 3 test-store tenants.**
- Decision 2: **Use short naming** (`debt.create`, `purchasing.view`, `receipts.create`).
- Decision 3: **Super-admin (cross-tenant) stays separate from per-tenant permissions.** Future SPEC adds a sub-super-admin role but is out of scope here.
- Decision 4: **Add "all/none" buttons** to each matrix row.
- Decision 5: **Don't touch `LEGACY_ROLE_MAP`** (admin → ceo bridge). Tech-debt for later.
- Decision 6: **Delete `permission-test.html`.**

Live-state baseline (Cowork SQL probe, 2026-04-27):

- Tenants to delete: `test-store-qa`, `test-store-v2`, `test-store-verify` — confirmed 0 inventory rows, 0 brands rows, 3 employees total, 15 roles, 171 permissions, 462 role_permissions. Safe to cascade.
- Tenants to keep: `prizma` (id `6ad0781b-...`), `demo` (id `8d8cfa7e-...`).
- After tenant deletes: ~89 distinct permission ids → expected to drop to ~75 since Group B-only keys (`receipts.*`, `purchasing.*`, `employees.manage`, `debt.create/.edit/.delete`, `audit.item_history`, `admin.*`) get cascade-deleted along with the tenants. The CONSOLIDATION step **then renames Prizma+Demo's existing long-form keys to the short form**, so the surviving canonical scheme is the short one.

---

## 3. Success Criteria (Measurable)

**Cross-section consistency check**: §4 envelope, §5 stop-triggers, §7 out-of-scope, and §12 QA do not contradict each other (verified at author-time).

**Identifier verification (author-time)**:
- `T.EMPLOYEES`, `T.BRANDS` ✅ in `js/shared.js`
- `AT.PERMISSIONS`, `AT.ROLES`, `AT.ROLE_PERMS`, `AT.EMP_ROLES`, `AT.SESSIONS` ✅ in `js/auth-service.js:4-10`
- `LEGACY_ROLE_MAP`, `getEffectivePermissions`, `hasPermission`, `requirePermission`, `applyUIPermissions`, `PermissionUI` ✅ in `js/auth-service.js` and `shared/js/permission-ui.js`
- `ROLE_BADGES`, `ROLE_HIERARCHY`, `renderPermissionMatrix`, `updateRolePermission` ✅ in `modules/permissions/employee-list.js`
- File `modules/admin/admin.js`, `modules/debt/ai/ai-config.js`, `modules/inventory/inventory-edit.js`, `modules/inventory/inventory-actions.js`, `modules/inventory/inventory-table.js`, `shared/tests/permission-test.html` ✅ all exist

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | ERP repo on `develop`, clean | "nothing to commit" | `git -C C:/Users/User/opticup status` |
| 2 | ERP commit count this SPEC | 8 commits | `git log origin/develop..HEAD --oneline \| wc -l` → 8 |
| 3 | `isAdmin` global declaration removed | 0 hits for `let isAdmin` in `js/shared.js` | `grep -c '^let isAdmin\|^var isAdmin' js/shared.js` → 0 |
| 4 | Inventory bulk-edit guards now use `hasPermission('inventory.edit')` instead of `isAdmin` | ≥6 hits, 0 hits for `if (!isAdmin)` in inventory module | `grep -c "if (!isAdmin)" modules/inventory/*.js` → 0 + `grep -c "hasPermission('inventory" modules/inventory/inventory-edit.js modules/inventory/inventory-actions.js modules/inventory/inventory-table.js` → ≥6 |
| 5 | `body.classList.add('admin-mode')` removed from `modules/admin/admin.js` | 0 hits | `grep -c "admin-mode" modules/admin/admin.js` → 0 |
| 6 | AI debt config bypass replaced with `hasPermission('debt.ai_config')` | 0 hits for `role === 'ceo' \|\| role === 'manager'` in `ai-config.js` | `grep -c "role === 'ceo'" modules/debt/ai/ai-config.js` → 0 |
| 7 | Test page deleted | file does not exist | `ls shared/tests/permission-test.html` → exit 1 (not found) |
| 8 | Test-store tenants deleted | 0 rows | `SELECT count(*) FROM tenants WHERE slug IN ('test-store-qa','test-store-v2','test-store-verify')` → 0 |
| 9 | Test-store cascade complete | 0 rows in dependent tables | `SELECT (SELECT count(*) FROM employees WHERE tenant_id IN (...)) + (SELECT count(*) FROM permissions WHERE tenant_id IN (...)) + (SELECT count(*) FROM role_permissions WHERE tenant_id IN (...)) + (SELECT count(*) FROM roles WHERE tenant_id IN (...))` → 0 (where `(...)` are the pre-deletion UUIDs) |
| 10 | Naming consolidation: Group A long-form keys renamed to short form on Prizma+Demo | 0 rows for the 4 long-form prefixes | `SELECT count(*) FROM permissions WHERE id LIKE 'purchase_order.%' OR id LIKE 'goods_receipt.%' OR id LIKE 'debt.documents.%' OR id LIKE 'debt.payments.%'` → 0 |
| 11 | Code references to long-form keys also renamed | 0 hits for old prefixes in HTML/JS | `grep -rE "['\"]purchase_order\.\|['\"]goods_receipt\.\|['\"]debt\.(documents\|payments)\." --include='*.html' --include='*.js' . \| wc -l` → 0 |
| 12 | All 4 short-form prefixes seeded for Prizma+Demo | each prefix has ≥1 row per tenant | `SELECT count(*) FROM permissions WHERE id LIKE 'debt.%' AND tenant_id = $prizma` → ≥3, etc. |
| 13 | `ROLE_BADGES` + `ROLE_HIERARCHY` loaded from DB | source has `await sb.from(AT.ROLES).select(...)` near the badges init | `grep -c "from(AT.ROLES)" modules/permissions/employee-list.js` → ≥1 |
| 14 | "Select all" / "deny all" buttons present | DOM elements with `data-row-toggle="all"` and `data-row-toggle="none"` for each permission row | inspect rendered matrix; verify buttons exist on every `<tr>` permission row |
| 15 | Manager on Demo tenant can use bulk inventory ops | manual QA pass on `localhost:3000` (signed in as a Demo manager test user) | see §12 step 4 |
| 16 | ERP `npm run verify:integrity` | exit 0 | `cd opticup && npm run verify:integrity` |
| 17 | Storefront repo untouched | 0 commits, 0 modified files | `cd opticup-storefront && git status` |
| 18 | Pre-flight + post-state JSON captured | `BEFORE_STATE.json` + `AFTER_STATE.json` in SPEC folder | `ls SPEC_FOLDER/{BEFORE,AFTER}_STATE.json` |
| 19 | EXECUTION_REPORT.md exists | file present | `ls SPEC_FOLDER/EXECUTION_REPORT.md` |
| 20 | FINDINGS.md exists | file present | `ls SPEC_FOLDER/FINDINGS.md` |
| 21 | Tech-debt entry for super-admin sub-roles work | one new entry in `MASTER_ROADMAP.md` or dedicated tech-debt log | `grep -c "super-admin sub-role\|cross-tenant employee" MASTER_ROADMAP.md docs/TROUBLESHOOTING.md modules/Module*/docs/SESSION_CONTEXT.md` → ≥1 |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read every file in the repo.
- Run read SQL via Supabase MCP.
- Run **scoped** write SQL: only on tables `tenants`, `roles`, `permissions`, `role_permissions`, `employees`, `employee_roles`, `auth_sessions` AND only against the 3 test-store tenant ids OR the explicit naming-consolidation keys named in §8 / §10.
- Modify the explicit list of files in §8.
- Commit and push to `develop`.
- Run `npm run verify:integrity`.
- Use Chrome MCP on `localhost:3000` for QA — including form submissions on the permissions matrix (this is real-use QA, not simulation).
- Create test sessions / test users on Demo tenant for QA verification of criterion #15.

### What REQUIRES stopping and reporting
- Any write SQL touching the Prizma tenant rows for tables OTHER than `permissions` (renames) and `role_permissions` (cascading rename) and `employees`/`auth_sessions` (test-user creation on Demo, not Prizma).
- Any write SQL touching the Demo tenant rows for tables OTHER than `permissions`, `role_permissions`, optionally `employees`+`auth_sessions` for test-user creation.
- Modifying any view definition.
- Modifying RLS policies on any table.
- Touching `is_super_admin` column or any super-admin code path.
- Touching `LEGACY_ROLE_MAP` in `js/auth-service.js:21`.
- Touching the storefront repo.
- Any merge to ERP `main`.
- Any test failure that cannot be diagnosed in a single retry.
- If §3 #9 returns nonzero (stale cascade) — STOP and investigate FK constraints.

---

## 5. Stop-on-Deviation Triggers

- If the pre-flight SELECT shows the 3 test-store tenants have unexpected rows in `inventory` or `brands` (>0) — STOP. Audit baseline mismatched.
- If the rename SQL on `permissions` would affect more than the expected count (~25 rows for Prizma+Demo combined: 5 + 3 + 6 + 11 = 25 rows max across all 4 long-form prefixes) — STOP.
- If `role_permissions` cascading rename leaves orphan rows (rows pointing to a permission_id that no longer exists) — STOP.
- If after the tenant deletes, the `permissions` table count exceeds 200 (expected: ~75–80, since 3 tenants × ~57 keys = 171 deleted, leaving ~110 for Prizma+Demo combined which then consolidate to ~75–80) — STOP. Cascade incomplete.
- If after consolidation, any `data-permission` reference in the codebase (production HTML/JS only, not test files) points to a key that doesn't exist in `permissions` — STOP. Cross-reference broken.
- If criterion #15 (manager bulk QA on Demo) fails — STOP. The primary fix didn't land. Run §6 rollback.

---

## 6. Rollback Plan

This SPEC mutates production data. Rollback artifacts MANDATORY:

1. **Pre-flight DB snapshot**: `BEFORE_STATE.json` captured before any write — must include:
   - Full row dumps (in JSON form) of `permissions`, `role_permissions`, `roles`, `employees`, `tenants` for the 5 tenants in scope.
   - Git commit hash (start).
2. **Code rollback**: `git -C C:/Users/User/opticup reset --hard {START_COMMIT}` reverts code changes.
3. **DB rollback**: re-INSERT from `BEFORE_STATE.json` via MCP `apply_migration`. The JSON must be in INSERT-statement-ready form. Document the rollback SQL in `BEFORE_STATE.json` so a future operator can paste-and-run.
4. **Cascade-delete reversibility**: Note that deleting 3 tenants is destructive — the cascade-deleted employees / roles / permissions / role_permissions can be restored only from `BEFORE_STATE.json`. Daniel confirmed (this conversation) the test-store data is unused; rollback is documented for safety, not because data needs preservation.
5. Notify Foreman; SPEC marked REOPEN.

---

## 7. Out of Scope (explicit)

- **`LEGACY_ROLE_MAP`** in `js/auth-service.js:21`. Daniel decided to keep it (Decision 5). Tech-debt only — log to `MASTER_ROADMAP.md`.
- **`is_super_admin` cross-tenant role**. Daniel wants it kept separate (Decision 3). Tech-debt entry: a future SPEC builds a "sub-super-admin" employee model with cross-tenant access at lower privilege.
- **Storefront repo.** Zero commits.
- **`v_storefront_*` views** — untouched.
- **RLS policies** — untouched.
- **`employees.role` text column** — kept for `LEGACY_ROLE_MAP` compatibility per Decision 5.
- **Module 1 / Module 3 phase progression**. This is a hotfix, not phase work.
- **Storefront-side permission/Studio handling** — out of scope. Studio reads `is_super_admin` separately.
- **Renaming `LEGACY_ROLE_MAP` keys** — same as above, kept.
- **Group A → Group B role consolidation BEYOND key renames** — the test-tenant deletes already eliminate Group B roles (`senior`, `employee`); after this SPEC only Group A roles (`ceo/manager/team_lead/worker/viewer`) survive across both surviving tenants. So no separate role-consolidation step is needed.

---

## 8. Expected Final State

### Pre-flight artifacts (mandatory, captured BEFORE first write)

`BEFORE_STATE.json` in SPEC folder, containing:
- Git start commit hash.
- Full row dump (as `INSERT INTO ... VALUES (...)` statements) for:
  - `tenants` rows for the 3 test-stores
  - `permissions` rows for all 5 tenants (currently 281 rows)
  - `role_permissions` rows for all 5 tenants
  - `roles` rows for all 5 tenants
  - `employees` rows for the 3 test-stores
  - `employee_roles` rows for the 3 test-stores
  - `auth_sessions` rows for the 3 test-stores
- Counts table: pre-rename count of long-form keys, pre-delete count of tenants, etc.

`AFTER_STATE.json` in SPEC folder, captured at the end:
- Counts table: same metrics post-execution.
- Expected vs actual table for each criterion in §3.

### Modified DB state

#### Step A — Delete the 3 test-store tenants (cascade)

```sql
-- Verify cascade scope first (read-only)
SELECT 'pre-delete-baseline', count(*) FROM employees
  WHERE tenant_id IN (
    'f185ed73-8337-454f-be21-12dde73aaf21',  -- test-store-verify
    '9d6c19e0-f1d7-47be-ba2f-8c4e1638e894',  -- test-store-v2
    'db710f25-fa10-4321-b280-4808679c727a'   -- test-store-qa
  );
-- Expected: 3

-- The actual cascade. Execute via apply_migration. CASCADE is mandatory because of FK chains.
DELETE FROM permissions WHERE tenant_id IN (...);  -- 171 rows
DELETE FROM role_permissions WHERE tenant_id IN (...); -- 462 rows
DELETE FROM roles WHERE tenant_id IN (...); -- 15 rows
DELETE FROM employee_roles WHERE tenant_id IN (...); -- 3 rows
DELETE FROM auth_sessions WHERE tenant_id IN (...); -- variable
DELETE FROM employees WHERE tenant_id IN (...); -- 3 rows
DELETE FROM tenants WHERE id IN (...); -- 3 rows
```

If `tenants` has FK constraints with `ON DELETE CASCADE` already configured, a single `DELETE FROM tenants WHERE id IN (...)` may suffice. The executor must verify the cascade behavior in pre-flight and choose the appropriate path. Document in `BEFORE_STATE.json`.

#### Step B — Rename long-form permission keys to short form (Prizma + Demo only)

For each of the surviving tenants, run the renames:

| Old key (Group A) | New key (canonical short) |
|---|---|
| `purchase_order.approve` | `purchasing.approve` |
| `purchase_order.create` | `purchasing.create` |
| `purchase_order.delete` | `purchasing.delete` |
| `purchase_order.edit` | `purchasing.edit` |
| `purchase_order.view` | `purchasing.view` |
| `goods_receipt.confirm` | `receipts.confirm` |
| `goods_receipt.create` | `receipts.create` |
| `goods_receipt.export` | `receipts.export` |
| `debt.documents.cancel` | `debt.cancel` |
| `debt.documents.create` | `debt.create` |
| `debt.documents.edit` | `debt.edit` |
| `debt.payments.cancel` | `debt.payment_cancel` |
| `debt.payments.create` | `debt.payment_create` |
| `debt.prepaid.manage` | `debt.prepaid` |

Two-table update per rename:

```sql
UPDATE permissions
   SET id = '{new}'
 WHERE id = '{old}'
   AND tenant_id IN ('{prizma_uuid}', '{demo_uuid}');

UPDATE role_permissions
   SET permission_id = '{new}'
 WHERE permission_id = '{old}'
   AND tenant_id IN ('{prizma_uuid}', '{demo_uuid}');
```

Wrap each rename pair in a transaction. Verify count after each pair matches BEFORE row count.

#### Step C — Adjust `employees.{create,edit,delete,assign_role}` aggregation

This is unchanged: Group A's 4 granular keys (`employees.create`, `employees.edit`, `employees.delete`, `employees.assign_role`) are kept (the Group B `employees.manage` was on the test-stores being deleted, so collapses naturally). No rename needed.

### Modified files

#### `js/shared.js`
- Remove `let isAdmin = false;` declaration on line 124.
- Remove any other code that sets or reads `isAdmin` as a global.

#### `modules/admin/admin.js`
- Line 5: Remove `isAdmin = hasPermission('settings.edit');`.
- Line 7: Remove `body.classList.add('admin-mode');` if present.
- Line 35: Keep `if (hasPermission('settings.edit')) activateAdmin();` — controls settings UI activation only, not inventory.

#### `modules/inventory/inventory-edit.js` (lines 57, 102, 198, 241)
- Replace each `if (!isAdmin) { toast('נדרשת הרשאת מנהל'); return; }` with `if (!hasPermission('inventory.edit')) { toast('נדרשת הרשאה לעריכת מלאי'); return; }`.
- For the line 241 inline-edit pattern (`if (!isAdmin || td.classList...)`), replace `!isAdmin` part only — keep the secondary class check.

#### `modules/inventory/inventory-actions.js` (line 13)
- Replace `var isAdm = document.body.classList.contains('admin-mode');` with `var isAdm = hasPermission('inventory.edit');`.

#### `modules/inventory/inventory-table.js` (lines 136, 183)
- Same body-class → hasPermission replacement.

#### `modules/debt/ai/ai-config.js` (line 13)
- Replace `return role === 'ceo' || role === 'manager';` with `return hasPermission('debt.ai_config');`.

#### `modules/permissions/employee-list.js`
- Lines 6-14: Remove hardcoded `ROLE_BADGES` + `ROLE_HIERARCHY` constants.
- Add module-init function that loads roles from `AT.ROLES` table on page load and builds the badge map dynamically. Cache in module scope.
- Add "select all" / "deny all" buttons to each row in the permission matrix (renderPermissionMatrix function around line 261-304). Button click toggles all checkboxes in that row, then calls a batch-upsert on `role_permissions` (single SQL request, not N).

#### Inventory HTML / data-permission attribute renames
- Search-and-replace `data-permission="purchase_order.{action}"` → `data-permission="purchasing.{action}"` in `inventory.html`.
- Search-and-replace `data-permission="goods_receipt.{action}"` → `data-permission="receipts.{action}"` in `inventory.html` (3 occurrences).

### Deleted files

- `shared/tests/permission-test.html` — Daniel's Decision 6.

### Modified docs

- `MASTER_ROADMAP.md` (or equivalent tech-debt section): add tech-debt entries for:
  - "Super-admin cross-tenant sub-role employees model — defer to dedicated SPEC"
  - "`LEGACY_ROLE_MAP` admin→ceo bridge — kept; remove when all employees are migrated to `employee_roles` table"
- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — append entry.
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` — append commits.

### New SPEC retrospective files (mandatory)

- `EXECUTION_REPORT.md`
- `FINDINGS.md`
- `BEFORE_STATE.json` (pre-flight)
- `AFTER_STATE.json` (post-execution)

---

## 9. Commit Plan

ERP repo (`opticup`, on `develop`):

| # | Commit | Touches |
|---|--------|---------|
| 1 | `chore(perms): pre-flight snapshot for permissions phase 2 fix` | `BEFORE_STATE.json` only |
| 2 | `fix(perms): delete 3 unused test-store tenants and their cascade` | (DB only — audit-trail commit with full SQL in commit body) |
| 3 | `refactor(perms): rename long-form keys to canonical short form` | (DB rename SQL in commit body) + inventory.html data-permission updates |
| 4 | `fix(inventory): decouple isAdmin global from settings.edit — use granular hasPermission` | `js/shared.js`, `modules/admin/admin.js`, `modules/inventory/inventory-edit.js`, `modules/inventory/inventory-actions.js`, `modules/inventory/inventory-table.js` |
| 5 | `fix(debt): replace direct role check in ai-config with hasPermission('debt.ai_config')` | `modules/debt/ai/ai-config.js` |
| 6 | `feat(perms-ui): load ROLE_BADGES from DB + add row select-all/deny-all buttons` | `modules/permissions/employee-list.js` |
| 7 | `chore(cleanup): delete shared/tests/permission-test.html (stale, references dead keys)` | deletion only |
| 8 | `docs(m1): close PERMISSIONS_PHASE2_FIX with retrospective + master-doc updates` | SESSION_CONTEXT, CHANGELOG, MASTER_ROADMAP, EXECUTION_REPORT, FINDINGS, AFTER_STATE.json |

Storefront repo: zero commits.

---

## 10. Dependencies / Preconditions

- ERP `develop` clean (sync gate).
- Supabase MCP authenticated.
- `PERMISSIONS_AUDIT_PHASE1_2026_04_27` SPEC closed (it is — verified `64dbb13`).
- localhost:3000 reachable for QA criterion #15. If not reachable, attempt to start ERP locally OR document and mark #15 as deferred.

---

## 11. Lessons Already Incorporated

Harvested from FOREMAN_REVIEWs of: PERMISSIONS_AUDIT_PHASE1, STUDIO_BRANDS_VISIBILITY_REWORK, STOREFRONT_SYNC_HIERARCHY_FIX.

- **FROM `STUDIO_BRANDS_VISIBILITY_REWORK/FOREMAN_REVIEW.md` Strategic Proposal A (Cross-Section Consistency Check)** → **APPLIED**: §3 explicitly states the consistency check; §4 envelope and §12 QA do not contradict.
- **FROM `STUDIO_BRANDS_VISIBILITY_REWORK/FOREMAN_REVIEW.md` Strategic Proposal B (Identifier verification)** → **APPLIED**: §3 lists every identifier I use + confirmation of grep verification.
- **FROM `STOREFRONT_SYNC_HIERARCHY_FIX/FOREMAN_REVIEW.md` Strategic Proposal A (Live-state baseline probe)** → **APPLIED**: §2 includes live counts probed before authoring (3 test-store tenants, row-count breakdown 462/171/15/3, 14 long-form keys to rename, etc.).
- **FROM `STOREFRONT_SYNC_HIERARCHY_FIX/FINDINGS.md` (verify-script existence check)** → **APPLIED**: §3 only references `npm run verify:integrity` confirmed to exist.
- **FROM `PERMISSIONS_AUDIT_PHASE1/EXECUTION_REPORT.md` Proposal 1 (identifier-existence pre-execution check)** → **APPLIED**: every codebase identifier verified at author time.
- **FROM `PERMISSIONS_AUDIT_PHASE1/EXECUTION_REPORT.md` Proposal 2 (cross-section consistency)** → **APPLIED**: §4/§5/§7/§12 reviewed against each other before dispatch.

### Cross-Reference Check

Cross-Reference Check completed 2026-04-27 against GLOBAL_SCHEMA + auth-service.js + DIAGNOSIS_REPORT.md:

- 0 new tables, 0 new columns, 0 new RPCs.
- New permission key ids being created: 0 (consolidation renames in place; no new keys).
- Old permission key ids being removed: 14 (long-form prefixes per §8 Step B).
- New code identifiers: function `loadRolesFromDB` (or similar) inside `modules/permissions/employee-list.js` — confirmed not present anywhere via grep.
- Files being deleted: `shared/tests/permission-test.html` only.
- Files being modified: 8 files listed in §8.

No collisions. Naming consolidation is rename-in-place; no shadowing risk.

---

## 12. QA Acceptance — End-to-End

Run after all 8 commits land. Attach output verbatim to `EXECUTION_REPORT.md` §QA.

### Step 1 — DB structural QA (read-only)

```sql
-- Tenants count
SELECT count(*) FROM tenants;
-- Expected: 2 (Prizma + Demo, plus possibly system tenants — document what you find)

-- Permission keys per surviving tenant
SELECT t.slug, count(*) AS perms
  FROM permissions p JOIN tenants t ON p.tenant_id = t.id
 GROUP BY t.slug ORDER BY t.slug;
-- Expected: prizma=N, demo=N (where N is the consolidated key count, ~50-55)

-- Long-form keys gone
SELECT count(*) FROM permissions
 WHERE id LIKE 'purchase_order.%' OR id LIKE 'goods_receipt.%'
    OR id LIKE 'debt.documents.%' OR id LIKE 'debt.payments.%';
-- Expected: 0

-- Short-form keys present
SELECT count(*) FROM permissions
 WHERE id LIKE 'purchasing.%' OR id LIKE 'receipts.%' OR id LIKE 'debt.%';
-- Expected: ≥10 per surviving tenant

-- Role-permissions reference integrity
SELECT count(*) FROM role_permissions rp
 LEFT JOIN permissions p
   ON p.id = rp.permission_id AND p.tenant_id = rp.tenant_id
 WHERE p.id IS NULL;
-- Expected: 0 (no orphan role-permissions)
```

### Step 2 — Code-side QA

```bash
# isAdmin global gone
grep -c "^let isAdmin\|^var isAdmin" js/shared.js
# Expected: 0

# isAdmin guards replaced in inventory
grep -c "if (!isAdmin)" modules/inventory/*.js
# Expected: 0

# admin-mode body class gone
grep -c "admin-mode" modules/admin/admin.js
# Expected: 0

# AI debt fixed
grep -c "role === 'ceo'" modules/debt/ai/ai-config.js
# Expected: 0

# Test page gone
ls shared/tests/permission-test.html 2>&1
# Expected: "No such file"

# Old data-permission attrs gone
grep -rE "data-permission=.purchase_order\.|data-permission=.goods_receipt\." inventory.html | wc -l
# Expected: 0

# New data-permission attrs present
grep -cE "data-permission=.purchasing\.|data-permission=.receipts\." inventory.html
# Expected: ≥6
```

### Step 3 — Localhost QA (Chrome MCP rendered DOM)

Sign into `localhost:3000/employees.html?t=demo` as Daniel:
- Open the permissions matrix for "manager" role.
- Confirm "select all" and "deny all" buttons appear on each row.
- Click "select all" on a few rows; confirm all checkboxes in that row check; confirm Toast "הרשאות עודכנו".
- Reload page, confirm changes persisted.

### Step 4 — Localhost QA (the primary fix — manager bulk inventory)

Create a test employee on Demo tenant: name="QA Manager", role='manager' (via existing UI), grant all `inventory.*` perms but NOT `settings.edit`.

Sign in as that QA Manager:
- Navigate to `inventory.html?t=demo`.
- Verify: bulk-edit row controls visible (the SPEC's primary deliverable).
- Try a bulk price update on 2 test inventory rows — confirm it works.
- Verify: settings page is NOT accessible (manager doesn't have settings.edit) — confirms fine-grained gating.

Delete the QA Manager test employee at end.

### Step 5 — Storefront repo untouched

```bash
cd C:/Users/User/opticup-storefront
git status
# Expected: "On branch main" + "nothing to commit, working tree clean"
git log --oneline origin/main..HEAD
# Expected: empty (no new commits)
```

---

## 13. Notes for the Executor

- This SPEC mutates production data (Prizma+Demo permissions get renamed; 3 test-store tenants get deleted). Take the pre-flight `BEFORE_STATE.json` SERIOUSLY — if anything goes wrong, that file is the only path home.
- The 4 long-form prefixes to rename are: `purchase_order.*`, `goods_receipt.*`, `debt.documents.*`, `debt.payments.*`. Every other key stays as-is.
- The cascade-delete order in §8 Step A may need adjustment based on actual FK constraints. Probe in pre-flight.
- For criterion #14 (all/none buttons), the implementation should use a single batch UPSERT for all permission_ids in a row, not N individual UPSERTs. Network-cost matters when the matrix has 50+ rows.
- For criterion #15 (manager bulk inventory QA), creating and deleting a test employee on Demo is part of the SPEC — document in EXECUTION_REPORT what you created and confirm cleanup at end.
- Iron Rule 7 (DB via helpers): use `sb.from(AT.ROLES).select(...)` and `sb.from(AT.PERMISSIONS).update(...)` — never raw `sb.from('permissions')`.
- Iron Rule 22 (defense-in-depth): every write SQL must include explicit `tenant_id` filter even though RLS enforces it.
