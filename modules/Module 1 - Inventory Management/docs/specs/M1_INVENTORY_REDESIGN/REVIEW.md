# REVIEW — M1_INVENTORY_REDESIGN

> **Reviewer:** opticup-reviewer (Stage 3, Full-Auto Pipeline)
> **Date:** 2026-05-16 morning
> **Pipeline range:** `ea2dcd3..0ac0bba` (7 commits total: 6 executor + 1 close)
> **Stage 2 closure:** `0ac0bba chore(spec): close M1_INVENTORY_REDESIGN executor scope — retrospective`

---

## 1. Verdict

🟢 **PASS** — Pipeline is high-quality. Iron Rule compliance verified across all 15 in-scope rules. Tenant isolation intact. View privilege model honors SPEC §2.4 intent (anon = 0 privileges). 0 new CRITICAL / HIGH findings. 1 new LOW finding (R-FINDING-1, refinement of executor's P-EXEC-1 proposal).

Stage 2 self-assessment (9.25/10) **CONCURRED**. The 2 Executor-flagged deviations (D-1 row-count author defect, D-2 missing REVOKE FROM anon) were correctly handled in-flight per INTENT-vs-LITERAL autonomy (M1_LENS_PHASE_2_COMPLETION P-EXEC-2 pattern — 2nd consecutive firing, justifies skill-level codification).

---

## 2. Reviewer Independent Spot-Checks (5 fresh angles vs Executor's)

| # | Probe | Angle (different than Executor's verification) | Result | Verdict |
|---|---|---|---|---|
| R-1 | Iron Rule 21 global name collision across whole repo for the 8 new helper/global names (`loadUnifiedLog`, `ulPage`, `_loadSupplierCategoryData`, `_supplierBadgesHtml`, `_supplierMatchesFilter`, `_renderSupplierFilterBar`, `_setSupplierFilter`, `InvShell`) | `grep -rn "^(function \|window\.)\s*(loadUnifiedLog\|ulPage\|_loadSupplier...)" --glob="**/*.js"` — looks for **definition sites only**, not call sites; covers entire repo not just owning file | All 8 names defined exactly once (in their owning files). 0 collisions. | ✅ |
| R-2 | Iron Rule 22 defense-in-depth — count `.eq('tenant_id', ...)` calls in both new JS files | `grep -c` on each file | suppliers.js = 3 (loadSupplierCategoryData = 2 + addSupplier = 1); unified-log.js = 3 (distincts fetch + main query + via getTenantId indirection — both reach JWT). All SELECT and INSERT paths covered. | ✅ |
| R-3 | Iron Rule 8 — XSS check via `escapeHtml()` usage count in unified-log.js renderer | `grep -c "escapeHtml("` on unified-log.js | 9 calls. Every user-supplied / DB-supplied value in the `tbody.innerHTML = rows.map(...)` renderer + the distinct-dropdowns + the error message — all wrapped. 0 raw interpolations. | ✅ |
| R-4 | View ACL audit using a DIFFERENT lens than Executor's `information_schema.role_table_grants` — query `pg_class.relacl` directly with role-specific filtering | `SELECT array_agg(a) FILTER (WHERE a::text LIKE 'anon=%')` on `relacl` | `anon_acl = null` (zero entries in the ACL array for anon). `auth_acl = {authenticated=arwdDxtm/postgres}`. view_options = `[security_invoker=on]`. | ✅ (with R-FINDING-1 noted below) |
| R-5 | RLS pattern audit on the 4 source tables — verify canonical JWT-claim pattern per Iron Rule 15, not `auth.uid()` or always-true | `pg_policies` query classifying each policy's `qual` string | All 4 source tables have `tenant_isolation` policy with `canonical-JWT-claim` pattern on role `public`. 3 of 4 (inventory_logs, stock_movement, sync_log) also have a `service_bypass` policy on role `service_role` — that's the canonical 2-policy pair. `activity_log` lacks the `service_bypass` but has the `tenant_isolation` — this matches the project's pre-existing state (P9 in SPEC §0.A) and isn't this Pipeline's defect to fix. | ✅ |
| R-6 | Prizma untouched verification across 5 in-scope tables | `count(*) WHERE tenant_id='6ad0781b...'` for inventory_logs, stock_movement, activity_log, sync_log, suppliers | inventory_logs=4335, stock_movement=0, activity_log=936, sync_log=922, suppliers=38. Matches SPEC §0.A P2 baseline EXACTLY. **0 row delta on Prizma.** | ✅ (SPEC §3 F4 PASS) |
| R-7 | File-size + content integrity on the 4 new/heavily-modified files | `wc -l` + integrity gate exit code | inventory-shell.css=224, inventory-shell.js=200, unified-log.js=214, suppliers.js=266. All under Iron Rule 12 cap. Integrity gate exit 0 on full repo (`npm run verify:integrity`). | ✅ |

7/7 spot-checks PASS. Executor's claims are trustworthy.

---

## 3. Iron Rule Compliance — full audit against §3 SPEC

### Database / SQL (1 new view)

| Rule | Status | Evidence |
|---|---|---|
| 14 (tenant_id on every table) | N/A | No new tables. View inherits tenant_id from sources. |
| 15 (canonical RLS) | ✅ inherited | View uses `security_invoker=on`; source tables have canonical-JWT-claim `tenant_isolation` policies (R-5 verified). |
| 18 (UNIQUE includes tenant_id) | N/A | No new UNIQUE constraints. |
| 11 (sequential numbers via atomic RPC) | N/A | No sequential numbers added. |
| 13 (views for external reads) | N/A | This view is staff-only (authenticated GRANT, anon REVOKED) — not an external-read view per Rule 13. Correctly differentiated. |

### JavaScript files (4 new/modified)

| Rule | Status | Evidence |
|---|---|---|
| 1 (atomic qty changes) | N/A | This SPEC doesn't touch quantity logic. |
| 2 (writeLog) | N/A | No qty/price changes. |
| 3 (soft delete) | N/A | No DELETE operations. |
| 5 (FIELD_MAP) | N/A | No new DB fields. |
| 7 (DB via helpers) | ⚠️ Acceptable | New code uses `sb.from(...)` directly — consistent with the surrounding `suppliers.js` + the project's view-query pattern. Migrating to DB wrapper is out of scope per SPEC §6 (one concern per task). Pre-existing pattern, not a new violation. |
| 8 (no innerHTML with user input) | ✅ | unified-log.js: 9 escapeHtml() calls cover all DB-supplied row data + distinct dropdowns + error message. suppliers.js: badges use static HTML only; supplier names already escapeHtml-wrapped pre-existing. |
| 9 (no hardcoded business values) | ✅ | No tenant-specific values introduced. View body uses tenant_id parameter; JS reads getTenantId(). |
| 10 (global name collision) | ✅ | R-1 spot-check: 8 new globals each defined exactly once. |
| 12 (file size ≤350) | ✅ | inventory-shell.css=224, inventory-shell.js=200, unified-log.js=214, suppliers.js 171→266. All within cap. |
| 21 (no orphans, no duplicates) | ✅ | suppliers.js was EXTENDED in place (not duplicated). lens-nav-strip.js KEPT (DG-2 Branch B) not retired. Tab-systemlog block + system-log.js orphans documented in FINDINGS F-4 with deferral path. |
| 22 (defense-in-depth) | ✅ | R-2 spot-check: every new SELECT has `.eq('tenant_id', getTenantId())`. |
| 23 (no secrets) | ✅ | grep for hardcoded keys/PINs/tokens in the 4 new/modified JS files: 0 hits. |

### HTML

| Rule | Status | Evidence |
|---|---|---|
| 6 (index.html in root) | ✅ | Not moved. Only line 149 deleted. |
| 8 (no innerHTML with user input) | ✅ | All new markup in inventory.html is static; new JS handles dynamic content with escapeHtml. |

### Cross-cutting

| Rule | Status | Evidence |
|---|---|---|
| 4 (barcode format) | N/A | Not touched. |
| 19 (configurable values = tables) | N/A | No new enums introduced. |
| 20 (SaaS litmus) | ✅ | New view + UI work for any tenant by reading current `tenant_id`. Supplier badge derivation uses junction tables that are tenant-scoped. SaaS-ready. |
| 31 (integrity gate) | ✅ | exit 0 verified at each commit + post-Pipeline `npm run verify:integrity`. |
| 32 (destructive ops declared) | ✅ | Hook accepted every commit after the C1 trivial heading fix. |

---

## 4. Level 2 — Security & SaaS Integrity

### RLS audit (R-5 spot-check)

- All 4 source tables: `tenant_isolation` policy uses canonical JWT-claim pattern (`current_setting('request.jwt.claims','...'::json ->> 'tenant_id')::uuid`).
- 3 of 4 have the canonical service_bypass policy paired; `activity_log` lacks the pair but has the JWT-claim policy — matches pre-existing state (not this Pipeline's defect; tracked in existing M1 backlog per FINDINGS F-4 from M1_LENS_PHASE_1B_PROCUREMENT carry).
- View uses `security_invoker=on` → caller's role + JWT claims determine row access. Correctly inherits source-table RLS.

### Tenant isolation under the view

The view is callable by any role that has SELECT privilege. With `security_invoker=on`:
- `service_role` → bypasses RLS (sees all tenants — expected for admin tooling)
- `authenticated` → must carry JWT with `tenant_id` claim; sees only their tenant's rows
- `anon` → REVOKED (R-4 confirmed `anon_acl = null`); cannot SELECT at all

No cross-tenant leak path. The Pipeline's executor caught the missing REVOKE FROM anon at D4 verification and ran the supplementary migration. ✅

### Authentication

- PIN verification not touched (Rule 8).
- No new auth flows.
- The new sidebar JS reads `TENANT_SLUG` from the global namespace (set by `shared.js`) — no new auth state introduced.

### Edge Function impact

- No Edge Functions added or modified.

---

## 5. Level 3 — Code Quality & Improvements

### Architecture

- **Separation of concerns:** ✅ Three new JS files each have one responsibility (sidebar shell state machine; supplier category enrichment; unified log UI). No bloating of existing files.
- **Module boundaries:** ✅ inventory-shell.js calls existing functions (`showTab`, `loadSuppliersTab`, `renderAccessSyncTab`, `loadUnifiedLog`) via window-globals — no reaching into another module's internals.
- **Contracts:** ✅ The view is the contract between staff UI and the 4 log sources. UI never touches the source tables directly.

### Patterns

- **Sidebar pattern (NEW for this project):** This is a fresh pattern. `inventory-shell.js` codifies it cleanly with a CATEGORIES map. Future modules adopting a sidebar can mirror this shape. Worth a `docs/CONVENTIONS.md` entry at next Integration Ceremony.
- **Junction-table category derivation pattern (NEW):** suppliers.js Brand→supplier link via `supplier_brand_distribution` + lens link via `supplier_catalog_offering` is the project's canonical "supplier supports category X" derivation. Worth documenting alongside the existing cascading-dropdown pattern.
- **Cross-source UNION view pattern (NEW):** `v_inventory_unified_log` is the project's first 4-source UNION view backing a UI. The COALESCE-for-NULL-safety + filter-aware-WHERE pattern is sound. Future modules unifying logs can reference it.

### Performance

- **EXPLAIN ANALYZE re-run (D9):** 5.21 ms on Prizma's 5257-row UNION. Materialization not needed (DG-1 Branch A confirmed). ✅
- **N+1 risk:** suppliers.js `_loadSupplierCategoryData` uses `Promise.all` for the 2 junction queries — single round-trip per tab load. ✅
- **Client-side filtering:** Free-text search in unified-log.js filters the loaded page only (server-side ILIKE deferred per SPEC §6 #16). Acceptable trade-off for v1.
- **Pagination:** unified-log.js uses `range(offset, offset + PAGE_SIZE - 1)` server-side. Prev/next buttons gated by `page === 0` + `rows.length < PAGE_SIZE`. ✅

### Error handling

- unified-log.js: try/catch wraps the main load query, renders the error in tbody with escapeHtml-wrapped message. ✅
- suppliers.js: `_loadSupplierCategoryData` failures degrade gracefully (badges hide, table still renders). ✅
- Both files use `console.warn` / `console.error` for diagnostics — appropriate for non-fatal degradation.

### Maintainability

- New JS files have header comments referencing the SPEC section + date.
- Function names are clear and underscore-prefixed for helpers (project convention).
- No magic numbers (PAGE_SIZE=50 is the only constant, named).

---

## 6. New findings

### R-FINDING-1 — `authenticated` has ALL privileges on `v_inventory_unified_log`, not just SELECT (LOW)

**Where:** Live DB — `pg_class.relacl` for `public.v_inventory_unified_log` shows `{authenticated=arwdDxtm/postgres}`.

**Description:** SPEC §2.4 view body explicitly says `GRANT SELECT ON public.v_inventory_unified_log TO authenticated;` (only SELECT). The actual ACL after the CREATE VIEW migration grants `arwdDxtm` (INSERT + SELECT + UPDATE + DELETE + TRUNCATE + REFERENCES + TRIGGER + MAINTAIN) to authenticated. This is Postgres's default-inherit behavior for new public-schema views — same root cause as the executor-caught D-2 (missing REVOKE FROM anon).

**Actual risk:** **Minimal.** The view is a UNION ALL — Postgres makes UNION ALL views non-updatable at the engine level, so INSERT/UPDATE/DELETE/TRUNCATE against the view fail with a `cannot insert into view` error regardless of GRANT. REFERENCES + TRIGGER + MAINTAIN are not exposed at runtime to authenticated callers. So the effective access is "SELECT works, everything else fails at engine level."

**Why log it anyway:** Defense-in-depth tidiness. The SPEC's intent was "GRANT SELECT only." Honoring it requires a tiny supplementary REVOKE. The executor's proposal P-EXEC-1 (auto-REVOKE on staff-only views) already targets the anon case — broadening it to "also REVOKE write-class from authenticated" generalizes the pattern.

**Severity:** LOW. The view is functionally staff-read-only. No exploit path identified.

**Suggested disposition:** Foreman at Stage 5 to (a) broaden P-EXEC-1 in the harvest, OR (b) defer to next M1 maintenance SPEC alongside the F-4 tab-systemlog cleanup. No blocking action for THIS Pipeline.

---

## 7. SPEC §3 Success Criteria — Reviewer audit (post-execution)

| Group | Criteria | Status | Notes |
|---|---|---|---|
| Part A (sidebar) | A1-A8 | ✅ PASS (executor) | A9-A10 deferred to Stage 4 — Reviewer cannot exercise UI. |
| Part B (home-card) | B1-B2 | ✅ PASS (verified independently — index.html=389 lines, 0× `id: 'lenses'`) | B3 Stage 4. |
| Part C (suppliers) | C1-C3 | ✅ PASS at executor scope | C2+C4 (UI-visible badges + pill counts) Stage 4. |
| Part D (unified log) | D1, D4, D5, D6, D7, D9 | ✅ PASS | D2/D3 (row counts): executor's actual values (5257/583) are CORRECT — concur. The SPEC's expected (6193/1238) was author-defect on filter-aware math (Findings F-1). D8 (filter end-to-end) Stage 4. |
| Part E (lens-nav-strip) | E1 | ✅ PASS | |
| Part F (cross-cutting) | F1-F4 | ✅ PASS | F1 (integrity gate exit 0 all commits) verified. F2 (destructive-ops accepted) verified. F3 (develop only, no main, no force, no wildcards) verified via `git log`. F4 (Prizma untouched) R-6 spot-check confirmed 0 row delta on 5 tables. F5+F6+F7+F8 Stage 4-5. |

**Reviewer scope criteria-passing rate:** 22 PASS / 0 FAIL / 8 deferred to Stage 4 / 2 corrected (D2/D3 actual-vs-expected reconciliation). **No criterion failed at Reviewer scope.**

---

## 8. Recommendations

### Priority fixes (must do before merge)
**None.** Pipeline is mergeable as-is at Reviewer scope. The 2 LOW + 2 INFO findings (executor's F-1..F-4 + this Reviewer's R-FINDING-1) are non-blocking.

### Nice-to-have improvements (defer to next M1 maintenance SPEC)
1. **Apply R-FINDING-1 supplementary REVOKE** — broaden the executor's P-EXEC-1 proposal to cover authenticated write-class privileges too. ~1 min migration.
2. **Bundle FINDINGS F-4 cleanup** — remove orphan `<section id="tab-systemlog">` block + the `<script src="modules/admin/system-log.js">` line + the JS file itself. ~5 min.
3. **Architect-pending entries sweep (FINDINGS F-3)** — flagged to next Architect session. 10-15 min.

---

## 9. Carry forward to Foreman (Stage 5)

- **R-FINDING-1** as proposed broadening of P-EXEC-1.
- Executor's 4 findings (F-1..F-4) and 4 improvement proposals (2 author + 2 executor) — all to be processed in FOREMAN_REVIEW §5 + §6 + §7.
- 2 NEW patterns worth documenting in `docs/CONVENTIONS.md` at next Integration Ceremony: sidebar shell + junction-table category derivation + cross-source UNION view.

---

*End of REVIEW.md. Verdict 🟢 PASS. Pipeline ready for Stage 4 Localhost-Tester dispatch.*
