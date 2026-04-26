# B-1 Dead-Code Mapping — `studio-brands.js` vs `storefront-brands.js`

> **Phase:** B-1 of D3+D4_DISPLAY_MODE_RECONCILIATION
> **Written by:** opticup-executor (Claude Code, Windows desktop)
> **Written on:** 2026-04-26
> **Authority:** RECONCILIATION_DECISION.md §3 substep B-1 (autonomous, prerequisite to B-2)
> **Stop trigger fired + cleared:** the activation-prompt trigger "BOTH files loaded by different HTML pages → STOP, Foreman must decide" fired at first grep. Daniel cleared with option (a): resume B-2 with revised scope. This file documents the finding so the resumption is auditable.

---

## TL;DR

**Neither file is dead code.** They serve different UX purposes on different
HTML pages, and only one of them (`storefront-brands.js`) writes the NEW
field pair that Phase B-2 is renaming. The other (`studio-brands.js`) is
already on the LEGACY pair and needs no rename. The "duplication" identified
in Phase A INVESTIGATION_REPORT Q6 was **conceptual overlap, not code
duplication** — both files happen to expose a brand-`display_mode` write,
but as part of different admin workflows.

---

## Loader chain (grep evidence)

```bash
grep -rn 'studio-brands\.js|storefront-brands\.js' --include='*.html' --include='*.js'
```

| HTML page | Title | Loads |
|-----------|-------|-------|
| `storefront-brands.html` | "Optic Up — ניהול מותגים לחנות" / `<h1>🌐 ניהול חנות אונליין</h1>` | `modules/storefront/storefront-brands.js` (line 191) |
| `storefront-studio.html` | "Optic Up — ניהול אתר Studio" / `<h1>🎨 ניהול אתר — Studio</h1>` | `modules/storefront/studio-brands.js` (line 229) |

