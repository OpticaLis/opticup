# FINDINGS.md — POST_DNS_PERF_AND_SEO

Findings that surfaced during SPEC execution but were *outside the SPEC's direct scope* or were resolved via rationale rather than code change. Logged here so they survive the learning loop.

---

## §1. Logo `Cache-Control` duration — deferred by design

**Severity:** LOW
**Location:** `vercel.json` header block for `/images/*`, and `/images/prizma-logo-site.png` in particular.
**Current state:** `max-age=86400, s-maxage=604800` (1 day browser / 1 week CDN).

**Finding.** The SPEC audit flagged the logo's cache duration as modest, and the SPEC listed "Extend logo cache when filename gets hash" as Phase C item 15. Daniel's SPEC text marked this as "deferred until redesign" because the logo file `prizma-logo-site.png` does not currently carry a content hash in its URL, so a longer browser cache would trap users with a stale logo if the tenant ever uploads a new one.

**Why deferred, not fixed.** Extending `max-age` without a hashed filename is strictly a bet against logo changes. The right fix is orthogonal: when the logo is re-uploaded (e.g. during the planned redesign), stamp the URL with a version param or hash path and only then set `max-age=31536000, immutable`. Implementing that requires changes to the logo-upload pipeline (ERP Studio), not the storefront.

**Suggested next action.** No SPEC. Tag as TECH_DEBT if the logo change is on a near-term roadmap; else leave alone. Not a bug.

---

## §2. Duplicate `<h2>` across responsive breakpoints — no-op by rationale

**Severity:** INFO (cosmetic)
**Location:**
- `src/components/blocks/StoryTeaserBlock.astro` — `<h2>{data.title}</h2>` at line 25 (mobile variant, `lg:hidden`) and line 71 (desktop variant, `hidden lg:grid`).
- `src/components/blocks/OptometryTeaserBlock.astro` — same pattern.
- `src/components/blocks/EventsShowcaseBlock.astro` — `<h2>{data.section_title}</h2>` at line 21 (grid layout) and line 84 (flanked layout), both gated by `layout !== 'flanked'` / `layout === 'flanked'` so only one renders *per block instance* — but the `centerTitle` `<h2>` at line 122 (mobile) and line 162 (desktop) *are* duplicated via breakpoint containers.

**Finding.** The audit (part 2 of the session) flagged duplicate `<h2>` text rendered into the HTML because both mobile and desktop versions sit in the DOM at render time, with one hidden via `display: none`.

**Why no-op.** Investigation during Phase C showed this is not actually an accessibility or SEO bug:

1. Modern screen readers (NVDA 2020+, JAWS 2020+, VoiceOver) **respect `display: none`** and do not announce hidden content. So the on-screen user never hears the duplicate.
2. Google's mobile-first indexing means the crawler uses mobile viewport rendering. The desktop copy is `display: none` there. Lighthouse's `heading-order` audit flags *skips* (e.g. h1 → h3), not duplicates — and the audit already passes.
3. The responsive layouts differ structurally: on mobile, the pattern is `title → image → body → cta` (column flow); on desktop, it's `[text-column] | [image-column]` (two-column grid). Collapsing to a single DOM copy with CSS `order` requires restructuring how title interacts with image on mobile. A refactor would risk visual regressions in 3 block components for no user-facing gain.

**Suggested next action.** Do not fix proactively. Open a dedicated SPEC **only if** a real a11y audit (e.g. a Hebrew-speaking WCAG auditor with JAWS/NVDA test) flags it as a bug. Keep in TECH_DEBT as watch-only.

---

## §3. `vercel.json` is 8,601 lines — edit risk

**Severity:** LOW (meta)
**Location:** `vercel.json` at repo root.

**Finding.** The file is dominated by WordPress-migration `redirects` entries. Editing `headers` in such a large file requires careful line-targeted edits. A bad regex or out-of-order `source` entry could silently break caching or security headers.

**Suggested next action.** Consider splitting into `vercel.headers.json` + `vercel.redirects.json` merged at build time by a small script, OR moving redirects to a middleware. Out of scope for this SPEC — file as TECH_DEBT.

---

## §4. Six files with hardcoded/fallback `opticup-storefront.vercel.app` before fix

**Severity:** MEDIUM (fixed in Phase A)
**Location:** `src/pages/{index,en/index,ru/index}.astro` + `src/pages/{,en/,ru/}products/[barcode].astro` (6 files total).

**Finding.** Before this SPEC, 6 files constructed absolute URLs for JSON-LD / product schemas using either `import.meta.env.PUBLIC_SITE_URL || 'https://opticup-storefront.vercel.app'` or hardcoded `\`https://opticup-storefront.vercel.app/...\``. After DNS cutover to `prizma-optic.co.il`, all 6 emitted wrong-domain URLs in structured data, making Google see canonical mismatch on every route. Root cause: no shared helper for site-URL resolution — each file did it locally.

**Status.** Fixed in commit `d8a1466` (`Astro.site?.origin ?? import.meta.env.PUBLIC_SITE_URL ?? 'https://prizma-optic.co.il'`). All 6 files now converge on the same fallback chain.

**Suggested next action.** Extract `getSiteUrl(Astro)` into `src/lib/site-url.ts` and import everywhere so there is one source of truth. Mirrors Proposal #1 in EXECUTION_REPORT.md §8. **Small follow-up SPEC, maybe 30 minutes.**

---

## §5. Pre-existing `_originals/` directory in `public/images/brands/`

**Severity:** INFO
**Location:** `public/images/brands/_originals/`.

**Finding.** Noticed during Phase B brand-logo conversion that there's a `_originals/` subdirectory at `public/images/brands/_originals/`. Assumed to be pre-conversion backups from a previous optimization pass. Not touched by this SPEC.

**Suggested next action.** Verify the directory is intentional (not a WIP from an older session). If it's unused, delete to reduce repo size. Not urgent.

---

## §6. `products/[barcode].astro` grew to 307 lines (soft warn)

**Severity:** INFO
**Location:** `src/pages/products/[barcode].astro` — now 307 lines after Phase A added 2 lines for siteUrl helper.

**Finding.** Pre-commit hook warned that the file is over the 300-line soft target. Still under the 350-line hard max, so the commit succeeded. This is informational.

**Suggested next action.** When the next edit to this file happens, consider extracting product-page-specific SEO assembly into a helper module. Not urgent — the soft-target is meant to trigger attention, not blocking.

---

## §7. Orphan files removed at session start

**Severity:** RESOLVED (removed at session start)
**Location:** `hero-video.mp4` (6 MB) and `scripts/upload-hero-video.mjs`.

**Finding.** Two untracked files left over from the reverted MP4 approach (commits `d69a4f6` → `29d5b84` → `3ea5df8`). Daniel confirmed deletion at session start under option (b) "selective git add."

**Status.** Removed locally before any Phase A edits. Verified they were not tracked.

---

*FINDINGS.md — written by opticup-executor on 2026-04-18.*
