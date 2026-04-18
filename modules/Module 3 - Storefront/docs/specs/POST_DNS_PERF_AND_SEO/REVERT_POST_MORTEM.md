# POST_DNS_PERF_AND_SEO — Revert Post-Mortem

**Date:** 2026-04-18
**Author:** Daniel + Strategic Architect (Cowork session)
**Severity:** Production regression — PageSpeed mobile 89 → 47

---

## What happened

After DNS switch to Vercel (same day, 2026-04-18), a performance audit identified 18 improvements across SEO, caching, accessibility, and best practices. All 18 were implemented in a single Claude Code session across 4 commits on develop (`3f9c567`, `d8a1466`, `092bd1b`, `8106116`), merged to main as `a3ff2d1`.

PageSpeed mobile score dropped from **89 → 58** immediately.

Two subsequent hotfix attempts were made:
- `9056307` — Astro middleware for cache headers (had early-return bug, didn't work)
- `dd7ddcf` — Fixed the middleware bug

After both hotfixes, PageSpeed dropped further to **47**.

Daniel ordered a full revert. Main was restored to commit `62ebe0e` (the pre-changes state) via commit `8c362c1`. Eye favicon added as `b1a7312`.

---

## Root causes of the regression

### 1. Hero video on mobile (PRIMARY — estimated -20 to -30 points)
**Commit:** `3f9c567`
**What:** Removed the `isMobile` gate that prevented YouTube iframe loading on mobile. Mobile now loads the YouTube embed after page load.
**Impact:** YouTube embed ships ~800KB of JavaScript + assets. This is a fundamental weight penalty that no lazy-loading delay can offset. The mobile poster-only approach existed specifically to keep the score high.
**Lesson:** Loading YouTube on mobile is a deliberate UX-vs-performance tradeoff. It should have been presented as such with estimated impact BEFORE implementation, not discovered after.

### 2. Cache middleware broken (SECONDARY — estimated -5 to -10 points)
**Commits:** `9056307`, `dd7ddcf`
**What:** Created `src/middleware.ts` to set `s-maxage=60` on HTML responses. First version had an early-return bug (`if (response.headers.get('cache-control')) return response`) — Astro's default `public, max-age=0` triggered the exit, so the middleware never set s-maxage. Second version fixed the logic but was deployed alongside other regressions.
**Impact:** Every page hit the SSR cold path (~2.8s TTFB). Cache would have reduced repeat-visit TTFB to <200ms.
**Lesson:** Cache middleware must be verified with `curl -I` BEFORE merging to main. The fix should have been tested on localhost:4321 first.

### 3. 18 changes batched without measurement (PROCESS — amplified all other issues)
**What:** 18 audit findings were implemented in one session without measuring PageSpeed between changes.
**Impact:** Impossible to identify which change caused the regression without binary-search debugging. Multiple changes interacted in unpredictable ways (e.g., `<picture>` wrappers adding HTML weight, CSP header adding parse overhead).
**Lesson:** Performance changes MUST be applied one at a time with before/after measurement.

### 4. Brand logo `<picture>` wrappers (MINOR — estimated -2 to -3 points)
**Commit:** `092bd1b`
**What:** Wrapped 26 brand logos in `<picture><source type="image/webp">` elements. While the WebP files were smaller (-72% bytes), the HTML grew by ~1KB per page from the additional markup.
**Impact:** Minor HTML weight increase, more DOM nodes for the parser.
**Lesson:** Format optimization should happen at the image proxy level (`/api/image/`), not by adding HTML complexity.

### 5. File truncation (TOOLING — caused broken script)
**What:** The Cowork session's Write tool truncated `HeroLuxuryBlock.astro` at line 108 (should be 133). The `<script>` tag was incomplete — the `loadHeroYouTube()` function was cut off mid-line. This was discovered during post-revert investigation.
**Impact:** On the local disk, the hero video script was broken. However, git had the correct version and Vercel deploys from git, so production was likely unaffected. But this masked the ability to debug locally.
**Lesson:** After any Write to a file with a `<script>` section, always Read the end of the file to verify it wasn't truncated. This is a known issue (also documented in BrandShowcaseBlock memory).

---

## What was reverted

All 6 commits after `62ebe0e` were fully reverted from main:

| Commit | Description | Status |
|--------|-------------|--------|
| `3f9c567` | Hero mobile video lazy-load | ❌ Reverted |
| `d8a1466` | Phase A — 8 Critical+High fixes | ❌ Reverted |
| `092bd1b` | Phase B — 6 Medium fixes | ❌ Reverted |
| `8106116` | Phase C — 2 Low + 2 no-op | ❌ Reverted |
| `9056307` | Cache middleware (broken) | ❌ Reverted |
| `dd7ddcf` | Cache middleware fix v2 | ❌ Reverted |

29 files added after `62ebe0e` were deleted (middleware.ts, .gitattributes, 26 WebP logos, convert script). 3 new favicon files added.

---

## What was lost that we still want

Some of the 18 changes were genuinely valuable and should be re-applied — but ONE AT A TIME with measurement:

### Safe to re-apply (no performance risk):
1. **JSON-LD URLs** — `vercel.app` → `prizma-optic.co.il`. Pure SEO fix, zero perf impact. (~5 min)
2. **Supersale `<h1>`** — add sr-only h1. HTML-only, zero perf impact. (~2 min)
3. **Supersale JSON-LD** — add structured data. Tiny HTML addition. (~5 min)
4. **`og:locale:alternate`** — 3 meta tags. Trivial. (~2 min)
5. **Footer h4→h3** — heading hierarchy fix. Zero perf impact. (~2 min)
6. **Supabase dns-prefetch** — one `<link>` tag. (~1 min)

### Needs careful testing (potential perf impact):
7. **Edge caching (s-maxage)** — biggest TTFB win, but middleware approach failed. Try setting headers in vercel.json ONLY (remove Astro middleware), test with `curl -I`. Measure PageSpeed before/after.
8. **Image proxy immutable cache** — good for repeat visits, but frozen file. Test separately.
9. **UserWay lazy-load** — should help, but verify with before/after measurement.
10. **Hero poster srcset** — smaller images on mobile, should help. Test separately.
11. **CampaignCard image dimensions** — width/height for CLS. Should help, test separately.
12. **Hero poster width/height** — same pattern. Test separately.
13. **CSP Report-Only** — ~1.2KB header. Probably safe but measure.

### Requires Daniel's decision (known tradeoff):
14. **Hero video on mobile** — costs ~20-30 PageSpeed points. Options:
    - (a) Accept the tradeoff for better UX
    - (b) Click-to-play facade (poster + ▶️ button, user taps to start)
    - (c) Keep poster-only on mobile (current production state)

### Skip entirely:
15. **Brand logos WebP `<picture>` wrappers** — do at proxy level instead, not HTML
16. **`.gitattributes`** — useful but not production-facing, add to develop only
17. **`src/middleware.ts`** — failed approach, use vercel.json headers instead

---

## Process rules going forward

1. **One change per commit, one measurement per change.** Run PageSpeed mobile before and after every performance-related commit.
2. **Establish baseline BEFORE starting.** Record the exact score, LCP, FCP, TTFB in the SPEC.
3. **Verify cache headers with `curl -I` on localhost** before merging to main.
4. **Test on localhost:4321 first** — never go straight to production for performance work.
5. **Known-cost features need explicit approval.** If a change is known to cost PageSpeed points (like mobile YouTube), present the tradeoff to Daniel BEFORE implementing.
6. **Never commit favicon or branding changes as uncommitted WIP.** Always commit immediately — `git checkout -- .` will destroy them.
7. **Check for file truncation after Write tool edits.** Always Read the last 10 lines of any file after editing, especially files with `<script>` sections.
8. **Hotfixes to hotfixes = stop.** If the first fix doesn't work, revert instead of stacking more fixes. Each layer adds risk.

---

*Post-mortem written 2026-04-18 by Strategic Architect (Cowork session).*
*Revert commit: `8c362c1`. Favicon commit: `b1a7312`. Main restored to `62ebe0e` tree.*
