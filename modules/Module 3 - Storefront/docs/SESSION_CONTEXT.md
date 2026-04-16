# Module 3 — Storefront — ERP-Side Session Context

## Current Phase: Phase D Content Iteration — STOREFRONT_S2S3_QA 🟡 READY FOR EXECUTOR DISPATCH
## Status: QA SPEC authored (2026-04-16). Verifies sessions 2+3 storefront changes (Header fixed, ContactForm hidden, /about/ pages, BaseLayout pt-16) + 2 language fixes (EN optometry title, RU FAQ em-dash). Daniel's storefront file changes uncommitted — executor verifies files on disk, applies DB fixes, commits SPEC artifacts to ERP only. Daniel pushes storefront changes from CMD.
## Date: 2026-04-16

---

## FOREMAN_REVIEW 2026-04-16 — HOMEPAGE_LUXURY_REVISIONS_R2 🟢 CLOSED

R2 foreman review complete. All 4 findings processed (2 TECH_DEBT, 1 queued SPEC stub, 1 dismiss). 2 author-skill + 2 executor-skill proposals filed. See `docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW.md` for full review.

**Next SPEC in queue: STOREFRONT_S2S3_QA** (authored this session, ready to dispatch). After that: NAV_FIX → LANGUAGES_FIX → CONTACT_FORM_FIX.

---

## Execution Close-Out 2026-04-16 — HOMEPAGE_LUXURY_REVISIONS_R2

**Deliverables shipped to `develop` (both repos):**

