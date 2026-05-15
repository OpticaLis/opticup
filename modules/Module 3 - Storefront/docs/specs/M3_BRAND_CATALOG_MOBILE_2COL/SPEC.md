# SPEC — M3_BRAND_CATALOG_MOBILE_2COL

**Module:** 3 — Storefront
**Repo:** `opticalis/opticup-storefront` (storefront repo)
**Status:** Draft, awaiting Daniel approval
**Author:** opticup-strategic (Foreman + Site Overseer hat)
**Source:** Daniel directive 2026-05-10 ("בעמודי המותגים נשנה בטלפון שיראה את קטלוג המותג ב-2 טורים במקום בטור 1")

---

## §1 Goal

On brand detail pages (`/brands/{slug}/`), the product catalog grid currently renders in **1 column on mobile** (≤480px). Change it to **2 columns** so customers see twice as many products per scroll on phone.

## §2 Background — measured 2026-05-10 against production

**Current CSS** (extracted from live `BrandPage.DlrL1d6j.css`):

```css
/* default — desktop */
.brand-catalog__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }

/* tablet — 480px to 768px */
@media (max-width: 768px) {
  .brand-catalog__grid { grid-template-columns: repeat(2, 1fr); }
}

/* mobile — ≤480px ← THE BUG */
@media (max-width: 480px) {
  .brand-catalog__grid { grid-template-columns: 1fr; }
}
```

**Live URL probe (per Step 0 URL existence verification, 2026-05-10):**

| URL | Status |
|---|---|
| `https://www.prizma-optic.co.il/brands/matsuda/` | 200 |
| `https://www.prizma-optic.co.il/brands/dior/` | 200 |
| `https://www.prizma-optic.co.il/en/brands/matsuda/` | 200 |
| Random sample (per M3_SITEMAP_BRAND_404_CLEANUP verify): all 45 emitted brand URLs | 200 |

The CSS rule is consumed by every brand detail page; the fix is universal — no per-brand work needed.

**Asset chain:**
- HTML class: `brand-catalog__grid` (custom class, not Tailwind utility — intentional design choice already in place).
- CSS source: `opticup-storefront/src/components/BrandPage.astro` (or sibling `*.astro` per Astro scoped-CSS convention — executor confirms in Step 0).
- Built output: `_astro/BrandPage.DlrL1d6j.css` (hash will change after the edit).
- Astro scoped attribute: `data-astro-cid-hzmx6acy` (Astro auto-generates per component; preserved across builds for the same source file).

### Already-done discovery contingency

- **Item:** the @media (max-width:480px) rule may already be modified to 2 columns in `develop` ahead of Daniel's directive. Step 0 confirms by `grep -n "max-width: 480" src/components/BrandPage.astro` (or wherever the rule lives). If already 2-column → SKIP this SPEC, report no-op.
- **Item:** the entire `.brand-catalog__grid` rule may have been refactored to a Tailwind class chain (e.g. `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`) like product-card-carousel sibling. Step 0 confirms via grep. If already Tailwind-converted → SKIP, report scope change for separate SPEC.

## §3 Success Criteria (measurable)

After the fix and post-deploy:

1. `curl -s https://www.prizma-optic.co.il/_astro/BrandPage.<HASH>.css | grep -A1 "max-width: 480" | head -3` returns CSS rule with `grid-template-columns: repeat(2, 1fr)` (or equivalent — `1fr 1fr`).
2. The `@media (max-width: 480px)` block contains exactly ONE rule for `.brand-catalog__grid` (no orphaned `1fr` line).
3. `@media (max-width: 768px)` block UNCHANGED (still `repeat(2, 1fr)` for tablet).
4. Default (desktop) rule UNCHANGED (still `repeat(3, 1fr)`).
5. Random-sample 5 brand URLs (`/brands/matsuda/`, `/brands/dior/`, `/brands/gucci/`, `/brands/burberry/`, `/brands/celine/`) all return 200 post-deploy.
6. Visual check (executor or Daniel): on a mobile viewport (≤480px), brand detail pages show product cards in 2 columns — confirmed via Chrome DevTools mobile emulation OR live phone test.
7. `npm run build` exits 0 in storefront repo.
8. Pre-commit hooks pass (file-size, frozen-files, rule-23-secrets, rule-24-views-only, image-proxy guard).
9. `git status` clean post-commit.

**SQL-equivalent for SCs:** N/A (CSS-only change; no DB).

## Destructive Operations

None. CSS-only single-line modification — no file deletes, no mass renames, no SQL DDL/DML, no rebase/reset, no governance-file deletions.

