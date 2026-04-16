# Module 3 — Storefront — ERP-Side Session Context

## Current Phase: Luxury-Positioning Redesign → Executor complete on develop; awaiting FOREMAN_REVIEW + Daniel QA
## Status: 🟢 Executor complete (CMS-native Option D executed end-to-end); FOREMAN_REVIEW.md pending
## Date: 2026-04-16 (re-scoped + executed same session)

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
- FOREMAN_REVIEW.md — pending (opticup-strategic layer)

**Next gate:** Foreman reads retrospective + writes review → Daniel runs QA on localhost:4321 + on Vercel Preview → Daniel merges develop → main in both repos → author `CONTACT_FORM_FIX` SPEC → DNS switch.

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
| 4 | ✅ | Auto-translate in generate-ai-content | `a596c04` |
| 5 | ✅ | Translations tab in storefront-content.html | `d070577` |
| 6 | ✅ | Glossary management page (storefront-glossary.html) | `d070577` |
| 7 | ✅ | Storefront EN/RU product pages | `dd91bf3` (storefront) |
| 8 | ✅ | Bulk translate (in translations tab) | `d070577` |
| 9 | ✅ | Documentation updated | `27b2436` |

---

## Phase 5 — AI Content Engine (5A + 5B + 5C) ✅

| Step | Status | Description | Commit (ERP) |
|------|--------|-------------|--------------|
| 5A | ✅ | generate-ai-content Edge Function + content manager | `6e39d9c` |
| 5B | ✅ | generate-blog-post Edge Function + blog editor | `e80dff0` |
| 5C | ✅ | generate-landing-content Edge Function + landing editor | `213dd50` |

---

## ⚠️ PENDING — Daniel Must Do

### Phase 7 SQL Migration (Supabase Dashboard)
1. `opticup-storefront/sql/018-phase7-white-label.sql` — analytics JSONB, custom_domain, hero/favicon/OG columns + v_storefront_config view update

### Phase 6 SQL Migrations (Supabase Dashboard)
1. `opticup-storefront/sql/016-phase6-translation.sql` — translation_glossary + translation_corrections
2. `opticup-storefront/sql/017-seed-glossary.sql` — seed 45 optical terms × EN+RU

### Phase 6 Edge Function Deploy
```bash
supabase functions deploy translate-content --no-verify-jwt
supabase functions deploy generate-ai-content --no-verify-jwt  # updated with auto-translate
```

### Phase 5 SQL Migrations (if not already run)
1. `013-phase5a-ai-content.sql` — ai_content + ai_content_corrections tables
2. `014-v-storefront-products-v4.sql` — view v4 with AI columns
3. `015-blog-posts-table.sql` — blog_posts table + view
4. Then: `cd opticup-storefront && npx tsx scripts/seo/migrate-blog-to-db.ts`

### Phase 5 Edge Function Deploy (if not already done)
```bash
supabase functions deploy generate-ai-content --no-verify-jwt
supabase functions deploy generate-blog-post --no-verify-jwt
supabase functions deploy generate-landing-content --no-verify-jwt
```

### Phase 4A SQL (if not already run)
- `006-phase4a-storefront-modes.sql`
- `007-v-storefront-products-v3.sql`
- `008-rpc-storefront-leads.sql`

---

## Key Architecture

### Analytics (Phase 7)
- `storefront_config.analytics` — JSONB column with all analytics IDs per tenant
- All scripts load via **Partytown** (Web Worker) for zero Lighthouse impact
- Events via `dataLayer.push`: view_product, whatsapp_click, notify_me, booking_click, search
- ERP settings: `storefront-settings.html` → analytics section saves as JSONB

### Tenant Resolution (Phase 7)
Resolution order: custom_domain → subdomain → ?t= → default
1. Custom domain: `v_storefront_config.custom_domain` → tenant_id
2. Subdomain: `[slug].opticalis.co.il`
3. Query param: `?t=slug`