`modules/storefront/studio-media-picker.js:4` also references `studio-brands.js`
in a comment ("Used by: studio-brands.js (gallery section) and future
consumers") — confirming `studio-brands.js` is a consumer of the media picker
in the brand-page editor flow. Read-only reference; not a loader.

---

## File comparison (size, header intent, recent commits)

### `studio-brands.js`

- **Size:** 893 lines
- **Header:**
  ```
  // modules/storefront/studio-brands.js
  // Brand Pages management inside Studio — "עמודי מותג" section in Pages tab
  ```
- **State variables:** `studioBrands`, `studioBrandsLoaded`, `_brandPageView`,
  `brandSearchText`, `_quillDesc1`, `_quillDesc2`, `_aiMode`
  → Quill rich-text editors signal a content-management UI (description,
  long-form text), not just a single mode toggle.
- **Recent commits (`git log --follow --oneline -5`):**
  - `813021c` feat(saas): getCustomDomain helper + replace prizma-optic.co.il in studio previews
  - `12c1c07` feat(studio): add quick search to brands+campaigns tabs, fix search focus-loss bug, add sell price to entry-history barcode export
  - `87354c7` fix(studio): resolve storeName ReferenceError crashing gallery preview
  - `25e81c1` fix(studio): gallery preview uses view paths instead of broken UUID resolution
  - `7277ec0` feat(studio): integrate media picker into brand gallery
- **Display-mode write site (per Phase A Q6):**
  `studio-brands.js:745` — `display_mode: document.getElementById('sbe-display-mode')?.value || 'store_all'`
  This is **already on the LEGACY pair**. Writes within the brand-page edit form save (`sbe-` prefix = "studio brand editor").
- **Verdict:** **LIVE.** Brand-page content editor — hero image, description,
  gallery, SEO, plus an incidental `display_mode` selector. Already aligned
  with Phase B-2's target pair. **No rename needed.**

### `storefront-brands.js`

- **Size:** 310 lines
- **Header:**
  ```
  // Storefront Brand Mode Manager
  // Shows only brands with storefront products (website_sync = full/display, has images)
  // + Brand Page Editor (hero, description, gallery, SEO)
  ```
  (The "+ Brand Page Editor" comment is misleading — current code is
  primarily a mode-toggle table; the heavy brand-page editing is in
  `studio-brands.js`.)
- **State variables:** `_currentBrandId`, function `loadStorefrontBrands()`
  → Single-concern UI: brand listing + display-mode selector.
- **Recent commits (`git log --follow --oneline -5`):**
  - `7e99030` refactor(auth): rename prizma_* sessionStorage keys to tenant_* across entire ERP (B6)
  - `c45e886` fix: Studio — gray popup backdrop on all modals + graceful API failure handling
  - `f14e913` feat: Studio brand display mode selector
  - `e12b2ed` fix: prefer prizma_auth_token over jwt_token for normalize-logo
  - `5ef2757` fix: send ERP session token to normalize-logo when no Supabase JWT
- **Display-mode write site (per Phase A Q6):**
  `storefront-brands.js:148` — `.update({ storefront_mode: newMode })`
  This is **on the NEW pair**. Writes from the dedicated brand-display-mode
  selector table (`f14e913` "feat: Studio brand display mode selector"
  introduced this feature — and chose the wrong column pair, kicking off
  the split-brain).
- **Verdict:** **LIVE.** Standalone "Brand Mode Manager" page. **Will be
  renamed in Phase B-2** so its 5 NEW-pair sites become LEGACY-pair sites.

---

## Why Phase A's "duplication" framing was incomplete

The Phase A INVESTIGATION_REPORT (Q6 + open-questions §3 + §4) flagged the
two files as a possible code-duplication problem, mirroring the schema
duplication. The resolution: they are **NOT** code duplicates. They are two
distinct UI workflows that happen to overlap on the brand-`display_mode`
write semantics:

- `studio-brands.js` (Brand Page Editor in Studio) lets an admin edit a
  brand's full marketing page (hero, gallery, SEO) AND, while there, set
  the `display_mode` as one form field among many. The form serializes via
  the `sbe-display-mode` `<select>` and persists via the brand-update call
  on line 745.
- `storefront-brands.js` (standalone "Brand Mode Manager") is a focused
  table view where admins toggle brand mode without entering the full page
  editor. Faster bulk workflow.

Both pages are LIVE and reachable from the Studio nav. Daniel can toggle a
brand's display mode from EITHER, but pre-B-2 they wrote to DIFFERENT
columns:
- `studio-brands.js` → `brands.display_mode` (LEGACY) — the column actually
  read by the storefront and by Studio Pages.
- `storefront-brands.js` → `brands.storefront_mode` (NEW) — the column
  almost no consumer reads.

This explains the historical confusion: an admin who set a brand's mode in
the standalone Brand Mode Manager would see no effect on the storefront
(because they wrote NEW, storefront reads LEGACY), then re-set it via the
Brand Page Editor and see the change land. The fix is structural (B-2
rename), not behavioral (no UX change required).

---

## Phase B-2 scope (revised after this finding)

| File | Phase B-2 action | Site count |
|------|------------------|------------|
| `modules/storefront/storefront-products.js` | Rename NEW pair → LEGACY pair | 8 (per Phase A Q6) |
| `modules/storefront/storefront-brands.js` | Rename NEW pair → LEGACY pair | 5 (per Phase A Q6: lines 14, 23, 41, 83, 148 — all NEW-pair refs) |
| `modules/storefront/studio-brands.js` | **No change** (already LEGACY) | 0 |

**Net B-2 surface:** 13 rename sites across 2 files (matches RECONCILIATION_DECISION §3 B-2 estimate).

---

## Out-of-scope housekeeping (logged for future SPEC)

The two parallel UI pages (`storefront-brands.html` standalone vs
`storefront-studio.html` integrated) are a UX consolidation candidate. After
B-2, they both write the same column, so the duplication is no longer
DANGEROUS — but it remains a UX confusion (admins can edit the same field
from two places). A separate housekeeping SPEC could decide whether to:

- Keep both (they serve slightly different workflows: bulk vs single-brand
  editing).
- Fold the standalone Brand Mode Manager into Studio's Pages tab and
  retire `storefront-brands.html` + `storefront-brands.js`.
- Collapse Studio's brand-edit form to remove the `display_mode` dropdown
  and rely on the standalone manager for that one field.

This is a Daniel-priority call, not a Phase B requirement. Logging here so
it doesn't get lost.

---

## Stop-trigger audit

The activation-prompt trigger "BOTH files loaded simultaneously by
different HTML pages → STOP, Foreman must decide" fired at the first grep
output. Stop+report was issued to Daniel. Daniel cleared with option (a):
resume B-2 with revised scope (rename `storefront-brands.js` for the
brand-level pair; skip `studio-brands.js` because it's already on LEGACY).

Discipline preserved: trigger respected, decision made by the right layer
(Foreman/Daniel, not the executor), execution resumed deterministically.
This document captures the discovery so a future reader has the full
picture without reconstructing it from chat history.

---

*End of B1_DEAD_CODE_MAPPING.md.*
