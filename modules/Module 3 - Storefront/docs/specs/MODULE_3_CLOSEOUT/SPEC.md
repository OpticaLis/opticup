# SPEC — MODULE_3_CLOSEOUT

> **Location:** `modules/Module 3 - Storefront/docs/specs/MODULE_3_CLOSEOUT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-14
> **Module:** 3 — Storefront
> **Phase:** Close-Out (Track 1 of 2-track split; blocks DNS switch)
> **Author signature:** Cowork Hybrid Trial session, 2026-04-14

---

## 1. Goal

Close every remaining blocker between the current `develop` state and Daniel's authorization to merge `develop → main` for DNS switch. This SPEC bundles (a) the last 5 tenant-hardcoding fixes deferred from the 2026-04-14 Pre-Launch Hardening SPEC, (b) the small WordPress migration gaps surfaced by the 2026-04-04 comparison, (c) the Edge Function `translate-content` markdown-wrapper regression, (d) execution of the 9 pending content-migration SQL files, and (e) reconciliation of stale roadmap/context docs. After this SPEC closes, Module 3 is code-complete and the only remaining gate for DNS switch is Daniel-run QA on localhost.

---

## 2. Background & Motivation

On 2026-04-14 the Pre-Launch Hardening SPEC landed 7 commits (`66acfc7` → `d2fe4d3`) fixing all M6-RLS-01/02/03, M3-SAAS-01/04/05, and M1-R09-01 findings. That SPEC intentionally deferred five tenant-hardcoding items (M3-SAAS-05b, M3-SAAS-10, M3-SAAS-11, M3-SAAS-12, M1-SAAS-01) and 18/18 QA tests were marked BLOCKED: ENVIRONMENT (Cowork cloud session cannot reach localhost). The 2026-04-04 `WORDPRESS_COMPARISON.md` shows storefront/WP parity at 99% — 2 missing pages, 1 WP hot-linked image, 16 blog posts missing featured images, About page thin, one Hebrew-slug Contact page returning 500. The 2026-04-10 storefront SESSION_CONTEXT notes the `translate-content` Edge Function still emits markdown wrappers despite Phase A validators — the only CRITICAL blocker still open against DNS switch. `MASTER_ROADMAP.md` and `MODULE_3_ROADMAP.md` have not been updated since April 12, so they show stale statuses. This SPEC bundles all of the above into one close-out run so Module 3 can be declared done.

Relevant prior work:
- Pre-Launch Hardening: `modules/Module 3 - Storefront/docs/PRE_LAUNCH_HARDENING_SUMMARY_2026-04-14.md`
- WP parity report: `modules/Module 3 - Storefront/docs/WORDPRESS_COMPARISON.md`
- Migration status: `modules/Module 3 - Storefront/docs/MIGRATION_STATUS.md`
- Image inventory: `opticup-storefront/docs/WP-IMAGES-INVENTORY.md`
- Guardian alerts: `docs/guardian/GUARDIAN_ALERTS.md` (M3-SAAS-09/10/11/05b/12, M1-SAAS-01 informational)

---

## 3. Success Criteria (Measurable)

Every criterion below has an exact expected value. Executor must verify each and record the actual result in `EXECUTION_REPORT.md`.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at start | On `develop`, clean after First Action step 4 handling | `git branch` → `* develop`; `git status` → clean or pre-existing changes handled |
| 2 | Both repos current with origin | Up to date | `git pull origin develop` → "Already up to date" or fast-forward only |
| 3 | M3-SAAS-05b resolved | 0 hits for `optic_prizma` in `BUILTIN_CTA_PRESETS` section of `modules/storefront/studio-shortcodes.js` | `grep -n "optic_prizma" modules/storefront/studio-shortcodes.js` → only hits inside comments or dead code; live presets read from `storefront_config` |
| 4 | M3-SAAS-10 resolved | `TENANT_SLUG \|\| 'prizma'` fallback removed from `modules/storefront/studio-editor.js:326` | `grep -nE "TENANT_SLUG\s*\|\|\s*'prizma'" modules/storefront/studio-editor.js` → 0 hits |
| 5 | M3-SAAS-11 resolved | "אופטיקה פריזמה" literals replaced with tenant-name lookups in the 3 files | `grep -n "אופטיקה פריזמה" modules/storefront/storefront-translations.js modules/storefront/brand-translations.js modules/storefront/studio-brands.js` → 0 live hits (comments OK) |
| 6 | M3-SAAS-12 resolved | `prizma-optic.co.il` in `modules/storefront/storefront-blog.js:682` reads tenant custom_domain | `grep -n "prizma-optic.co.il" modules/storefront/storefront-blog.js` → 0 hits |
| 7 | M1-SAAS-01 resolved | `inventory.html` title + logo dynamic | `grep -nE "אופטיקה פריזמה\|prizma-logo" "modules/Module 1 - Inventory Management/inventory.html"` → 0 hardcoded hits |
| 8 | WordPress hot-link migrated | Multifocal hero image moved off `prizma-optic.co.il/wp-content/`; all 3 lang rows updated | Supabase `SELECT COUNT(*) FROM storefront_pages WHERE blocks::text LIKE '%prizma-optic.co.il/wp-content%'` → 0 |
| 9 | 2 missing WP pages added | `/קופח-כללית/` exists + renders; `/vintage-frames/` either added or explicitly dropped with redirect in `vercel.json` | Supabase `SELECT COUNT(*) FROM storefront_pages WHERE slug IN ('קופח-כללית','vintage-frames') AND is_deleted=false AND status='published'` → 2 (or 1 + vercel redirect) |
| 10 | About page enriched (all 3 langs) | HE/EN/RU About pages contain history "מאז 1985"/"since 1985"/"с 1985", vision, 4-bullet "Why Us", contact section | Supabase `SELECT slug, lang, LENGTH(blocks::text) FROM storefront_pages WHERE slug='about'` → 3 rows, each > 2000 chars |
| 11 | Contact page HTTP 500 fixed | `/צרו-קשר/` returns 200 on localhost:4321 (verified by Daniel QA run) | Daniel-run curl recorded in EXECUTION_REPORT |
| 12 | Blog featured images backfilled | 16 unique blog articles × 3 langs = 48 rows updated with non-null `featured_image` | Supabase `SELECT COUNT(*) FROM storefront_blog_posts WHERE featured_image IS NULL AND is_deleted=false` → 0 |
| 13 | 9 MIGRATION_STATUS SQL files executed | All 9 from `MIGRATION_STATUS.md` table either applied via Supabase MCP `apply_migration` or confirmed already applied (idempotent ON CONFLICT clauses) | `SELECT slug FROM storefront_pages WHERE slug IN (...) AND status='published'` returns all 8 target slugs |
| 14 | `translate-content` Edge Function no longer emits wrappers | Direct curl to deployed function with a product translation request returns JSON whose `translation` field contains no ```` ``` ````, ```` ```markdown ````, `**`, or leading `"Translation:"` / `"Here is"` markers | Smoke test curl recorded in EXECUTION_REPORT |
| 15 | Storefront build passes | 0 errors | `cd opticup-storefront && npm run build` → exit 0 |
| 16 | ERP safety net clean | `verify.mjs --staged` passes pre-commit for every commit in this SPEC | hook output shows "all checks passed" |
| 17 | Doc reconciliation | `MASTER_ROADMAP.md`, `modules/Module 3 - Storefront/MODULE_3_ROADMAP.md`, `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md`, `opticup-storefront/SESSION_CONTEXT.md` all reflect actual 2026-04-14 state (Phase B Core + B6 + Pre-Launch Hardening + this Close-Out = done) | manual review + diff in EXECUTION_REPORT |
| 18 | Guardian alerts updated | M3-SAAS-05b/10/11/12 + M1-SAAS-01 moved to "Resolved" section of `docs/guardian/GUARDIAN_ALERTS.md`; no new HIGH alerts introduced | grep of GUARDIAN_ALERTS.md shows the 5 IDs only in Resolved |
| 19 | QA handoff packet prepared | `modules/Module 3 - Storefront/docs/QA_HANDOFF_2026-04-14.md` created with: prerequisite checklist (localhost:3000 + localhost:4321 + demo tenant PIN), step-by-step runbook for the 18 ROADMAP tests, expected outputs, failure reporting template | file exists and is >= 200 lines |
| 20 | Commits produced | 10–14 commits, each scoped to one concern | `git log origin/develop..HEAD --oneline` shows scoped, present-tense English messages |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in either repo (opticup, opticup-storefront)
- Run read-only SQL via Supabase MCP (Level 1 autonomy)
- Edit any file listed in §8 "Expected Final State"
- Run `apply_migration` via Supabase MCP for the 9 pre-written SQL files in `sql/` (Level 2 — writes are DML, not DDL; idempotent ON CONFLICT)
- Run `apply_migration` for the single WP image move (UPDATE to 3 rows in `storefront_pages`)
- Redeploy `translate-content` Edge Function after validator rebuild (Level 2 — prior deployment pattern)
- Commit and push to `develop` on either repo
- Apply executor-improvement proposals from prior FOREMAN_REVIEWs if they directly fit (see §11)

### What REQUIRES stopping and reporting
- Any file in `FROZEN_FILES.md` being touched
- Any schema DDL (new columns, new tables, new indexes) — Level 3 never autonomous
- Any merge to `main` — only Daniel authorizes, in this conversation, directly
- The `translate-content` Edge Function still emitting wrappers after 2 retry cycles of validator rewrite → STOP, report with Edge Function logs
- Any `storefront_pages` or `storefront_blog_posts` row count changing by more than ±50 unexpectedly
- Any of the 18 QA tests Daniel runs on localhost failing with a code defect (not environment)
- Any `npm run build` warning about circular imports or unresolved tenant-config lookups

---

## 5. Stop-on-Deviation Triggers (SPEC-specific)

In addition to CLAUDE.md §9 globals:
- If `storefront_pages` row count for Prizma drops below the pre-SPEC baseline by more than 5 → STOP, likely migration script side effect
- If `SELECT COUNT(*) FROM content_translations WHERE content_hash IS NULL` > pre-SPEC value → STOP, translation pipeline regression
- If the Edge Function redeploy changes the response shape (not just content) → STOP, review contract
- If any About-page enrichment SQL writes over localized content not matching source WP text (verify by reading WP first, per opticup-guardian) → STOP
- If `grep -rn "6ad0781b-37f0-47a9-92e3-be9ed1477e1c"` in the ERP repo returns any live code hit (not migration file, not comment) → STOP (hardcoded Prizma UUID regression)
- If the 18 ROADMAP QA tests on Daniel's localhost return ANY FAIL for a code defect → STOP and fix before closing SPEC
- If `vercel.json` redirect count drops below 1606 (current baseline after commit `2b16f8e`) → STOP

---

## 6. Rollback Plan

**Git-level:**
- Record the start commit in the first line of `EXECUTION_REPORT.md`: `START_COMMIT = {hash of develop HEAD before any change}`
- If the SPEC fails partway through:
  - `cd opticup && git reset --hard {START_COMMIT_ERP}` && `git push --force-with-lease origin develop` (Daniel must authorize force-push)
  - `cd opticup-storefront && git reset --hard {START_COMMIT_STOREFRONT}` && `git push --force-with-lease origin develop`

**DB-level:**
- The 9 MIGRATION_STATUS SQL files use `ON CONFLICT ... DO UPDATE` and are idempotent — no rollback needed for content.
- Blog featured image backfill: before running, `CREATE TABLE storefront_blog_posts_backup_20260414 AS SELECT * FROM storefront_blog_posts;`
- About page enrichment: before running, `CREATE TABLE storefront_pages_about_backup_20260414 AS SELECT * FROM storefront_pages WHERE slug='about';`
- WP image move: before running, back up the 3 multifocal-guide rows similarly.

**Edge Function rollback:**
- Record current deployed version hash from Supabase dashboard before redeploy. If new validator breaks, roll back via `deploy_edge_function` with prior source.

**SPEC status on failure:**
- Mark SPEC as REOPEN in `SESSION_CONTEXT.md`, not CLOSED. Write partial EXECUTION_REPORT.md describing what succeeded and what failed. Foreman writes a FOREMAN_REVIEW.md documenting the failure mode and fix path for the next attempt.

---

## 7. Out of Scope (explicit)

These look related but MUST NOT be touched in this SPEC:

- **Tenant feature gating / plan-based mode split** — that is SPEC 2 (`TENANT_FEATURE_GATING_AND_CLEANUP`). Do not add feature flags to any storefront-*.html ERP page here. Do not extend `plans.features` JSONB.
- **Dead code cleanup (Phase D)** — also SPEC 2. Do not delete `old prompts/`, `mar30-phase-specs/`, unused backups, or unused components here.
- **Module 4 CRM** — not started; do not create any CRM-related tables, views, or UI.
- **New RLS policies** — all 11 critical tables were fixed 2026-04-12 (commit `b68b8b8` + `f865a2e`). Do not touch RLS in this SPEC unless a test fails because of it (stop-trigger).
- **New Edge Functions** — only `translate-content` is redeployed. No new functions created.
- **DNS switch execution** — Daniel runs the actual DNS flip in Vercel dashboard AFTER this SPEC closes + QA passes. Executor does NOT merge to main and does NOT touch DNS.
- **Brand content regeneration** — Phase C.4/C.5 already completed for the 10 critical brands on 2026-04-10. Do not re-run.

---

## 8. Expected Final State

### New files (ERP repo `opticup`)

- `modules/Module 3 - Storefront/docs/QA_HANDOFF_2026-04-14.md` — runbook for Daniel's localhost QA
- `modules/Module 3 - Storefront/docs/specs/MODULE_3_CLOSEOUT/EXECUTION_REPORT.md` — written by executor at end
- `modules/Module 3 - Storefront/docs/specs/MODULE_3_CLOSEOUT/FINDINGS.md` — written by executor at end
- `migrations/065_backfill_blog_featured_images.sql` — the 48-row backfill
- `migrations/066_enrich_about_page_content.sql` — HE/EN/RU About page blocks
- `migrations/067_fix_contact_page_status.sql` — if the 500 is SQL-fixable; else a code fix in storefront repo
- `migrations/068_migrate_multifocal_wp_image.sql` — the 3-row multifocal hero image swap
- `migrations/069_insert_vintage_frames_or_redirect.sql` — only if SQL approach chosen over redirect-in-vercel.json

### Modified files (ERP repo `opticup`)

- `modules/storefront/studio-shortcodes.js` — lines 68–69: read Instagram from `storefront_config.footer_config.social`
- `modules/storefront/studio-editor.js` — line 326: remove `|| 'prizma'` fallback, require explicit `TENANT_SLUG`
- `modules/storefront/storefront-translations.js` — line ~571: tenant-name literal replaced with `getTenantConfig('name')`
- `modules/storefront/brand-translations.js` — line ~400: same pattern
- `modules/storefront/studio-brands.js` — line ~269: same pattern
- `modules/storefront/storefront-blog.js` — line 682: read SEO preview domain from `storefront_config.custom_domain`
- `modules/Module 1 - Inventory Management/inventory.html` — lines 12 + 277: dynamic `<title>` + logo path
- `docs/guardian/GUARDIAN_ALERTS.md` — move M3-SAAS-05b/10/11/12 + M1-SAAS-01 to Resolved
- `MASTER_ROADMAP.md` — §3 Module 3 row: status updated, §5 security-debt table: stale rows cleared
- `modules/Module 3 - Storefront/MODULE_3_ROADMAP.md` — mark Phase B Core + B6 + Pre-Launch + Close-Out complete
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — reflect Close-Out done; next gate = Daniel QA
- `modules/Module 3 - Storefront/docs/CHANGELOG.md` — append Close-Out entry with commit hashes

### Modified files (Storefront repo `opticup-storefront`)

- `src/lib/translate-content-validator.ts` (or equivalent file in `supabase/functions/translate-content/`) — rebuild wrapper-detection logic so the deployed function actually strips ```` ```markdown ````, ```` ``` ````, `**...**`, and leading `"Translation:"` preambles
- `supabase/functions/translate-content/index.ts` — wire in the rebuilt validator with STRICT retry on failure and hard 500 on double-fail
- `SESSION_CONTEXT.md` — mark "Open Issues - Blocking DNS Switch" resolved
- If Contact 500 is an Astro-side bug: the relevant page file under `src/pages/`

### Deleted files

- None in this SPEC. Dead-code cleanup is SPEC 2.

### DB state after SPEC

- `storefront_pages` has rows for all 8 target slugs from MIGRATION_STATUS.md in HE (and EN/RU where applicable) with `status='published'`, `is_deleted=false`
- About page blocks (3 lang rows) enriched: JSONB byte length > 2000 each
- Contact page (`/צרו-קשר/`) returns 200 on localhost:4321
- 2 WP parity pages handled (added or redirected)
- `storefront_blog_posts`: 0 rows with NULL `featured_image` for published, non-deleted posts
- `storefront_pages`: 0 rows containing `prizma-optic.co.il/wp-content/` in `blocks::text`
- `tenants` table: no change (access_sync_enabled flag from Pre-Launch SPEC is already correct)

### Docs updated (MUST include)

- `MASTER_ROADMAP.md` §3 + §5
- `modules/Module 3 - Storefront/MODULE_3_ROADMAP.md`
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md`
- `opticup-storefront/SESSION_CONTEXT.md`
- `modules/Module 3 - Storefront/docs/CHANGELOG.md`
- `docs/guardian/GUARDIAN_ALERTS.md`
- `modules/Module 3 - Storefront/docs/specs/MODULE_3_CLOSEOUT/EXECUTION_REPORT.md`
- `modules/Module 3 - Storefront/docs/specs/MODULE_3_CLOSEOUT/FINDINGS.md`
- `docs/GLOBAL_MAP.md` — only if a new reusable helper is added (unlikely here)
- `docs/GLOBAL_SCHEMA.sql` — no schema DDL expected

