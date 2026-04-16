# SPEC — HOMEPAGE_LUXURY_REVISIONS

> **Location:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Cowork session)
> **Authored on:** 2026-04-16
> **Module:** 3 — Storefront
> **Phase:** D (Content + UX iteration post-luxury-redesign)
> **Author signature:** Cowork `relaxed-dreamy-gates` session, Foreman hat

---

## 1. Goal

Update Prizma's Hebrew homepage (`lang='he'`, slug `/`, `tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'`) with Daniel's block-by-block revisions after he viewed the deployed luxury redesign: new hero video, tighter copy, Tier1Spotlight block removed entirely, Story block rewritten, Tier2Grid converted to auto-scrolling carousel. **Hebrew-only scope.** English and Russian rows stay unchanged and are addressed in the follow-up `LANGUAGES_FIX` SPEC.

---

## 2. Background & Motivation

The previous SPEC (`HOMEPAGE_HEADER_LUXURY_REDESIGN`, closed 🟡 2026-04-16) shipped 8 new CMS block types to all 3 locales via migrations 123 + 124A + 124B. After viewing the deployed site, Daniel returned with block-by-block feedback on the Hebrew homepage: new hero video (`lz55pwuy9wc`), darker overlay, rewritten hero copy, removal of the "חמישה בתי עיצוב" block, merged Story block with store photo, and auto-scrolling carousel for Tier2 brands.

Daniel explicitly re-sequenced the follow-up queue on 2026-04-16 late:

1. **This SPEC** — Homepage revisions (HE only)
2. `NAVIGATION_FIX` — broken transitions to `/about/` and `/optometry/`
3. `LANGUAGES_FIX` — EN + RU don't render correctly
4. `CONTACT_FORM_FIX` — launch blocker (was #1, now #4)

All four must land before DNS switch. This SPEC is #1.

**Related artifacts:**
- Prior SPEC: `../HOMEPAGE_HEADER_LUXURY_REDESIGN/SPEC.md` (for block architecture context)
- Prior FOREMAN_REVIEW: `../HOMEPAGE_HEADER_LUXURY_REDESIGN/FOREMAN_REVIEW.md` (4 improvement proposals applied here — see §11)
- Executor reference: `.claude/skills/opticup-executor/references/STOREFRONT_CMS_ARCHITECTURE.md`

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value. The executor verifies each before committing the corresponding step.

### §3.A — Repo state

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Storefront branch | `develop`, clean after commits | `git status` → "nothing to commit, working tree clean" (after all commits landed) |
| 2 | ERP branch | `develop`, clean after commits | same, in ERP repo |
| 3 | Storefront commits produced | 3–5 commits (see §9) | `git log origin/develop..HEAD --oneline \| wc -l` |
| 4 | ERP commits produced | 1–2 commits (schema update if needed, retrospective) | same |

### §3.B — DB state (Prizma HE homepage row)

| # | Criterion | Expected value | Verify query |
|---|-----------|---------------|--------------|
| 5 | HE row block count | 7 (was 8 — tier1_spotlight removed) | `SELECT jsonb_array_length(blocks) FROM storefront_pages WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND slug='/' AND lang='he'` → 7 |
| 6 | HE row block types in order | `['hero_luxury','brand_strip','story_teaser','events_showcase','tier2_grid','optometry_teaser','visit_us']` | `SELECT array_agg(b->>'type' ORDER BY ord) FROM storefront_pages, jsonb_array_elements(blocks) WITH ORDINALITY AS b(b,ord) WHERE tenant_id=... AND slug='/' AND lang='he'` |
| 7 | HE row `updated_at` advances | later than 2026-04-16 09:17:23 UTC (the previous migration's timestamp) | same table |
| 8 | EN row unchanged | block_count=8, same 8 types including tier1_spotlight, `updated_at` NOT advanced | parallel SELECT for `lang='en'` |
| 9 | RU row unchanged | block_count=8, same 8 types including tier1_spotlight, `updated_at` NOT advanced | parallel SELECT for `lang='ru'` |
| 10 | Prizma tenant only affected | zero `UPDATE` affects any other `tenant_id` | migration WHERE clause must include `tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` AND `lang='he'` |

### §3.C — Block content (HE row, post-migration)

| # | Block | Field | Expected value |
|---|-------|-------|----------------|
| 11 | hero_luxury | `data.video_youtube_id` | `lz55pwuy9wc` |
| 12 | hero_luxury | `data.overlay` | `0.8` |
| 13 | hero_luxury | `data.eyebrow` | (Daniel did not redefine — keep existing "קולקציית בוטיק יוקרתית" OR remove if executor judges copy is cleaner without; log decision in EXECUTION_REPORT) |
| 14 | hero_luxury | `data.title` | `"משקפי יוקרה ממיטב המותגים המובילים, נבחרים בקפידה בתערוכות בארץ ובעולם."` |
| 15 | hero_luxury | `data.subtitle` | `"לצד צוות מקצועי ומנוסה בהתאמת עדשות ובדיקות ראייה מתקדמות."` |
| 16 | hero_luxury | `data.primary_cta_text` | `"מעבר לקולקציות"` |
| 17 | hero_luxury | `data.primary_cta_url` | `/brands/` (unchanged) |
| 18 | hero_luxury | `data.secondary_cta_text` | `"תיאום בדיקת ראיה"` |
| 19 | hero_luxury | `data.secondary_cta_url` | `https://yoman.co.il/Prizamaoptic` (unchanged) |
| 20 | brand_strip | `data.section_title` | `"מיטב המותגים המובילים בעולם"` |
| 21 | brand_strip | `data.style` | `"carousel"` (already set; verify renderer actually rotates — see §5 Stop-Trigger) |
| 22 | brand_strip | `data.brands` | keep existing 11 brands (Cazal, John Dalia, KameManNen, Matsuda, Henry Jullien, Prada, Miu Miu, Moscot, Montblanc, Gast, Serengeti) |
| 23 | tier1_spotlight | (entire block) | **REMOVED from HE row's `blocks` array.** Renderer file + Studio schema MUST REMAIN on disk (Rule 20 — other tenants may use it) |
| 24 | story_teaser | `data.title` | Daniel did not redefine title — executor judges (candidate: keep existing "שלושה דורות. שני המשכים. סיפור אחד." or new "40 שנה של בחירה"). Log decision. |
| 25 | story_teaser | `data.body` | Rewritten: MUST include the phrase `"לא משנה אם אתם מחפשים משקפי שמש או ראייה, הסבירות שלא תמצאו את המסגרת ההכי מתאימה לכם היא אפסית"` — rest of body draftable by executor in Prizma-voice, 2–3 short paragraphs |
| 26 | story_teaser | `data.layout` | `"image-end"` (store photo on the end side — RTL = left; existing value is correct, verify) |
| 27 | story_teaser | `data.eyebrow` | keep `"40 שנה של אופטיקה"` |
| 28 | story_teaser | store photo asset | Must be an existing Prizma store photo from `media_library` bucket (do NOT upload new; search for existing row). Log `media_library.id` + URL in EXECUTION_REPORT. If no store photo exists in media_library → STOP, escalate to Foreman. |
| 29 | tier2_grid | `data.section_title` | `"מותגים נוספים בחנות"` (unchanged) |
| 30 | tier2_grid | `data.style` | NEW FIELD: `"carousel"` — slow auto-scroll behavior. See §3.D for renderer extension. |
| 31 | events_showcase | (entire block) | UNCHANGED (Option C approved by Daniel: in-store events + testimonials only; Paris/Milan/IL stay on About page) |
| 32 | optometry_teaser | (entire block) | UNCHANGED |
| 33 | visit_us | (entire block) | UNCHANGED |

