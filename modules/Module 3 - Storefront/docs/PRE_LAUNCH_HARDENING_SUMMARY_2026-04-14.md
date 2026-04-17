# Pre-Launch Hardening — Execution Summary

**SPEC:** MODULE_3_PRE_LAUNCH_HARDENING_SPEC_2026-04-14.md  
**Executor:** Secondary Chat (Cowork session)  
**Started:** 2026-04-14 (morning, context from prior session)  
**Ended:** 2026-04-14  
**Final status:** COMPLETE — §3 and §4 fully done; §5 PASS; §6 QA BLOCKED: ENVIRONMENT (see §6 below)

---

## 1. Commits

| # | Hash | Message | Key Files |
|---|---|---|---|
| 1 | `66acfc7` | fix(rls): tenant-scope storefront_components/pages/reviews to JWT claim pattern | migrations/063_storefront_rls_tenant_isolation.sql |
| 2 | `e04cbfe` | fix(inventory): remove hardcoded Prizma name from file-header comment (M3-SAAS-01) | inventory.html |
| 3 | `461a3c0` | fix(sync-watcher): require OPTICUP_TENANT_ID env var, remove silent Prizma default (M3-SAAS-04 part A) | scripts/sync-watcher.js |
| 4 | `97146ce` | fix(sync-watcher): replace hardcoded Prizma UUID gate with tenants.access_sync_enabled flag (M3-SAAS-04 part B) | scripts/sync-watcher.js, migrations/064_add_tenant_access_sync_enabled_flag.sql |
| 5 | `43479ca` | fix(studio-shortcodes): read social links from tenant config, remove Prizma hardcoding (M3-SAAS-05) | modules/storefront/studio-shortcodes.js |
| 6 | `d33a8a1` | fix(studio-brands): dynamic tenant slug in brand preview URL (M1-R09-01) | modules/storefront/studio-brands.js |
| 7 | `d2fe4d3` | docs(guardian): mark M6-RLS-01/02/03 + M3-SAAS-01/04/05 + M1-R09-01 resolved | docs/guardian/GUARDIAN_ALERTS.md |
| 8 | *(pending)* | docs(guardian+safety+qa): §5 safety check, stale alert cleanup, QA report | PRIZMA_SAFETY_CHECK, QA_REPORT, GUARDIAN_ALERTS |

---

## 2. Fixes Applied

### M6-RLS-01, M6-RLS-02, M6-RLS-03

- **Migration SQL:** `migrations/063_storefront_rls_tenant_isolation.sql`
- **Action:** Dropped all existing `*_authenticated_*` policies on `storefront_components`, `storefront_pages`, `storefront_reviews`. Added `*_service_all` (service_role, ALL, `true`) and `*_tenant_isolation` (public, ALL, canonical JWT USING clause) on each table.
- **USING clause:** `tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid`
- **pg_policies verification:** Each table shows exactly 3 policies post-fix: `service_all`, `anon_read`, `tenant_isolation`. ZERO authenticated policies. ✅
- **Cross-tenant smoke:** COUNT=0 for all three tables with nonexistent tenant UUID under `authenticated` role. ✅

### M3-SAAS-01

- **Action taken:** FIXED
- **File:** `inventory.html` line 2
- **Change:** HTML file-header comment `Optic Up — Prizma Optics Inventory System` → `Optic Up — Inventory Module`
- **Evidence:** `grep -nE "אופטיקה פריזמה|Prizma|prizma" inventory.html` → 0 hits after fix. `<title>` at line 11 was already generic (no change needed there).
- **Commit:** `e04cbfe`

### M3-SAAS-04 Part A

- **File:** `scripts/sync-watcher.js`
- **Change:** Removed `|| '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` fallback from TENANT_ID assignment. Added hard exit:
  ```js
  const TENANT_ID = process.env.OPTICUP_TENANT_ID;
  if (!TENANT_ID) { console.error('... OPTICUP_TENANT_ID env var is required'); process.exit(1); }
  ```
- **Verification:** `grep -n "6ad0781b"` → 0 hits in sync-watcher.js. `node --check` → exit 0.
- **Commit:** `461a3c0`

