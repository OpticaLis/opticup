# SPEC — M3_IMAGE_PROXY_ENFORCEMENT

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer Foreman)
**Created:** 2026-05-08
**Type:** Iron Rule 25 enforcement + visual regression testing
**Severity:** MEDIUM (architectural cleanup, performance improvement, no live customer harm)
**Closes:** REC-SITE-007

---

## 1. Goal

Route every storefront image render through the existing `/api/image/[...path].ts` proxy (Iron Rule 25), eliminating direct `*.supabase.co/storage/...` URLs from rendered HTML. Daniel directive 2026-05-08:

> "כן רק שיוודא שהוא לא שובר שום דבר והכל עובר חלק ואחרי שהוא מסיים את השינוי שיעשה בדיקה בכל העמודים שיש בהם תמונות של מוצרים"

The whole SPEC is built around two non-negotiable safety nets:

**Safety net 1 — pre-change inventory.** Before any edit, the executor enumerates EVERY image-render site that today emits a Supabase Storage URL. If a single rendering location is discovered AFTER the inventory phase, the SPEC pauses and reconciles before continuing.

**Safety net 2 — post-change live verification.** After the change, the executor opens every customer-facing page that shows product/brand/category/CMS images in a real browser (Chrome MCP) and confirms 200-OK + non-zero bytes for every image. ANY failure (even a single missing image) triggers an immediate STOP and a fix-up cycle.

---

## 2. Background — verified live 2026-05-08

### Current state

