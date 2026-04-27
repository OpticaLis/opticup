# SPEC — A2: Auto-compression on upload

> **Author:** opticup-executor (OVERNIGHT_M1_M3_BURNDOWN T9, Tier 2)
> **Created:** 2026-04-27
> **Severity:** HIGH — prevents future T7-class accumulation
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` row A2

## Goal

Wire image compression into the media-library upload flow so future uploads land already-compressed (1200px max + WebP q0.8). Stop the bleed that produced T7's 65MB cleanup target.

## Root Cause

`modules/storefront/studio-media.js:convertMediaToWebP()` (line 408 pre-fix) created the canvas at `img.naturalWidth × img.naturalHeight` — no downscaling — and re-encoded at quality 0.85. For a 4000×4000 source photo, the result was a 4000×4000 WebP at near-lossless quality, which is exactly what produced the 27 oversized files T7 had to compress after the fact.

## Implementation

`modules/storefront/studio-media.js`:
1. Add module constant `MEDIA_MAX_DIMENSION = 1200`.
2. Replace `convertMediaToWebP()` body to compute scaled dims if source > MAX, set canvas to scaled dims, draw with the 5-arg `ctx.drawImage(img, 0, 0, w, h)` to do the resize.
3. Lower quality default from `0.85` to `0.8` to match T7's target.
4. Returned width/height now reflect the SCALED dims (post-resize), not source dims — matches stored `width`/`height` columns.

Pattern mirrors `modules/inventory/inventory-images.js:188-203` which has been doing this correctly for inventory frame images all along.

## Success Criteria

1. ✅ `convertMediaToWebP` clamps to 1200px max in either dimension.
2. ✅ Quality dropped from 0.85 to 0.8.
3. ✅ Returned `width`/`height` reflect post-scale dims (consistent with the stored `media_library.width`/`height` columns).
4. ✅ Browser-side flow only (no EF deploy needed — T9 dispatch constraint cleared at investigation step).
5. ✅ Pre-commit + integrity gates pass.
6. ✅ Two commits.

## Stop-on-Deviation

- Upload flow turns out to be in an Edge Function → STOP, log, do not deploy. (Cleared at investigation — flow is browser-side.)
- Other callers of `convertMediaToWebP` exist beyond `studio-media.js:338` → STOP, audit each. (Cleared — single caller confirmed via grep.)

## Out-of-Scope

- Inventory frame-image uploads (already compressed correctly via `inventory-images.js`).
- Tenant-logo uploads (`settings-page.js` — out of scope for A2).
- Brand-logo uploads (`studio-brands.js handleStudioLogoUpload` — separate concern, not in this SPEC's surface).
- Re-compressing existing oversized files retroactively (T7 already did this for media-library/products/).

## Commit Plan

Two commits:
1. `fix(studio): clamp media-library uploads to 1200px max + WebP q0.8 (A2/T9)`
2. `chore(spec): close A2/T9 with retrospective`

---

*End of SPEC.*