### M3-SAAS-04 Part B

- **Migration SQL applied:** `migrations/064_add_tenant_access_sync_enabled_flag.sql`
- **Column shape verified:** `tenants.access_sync_enabled boolean NOT NULL DEFAULT false` — confirmed via `information_schema`.
- **Prizma-only flag check:** `prizma=true`, all other tenants (demo, test-store-verify, test-store-v2, test-store-qa) = `false`. ✅
- **Code refactor:** Wrapped watcher startup code in `async function main()`. Added DB gate: `SELECT slug, access_sync_enabled FROM tenants WHERE id = TENANT_ID`. Exits 0 if `access_sync_enabled !== true`.
- **UUID grep:** `grep -n "6ad0781b"` → 0 hits in sync-watcher.js. ✅
- **Node parse check:** `node --check scripts/sync-watcher.js` → exit 0. ✅
- **Demo smoke test output:** `[sync-watcher] access_sync_enabled=false for tenant demo — Access sync disabled. Exiting.` (process.exit(0)) ✅
- **Line count delta:** 489 → 516 (+27). SPEC estimated +5–10. Deviation noted (M5-DEBT-05 informational).
- **Commit:** `97146ce`

### M3-SAAS-05

- **File:** `modules/storefront/studio-shortcodes.js`
- **storefront_config keys used:** `whatsapp_number` (direct column), `footer_config` (JSONB → `.social[]` → find type=instagram → `.url`)
- **Change:** Converted `const BUILTIN_STICKY_PRESETS = [...]` (hardcoded) to `function buildBuiltinStickyPresets(waNumber, igUrl)` that interpolates live config. Updated `loadShortcodePresets()` to fetch `storefront_config` alongside `v_admin_component_presets` using `Promise.all()`.
- **Verification:** `grep -n "optic_prizma\|prizma-optic\|6ad0781b" studio-shortcodes.js` → 0 hits for the sticky presets section. Remaining `optic_prizma` at lines 68-69 = BUILTIN_CTA_PRESETS, out of scope (M3-SAAS-05b). ✅
- **Commit:** `43479ca`

### M1-R09-01

- **File:** `modules/storefront/studio-brands.js` line 425
- **Change:** `/?t=prizma` → `/?t=${encodeURIComponent(TENANT_SLUG || '')}`
- **Helper used:** `TENANT_SLUG` global variable from `shared.js:49` (set from URL `?t=` param / sessionStorage `tenant_slug`). Note: `getTenantConfig('slug')` was NOT available — `slug` is not in the tenant_config sessionStorage object.
- **Verification:** `grep -nE "[?&]t=prizma"` → 0 hits. `node --check` → exit 0. ✅
- **Commit:** `d33a8a1`

---

## 3. §5 Prizma Safety Check

- **Report path:** `modules/Module 3 - Storefront/docs/PRIZMA_SAFETY_CHECK_2026-04-14.md`
- **Verdict:** ✅ PASS
- **§5.1:** All 7 tenant-scoped tables return COUNT=0 with fake tenant UUID. 2 global tables (block_templates=46, templates=12) return non-zero — by design (no tenant_id column, platform-level read-only libraries). ✅
- **§5.2:** All Prizma grep hits classified: (a) backup files, (b) authorized Prizma-only UI gate (access-sync), (c) migration scripts (M3-SAAS-09), (d) known deferred tech debt (M3-SAAS-05b, M3-SAAS-11). Two new informational items added to GUARDIAN_ALERTS: M3-SAAS-12 (blog preview domain) and M1-SAAS-01 (Module 1 inventory.html branding). ✅
- **§5.3:** All storefront tables have RLS enabled. ✅
- **§5.4:** UNIQUE constraints on suppliers and purchase_orders confirmed ALREADY tenant-scoped. Alerts M1-R18-01 and M1-R18-02 were STALE — removed from HIGH, moved to Resolved. ✅
- **§5.5:** All 10 v_storefront_* views include tenant_id in SELECT/JOIN. ✅

---

## 4. QA

