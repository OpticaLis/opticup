# T12 — Brand UI Consolidation Proposal

> **Phase:** read-only proposal (T12 of OVERNIGHT_M1_M3_BURNDOWN)
> **Written by:** opticup-executor (Claude Code, Windows desktop)
> **Written on:** 2026-04-26
> **No source changes.** Recommendation document for the Foreman.
> **Builds on:** B1_DEAD_CODE_MAPPING.md (D3+D4 Phase B-1) which first surfaced the duplication.

---

## TL;DR

**Recommendation: retire `storefront-brands.html` + `storefront-brands.js`
in a phased follow-up SPEC.** The standalone Brand Mode Manager page
duplicates two distinct workflows that already live in the Studio
(`studio-brands.js`): brand-page content editing AND brand visibility
toggling. The Studio is the active development surface (last 5 commits
all features); the standalone page is in maintenance-only mode (last 5
commits all structural fixes / refactors). Folding its 3 unique controls
(visibility toggle, display_mode dropdown, product-count badge) into the
Studio Brands tab eliminates ~310 lines of duplicate JS + 1 HTML page +
a future-confusion source for admins.

---

## 1. What each file is, in one sentence

| File | Lines | Purpose | Loaded by |
|------|-------|---------|-----------|
| `studio-brands.js` | 893 | Full Brand Page Editor — content management UI inside the Studio tab navigation. | `storefront-studio.html` (the main Studio entry) |
| `storefront-brands.js` | ~234 (post-T4) | Standalone Brand Mode Manager — table of brands with visibility/display_mode toggles + a separate brand-page modal. | `storefront-brands.html` (standalone page) |

---

## 2. Feature comparison

| Feature | studio-brands.js | storefront-brands.js |
|---------|------------------|----------------------|
| **Brand listing** | ✅ table of brands | ✅ table of brands (filtered to those with visible products) |
| **Quill rich-text editor for descriptions** | ✅ (lines 521-553, both desc1 + desc2) | ❌ |
| **SEO score widget** | ✅ (lines 26-83, live + static calculators) | ❌ |
| **Logo upload + auto-normalization** | ✅ (lines 677-728) | ❌ |
| **WebP image conversion** | ✅ (lines 585-602) | ❌ |
| **Gallery via media picker** | ✅ (lines 612-674, integrated with shared media picker) | ❌ |
| **AI content generation per brand** | ✅ (lines 773-848) | ❌ |
| **Translation editing** | ✅ (lines 850+) | ❌ |
| **Brand visibility toggle (exclude_website)** | ❌ | ✅ (added in T4 today, lines 141-158) |
| **Display_mode dropdown (LEGACY pair)** | ✅ (line 745, embedded in brand-edit form) | ✅ (lines 120-139, standalone column) |
| **Product count badge per brand** | ❌ | ✅ (line 92) |
| **Quick-search across brands** | ✅ (recent feature, commit 12c1c07) | ❌ |
| **`changeBrandMode` (NEW pair, deprecated)** | ❌ | ⚠️ DEAD-CODE candidate (line 166) |
| **Brand page modal** | ✅ rich modal (handled inline in brand editor) | ✅ separate modal (openBrandPageModal lines 188-250+) — **DUPLICATE** |

**Key duplication:** Both files implement a brand-page-editor modal that
write to the same brand-page fields (hero, gallery, description, SEO).
The studio-brands.js version is richer; the storefront-brands.js version
is a thinner subset.

---

## 3. Activity signal (recent commits)

### `studio-brands.js` — last 5 commits

```
813021c feat(saas): getCustomDomain helper + replace prizma-optic.co.il in studio previews
12c1c07 feat(studio): add quick search to brands+campaigns tabs, fix search focus-loss bug
87354c7 fix(studio): resolve storeName ReferenceError crashing gallery preview
25e81c1 fix(studio): gallery preview uses view paths instead of broken UUID resolution
7277ec0 feat(studio): integrate media picker into brand gallery
```

5/5 are forward-looking work (3 features, 2 fixes that integrate with new
infrastructure). The Studio is where new brand functionality lands.

### `storefront-brands.js` — last 5 commits

```
a1a22b3 refactor(storefront): collapse Brands tab to 2 actionable columns (D1+D2) [today]
7e99030 refactor(auth): rename prizma_* sessionStorage keys to tenant_* (B6)
c45e886 fix: Studio — gray popup backdrop on all modals + graceful API failure handling
f14e913 feat: Studio brand display mode selector
e12b2ed fix: prefer prizma_auth_token over jwt_token for normalize-logo
```

5/5 are maintenance: 1 today's UX cleanup, 1 mass-rename, 2 fixes, 1
"feat" that introduced the now-deprecated `storefront_mode` writer. No
forward-looking feature work in months.

### `storefront-brands.html` — last 5 commits

```
9b736bb refactor(shared): split shared.js — extract FIELD_MAP …
f28db3c feat(studio): gate 8 storefront-*.html pages behind feature flags
7f9eaf7 feat(studio): landing page wizard replaces separate tab
1d74cb0 feat(studio): brand logo upload with auto-normalization
32f575a feat(studio): brand page editor — hero, video, description, gallery, SEO fields
```

The newer features (`landing page wizard`, `brand logo upload`,
`brand page editor`) all migrated INTO the Studio (`storefront-studio.html`)
and the standalone page just got dragged along by side-effects (mass refactors,
feature-flag gating). The pattern is clear: storefront-brands.html is no
longer the active surface.