### §3.D — Renderer + schema extensions

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 34 | `BrandStrip` renderer actually rotates when `data.style === 'carousel'` | Observed DOM animation / CSS `@keyframes` triggered; slow continuous scroll at ~20–40s per full revolution | Manual browser check on localhost:4321 — Daniel's visual review on Vercel Preview |
| 35 | `Tier2Grid` renderer supports `data.style: 'grid' \| 'carousel'` | `style: 'grid'` (default, Rule 20 backward compat) → existing 6-column static grid; `style: 'carousel'` → slow auto-scroll identical in behavior to BrandStrip | Visual check + grep for the new branch |
| 36 | Studio schemas registered | `studio-block-schemas.js` `brand_strip` + `tier2_grid` entries both have `style` field options `['grid','carousel']` (or compatible naming) — any new field added in ERP repo | `git show HEAD:modules/storefront/studio-block-schemas.js \| grep -A5 "tier2_grid\|brand_strip"` |
| 37 | File size compliance | No file in this SPEC's diff exceeds 350 lines | `scripts/verify.mjs --staged` → 0 violations |

### §3.E — Build + runtime

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 38 | Storefront builds | 0 errors | `npm run build` → exit 0 |
| 39 | Localhost smoke test | `/` renders 7 blocks in order, Hebrew only; hero shows new video; BrandStrip rotates; Tier2Grid auto-scrolls; no console errors | `npm run dev`, open http://localhost:4321/ |
| 40 | EN + RU homepage unchanged | `/en/` and `/ru/` still render the 8-block original composition (tier1_spotlight still present) | same dev server, different paths |
| 41 | Rule 22 defense-in-depth | migration WHERE clause includes both `tenant_id='6ad0781b-...'` AND `lang='he'` | `grep -n "tenant_id\|lang" supabase/migrations/125_*.sql` (or whatever migration number is next) |
| 42 | Pre-migration SNAPSHOT | Migration file header comment contains the full current HE row `blocks` JSONB as a rollback reference (Executor Proposal E1 from prior FOREMAN_REVIEW) | `head -60 supabase/migrations/125_*.sql` |