- The proxy endpoint `src/pages/api/image/[...path].ts` already exists and works (verified by SPEC author via direct fetch).
- Some image-render code paths use the proxy correctly. Others emit direct Supabase URLs.
- Iron Rule 25 (storefront repo's `CLAUDE.md` §5): "Image proxy mandatory. All Supabase Storage images flow through `/api/image/[...path].ts`. The frame-images bucket stays private."

### Why the violation matters

1. **Performance:** Vercel CDN + Image Optimization is bypassed. No format conversion, no width-aware resizing, no edge caching.
2. **Privacy / SaaS:** the Supabase project ID is exposed in source HTML. Migration to a different storage provider would break every URL.
3. **Bucket privacy:** Iron Rule 25 says the `frame-images` bucket stays private. If the bucket is currently public to allow direct access, that's a separate finding (will be flagged in §11).

### Customer-facing today

Today, a customer browsing the site SEES the images correctly — the bucket is reachable. So this is **not customer harm.** It's architectural debt + performance ceiling. Daniel's bar (per memory `feedback_audit_real_world_check.md`): MEDIUM, not HIGH.

---

## 3. Step 0 — Reproduce-the-bug-first (MANDATORY)

```bash
# 1. Confirm the proxy endpoint works:
curl -sIL "https://www.prizma-optic.co.il/api/image/test-path-that-might-not-exist" -A "Mozilla/5.0" | head -3
# expected: 4xx (file not found) — proves endpoint exists and routes; not 5xx, not network error

# 2. Confirm at least 1 customer page currently renders a direct Supabase URL:
curl -sL "https://www.prizma-optic.co.il/" -A "Mozilla/5.0" | grep -oE 'https://[^"]*supabase\.co/storage/[^"]+' | head -3
# expected: ≥1 hit (the bug we're fixing)

# 3. Inventory all source-code references to direct Supabase storage URLs:
cd opticup-storefront
grep -rln "supabase\.co/storage" src/ | sort -u
# expected: ≥3 files (will need fixing)

# 4. Confirm /api/image/ proxy code is current and not broken:
grep -n "export" src/pages/api/image/\[...path\].ts | head -5
# expected: GET handler exported

# 5. Capture a baseline of how many images each customer page renders (pre-change):
# Executor runs Chrome MCP on these pages, counts <img> tags + <picture> + CSS bg-images that resolve to Supabase URLs:
#   /, /products/, /brands/, /supersale/, /supersalepricescatalog/, /multi/, /lab/
# Save count per page to a baseline file. Used in criterion 13 (post-change must equal baseline).
```

If any check deviates → STOP and reconcile before any edit.

---

## 4. Scope

### In scope

**A. Inventory phase (READ-ONLY).**

Before any edit, the executor produces a complete inventory of image-emission sites. The inventory MUST cover:

1. **Astro pages and components** — grep all `src/` files for `supabase.co/storage`, `STORAGE_URL`, `SUPABASE_URL` + storage-related concatenation.
2. **CMS-driven block content** — query `storefront_pages.blocks` for any image-block whose `src` field starts with `https://*.supabase.co/storage/`. Same for `storefront_components`, `storefront_reviews`, `media_library` if applicable.
3. **Product card / brand card / category card** rendering helpers in `src/lib/`.
4. **Hero images, OG/Twitter meta images, favicons** — if any are Supabase-hosted.
5. **CSS / inline styles** with `background-image: url(...)`.
6. **Schema.org structured data** that emits image URLs.

The inventory is written to `INVENTORY.md` in the SPEC folder before any edit.

**B. Helper consolidation.**

Examine `src/lib/` for an existing function that converts a Supabase Storage URL to a proxy URL. If one exists — reuse it everywhere. If not — create `src/lib/image-url.ts` exporting:

```typescript
export function toProxyUrl(storageUrl: string): string {
  // Convert https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  // → /api/image/<bucket>/<path>
  // Pass-through if already a proxy URL or non-Supabase URL.
}
```

The function is **idempotent** (passing a proxy URL returns the same proxy URL) and **safe on non-Supabase URLs** (returns input unchanged).

**C. Source-code edits.**

Replace every direct-Supabase image render with `toProxyUrl(originalUrl)`. The pattern is consistent: wherever HTML/JSX/Astro emits `<img src={someUrl}>`, the `someUrl` is wrapped in `toProxyUrl()`.

**D. CMS-block migration (DB writes).**

If the inventory finds Supabase URLs inside `storefront_pages.blocks` or `storefront_components.props` for tenant=prizma:
- Author a migration that rewrites those URLs to proxy URLs in-place.
- Use `jsonb_set` / explicit JSON construction (NOT text-replace — avoids L-PROJECT-002 regression).
- Apply via Supabase MCP migrations.

If 0 CMS rows have direct Supabase URLs (which would be ideal), skip §D entirely.

**E. Source-code defensive guard.**

Add a small lint-style check to the build:
- A new `scripts/check-no-direct-supabase-image.mjs` that scans the rendered build output (`dist/**/*.html`) for `supabase.co/storage` and exits non-zero if any match.
- Chained into `npm run build` AFTER `astro build`. Future regressions fail at build time.

**F. Bucket privacy audit (read-only finding).**

Verify whether `frame-images` (or whichever bucket holds product images) is currently public. Iron Rule 25 says it should be private. If it's public:
- Do NOT change it in this SPEC (changing storage policy mid-fix breaks live images).
- Log as INFO finding in `FINDINGS.md` with a recommended follow-up SPEC: "After M3_IMAGE_PROXY_ENFORCEMENT lands AND all images are confirmed routing through proxy, flip the bucket to private + verify proxy still serves them via service-role key."

**G. Post-change live verification (criteria 12-15).**

For every customer-facing page in this list, the executor opens it in Chrome MCP and:

1. Counts every `<img>`, `<picture>`, and CSS background-image element.
2. For each: confirms the URL is `/api/image/...` or another non-Supabase domain (e.g. CDN, external).
3. For each: confirms 200 status + non-zero bytes (image actually loaded).
4. Compares the count to the §3 step 5 baseline. If DOWN by even 1 image → STOP.

Pages to verify (the executor extends this list with anything found in the inventory):

- `/` (homepage)
- `/he/`, `/en/`, `/ru/` (locale roots)
- `/products/` (product listing)
- `/products/[some-real-barcode]/` (PDP — pick 2 brands)
- `/brands/` (brand listing)
- `/brands/[some-real-slug]/` (brand page — pick 2 brands)
- `/categories/` (category listing)
- `/category/[some-real-slug]/` (category page)
- `/supersale/`
- `/supersalepricescatalog/`
- `/multi/`
- `/lab/`
- `/about/`
- `/blog/[some-real-post]/` (1 post each lang)

The executor saves a screenshot per page to the SPEC folder for evidence.

### Out of scope

- Bucket privacy flip (logged for follow-up SPEC, see §F).
- Image optimization tuning (sizes, formats — separate concern).
- New image-related features.
- Touching `/api/image/[...path].ts` itself unless a bug surfaces during testing.

### Whitelist of write paths

**Storefront repo:**
1. CREATE `src/lib/image-url.ts` (if helper doesn't exist)
2. MODIFY all `src/` files identified in inventory (count and list them in INVENTORY.md before editing)
3. CREATE `scripts/check-no-direct-supabase-image.mjs`
4. MODIFY `package.json` (chain the check after build)
5. MODIFY tenant.ts ONLY if image URL is read from tenant config + needs proxy-wrapping

**ERP repo:**
6. CREATE `modules/Module 3 - Storefront/docs/specs/M3_IMAGE_PROXY_ENFORCEMENT/INVENTORY.md`
7. CREATE `modules/Module 3 - Storefront/docs/specs/M3_IMAGE_PROXY_ENFORCEMENT/EXECUTION_REPORT.md`
8. CREATE `modules/Module 3 - Storefront/docs/specs/M3_IMAGE_PROXY_ENFORCEMENT/FINDINGS.md`
9. CREATE `modules/Module 3 - Storefront/docs/specs/M3_IMAGE_PROXY_ENFORCEMENT/screenshots/*.png` (one per verification page)
10. (CONDITIONAL — only if §D triggers) CREATE 2 migration files for CMS row rewrites
11. UPDATE `roles/site-overseer/SITE_OVERSEER_HANDOFF.md`
12. APPEND `roles/site-overseer/DECISIONS_LOG.md`

**Supabase production:**
13. (CONDITIONAL — only if §D triggers) APPLY 1 Level-2 UPDATE per affected CMS row.

---

## 5. Success Criteria

| # | Criterion | Verification | Expected |
|---|---|---|---|
| 1 | Step 0 sanity passed | Step 0 outputs | All 5 sub-checks PASS |
| 2 | INVENTORY.md exists + lists every image-render site | file inspection | covers source files + CMS rows + components |
| 3 | `toProxyUrl()` helper exists + is idempotent + safe on non-Supabase | unit tests in inline build | 4 cases pass: Supabase URL, already-proxy URL, external CDN, empty string |
| 4 | All inventory source files modified to use the helper | grep | 0 occurrences of `supabase.co/storage` in `src/` outside the proxy endpoint itself |
| 5 | (CONDITIONAL) CMS rows with Supabase URLs migrated | post-migration query | 0 rows in `storefront_pages.blocks` for prizma contain `supabase.co/storage` strings |
| 6 | New build-time check script exists + chained | `package.json` "build" + script presence | `astro build && node scripts/check-no-direct-supabase-image.mjs` |
| 7 | Build-time check FAILS the build if a regression is introduced | test: temporarily inject a violation, run build, expect exit 1 | exit non-zero, then revert |
| 8 | `npm run build` passes (post-fix) | exit code | 0 |
| 9 | Per-page count of images matches baseline (criterion #5 in Step 0) | Chrome MCP count vs. baseline | 100% parity per page |
| 10 | Every image on every verified page returns 200 + non-zero bytes | Chrome MCP network tab | 100% pass |
| 11 | Every image URL on rendered HTML routes via proxy or external CDN | Chrome MCP DOM scan | 0 `supabase.co/storage` URLs |
| 12 | Screenshot saved per verified page (≥14 pages) | `screenshots/` folder | ≥14 PNG files, all with images visible |
| 13 | Storefront commit on develop | git log | one commit, descriptive message |
| 14 | ERP commit on develop | git log | one commit, descriptive message |
| 15 | Both repos clean post-commit | git status | nothing to commit |
| 16 | Integrity gate clean (ERP) | npm run verify:integrity | exit 0 |
| 17 | Vercel deploy READY post-merge | Vercel MCP | state=READY, target=production |
| 18 | Live homepage post-deploy renders all images via proxy | curl + grep + Chrome MCP | 0 `supabase.co/storage` in rendered HTML |
| 19 | Bucket privacy status documented in FINDINGS regardless of action | FINDINGS.md | finding logged, follow-up SPEC named |

---

## 6. Autonomy Envelope

**Executor MAY autonomously:**
- Read all storefront + Supabase data needed for inventory.
- Modify whitelisted source files.
- (CONDITIONAL §D) Apply CMS row rewrites via Supabase MCP migrations.
- Run `npm run build` to verify.
- Open all customer pages in Chrome MCP for verification.
- Commit + push BOTH repos to develop ONCE each.
- Open the GitHub PR for storefront → main (Daniel merges).

**Executor MUST stop and report:**
- Inventory finds an image render site that the executor doesn't know how to wrap (e.g. obscure CSS-in-JS pattern) → STOP.
- The proxy endpoint itself misbehaves on a real test (returns 5xx for a known-good path) → STOP, this SPEC's premise is broken.
- Image count on ANY page drops below baseline → STOP, do NOT commit, fix-up cycle.
- Any image returns non-200 in Chrome MCP after the change → STOP.
- Build-time check (criterion #7 test) fails to actually catch the synthetic regression → STOP, the safety-net itself is broken.
- §D triggers and the migration would rewrite > 100 CMS rows (premise: 0-30) → STOP, scope drift.

**Executor MUST NOT:**
- Push directly to main (Daniel-only PR-merge).
- Modify the storage bucket privacy setting (out of scope, deferred).
- Skip Step 0 inventory — the inventory is itself a deliverable.
- Skip ANY of the 14+ live-page verifications.
- Hardcode tenant-specific image URLs.
- Modify `/api/image/[...path].ts` UNLESS it's broken (separate finding if so).

---

## 7. Stop-on-Deviation Triggers

In addition to global:
- A page that should have images shows zero images post-change → STOP.
- An image visible in baseline screenshot is missing in post-change screenshot → STOP, fix-up.
- The CMS migration produces a row whose `blocks` is no longer valid jsonb (CHECK constraint from L-PROJECT-002 fires) → STOP, the migration is doing the wrong kind of edit.
- Build-time check produces false positives (flags a non-violation as a violation) → STOP, fix the regex.
- Vercel build takes > 5 minutes (premise: 90s) → STOP, may be a build loop.

---

## 8. Expected Final State

**On Supabase production:**
- (CONDITIONAL) Affected CMS rows for prizma have proxy URLs in their image blocks.

**On disk (storefront commit X, ERP commit Y):**
- All source-code image renders go through `toProxyUrl()` from `src/lib/image-url.ts`.
- `scripts/check-no-direct-supabase-image.mjs` chained into build.
- ERP retro + INVENTORY + FINDINGS + screenshots.

**On live storefront (post-deploy):**
- 0 `supabase.co/storage` URLs in any rendered page HTML.
- All images load identically to before (count + visual equivalence).
- First page-load may be marginally slower (proxy adds an indirection) but Vercel cache makes subsequent loads faster.

**Customer experience:** unchanged. No visible difference. Safety net validated.

**Compliance:** Iron Rule 25 enforced. Future violations fail the build.

---

## 9. Commit Plan

**Storefront commit:**
```
fix(storefront): route all images through /api/image proxy (closes REC-SITE-007 — Iron Rule 25)

Eliminates direct supabase.co/storage URLs from rendered HTML.
All <img> / <picture> / CSS bg-image / structured-data image renders
now go through the existing /api/image/[...path].ts proxy via the new
src/lib/image-url.ts toProxyUrl() helper.

Architecture:
- toProxyUrl(storageUrl) — idempotent, safe on non-Supabase URLs.
- All N source files in src/ updated (see SPEC INVENTORY.md).
- (Optional) M CMS rows rewritten via jsonb_set migration to use proxy URLs.
- New scripts/check-no-direct-supabase-image.mjs scans dist/ at build
  time; future regressions fail the build with exit 1.

Validated:
- Per-page image counts match baseline on 14+ customer pages.
- Every image returns 200 + non-zero bytes post-change.
- 0 occurrences of supabase.co/storage in rendered HTML.
- Build-time check actually catches synthetic regressions.

Out of scope:
- Bucket privacy flip (logged for follow-up SPEC; required to switch
  from public-bucket to private-bucket-served-via-proxy).
- Image format/size optimization tuning.
```

**ERP commit:**
```
chore(spec): close M3_IMAGE_PROXY_ENFORCEMENT

Closes REC-SITE-007. INVENTORY + EXECUTION_REPORT + FINDINGS + 14
verification screenshots in SPEC folder. Bucket privacy flagged for
follow-up. (Conditional) 1 Level-2 migration applied if CMS rows held
direct URLs.
```

---

## 10. Methodology — the verification cycle (criteria 9-12)

The 14+ Chrome MCP verifications are the load-bearing safety net. The order:

```
1. Build the dist/ locally — confirms compiled HTML has zero violations.
2. Push to develop — Vercel preview deploys.
3. Open the preview deploy URL (NOT prod yet) in Chrome MCP.
4. For each of 14+ pages:
   a. Capture a screenshot.
   b. Run document.querySelectorAll('img').length and persist to log.
   c. For each img: read .currentSrc + .naturalWidth.
   d. Confirm currentSrc matches /api/image/.* OR known external CDN.
   e. Confirm naturalWidth > 0 (image actually loaded).
   f. If ANY check fails → STOP IMMEDIATELY, fix-up cycle.
5. Compare per-page image count to baseline from Step 0 #5.
6. Only after all 14+ pages pass: open PR to main.
7. Daniel merges. Vercel deploys to production.
8. Re-run the same 14+ Chrome MCP checks against production.
9. Only after production passes all 14+: commit ERP retro.
```

---

## 11. Cross-Reference Check (Step 1.5)

Performed 2026-05-08:
- `/api/image/[...path].ts` exists (verified). ✓
- Iron Rule 25 codified in storefront `CLAUDE.md` §5. ✓
- `storefront_pages.blocks` schema accepts `string` URLs inside block `data` — no schema obstacle. ✓
- L-PROJECT-002 (jsonb writes require type preservation): the CMS migration uses `jsonb_set`, not text-replace. Type-safe. ✓
- L-PROJECT-001 (no decorative real-looking values): N/A — no fake URLs introduced.
- SaaS litmus test: `toProxyUrl()` is tenant-agnostic. Works for any future tenant's Supabase URLs. ✓

**0 collisions.**

---

## 12. Lessons already incorporated

- `feedback_audit_real_world_check.md` — finding correctly ranked MEDIUM (architectural, not customer-visible). Severity matches reality.
- `feedback_always_saas_clean.md` — `toProxyUrl()` is config-free, tenant-agnostic.
- L-PROJECT-002 — CMS migration uses jsonb_set, not text-replace.
- The pre-flight inventory + post-change verification cycle directly addresses Daniel's directive ("שיוודא שהוא לא שובר שום דבר").
- Build-time check (§E) creates a permanent regression guard — analogous to the CHECK constraint from M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL.

---

## 13. Estimated effort

- 2-4 hours executor wall time. Bulk: inventory phase + 14+ Chrome MCP verifications (each ~3 min). The actual code edits are short.
- One Daniel interaction: PR-merge button click on storefront repo.

---

## 14. Definition of Done

All 19 success criteria pass. Two atomic commits. Both repos clean. Live production verified post-deploy on 14+ pages: every image loads, every URL routes via proxy. Site Overseer HANDOFF marks REC-SITE-007 CLOSED. Bucket privacy logged for follow-up SPEC.

---

*End of SPEC.*