---

## 9. Commit Plan

Commits scoped to single concerns, in this order:

1. `fix(studio-shortcodes): read Instagram from tenant config, resolve M3-SAAS-05b` — `modules/storefront/studio-shortcodes.js`
2. `fix(studio-editor): require explicit TENANT_SLUG, remove prizma fallback (M3-SAAS-10)` — `modules/storefront/studio-editor.js`
3. `fix(translations): replace hardcoded tenant-name literals with config lookups (M3-SAAS-11)` — `storefront-translations.js`, `brand-translations.js`, `studio-brands.js`
4. `fix(blog-preview): read SEO preview domain from tenant config (M3-SAAS-12)` — `modules/storefront/storefront-blog.js`
5. `fix(inventory-html): dynamic title + logo path (M1-SAAS-01)` — `modules/Module 1 - Inventory Management/inventory.html`
6. `feat(migration): run 9 pending content-migration SQL files + verify row presence` — `migrations/065`–`069` if any new, plus commit of any pre-existing SQL files that weren't yet run
7. `feat(wp-image): migrate multifocal hero image off prizma-optic.co.il/wp-content` — `migrations/068_...sql`
8. `feat(pages): add /קופח-כללית/ and handle /vintage-frames/` — `migrations/069_...sql` or `vercel.json`
9. `feat(about): enrich About page content HE/EN/RU to match WP parity` — `migrations/066_...sql`
10. `fix(contact): resolve /צרו-קשר/ HTTP 500` — either `migrations/067_...sql` or storefront-side page fix
11. `feat(blog-images): backfill 48 missing featured_image rows` — `migrations/065_backfill_blog_featured_images.sql`
12. `fix(translate-content): rebuild wrapper validator, redeploy Edge Function` — storefront repo
13. `docs(guardian): move M3-SAAS-05b/10/11/12 + M1-SAAS-01 to Resolved` — `docs/guardian/GUARDIAN_ALERTS.md`
14. `docs(m3): reconcile MASTER_ROADMAP, MODULE_3_ROADMAP, SESSION_CONTEXT with 2026-04-14 state` — roadmap + context files + QA_HANDOFF_2026-04-14.md
15. (final) `chore(spec): close MODULE_3_CLOSEOUT with execution report + findings` — written by executor at end

