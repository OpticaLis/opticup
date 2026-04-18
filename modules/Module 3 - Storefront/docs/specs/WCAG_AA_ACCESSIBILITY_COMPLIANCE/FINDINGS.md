# FINDINGS — WCAG_AA_ACCESSIBILITY_COMPLIANCE

> **Location:** `modules/Module 3 - Storefront/docs/specs/WCAG_AA_ACCESSIBILITY_COMPLIANCE/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Remaining `alt=""` in non-scoped components

- **Code:** `M3-A11Y-01`
- **Severity:** MEDIUM
- **Discovered during:** SC-5 verification grep after Commit 4
- **Location:**
  - `src/components/blocks/HeroBlock.astro:40`
  - `src/components/blocks/HeroLuxuryBlock.astro:33`
  - `src/components/brand/BrandHero.astro:47` (class="pattern-logo")
  - `src/components/brand/BrandLogoFallback.astro:19` (class="logo-fallback-bg-item")
  - `src/components/SearchBar.astro:112` (product thumbnail in search-results template string)
- **Description:** SPEC SC-5 requires all `<img>` to have a non-empty `alt` OR explicit `role="presentation"`. Five occurrences of `alt=""` remain in components NOT listed in the dispatch scope (dispatch scoped alt-fixes to EventsShowcaseBlock, CampaignLightbox, ProductImageCarousel). Four are plausibly decorative (hero background, pattern logo, fallback brand logo background); SearchBar:112 is informative — a product thumbnail in the search-dropdown template literal, where the adjacent elements already show brand + model, so it could validly be `alt=""` with `role="presentation"` if the text next to it is considered the label, but best practice is a descriptive alt.
- **Reproduction:**
  ```
  grep -rn 'alt=""' src/components/ --include="*.astro"
  ```
- **Expected vs Actual:**
  - Expected (per SC-5): every `alt=""` paired with `role="presentation"`
  - Actual: 5 occurrences without `role="presentation"`
- **Suggested next action:** NEW_SPEC (tiny — 5 one-line edits across 5 files plus a decision per image whether it's decorative or informative)
- **Rationale for action:** These were outside the dispatch scope, and unilaterally adding `role="presentation"` to HeroBlock/HeroLuxuryBlock without a visual review might be wrong (e.g. if the hero image IS the only content). Foreman should decide: (a) quick follow-up SPEC to classify each, or (b) TECH_DEBT if DNS switch is imminent.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `EventsShowcaseBlock.astro` now 305 lines (5 over soft cap 300)

- **Code:** `M3-A11Y-02`
- **Severity:** LOW
- **Discovered during:** Pre-commit hook warning on Commit 4
- **Location:** `src/components/blocks/EventsShowcaseBlock.astro` (305 lines after edits, was 304 before)
- **Description:** CLAUDE.md §5 file-size rule targets 300 lines, hard max 350. EventsShowcaseBlock was already at 304 lines before this SPEC; adding 1 line of alt-text fallback logic pushed it to 305. Still well within hard max. Pre-commit hook emitted `file-size: 0 violations, 1 warnings`. The file already had split opportunities (grid layout vs flanked layout — two big JSX branches).
- **Reproduction:**
  ```
  wc -l src/components/blocks/EventsShowcaseBlock.astro
  ```
- **Expected vs Actual:**
  - Expected (soft): ≤ 300 lines
  - Actual: 305 lines
- **Suggested next action:** TECH_DEBT (add to `TECH_DEBT.md` — refactor grid vs flanked into separate sub-components when next touching this file)
- **Rationale for action:** Not worth a standalone SPEC; natural split (grid branch vs flanked branch) can piggyback on any future functional change to events.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — `404.astro` misuses `getThemeCSS()` signature

- **Code:** `M3-A11Y-03`
- **Severity:** LOW
- **Discovered during:** Writing the 3 new accessibility pages — compared `getThemeCSS` call sites across the repo
- **Location:** `src/pages/404.astro:13`
- **Description:** `src/lib/tenant.ts:237` declares `export function getThemeCSS(theme: Record<string, string>): string`. All callers pass `tenant.storefront.theme` (see `index.astro`, `brands/[slug].astro`, etc.). `404.astro` passes the whole `tenant` object. Because `getThemeCSS` guards with `if (!theme || Object.keys(theme).length === 0) return ''`, and TenantConfig objects have many keys that are non-strings (booleans, nested objects), the function silently returns a malformed style string like `--color-id: ...; --color-slug: prizma; --color-name: אופטיקה פריזמה; --color-storefront: [object Object]` — the browser ignores invalid values but the 404 page gets no theme-color CSS variables. Visual impact: minimal (404 page is unstyled-ish anyway). Type safety impact: TypeScript should have caught this but didn't because both are essentially `object` at the call site.
- **Reproduction:**
  ```
  grep -n 'getThemeCSS(' src/pages/**/*.astro
  ```
- **Expected vs Actual:**
  - Expected: `getThemeCSS(tenant.storefront.theme)` (like every other page)
  - Actual: `getThemeCSS(tenant)` (passes whole TenantConfig)
- **Suggested next action:** TECH_DEBT (trivial one-line fix, but unrelated to accessibility — piggyback on any future 404-page or tenant-resolution edit)
- **Rationale for action:** Real-world impact is zero (404 page still functions, theme just isn't applied). Three-word code change. Not worth a SPEC; log and fix on next natural visit.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — Footer "Accessibility" link label is identical in EN and RU keys

- **Code:** `M3-A11Y-04`
- **Severity:** INFO
- **Discovered during:** Reading `Footer.astro:95` to verify the dead link before creating pages
- **Location:** `src/components/Footer.astro:95` (`defaultColumns`, "Legal" column)
- **Description:** The link uses `{ he: 'הצהרת נגישות', en: 'Accessibility', ru: 'Доступность' }` which is FINE — but the footer link URL is `/accessibility/` for all 3 locales, which means the EN and RU pages at `/en/accessibility/` and `/ru/accessibility/` are NOT directly linked from the footer in those languages. A user switching to EN via the language switcher on any page will see the footer link still pointing at the HE page. The localePath() mapping in Footer.astro handles this for most links but this particular entry passes `url: '/accessibility/'` with no `url_en` / `url_ru` overrides.
- **Reproduction:**
  ```
  grep -n 'accessibility' src/components/Footer.astro
  ```
- **Expected vs Actual:**
  - Expected: footer link resolves to `/en/accessibility/` when locale=en, `/ru/accessibility/` when locale=ru
  - Actual: footer link resolves to `/accessibility/` in all locales (because Footer's `getLinkUrl()` wraps the URL through `localePath` which should prepend the locale prefix — need to verify actual behavior in browser)
- **Suggested next action:** DISMISS or verify-then-TECH_DEBT
- **Rationale for action:** `localePath('/accessibility/', 'en')` should yield `/en/accessibility/` based on the helper's behavior elsewhere. This might already work correctly — I did not verify in a browser. Flagged so Foreman/Daniel can check during SC-14 manual QA.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — SC-14 (visual / homepage renders correctly) deferred, not executed

- **Code:** `M3-A11Y-05`
- **Severity:** INFO (meta — about execution itself)
- **Discovered during:** SPEC §3 verification after Commit 4
- **Location:** N/A (process finding)
- **Description:** SPEC SC-14 reads "Homepage renders correctly — No visual regression — Manual browser check on localhost:4321". The executor ran in headless mode; no `npm run dev` was started. All static verifications (build, TypeScript, grep) pass. A visual regression is theoretically possible if adding ARIA attributes changed rendered dimensions, but in practice ARIA attributes are non-visual and the only visual change was `text-gray-300 → text-gray-500` on 2 disabled-language spans (mild darkening, not a layout shift). Nevertheless, SC-14 is strictly unverified.
- **Reproduction:**
  ```
  # To verify:
  npm run dev
  # then load: localhost:4321 / localhost:4321/en/ / localhost:4321/ru/
  # and: localhost:4321/accessibility/ / /en/accessibility/ / /ru/accessibility/
  ```
- **Expected vs Actual:**
  - Expected: someone confirms the 3 accessibility pages render and no regression in homepage/product-page/contact
  - Actual: not verified in this session
- **Suggested next action:** DISMISS (will be caught in Daniel's pre-merge QA pass, per CLAUDE.md §8 rule 7 — only Daniel merges to main)
- **Rationale for action:** SC-14 is inherently a human-loop criterion. The appropriate gate is Daniel's QA before the develop → main merge. Logging so it's visible in the retrospective.
- **Foreman override (filled by Foreman in review):** { }
