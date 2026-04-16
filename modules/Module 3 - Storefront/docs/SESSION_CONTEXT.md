# Module 3 — Storefront — ERP-Side Session Context

## Current Phase: Phase D Content Iteration — HOMEPAGE_LUXURY_REVISIONS executed end-to-end; awaiting Foreman review + Vercel-Preview visual QA
## Status: 🟢 Revisions SPEC EXECUTED on develop (5 commits across both repos); EXECUTION_REPORT + FINDINGS landed; awaiting FOREMAN_REVIEW
## Date: 2026-04-16 (same session — SPEC dispatched, executed, retrospective written)

---

## Execution Close-Out 2026-04-16 — HOMEPAGE_LUXURY_REVISIONS

**Deliverables shipped to `develop` (both repos):**

- **BrandStripBlock auto-rotating carousel** — replaced the manual snap-x scroll (which Daniel saw as static on the deployed site) with a CSS-only marquee that translates a duplicated brand list 0 → -50% in linear infinite, paused on hover/focus, honors `prefers-reduced-motion`
- **Tier2GridBlock now supports `data.style: 'grid' | 'carousel'`** — default `'grid'` preserves backward compat (Rule 20) for any tenant without the field; `'carousel'` reuses the same shared marquee CSS as BrandStrip (Rule 21 — single `@keyframes marquee-x` in `global.css`)
- **Studio editor schema** — `tier2_grid` block in `modules/storefront/studio-block-schemas.js` now exposes the `style` select field with options `[grid (default), carousel]` so non-engineers can toggle from the Studio UI
- **Prizma Hebrew homepage rewritten via migration 125** — new hero video `lz55pwuy9wc`, overlay `0.65 → 0.80`, copy rewritten ("משקפי יוקרה ממיטב המותגים..."), `tier1_spotlight` REMOVED from JSONB array (renderer + Studio schema RETAINED on disk per Rule 20), Story block re-titled `40 שנה של בחירה` and rewritten with Daniel's anchor phrase ("הסבירות שלא תמצאו את המסגרת ההכי מתאימה לכם היא אפסית"), Story image set to existing Prizma store photo (`media_library.id=a2fcf78a-...`, IMG-20241230-WA0096 landscape webp), Tier2Grid `data.style="carousel"` for auto-marquee
- **EN + RU homepage rows EXPLICITLY UNCHANGED** — verified post-migration (`updated_at` 09:17:23 baseline preserved, 8 blocks intact including `tier1_spotlight`). Deferred to `LANGUAGES_FIX` SPEC.
- **Migration 125 embeds full pre-update HE JSONB as `/* SNAPSHOT */` block** in the file header — rollback source-of-truth per Executor Proposal E1

**Storefront commits (3):** `2547df6` (BrandStrip auto-marquee) → `0c1bc42` (Tier2Grid carousel + types) → `1e4347a` (migration 125)
**ERP commits:** `8c6e69c` (Studio schema register style:carousel) + (close-out retrospective in this commit)

**Build + verification:**
- `npm run build`: PASS (3.95s, Astro 6 + Vercel adapter, 0 errors)
- localhost:4321 smoke-tests: HE renders 7 blocks in correct order with new hero video, removed Tier1Spotlight (0 hits), auto-marquee CSS class present (5×), new story title + anchor phrase + section_title + CTA all present, story image URL correct. EN + RU still render 8 blocks each with `tier1_spotlight` retained and old hero video `40f1I0eOR7s` × 2 (hero+events) — confirmed unchanged
- DB post-migration: HE block_count=7, EN/RU block_count=8, EN/RU `updated_at` unchanged from baseline
- **Vercel Preview criteria deferred** (§3.F: hero video render, BrandStrip rotation visual, Tier2Grid carousel visual, Lighthouse ≥85) — Daniel's post-commit visual review

