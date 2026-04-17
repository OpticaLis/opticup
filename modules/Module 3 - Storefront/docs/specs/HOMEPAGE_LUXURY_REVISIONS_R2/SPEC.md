# SPEC — HOMEPAGE_LUXURY_REVISIONS_R2

> **Location:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Cowork session relaxed-dreamy-gates
> **Authored on:** 2026-04-16
> **Module:** 3 — Storefront
> **Phase:** Module 3 close-out polish (post-R1 revisions)
> **Depends on:** HOMEPAGE_LUXURY_REVISIONS (🟢 CLOSED 2026-04-16, commit `3a88d1c`)

---

## 1. Goal

Apply Daniel's round-2 block-by-block feedback to the HE homepage so the luxury boutique layout reads and feels the way he intended before we continue to NAV_FIX. Three material changes: (a) make both auto-scrolling brand strips truly continuous — no empty screen — using a twin-duplicated marquee track; (b) insert a new "exhibitions" block between BrandStrip and StoryTeaser showing three short-form videos from Paris / Milano / Israel; (c) rewrite the StoryTeaser to open "נעים מאוד, אופטיקה פריזמה" with brand name emphasized in gold and the new store photo as the visual anchor. Bundled with a dark-on-dark contrast audit across all blocks with `bg_color: "black"` and a content-quality pass applying israeli-content-marketing + israeli-social-content principles (dugri tone, ivrit meduberet, hook-first, mobile paragraph breaks).

---

## 2. Background & Motivation

R1 (HOMEPAGE_LUXURY_REVISIONS, commit `3a88d1c`) landed 7 HE blocks — Hero, BrandStrip, StoryTeaser, Events, Tier2Grid, Optometry, VisitUs — with the `style: "carousel"` field set on BrandStrip + Tier2Grid. Daniel reviewed the deployed result on 2026-04-16 and gave a block-by-block retrospective:

- **Hero:** keep as-is.
- **BrandStrip carousel:** *super important* — screen must never be empty. When a logo exits left it must wrap and re-enter from the right with zero gap. R1's current CSS `@keyframes` likely animates a single track by `-100%` which creates a wrap-around blank frame.
- **New block requested:** exhibitions showcase between BrandStrip and StoryTeaser — three YouTube Shorts (Paris / Milano / Israel) telling the aspirational "we travel to curate" story.
- **StoryTeaser:** reframe as "נעים מאוד, אופטיקה פריזמה" with the brand name rendered in gold, swap the visual to a new store photo Daniel attached.
- **EventsShowcase:** keep.
- **Tier2Grid:** same marquee-continuity fix as BrandStrip.
- **Optometry / VisitUs:** keep.

Daniel also flagged a cross-cutting design issue: some blocks with dark backgrounds render headings in a dark color, making them barely visible on the deployed page. And he granted explicit latitude to "go slightly beyond" his literal wording on copy where a better Israeli-native phrasing exists.

