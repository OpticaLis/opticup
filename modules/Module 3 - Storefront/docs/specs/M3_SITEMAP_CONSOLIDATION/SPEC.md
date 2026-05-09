# SPEC — M3_SITEMAP_CONSOLIDATION

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer Foreman)
**Created:** 2026-05-09
**Type:** SEO infrastructure cleanup + canonical-domain alignment + branch-route inclusion
**Severity:** MEDIUM (SEO upside, not customer harm)
**Closes:** REC-SITE-011

---

## 1. Goal

Consolidate the storefront's two competing sitemaps into one canonical, comprehensive, www-aligned XML feed that includes the new multi-branch routes from M3_BRANCHES_INFRA_AND_ASHKELON. After this SPEC:

1. **Single sitemap source of truth.** Either `sitemap-dynamic.xml` is canonical and `sitemap-0.xml` is removed, OR they redirect to one another. Google sees ONE sitemap.
2. **All URLs use `www.prizma-optic.co.il`** (canonical apex), not bare `prizma-optic.co.il`.
3. **`/branches/` index + every published `tenant_branches` row** is in the sitemap, in all 3 langs.
4. **`robots.txt` Sitemap directive** points to the canonical sitemap.
5. **End-to-end QA on every page touched** — no regressions.

Daniel directive 2026-05-09: "שבסוף יעבור על העמודים שזה נוגע להם ויוודא שהכל תקין ויעשה QA שקשור לשינויים האלה."

---

## 2. Background — verified live 2026-05-09

### Current state (verified by Site Overseer pre-flight)

| File | URL count | Domain used | Coverage |
|---|---|---|---|
| `sitemap-0.xml` | 28 | `prizma-optic.co.il` (apex, 307→www) | Static system pages only |
| `sitemap-dynamic.xml` | 362 | `prizma-optic.co.il` (apex, 307→www) | Static + brands + categories + products + posts |

### Three problems

**Problem 1: Duplication.** `sitemap-dynamic.xml` already contains everything in `sitemap-0.xml` plus 334 more URLs. The static-only file is redundant.

**Problem 2: Wrong domain.** Both files emit `prizma-optic.co.il/...` URLs. The canonical is `www.prizma-optic.co.il/...` (verified — apex 307-redirects to www). Each URL Google fetches takes one wasted hop, and link-equity passes through a redirect, which loses a fraction.

**Problem 3: Missing branch routes.** The new `/branches/` and `/branches/ashkelon/` pages exist + are published, but they are NOT in either sitemap. Google won't discover them quickly.

### Source of each sitemap

The executor must locate the sitemap-generation logic in `opticup-storefront`. Likely candidates:
- `astro.config.mjs` site map integration (`@astrojs/sitemap` config)
- `src/pages/sitemap-dynamic.xml.ts` (custom dynamic emitter)
- `src/pages/sitemap-0.xml.ts` or `public/sitemap-0.xml` (static file)
- `astrojs/sitemap` plugin generates `sitemap-0.xml` automatically based on `astro.config.mjs` `site` value + page list

The Step 0 inventory must enumerate ALL sitemap-generation sources.

### What `robots.txt` says

Verify Step 0 #6: read `https://www.prizma-optic.co.il/robots.txt` and document which sitemap(s) it references. Likely either `sitemap.xml` or `sitemap-index.xml`.

---

## 3. SaaS-clean design

The sitemap-generation logic must:

1. **Read the canonical site URL from one source** — likely `astro.config.mjs` `site:` property OR tenant.storefront.custom_domain. If a future tenant has a different domain, the sitemap auto-uses it.
2. **Enumerate every public route** dynamically from DB:
   - Static pages (homepage, /products/, /brands/, /categories/, /search/ etc.)
   - All published `storefront_pages` rows (CMS pages — already in dynamic sitemap)
   - All `inventory` rows that are public (product detail pages — already)
   - All brand-page rows (already)
   - All published `blog_posts` rows (verify already in dynamic sitemap)
   - **NEW:** All published `tenant_branches` rows → `/branches/[slug]/`
   - **NEW:** `/branches/` index