- **Marquee `prefers-reduced-motion` compliance** — `global.css` swapped `animation: none` → `animation-play-state: paused` to match SPEC criterion #13 verify literal. The twin-duplicated translateX(-50%) infinite track was already correct in R1 (commits `2547df6` + `0c1bc42`); Daniel's "blank wrap frame" report from R1 review may have been a cache or pre-deploy view — code-level investigation confirmed no structural change needed.
- **Dark-on-dark contrast fix (criterion #15)** — added 5 CSS rules in `global.css` targeting `section.bg-black` descendants, overriding `text-gray-900/700/600` to white/gray-200/300 with specificity (0,2,1) that wins over single-utility classes (0,1,0). Tenant-agnostic, applies wherever `bg_color: 'black'` is set. The HE row's `events-showcase-home-he` (only block with `bg_color: 'black'`) now renders heading + body legibly.
- **Font unification (criterion #21)** — removed Tailwind `font-serif` (Georgia/Times default) from h1/h2/h3 in 7 luxury renderers (`HeroLuxuryBlock`, `StoryTeaserBlock`, `OptometryTeaserBlock`, `Tier1SpotlightBlock` ×2, `Tier2GridBlock`, `VisitUsBlock`, `EventsShowcaseBlock`). Headings now inherit canonical Rubik (HE) / Inter (EN/RU) from body. Decorative "40" span in `StoryTeaserBlock.astro:59` kept as documented exception (only renders when `data.image` is missing — never the case for live HE row).
- **HE homepage JSONB UPDATE (1 row)** — block count 7 → 8. New `events_showcase`-typed block `exhibitions-home-he` inserted at index 2 with section_title "מהתערוכות בעולם — לחנות שלנו" + 3 YouTube Shorts (Paris `XvfUYI87jso` / Milano `E8xt6Oj-QQw` / Israel `hOCxDNFEjWA`). StoryTeaser rewritten: title `נעים מאוד, אופטיקה פריזמה`, body opens with `<strong class="text-gold">אופטיקה פריזמה</strong>` (gold via `@theme { --color-gold: #c9a555 }`), narrative reframed around "introduction + heritage + process" (exhibitions theme moved to dedicated block above). Image kept verbatim per Daniel 2026-04-16 deferral.
- **EN + RU homepage rows EXPLICITLY UNCHANGED** — `updated_at` baseline `2026-04-16 09:17:23.065827+00` preserved on both. Verified via post-UPDATE SELECT.

**Storefront commits (2):** `faa31c5` (reduced-motion fix) → `2d4173f` (contrast + font unification on 7 renderers + global.css)
**ERP commits:** (this commit) — SESSION_CONTEXT + CHANGELOG + EXECUTION_REPORT + FINDINGS for R2

**Build + verification:**
- `npm run build` (storefront): PASS (4.10s, 0 errors)
- `npm run verify:full` (storefront): exit 1 from 55 PRE-EXISTING violations in `docs/*.html` and `scripts/seo/*` files — ZERO violations in any of the 8 files this SPEC touched (pre-commit hook confirmed "0 violations across 8 files" on commit `2d4173f`). Documented in FINDINGS as M3-EXEC-DEBT-02.
- DB post-UPDATE: HE block_count=8, types/ids exact match SPEC §3 criterion #4, EN/RU `updated_at` unchanged.
- Manual `localhost:4321` smoke deferred to Daniel (autonomous flow does not start dev server). Documented in FINDINGS.

**Retrospective artifacts:**
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/SPEC.md`
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/PRE_STATE_BACKUP.json` (pre-UPDATE HE blocks JSONB for rollback per §6)
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/EXECUTION_REPORT.md`
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/FINDINGS.md`

**Next gate:** Awaiting Foreman review (`FOREMAN_REVIEW.md` to be written by opticup-strategic). Then 🔁 dispatch **NAV_FIX** (broken transitions to `/about/` and `/optometry/` from homepage + header). After NAV_FIX → LANGUAGES_FIX → CONTACT_FORM_FIX.

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

**Retrospective artifacts (lifecycle complete):**
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/EXECUTION_REPORT.md` (10 sections, executor self-score 9.5/10)
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/FINDINGS.md` (2 findings: M3-EXEC-DEBT-01 LOW, M3-REPO-DRIFT-01 LOW)
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/FOREMAN_REVIEW.md` — 🟢 CLOSED (Cowork Foreman session `relaxed-dreamy-gates`, 2026-04-16)

**Foreman disposition of findings:**
- M3-EXEC-DEBT-01 (missing `STOREFRONT_CMS_ARCHITECTURE.md`) → **DISMISSED as FALSE POSITIVE**. File exists at exact path SPEC §11 referenced (committed in `9df084e`); executor checked Windows plugin-install path instead of repo path. Lesson captured as executor-skill Proposal E1.
- M3-REPO-DRIFT-01 (5 untracked SPEC artifacts in ERP) → **ACCEPTED — NEW_SPEC `M3_SPEC_FOLDER_SWEEP` scheduled** (≤30 min, run before NAV_FIX).

**4 self-improvement proposals to land before next SPEC dispatch:**
- Author A1: Migration-path pre-flight check (detect `sql/` vs `supabase/migrations/` before prescribing §8 path)
- Author A2: Skill-reference path disambiguator (`.claude/skills/` references are always repo paths, not plugin-install paths)
- Executor E1: Repo-vs-plugin path resolution rule (use `git show HEAD:<path>` or `$(git rev-parse --show-toplevel)/<path>`, never `%USERPROFILE%\.claude\...`)
- Executor E2: Migration folder auto-detect pre-migration-file creation (promote executor's own Proposal 2 verbatim)

**Execution quality score (Foreman-adjusted):** **9.6/10** (executor self-score 9.5 was honest; 0.1 over-deduction on "docs currency" for a file that actually existed).

**Next gate:** Commit FOREMAN_REVIEW + SESSION_CONTEXT + skill edits to `develop`. Then 🔁 another pass on the homepage with fresh eyes (Daniel: "זה לא כמו שרציתי") — a HOMEPAGE_LUXURY_REVISIONS_R2 SPEC will capture round-2 revisions. Only after that → dispatch `NAV_FIX`.

**2026-04-16 skill improvements APPLIED (ahead of next dispatch):**
- `.claude/skills/opticup-strategic/SKILL.md` — added Step 1 sub-rule 9 (A1 — migration-path pre-flight detection) + Step 3 sub-section "§11 Path Disambiguator Rule" (A2 — repo vs plugin-install path notation in §11 references)
- `.claude/skills/opticup-executor/SKILL.md` — added First Action step 5.5 (E1 — skill-reference file lookup rule: always repo path, never plugin install) + Step 1.5 DB Pre-Flight sub-item 9 (E2 — migration folder convention auto-detect via `git rev-parse --show-toplevel` + `ls`)

All 4 proposals now live in the skill files themselves — the next SPEC dispatch automatically benefits.

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
- **Dead code cleaned** — `old prompts/` + `mar30-phase-specs/` archived + r