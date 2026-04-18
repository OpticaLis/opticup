# SPEC — TENANT_FEATURE_GATING_AND_CLEANUP

> **Location:** `modules/Module 3 - Storefront/docs/specs/TENANT_FEATURE_GATING_AND_CLEANUP/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-14
> **Module:** 3 — Storefront
> **Phase:** Post-Close-Out (Track 2 of 2-track split; does NOT block DNS switch)
> **Author signature:** Cowork Hybrid Trial session, 2026-04-14

---

## 1. Goal

Implement the Prizma-vs-Standard tenant tiering Daniel defined: Prizma (and any future "enterprise" tenant) gets the full Studio experience (custom blocks, landing pages, AI tools); basic/premium tenants get a simplified storefront (catalog with filters, auto-generated brand pages, blog) without access to Studio's advanced surfaces. At the same time, delete the dead-code accumulations from pre-April-2026 work so the repo is ready for Module 4 (CRM) without carrying fossil documentation. This SPEC extends the existing `isFeatureEnabled()` infrastructure — it does NOT build a new feature-flag system.

---

## 2. Background & Motivation

Daniel's SaaS product direction (recorded 2026-04-14): the first tenant (Prizma) is the reference store with the full toolset. Future tenants will onboard at lower tiers and should see a simpler UI without Studio's landing-page/custom-block/AI surfaces until they upgrade. During the Module 3 Close-Out review we discovered that the feature-flag infrastructure already exists: `shared/js/plan-helpers.js` defines `isFeatureEnabled(feature)` that reads from `plans.features` JSONB via `tenants.plan_id`, with a 30-second cache. The `plans.features` table already has 17 feature keys (ocr, whatsapp, ai_alerts, inventory, shipments, api_access, purchasing, storefront, access_sync, stock_count, white_label, image_studio, custom_domain, supplier_debt, goods_receipts, b2b_marketplace, advanced_reports). Four new keys cover the Storefront Studio tiering gap: `cms_studio`, `cms_custom_blocks`, `cms_landing_pages`, `cms_ai_tools`. This SPEC adds those keys, gates the 8 storefront-*.html ERP pages that surface these capabilities, and sets plan defaults (basic=none; premium=cms_studio only; enterprise=all four). Prizma is already on the enterprise plan (verified via DB query 2026-04-14) so no data migration needed for the live tenant.

The dead-code half of this SPEC addresses accumulated `old prompts/`, `mar30-phase-specs/`, unused backup folders, and unused component files that surfaced during the Close-Out doc-reconciliation pass. These are not bugs — they are clutter that makes future agents slower and riskier (Rule 21: No Orphans).

This SPEC runs AFTER `MODULE_3_CLOSEOUT` closes. It does NOT block DNS switch — the live Prizma site is unchanged by feature-gating (Prizma = enterprise = all features).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git branch` → `* develop`; `git status` → clean or handled |
| 2 | `plans.features` extended | 4 new keys exist on every row of `plans` | Supabase `SELECT name, features FROM plans` — every row has `cms_studio`, `cms_custom_blocks`, `cms_landing_pages`, `cms_ai_tools` as JSONB booleans |
| 3 | Basic plan features | `cms_studio=false`, all 4 cms keys false | `SELECT features->>'cms_studio' FROM plans WHERE name='basic'` → "false" |
| 4 | Premium plan features | `cms_studio=true`, `cms_custom_blocks=false`, `cms_landing_pages=false`, `cms_ai_tools=false` | Supabase SELECT |
| 5 | Enterprise plan features | all 4 cms keys true | Supabase SELECT |
| 6 | Prizma on enterprise | unchanged from current state | `SELECT slug, plan_id FROM tenants WHERE slug='prizma'` → enterprise plan_id |
| 7 | Demo tenant on enterprise for QA | Daniel-approved seed state | `SELECT slug, plan_id FROM tenants WHERE slug='demo'` → enterprise (unchanged, already there) |
| 8 | `isFeatureEnabled('cms_studio')` works from ERP pages | returns correct boolean per tenant | manual test on localhost:3000 with demo → true; with test-store-qa → false |
| 9 | 8 storefront-*.html ERP pages gated | Each checks `isFeatureEnabled()` on mount and shows gracefully-worded lock state if disabled | `grep -l "isFeatureEnabled" modules/storefront/storefront-*.html modules/storefront/studio-*.html` → all 8 files |
| 10 | Lock-state UI is consistent | One shared `renderFeatureLockedState(featureName)` helper used by all 8 gates | `grep -n "renderFeatureLockedState" shared/js/` → 1 definition; 8+ call sites |
| 11 | No regression on Prizma | All 8 pages work exactly as before for Prizma (enterprise) | manual smoke on localhost with Prizma JWT |
| 12 | No regression on basic tenant | test-store-qa (basic plan) sees lock UI on Studio pages, still has full catalog/brand-page access | manual smoke |
| 13 | Dead code removed (ERP) | `old prompts/` folder deleted (archived first) | `ls "old prompts/" 2>&1` → "No such file" |
| 14 | Dead code removed (ERP) | `mar30-phase-specs/` folder deleted (archived first) | `ls mar30-phase-specs/ 2>&1` → "No such file" |
| 15 | Unused backups purged | Backups older than 30 days in `modules/Module 3 - Storefront/backups/` archived to `/mnt/opticup-archives/` and removed from repo | `find "modules/Module 3 - Storefront/backups/" -mtime +30` → empty |
| 16 | Unused components deleted | Executor enumerates `src/components/` in storefront repo, runs grep for each filename across `src/pages/` and `src/components/`; files with 0 imports are deleted (archived first) | EXECUTION_REPORT lists each file + evidence of 0 imports |
| 17 | Archive path | All deletions backed up to `/mnt/opticup-archives/DEAD_CODE_CLEANUP_2026-04-XX/` before removal from repo | folder exists with moved files |
| 18 | `docs/GLOBAL_MAP.md` updated | New helper `renderFeatureLockedState` added to shared functions section | grep for name in file |
| 19 | `docs/GLOBAL_SCHEMA.sql` updated | No DDL change (plans.features is JSONB — adding keys is data, not schema); confirm section notes the 4 new keys | comment block added under `plans` table |
| 20 | Plan-docs regenerated | `modules/Module 1.5 - Shared Components/docs/plans-features-reference.md` (new doc OR existing one extended) lists all 21 feature keys with one-line descriptions | file exists and lists the 4 new keys |
| 21 | Storefront build still passes | 0 errors | `cd opticup-storefront && npm run build` → exit 0 |
| 22 | ERP safety net clean | `verify.mjs --staged` passes every commit | hook output |
| 23 | Commits produced | 8–12 commits, scoped | `git log origin/develop..HEAD --oneline` |
| 24 | No HIGH/CRITICAL guardian alerts introduced | GUARDIAN_ALERTS.md no new HIGH/CRITICAL rows | manual diff |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in either repo
- Run read-only SQL (Level 1)
- Run `UPDATE plans SET features = features || '{"cms_studio": false, ...}'::jsonb` via Supabase MCP `execute_sql` (Level 2 DML — JSONB merge is not DDL; Rule 19 "configurable values = tables not enums" is respected because we're extending JSONB data, not creating enum)
- Edit any ERP file under `modules/storefront/storefront-*.html`, `modules/storefront/studio-*.html`, `shared/js/`
- Delete files and folders listed in §8 "Expected Final State → Deleted" AFTER archiving them
- Commit and push to `develop`
- Apply proposals from prior FOREMAN_REVIEWs where they fit

### What REQUIRES stopping and reporting
- Any DDL (ALTER TABLE, CREATE TABLE, CREATE INDEX) — not expected in this SPEC
- Any file in `FROZEN_FILES.md`
- Any merge to `main`
- Prizma's `plan_id` changing — it must NOT change in this SPEC
- Any storefront-*.html file where the existing onLoad flow cannot be safely wrapped in the gate (e.g., complex async initialization) → STOP, propose refactor
- Deleting a file where grep shows ≥1 import chain → STOP, never delete imported code
- Any `isFeatureEnabled` call that returns `undefined` instead of boolean → STOP, helper regression

---

## 5. Stop-on-Deviation Triggers (SPEC-specific)

In addition to CLAUDE.md §9 globals:
- If `tenants.plan_id` count-by-plan changes unexpectedly (e.g., a tenant migrates plans mid-SPEC) → STOP
- If `plans.features` JSONB merge fails validation (SELECT returns partially-updated state) → STOP, roll back to backup
- If a storefront-*.html page loads successfully for Prizma but throws a console error for basic tenant (rather than showing lock UI) → STOP
- If dead-code archive destination is inside any source repo tree → STOP (repeats Phase A backup DEVIATION 1 from 2026-04-12 lesson)
- If `_getPlanData()` cache behavior changes inadvertently — e.g., helper rewritten without 30-second TTL → STOP
- If more than 20 files are queued for deletion in a single commit → STOP, split into multiple commits for reviewability

---

## 6. Rollback Plan

**DB-level:**
- Before the `plans.features` UPDATE, snapshot: `CREATE TABLE plans_backup_20260414 AS SELECT * FROM plans;`
- Rollback: `UPDATE plans p SET features = b.features FROM plans_backup_20260414 b WHERE p.id = b.id;`

**Git-level:**
- Record START_COMMIT in EXECUTION_REPORT.md
- Rollback: `git reset --hard {START_COMMIT}` (Daniel authorizes force-push if needed)

**Dead-code restoration:**
- All deletions pre-archived under `/mnt/opticup-archives/DEAD_CODE_CLEANUP_2026-04-XX/`
- Restore: `cp -R /mnt/opticup-archives/DEAD_CODE_CLEANUP_2026-04-XX/<path> <path>` then `git add` + commit

**Edge Function:**
- No Edge Function changes in this SPEC — nothing to roll back there.

---

## 7. Out of Scope (explicit)

- **Module 4 CRM** — not started
- **Building a new feature-flag system** — use the existing `isFeatureEnabled()` helper; do not invent a parallel mechanism
- **Plan pricing / billing UI** — Daniel handles commercially, not in code
- **Per-feature toggle UI in Platform Admin** — nice-to-have for later; out of scope here
- **Auto-generated brand pages for non-Prizma tenants** — a bigger product question Daniel scopes later; this SPEC only gates the existing pages
- **Translation workflow refactor** — separate future SPEC
- **DNS switch** — that's the Module 3 Close-Out gate; this SPEC runs after
- **Changing Prizma's plan** — Prizma stays on enterprise; do not alter
- **`translate-content` Edge Function** — handled in Module 3 Close-Out

---

## 8. Expected Final State

### New files (ERP repo)

- `modules/Module 3 - Storefront/docs/specs/TENANT_FEATURE_GATING_AND_CLEANUP/EXECUTION_REPORT.md`
- `modules/Module 3 - Storefront/docs/specs/TENANT_FEATURE_GATING_AND_CLEANUP/FINDINGS.md`
- `modules/Module 1.5 - Shared Components/docs/plans-features-reference.md` (or append to existing if one is found during Cross-Reference Check)
- Possibly `shared/js/feature-lock-ui.js` containing `renderFeatureLockedState(featureName)` helper — only if logical home for it; else add to existing `shared/js/plan-helpers.js`

### Modified files (ERP repo)

- `shared/js/plan-helpers.js` — confirm existing export of `isFeatureEnabled`; add `renderFeatureLockedState` if housed here
- 8 files in `modules/storefront/` — add `isFeatureEnabled` gate at top of each:
  - `modules/storefront/studio-shortcodes.html` (cms_custom_blocks)
  - `modules/storefront/studio-blocks.html` (cms_custom_blocks)
  - `modules/storefront/studio-editor.html` (cms_landing_pages)
  - `modules/storefront/studio-pages.html` (cms_landing_pages)
  - `modules/storefront/storefront-translations.html` (cms_ai_tools)
  - `modules/storefront/brand-translations.html` (cms_ai_tools)
  - `modules/storefront/studio-brands.html` (cms_studio — master gate)
  - `modules/storefront/storefront-blog.html` (cms_ai_tools for AI blog gen; basic blog UI always on)
  (Final file list may differ — executor enumerates storefront-*.html + studio-*.html and maps each to the correct feature. Report in EXECUTION_REPORT.)
- `docs/GLOBAL_MAP.md` — add `renderFeatureLockedState` under shared functions
- `docs/GLOBAL_SCHEMA.sql` — comment block added under `plans` table listing 21 feature keys
- `MASTER_ROADMAP.md` — note Track 2 completion
- `modules/Module 3 - Storefront/docs/CHANGELOG.md` — append entry

### Modified files (Storefront repo)

- Storefront repo typically does not need feature-gate code changes (the storefront already reads only data, not toggles). If a CMS-block-rendering path must hide blocks of a type the tenant doesn't have access to, the filter lives in the View or in `src/lib/blocks.ts`. Executor checks during Discovery; if no such filter is needed, no storefront changes.

### Deleted files/folders (ERP repo)

- `old prompts/` (archived first)
- `mar30-phase-specs/` (archived first)
- Backup folders older than 30 days in `modules/Module 3 - Storefront/backups/` (archived first)
- Backup folders older than 30 days in `modules/Module 1 - Inventory Management/backups/` (only if present, archived first)
- Any `.bak` / `.old` files the executor finds at repo root or inside module dirs (archived first)
- Any `.html` or `.js` file under `modules/storefront/` for which grep shows 0 imports/references — executor enumerates and proposes list in EXECUTION_REPORT; Foreman confirms before deletion if list has surprises

### Deleted files/folders (Storefront repo)

- Unused components in `src/components/` with 0 imports — executor enumerates + evidence in EXECUTION_REPORT; archive first
- Stale docs in `docs/old prompts/` if that folder exists (archive first)

### DB state

- `plans.features` JSONB now has 21 keys on every row (17 existing + 4 new)
- Each plan's feature set:
  - `basic` — storefront=true, inventory=true, ocr=false, all 4 cms_* keys=false
  - `premium` — cms_studio=true, cms_custom_blocks=false, cms_landing_pages=false, cms_ai_tools=false (all others unchanged)
  - `enterprise` — cms_studio=true, cms_custom_blocks=true, cms_landing_pages=true, cms_ai_tools=true (all others unchanged)
- `tenants.plan_id` unchanged for all tenants

### Docs updated (MUST include)

- `MASTER_ROADMAP.md`
- `modules/Module 3 - Storefront/docs/CHANGELOG.md`
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md`
- `docs/GLOBAL_MAP.md`
- `docs/GLOBAL_SCHEMA.sql`
- `modules/Module 1.5 - Shared Components/docs/plans-features-reference.md`
- `docs/guardian/GUARDIAN_ALERTS.md` (if new alerts surface during cleanup)
- The two lifecycle docs inside this SPEC folder (EXECUTION_REPORT.md, FINDINGS.md)

---

## 9. Commit Plan

Split into logical commits in this order:

1. `feat(plans): add 4 cms_* feature keys with tiered defaults (basic/premium/enterprise)` — DB update via Supabase MCP + `docs/GLOBAL_SCHEMA.sql` comment + `plans-features-reference.md`
2. `feat(shared): add renderFeatureLockedState helper for graceful feature-locked UI` — `shared/js/plan-helpers.js` or new `shared/js/feature-lock-ui.js`; `docs/GLOBAL_MAP.md` update
3. `feat(studio): gate Studio Shortcodes + Studio Blocks behind cms_custom_blocks` — 2 storefront-*.html files
4. `feat(studio): gate Studio Editor + Studio Pages behind cms_landing_pages` — 2 files
5. `feat(studio): gate AI translation surfaces behind cms_ai_tools` — 2 files
6. `feat(studio): gate Studio Brands and master storefront dashboard behind cms_studio` — 2 files
7. `chore(cleanup): archive and remove old prompts/, mar30-phase-specs/` — the two folders
8. `chore(cleanup): archive stale module-level backups (>30d)` — multiple backup dirs
9. `chore(cleanup): remove unused ERP modules/storefront files (0 imports)` — case-by-case
10. `chore(cleanup): remove unused storefront-repo components` — storefront-side
11. `docs(m3): reconcile roadmap + context + guardian for Track 2 completion`
12. (final) `chore(spec): close TENANT_FEATURE_GATING_AND_CLEANUP with execution report + findings` — by executor

If any cleanup commit has 0 files, skip. If executor finds that storefront-repo has no unused components (grep-clean), note in report and skip commit 10.

---

## 10. Dependencies / Preconditions

- SPEC `MODULE_3_CLOSEOUT` must be CLOSED (Foreman Review written) — this SPEC runs after
- `shared/js/plan-helpers.js` must still export `isFeatureEnabled` (verified 2026-04-14 it does, lines 63–80)
- `plans` table must still have `features JSONB` column (verified 2026-04-14)
- Supabase MCP available with `execute_sql`
- Credentials as per CLOSEOUT SPEC
- Archive destination `/mnt/opticup-archives/` must exist outside both repos (create with `mkdir -p` during pre-flight if not)

---

## 11. Lessons Already Incorporated

Proposals from prior FOREMAN_REVIEWs considered:

- FROM `PRE_LAUNCH_HARDENING_SUMMARY_2026-04-14.md` §7.6 "Test git write capability before starting" → **APPLIED**: Executor pre-flights git-add of a temp file in CLOSEOUT SPEC; inherits to this SPEC.
- FROM 2026-04-12 Phase B §1.4.B lesson "backup destination inside source repo recursed robocopy" → **APPLIED**: §5 stop trigger explicitly checks archive destination is outside both repo trees.
- FROM `PRE_LAUNCH_HARDENING_SUMMARY_2026-04-14.md` §8 "unrelated issues noted, not fixed" → **APPLIED**: §7 explicitly parks Module 4 CRM, pricing UI, per-feature admin UI, auto-generated brand pages, translation refactor as out-of-scope to prevent scope creep.
- FROM `opticup-guardian` protocol (2026-04-13) → **APPLIED**: every §3 criterion has a concrete verify command. Plan-assignment claims cross-checked via live Supabase query during SPEC authoring.
- FROM Rule 21 (No Orphans, No Duplicates) → **APPLIED**: this SPEC EXTENDS the existing `isFeatureEnabled` helper instead of creating a second feature-flag system. §4 Autonomy explicitly bars building a parallel mechanism.
- FROM Rule 19 (Configurable values = tables, not enums) → **APPLIED**: feature keys live in `plans.features` JSONB (data), not in a Postgres enum. Adding keys is data migration, not schema migration.

**Cross-Reference Check (performed 2026-04-14 before authoring):**
- 0 name collisions on proposed identifiers:
  - `cms_studio`, `cms_custom_blocks`, `cms_landing_pages`, `cms_ai_tools` — none currently exist in `plans.features` (verified via live Supabase SELECT)
  - `renderFeatureLockedState` — grepped ERP repo: 0 existing definitions
  - No new tables, columns, RPCs, or Edge Functions proposed
- Only new files are: SPEC lifecycle docs (this folder) + 1 reference doc + possibly 1 new shared helper file
- All feature gates ATTACH TO existing pages; no new pages created