- **Report path:** `modules/Module 3 - Storefront/docs/QA_REPORT_2026-04-14.md`
- **Result:** 0/18 PASS, 0/18 FAIL, 18/18 BLOCKED: ENVIRONMENT
- **Root cause:** All 18 tests from MODULE_3_ROADMAP.md require browser access to a deployed storefront with develop-branch code. The Cowork cloud session has no access to localhost dev servers (localhost:3000 / localhost:4321). Develop branch is not deployed to production.
- **Clarification:** BLOCKED ≠ FAIL. No code defects were identified. 0 tests failed — they could not be started.
- **Escalation:** Strategic should schedule QA on the local dev machine or staging environment. Recommended timing: after develop → main merge and storefront deployment.

---

## 5. Deviations from SPEC

- **§1 Pre-flight — git pull:** FUSE mount had stale `.git/ORIG_HEAD.lock` (EPERM on unlink). Cannot pull via mounted path. Workaround: all git operations performed in a fresh clone at `/sessions/elegant-tender-dijkstra/opticup-work/` pushed via GitHub PAT. Strategic authorized this pattern.
- **§1 Pre-flight — dirty repo:** Working tree had uncommitted changes from prior work. Option (b) selected per Strategic directive: selective `git add` by filename throughout session.
- **§3.2.2 Part B — line count:** sync-watcher.js grew from 489 → 516 (+27 lines). SPEC estimated +5–10. Delta larger due to full async `main()` wrapper with error handling. No functional deviation — all logic is correct. Noted as M5-DEBT-05 informational.
- **§5.1 smoke test — initial run:** First smoke test run omitted `SET LOCAL role = 'authenticated'`. Service_role bypasses RLS, causing non-zero counts. Self-corrected; re-ran with correct role. ✅
- **§5.1 — storefront_config schema:** SPEC referenced generic key/value pairs, but actual table has named columns (`whatsapp_number`, `footer_config` JSONB). Discovered via `information_schema` query. Used actual column names throughout. No functional deviation.
- **§3.2.4 — getTenantConfig('slug') unavailable:** SPEC suggested `getTenantConfig('slug')` for M1-R09-01. `slug` is not populated in `tenant_config` sessionStorage. Used equivalent `TENANT_SLUG` global (shared.js:49) per Strategic directive.
- **§5.4 — M1-R18-01/02:** Alerts were STALE. UNIQUE constraints already tenant-scoped in DB prior to this SPEC. Removed from HIGH, moved to Resolved in GUARDIAN_ALERTS.md.
- **§6 QA:** 18/18 BLOCKED: ENVIRONMENT (not 18/18 PASS as stated in success criteria). Environmental constraint, not code failure. Escalated.

---

## 6. Escalations

| # | Section | Type | Status |
|---|---|---|---|
| 1 | §6 QA | PROCESS / ENVIRONMENT — full QA suite blocked by Cowork session lacking localhost/browser access | Open — Strategic to schedule QA on local dev machine after merge-to-main |

**No CRITICAL code escalations were raised.**

---

## 7. Retrospective — for defining the "SPEC Executor" skill

**1. Token-efficiency observations:**  
The FUSE mount git blockage consumed significant tokens diagnosing the issue (EPERM, lock file, multiple workaround attempts). A pre-flight that tests git write capability before starting would have identified this in 2 tool calls instead of ~15. Also: re-reading the same files multiple times across context boundaries — a compact "evidence cache" at session start would help.

**2. Places where I almost violated a rule:**  
§5.1 smoke test: ran the query without `SET LOCAL role = 'authenticated'` first. Got non-zero counts on all tables (service_role bypasses RLS), almost concluded RLS was broken on all tables. Self-corrected, but the SPEC's verification SQL should include the role switch explicitly.

**3. Places where the SPEC was ambiguous:**  
- §3.2.2 Part B step 3: "Wrap the watcher startup block" — unclear exactly where the block started/ended without referencing exact line numbers. Required reading the file carefully to identify the correct boundary.  
- §5.1: storefront_config referenced with "key/value" language suggesting a `SELECT key, value` structure, but the table has named columns. A schema check should precede config queries.  
- §6 QA: the 18 ROADMAP tests assume a deployed browser environment. The SPEC doesn't mention environment prerequisites for QA, yet nearly all tests are browser-only.