## §4 Autonomy Envelope

**Executor MAY without asking:**
- Edit the single `@media (max-width: 480px)` rule for `.brand-catalog__grid` in the source `.astro` file (likely `src/components/BrandPage.astro`).
- Build, commit, push to storefront `develop`.
- Open PR to storefront `main` URL for Daniel.
- Verify the build output by inspecting the rebuilt CSS file locally before commit.

**Executor MUST stop and report on:**
- The 480px rule lives in MORE than one file (refactor needed, not a one-liner).
- Step 0 finds the rule already says `repeat(2, 1fr)` → SKIP, report no-op.
- Step 0 finds the grid was Tailwind-refactored → SKIP, report scope change.
- More than 1 source file modified (target: 1 file change).
- Any side-effect on tablet (768px) or desktop rendering.

## §5 Stop-on-Deviation Triggers

- Any change beyond the single 480px @media rule.
- Build failure.
- Image-proxy guard violation.
- 5 brand URL post-deploy probe finds any 404 or visual regression at desktop/tablet widths.
- Sample brand pages render with broken product cards (overflow, image distortion, text wrap that breaks layout) — STOP, surface to Daniel.

## §6 Rollback

Single-line edit. `git revert <hash>` on storefront repo.

### Backup format guidance for DB-DELETE SPECs

N/A — pure CSS change.

## §7 Out of Scope (explicit)

- The 768px tablet rule — UNCHANGED.
- The default desktop rule — UNCHANGED.
- The `gap`, `display`, or any other catalog-grid property — UNCHANGED.
- Other brand-page components (hero, info, CTA, gallery) — UNCHANGED.
- Tailwind refactor of the entire grid class — separate SPEC if Daniel ever wants alignment with `product-card-carousel` Tailwind chain.
- Any change to the product card itself (`brand-catalog__card` or `product-card-carousel`) — UNCHANGED.
- Any changes to ERP repo or DB — pure storefront CSS edit.

### Subset relationships (not applicable)

This SPEC is a single CSS rule modification. No predicate, no data set, no subset.

## §8 Expected Final State

### Modified files

- `opticup-storefront/src/components/BrandPage.astro` (or wherever the rule lives — confirm in Step 0):
  - Inside the `@media (max-width: 480px)` block, change `grid-template-columns: 1fr` → `grid-template-columns: repeat(2, 1fr)`.
  - Net diff: 1 line.

If the rule lives in a different file (per Astro scoped-CSS conventions), modify wherever Step 0 finds it. Net diff stays at 1 line regardless.

### Build-side-effect file expectations

- `npm run build` regenerates the hashed CSS file in `dist/_astro/BrandPage.<NEW_HASH>.css` — this is build artifact, NOT committed to git (per `.gitignore` exclusion of `dist/`).
- `npm run build` may also regenerate `src/data/tenant-fallback-map.json` per pre-existing TECH_DEBT M3-DEBT-12. **NOT touched by this SPEC** — executor MUST `git checkout opticup-storefront/src/data/tenant-fallback-map.json` before staging if it appears in `git status`.
- No other build-side-effects expected.

### DB state

No DB changes.

### Docs updated (MUST include)

- `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` — add 2026-05-10 row in recent decisions table noting this UX fix.
- `roles/site-overseer/DECISIONS_LOG.md` — entry "brand-catalog-mobile-2col".

(No GLOBAL_MAP / GLOBAL_SCHEMA / SESSION_CONTEXT updates needed — pure CSS UX tweak.)

## §9 Commit Plan

Two commits:

```
[storefront repo]
fix(brand-page): mobile catalog grid 1col → 2col (Daniel directive 2026-05-10)

@media (max-width: 480px) — change grid-template-columns from 1fr to
repeat(2, 1fr) so mobile customers see 2 product cards per row instead
of 1. Tablet (768px) and desktop (3-col) unchanged.

SPEC: M3_BRAND_CATALOG_MOBILE_2COL in opticup repo.
```

```
[ERP repo]
chore(spec): close M3_BRAND_CATALOG_MOBILE_2COL with retrospective + HANDOFF + DECISIONS_LOG
```

## §10 Pre-Merge Checklist

### Browser readiness pre-flight

