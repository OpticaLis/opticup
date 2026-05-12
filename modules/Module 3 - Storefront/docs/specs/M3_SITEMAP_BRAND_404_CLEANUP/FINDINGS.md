# FINDINGS — M3_SITEMAP_BRAND_404_CLEANUP

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_BRAND_404_CLEANUP/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `src/data/tenant-fallback-map.json` drifts on every build

- **Code:** `M3-DEBT-12`
- **Severity:** LOW
- **Discovered during:** SPEC §10 step 3 — `npm run build` (which runs `node scripts/generate-tenant-fallback-map.mjs` first as part of the build script chain)
- **Location:** `opticup-storefront/src/data/tenant-fallback-map.json` (the committed copy) vs `opticup-storefront/scripts/generate-tenant-fallback-map.mjs` (the generator) output
- **Description:** Running `npm run build` regenerates `src/data/tenant-fallback-map.json` and the regenerated file differs from the committed version — specifically, the generator now produces a `www.prizma-optic.co.il` key (the canonical www domain) that is not in the committed JSON. The committed JSON only has the apex `prizma-optic.co.il` key. Any developer who runs `npm run build` locally sees this as a phantom modification on every build, and either commits it (polluting unrelated PRs) or restores it (until the next build). CI's build step also produces this diff and discards it on every run.
- **Reproduction:**
  ```bash
  cd opticup-storefront
  git stash       # if dirty
  npm run build   # exit 0
  git status      # M src/data/tenant-fallback-map.json
  git diff src/data/tenant-fallback-map.json
  # Shows added "www.prizma-optic.co.il": { he/en/ru } block
  ```
- **Expected vs Actual:**
  - Expected: `npm run build` produces no working-tree changes, OR the committed JSON is regenerated whenever the generator's output changes.
  - Actual: Build always produces a 5-line drift in the JSON; nobody has committed the fresh output since the canonical-www-domain change landed in the generator.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** The fix is one commit (run the generator once, commit the fresh JSON), but it should not be bundled into a sitemap SPEC. Likely M3-DEBT-12 belongs in a "post-cutover hygiene" SPEC alongside other small drift items. Severity LOW because the apex key still resolves correctly; the missing www key just means slightly different fallback resolution on the canonical domain (the codepath that uses this map probably falls back to the apex key gracefully — would need a code read to confirm).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — General-sample 404-warn in `verify-sitemap.mjs` check #8 is now stale

- **Code:** `M3-OBS-01`
- **Severity:** INFO
- **Discovered during:** SPEC §10 step 12 — `node scripts/verify-sitemap.mjs` against production after deploy
- **Location:** `opticup-storefront/scripts/verify-sitemap.mjs` lines ~108-126 (check #8, the existing 30-URL random sample probe)
- **Description:** Check #8 was authored under M3_SITEMAP_CONSOLIDATION as a warn-only probe with the comment "Reports the count but does NOT fail on pre-existing 404s (brand-slug pages emitted by the generator that don't have backing routes — pre-existing data-quality issue tracked as a separate REC follow-up)". After this SPEC's fix, the post-deploy verify run reports `Sample probe: 30/30 returned 200 (0 pre-existing 404s logged)`. The "pre-existing data-quality issue" appears to have been entirely brand-block-driven and is now resolved. Check #8 could safely be tightened from warn-only to a strict gate, AND its comment is now misleading (mentions a problem that no longer exists).
- **Reproduction:**
  ```bash
  cd opticup-storefront
  node scripts/verify-sitemap.mjs
  # Look for: "Sample probe: 30/30 returned 200 (0 pre-existing 404s logged)"
  # Confirm 0 pre-existing 404s in the warn output for several runs.
  ```
- **Expected vs Actual:**
  - Expected: warn output shows 1+ non-200s reflecting the documented data-quality issue.
  - Actual: 30/30 200, suggesting the issue is closed. The warn-only allowance is no longer earning its keep.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** A 5-minute follow-up: tighten check #8 to a strict gate (`fail` instead of `console.warn`) and update the comment. Catches future regressions earlier (any single 404 in a 30-URL sample fails CI). Severity INFO because the new brand404Probe (check #10) already covers the brand sub-class strictly, and check #8's tightening would extend strict coverage to non-brand URLs (CMS pages, blog posts, products). Worth doing eventually, not urgent.
- **Foreman override (filled by Foreman in review):** { }

---
