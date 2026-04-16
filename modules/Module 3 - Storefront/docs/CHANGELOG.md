# Module 3 — Storefront — Changelog

---

## STOREFRONT_S2S3_QA SPEC
**Status:** ✅ Executor complete on develop (ERP only); storefront file criteria pending Daniel local check
**Date:** 2026-04-16
**Foreman verdict:** pending
**Scope:** QA verification of sessions 2+3 storefront changes + 2 DB language quality fixes (Prizma tenant, EN `/optometry/` + RU `/שאלות-ותשובות/`).

### DB Changes (via Supabase MCP — no migration file)

| Fix | Scope | Change |
|-----|-------|--------|
| EN optometry hero title | `slug='/optometry/' AND lang='en'` | "Vision that finds the precision." → "Precision vision, personal care." |
| RU FAQ em-dash | `slug='/שאלות-ותשובות/' AND lang='ru'` | ` - до` → ` — до` (typographic em-dash) |

### ERP Commits

| Commit | Scope |
|--------|-------|
| (Commit 1) | `qa(m3): apply EN/RU language quality fixes from S2S3 audit` — SESSION_CONTEXT partial update |
| (Commit 2 — this commit) | `chore(spec): close STOREFRONT_S2S3_QA with retrospective` — EXECUTION_REPORT + FINDINGS + SESSION_CONTEXT full + CHANGELOG |

### QA Results Summary

| Criteria group | Status |
|----------------|--------|
| /about/ DB structure (criteria 11–17) | ✅ ALL PASS |
| EN optometry title fix (criterion 18) | ✅ PASS |
| RU FAQ em-dash fix (criterion 19) | ✅ PASS |
| Storefront file checks (criteria 1–10, 20–21) | ⚠️ NOT VERIFIED (storefront folder not mounted) |
| Daniel-side visual checks | Pending Daniel |

---

## Homepage Luxury Revisions R2 SPEC
**Status:** ✅ Executor complete on develop (both repos); awaiting FOREMAN_REVIEW
**Date:** 2026-04-16
**Foreman verdict:** pending
**Scope:** Hebrew homepage row only (`tenant_id='6ad0781b-...' AND slug='/' AND lang='he'`). EN + RU rows EXPLICITLY UNCHANGED (verified via `updated_at` baseline preserved).

### Commits

**Storefront (`opticup-storefront/develop`, 2 commits):**

| Commit | Scope |
|--------|-------|
| `faa31c5` | fix(blocks): marquee respects prefers-reduced-motion via animation-play-state |
| `2d4173f` | fix(blocks): dark-on-dark contrast + font unification on luxury homepage blocks (7 renderers + global.css) |

**ERP (`opticup/develop`, 1 commit):**

| Commit | Scope |
|--------|-------|
| (this commit) | docs(m3): close HOMEPAGE_LUXURY_REVISIONS_R2 retrospective + SESSION_CONTEXT + CHANGELOG (HE row UPDATE applied via Supabase MCP, no migration file) |

### Block deltas (Prizma HE row, before R2 → after R2)

| Block | Change |
|-------|--------|
| hero_luxury | UNCHANGED (Daniel R2 directive: "keep") |
| brand_strip | UNCHANGED data (renderer-only `prefers-reduced-motion` polish in `faa31c5`) |
| **NEW exhibitions** (`events_showcase` type, id `exhibitions-home-he`) | INSERTED at index 2. section_title "מהתערוכות בעולם — לחנות שלנו"; subtitle "פעמיים בשנה אנחנו טסים לתערוכות בפריז ובמילאנו, ועוצרים גם בתערוכה הישראלית. ככה זה נראה משם."; 3 events: Paris (`XvfUYI87jso`) / Milano (`E8xt6Oj-QQw`) / Israel (`hOCxDNFEjWA`), all `aspect_ratio: 9/16`, `autoplay_muted: true`. `bg_color: white` to avoid stacking with the black `events-showcase` below. |
| story_teaser | REWRITTEN. title `40 שנה של בחירה` → `נעים מאוד, אופטיקה פריזמה`. body re-themed: opens with `<strong class="text-gold">אופטיקה פריזמה</strong>` (gold via `@theme { --color-gold }`), narrative shifts from "we travel to curate" (now in exhibitions block) to "introduction + heritage + process". Image UNCHANGED (`IMG-20241230-WA0096_1775230678239.webp`) per Daniel 2026-04-16 deferral. CTA, layout, eyebrow unchanged. |
| events_showcase | UNCHANGED data; renderer dark-bg contrast handled via `section.bg-black` rules in `global.css` (commit `2d4173f`). |
| tier2_grid | UNCHANGED data (renderer font-serif removed in `2d4173f`). |
| optometry_teaser | UNCHANGED data (renderer font-serif removed in `2d4173f`). |
| visit_us | UNCHANGED data (renderer font-serif removed in `2d4173f`). |