If a commit has nothing to change (e.g., Contact 500 turns out already fixed), skip it and note in EXECUTION_REPORT. Do not create empty commits.

---

## 10. Dependencies / Preconditions

- SPEC `PRE_LAUNCH_HARDENING_2026-04-14` must be closed (it is — 7 commits landed + EXECUTION_REPORT written)
- Supabase MCP available with `execute_sql` + `apply_migration` + `deploy_edge_function`
- Supabase project: `tsxrrxzmdxaenlvocyit`
- Credentials: `GITHUB_PAT` in `$HOME/.optic-up/credentials.env` if running from Cowork cloud session (FUSE mount git workaround per Pre-Launch SPEC retrospective §5)
- Daniel's localhost is NOT a precondition for steps 1–18; it IS a precondition for step 11 (Contact 500 verification) and the final QA pass
- Node `v18+`, `npm` available for `opticup-storefront` build check

---

## 11. Lessons Already Incorporated

Proposals from prior FOREMAN_REVIEWs considered:

- FROM `PRE_LAUNCH_HARDENING_SUMMARY_2026-04-14.md` §7.1 "FUSE mount git blockage consumed significant tokens" → **APPLIED**: SPEC §10 preconditions list GITHUB_PAT credential + calls out fresh-clone pattern as acceptable workaround. Executor should pre-flight-test `git add` on a temp file before starting.
- FROM `PRE_LAUNCH_HARDENING_SUMMARY_2026-04-14.md` §7.2 "§5.1 smoke test missing `SET LOCAL role = 'authenticated'`" → **APPLIED**: any RLS verify in this SPEC (none expected, but defensively included) must explicitly set role. Added to §5 stop triggers.
- FROM `PRE_LAUNCH_HARDENING_SUMMARY_2026-04-14.md` §7.3 "storefront_config schema was named columns, not key/value" → **APPLIED**: §3 criterion #3 (M3-SAAS-05b) uses `storefront_config.footer_config.social` JSONB path, not generic `config[key]`. Criterion #6 uses `storefront_config.custom_domain` column.
- FROM `PRE_LAUNCH_HARDENING_SUMMARY_2026-04-14.md` §7.6 "Test git write capability before starting" → **APPLIED**: Executor's first action is a git-write smoke test (touch a temp file, `git add` it, `git restore --staged`, delete).
- FROM `PRE_LAUNCH_HARDENING_SUMMARY_2026-04-14.md` §7.8 "Mandatory environment pre-flight block" → **APPLIED**: §3 criteria #1–#2 + §10 Dependencies form the pre-flight; §3 #11 explicitly marks Daniel-localhost step so executor knows the boundary.
- FROM `PRE_LAUNCH_HARDENING_SUMMARY_2026-04-14.md` §8 "QA 18/18 BLOCKED: ENVIRONMENT" → **APPLIED**: This SPEC separates ERP-cloud-executable steps (1–18) from Daniel-localhost-required QA (step 19 QA_HANDOFF produces the runbook; actual execution is Daniel's, not blocking SPEC close).
- FROM `opticup-guardian` skill (2026-04-13 origin) → **APPLIED**: every CRITICAL/HIGH criterion in §3 has a concrete verify command. No "approximately" counts. Row counts cross-checked via actual SQL in the Foreman session (see §2 motivation paragraph sources).

**Cross-Reference Check (performed 2026-04-14 before authoring):**
- 0 name collisions. No new tables, columns, RPCs, Edge Functions, or global helpers proposed in this SPEC.
- Only new files are the 5 migration SQLs + the 3 folder-lifecycle docs + 1 QA handoff doc.
- All file edits extend or replace existing functions/constants — none duplicate.