### §3.F — Vercel Preview deferred criteria (Foreman Proposal A2 applied)

The following criteria fire only on Vercel Preview URL, NOT on localhost. Executor logs the Preview URL + curl/visual output in EXECUTION_REPORT §Verification. These are not localhost-verifiable.

| # | Criterion | Expected value | Verify on |
|---|-----------|---------------|-----------|
| 43 | Preview hero renders new video (`lz55pwuy9wc`) | visible YouTube iframe or player embed | Vercel Preview URL |
| 44 | Preview BrandStrip rotates | confirmed visually | Vercel Preview |
| 45 | Preview Tier2Grid carousel scrolls | confirmed visually | Vercel Preview |
| 46 | Lighthouse on Preview HE `/` | Performance ≥ 85, LCP < 3.0s | Vercel Preview automatic Lighthouse |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in either repo.
- Run Level 1 (read-only) SQL against Supabase.
- Run Level 2 SQL (writes to data tables) **Prizma-scoped only** — every `UPDATE` must include `tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND lang='he'`.
- Create the next sequential migration file under `supabase/migrations/` (likely 125).
- Edit block renderer files under `opticup-storefront/src/components/blocks/BrandStripBlock.astro` and `Tier2GridBlock.astro` to implement carousel behavior.
- Edit Studio block schema file `modules/storefront/studio-block-schemas.js` to register `style` options where missing.
- Draft Hebrew copy for story_teaser body (keeping the Daniel-supplied anchor phrase intact) in Prizma-voice.
- Choose the existing Prizma store photo from `media_library` (query the table, pick the most recent `product_type='store'` or similar tag; log the chosen row ID).
- Make judgment calls on `eyebrow` retention (Q at criterion 13) and `story_teaser.title` (Q at criterion 24) — log each decision in EXECUTION_REPORT §4.
- Commit and push to `develop` in both repos, one SPEC-coherent commit at a time.
- Skip all Vercel-Preview-only criteria on localhost (§3.F) — defer to Daniel's post-commit review.

### What REQUIRES stopping and reporting