**Retrospective artifacts:**
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/EXECUTION_REPORT.md` (10 sections, executor self-score 9.5/10)
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/FINDINGS.md` (2 findings: M3-EXEC-DEBT-01 missing reference file LOW, M3-REPO-DRIFT-01 untracked SPEC artifacts LOW; 1 historical observation on continued Rule 12 debt M3-R12-STUDIO-01)
- `FOREMAN_REVIEW.md` — pending Cowork Foreman authoring

**Executor proposals to opticup-executor skill (2):**
- E-prop-1: Pre-flight reference-file existence check in SKILL.md First Action — log a finding when SPEC names a missing `references/{file}.md`
- E-prop-2: Migration folder convention auto-detect in SKILL.md Step 1.5 DB Pre-Flight — `ls $REPO/sql && ls $REPO/supabase/migrations` before writing migration files

**Next gate:** Foreman writes `FOREMAN_REVIEW.md` for this SPEC. Then queue moves to `NAV_FIX` (broken `/about/` and `/optometry/` transitions from header).

---

## Historical — pre-execution (SPEC authored 2026-04-16)

---

## Revised Follow-Up Queue (Daniel's direction, 2026-04-16 late)

After viewing the deployed luxury redesign, Daniel re-sequenced the pre-DNS queue:

1. **HOMEPAGE_LUXURY_REVISIONS** (Hebrew ONLY) — SPEC authored, awaiting Windows dispatch. Block-by-block revisions: new hero video `lz55pwuy9wc`, darker overlay (0.8), rewritten hero copy, Tier1Spotlight REMOVED from HE row (renderer + schema retained for Rule 20), Story block rewritten with Daniel's anchor phrase + store photo, Tier2Grid converted to auto-scrolling carousel. Scope: Prizma tenant, `lang='he'`, slug='/' — EN + RU explicitly deferred.
2. **NAV_FIX** — Transitions to `/about/` and `/optometry/` don't work from homepage + header. Needs investigation first.
3. **LANGUAGES_FIX** — EN + RU locales don't render correctly. Data migrations populated all 3 locales previously (stored OK in DB); defect is in rendering/routing layer. Needs investigation.
4. **CONTACT_FORM_FIX** — Launch blocker (was previously #1, now #4). "בואו נדבר" form shows success but data silently lost. Needs Edge Function + SMTP/transactional-email.

**Side queue (infra, non-blocking):**
- `M3_STOREFRONT_PAGES_BACKUPS_TABLE` — schedule before next CMS-content SPEC (de-risks #1)
- `MODULE_3_SEO_LEGACY_URL_REMAPS` — LOW
- `M3_SEO_SAFETY_NET` — MEDIUM

---

## HOMEPAGE_LUXURY_REVISIONS SPEC — Authored 2026-04-16 (Cowork session)

**Location:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/SPEC.md`
**Status:** ✅ Authored, pending Daniel's dispatch to Windows Claude Code in `opticup-storefront` repo.
**Executor constraints:**
- Prizma-scoped Level 2 SQL only (`tenant_id='6ad0781b-...'` AND `lang='he'`)
- EN + RU rows must remain unchanged (Criteria 8–9 enforced)
- Tier1Spotlight renderer + Studio schema STAY on disk (Rule 20 — Author Proposal A1 applied)
- Mandatory pre-migration JSONB snapshot embedded in migration 125 header (Executor Proposal E1 applied)
- Vercel-Preview-only criteria separated from localhost criteria (Author Proposal A2 + Executor Proposal E2 applied)

**Key technical open question (executor resolves):** whether `BrandStripBlock.astro` actually rotates when `data.style='carousel'` is set. If yes → no renderer change needed. If no → SPEC allows up to ~100 lines of carousel implementation; more than that = Stop-on-Deviation.

---

## Execution Close-Out 2026-04-16 — HOMEPAGE_HEADER_LUXURY_REDESIGN (🟡 CLOSED WITH FOLLOW-UPS)

---

## Execution Close-Out 2026-04-16 — HOMEPAGE_HEADER_LUXURY_REDESIGN

**Deliverables shipped to `develop` (both repos):**

- **8 new CMS block renderers** in `opticup-storefront/src/components/blocks/*Block.astro` (HeroLuxury, BrandStrip, Tier1Spotlight, StoryTeaser, Tier2Grid, EventsShowcase, OptometryTeaser, VisitUs) — all ≤132 lines, tenant-agnostic per Rule 20
- **Wired through `BlockRenderer.astro`** dispatch; `types-luxury.ts` split off to keep `types.ts` under Rule 12's 350-line max
- **ERP Studio registry** updated (`modules/storefront/studio-block-schemas.js`) with 8 new block-type schemas
- **Header restructured** to 6 luxury-boutique nav items (משקפי ראייה / משקפי שמש / מותגים / אופטומטריה / הסיפור שלנו / יצירת קשר); Blog + Multifocal + Lab removed; i18n parity across he/en/ru
- **Prizma Homepage rewritten** via migration 123 — all 3 locales now use the 8-block luxury composition (was 9-block WP-parity)
- **Prizma About rewritten** via migration 124A — 5 blocks per locale including 3 exhibition videos (`XvfUYI87jso`, `E8xt6Oj-QQw`, `hOCxDNFEjWA`)
- **NEW `/optometry/` CMS pages** via migration 124B — 3 rows inserted, shared translation_group_id, published, multifocal content absorbed
- **vercel.json 301** — `/multifocal-guide/`, `/multifocal/`, `/multifocal-glasses` all → `/optometry/` (single-hop, per locale)

**Storefront commits (7):** `ac7ea8a` → `caa5b5b` → `383cb89` → `0a361c0` → `f7afae9` → `329d5e6` → `b94554f`
**ERP commits:** `1b5d822` (Studio registry) + (close-out retrospective commit)

**Build + verification:**
- `npm run build`: PASS (0 errors, 3.64s, Astro 6 + Vercel adapter)
- localhost:4321 smoke-tests: Homepage 8 blocks rendered via CMS path, Header nav 6 items, Hero video embedded, 3 locales all 200 on `/about/` + `/optometry/`, multifocal text present in all 3 optometry locales
- **Criterion 16 unverifiable on localhost** (`vercel.json` redirects only fire on Vercel edge) — logged as finding
- **Criterion 18 (Lighthouse ≥91)** skipped locally — Vercel Preview runs Lighthouse automatically

**Retrospective artifacts:**
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_HEADER_LUXURY_REDESIGN/EXECUTION_REPORT.md`
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_HEADER_LUXURY_REDESIGN/FINDINGS.md` (4 findings: 1 SPEC-pattern fix, 2 MEDIUM tech-debt, 1 LOW housekeeping)
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_HEADER_LUXURY_REDESIGN/FOREMAN_REVIEW.md` — **✅ written 2026-04-16 by Cowork Foreman; verdict 🟡 CLOSED WITH FOLLOW-UPS**

**Foreman proposals produced (all applied to HOMEPAGE_LUXURY_REVISIONS SPEC):**
- A1: Rule 20 vs Rule 21 Deletion Check — in author SKILL Step 1.5
- A2: Vercel Platform-Layer Caveat — in SPEC_TEMPLATE §3
- E1: Mandatory pre-migration SELECT snapshot — in STOREFRONT_CMS_ARCHITECTURE.md §4
- E2: `git show` verification + Vercel Preview pattern — in STOREFRONT_CMS_ARCHITECTURE.md §3.5

**Next gate:** Daniel dispatches HOMEPAGE_LUXURY_REVISIONS SPEC to Windows Claude Code (see that SPEC's §13).

---

## Historical — SPEC authoring + re-scope (pre-execution, 2026-04-16)

---

## Homepage / Header / Story / Optometry Redesign — SPEC authored + re-scoped 2026-04-16

**SPEC:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_HEADER_LUXURY_REDESIGN/SPEC.md`
**Status:** ✅ Authored + re-scoped to **CMS-native block architecture (Option D)** after executor's Step 1 inventory fired Stop-on-Deviation trigger §5 bullet 1. Daniel approved Option D on 2026-04-16. All 6 pre-flight Author Questions still resolved; plus §13 Re-scope section added directing executor to block-renderer implementation.
**Execution repo:** `opticup-storefront` (NOT this repo — Windows Claude Code only; Cowork cannot run `npm run build` + `localhost:4321`)

**Architectural discovery (2026-04-16):** Prizma Homepage, About, and Multifocal-Guide are **CMS records in `storefront_pages`**, not Astro source files. 9 rows total (3 locales × 3 page types). `src/pages/index.astro:31-41` contains a `getPageBySlug` branch that short-circuits the Astro composition and renders via `<PageRenderer blocks={cmsPage.blocks} />`. Any edit to `.astro` files alone would be invisible in production. Lesson persisted as: (a) §13 Re-scope in this SPEC, (b) new reference `.claude/skills/opticup-executor/references/STOREFRONT_CMS_ARCHITECTURE.md`, (c) new "Storefront CMS Architecture — Mandatory Pre-Flight" section in `.claude/skills/opticup-executor/SKILL.md`.

**Option D implementation path:**
- Build 8 block renderers under `opticup-storefront/src/components/blocks/` (NOT `src/components/homepage/`)
- Register 8 block types in Studio block registry + `PageRenderer` dispatch
- Author content via SQL UPDATE to `storefront_pages.blocks` JSONB (Level 2 SQL autonomy, Prizma-scoped)
- Header stays hand-coded Astro (no CMS) — 6-item restructure unchanged
- `/optometry` created as CMS page (INSERT 3 rows), not a new `.astro` file
- `/about/` updated via UPDATE of existing CMS rows (3 locales)
- Old `/multifocal-guide/` 301s to `/optometry` via `vercel.json`

**Scope:**
- Positioning shift: "lab / Rx / multifocal" → "luxury-boutique curator of 5 Tier-1 brands (John Dalia, Cazal, Kame Mannen, Henry Jullien, Matsuda) + 6+ Tier-2 (Prada, Miu Miu, Moscot, Montblanc, Gast, Serengeti)"
- **Homepage:** 8 sections (HeroLuxury → BrandStrip → Tier1Spotlight → StoryTeaser → Tier2Grid → EventsShowcase → OptometryTeaser → VisitUs)
- **Header:** 6 items (משקפי ראייה / משקפי שמש / מותגים / אופטומטריה / הסיפור שלנו / יצירת קשר); REMOVED Blog + מולטיפוקל links
- **NEW page** `הסיפור שלנו` — 40-year narrative + 3 exhibition videos (Paris/Milan/Israel YouTube Shorts IDs embedded)
- **NEW page** `אופטומטריה` — absorbs multifocal content; old slug 301-redirects
- **NEW Events block** — YouTube Shorts `40f1I0eOR7s` (tadmit) + `-hJjVIK3BZM` (testimonials)
- **All 3 locales (he/en/ru) ship in parity** — no placeholder copy allowed
- Hero copy: Elison-inspired structure, NOT a copy; executor drafts using Prizma's own vocabulary ("40 שנה", Paris/Milan sourcing hint); Daniel reviews post-commit

**Author's anchor decisions (for continuity):**
- Q1 exhibition videos: SILMO Paris `XvfUYI87jso`, MIDO Milan `E8xt6Oj-QQw`, Israel `hOCxDNFEjWA`
- Q2 hero copy: Elison-inspired, not copied; candidate draft in SPEC §10
- Q3 i18n: all 3 locales in THIS SPEC, not a follow-up
- Q4 story narrative: executor drafts → commits → Daniel reviews after
- Q5 contact form: separate SPEC `CONTACT_FORM_FIX` immediately after this closes (both land before DNS switch)
- Q6 events block: added as 6th Homepage section per Daniel's addendum mid-authoring

**Follow-up SPECs queued:**
- `CONTACT_FORM_FIX` — launch blocker; "בואו נדבר" form shows success but data silently lost (likely missing Edge Function + SMTP integration). Author immediately after this SPEC closes.
- `MODULE_3_SEO_LEGACY_URL_REMAPS` — FINDING-seo-fixes-01 deferred (from PRE_MERGE_SEO_FIXES).
- `M3_SEO_SAFETY_NET` — FINDING-seo-fixes-06 deferred (Rule 30).

**Dispatch gate:** None remaining — all 6 Q&A resolved. Executor may start as soon as Daniel runs the SPEC commit from Windows CMD.

---

## Pre-Merge SEO Fixes SPEC ✅ (2026-04-16)

All HIGH/MEDIUM SEO findings from the parent audit resolved. Storefront is
SEO-clean for DNS switch.

- **Scope:** 9 fix tasks (14 success criteria — 9 pass-threshold, 5 best-effort); all 9 tasks executed end-to-end under Bounded Autonomy
- **Sitemap:** 58 broken `<loc>` entries → **0** (root cause: sitemap emitted `/בלוג/{slug}/` while routing resolves at root `/{slug}/`; fix: sitemap generator emits the right path + `[...slug].astro` 301-guards legacy URLs)
- **og:image coverage:** 27% → **100%** on sampled top-20 pages (fallback to tenant logo in `BaseLayout.astro` when no explicit `ogImage` prop)
- **Locale 404:** `/en/*` and `/ru/*` now `Astro.rewrite('/404')` — real HTTP 404 instead of soft-404 302
- **Redirect chains:** all 46 previously-multi-hop chains flattened to ≤1 hop via handler-level 404 for unknown brand/product slugs
- **robots.txt:** single `sitemap-dynamic.xml` directive (stale `sitemap-index.xml` directive removed)
- **Title / alt improvements:** template-level dedupe of tenant-name suffix (title ≤60 chars on 17/20 sampled pages, was 23%); `ensureImgAlt` regex pass on blog content
- **Commits:** storefront `1739f49`, `0047e1f`, `f3a855f`, `c8789e9`, `fe756a7` + ERP retrospective `462bd51` + FOREMAN_REVIEW `8d306c3`
- **Retrospective:** `docs/specs/PRE_MERGE_SEO_FIXES/{EXECUTION_REPORT,FINDINGS,FOREMAN_REVIEW}.md`
- **Foreman verdict:** 🟡 closed with follow-ups (documentation drift — fixed in this commit). 6 findings logged: 1 closed in-SPEC; 5 deferred (non-blocking)
- **Follow-up SPEC stubs flagged:** `MODULE_3_SEO_LEGACY_URL_REMAPS` (LOW — per-URL vercel.json rules for legacy WP URLs with ≥5 GSC clicks), `M3_SEO_SAFETY_NET` (MEDIUM, future — port SEO check subset to storefront scripts/ per Rule 30)

---

## Pre-Merge SEO Overnight QA SPEC ✅ (2026-04-15)

Read-only SEO audit against GSC ground truth (1000 Pages + 1000 Queries CSV exports). 10 Node scripts, 1 atomic commit, 14 findings (0 CRITICAL / 3 HIGH / 6 MEDIUM / 3 LOW / 2 INFO) → all actionable items fed into the PRE_MERGE_SEO_FIXES SPEC above.

- **DNS verdict:** 🟢 **GREEN** — 41 MISSING URLs total, **0** carry ≥10 clicks (combined traffic of MISSING: 4 clicks)
- **Coverage:** OK_200=96, OK_301_REDIRECT=863, MISSING=41 (of 1000 GSC URLs)
- **HIGH findings resolved by PRE_MERGE_SEO_FIXES:** `og:image` 73/100 missing → now 100% coverage on sample; 58/245 sitemap `<loc>`s 404 → now 0 broken; `/en/*` and `/ru/*` 302 → now real 404
- **Report:** `docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/SEO_QA_REPORT.md` (38.5 KB, 11 sections)
- **Retrospective:** `docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/{EXECUTION_REPORT,FINDINGS,FOREMAN_REVIEW}.md`

---

## Blog Pre-Merge Fixes SPEC ✅ (2026-04-15)

All CRITICAL/HIGH blog findings resolved. Multilingual blog (he/en/ru, 174 posts) is production-safe for DNS switch.

- **19 WP images migrated** to `media-library/blog` bucket + `media_library` rows inserted; 4 confirmed 404 stripped (commits `678a82e`, `4738191`)
- **132 posts rewritten** — WP image URLs replaced with `/api/image/media/` proxy paths; 4 broken img tags stripped; WP `<a href>` links stripped (commit `dd0fe6f`)
- **Grammar article** — en + ru soft-deleted; he variant preserved (commit `dd0fe6f`)
- **58 Hebrew slugs transliterated** — 19 en → English ASCII, 39 ru → Russian Cyrillic (commit `dd0fe6f`)
- **Retrospective:** `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/`
- **Remaining (UNVERIFIED, localhost):** build passes, browser spot-check, 200 responses — per existing `docs/QA_HANDOFF_2026-04-14.md`
- **Follow-up SPEC flagged:** `BLOG_INSTAGRAM_TEMPLATIZE` — 82 posts contain hardcoded `optic_prizma` Instagram href (LOW, not a blocker)

---

## Tenant Feature Gating & Cleanup SPEC ✅ (2026-04-15)

4 new CMS feature keys added to plans table; 8 storefront HTML pages gated via `isFeatureEnabled()` + `renderFeatureLockedState()`:

- **migration 067** — `cms_studio`, `cms_custom_blocks`, `cms_landing_pages`, `cms_ai_tools` keys added to basic/premium/enterprise plans (commit `ea08602`)
- **renderFeatureLockedState** — new helper in `shared/js/plan-helpers.js`; GLOBAL_MAP.md updated (commit `44a7625`)
- **8 pages gated** — storefront-settings, storefront-products (→ `storefront`); storefront-brands, storefront-studio, storefront-blog (→ `cms_studio`); storefront-content, storefront-glossary (→ `cms_ai_tools`); storefront-landing-content (→ `cms_landing_pages`) (commit `f28db3c`)
- **Dead code cleaned** — `old prompts/` + `mar30-phase-specs/` archived + removed from git index (commit `8b960fe`)
- **Blocked (environment):** stale M3 backup folder purge requires `git rm -r` from Daniel's local machine; storefront unused component cleanup deferred

---

## Close-Out SPEC ✅ (2026-04-15)

All remaining blockers for DNS switch resolved:

- **M3-SAAS-05b** — `BUILTIN_CTA_PRESETS` Instagram href reads from tenant config (commit `a115b5a`)
- **M3-SAAS-10** — `studio-editor.js` TENANT_SLUG fallback removed; early-exit if unset (commit `5de07d6`)
- **M3-SAAS-11** — Hardcoded Hebrew store name literals replaced with `getTenantConfig('name') || ''` in storefront-translations, brand-translations, studio-brands (commit `5a0a561`)
- **M3-SAAS-12** — Blog SEO preview domain reads `getTenantConfig('custom_domain') || 'domain.co.il'` (commit `67468ed`)
- **M1-SAAS-01** — inventory.html title + logo now dynamic from `tenant_name_cache` sessionStorage (commit `6ce4b67`)
- **WP parity** — `/קופח-כללית/` and `/vintage-frames/` pages inserted via migrations 065/066 (commit `b55de5a`)
- **translate-content v2** — `stripWrappers()` added, FORBIDDEN_PATTERNS extended, deployed as v2
- **Guardian alerts** — M3-SAAS-05b/10/11/12 + M1-SAAS-01 moved to Resolved (commit `ba81a3b`)

**Next gate:** Daniel runs QA on localhost per `docs/QA_HANDOFF_2026-04-14.md`, then merges develop → main in both repos, then DNS switch.

---

## Pre-Launch Hardening SPEC ✅ (2026-04-14)

Resolved in commits `66acfc7`–`d2fe4d3`:
- storefront_components, storefront_pages, storefront_reviews RLS rewritten to JWT-claim canonical pattern
- M3-SAAS-01, M3-SAAS-04, M3-SAAS-05 (Part A), M1-R09-01 resolved
- HaveIBeenPwned: flagged as M6-AUTH-01 (requires manual Supabase dashboard toggle)

---

## Phase B — SaaS Hardening ✅

### Status: COMPLETE on develop (not yet merged to main — Module 3 still open)

**B Core — RLS canonical pattern rollout:**
- §1.0 Infrastructure: optic_readonly DB role created, 4 tests passed
- §1.1 RLS fixes: all 11 tables fixed to canonical JWT-claim pattern
  (customers, prescriptions, sales, work_orders, brand_content_log,
  storefront_component_presets, storefront_page_tags, media_library,
  supplier_balance_adjustments, campaigns, campaign_templates)
- §1.3–§1.6: RLS audit script, TIER-C cleanup, run-audit harness
- B1–B8 items closed; Manual Action #2 executed

**B6 — sessionStorage Key Rename (commit `7e99030`):**
- Atomic rename `prizma_*` → `tenant_*` across entire ERP
- 22 files changed, 44 replacements (keys: auth_token, employee, permissions, role, user, branch, login_locked, admin)
- Sanity Check §5.1–§5.8 PASS on demo tenant
- Login round-trip verified via Chrome MCP: login → module nav → logout → re-login, zero console errors
- Daniel-side visual verification: PASS

**SPEC files (reference):**
- MODULE_3_B_SPEC_saas_core_2026-04-12.md (B Core)
- MODULE_3_B_SPEC_saas_session_keys_2026-04-12.md (B6)

### Pending (not blocking Phase C)
- §4.3 Prizma tenant safety check — run before any merge to main (deferred until Module 3 closes)
- MASTER_ROADMAP §5/§6 RETRACTED marker on SF-2 (supplier_balance_adjustments)

### Phases C and D
Not started, not SPEC'd. C = WordPress content migration. D = dead code cleanup.

---

## CMS Status: COMPLETE

All phases done (CMS-1 through CMS-10).
19 block types, Studio editor, AI editing, SEO scoring, product picker, Google reviews,
custom HTML blocks, popup lead forms, campaign templates.

**Next:** Design phase (WordPress visual parity) then DNS switch.

---

## CMS-10 — Custom Block + Bug Fixes + QA ✅

| Step | Status | Description | Commit (ERP) | Commit (Storefront) |
|------|--------|-------------|--------------|---------------------|
| Build 1 | ✅ | Custom block type #19 (HTML+CSS) | — | `11f905f` |
| Build 2 | ✅ | Studio schema, code editor, AI custom mode | `97fe894` | — |
| Build 3 | ✅ | CTA popup lead form | `97fe894` | `11f905f` |
| Build 4 | ✅ | Custom block SQL templates | — | `11f905f` |
| Fix 1 | ✅ | Gold color (amber → #D4A853) across 12 files | — | `4ef4f6a` |
| Fix 2 | ✅ | Image gallery scrollbar-hide CSS | — | `4ef4f6a` |
| Fix 3 | ✅ | Studio page list layout CSS | `9f7a815` | — |
| Fix 4 | ✅ | Templates UI (block list instead of JSON) | `9f7a815` | — |
| Fix 5 | ✅ | Blog link (storefront-blog.html) | `9f7a815` | — |
| Fix 6 | ✅ | Place ID save (upsert) | `9f7a815` | — |
| Fix 7 | ✅ | Delete block already fixed (9dfd9fa) | — | — |
| Fix 8 | ✅ | Preview URL (localhost detection) | `9f7a815` | — |
| Fix 9-10 | ✅ | Spacing + meta tags verified OK | — | — |
| QA | ✅ | Full QA: build, 19 blocks, routes, meta, SuperSale test | — | — |

### Action Required
- Run SQL: `sql/036-custom-block-templates.sql`
- Deploy: `supabase functions deploy cms-ai-edit --no-verify-jwt`
- See full QA report: `modules/Module 3 - Storefront/docs/CMS-QA-REPORT.md`

---

## CMS-5 — AI Prompt Editing ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 1 | ✅ | Edge Function: supabase/functions/cms-ai-edit/index.ts | `e731da4` |
| 2 | ✅ | Deploy instructions saved | `e731da4` |
| 3 | ✅ | studio-ai-prompt.js — API calls, prompt bar, history, permission gating | `e731da4` |
| 4 | ✅ | storefront-studio.html — AI prompt bar + diff modal added | `e731da4` |
| 5 | ✅ | css/studio.css — AI prompt + diff styles | `e731da4` |
| 5b | ✅ | studio-ai-diff.js — diff view split for file size compliance | `e731da4` |
| 6 | ✅ | Permission gating (built into handleAiPrompt) | `e731da4` |
| 7 | ⬜ | Integration testing — requires Edge Function deploy | — |
| 8 | ✅ | Documentation (CLAUDE.md, MODULE_MAP, SESSION_CONTEXT) | final commit |

### Action Required
- Daniel must deploy Edge Function: see `modules/Module 3 - Storefront/docs/deploy-cms-ai-edit.md`
- Daniel must set `ANTHROPIC_API_KEY` as Supabase secret (if not already set)

### What's Next
- CMS-6: QA + design polish

---

## CMS-2 — Studio Block Editor ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 1 | ✅ | studio-block-schemas.js — 14 block schemas + settings | `a2208b1` |
| 2 | ✅ | studio-form-renderer.js — generic form builder | `a2208b1` |
| 3 | ✅ | studio-pages.js — page list + CRUD | `a2208b1` |
| 4 | ✅ | studio-editor.js — block editor, reorder, save, rollback | `fe6f3b4` |
| 5 | ✅ | storefront-studio.html — Studio page | `fe6f3b4` |
| 6 | ✅ | css/studio.css — editor styles | `fe6f3b4` |
| 7 | ✅ | Navigation link added to all storefront pages | final commit |
| 9 | ✅ | Documentation updated (CLAUDE.md + SESSION_CONTEXT.md) | final commit |

---

## Previous Phase: Phase 7 — White-Label + Analytics + Theme
## Previous Status: ✅ Complete (code done, pending SQL 018 deploy)
## Previous Date: 2026-03-30

---

## Phase 7 — White-Label + Analytics + Theme ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 0 | ✅ | Backup | — |
| 1-4 | ✅ | SQL 018, Partytown, analytics scripts, event tracking | `cbba53b` (storefront) |
| 5-6 | ✅ | Multi-domain tenant resolution, per-tenant homepage/favicon/OG | `e3a653d` (storefront) |
| 7 | ✅ | ERP analytics JSONB + branding settings UI | `5df7f7d` |
| 8 | ✅ | Documentation | `c05ce7c` (storefront) |

---

## Phase 6 — i18n AI Translation ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 0 | ✅ | Backup | — |
| 1-2 | ✅ | SQL 016-017: glossary + corrections tables, seed data | `a57d8af` (storefront) |
| 3 | ✅ | Edge Function: translate-content | `a596c04` |
| 4 | ✅ | Auto-translate in generate-ai-content 