**4. Things I did that weren't covered by the SPEC but felt right:**  
- Discovered `storefront_block_templates` and `storefront_templates` returning non-zero smoke counts → investigated schema to confirm global tables (correct). Autonomous call: investigated and documented rather than escalating. Correct — reading the schema is a read-only verification, not a STOP trigger.  
- Discovered M1-R18-01/02 stale → removed from HIGH. Autonomous: verified via DB query, then updated GUARDIAN_ALERTS. Correct — verified before acting, no code changes, documentation-only.  
- Found `modules/Module 1 - Inventory Management/inventory.html` with hardcoded Prizma branding (outside M3 scope) → noted as M1-SAAS-01 informational, did NOT fix. Correct per Rule: "note unrelated issues in final report, do not fix."

**5. Tooling gaps:**  
- A `scripts/check-hardcoded-tenant.sh` script that runs all §5.2 sweep patterns, excludes known-OK paths, and outputs only unclassified hits would save ~30 minutes per SPEC.  
- A `scripts/smoke-test-rls.sql` that runs the full cross-tenant isolation check in one query with proper role setup would eliminate the role-switch error risk.

**6. Checklist items missing from pre-flight:**  
- Test git write capability before starting (create a temp file, stage it, then delete) — catches FUSE/lock issues in step 1 instead of mid-execution.  
- Verify `storefront_config` table schema before assuming structure in SQL queries.  
- Confirm deployed URL for QA environment if §6 tests are included.

**7. Evidence-format friction:**  
The per-fix "verification" commands were the right granularity for RLS and code changes. The §5.1 smoke SQL was slightly under-specified (missing role switch). The §6 QA test list would benefit from a separate "environment prerequisites" section before listing the 18 tests.

**8. One change that would most improve future SPEC executions:**  
Include a **mandatory environment pre-flight block** (§0 or within §1) that verifies: (a) git write capability (not just read), (b) all external service connections, (c) any deployed URLs needed for QA, (d) any env vars or credentials required. This catches structural blockers before they interrupt mid-execution flow.

---

## 8. NOT done in this SPEC (flagged for Strategic)

- `BUILTIN_CTA_PRESETS` lines 68-69 in studio-shortcodes.js still hardcode `optic_prizma` (M3-SAAS-05b) — deferred to next work package
- `studio-editor.js:326` fallback `TENANT_SLUG || 'prizma'` (M3-SAAS-10) — not in SPEC scope
- `storefront-translations.js:571`, `brand-translations.js:400`, `studio-brands.js:269` — fallback "אופטיקה פריזמה" literals (M3-SAAS-11) — not in SPEC scope
- `storefront-blog.js:682` — hardcoded `prizma-optic.co.il` in blog SEO preview (M3-SAAS-12, new) — deferred to Phase C/D
- `modules/Module 1 - Inventory Management/inventory.html:12,277` — hardcoded Prizma title + logo (M1-SAAS-01, new) — Module 1 scope, not M3
- `scripts/sync-watcher.js` is now 516 lines (M5-DEBT-05) — split on next touch
- 18-test QA suite from ROADMAP — not executable from Cowork cloud session; requires local dev environment + deployed storefront

---

## 9. Next Step Ownership

- **Merge-to-main:** DEFERRED — awaits Daniel's authorization after Main Strategic reviews this summary.
- **DNS switch:** DEFERRED — same gate. Also depends on full QA passing.
- **QA execution:** Schedule on local dev machine (localhost:3000 + localhost:4321) or staging deployment with demo tenant. Target: 18/18 PASS before DNS switch decision.
- **Suggested follow-up SPECs:**
  - M3-SAAS-05b SPEC: fix `BUILTIN_CTA_PRESETS` hardcoding in studio-shortcodes.js
  - M3-SAAS-11/12 SPEC: fix config-fallback literals in translations + blog preview domain
  - M1-SAAS-01 fix: Module 1 inventory.html title + logo
  - QA Execution SPEC: environment setup checklist + full 18-test run
