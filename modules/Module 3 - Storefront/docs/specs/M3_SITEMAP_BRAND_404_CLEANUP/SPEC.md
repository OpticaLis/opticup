# SPEC — M3_SITEMAP_BRAND_404_CLEANUP

**Module:** 3 — Storefront (sitemap-dynamic.xml.ts)
**Repo:** `opticalis/opticup-storefront` (NOT this ERP repo)
**Status:** Draft, awaiting Daniel approval
**Author:** opticup-strategic (Foreman) — Site Overseer Mode B
**Source:** REC-SITE-017 in `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` + `M3_SITEMAP_CONSOLIDATION/FINDINGS.md` M3-DATA-01

---

## §1 Goal

`sitemap-dynamic.xml` currently emits 155 `/brands/{slug}/` URLs for prizma — every row in `v_storefront_brands` — but only ~45 of those slugs have a working public detail page. The other ~110 return 404 (brands listed in the brand index but with `brand_page_enabled = false` and/or `product_count = 0`). Filter the sitemap's brand-emission loop so it only emits slugs whose public `/brands/[slug]/` detail page actually returns 200.

## §2 Background — measured 2026-05-09 against prizma tenant

Live SQL measurements:

| Counter | SQL | Value |
|---|---|---|
| `v_storefront_brands` total rows for prizma | `SELECT COUNT(*) FROM v_storefront_brands WHERE tenant_id=prizma` | **155** |
| with `product_count > 0` | + `AND product_count > 0` | **47** |
| with `brand_page_enabled = true` | + `AND brand_page_enabled = true` | **45** |
| both filters | + both | **45** |

Live HTTP probe of production:

| Probe | Result |
|---|---|
| `curl https://www.prizma-optic.co.il/sitemap-dynamic.xml \| grep -oE '<loc>[^<]+/brands/[^<]+</loc>' \| wc -l` | **155** brand URLs emitted |
| Manual sample (per M3-DATA-01 finding): West Coast, Gipsy Kids, Caroline DK, GAF, Kristian Olsen, Flash Kids, Weishiman, Taki Kids, Tom Miller, SUMO, Flash, Kimura, Just, Christies, Kokids, Accord, Excite, Flair, BENX Kids, DGSR, Marco Bruno | All return **404** |

Root cause: `src/pages/sitemap-dynamic.xml.ts` (in storefront repo) iterates `v_storefront_brands` directly and emits a `/brands/{slug}/` for every row, without applying the same filter the public `/brands/` index applies and the public `/brands/[slug]/` route requires (`brand_page_enabled = true` AND `product_count > 0`).

**Authoritative truth (Studio + public storefront alignment, 2026-05-09):**
- `studio-brands.js` line 154 (ERP): `.filter(b => b.product_count > 0)` → 47
- `studio-translations.js` line 43 (ERP, just-shipped fix M3_STUDIO_TRANSLATIONS_BRAND_FILTER): same predicate → 47
- public `lib/brands.ts` (storefront repo, per `docs/GLOBAL_MAP.md`): same `product_count > 0` filter on `v_storefront_brands`
- Astro `/brands/[slug]/` getStaticPaths (to be confirmed by executor in Step 0): expected to also gate on `brand_page_enabled = true` + `product_count > 0`

The sitemap is the only consumer that ignores both filters.

## §3 Success Criteria (measurable)

After the fix, on production after deploy:

1. `curl https://www.prizma-optic.co.il/sitemap-dynamic.xml | grep -c '/brands/'` returns **45 ± 2** (allowing for live data shift between SPEC author and execute time). Hard floor 40, hard ceiling 50.
2. Random sample of 15 brand URLs from the new sitemap, HEAD-probed: **15/15 return 200**. Zero 404s.
3. Pre-existing non-brand sitemap content unchanged: `curl ... | wc -l` total `<loc>` count stays within ± 5 of pre-fix 364 (the new total should be roughly 364 − 110 = 254 ± 5).
4. `curl https://www.prizma-optic.co.il/sitemap-dynamic.xml | grep -c '<loc>'` ≥ 240 and ≤ 270.
5. `verify-sitemap.mjs` script in storefront repo: PASS (extend it with a brand-404-probe sub-check as part of this SPEC — see §8).
6. Build passes: `npm run build` exits 0.
7. Pre-commit hooks pass.
8. `git status` clean after commit.
9. `robots.txt` Sitemap directive unchanged. astro.config.mjs `site:` unchanged. `v_storefront_brands` view unchanged. No DB write.