- Any DB schema change (DDL) — Level 3 autonomy is never autonomous.
- Any attempted `UPDATE` that would touch a tenant other than Prizma, or a `lang` other than `he`.
- The EN or RU row `updated_at` timestamp changing (Criteria 8–9 violated).
- File size violation >350 lines on any file this SPEC creates or modifies.
- No Prizma store photo found in `media_library` (Criterion 28) — escalate to Foreman for photo source decision.
- BrandStrip renderer inspection reveals it does NOT support carousel mode despite `data.style='carousel'` being set — STOP and report before attempting the fix (may be bigger than this SPEC).
- Pre-migration SELECT snapshot cannot be captured or embedded in the migration file — STOP (Proposal E1).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **Tier1Spotlight renderer file gets deleted or modified.** This SPEC removes the block from the HE row's JSONB only; the renderer and Studio schema stay intact (Rule 20). Applying Author Proposal A1 from prior FOREMAN_REVIEW: "before deleting any file prescribed by a SPEC, verify it is not a fallback or multi-tenant reusable asset. If it is — keep it."
- **Migration writes to multiple tenants or locales.** Any `UPDATE storefront_pages` in the migration MUST include `tenant_id = '6ad0781b-...'` AND `lang = 'he'` in WHERE. If either is missing — STOP.
- **BrandStrip fix balloons in scope.** If implementing the carousel behavior requires >100 lines of change or touches unrelated components (e.g., `PageRenderer`, `BlockRenderer`, shared utils), STOP — this indicates the carousel defect is a broader issue that deserves its own SPEC, not a ride-along in this one.
- **Tier2Grid carousel renderer mirrors BrandStrip too closely → shared helper?** If the executor writes substantially duplicated CSS/JS between `BrandStripBlock.astro` and `Tier2GridBlock.astro`, that's a Rule 21 (No Duplicates) trigger — STOP, propose a shared helper, wait for Foreman decision.
- **Story photo ambiguity.** If `media_library` returns multiple candidate Prizma store photos and executor can't judge which one Daniel intended, STOP.
- **Pre-migration snapshot fails to serialize.** If the full JSONB of the HE row doesn't fit cleanly into a migration header comment (size limit, escaping), STOP — propose storing snapshot in a separate `supabase/migrations/125_snapshot.json` sibling file.

---

## 6. Rollback Plan

If the SPEC fails partway:

1. **DB rollback:** the migration MUST include in its header a complete JSONB snapshot of the HE row before the UPDATE (Proposal E1). Rollback = re-apply that JSONB as an inverse UPDATE:
   ```sql
   UPDATE storefront_pages
   SET blocks = $1::jsonb  -- paste the snapshot from migration 125's header
   WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND slug = '/' AND lang = 'he';
   ```
2. **Code rollback:** `git reset --hard {START_COMMIT}` in both repos. START_COMMIT will be logged in EXECUTION_REPORT.
3. **Mark SPEC as REOPEN**, not CLOSED. Foreman re-scopes.

No other tenants or locales are touched by this SPEC, so rollback scope is narrow.

---

## 7. Out of Scope (explicit — do NOT touch)

- **EN and RU homepage rows.** Explicitly deferred to `LANGUAGES_FIX` SPEC. Criteria 8–9 require they remain unchanged.
- **`/about/` CMS rows.** Not touched in this SPEC.
- **`/optometry/` CMS rows.** Not touched.
- **Header / nav.** Broken transitions to `/about/` and `/optometry/` are the scope of `NAVIGATION_FIX` SPEC. Do not investigate or repair here.
- **Contact form.** Deferred to `CONTACT_FORM_FIX`.
- **`vercel.json`.** No redirect or rewrite changes.
- **Tier1Spotlight renderer file.** Stays on disk. Only removed from the HE row's `blocks` JSONB.
- **Studio block schema for Tier1Spotlight.** Stays registered. Other tenants / future locales may use it.
- **Other Prizma pages** (`/blog/`, `/brands/`, `/products/` etc.). Out.
- **Storefront Studio UI.** Not touched except for schema field registration (if needed).
- **Multifocal-Guide rows.** Still published per FINDING M3-CMS-DEBT-02 from prior SPEC — that's TECH_DEBT, not this SPEC.

---

## 8. Expected Final State

### New files

- `opticup-storefront/supabase/migrations/125_prizma_he_homepage_revisions.sql` (or next free migration number; log exact name in EXECUTION_REPORT).

### Modified files