3. **Emit per-locale URLs** (HE root, /en/, /ru/) for routes that have all 3.
4. **Use `www.` not bare apex** for every URL (canonical).
5. **Include `<lastmod>`, `<changefreq>`, `<priority>`** per Sitemaps protocol where data is available.

---

## 4. Step 0 — Reproduce-the-bug-first (MANDATORY)

```bash
# 1. Confirm sitemap-0.xml exists + count + domain:
curl -s "https://www.prizma-optic.co.il/sitemap-0.xml" -A "Mozilla/5.0" | grep -c "<loc>"
curl -s "https://www.prizma-optic.co.il/sitemap-0.xml" -A "Mozilla/5.0" | grep -oE 'https://[^/]+' | sort -u
# expected: count ≈ 28; domain = "https://prizma-optic.co.il" (apex, BUG)

# 2. Confirm sitemap-dynamic.xml exists + count + domain:
curl -s "https://www.prizma-optic.co.il/sitemap-dynamic.xml" -A "Mozilla/5.0" | grep -c "<loc>"
curl -s "https://www.prizma-optic.co.il/sitemap-dynamic.xml" -A "Mozilla/5.0" | grep -oE 'https://[^/]+' | sort -u
# expected: count ≈ 362; domain = "https://prizma-optic.co.il" (BUG)

# 3. Confirm the duplication: every URL in sitemap-0 is also in sitemap-dynamic
diff <(curl -s "https://www.prizma-optic.co.il/sitemap-0.xml" | grep -oE '<loc>[^<]+</loc>' | sed 's,</\?loc>,,g' | sort) \
     <(curl -s "https://www.prizma-optic.co.il/sitemap-dynamic.xml" | grep -oE '<loc>[^<]+</loc>' | sed 's,</\?loc>,,g' | sort)
# expected: every line in sitemap-0 appears in sitemap-dynamic (no lines unique to sitemap-0)

# 4. Confirm /branches/ + /branches/ashkelon/ NOT in either sitemap:
curl -s "https://www.prizma-optic.co.il/sitemap-dynamic.xml" -A "Mozilla/5.0" | grep -E "branches"
# expected: 0 hits (BUG to fix)

# 5. Confirm both branches pages are LIVE and indexable (200 + no noindex):
curl -sL "https://www.prizma-optic.co.il/branches/" -A "Mozilla/5.0" | grep -i "noindex\|robots" | head -3
curl -sL "https://www.prizma-optic.co.il/branches/ashkelon/" -A "Mozilla/5.0" | grep -i "noindex\|robots" | head -3
# expected: no noindex meta tag; pages are indexable

# 6. robots.txt Sitemap directive:
curl -s "https://www.prizma-optic.co.il/robots.txt" -A "Mozilla/5.0" | grep -i "^sitemap"
# expected: ≥1 line; identify which sitemap it references

# 7. Locate sitemap-generation source code:
cd opticup-storefront
find . -name "sitemap*.ts" -o -name "sitemap*.js" -o -name "sitemap*.xml" 2>/dev/null | head -10
grep -l "sitemap" astro.config.mjs astro.config.ts astro.config.js 2>/dev/null
# expected: ≥1 match — the executor must locate the generator
```

If any check deviates from the §2 expected state → STOP and reconcile before any edit.

---

## 5. Scope

### In scope

**A. Identify + consolidate source.**

Locate the sitemap generator(s). One of two patterns most likely:

- **Pattern A:** `@astrojs/sitemap` plugin produces `sitemap-0.xml` + `sitemap-index.xml`, plus a custom `src/pages/sitemap-dynamic.xml.ts` produces the dynamic one.
- **Pattern B:** Both are custom `.ts` route handlers.

Either way, the SPEC's job is:

1. Make `sitemap-dynamic.xml` (the comprehensive one) the **canonical source**.
2. **Remove `sitemap-0.xml`** OR redirect it 301 to `sitemap-dynamic.xml` (to preserve any external references).

**B. Switch all URLs to `www.`.**

The generator currently emits `prizma-optic.co.il/...`. Change to `www.prizma-optic.co.il/...`. Two ways:

- **Option B1 (recommended):** read from `astro.config.mjs` `site:` property; ensure that property is set to `https://www.prizma-optic.co.il`.
- **Option B2:** read from tenant config's `custom_domain`. SaaS-clean for multi-tenant but requires the tenant config row to specify `www.` prefix.