## §4 Autonomy Envelope

**Executor MAY without asking:**
- Modify `src/pages/sitemap-dynamic.xml.ts` to filter the brand-iteration block by `brand_page_enabled = true` AND `product_count > 0`.
- Choose between two implementation approaches (both acceptable):
  - **(a) Inline filter on the existing `v_storefront_brands` query** — add `.eq('brand_page_enabled', true).gt('product_count', 0)` chained predicates.
  - **(b) Reuse the same helper that `lib/brands.ts` uses** if it exists — preferred per Iron Rule 21 (no duplicates).
- Extend `scripts/verify-sitemap.mjs` with a `brand404Probe()` sub-check that random-samples 15 brand URLs from the live sitemap and asserts all 15 return 200.
- Add a brief inline comment naming the two peer surfaces (`lib/brands.ts`, ERP studio-brands.js / studio-translations.js) so future readers grep their way to the alignment.
- Rebuild + run verify scripts locally; commit; PR + merge to main per the standard storefront flow.

**Executor MUST stop and report on:**
- Pre-flight discovery that Astro `/brands/[slug]/` route applies a DIFFERENT filter than `brand_page_enabled = true AND product_count > 0` — in that case, mirror whatever the route actually requires, and surface the deviation in EXECUTION_REPORT.
- Any required change to `v_storefront_brands` view — out of scope (Iron Rule 13/29).
- Sitemap total `<loc>` count shifts by more than ± 5 outside the brand-block delta.
- Any other Astro route (e.g. `/brands/`) starts producing different content as a side effect.
- More than 2 files changed (target: 1 file change + 1 file extended for verify script = 2 max).

## §5 Stop Triggers

- Brand sitemap count post-fix is outside the 40-50 band. STOP and report — likely indicates a third filter dimension I missed (e.g. `is_deleted`, `tenant_id`, `display_mode`).
- Build failure.
- `verify-sitemap.mjs` regressions on any non-brand check.
- Random-sample 200-probe finds any 404 — STOP, the filter is still under-restrictive.
- Pre-existing brand-detail-page route stops returning 200 for a known-live brand (e.g. one of the 45 that worked before).
- Iron Rule 25 (image-proxy enforcement) violations introduced — `check-no-direct-supabase-image.mjs` build-time check would catch this; if it fails, STOP.

## §6 Rollback

Single commit on storefront `develop`. `git revert <hash>` if needed. Zero schema, zero DB-row changes. Pre-existing 110 404 brand URLs were already in production — reverting just restores the pre-fix bloat, not a regression.

## §7 Out of Scope

- The `v_storefront_brands` view itself — DO NOT modify (Iron Rule 13, Iron Rule 29).
- The Astro `/brands/[slug]/` route filtering logic — confirm it (Step 0) but do not change it. The SPEC's job is to align the sitemap to the route, not refactor the route.
- The 47 vs 45 question (2 brands have products but `brand_page_enabled = false`) — out of scope for this SPEC. If Daniel later wants those 2 published, he flips `brand_page_enabled` in Studio and they enter the sitemap on the next build automatically.
- Any change to the brand index page `/brands/`.
- Adding a CHECK constraint or new column to the `brands` table — out of scope.
- M3-DATA-02 leading-slash bug — already fixed in M3_SITEMAP_CONSOLIDATION via `normalizeSlug()`. Don't re-touch.
- `/multifocal-guide/` 404 (mentioned in the M3-DATA-01 sample) — that's a CMS page issue, not a brand issue. Out of scope; will be its own REC if needed.

## §8 Expected Final State

Two files modified in storefront repo:

**File 1 — `src/pages/sitemap-dynamic.xml.ts`** (the brand-iteration block, currently emits 155 entries):
- Add `.eq('brand_page_enabled', true).gt('product_count', 0)` to the `v_storefront_brands` query, OR call the existing helper from `lib/brands.ts` if it cleanly exposes the filtered list.
- Inline comment above the change naming the peer surfaces.
- Net diff: 1-3 lines.

**File 2 — `scripts/verify-sitemap.mjs`** (regression script):
- Add `brand404Probe()` sub-check: parse live sitemap, extract all `/brands/...` `<loc>` entries, random-sample 15, HEAD-probe each, assert all return 200. Throw on any 404.
- Net diff: ~30 lines (one new function + one call site).

**No DB changes. No storefront-config changes. No view changes. No robots.txt changes. No astro.config.mjs changes.**

## §9 Commit Plan

Two-commit plan:

```
feat(sitemap): filter brand-page emission to enabled+with-products

Sitemap was emitting /brands/{slug}/ for all 155 v_storefront_brands
rows for prizma — but only ~45 have a working public detail page.
The other ~110 returned 404, wasting Google's crawl budget.

Mirror the same filter the public /brands/[slug]/ route already
applies: brand_page_enabled = true AND product_count > 0. Aligns
the sitemap with Studio Brand Editor (47), Languages → Brands tab
(47), and the public /brands/ index.

Result: 45 brand URLs in sitemap, all returning 200.
```

```
test(verify-sitemap): add brand-404 random-sample probe

Adds a brand404Probe() sub-check that random-samples 15
/brands/{slug}/ URLs from the live sitemap and HEAD-probes
each, asserting 200. Catches future regressions where the
sitemap drifts away from route-existence reality.
```

(Or one combined commit if the executor judges the test addition tightly couples to the fix.)

## §10 QA Steps (executor performs)

**Pre-flight (executor):** Confirm Chrome is running with `--remote-debugging-port=9222` if any browser-level QA is needed. NOTE: this SPEC's QA is HTTP-level (curl) + script-based — no browser required. Skip Chrome readiness check.

**SQL-equivalent baseline (already measured by Foreman 2026-05-09; re-measure if >24h drift):**

```sql
SELECT COUNT(*) FROM v_storefront_brands
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='prizma')
  AND brand_page_enabled = true
  AND product_count > 0;
-- Expected: 45 ± 2 (live data drift band).
```

**Local verification (before push):**

1. `cd opticup-storefront && git checkout develop && git pull`
2. Edit `src/pages/sitemap-dynamic.xml.ts` per §8.
3. `npm run build` → exit 0.
4. `npm run preview` (or local serve) → fetch `/sitemap-dynamic.xml`, count `/brands/` `<loc>` entries: expect 45 ± 2.
5. Random-sample 15 brand URLs, curl-HEAD each on the local preview: 15/15 200.
6. Edit `scripts/verify-sitemap.mjs` per §8.
7. `node scripts/verify-sitemap.mjs --local` → PASS.
8. Commit with §9 messages.

**Post-deploy verification (after Vercel deploys to production):**

9. `curl -s https://www.prizma-optic.co.il/sitemap-dynamic.xml | grep -c '/brands/'` → 45 ± 2.
10. `curl -s https://www.prizma-optic.co.il/sitemap-dynamic.xml | grep -c '<loc>'` → 240–270.
11. Random-sample 15 brand URLs, curl-HEAD each on production: 15/15 200.
12. `node scripts/verify-sitemap.mjs` (against production) → PASS.

## §11 Lessons Already Incorporated

- **Step 0 — Reproduce-The-Bug-First (per opticup-strategic mandate):** queried prizma DB live → 155 rows total, 45 with both filters. Sampled live sitemap → confirmed 155 brand URLs emitted. Sampled the 110-difference brands → confirmed 404. Numbers in §2 are measured, not assumed.
- **Cross-Reference Check (Rule 21):** verified two peer surfaces filter correctly today (`studio-brands.js`, `studio-translations.js` post-fix), and the public `lib/brands.ts` per docs/GLOBAL_MAP.md. The sitemap is the only outlier — this SPEC closes the gap, doesn't introduce new logic. 0 collisions; 1 alignment.
- **SQL-equivalent for SC #1 baked into §10** (per FOREMAN_REVIEW improvement proposal A1 from M3_STUDIO_TRANSLATIONS_BRAND_FILTER, 2026-05-09): the success criterion is a row count provable by SQL, so the SPEC ships the SQL alongside the curl. If browser-level access is unavailable, executor has the equivalent without needing to ask.
- **Iron Rule 29 respected:** no view modification proposed; client-side `.eq()` predicates only.
- **Two-file ceiling on §8:** prevents scope creep; if executor finds they need a third file, that's an SPEC author defect to surface in EXECUTION_REPORT.

---

## §12 Cross-Repo Note for Executor

This SPEC's commits land in `opticup-storefront`, NOT `opticup`. The SPEC document (this file + the future EXECUTION_REPORT.md / FINDINGS.md / FOREMAN_REVIEW.md) lives in the ERP repo at `modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_BRAND_404_CLEANUP/`. This is the standard pattern for Module-3 SPECs: SPEC text in ERP, code change in storefront. Per CLAUDE.md §7 phase-label-ownership rule, descriptive names only in storefront commits — no Module 3 phase letters.
