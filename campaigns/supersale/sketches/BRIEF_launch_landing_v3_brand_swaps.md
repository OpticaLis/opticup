# BRIEF — SuperSale launch page v3: reading brand swaps + generic luxury subtitle + 2 more luxury reading

**Author:** Events-Operations (Cowork) · **For:** Claude Code in opticup-storefront · 2026-05-22
**Companion:** ACTIVATION_PROMPT_launch_landing_v3_brand_swaps.md
**Edits:** existing /supersale-launch/ (index.astro + supersale-launch.json + SupersaleLaunchCard.astro, commit e35ac6b)

---

## 1. Objective
Three targeted changes to the reading tabs. Then push develop → auto Vercel preview.

## 2. Changes

**(A) Fashion READING — swap out 3 stale brands.**
Remove Valentino, Kenzo, Fendi from `fashion_reading` (we only carry very old collections of those).
Replace with newer-collection brands so the count stays 56. Replacement brands (all have ≥4 eyeglasses
with 2 images, newer barcodes): **Mykita, Porsche Design, Swarovski** (and if you need filler to hit
56, pull more from the brands already present or add Moscot). product_type='eyeglasses', quantity>0,
2+ images, newest barcodes first. Keep {b,m,i1,i2}, no price, brand-spread.

**(B) Luxury READING — generic subtitle (hide the specific brand list).**
Current luxury subtitle names the brands ("...John Dalia · Cazal · KameManNen · Matsuda · Fred...").
Replace it with a GENERIC line that does NOT list specific brands — so visitors don't think there are
only a few luxury brands; it should feel like there's much more. Suggested (you may refine):
**"קולקציות יוקרה נדירות בעבודת יד ממיטב המותגים - הטבות אירוע בלעדיות לנרשמים."**
(This is the luxury tab's section subtitle. The fashion tab subtitle is fine as-is. Note: the luxury
SUN subtitle currently also lists brands — apply the same generic treatment to both luxury sub-tabs.)

**(C) Luxury READING — add 2 more items (30 → 32).**
Pull 2 more luxury eyeglasses (Cazal has 28 available, so 2 more Cazal models not already used, or
spread to KameManNen/Matsuda if any remain). 2+ images, {b,m,i1,i2}.

## 3. Unchanged
Everything else stays: sun tabs, fashion sun 56, luxury sun 30, copy fixes, takanon link, FAQ,
lightbox, sub-toggles, image proxy, brand-spread, hover-swap.

## 4. Constraints
Storefront Iron Rules 25/26/27/28/32 as before. File ≤350 (card already extracted). Develop only,
preview only. `node scripts/full-test.mjs --no-build` must pass. Pre-existing WIP untouched.

## 5. Deliverables + verify
- fashion_reading still 56 (Valentino/Kenzo/Fendi gone, Mykita/Porsche/Swarovski in).
- luxury_reading now 32. Luxury subtitles generic (no brand names) on BOTH luxury sub-tabs.
- full-test passes; build clean; push develop; report commit SHA (I fetch the preview URL).
- Commit by explicit filenames; clean git status.

## 6. Stop-on-deviation
Images 404, safety-net fail, build break, unavoidable rule violation, anything needing main/prod.