The executor picks whichever matches the existing pattern with minimal change.

**C. Add `/branches/` and per-branch routes.**

Extend the dynamic generator to:

1. Query `v_storefront_branches` for the resolved tenant.
2. Emit `/branches/` (index) + `/branches/[slug]/` per branch.
3. Emit the same per locale (HE root, `/en/branches/`, `/en/branches/[slug]/`, same for `/ru/`).
4. Set `lastmod` to `tenant_branches.updated_at`.

**D. Update `robots.txt`.**

Ensure the `Sitemap:` directive points to `https://www.prizma-optic.co.il/sitemap-dynamic.xml` (or whichever canonical name we land on).

**E. End-to-end QA — every touched page (Daniel directive).**

After deploy, the executor MUST verify:

1. `sitemap-dynamic.xml` returns 200, contains ≥365 URLs (was 362, +3 for branches/index/he+en+ru — actually +6 for index+detail × 3 langs ≈ +6, expect ~368).
2. Every URL in the new sitemap **starts with `https://www.prizma-optic.co.il/`** (no apex).
3. Every URL in the new sitemap returns **200 OK** when fetched (random sample of 30 + all branch URLs explicitly).
4. `sitemap-0.xml` either returns 404 or 301-redirects to `sitemap-dynamic.xml` (whichever the executor chose).
5. `robots.txt` references the canonical sitemap.
6. `/branches/`, `/branches/ashkelon/`, `/en/branches/`, `/en/branches/ashkelon/`, `/ru/branches/`, `/ru/branches/ashkelon/` — all 6 return 200 and render (regression check).
7. `/sitemap.xml` (if it exists as a sitemap-index) lists the canonical sitemap.
8. Submit the canonical sitemap URL through Google Rich Results Test as a sanity-check parse-pass.

The executor saves a screenshot per page check + the curl outputs for the canonical-domain check.

### Out of scope

