# SPEC — HOMEPAGE_HEADER_LUXURY_REDESIGN

> **Location:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_HEADER_LUXURY_REDESIGN/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-16
> **Module:** 3 — Storefront
> **Phase:** Pre-DNS-switch brand positioning shift
> **Execution repo:** `opticup-storefront` (NOT `opticup` — SPEC lives ERP-side per Authority Matrix; code lives in the sibling repo)
> **Author signature:** Cowork session 2026-04-16 (post-PRE_MERGE_SEO_FIXES close-out)

---

## 1. Goal

Replace the storefront's current "lab / Rx / multifocal" positioning with a
**luxury-boutique curator** positioning that foregrounds the five Tier-1 brands
(John Dalia, Cazal, Kame Mannen, Henry Jullien, Matsuda), demotes optometry
services from site-hero to trust-builder, and restructures the header to a
6-item nav optimised for brand discovery. Deliverable is a redesigned Homepage
(8 sections including an **Events & Testimonials** block with launch / clearance
videos), a restructured Header, a new "הסיפור שלנו" page (replacing the
current About), and a new "אופטומטריה" page (absorbing the old "משקפי
מולטיפוקל" content). **All 3 locales (he / en / ru) ship in parity** in this
SPEC — Hebrew-first with placeholder copy in en/ru is NOT acceptable (per
Daniel's Q3 answer 2026-04-16).

---

## 2. Background & Motivation

Daniel validated two Israeli multi-brand optical retailers as positioning
anchors — `glassworks.io/il/he` and `elisonoptic.com`. Both lead with "rare
designer collection + experienced optometry team", use video-driven heroes,
and give multifocal / Rx services a dedicated subpage rather than a homepage
slot. The current Prizma storefront still presents as an optometry shop first,
undermining the premium buying experience for customers who have come for
Cazal or John Dalia.

This SPEC follows the close-out of `PRE_MERGE_SEO_FIXES` (commits
`1739f49 → fe756a7` in opticup-storefront, `462bd51 + 8d306c3` in opticup).
The storefront is SEO-clean and DNS-switch-ready per FOREMAN verdict 🟡
(2026-04-16). This SPEC is the content / positioning layer that ships BEFORE
the DNS switch so the traffic lands on the new narrative, not the old one.

Contact-form bug (silent data loss on the "בואו נדבר" form) was surfaced in
parallel by Daniel and is a **launch blocker**, but is explicitly scoped to a
separate SPEC — see §7 Out of Scope and §10 Preconditions.

---

## 3. Success Criteria (Measurable)

All criteria verified from **Windows Claude Code** (not Cowork) with the
storefront dev server running at `localhost:4321`. See §10 Execution
Environment Check.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean before start, commits pushed at end | `git status` → "nothing to commit, working tree clean" on `opticup-storefront` and `opticup` |
| 2 | Commits produced (opticup-storefront) | 5–8 commits (see §9 Commit Plan) | `git log origin/develop..HEAD --oneline \| wc -l` → 5–8 |
| 3 | Commits produced (opticup, docs only) | 1 commit closing SPEC with EXECUTION_REPORT + FINDINGS + MASTER_ROADMAP update | `git log origin/develop..HEAD --oneline \| wc -l` → 1 |
| 4 | Header nav item count (desktop, he locale) | **Exactly 6** | `curl -s http://localhost:4321/ \| grep -oP 'data-nav-item' \| wc -l` → 6 — or equivalent selector after executor inspects the Header component |
| 5 | Header nav item TEXT (he locale) | Includes all 6 expected labels | `curl -s http://localhost:4321/ \| grep -oE '(משקפי ראייה\|משקפי שמש\|מותגים\|אופטומטריה\|הסיפור שלנו\|יצירת קשר)' \| sort -u \| wc -l` → 6 |
| 6 | Header NO LONGER contains Blog or Multifocal links | 0 matches | `curl -s http://localhost:4321/ \| grep -cE '(בלוג\|blog\|מולטיפוקל)'` within the `<nav>` or header component → 0 hits within nav scope |
| 7 | Homepage Hero has a `<video>` element | ≥1 | `curl -s http://localhost:4321/ \| grep -c '<video'` → ≥1 |
| 8 | Homepage Hero has **exactly two** CTA buttons | 2 | Count of `<a>` or `<button>` elements inside the `HeroSection` that have class matching the site's CTA pattern → 2 |
| 9 | Homepage contains a Tier-1 spotlight section with **5 brand cards** | 5 | Executor inspects the Homepage component and confirms 5 cards are rendered, one for each Tier-1 brand slug (John Dalia, Cazal, Kame Mannen, Henry Jullien, Matsuda). See §11 Pre-flight — brand slugs must be re-enumerated from the live DB before drafting component. |
| 10 | Homepage contains a Tier-2 brand section with **≥6 brand logos or cards** | ≥6 | Executor inspects; Prada, Miu Miu, Moscot, Montblanc, Gast, Serengeti minimum. Exact slugs re-enumerated pre-flight. |
| 10b | Homepage contains an **Events & Testimonials** block with ≥2 embedded videos | 2 YouTube Shorts IDs `40f1I0eOR7s` + `-hJjVIK3BZM` present, plus room for more | `curl -s http://localhost:4321/ \| grep -cE '(40f1I0eOR7s\|hJjVIK3BZM)'` → 2 |
| 11 | Homepage has a "הסיפור שלנו" teaser section that links to `/about` (or locale equivalent) | 1 internal link to `/about`, `/he/about`, `/en/about`, `/ru/about` paths | `curl -s http://localhost:4321/ \| grep -cE 'href="/(he\|en\|ru)?/about' → ≥1` |
| 12 | Homepage has an Optometry teaser section that links to `/optometry` | 1 internal link | `curl -s http://localhost:4321/ \| grep -cE 'href="/(he\|en\|ru)?/optometry' → ≥1` |
| 12b | All 3 locales (he, en, ru) ship in full parity — no placeholder copy | 3 populated Homepage/Header/About/Optometry per locale | `curl -s http://localhost:4321/{he,en,ru}/about \| grep -cE '(TODO\|PLACEHOLDER\|Lorem)'` → 0 hits across all 3 |
| 13 | Page `/he/about` responds 200 and contains the 40-year narrative | 200 + text "40" present | `curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/he/about → 200`; `curl -s http://localhost:4321/he/about \| grep -cE '40'` → ≥1 |
| 14 | `/he/about` contains the **3 exhibition-video YouTube IDs** Daniel supplied | 3 unique IDs present | `curl -s http://localhost:4321/he/about \| grep -cE '(XvfUYI87jso\|E8xt6Oj-QQw\|hOCxDNFEjWA)'` → 3. Same check on `/en/about` and `/ru/about`. |
| 15 | Page `/he/optometry` responds 200 and contains multifocal content | 200 + text "מולטיפוקל" present | Same pattern as #13 |
| 16 | Old `/he/multifocal` (or existing multifocal page route) redirects to `/he/optometry` with HTTP 301 | 301 redirect, single hop | `curl -sI http://localhost:4321/he/{current-multifocal-slug} \| head -1` → starts with `HTTP/1.1 301` — executor confirms current slug before writing redirect |
| 17 | `npm run build` passes with 0 errors | exit 0, 0 errors | `cd opticup-storefront && npm run build` → exit 0; stderr contains 0 lines matching `/error/i` |
| 18 | Lighthouse SEO score on Homepage ≥ post-PRE_MERGE_SEO_FIXES baseline (91.7) | ≥ 91 | Lighthouse mobile run on `/` on dev server. Not a hard block if score drops by ≤2 points due to new rich-media hero, but requires FOREMAN approval to accept. |
| 19 | Largest new/modified `.astro` / `.ts` file | ≤ 300 lines (Iron Rule 12 target) | `wc -l` on each modified file; warn if any is 301–350; STOP if any exceeds 350 |
| 20 | Zero Iron Rule violations | 0 | Executor's self-audit in EXECUTION_REPORT §Iron-Rule Self-Audit, with `wc -l` actual numbers per BLOG_PRE_MERGE / OVERNIGHT_QA Executor-Improvement Proposal 1 (2026-04-14) |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in `opticup-storefront` or `opticup`
- Run read-only SQL against Supabase (Level 1 autonomy) to re-enumerate brand slugs, exhibition video IDs stored in DB, etc.
- Create, edit, move files within the scope declared in §8 Expected Final State
- Commit and push to `develop` on the storefront repo (and, at close, a single SPEC-retro commit to `develop` on the ERP repo)
- Run the standard verify scripts (`scripts/visual-regression.mjs`, `npm run build`, Lighthouse in dev mode)
- Apply the executor-improvement proposal from BLOG_PRE_MERGE_FIXES FOREMAN_REVIEW §7.1 (POSIX-ERE non-greedy two-pass regex) if any content-rewrite is needed — not expected in this SPEC but noted
- Apply the executor-improvement proposal from OVERNIGHT_QA FOREMAN_REVIEW §7.2 (NTFS git-index workaround) if the Cowork/NTFS index quirk recurs

### What REQUIRES stopping and reporting

- Touching **any file in the Blog pipeline** (`src/pages/he/blog/*`, `src/pages/en/blog/*`, `src/pages/ru/blog/*`, blog sitemap generation in `src/pages/sitemap-dynamic.xml.ts`) beyond removing the header link. Blog content is frozen per PRE_MERGE_SEO_FIXES close-out.
- Any DDL (new tables, column adds, RLS policies) — Level 3 autonomy is never autonomous
- Any change to Supabase Views (`v_storefront_brands`, `v_storefront_products`, etc.) — Iron Rule 29 protocol applies
- Any merge to `main` — Iron Rule 9 (Daniel-only authorization, non-overridable)
- Touching contact-form code — that is scoped to a separate SPEC (see §7 Out of Scope)
- Any test failure (`npm run build` non-zero, Lighthouse SEO below 89) that can't be diagnosed in a single retry
- Any step where actual output diverges from §3 expected value
- If any Tier-1 or Tier-2 brand slug cannot be located in the DB (re-enumeration mismatch with Daniel's Hebrew names)

---

## 5. Stop-on-Deviation Triggers (SPEC-specific, in addition to CLAUDE.md §9 globals)

- If the current Homepage uses a layout/content system (Studio CMS, blocks, presets) rather than hand-coded Astro components, **STOP and report** — the implementation approach changes and Foreman must re-scope.
- If the existing "About" page is a `campaign_cards` or `landing_page` record in Supabase rather than an `.astro` file, **STOP and report** — we may redesign via Studio instead of Astro source.
- If any Tier-1 brand does NOT have a macro video currently rendering on its brand page (i.e., the content asset Daniel promised is missing for one or more of the 5), **STOP and report** — Foreman must decide whether to proceed with 4 Tier-1 cards + 1 placeholder, or pause the SPEC.
- If the Homepage component exceeds 300 lines after redesign (Iron Rule 12 target), STOP and split before committing. Do not push a 301+ line file without a FOREMAN approval mark in the commit message.
- If `npm run build` passes but Lighthouse SEO on `/` drops below **91**, STOP. Do not ship a regression from the 91.7 baseline.

---

## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:

- **opticup-storefront side:** `git reset --hard {START_COMMIT_STOREFRONT}` where `START_COMMIT_STOREFRONT` is the commit hash on `opticup-storefront/develop` before any change in this SPEC (executor records this in Step 0 of EXECUTION_REPORT).
- **opticup side:** if the SPEC retro commit was pushed but the storefront commits were reverted, cherry-revert the retro commit. Do NOT leave a retro for work that didn't land.
- **DB state:** no schema changes in this SPEC → no DB rollback needed. If read-only SQL was used for brand slug lookup, nothing persisted.
- **Supabase:** no View or Edge Function changes → no platform rollback.
- Notify Foreman; SPEC is marked REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit — do NOT touch)

1. **Contact form ("בואו נדבר") data-loss bug.** Form currently shows success message but data is not delivered. This is a launch blocker but scoped to a **separate SPEC — `CONTACT_FORM_FIX`** — because it requires an Edge Function + SMTP/transactional-email integration, not a page redesign. Flag in this SPEC's §7 and open the stub after close.
2. **Blog content pipeline.** Blog routes, sitemap entries, image proxy, slug transliteration — all frozen per PRE_MERGE_SEO_FIXES close-out (commits `1739f49 → fe756a7`). Only the header *link* to the blog is removed. Blog URLs continue to work; SEO signals remain intact.
3. **Legacy brand URL remaps** (FINDING-seo-fixes-01 deferred). Handled in separate SPEC `MODULE_3_SEO_LEGACY_URL_REMAPS`. Not re-opened here.
4. **Title-length tail** (3/20 pages still >60 chars — FINDING-seo-fixes-04). Goes to Studio backlog.
5. **Studio CMS changes** (block registry, preset editor, shortcodes). If the current Homepage is a Studio-driven `landing_page` record, the SPEC STOPS (see §5). We do not extend the block registry as part of this redesign.
6. **Product catalog pages, brand detail pages, PDP pages.** Only the *Homepage*, *Header*, *About→הסיפור שלנו*, and *new Optometry* pages are in scope. The rest of the site is frozen.
7. **Visual design system overhaul.** Colors, fonts, spacing tokens remain untouched. We redesign *composition and content*, not the design system itself.

> ~~i18n Hebrew-first~~ — REVERSED per Daniel's Q3 answer on 2026-04-16. All 3 locales ship in full parity in this SPEC. See §3 Criterion 12b.

---

## 8. Expected Final State

After the executor finishes, the repo should contain:

### New files (opticup-storefront)

- `src/components/homepage/HeroLuxury.astro` — video-backed hero with copy + 2 CTAs (replaces current hero component; target ≤ 150 lines)
- `src/components/homepage/BrandStrip.astro` — catalog-brand logo row (target ≤ 80 lines)
- `src/components/homepage/Tier1Spotlight.astro` — 5-card spotlight section (target ≤ 120 lines)
- `src/components/homepage/StoryTeaser.astro` — "הסיפור שלנו" teaser card (target ≤ 80 lines)
- `src/components/homepage/Tier2Grid.astro` — Tier-2 brand grid (target ≤ 100 lines)
- `src/components/homepage/EventsShowcase.astro` — **NEW** — launch events / stock clearance / testimonials block with ≥2 YouTube Shorts embeds (target ≤ 100 lines)
- `src/components/homepage/OptometryTeaser.astro` — optometry trust-builder section (target ≤ 80 lines)
- `src/components/homepage/VisitUs.astro` — store CTA section (target ≤ 80 lines)
- `src/pages/he/optometry.astro` — new Optometry page
- `src/pages/en/optometry.astro` — locale-parity stub (copy = English, structural parity)
- `src/pages/ru/optometry.astro` — locale-parity stub (copy = Russian, structural parity)
- `src/pages/he/about.astro` — rewritten "הסיפור שלנו" (replaces current about if Astro-sourced; otherwise see §5 Stop-Trigger)
- `src/pages/en/about.astro`, `src/pages/ru/about.astro` — locale-parity

### Modified files (opticup-storefront)

- `src/components/Header.astro` — restructure nav to 6 items; remove Blog + Multifocal links
- `src/pages/index.astro` — compose new homepage from the 7 section components above
- `astro.config.mjs` — **if and only if** new routes require config registration (expected: no change, Astro is file-based routing)
- `vercel.json` — add 301 redirect from old multifocal slug to `/he/optometry` (and locale equivalents); single-hop only (lesson: PRE_MERGE_SEO_FIXES Task 4 flattening)
- Any existing hero / section components deleted if strictly replaced — follow Rule 21 (No Orphans): delete, do not leave dead code

### Deleted files (opticup-storefront)

- Old hero component (name TBD in Step 1 inventory — executor confirms before delete)
- Old multifocal page (if it exists as a standalone .astro file — replaced by `/optometry`)
- Any unused homepage section components that were replaced

### DB state

- No schema changes
- No DDL
- No View changes
- No Edge Function changes
- **Read-only queries** against `v_storefront_brands` to confirm Tier-1 / Tier-2 slugs

### Docs updated (MUST include)

- **`MASTER_ROADMAP.md` §3 Current State** (opticup repo) — one-line update: "Storefront homepage + header redesigned to luxury-boutique positioning (SPEC HOMEPAGE_HEADER_LUXURY_REDESIGN, commits X→Y). DNS switch ready."
- **`modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md`** — top entry with date, scope, commits, Foreman verdict
- **`modules/Module 3 - Storefront/docs/CHANGELOG.md`** — entry with storefront + ERP commit tables, before→after content summary, key metrics
- `docs/GLOBAL_MAP.md` — N/A (no new cross-module contracts)
- `docs/GLOBAL_SCHEMA.sql` — N/A (no DDL)
- Module's `MODULE_MAP.md` — if new components add new globally-reachable patterns, otherwise N/A
- Module's `MODULE_SPEC.md` — update "current state of the storefront" narrative from "WP-parity catalog site with multifocal emphasis" to "luxury-boutique curator"
- **`docs/guardian/GUARDIAN_ALERTS.md`** — only if any alert relates to homepage or header. Otherwise N/A.

---

## 9. Commit Plan (opticup-storefront)

Executor is free to re-group if the dependency order requires it, but this is
the default grouping. Each commit must name modified files in the body, not
just the scope (lesson: PRE_MERGE_SEO_FIXES FOREMAN_REVIEW §6.1 — "commit plan
listed filenames without per-file deltas").

| # | Commit | Scope | Files |
|---|--------|-------|-------|
| 1 | `feat(homepage): add 8 section components for luxury-boutique layout` | 8 new components | `src/components/homepage/*.astro` (HeroLuxury, BrandStrip, Tier1Spotlight, StoryTeaser, Tier2Grid, EventsShowcase, OptometryTeaser, VisitUs) |
| 2 | `feat(homepage): compose new index.astro from luxury sections (he/en/ru)` | Homepage recomposition | `src/pages/index.astro`, locale mirrors (`src/pages/en/index.astro`, `src/pages/ru/index.astro`) |
| 3 | `feat(header): restructure nav to 6 luxury-boutique items; remove Blog + Multifocal` | Header | `src/components/Header.astro` (+ any sub-components) |
| 4 | `feat(about): rewrite Our Story page with 40-year arc + 3 exhibition videos (he/en/ru)` | About pages | `src/pages/{he,en,ru}/about.astro` |
| 5 | `feat(optometry): new Optometry page absorbing multifocal content (he/en/ru)` | Optometry pages | `src/pages/{he,en,ru}/optometry.astro` |
| 6 | `chore(redirects): 301 old multifocal slug → /optometry (single-hop, per locale)` | vercel.json | `vercel.json` |
| 7 | `chore(orphans): delete old hero + multifocal page components` | Rule 21 cleanup | deletions only |
| 8 (optional) | `fix(homepage): post-build / Lighthouse adjustments if score dips below 91` | Safety-net regression | any file |

**opticup (ERP) side — single close-out commit:**

| # | Commit | Scope | Files |
|---|--------|-------|-------|
| 1 | `docs(m3-redesign): close HOMEPAGE_HEADER_LUXURY_REDESIGN with retrospective` | Retrospective + master-doc updates | EXECUTION_REPORT.md, FINDINGS.md, MASTER_ROADMAP.md, SESSION_CONTEXT.md, CHANGELOG.md |

Foreman adds FOREMAN_REVIEW.md in a separate, subsequent commit per protocol.

---

## 10. Dependencies / Preconditions

### Execution environment (CRITICAL)

**This SPEC MUST be executed from Windows Claude Code, NOT Cowork.**

Reason: the executor needs to run `npm run build`, `localhost:4321` dev server,
and Lighthouse on the same machine that serves the storefront. The Cowork
sandbox is isolated Linux and cannot reach Windows-host localhost. This is the
**third** time this axis has come up; see PRE_MERGE_SEO_OVERNIGHT_QA
FOREMAN_REVIEW §6.2 and BLOG_PRE_MERGE_FIXES FINDING-004.

Executor MUST verify at the start of execution:
```bash
# Environment-verification criterion — run as Step 0
node -e "console.log(process.platform)"   # expect: win32
cd /path/to/opticup-storefront && git rev-parse --show-toplevel   # expect storefront path
```

If either returns unexpected values → STOP, do not proceed, hand SPEC back.

### Preconditions

- `PRE_MERGE_SEO_FIXES` must be CLOSED (already ✅ as of 2026-04-16, commits `1739f49 → fe756a7` on storefront, `462bd51 + 8d306c3` on ERP).
- Both repos on `develop`, clean working tree.
- `npm install` up-to-date on `opticup-storefront`.
- Supabase credentials present in `$HOME/.optic-up/credentials.env` for read-only brand lookup.
- Storefront safety-net scripts (`scripts/visual-regression.mjs`, `npm run build`) runnable on the execution machine.
- 3 exhibition YouTube video IDs (Paris, Milan, Israel) — Daniel to supply in the pre-flight clarification step (§11 Author Question 1). If Daniel hasn't supplied IDs by executor start, the executor uses placeholders and opens FINDING-01 on pre-flight gap.

### Content assets (resolved with Daniel 2026-04-16)

**Exhibition videos for the "הסיפור שלנו" page (carousel or vertically stacked):**
- **SILMO Paris:** https://www.youtube.com/shorts/XvfUYI87jso  → ID `XvfUYI87jso`
- **MIDO Milan:** https://www.youtube.com/shorts/E8xt6Oj-QQw  → ID `E8xt6Oj-QQw`
- **Israel exhibition:** https://youtube.com/shorts/hOCxDNFEjWA?si=BPiBboXy2u_nC8Ur  → ID `hOCxDNFEjWA`

**Events & Testimonials block videos** (new Homepage section):
- **Tadmit / launch ambience clip:** https://www.youtube.com/shorts/40f1I0eOR7s  → ID `40f1I0eOR7s`
- **Testimonials-in-one-clip-plus-tadmit:** https://youtube.com/shorts/-hJjVIK3BZM  → ID `-hJjVIK3BZM`

Executor: embed as YouTube Shorts iframe or `<lite-youtube>` facade (lazy-load
preferred). Aspect ratio 9:16. Autoplay muted + loop on hover for the ambience
clip; click-to-play for the testimonial clip.

**Hero copy direction (Q2 resolved):** "Elison-inspired but NOT a copy." The
executor drafts Hebrew copy that keeps Elison's structural formula (curation
phrase + optometry-team phrase + service-quality phrase) but uses **Prizma's
own vocabulary** — specifically: mention "40 שנה", hint at global sourcing
(Paris / Milan), and avoid verbatim phrases from Elison. Draft candidate the
executor should start from (subject to Daniel's post-draft review per Q4):

> "אוסף נדיר של מסגרות מעצבים, נבחר ביד בתערוכות פריז ומילאנו, לצד צוות
> אופטומטריסטים עם 40 שנות ניסיון בהתאמת עדשות ובדיקות ראייה מתקדמות.
> כל זוג — סיפור. כל ביקור — אישי."

Two CTAs: `גלה את הקולקציה` → `/brands` (locale-aware) and `קבע תור` →
contact / booking route.

**40-year Story page narrative (Q4 resolved):** executor drafts the narrative
using the arc *Roots (pure optometry, 40+ years) → Pivot (addition of luxury
curation) → Global sourcing (3 exhibition videos embedded here) → Philosophy
(why curation + optometry together matters)*. Daniel reviews AFTER the commit
lands and iterates via follow-up commits. **No placeholder text** — the
executor's draft must read as shippable Hebrew prose; en/ru translated at
parity per Q3.

**Q5 resolved** — `CONTACT_FORM_FIX` is a separate SPEC, to be authored
immediately after this SPEC closes. Both must land before the DNS switch.

---

## 11. Lessons Already Incorporated & Author Questions

### Lessons harvested from recent FOREMAN_REVIEWs (mandatory per SPEC Authoring Protocol Step 1)

- **FROM** `PRE_MERGE_SEO_FIXES/FOREMAN_REVIEW.md` §6.1 (my own most recent review) → "Commit plan must include per-file deltas, not just scope summaries" → **APPLIED** in §9 Commit Plan Files column.
- **FROM** `PRE_MERGE_SEO_FIXES/FOREMAN_REVIEW.md` §6.2 → "Task phrasing should map directly to audit classifications" → **NOT APPLICABLE** — no prior audit drives this SPEC; positioning decisions come from Daniel's direct brief.
- **FROM** `PRE_MERGE_SEO_FIXES/FOREMAN_REVIEW.md` §7.1 (executor) → "Root-cause grouping before listing N fixes" → **APPLIED** — §9 groups commits by feature (Hero, Header, Story, Optometry) not by individual files.
- **FROM** `PRE_MERGE_SEO_FIXES/FOREMAN_REVIEW.md` §7.2 (executor) → "Post-flattening regression checklist" → **NOT APPLICABLE** — no redirect flattening in this SPEC.
- **FROM** `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` §6.1 → "Re-enumerate any count cited by a prior audit before writing into §7/§8" → **APPLIED** in §11 Pre-Flight below.
- **FROM** `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` §6.2 → "When a success criterion involves a URL scheme with two valid forms, the SPEC must name ONE canonical form + file:line where that form is already in use" → **APPLIED** — §3 Criterion 16 names `vercel.json` 301 + single-hop, not ambiguous.
- **FROM** `PRE_MERGE_SEO_OVERNIGHT_QA/FOREMAN_REVIEW.md` §6.2 → "Every SPEC must declare execution environment in §10" → **APPLIED** in §10 Execution Environment (CRITICAL).
- **FROM** `PRE_MERGE_SEO_OVERNIGHT_QA/FOREMAN_REVIEW.md` §7.1 → "File-size claims must be verified with `wc -l`" → **APPLIED** in §3 Criterion 19 + §5 Stop-Trigger.
- **FROM** `PRE_MERGE_SEO_OVERNIGHT_QA/FOREMAN_REVIEW.md` §7.2 → "Context-budget awareness for retrospective: prioritize FINDINGS.md before EXECUTION_REPORT.md if context is tight" → **APPLIED** (noted for executor dispatch — not a SPEC-body criterion but the executor's responsibility).

### Cross-Reference Check (Rule 21 pre-flight — mandatory)

Ran 2026-04-16 at author time against the authoritative sources listed in
Authority Matrix (CLAUDE.md §7). Storefront repo is NOT mounted in this Cowork
session, so the sweep is against ERP-side artifacts + the Module 3 docs tree:

- **New component names** (HeroLuxury, Tier1Spotlight, BrandStrip, Tier2Grid, StoryTeaser, OptometryTeaser, VisitUs) — no hits in `docs/GLOBAL_MAP.md`, `modules/Module 3 - Storefront/docs/MODULE_MAP.md`, or the Module 3 SESSION_CONTEXT. Clear.
- **New routes** (`/he/optometry`, `/en/optometry`, `/ru/optometry`) — current storefront has no route named `optometry` per Module 3 SESSION_CONTEXT. Clear. Current multifocal route is unknown from ERP side — **executor confirms in Step 1 inventory**.
- **New pages** — `/about` routes already exist per Module 3 docs; this SPEC rewrites them, not creates them. Confirmed by §8 Modified-files section's "Deleted files" clause for old About if applicable.
- **`vercel.json` redirects** — PRE_MERGE_SEO_FIXES added redirect flattening via `Astro.rewrite('/404')` at handler level. This SPEC adds a `vercel.json` redirect (platform-level 301) which is orthogonal. No collision.

**Cross-Reference Check completed 2026-04-16 against ERP-side Module 3 docs
rev: 0 collisions / 0 hits to resolve.** Final confirmation pending executor's
Step 1 inventory in the storefront repo.

### Pre-Flight Re-enumeration (live-DB counts)

Per BLOG_PRE_MERGE_FIXES FOREMAN_REVIEW §6.1 — every count borrowed from
non-live-DB sources must be re-enumerated at author time. Cowork session does
not have Supabase MCP connected in this specific session, so this step
partially delegates to the executor's Step 1 Pre-Flight:

- **Tier-1 brand count = 5** — Daniel's brief. Executor re-enumerates brand slugs against `v_storefront_brands` in Step 1.
- **Tier-2 brand count = 6+** — Daniel's brief (Prada, Miu Miu, Moscot, Montblanc, Gast, Serengeti). Executor confirms each has a valid entry in `v_storefront_brands`.
- **Current header nav item count** — unknown from ERP side. Executor counts in Step 1 and reports before modifying.
- **Current homepage section count** — unknown from ERP side. Executor inventories in Step 1.

### Author questions — RESOLVED WITH DANIEL 2026-04-16

| # | Question | Answer |
|---|----------|--------|
| Q1 | 3 exhibition video URLs | Supplied — see §10 Content Assets |
| Q2 | Hero copy direction | Elison-inspired structure, NOT a copy. Executor drafts using Prizma vocabulary. Candidate in §10. |
| Q3 | i18n scope | **All 3 locales (he, en, ru) ship in this SPEC with translated copy.** No placeholders. Hebrew-first-only allowance REMOVED from §7. |
| Q4 | Story narrative review flow | Executor drafts → commits → Daniel reviews + follow-up commits. No pre-draft approval gate. |
| Q5 | Contact form fix | Separate SPEC (`CONTACT_FORM_FIX`), authored after this closes. Both land before DNS switch. |
| Q6 (added by Daniel) | Events / launches / clearance block | **NEW section added** — `EventsShowcase.astro` with 2 YouTube Shorts embeds (see §8, §9 Commit 1; §10 Content Assets). |

---

## 12. Open Items & Follow-Ups (recorded at author time — not SPEC scope)

- **Follow-up SPEC:** `CONTACT_FORM_FIX` — launch blocker; Edge Function + SMTP integration.
- **Follow-up SPEC:** `MODULE_3_SEO_LEGACY_URL_REMAPS` — FINDING-seo-fixes-01 deferred.
- **Follow-up (Studio backlog):** meta_title override field for blog posts (FINDING-seo-fixes-04).
- **Follow-up (Studio backlog):** blog content editor flagging missing `<img alt="">` (FINDING-seo-fixes-05).
- **Follow-up SPEC:** `M3_SEO_SAFETY_NET` — move SEO verify scripts into storefront repo (FINDING-seo-fixes-06).
- **i18n follow-up:** if Q3 answer is "Hebrew-first", English + Russian copy becomes its own SPEC.
- **Photography:** if Tier-2 brands have no tadmit photos, a content-production task may be needed — not in this SPEC.

---

*End of SPEC. All 6 Author Questions RESOLVED with Daniel on 2026-04-16.
SPEC is READY FOR EXECUTOR DISPATCH. Execution must happen from Windows
Claude Code (NOT Cowork) — see §10 Execution Environment (CRITICAL).*

**Homepage section order (final):**
1. HeroLuxury (video + Elison-inspired-not-copied copy + 2 CTAs)
2. BrandStrip (catalog brand logos)
3. Tier1Spotlight (5 brand cards)
4. StoryTeaser (40-year arc + exhibition teaser)
5. Tier2Grid (6+ brand logos)
6. EventsShowcase (launches / clearance / testimonials — ≥2 YouTube Shorts)
7. OptometryTeaser (trust-builder)
8. VisitUs (CTA)