### Cross-cutting fixes (apply to ALL pages using these renderers, not just homepage)

| Concern | Fix |
|---------|-----|
| Marquee `prefers-reduced-motion` | `animation: none` → `animation-play-state: paused` in `global.css` (matches SPEC criterion #13 verify literal) |
| Dark-on-dark headings on `bg_color: black` sections | 5 CSS rules in `global.css` (`section.bg-black h1/h2/h3 → white`, `text-gray-900/700/600` → light variants) — wins on specificity (0,2,1) over single utility class (0,1,0) |
| Tailwind `font-serif` (Georgia/Times) on luxury renderers' headings | Removed from 8 occurrences across 7 renderers; headings inherit canonical Rubik (HE) / Inter (EN/RU) from body. One documented exception: decorative "40" span in `StoryTeaserBlock.astro:59` (only renders when `data.image` is missing — never live for HE row) |

---

## Homepage Luxury Revisions SPEC
**Status:** ✅ Executor complete on develop (both repos); awaiting FOREMAN_REVIEW
**Date:** 2026-04-16
**Foreman verdict:** pending (retrospective just landed)
**Scope:** Hebrew homepage row only (`tenant_id='6ad0781b-...' AND slug='/' AND lang='he'`). EN + RU rows EXPLICITLY UNCHANGED — deferred to `LANGUAGES_FIX` SPEC.

### Commits

**Storefront (`opticup-storefront/develop`, 3 commits):**

| Commit | Scope |
|--------|-------|
| `2547df6` | fix(storefront): BrandStripBlock auto-rotating carousel via shared marquee CSS |
| `0c1bc42` | feat(storefront): Tier2GridBlock supports style="carousel" via shared marquee |
| `1e4347a` | data(prizma): homepage HE revisions — new hero video, tier1_spotlight removed, story rewritten, tier2 carousel (migration 125, embeds pre-migration JSONB snapshot) |

**ERP (`opticup/develop`, 2 commits):**

| Commit | Scope |
|--------|-------|
| `8c6e69c` | chore(studio): register style:carousel option for tier2_grid block schema |
| (this commit) | docs(m3): close HOMEPAGE_LUXURY_REVISIONS retrospective + SESSION_CONTEXT + CHANGELOG + MASTER_ROADMAP |

### Block deltas (Prizma HE row, before → after migration 125)

| Block | Change |
|-------|--------|
| hero_luxury | NEW video `lz55pwuy9wc` (was `40f1I0eOR7s`); overlay 0.65 → 0.80; title rewritten ("משקפי יוקרה ממיטב המותגים..."); subtitle simplified; primary CTA "מעבר לקולקציות"; secondary "תיאום בדיקת ראיה"; eyebrow KEPT (judgment call D1) |
| brand_strip | section_title → "מיטב המותגים המובילים בעולם"; style stays "carousel" but now actually rotates (renderer fix in 2547df6); 11 brands unchanged |
| tier1_spotlight | **REMOVED from JSONB array.** Renderer file `Tier1SpotlightBlock.astro` + Studio schema entry `tier1_spotlight` RETAINED on disk per Rule 20 (other tenants/locales may use them) |
| story_teaser | title → "40 שנה של בחירה" (judgment call D2 — aligns with new body theme of choice); body rewritten in 3 paragraphs containing Daniel's anchor phrase "הסבירות שלא תמצאו את המסגרת ההכי מתאימה לכם היא אפסית"; image set to existing Prizma store photo `media_library.id=a2fcf78a-...` (IMG-20241230-WA0096 landscape webp, judgment call D3) |
| events_showcase | UNCHANGED |
| tier2_grid | NEW `data.style="carousel"` (auto-marquee via 0c1bc42); existing 6 brands unchanged; section_title unchanged |
| optometry_teaser | UNCHANGED |
| visit_us | UNCHANGED |

**Final block_count: 7** (was 8). Order: `[hero_luxury, brand_strip, story_teaser, events_showcase, tier2_grid, optometry_teaser, visit_us]`.

### Retrospective + findings

- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/EXECUTION_REPORT.md` (executor self-score 9.5/10, 2 executor-skill proposals)
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/FINDINGS.md`:
  - **M3-EXEC-DEBT-01** (LOW) — `STOREFRONT_CMS_ARCHITECTURE.md` reference file named in SPEC §11 doesn't exist on disk → TECH_DEBT (Foreman authors)
  - **M3-REPO-DRIFT-01** (LOW) — 5 pre-existing untracked SPEC artifacts in ERP repo from earlier sessions → NEW_SPEC sweep
  - Continued tech-debt note: `studio-block-schemas.js` 627 → 630 lines (Rule 12), already-known M3-R12-STUDIO-01 — no re-file

---

## Homepage + Header Luxury Redesign SPEC
**Status:** ✅ Executor complete on develop (both repos); awaiting FOREMAN_REVIEW
**Date:** 2026-04-16
**Foreman verdict:** pending (retrospective just landed)
**Re-scope:** Option D (CMS-native block architecture) — original plan assumed Astro source files, §5 stop-trigger fired when executor's Step 1 inventory revealed Homepage, About, and Multifocal-Guide are CMS records in `storefront_pages`

### Commits

**Storefront (`opticup-storefront/develop`, 7 commits):**

| Commit | Scope |
|--------|-------|
| `ac7ea8a` | feat(blocks): add 8 luxury-boutique block renderers + type defs |
| `caa5b5b` | feat(blocks): dispatch 8 luxury block types + split types-luxury + i18n |
| `383cb89` | refactor(blocks): flatten luxury CTA data shapes to match Studio schema |
| `0a361c0` | feat(header): restructure nav to 6 luxury-boutique items; remove Blog + Multifocal + Lab |
| `f7afae9` | chore(content): populate Prizma Homepage CMS blocks (he/en/ru) — migration 123 |
| `329d5e6` | chore(content): rewrite About + seed Optometry CMS pages (he/en/ru) — migration 124 |
| `b94554f` | chore(redirects): 301 /multifocal-guide → /optometry (single-hop, per locale) |

**ERP (`opticup/develop`, 2 commits):**

| Commit | Scope |
|--------|-------|
| `1b5d822` | feat(studio): register 8 luxury-boutique block types in editor |
| (this commit) | docs(m3-redesign): close HOMEPAGE_HEADER_LUXURY_REDESIGN with retrospective |

### Key Content (before → after)

| Route | Before | After |
|-------|--------|-------|
| `/` (he/en/ru) | 9 blocks: hero, 2×columns, steps, products, brands, video, blog_carousel, contact (WP-parity) | 8 blocks: hero_luxury, brand_strip, tier1_spotlight, story_teaser, tier2_grid, events_showcase, optometry_teaser, visit_us |
| `/about/` (he/en/ru) | Legacy copy | 5 blocks: hero_luxury + 2×story_teaser (Roots + Pivot) + events_showcase (3 exhibition YouTube Shorts: `XvfUYI87jso`/`E8xt6Oj-QQw`/`hOCxDNFEjWA`) + optometry_teaser closing |
| `/optometry/` (he/en/ru) | Did not exist | NEW 5 blocks: hero_luxury + optometry_teaser + text (multifocal explainer) + steps (4-step fitting process) + visit_us |
| `/multifocal-guide/` (he/en/ru) | CMS page | Still a CMS page, but vercel.json 301s all public traffic to `/optometry/` |

### Header (before → after)

| Position | Before (6 items) | After (6 items) |
|---|---|---|
| 1 | משקפי שמש | משקפי ראייה |
| 2 | מסגרות ראייה | משקפי שמש |
| 3 | מותגים | מותגים |
| 4 | בלוג (removed) | אופטומטריה (NEW) |
| 5 | משקפי מולטיפוקל (removed) | הסיפור שלנו (NEW) |
| 6 | מעבדת מסגורים (removed) | יצירת קשר (NEW — anchors to `#contact`) |

### Key Architecture

- **New block types:** hero_luxury, brand_strip, tier1_spotlight, story_teaser, tier2_grid, events_showcase, optometry_teaser, visit_us (8 types total). Registered in `src/components/blocks/BlockRenderer.astro` dispatch + `src/lib/blocks/types-luxury.ts` + ERP `modules/storefront/studio-block-schemas.js`.
- **All renderers tenant-agnostic** (Rule 20): content flows via `block.data` JSONB; brand enrichment queries `v_storefront_brands` by slug using provided `tenantId` prop.
- **Type file split:** `types.ts` exceeded Rule 12's 350-line limit after the 8 new block classes were added; split `types-luxury.ts` brings `types.ts` to 348 lines.
- **Multifocal 301 chain:** all `/multifocal-guide/` routes (he/en/ru) + `/multifocal/` + `/multifocal-glasses` now 301 to `/optometry/` (single-hop per SPEC §3 criterion 16).

### Findings Logged (4)

- **M3-SPEC-REDESIGN-01** LOW — `vercel.json` redirects don't fire on `npm run dev`; SPEC criterion 16 unverifiable locally (verify on Vercel Preview post-deploy).
- **M3-CMS-DEBT-01** MEDIUM — `storefront_pages_backups` table does not exist; recommend NEW_SPEC to create it before next CMS-content-heavy SPEC.
- **M3-R12-STUDIO-01** MEDIUM — `modules/storefront/studio-block-schemas.js` now 627 lines (pre-existing oversized per M1-R12-02 Guardian alert; my +142 lines made it worse).
- **M3-CMS-DEBT-02** LOW — stale `/multifocal-guide/` CMS rows remain `status='published'` after 301 redirect; suggest archiving in follow-up sweep.

### Action Required
- Daniel runs QA on localhost:4321 (/, /about/, /optometry/, multifocal-guide → /optometry/ 301 verification against Vercel Preview)
- Daniel reviews hero copy + story narrative + Tier-1 tag-lines (Q4 post-commit review per SPEC §10)
- Authoring follow-up SPEC `CONTACT_FORM_FIX` (launch blocker, per SPEC §7 Out of Scope #1)

### Next
- FOREMAN_REVIEW.md (opticup-strategic adds after reading this + EXECUTION_REPORT + FINDINGS)
- Merge develop → main in both repos once Daniel's QA passes
- DNS switch

---

## Pre-Merge SEO Fixes SPEC
**Status:** ✅ All 9 fix tasks on develop (both repos)
**Date:** 2026-04-16
**Foreman verdict:** 🟡 closed with follow-ups (documentation drift fixed in close-out sync commit)

### Commits

**Storefront (`opticup-storefront/develop`, 5 commits):**

| Commit | Scope |
|--------|-------|
| `1739f49` | fix(seo): fix blog sitemap broken entries + locale 404 handling (Tasks 1, 3, 6) |
| `0047e1f` | fix(seo): add og:image fallback to tenant logo in BaseLayout (Task 2) |
| `f3a855f` | fix(seo): flatten redirect chains via handler-level 404 for unknown slugs (Tasks 4, 5) |
| `c8789e9` | chore(seo): dedupe title suffix + guarantee img alt on blog content (T