The skill improvements from R1's FOREMAN_REVIEW (A1 + A2 strategic, E1 + E2 executor — commit `3a88d1c` on develop) are live for this SPEC. The executor's E1 skill-reference-path disambiguator applies directly; E2's migration-folder auto-detect does not apply because this SPEC has no SQL migration under `sql/` or `supabase/migrations/`.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, no unrelated file changes | `git status` → clean or only files listed in §8 |
| 2 | Commits produced | 3 commits (1 ERP + 2 storefront) | `git log origin/develop..HEAD --oneline \| wc -l` → 3 across both repos combined |
| 3 | HE home blocks count | 8 (was 7) | `SELECT jsonb_array_length(blocks) FROM storefront_pages WHERE slug='/' AND lang='he' AND tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND is_deleted IS NOT TRUE` → 8 |
| 4 | HE home block order | `[hero_luxury, brand_strip, events_showcase, story_teaser, events_showcase, tier2_grid, optometry_teaser, visit_us]` | `SELECT jsonb_path_query_array(blocks, '$[*].type') FROM storefront_pages …` → exact array match |
| 5 | New exhibitions block id | `exhibitions-home-he` | Block at index 2 has `id = 'exhibitions-home-he'` and `data.section_title` mentions תערוכות |
| 6 | Exhibitions block has 3 videos | YouTube IDs `XvfUYI87jso`, `E8xt6Oj-QQw`, `hOCxDNFEjWA` | All three IDs present in that block's `data.events[*].youtube_id` |
| 7 | StoryTeaser title | `"נעים מאוד, אופטיקה פריזמה"` (or equivalent dugri rephrasing with Daniel-approved brand placement) | `SELECT blocks->3->'data'->>'title' …` matches |
| 8 | StoryTeaser body contains gold-emphasized brand name | HTML body contains `<strong class="text-gold-500">אופטיקה פריזמה</strong>` (or the storefront's existing gold-accent class — whichever the Tailwind config resolves to a warm-gold hex) | `grep -o 'text-gold\|text-\[#[Cc][0-9A-Fa-f]' <body_html>` → ≥1 hit |
| 9 | StoryTeaser image | **Unchanged** — swap deferred per Daniel 2026-04-16 ("אפשר להשתמש בקיימת אם נצטרך אחרי זה נחליף"). Existing `/api/image/media/6ad0781b.../general/IMG-20241230-WA0096_1775230678239.webp` stays. | `SELECT blocks->3->'data'->>'image' …` → identical to pre-SPEC value |
| 10 | EN + RU home rows | Unchanged | `SELECT updated_at FROM storefront_pages WHERE slug='/' AND lang IN ('en','ru') …` → same as pre-SPEC |
| 11 | BrandStrip marquee continuity | No blank wrap frame — track is duplicated ×2 and animated `translateX(-50%)` infinite | Visual inspection on `localhost:4321` + code inspection of `BrandStripBlock.astro` + its keyframes |
| 12 | Tier2Grid marquee continuity | Same as #11, applied to Tier2Grid when `data.style === 'carousel'` | Visual + code inspection |
| 13 | Marquee respects `prefers-reduced-motion` | When the media query matches, animation is paused (`animation-play-state: paused`) | Toggle the media query via DevTools → inspect element style |
| 14 | Rule 20 (SaaS litmus) — marquee is a renderer fix, not tenant-specific | The CSS change lives in the shared renderer file — any tenant using BrandStrip/Tier2Grid inherits the fix without code changes | File grep for tenant-id hardcoding in the keyframes → 0 hits |
| 15 | Contrast audit — blocks with dark `bg_color` | Every heading + paragraph rendered on a black/dark background uses a light color (gold, white, gray-200/100); zero dark-on-dark findings | Executor-produced audit table in EXECUTION_REPORT §2, with before/after Tailwind class per occurrence |
| 16 | Content quality pass — HE homepage copy | Every `title`, `subtitle`, `eyebrow`, `section_title`, and `body` on the HE row either (a) passes the israeli-content-marketing + israeli-social-content checklist in §11, or (b) is flagged with a justification for keeping as-is | Executor-produced checklist in EXECUTION_REPORT §3, at least one revised line per block that needed it |
| 17 | `npm run build` on storefront | Passes, 0 errors | In storefront repo: `npm run build` → exit 0 |
| 18 | Safety-net script | Passes (Rule 30) | `npm run safety-net` → exit 0 |
| 19 | Homepage route renders without console errors | 0 errors on `localhost:4321/` | Open in browser, observe console |
| 20 | EXECUTION_REPORT.md + FINDINGS.md | Written at SPEC close to this folder | `ls modules/Module\ 3\ -\ Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/` shows both |
| 21 | Font unified with rest of site | HE homepage blocks use the SAME font family as the rest of the storefront (non-homepage pages). If R1's luxury redesign introduced a display/serif font specifically for hero or headings (e.g., a Tailwind `font-serif`, custom `@font-face`, or block-scoped `font-family`), revert those homepage block usages to the site's canonical font family — OR if there's deliberate intent (e.g., Hero logotype), document the exception in EXECUTION_REPORT §4. | Executor audit: (1) identify canonical font by grepping `tailwind.config.*` for `fontFamily` + inspecting a non-homepage page (e.g., `/about`, `/products`) on `localhost:4321`; (2) inspect each HE homepage block's rendered font in DevTools; (3) list divergences in EXECUTION_REPORT §4 with before/after class names. Zero unjustified divergences remaining at SPEC close. |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- All ERP-side + storefront-side file reads.
- Supabase MCP read-only SQL (Level 1).
- One targeted UPDATE on `storefront_pages` scoped to `tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND slug='/' AND lang='he'` (Level 2, authorized by this SPEC).
- Edit the marquee CSS + JSX of `BrandStripBlock.astro`, `Tier2GridBlock.astro`, and any shared marquee utility under `src/components/blocks/` or `src/lib/`.
- Rewrite HE copy on this one page per §11's principles — latitude granted.
- Run storefront build + safety-net + dev server.
- ~~Upload exactly one image to Supabase Storage~~ — **NOT IN SCOPE for R2.** Daniel approved keeping the existing StoryTeaser image on 2026-04-16; image swap is deferred to a follow-up SPEC if/when a replacement photo is provided.
- Commit + push to develop on both repos.
- Write EXECUTION_REPORT.md + FINDINGS.md to this SPEC folder at close.

### What REQUIRES stopping and reporting

- Anything outside the HE row of `storefront_pages.blocks`.
- Any schema change (DDL) — not needed for this SPEC; if tempted, stop.
- Touching EN or RU rows.
- Any marquee CSS change that would require a new block type or new Studio schema field (should not be needed — we're fixing the existing renderer).
- Any new npm dependency.
- ~~Daniel's store photo unavailable at dispatch time~~ — **RESOLVED 2026-04-16**: Daniel authorized keeping the existing image. No photo-coordination stop-trigger remains.
- Build or safety-net failure not resolvable in a single retry.
- Any discovery that `style: 'carousel'` on BrandStrip/Tier2Grid is actually not wired end-to-end in R1 — STOP and report (would turn this into a bigger SPEC).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `SELECT jsonb_array_length(blocks)` after UPDATE returns anything other than 8 for HE — STOP, roll back the UPDATE.
- If after marquee CSS edit the hero video disappears, stutters, or any non-homepage page loses content — STOP.
- If `npm run safety-net` visual snapshot diff shows changes on pages OTHER than `/` (HE) — STOP.
- If EN or RU home row `updated_at` changes during this SPEC — STOP (means the UPDATE's WHERE clause was too broad).
- If the contrast audit finds more than 8 dark-on-dark occurrences — STOP and report; that scope may exceed this SPEC.

---

## 6. Rollback Plan

- **ERP repo:** `git reset --hard {START_ERP_SHA}` — where START_ERP_SHA is captured in EXECUTION_REPORT §0 before any change.
- **Storefront repo:** `git reset --hard {START_STOREFRONT_SHA}` — same.
- **DB state:** the UPDATE touches exactly one row. Before running it, `SELECT blocks INTO TEMP backup_he …` and include the full pre-state JSONB in EXECUTION_REPORT §0. If rollback needed: `UPDATE storefront_pages SET blocks = '{pre_state}'::jsonb WHERE …` with the same WHERE.
- **Supabase Storage:** if the new image was uploaded, delete it via `storage.objects DELETE WHERE name = 'media/6ad0781b-.../general/{filename}.webp'`.
- SPEC verdict if rolled back: REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit)

- EN and RU homepage rows — untouched. (R1 already established this pattern; it held.)
- Any page other than `/` (home).
- Any tenant other than Prizma (no tenant-agnostic template changes; the renderer fix IS shared, but its behavior is identical for all tenants by design — Rule 20).
- The Studio `studio-block-schemas.js` file — no new fields introduced in this SPEC. Marquee is a renderer/CSS change, not a schema change.
- Creating a new `exhibitions_showcase` block type. We reuse `events_showcase` with a different `data.section_title` + different content. Rationale: events_showcase already supports `youtube_id`, `aspect_ratio: 9/16`, `autoplay_muted` — adding a new type would require Studio schema work for ~zero user-visible benefit on this page.
- **StoryTeaser image swap** — deferred per Daniel 2026-04-16. The existing image stays; a follow-up SPEC can swap when a replacement photo is provided.
- **Supabase Storage uploads** — none. No image assets created in this SPEC.
- NAV_FIX, LANGUAGES_FIX, CONTACT_FORM_FIX — all queued after this SPEC closes.
- M3_SPEC_FOLDER_SWEEP — still in the side queue; not pulled in here.

---

## 8. Expected Final State

### ERP repo — new files
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/SPEC.md` (this file)
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/EXECUTION_REPORT.md` (executor, at close)
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/FINDINGS.md` (executor, at close)

### ERP repo — modified files
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — replace "Next gate" section with: R2 closed, next NAV_FIX; update last-commit line.
- `modules/Module 3 - Storefront/docs/CHANGELOG.md` — add HOMEPAGE_LUXURY_REVISIONS_R2 entry with commit hashes.

### Storefront repo — modified files
- `src/components/blocks/BrandStripBlock.astro` — twin-duplicated marquee track when `data.style === 'carousel'`; CSS `@keyframes` animates `translateX(-50%)` infinite. Respects `prefers-reduced-motion`.
- `src/components/blocks/Tier2GridBlock.astro` — same marquee pattern when `data.style === 'carousel'`; backward-compatible when `data.style === 'grid'`.
- Any shared utility (if extracted) — e.g., `src/lib/marquee.ts` or a CSS `@layer` block. Keep under 350 lines per Rule 12.
- Any heading color fix required by the contrast audit — lives in the specific block renderer's JSX (not global CSS).

### Storefront repo — deleted files
- None.

### DB state — one row UPDATE
Target row: `storefront_pages WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND slug='/' AND lang='he' AND is_deleted IS NOT TRUE`

New `blocks` JSONB array (8 elements, in this order):
1. `hero_luxury` — **unchanged** (`id: hero-luxury-home-he`). If the content-quality pass finds a hook-level improvement to `data.title` / `data.subtitle` / `data.eyebrow`, the executor may apply it under §11 latitude — otherwise preserve verbatim.
2. `brand_strip` — **unchanged data**, id `brand-strip-home-he`. The marquee fix lives in the renderer, not the JSONB.
3. `events_showcase` — **NEW**, id `exhibitions-home-he`. Payload:
   ```json
   {
     "id": "exhibitions-home-he",
     "type": "events_showcase",
     "data": {
       "section_title": "{dugri Hebrew copy about sourcing frames at international exhibitions}",
       "subtitle": "{one-line teaser — Paris / Milano / Israel, mobile-readable}",
       "events": [
         { "title": "פריז", "youtube_id": "XvfUYI87jso", "description": "{1-line}", "aspect_ratio": "9/16", "autoplay_muted": true },
         { "title": "מילאנו", "youtube_id": "E8xt6Oj-QQw", "description": "{1-line}", "aspect_ratio": "9/16", "autoplay_muted": true },
         { "title": "ישראל", "youtube_id": "hOCxDNFEjWA", "description": "{1-line}", "aspect_ratio": "9/16", "autoplay_muted": true }
       ]
     },
     "settings": { "padding": "py-16 md:py-24", "bg_color": "{choose light OR dark — if dark, mandatory light headings per §11}", "max_width": "wide" }
   }
   ```
   Executor authors the Hebrew copy inside `{}` placeholders per §11.
4. `story_teaser` — **REWRITTEN**, id `story-teaser-home-he`. Changes:
   - `data.title` → `"נעים מאוד, אופטיקה פריזמה"` (or executor's dugri rephrasing with brand at the natural spot).
   - `data.body` → rewritten HTML with `<strong class="text-gold-500">אופטיקה פריזמה</strong>` (or the storefront's existing gold-accent class; if no class exists, use `<strong style="color: #C9A961">` — a warm gold). Preserve the 40-years-of-choice narrative, mobile-short paragraphs (2–3 sentences each), ivrit meduberet.
   - `data.eyebrow` → keep or lightly refresh ("40 שנה של אופטיקה" reads well; executor judgment).
   - `data.image` → **UNCHANGED** — keep `/api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/general/IMG-20241230-WA0096_1775230678239.webp` (Daniel approved deferring swap on 2026-04-16).
   - `data.cta_text` / `data.cta_url` / `data.cta_style` — unchanged.
   - `settings.bg_color` — unchanged unless contrast audit requires.
5. `events_showcase` — **unchanged**, id `events-showcase-home-he` (the "אירועים, השקות, ולקוחות שלנו" block). Contrast audit may adjust heading color because `settings.bg_color === "black"`.
6. `tier2_grid` — **unchanged data**, id `tier2-grid-home-he`. Marquee fix lives in the renderer.
7. `optometry_teaser` — **unchanged**, id `optometry-teaser-home-he`.
8. `visit_us` — **unchanged**, id `visit-us-home-he`.

### Supabase Storage
- New object at `media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/general/{ascii-filename}.webp` (if Daniel provides the file at dispatch time).

### Docs updated (MUST include)
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — Next-gate flipped from "R2" to "NAV_FIX".
- `modules/Module 3 - Storefront/docs/CHANGELOG.md` — new entry with commit hashes.
- `MASTER_ROADMAP.md` — **NOT updated** in this SPEC (Module 3 still open; R2 is polish, not phase close).
- `docs/GLOBAL_MAP.md` / `docs/GLOBAL_SCHEMA.sql` — NOT updated (no new contracts, no new DB objects).

---

## 9. Commit Plan

Per A1 proposal from PRE_MERGE_SEO_FIXES FOREMAN_REVIEW ("per-file deltas, not just filenames"), each commit lists what changes in each file.

**Storefront repo — Commit 1:** `feat(blocks): seamless marquee for BrandStrip and Tier2Grid carousel style`
- `src/components/blocks/BrandStripBlock.astro` — wrap brand list in `<div class="marquee-track">` containing the list twice; add CSS keyframes animating `translateX(-50%)` infinite; respect `prefers-reduced-motion`.
- `src/components/blocks/Tier2GridBlock.astro` — same pattern under `data.style === 'carousel'`; `data.style === 'grid'` branch unchanged (Rule 20 backward compat).
- (Optional) extract shared marquee CSS to `src/styles/marquee.css` or a `@layer` block — only if both renderers would duplicate >20 lines; otherwise inline is fine.

**Storefront repo — Commit 2:** `fix(blocks): dark-on-dark heading contrast + font unification + HE content quality pass on homepage`
- Heading/text color fixes per the executor's audit (file:lines per occurrence).
- Font-family fixes per criterion #21 audit — revert any homepage-only display/serif font to the site's canonical font family. Document exceptions in EXECUTION_REPORT §4.
- `data.image` is DB-only — no code changes here for the photo swap.

**ERP repo — Commit 3:** `feat(m3): HE home R2 — exhibitions block + StoryTeaser rewrite + JSONB update + SPEC close`
- Supabase UPDATE on the HE homepage row (executed via Supabase MCP; no migration file needed — this is data, not schema).
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/SPEC.md` — new.
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/EXECUTION_REPORT.md` — new.
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/FINDINGS.md` — new.
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — "Next gate" section replaced with NAV_FIX cue.
- `modules/Module 3 - Storefront/docs/CHANGELOG.md` — append R2 entry with storefront commit hashes 1 + 2.

Commit ordering: Commits 1 + 2 in storefront repo land BEFORE Commit 3 in ERP repo — so the ERP SESSION_CONTEXT can cite the storefront hashes.

---

## 10. Dependencies / Preconditions

- HOMEPAGE_LUXURY_REVISIONS (R1) closed — commit `3a88d1c` on develop. ✅
- Skill commits from R1 review (`3a88d1c`) applied — A1/A2 strategic + E1/E2 executor. ✅
- Storefront repo cloned locally on executor's machine; branch `develop`; clean working tree per CLAUDE.md §1 First Action.
- Supabase MCP available; Level 2 SQL authority on Prizma scope.
- `localhost:4321` (storefront) + `localhost:3000` (ERP) dev servers available for testing.
- **⚠️ Daniel's store photo for StoryTeaser:** the image Daniel attached to his R2 feedback lives only in that chat's message context. It is NOT in the Cowork sandbox's uploads folder and will NOT be in the executor's environment. The executor MUST, at dispatch time, request the file from Daniel via Windows (e.g., drop into `C:\Users\User\opticup\attachments\` or similar), save it with an ASCII filename (per prior FINDING: no Hebrew in Storage paths), upload to Supabase Storage, and then use the `/api/image/...` URL in `data.image`. If Daniel is unavailable, **leave the existing image** (`IMG-20241230-WA0096_1775230678239.webp`) and note the swap as a FINDING → follow-up SPEC.

---

## 11. Lessons Already Incorporated + Content-Quality Principles

### Proposals harvested from 3 most recent FOREMAN_REVIEWs

- **FROM `HOMEPAGE_LUXURY_REVISIONS/FOREMAN_REVIEW.md` → A1 (migration-path pre-flight)** → **APPLIED** in §8: this SPEC has no SQL migration — it's a single DB UPDATE executed via Supabase MCP. The executor-side skill edit added in commit `3a88d1c` step 1.5.9 means the executor will detect "no migrations folder involvement" cleanly.
- **FROM `HOMEPAGE_LUXURY_REVISIONS/FOREMAN_REVIEW.md` → A2 (skill-reference path disambiguator)** → **APPLIED**: this SPEC cites no skill-reference files. If future iterations do, they must carry the "repo path, verify via `git show HEAD:<path>`, NOT the plugin install path" note.
- **FROM `HOMEPAGE_LUXURY_REVISIONS/FOREMAN_REVIEW.md` → E1 (repo-vs-plugin path resolution)** → **APPLIED**: already live in opticup-executor SKILL.md step 5.5 as of commit `3a88d1c`. Executor will use `git show HEAD:<path>`.
- **FROM `HOMEPAGE_LUXURY_REVISIONS/FOREMAN_REVIEW.md` → E2 (migration folder auto-detect)** → **NOT APPLICABLE** (no migration in this SPEC).
- **FROM `HOMEPAGE_HEADER_LUXURY_REDESIGN/FOREMAN_REVIEW.md` → A1 (Rule 20 fallback check before deletion)** → **APPLIED** in §7 Out of Scope: we're NOT deleting `events_showcase`; we're reusing it. No renderer or Studio schema gets removed.
- **FROM `HOMEPAGE_HEADER_LUXURY_REDESIGN/FOREMAN_REVIEW.md` → E1 (mandatory pre-migration SELECT snapshot)** → **APPLIED** in §6: pre-UPDATE SELECT captured into EXECUTION_REPORT §0 before any write.
- **FROM `HOMEPAGE_HEADER_LUXURY_REDESIGN/FOREMAN_REVIEW.md` → E2 (`git show`-based verification)** → **APPLIED** implicitly via the inherited skill edits.
- **FROM `PRE_MERGE_SEO_FIXES/FOREMAN_REVIEW.md` → A1 (per-file deltas in Commit Plan)** → **APPLIED** in §9 (each commit lists what changes in each file, not just filenames).
- **FROM `PRE_MERGE_SEO_FIXES/FOREMAN_REVIEW.md` → A2 (validate audit-finding classifications)** → **NOT APPLICABLE** (this SPEC is not grounded in an external audit).
- **FROM `PRE_MERGE_SEO_FIXES/FOREMAN_REVIEW.md` → E1 (commit-plan reconciliation before final commit)** → **APPLIED** via §9 + executor's retrospective step.
- **FROM `PRE_MERGE_SEO_FIXES/FOREMAN_REVIEW.md` → E2 (file:lines in EXECUTION_REPORT §2)** → **APPLIED** — executor is expected to cite file + line range per change in their report.

### Israeli content-marketing checklist (for the §3 #16 content-quality pass)

Sourced from `skills-il/marketing-growth` (npm `skills-il@1.5.1`) skills `israeli-content-marketing` + `israeli-social-content`. Apply to every HE copy field on the page:

1. **Ivrit meduberet, not formal Hebrew.** "יש לי" not "ברשותי"; "אני לא" not "אינני".
2. **Dugri tone.** Direct, honest, personal > corporate-polished. First person is fine.
3. **Hook first.** The first line determines whether the reader stops scrolling.
4. **Mobile paragraph breaks.** One idea per paragraph, blank lines between. Target 2–3 sentences per paragraph max.
5. **Brand/tech terms stay in their original language.** "אופטיקה פריזמה" stays Hebrew, brand names (Cazal, Prada) stay Latin.
6. **Native, not translated.** Hebrew copy must read as if written in Hebrew, not translated from English.
7. **Preserve Daniel-approved phrases.** `"נעים מאוד, אופטיקה פריזמה"`, `"40 שנה של אופטיקה"`, `"בדיקת ראייה מקצועית היא הבסיס לכל בחירה"`, `"בקרו אותנו בחנות"` — these are intact, refine around them.

### Content latitude — per Daniel's explicit 2026-04-16 instruction

> "אני רוצה שתראה אם אפשר להשתמש בסקיל שצירפתי בשביל לשפר את התוכן לרמה ההכי גבוהה לפי הדגשים שלי עם אפשרות לצאת קצת מגזרת המה שאמרתי ולשפר את זה יותר."

The executor has explicit latitude to improve copy *beyond* the literal wording Daniel used in his R2 feedback — as long as the improvement falls within the checklist above, preserves Daniel-approved phrases, and doesn't introduce new factual claims. Document every rewrite in EXECUTION_REPORT §3 with before/after.

---

## 12. Summary for Daniel (Hebrew, 3 sentences)

עדכון גרסה שנייה לעמוד הבית בעברית — סוחפים ורציפים, בלוק חדש של תערוכות (פריז / מילאנו / ישראל), וסיפור "נעים מאוד, אופטיקה פריזמה" עם שם המותג בזהב. כולל תיקון נקודתי לכותרות כהות על רקע כהה, איחוד פונט לאותו פונט כמו שאר האתר, ותיקון תוכן לפי סגנון שיווק ישראלי (דוגרי, מדובר, נייד). אחרי ה-SPEC הזה: NAV_FIX → LANGUAGES_FIX → CONTACT_FORM_FIX.

---

### Amendments log

- **2026-04-16 15:45** — Daniel approved deferring StoryTeaser image swap (keep existing).
- **2026-04-16 ~16:00** — Daniel added "החלף פונט לפונט של שאר האתר" (unify homepage font with rest of site). Added as criterion #21 in §3 + added to Commit 2 description in §9. Executor should re-read §3, §8, §9 before starting.
