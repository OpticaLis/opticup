You are in opticalis/opticup-storefront on branch develop. Three targeted edits to the existing
/supersale-launch/ page (index.astro + src/data/supersale-launch.json + components/SupersaleLaunchCard.astro,
commit e35ac6b). Full context: campaigns/supersale/sketches/BRIEF_launch_landing_v3_brand_swaps.md (ERP repo).
You have Supabase DB access — query data yourself (Prizma tenant 6ad0781b-37f0-47a9-92e3-be9ed1477e1c).

PRE-FLIGHT
1. git branch -> develop. git status -> leave pre-existing WIP untouched; selective add by filename.

CHANGES
2. FASHION READING — remove Valentino, Kenzo, Fendi (stale collections). Replace with Mykita,
   Porsche Design, Swarovski (use Moscot as filler if needed) so fashion_reading stays 56.
   Query: product_type='eyeglasses', quantity>0, 2+ images, newest barcodes first, {b,m,i1,i2}, no price.
3. LUXURY subtitles (BOTH luxury sub-tabs: sun AND reading) — remove the specific brand list. Use a
   generic line, e.g. "קולקציות יוקרה נדירות בעבודת יד ממיטב המותגים - הטבות אירוע בלעדיות לנרשמים."
   so it doesn't look like there are only a few luxury brands.
4. LUXURY READING — add 2 more items (30 -> 32): 2 more Cazal eyeglasses not already used (or
   KameManNen/Matsuda), 2+ images, {b,m,i1,i2}.

UNCHANGED: sun tabs, fashion sun 56, luxury sun 30, all prior copy fixes, takanon link, FAQ, lightbox,
sub-toggles, /api/image/ proxy, brand-spread, hover-swap.

RULES: 25/26/27/28/32. File <=350. Develop only. PREVIEW only.

VERIFY + DEPLOY
5. node scripts/full-test.mjs --no-build (must pass). Build.
6. Confirm: fashion_reading=56 (no Valentino/Kenzo/Fendi; has Mykita/Porsche/Swarovski),
   luxury_reading=32, luxury subtitles have NO brand names.
7. curl one new reading-card /api/image/ URL -> 200.
8. Push develop, commit by explicit filenames. Report commit SHA. Clean git status.

STOP-ON-DEVIATION: images 404, safety-net fail, build break, unavoidable rule violation, anything
needing main/prod. Report, don't improvise.
