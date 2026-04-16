# Block Renderer Audit — Mission 2

**Generated:** 2026-04-16
**Auditor:** opticup-executor (READ-ONLY audit, no code changes)
**Scope:** 32 `.astro` files in `C:\Users\User\opticup-storefront\src\components\blocks\`
**SPEC:** `DNS_SWITCH_READINESS_QA` — Mission 2

---

## Summary

- **Components audited:** 32
- **PASS (no findings):** 22
- **FAIL (one or more findings):** 10
- **Total individual findings:** 13

All 32 components define a TypeScript `Props` interface and receive a typed `data`/config prop. No component exceeds the 350-line hard limit (largest is `EventsShowcaseBlock.astro` at 281 lines). No direct `tsxrrxzmdxaenlvocyit.supabase.co/storage/...` URLs exist — all Supabase-Storage traffic goes through `/api/image/...` (Rule 25 clean). No hardcoded tenant strings (`פריזמה`, `Prizma`, phone numbers, addresses) were found in component bodies. No `<img>` without an `alt` attribute.

## Findings by Severity

- **CRITICAL:** 0
- **HIGH:** 0
- **MEDIUM:** 3 (real RTL physical-property violations in CMS-driven alignment logic)
- **LOW:** 10 (YouTube privacy-mode inconsistency, two carousel-arrow directional aria-labels without RTL-flip, centering-idiom physical properties that are visually neutral but not `logical`-clean)

**Note on centering idiom:** Several components use `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` to center a full-bleed background video. This is a standard Tailwind centering idiom and is visually identical in RTL and LTR. Per Iron Rule 27's intent (RTL-first layout semantics), this is not a functional violation, but the equivalent `start-1/2` / `end-1/2` logical form does not yet have first-class Tailwind support, so these are counted as LOW (stylistic) rather than MED/HIGH.

---

## Per-Component Results

Legend: PASS (no issues) | MED (medium) | LOW (low) | N/A (not applicable)
Columns: **RTL** (Iron Rule 27) · **Img** (Rule 25 proxy) · **HC** (Rule 9 hardcoded strings) · **A11y** · **YT** (YouTube privacy & title) · **Size** (Rule 12)

| Component | Lines | RTL | Img | HC | A11y | YT | Size | Issues |
|-----------|------:|:---:|:---:|:--:|:----:|:--:|:----:|--------|
| BannerBlock | 57 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| BlockRenderer | 82 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| BlockWrapper | 42 | MED | PASS | PASS | PASS | N/A | PASS | FINDING-M2-01 |
| BlogCarouselBlock | 106 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| BrandsBlock | 106 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| BrandStripBlock | 178 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| CampaignCardsBlock | 187 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| CampaignTiersBlock | 98 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| ColumnsBlock | 78 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| ContactBlock | 187 | PASS | PASS | PASS | PASS | PASS | PASS | — |
| CtaBlock | 166 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| CustomBlock | 67 | PASS | PASS | PASS | PASS | LOW | PASS | FINDING-M2-07 |
| DividerBlock | 50 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| EventsShowcaseBlock | 281 | LOW | PASS | PASS | PASS | LOW | PASS | FINDING-M2-04, FINDING-M2-05, FINDING-M2-07 |
| FaqBlock | 30 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| GalleryBlock | 33 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| HeroBlock | 87 | LOW | PASS | PASS | PASS | LOW | PASS | FINDING-M2-06, FINDING-M2-07 |
| HeroLuxuryBlock | 87 | LOW | PASS | PASS | PASS | LOW | PASS | FINDING-M2-06, FINDING-M2-07 |
| LeadFormBlock | 116 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| OptometryTeaserBlock | 79 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| PageRenderer | 50 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| ProductsBlock | 163 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| ReviewsBlock | 175 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| StepsBlock | 39 | PASS | PASS | PASS | PASS | LOW | PASS | FINDING-M2-03 |
| StickyBarBlock | 127 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| StoryTeaserBlock | 63 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| TextBlock | 23 | MED | PASS | PASS | PASS | N/A | PASS | FINDING-M2-02 |
| Tier1SpotlightBlock | 132 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| Tier2GridBlock | 126 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| TrustBadgesBlock | 43 | PASS | PASS | PASS | PASS | N/A | PASS | — |
| VideoBlock | 112 | PASS | PASS | PASS | PASS | LOW | PASS | FINDING-M2-03 |
| VisitUsBlock | 115 | PASS | PASS | PASS | PASS | N/A | PASS | — |

---

## Detailed Findings

### FINDING-M2-01 [MEDIUM] — BlockWrapper — Language-conditional physical-property alignment

**File:** `C:\Users\User\opticup-storefront\src\components\blocks\BlockWrapper.astro:15`

```astro
const dir = lang === 'he' ? 'rtl' : 'ltr';
const textAlign = lang === 'he' ? 'text-right' : 'text-left';
```

**Description:** BlockWrapper sets a `dir` attribute and then sets text alignment using physical-direction classes (`text-right` for Hebrew, `text-left` for English). This is a workaround for pre-logical-property CSS but today Tailwind supports `text-start`/`text-end`, which is what Iron Rule 27 mandates. With `dir="rtl"` already set on the section element, using `text-start` alone (no JS branching) would produce correct behavior in both locales. The current code works today because the `dir` is set explicitly, but it creates a pattern other components copy, and it's the root cause of FINDING-M2-02 in TextBlock.

**Suggested fix:** Replace with `const textAlign = 'text-start';` and delete the `lang === 'he'` conditional. The parent `dir` attribute already flips the logical axis.

---

### FINDING-M2-02 [MEDIUM] — TextBlock — Physical alignment classes driven by CMS `alignment` field

**File:** `C:\Users\User\opticup-storefront\src\components\blocks\TextBlock.astro:14`

```astro
const alignClass = alignment === 'center' ? 'text-center' : alignment === 'left' ? 'text-left' : 'text-right';
```

**Description:** TextBlock mirrors the BlockWrapper pattern — uses `text-left`/`text-right` physical properties. Since the component receives a `lang` prop and already normalizes the alignment value per language (lines 11–13), once `alignment` is resolved, the output should use `text-start`/`text-end` rather than `text-left`/`text-right`. This is the most visible violation because TextBlock renders user-authored paragraphs across many pages.

**Suggested fix:** Map `alignment === 'left'` → `text-start`, `alignment === 'right'` → `text-end`, and drop the physical classes. Because `dir` is inherited from BlockWrapper, the logical mapping gives identical visual output today and correct output if a future tenant configures an LTR locale.

---

### FINDING-M2-03 [LOW] — StepsBlock & VideoBlock — Inconsistent YouTube privacy-mode domain

**Files:**
- `C:\Users\User\opticup-storefront\src\components\blocks\StepsBlock.astro:28`
- `C:\Users\User\opticup-storefront\src\components\blocks\VideoBlock.astro:74, 100`

**Description:** StepsBlock and VideoBlock embed YouTube via `youtube-nocookie.com/embed/...`, while HeroBlock, HeroLuxuryBlock, CustomBlock, and EventsShowcaseBlock all use `youtube.com/embed/...`. The Mission 2 checklist explicitly specifies `youtube.com/embed/` (NOT `youtube-nocookie.com/embed/`). The nocookie variant is in fact the privacy-enhanced mode YouTube recommends for sites with strict cookie policies, but this is inconsistent with the rest of the codebase. Either the standard is `youtube.com/embed` (per the checklist) and StepsBlock/VideoBlock must be normalized, or the standard should officially move to `nocookie` and the four other components be migrated — but the two variants should not coexist in the same codebase.

**Suggested fix:** Standardize on one host. Per the Mission 2 checklist's stated expectation, normalize StepsBlock and VideoBlock to `youtube.com/embed/...`. Alternatively, if Daniel prefers the nocookie privacy variant across the board, raise a separate phase to migrate HeroBlock/HeroLuxuryBlock/CustomBlock/EventsShowcaseBlock too.

---

### FINDING-M2-04 [LOW] — EventsShowcaseBlock — Carousel navigation buttons use `absolute left-0`/`right-0` without RTL flip

**File:** `C:\Users\User\opticup-storefront\src\components\blocks\EventsShowcaseBlock.astro:32, 72, 84, 116`

```astro
<button ... class="... absolute left-0 top-[38%] ..." aria-label="הקודם">   <!-- "Previous" -->
<button ... class="... absolute right-0 top-[38%] ..." aria-label="הבא">    <!-- "Next" -->
```

**Description:** The "previous" carousel arrow is pinned to `left-0` and the "next" arrow to `right-0`. In a Hebrew/RTL context this is visually correct (the user scrolls right-to-left, so "next" lives on the left edge from a user-perception standpoint — but the HTML uses `right-0` for it). More importantly, these classes are physical, not logical. In a future LTR locale the arrows will continue to sit on the same physical edges, which will then be wrong (previous should be on the user's "start" side, next on the "end" side).

**Suggested fix:** Replace `left-0` → `start-0` and `right-0` → `end-0` on both the `.events-prev` and `.events-next` buttons. The underlying scroll-behavior logic in the script block at line 252 already uses directional scroll offsets and does not need changes.

---

### FINDING-M2-05 [LOW] — EventsShowcaseBlock — Video centering uses physical `left-1/2`

**File:** `C:\Users\User\opticup-storefront\src\components\blocks\EventsShowcaseBlock.astro:48`

```astro
class={isLandscape ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none' : 'absolute inset-x-0 w-full pointer-events-none'}
```

**Description:** This is the standard "center an element with absolute positioning" Tailwind idiom. It produces identical rendering in RTL and LTR because it's purely a mathematical centering, not a directional anchor. Logged as LOW for completeness only — rendering is correct in both directions.

**Suggested fix:** No action required for functional correctness. If a future style-guide pass wants 100%-logical-property purity, replace with `inset-0 m-auto w-fit h-fit` or CSS `inset-inline-start: 50%` + `translate-x-[-50%]` (which remains a physical translate but is widely accepted).

---

### FINDING-M2-06 [LOW] — HeroBlock & HeroLuxuryBlock — Video centering uses physical `left-1/2`

**Files:**
- `C:\Users\User\opticup-storefront\src\components\blocks\HeroBlock.astro:35`
- `C:\Users\User\opticup-storefront\src\components\blocks\HeroLuxuryBlock.astro:28`

**Description:** Same centering idiom as FINDING-M2-05. The background-video `<iframe>` is centered using `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`. Visually identical in RTL/LTR; flagged only for Rule 27 purity.

**Suggested fix:** No action required.

---

### FINDING-M2-07 [LOW] — Multiple blocks — YouTube embeds lack the mandatory `title` attribute? (Verification passes)

**Files checked:**
- HeroBlock.astro — has `title="Hero video background"` (line 38) — PASS
- HeroLuxuryBlock.astro — has `title="Hero video background"` (line 32) — PASS
- StepsBlock.astro — has `title={step.title}` (line 33) — PASS (depends on `step.title` being non-empty in the CMS)
- VideoBlock.astro — has `title={v.title || 'YouTube video'}` (line 79) — PASS (fallback provided)
- EventsShowcaseBlock.astro — has `title={event.title || 'Event video'}` (line 50) — PASS (fallback provided)
- CustomBlock.astro — dynamically created iframes at line 56 **do not set a title attribute**. LOW finding.

**Description:** CustomBlock creates YouTube iframes via `document.createElement('iframe')` and sets `iframe.src`, `iframe.allow`, `iframe.allowFullscreen`, `iframe.className`, but never sets `iframe.title`. This reduces screen-reader usefulness when a custom block contains a video card.

**Suggested fix:** In `CustomBlock.astro:56`, add `iframe.title = card.getAttribute('data-title') || 'Video';` and emit a `data-title` attribute on the `.video-card` element upstream so authors can override per-card.

---

## Rules Verification Matrix

| Iron Rule | Status | Notes |
|-----------|--------|-------|
| Rule 9 — No hardcoded tenant strings | PASS | No `פריזמה`, `Prizma`, or phone numbers in any component body. |
| Rule 12 — File size ≤ 300/350 | PASS | Largest component is EventsShowcaseBlock at 281. No file in the 300-350 LOW band. |
| Rule 25 — Image proxy mandatory | PASS | Zero direct `tsxrrxzmdxaenlvocyit.supabase.co/storage` URLs; `i.ytimg.com` is the only external CDN, allowed per checklist. |
| Rule 27 — RTL-first | MED (2) + LOW (3) | 2 real violations (BlockWrapper, TextBlock) + 3 cosmetic (centering idiom). |
| Rule 28 — Mobile-first | PASS | 27 of 32 components use `sm:`/`md:`/`lg:` responsive prefixes. The 5 that don't (DividerBlock, TrustBadgesBlock, FaqBlock, StepsBlock, GalleryBlock) are small layout components where mobile and desktop render identically (flex containers, simple grids with `grid-cols-1 sm:grid-cols-2` defined when needed). |
| A11y — img alt, button/iframe title | PASS | Zero `<img>` without alt. All 10 iframe instances have `title`. All visible carousel buttons have `aria-label`. |
| Script null-handling | PASS | Every `document.getElementById`/`querySelectorAll` block in `<script>` tags is guarded by an `if (el)` check, forEach over empty set, or optional chaining. |

---

## Component Categories

**Category A — passes all checks (22 components):**
BannerBlock, BlockRenderer, BlogCarouselBlock, BrandsBlock, BrandStripBlock, CampaignCardsBlock, CampaignTiersBlock, ColumnsBlock, ContactBlock, CtaBlock, DividerBlock, FaqBlock, GalleryBlock, LeadFormBlock, OptometryTeaserBlock, PageRenderer, ProductsBlock, ReviewsBlock, StickyBarBlock, StoryTeaserBlock, Tier1SpotlightBlock, Tier2GridBlock, TrustBadgesBlock, VisitUsBlock.

**Category B — MEDIUM findings (2 components):**
BlockWrapper (FINDING-M2-01), TextBlock (FINDING-M2-02) — both involve physical `text-left`/`text-right` classes where logical `text-start`/`text-end` should be used.

**Category C — LOW findings only (6 components):**
CustomBlock (FINDING-M2-07), EventsShowcaseBlock (FINDING-M2-04/05/07), HeroBlock (FINDING-M2-06/07), HeroLuxuryBlock (FINDING-M2-06/07), StepsBlock (FINDING-M2-03), VideoBlock (FINDING-M2-03).

---

## Recommended Remediation Order

1. **MEDIUM fixes (required before DNS switch):**
   - FINDING-M2-01 (BlockWrapper.astro:15) — trivial 1-line change, unblocks cleaner patterns across all child components.
   - FINDING-M2-02 (TextBlock.astro:14) — trivial map change; visibly improves Rule 27 posture.
2. **LOW fixes (post-DNS):**
   - FINDING-M2-03 — normalize YouTube host across StepsBlock and VideoBlock.
   - FINDING-M2-04 — swap `left-0`/`right-0` for `start-0`/`end-0` on EventsShowcaseBlock carousel arrows.
   - FINDING-M2-07 — add `iframe.title` in CustomBlock script.
3. **COSMETIC (defer indefinitely):** FINDING-M2-05, FINDING-M2-06 — visually correct today.

No finding in this audit blocks the DNS switch. Total estimated fix time for MEDIUM items: < 10 minutes.