---

## 4. Three options + recommendation

### Option 1 — Keep both (status quo)

**Pros:** zero work. Two entry points might suit different admin
workflows (bulk visibility toggling vs single-brand content editing).

**Cons:**
- Ongoing duplication risk: every future brand-related feature must be
  decided "which of the two pages?" or implemented in both.
- D5-style bugs (UI lets you set state you can't easily revert) repeat
  across two surfaces.
- The `changeBrandMode` orphan and `openBrandPageModal` duplicate continue
  to compound tech debt.

**Verdict:** rejected. Duplicate UIs always drift; cost grows with time.

### Option 2 — Merge: fold standalone into Studio (RECOMMENDED)

Phased plan:

**Phase A** (autonomous, JS-only):
1. Move the 3 unique features from storefront-brands.js into a new
   "Brands Overview" sub-tab inside `storefront-studio.html`:
   - Visibility toggle (writes `exclude_website`).
   - Display_mode dropdown (writes `display_mode` LEGACY).
   - Product-count badge per brand.
2. Remove the duplicate `openBrandPageModal` + `saveBrandPage` from
   storefront-brands.js (the Studio's brand-edit modal supersedes them).
3. Add a redirect on `storefront-brands.html` → `storefront-studio.html#brands`
   so existing bookmarks don't break.

**Phase B** (Daniel sign-off — Iron Rule 29 "View Modification Protocol"
analog: HTML page deletion is contract-level):
1. Delete `storefront-brands.html` entirely.
2. Delete `storefront-brands.js` entirely.
3. Drop `changeBrandMode` (no longer referenced anywhere).
4. Verify the feature-flag system (`cms_studio` flag) still gates
   appropriately.

**Total cleanup:**
- -310 lines JS (storefront-brands.js)
- -1 HTML page (storefront-brands.html)
- 1 minor JS addition to studio-brands.js (~50 lines for the new sub-tab)
- Net: ~260 line reduction.

**Risk:** low. The Studio is already the main entry; admins who land on
storefront-brands.html via bookmark will hit a redirect.

### Option 3 — Merge the other direction (delete Studio's brand editor)

Move the rich brand-page editor from studio-brands.js into
storefront-brands.html standalone page.

**Verdict:** rejected. The 5-recent-commits signal goes the other way:
the Studio is where features land, and the Studio nav is the canonical
admin surface (per recent work like `f28db3c feat(studio): gate 8
storefront-*.html pages behind feature flags`). Inverting that direction
swims upstream against the existing trajectory.

---

## 5. Why this matters now (not later)

- D3+D4 Phase B-2 just landed (column rename) and the dropdown
  value-space normalization (T1) closed the data layer concern.
- T4 (D1+D2) just simplified storefront-brands.js to its current minimal
  state — making it the perfect time to either evolve it forward into
  the Studio or sunset it.
- The dead `changeBrandMode` function is an orphan-by-design today;
  removing it requires this consolidation to clear the housekeeping
  queue.
- Two new "must dispatch to a brand UI" decisions are pending in the
  ROADMAP backlog (D6 AI Content investigation surfaces a brand-AI
  pattern, future brand-level egress optimization may want a UI).
  Resolving the brand UI surface BEFORE those land prevents a
  3-implementations situation.

---

## 6. Recommended SPEC sequence

1. **B-3 + B-4 of D3+D4** (DDL drop NEW columns + view rewrite) — already
   queued, gated on Daniel sign-off. Should ship first because it
   removes the rationale for `changeBrandMode` to exist at all.
2. **AI-content auth fix from T11** (one-line patch + 3 file rename to
   `sb.functions.invoke()`) — quick win, unblocks AI generation.
3. **Brand UI consolidation Phase A** (this proposal, autonomous JS) —
   adds the standalone-page features to Studio.
4. **Brand UI consolidation Phase B** (autonomous HTML/JS deletion +
   redirect) — sunsets the standalone page.
5. **A1+A2 image compression** (deferred from Tier 2 — needs Daniel sign-off).

---

## 7. Open questions for the Foreman

1. **Are there any external bookmarks / hard links to
   `storefront-brands.html`?** A simple grep across docs, READMEs, and
   any analytics dashboards would surface them. If yes, Phase B's
   redirect needs to handle them carefully.
2. **Is the visibility toggle (exclude_website) a feature admins use
   often, or rarely?** If often, the new Studio sub-tab needs prime
   real estate. If rarely, fold it into a brand-edit form field
   instead of a top-level table column.
3. **Is the product-count badge worth keeping?** It requires the
   N+1-style fetch in `loadStorefrontBrands` lines 22-44 (one query
   for all storefront products to compute counts per brand). If we
   keep it, that fetch moves to Studio; if we drop it, the Studio
   sub-tab is simpler and faster.

---

## 8. Methodology

- Compared function lists in both files (`grep -n "^async function\|^function"`).
- Cross-referenced features with the recent commit history (`git log --follow --oneline -5`).
- Inspected the brand-page-modal duplication directly in storefront-brands.js (lines 188-250+).
- Built on B1_DEAD_CODE_MAPPING.md from D3+D4 Phase B-1 which first observed both files were live.

---

*End of T12_BRAND_UI_CONSOLIDATION_PROPOSAL.md.*