**Pre-flight (executor):** SPEC includes a visual check (SC #6) that benefits from browser. If Chrome is running with `--remote-debugging-port=9222`, executor uses Chrome DevTools MCP to verify mobile rendering at 375px viewport. If not, falls back to (a) post-deploy Daniel verifies on real phone, OR (b) executor can also verify via curl + grep on the rebuilt CSS (SC #1-#4 cover the math; SC #6 visual is human confirmation).

State at session start: "SPEC §6 has a visual SC. Chrome readiness: [auto-check] — [proceed with DevTools MCP / fall back to CSS grep + Daniel post-deploy phone test]."

### gh CLI readiness check

SPEC §10 mentions opening a PR via Daniel's UI link (per established cross-repo pattern, gh CLI not strictly required). If `gh auth status` is clean, executor MAY open the PR via `gh pr create` instead.

### Step 0 (executor MUST run BEFORE any change)

```bash
cd opticup-storefront
git status                    # clean
git checkout develop && git pull

# Locate the rule
grep -rn "max-width: *480" src/ --include="*.astro" --include="*.css" --include="*.scss" --include="*.ts" 2>/dev/null

# Confirm current state
grep -A2 "max-width: *480" $(grep -l "max-width: *480" src/ -r 2>/dev/null | head -1) 2>/dev/null

# Verify it still says 1fr (not already 2-col, not refactored to Tailwind)
grep -B1 -A1 "1fr$" src/components/BrandPage.astro 2>/dev/null | head -10
```

If the rule is NOT in one file → STOP, surface to Daniel.
If the rule already says `repeat(2, 1fr)` → SKIP, report no-op.
If `.brand-catalog__grid` no longer exists (Tailwind-refactored) → STOP, surface scope change.

### Execution steps

1. Step 0 location + status confirmation.
2. Edit the single line: `grid-template-columns: 1fr` → `grid-template-columns: repeat(2, 1fr)`.
3. `npm run build` → exit 0.
4. Verify rebuilt CSS file inside `dist/_astro/BrandPage.<hash>.css` contains the new rule.
5. Restore `tenant-fallback-map.json` if it drifted (per §8 build-side-effect guidance).
6. Commit per §9.
7. Push to storefront `develop`.
8. Daniel opens PR + merges.
9. Post-deploy curl probe SC #1-#5; visual confirmation SC #6 via Chrome DevTools mobile emulation OR Daniel real-phone test.
10. Write EXECUTION_REPORT.md + FINDINGS.md in this SPEC folder (in ERP repo); commit retrospective.
11. Update HANDOFF + DECISIONS_LOG.

## §11 Lessons Already Incorporated

- **Step 0 — Reproduce-The-Bug-First (per opticup-strategic mandate):** Probed the live CSS file (`BrandPage.DlrL1d6j.css`) directly; extracted the exact 3-tier @media chain; identified the offending line (`grid-template-columns: 1fr`) at author time. Numbers + CSS rules in §2 are real, not assumed.
- **URL existence verification (per A1 from M3_LIGHTHOUSE_NIGHTLY_CRON FOREMAN_REVIEW, applied 2026-05-10 commit ab7884d's successor):** Probed 3 representative brand URLs at author time, confirmed 200. Cross-referenced with the M3_SITEMAP_BRAND_404_CLEANUP fix (45 brand URLs all 200). No SPEC author-time URL gap.
- **Already-done discovery contingency (per A1 from M3_REC014_ORPHAN_CLEANUP, applied 2026-05-09 commit ab7884d):** §2 explicitly enumerated 2 contingencies (already 2-col / Tailwind-refactored). Pre-authorizes executor to skip without AskUserQuestion.
- **Build-side-effect declaration (per A2 from M3_SITEMAP_BRAND_404_CLEANUP, applied 2026-05-09 commit 74922cd):** `tenant-fallback-map.json` pre-declared as "NOT touched, restore before staging".
- **Browser readiness pre-flight (per A2 from M3_STUDIO_TRANSLATIONS_BRAND_FILTER, applied 2026-05-09 commit 74922cd):** SC #6 has a visual check; pre-flight states the dual-path (DevTools if available, otherwise Daniel real-phone test).
- **Subset relationships:** Marked N/A explicitly.
- **Backup format guidance:** N/A explicitly.
- **Cross-Reference Check (Rule 21):** No new functions/files/CSS classes introduced. Single existing rule modified. 0 collisions possible.
- **Iron Rules respected:** Rule 13/29 (no view changes), Rule 25 (no image changes), Rule 27 (RTL-first — `repeat(2, 1fr)` is direction-neutral, RTL-safe).

## §12 Cross-Repo Note for Executor

Code change in `opticup-storefront`. SPEC docs in `opticup` (this ERP repo) under `modules/Module 3 - Storefront/docs/specs/M3_BRAND_CATALOG_MOBILE_2COL/`. Per CLAUDE.md §7 phase-label-ownership rule: descriptive commit message in storefront repo, no Module 3 phase letters.