- `opticup-storefront/src/components/blocks/BrandStripBlock.astro` — verify + fix carousel rotation if not working. If already working, NO MODIFICATION to this file (Rule 21).
- `opticup-storefront/src/components/blocks/Tier2GridBlock.astro` — extend with `style: 'grid' | 'carousel'` branching; default `'grid'` (backward compat).
- `opticup-storefront/src/components/blocks/types.ts` OR `types-luxury.ts` — add `style?: 'grid' \| 'carousel'` to `Tier2GridBlock` interface. Keep file under 350 lines.
- `opticup/modules/storefront/studio-block-schemas.js` — add `style` field option to `tier2_grid` schema (+ verify `brand_strip` has it registered). DO NOT rewrite the file; append only. Note: this file is already 627 lines per prior FINDING M3-R12-STUDIO-01 — additions further widen the debt but the split is deferred. Log the new line count.
- `opticup-storefront/SESSION_CONTEXT.md` — updated with new execution close-out.
- `opticup/modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — updated with HOMEPAGE_LUXURY_REVISIONS close-out entry.
- `opticup/modules/Module 3 - Storefront/docs/CHANGELOG.md` — new phase-D entry.
- `MASTER_ROADMAP.md` — Module 3 progress line updated.

### Deleted files

None. (Author Proposal A1 enforced — Tier1Spotlight renderer stays.)

### DB state

- `storefront_pages` table:
  - Prizma HE `/` row: `blocks` JSONB updated (7 entries, new hero + story content), `updated_at` advanced.
  - Prizma EN + RU `/` rows: UNCHANGED.
  - All other rows: UNCHANGED.

### Docs updated (MUST include)

- `MASTER_ROADMAP.md` §3 — "M3 Phase D content iteration (HE homepage)" row updated.
- Module 3 `SESSION_CONTEXT.md` — new Execution Close-Out block for this SPEC.
- Module 3 `CHANGELOG.md` — new entry for HOMEPAGE_LUXURY_REVISIONS with commit hashes.
- Storefront `SESSION_CONTEXT.md` — parallel entry.
- `docs/GLOBAL_MAP.md` — only if new shared helpers were created (unlikely in this SPEC). If no → no change.
- `docs/GLOBAL_SCHEMA.sql` — no schema changes → no edit.

---

## 9. Commit Plan

Target: 3–5 storefront commits + 1–2 ERP commits + 1 SPEC-close commit.

**Suggested shape (executor may adjust if shape no longer fits):**

- **Storefront Commit 1** (skip if BrandStrip already rotates): `fix(storefront): BrandStripBlock carousel auto-rotation` — CSS keyframes or JS scroll behavior; only if the renderer defect is confirmed.
- **Storefront Commit 2**: `feat(storefront): Tier2GridBlock supports carousel style` — extend renderer + types with `style: 'grid' \| 'carousel'`, default `'grid'`.
- **ERP Commit 1**: `chore(studio): register style:carousel option for tier2_grid + brand_strip schemas` — Studio editor can now set the field.
- **Storefront Commit 3**: `data(prizma): homepage HE revisions — new hero video, tier1_spotlight removed, story rewritten, tier2 carousel` — migration 125 with embedded snapshot + UPDATE.
- **Storefront Commit 4** (optional): `chore(storefront): SESSION_CONTEXT close-out`.
- **ERP Commit 2**: `chore(m3): close HOMEPAGE_LUXURY_REVISIONS + update SESSION_CONTEXT + CHANGELOG + MASTER_ROADMAP` — includes `EXECUTION_REPORT.md` + `FINDINGS.md` writing.

All commits on `develop` in both repos. No merges to `main`.

---

## 10. Dependencies / Preconditions

- `HOMEPAGE_HEADER_LUXURY_REDESIGN` closed (already — FOREMAN_REVIEW 🟡 2026-04-16).
- Supabase MCP `execute_sql` + `apply_migration` available.
- `media_library` table has at least one Prizma store photo (executor verifies in pre-flight; STOP if zero).
- Executor runs on **Windows Claude Code** (not Cowork) — same environment as prior SPEC. Full `npm run build` + `localhost:4321` available.
- Git remote `opticalis/opticup` + `opticalis/opticup-storefront` both accessible on `develop`.
- Foreman-skill Proposals A1 + A2 from prior FOREMAN_REVIEW are reflected in this SPEC (see §11).
- Executor-skill Proposals E1 + E2 from prior FOREMAN_REVIEW are reflected in §4, §5, §6, §3.F (see §11).

---

## 11. Lessons Already Incorporated

This SPEC applies the 4 proposals from `HOMEPAGE_HEADER_LUXURY_REDESIGN/FOREMAN_REVIEW.md`:

- **FROM Author Proposal A1 (Rule 20 vs Rule 21 Deletion Check)** → APPLIED in §5 (explicit stop-trigger) and §7 (explicit out-of-scope for renderer/schema retention) and §8 (Deleted files = None with rationale). The SPEC removes `tier1_spotlight` from the HE row's JSONB ONLY — renderer + schema stay because other tenants/future locales may use them. The executor does not need to detect this at runtime; the SPEC declares it upfront.

- **FROM Author Proposal A2 (Vercel Platform-Layer Caveat)** → APPLIED in §3.F which separates localhost-verifiable criteria from Vercel-Preview-only criteria. No `vercel.json` changes in this SPEC, but hero video rendering and carousel behavior are verified on both layers.

- **FROM Executor Proposal E1 (Pre-Migration SELECT Snapshot Mandatory)** → APPLIED in §3.B Criterion 42, §4 Stop-Trigger, §6 Rollback Plan. Migration 125's header MUST contain the full current HE row JSONB as a `/* SNAPSHOT */` comment block. Executing the migration without this snapshot is a Stop-on-Deviation trigger.

- **FROM Executor Proposal E2 (`git show` + Vercel Preview verification pattern)** → APPLIED in §3.F (Vercel Preview criteria) and §3.D Criterion 36 (use `git show HEAD:<path>` when verifying from any remote environment). Since this executor is on Windows (not Cowork), the NTFS half of E2 doesn't apply, but the Vercel-Preview half does.

- **Cross-Reference Check (Step 1.5 from opticup-strategic SKILL.md):** completed 2026-04-16 against:
  - `docs/GLOBAL_SCHEMA.sql` — no new tables/columns → 0 hits
  - `docs/GLOBAL_MAP.md` — no new functions/contracts → 0 hits
  - `docs/FILE_STRUCTURE.md` — no new files → 0 hits (new migration file is the only new file, not in registry)
  - block schema field `style`: already present on `brand_strip`; Tier2Grid gets the same field name for consistency (Rule 21 — same name, same semantic)
  - Block removal `tier1_spotlight`: renderer `opticup-storefront/src/components/blocks/Tier1SpotlightBlock.astro` stays; Studio schema entry `tier1_spotlight` in `studio-block-schemas.js` stays; JSONB removal only. Zero file deletions.

  **Net: 0 collisions / 0 hits resolved / 1 intentional reuse (`style` field name).**

- **Cross-Rule Check:** Rule 12 (file size): new migration is a single-UPDATE file, ≤80 lines. `studio-block-schemas.js` already over Rule 12 ceiling (627) — further addition is logged as continued TECH_DEBT (Finding M3-R12-STUDIO-01 still open). Rule 14 (tenant_id): UPDATE WHERE includes tenant_id + lang. Rule 15 (RLS): no new table. Rule 20 (SaaS litmus): Tier1Spotlight renderer stays so any future tenant/locale can use it. Rule 22 (defense-in-depth): tenant_id + lang both in WHERE. Rule 23 (no secrets): no credentials touched.

---

## 12. Post-Execution Deliverables (executor MUST write)

Same protocol as prior SPEC. At close-out, the executor writes to this folder:

- `EXECUTION_REPORT.md` — full retrospective per opticup-executor SKILL.md template.
- `FINDINGS.md` — every finding with Code / Severity / Reproduction / Next Action.
- Commit `chore(m3-spec): close HOMEPAGE_LUXURY_REVISIONS retrospective` — after both reports committed.

Then hand back to Foreman (opticup-strategic) for FOREMAN_REVIEW.md.

---

## 13. Dispatch Instructions (for Daniel, to run from Windows CMD)

After this SPEC is committed on `develop`:

```
cd C:\Users\User\opticup
git pull origin develop
```

Then open Windows Claude Code in the `opticup-storefront` repo directory and feed it this SPEC path:

```
modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/SPEC.md
```

The executor loads opticup-executor skill, reads this SPEC, and runs end-to-end under Bounded Autonomy.

---

*End of SPEC. Next Foreman action: wait for executor's EXECUTION_REPORT + FINDINGS, then author FOREMAN_REVIEW.md.*