- Adding a sitemap-index file if one doesn't exist (only fix what's there).
- Per-image sitemap (image-sitemap is a separate enhancement).
- News sitemap (we don't publish dated news).
- Touching the Vercel redirect rule between apex and www (already correct as 307).
- Modifying any actual page content.

### Whitelist of write paths

**Storefront repo:**
1. MODIFY `astro.config.mjs` if `site:` property needs adjustment.
2. MODIFY OR CREATE the dynamic sitemap generator (`src/pages/sitemap-dynamic.xml.ts` or wherever).
3. DELETE OR REDIRECT `sitemap-0.xml` source (`public/sitemap-0.xml`, `src/pages/sitemap-0.xml.ts`, or `@astrojs/sitemap` plugin disabled).
4. MODIFY `public/robots.txt` to reference canonical sitemap.
5. CREATE `scripts/verify-sitemap.mjs` — production smoke test that fetches sitemap, samples URLs, checks `www.` prefix, asserts /branches/ entries.

**ERP repo:**
6. CREATE `modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_CONSOLIDATION/EXECUTION_REPORT.md`
7. CREATE `modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_CONSOLIDATION/FINDINGS.md`
8. CREATE `modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_CONSOLIDATION/qa/*.png` (screenshots from §E live verification)
9. UPDATE `roles/site-overseer/SITE_OVERSEER_HANDOFF.md`
10. APPEND `roles/site-overseer/DECISIONS_LOG.md`

No DB writes (read-only queries from generator). No deploys beyond Vercel-on-merge.

---

## 6. Success Criteria

| # | Criterion | Verification | Expected |
|---|---|---|---|
| 1 | Step 0 sanity passed | Step 0 outputs | All 7 sub-checks PASS |
| 2 | Sitemap source identified + documented | EXECUTION_REPORT § "where the sitemap comes from" | path + generator type clear |
| 3 | `sitemap-dynamic.xml` emits ALL URLs with `https://www.prizma-optic.co.il/` prefix | grep | 100% www |
| 4 | `sitemap-dynamic.xml` includes `/branches/` index + `/branches/ashkelon/` in all 3 langs | grep | ≥6 branch-related entries |
| 5 | `sitemap-dynamic.xml` URL count ≥ pre-change baseline + branches | wc | ≥362 + 6 = ≥368 |
| 6 | `sitemap-0.xml` either 404 OR 301→dynamic | curl | one of the two |
| 7 | `robots.txt` Sitemap line points to canonical | curl + grep | matches |
| 8 | All 30 sampled URLs from new sitemap return 200 | curl loop | 30/30 PASS |
| 9 | All 6 branch-URL variants return 200 | curl | 6/6 PASS |
| 10 | `/branches/` and `/branches/ashkelon/` still render correctly post-change | Chrome MCP smoke test | non-zero body, gallery loads |
| 11 | Storefront commit + ERP commit | git log | one each, descriptive |
| 12 | Both repos clean | git status | nothing to commit |
| 13 | Integrity gate clean (ERP) | npm run verify:integrity | exit 0 |
| 14 | Vercel deploy READY post-merge | Vercel MCP | state=READY, target=production |
| 15 | `verify-sitemap.mjs` PASSES on production | exit code | 0 |
| 16 | Iron Rule 25 build-time check still PASSES (regression) | npm run build | exit 0 |
| 17 | L-PROJECT-002 CHECK constraints still present (regression) | pg_constraint query | 2 rows |
| 18 | Footer cookie link, branches link still present (regression) | grep src/components/Footer.astro | both present |
| 19 | Per-page QA evidence saved | qa/ folder | ≥6 screenshots + curl logs |

---

## 7. Autonomy Envelope

**Executor MAY autonomously:**
- Modify whitelist storefront files.
- Run `npm run build` to verify.
- Apply (NO DB writes — generator just reads existing tables).
- Commit + push BOTH repos to develop ONCE each.
- Open the storefront PR.
- Run Chrome MCP + curl verifications on production after merge.
- Save QA artifacts to SPEC folder.

**Executor MUST stop and report:**
- The sitemap generator pattern is exotic (e.g. server-side endpoint with auth) — STOP, propose narrow fix.
- After change, ANY URL in the new sitemap returns non-200 → STOP, the URL is broken or excluded incorrectly.
- After change, `/branches/ashkelon/` regresses (was working, now 404) → STOP, fix-up immediately.
- robots.txt change reveals an unrelated issue (e.g., Disallow rule blocks production) → STOP and surface.
- The new sitemap exceeds 50,000 URLs (Sitemaps protocol limit) → STOP, need to split.

**Executor MUST NOT:**
- Push directly to main (Daniel-only PR-merge).
- Touch tenant config / DB schema.
- Modify product/brand pages.
- Skip §E QA verification — Daniel explicitly required it.
- Hardcode `prizma-optic.co.il` (without `www.`) in any code.
- Hardcode tenant-specific URLs.

---

## 8. Stop-on-Deviation Triggers

In addition to global:
- robots.txt parser yields error → STOP.
- New sitemap fails XML validation → STOP.
- More than 5% of sampled URLs return non-200 → STOP, the canonical-domain switch is broken.

---

## 9. Expected Final State

**On disk (storefront commit X, ERP commit Y):**
- 1 sitemap source (`sitemap-dynamic.xml`), `sitemap-0.xml` source removed/redirected.
- `astro.config.mjs` confirmed canonical site is `https://www.prizma-optic.co.il`.
- `robots.txt` references canonical sitemap only.
- `verify-sitemap.mjs` available as ongoing regression check.
- ERP retro + 6+ QA screenshots.

**On live storefront:**
- `https://www.prizma-optic.co.il/sitemap-dynamic.xml` → 368+ URLs, all `www.`, includes branches.
- `https://www.prizma-optic.co.il/sitemap-0.xml` → 404 or 301.
- `https://www.prizma-optic.co.il/robots.txt` → canonical sitemap.
- Branches pages still load identically.

**Future tenant onboarding:** the sitemap generator already enumerates from DB; new tenant gets sitemap entries for free. ✓

---

## 10. Commit Plan

**Storefront commit:**
```
chore(storefront): consolidate sitemap, switch to canonical www domain, add /branches/ routes (closes REC-SITE-011)

Single sitemap source of truth: sitemap-dynamic.xml.
- Removed redundant sitemap-0.xml (28 URLs all duplicated by the
  dynamic one).
- All sitemap URLs now use https://www.prizma-optic.co.il/... (canonical),
  not bare prizma-optic.co.il (which 307-redirects).
- New routes from M3_BRANCHES_INFRA_AND_ASHKELON now in sitemap:
  /branches/, /branches/ashkelon/, plus /en/ and /ru/ variants. Reads
  v_storefront_branches at build time so future branches/tenants are
  included automatically.
- robots.txt Sitemap directive points to canonical.
- New scripts/verify-sitemap.mjs as ongoing regression check.

Verified on production:
- 368+ URLs, 100% www-prefixed.
- 30 sampled URLs all return 200.
- All 6 branch-URL variants (3 langs × index+detail) return 200.
- sitemap-0.xml returns 404 (or 301, depending on chosen path).
```

**ERP commit:**
```
chore(spec): close M3_SITEMAP_CONSOLIDATION

Closes REC-SITE-011. EXECUTION_REPORT + FINDINGS in SPEC folder.
6+ QA screenshots saved to qa/ subfolder. Site Overseer HANDOFF
updated to reflect the new sitemap-dynamic.xml as canonical.
```

---

## 11. Methodology — the §E QA cycle

After Vercel deploys to production, executor runs:

```
1. node scripts/verify-sitemap.mjs
   - Fetches sitemap-dynamic.xml
   - Asserts every URL starts with https://www.prizma-optic.co.il/
   - Samples 30 random URLs, fetches each, asserts 200
   - Asserts presence of /branches/, /branches/ashkelon/, /en/branches/, etc.
   - Exit 0 = pass, exit 1 = fail with detailed log

2. Chrome MCP smoke tests:
   - Open /branches/ → assert page renders + lists Ashkelon
   - Open /branches/ashkelon/ → assert all 4 gallery images load
   - Open /en/branches/, /ru/branches/, etc. → assert renders
   - Take screenshot per page

3. Curl checks:
   - sitemap-dynamic.xml → 200, valid XML
   - sitemap-0.xml → 404 or 301
   - robots.txt → contains canonical Sitemap line
   - /sitemap.xml (if exists) → references the dynamic one

4. Save all artifacts (screenshots + curl outputs) to:
   modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_CONSOLIDATION/qa/
```

Only after ALL of the above pass, the executor opens the ERP retro commit.

---

## 12. Cross-Reference Check (Step 1.5)

Performed 2026-05-09:
- The dynamic sitemap generator pattern is in storefront repo (verified live; specific path TBD by executor in Step 0).
- `v_storefront_branches` view exists (deployed by M3_BRANCHES_INFRA_AND_ASHKELON 2026-05-08, anon GRANT verified). ✓
- L-PROJECT-002 check constraints not affected by this SPEC. ✓
- Iron Rule 25 build-time check not affected. ✓
- M3_COOKIE_CONSENT_OPT_IN footer link not affected. ✓
- M3_TENANT_NAME_FALLBACK_SAAS resolveTenantNameFallback not affected. ✓

**0 collisions.**

---

## 13. Lessons already incorporated

- `feedback_audit_real_world_check.md` — finding correctly MEDIUM (SEO upside, not customer harm).
- `feedback_always_saas_clean.md` — sitemap reads from DB, future tenant/branch in sitemap automatically.
- Daniel directive 2026-05-09 (full QA after change) — codified as §E with screenshot evidence required.
- M3_BRANCHES_INFRA_AND_ASHKELON 2026-05-08 — `/branches/` routes deployed but Google can't find them yet without sitemap inclusion.

---

## 14. Estimated effort

- 1.5-3 hours executor wall time. Bulk: locate generator + canonical-domain switch + branches inclusion + 30-URL sample + Chrome MCP smokes.
- One Daniel interaction: PR-merge button click.

---

## 15. Definition of Done

All 19 success criteria pass. Two atomic commits. Both repos clean. Live production verified: sitemap-dynamic.xml is canonical with all URLs www-prefixed and branches included; sitemap-0.xml is gone; robots.txt updated; all branch pages still render; 30+6 URLs sampled all return 200. Site Overseer HANDOFF marks REC-SITE-011 CLOSED.

---

*End of SPEC.*
