# BRIEF — SuperSale launch page v2: sun/eyeglasses split, reading cards, copy fixes

**Author:** Events-Operations (Cowork)
**For:** Claude Code in `opticup-storefront`
**Date:** 2026-05-22
**Companion:** `ACTIVATION_PROMPT_launch_landing_v2_reading_tabs.md`
**Edits:** the EXISTING route built last run — `src/pages/supersale-launch/index.astro` + `src/data/supersale-launch.json` (commit 5d6b047, live preview confirmed working).

---

## 1. Objective

Upgrade the existing /supersale-launch/ page with: a sun/eyeglasses sub-toggle inside BOTH product
tabs, reading-glasses cards (no price), several copy fixes, and a "בכפוף לתקנון" link. Then redeploy
preview (push to develop → auto Vercel preview).

## 2. Copy fixes (verbatim)

1. Hero event chip: "יום שישי בבוקר · 29.5 · סניף אשקלון" → **"יום שישי · 29.5 · סניף אשקלון"** (drop "בבוקר").
2. Price-pledge line — replace the current "...נשתדל להשוות" wording with:
   **"קונים באירוע עם מנגנון התחייבות למחיר הזול בישראל - מצאתם את אותו הדגם בזול יותר ברשת אחרת
   בישראל? הראו לנו תוך 14 ימים מהקנייה ותקבלו את ההפרש!"**
   Directly under it, smaller/muted, add: **"בכפוף לתקנון"** as a link to /supersale-takanon/
   (open in same tab is fine). (Legally advisable: the price-match + 1+1 are material promotion terms;
   linking the full reviewed takanon discloses the conditions.)
3. The matching FAQ entry ("מה זה מנגנון התחייבות...") — update to the same 14-day/get-the-difference
   framing (no "נשתדל").

## 3. Sun/Eyeglasses split — BOTH product tabs

Each of the two product tabs (בתי אופנה נבחרים, קולקציות יוקרה) gets a sub-toggle: **משקפי שמש /
משקפי ראייה**. Default = שמש (the current cards). Add a clear שמש/ראייה indicator on the toggle.

**Reading (ראייה) cards show NO price.** Badges:
- Fashion reading cards: gold badge **"1+1 על מותגים נבחרים"** + dark badge **"לנרשמים מראש"**.
- Luxury reading cards: gold badge **"הטבות אירוע בלעדיות"** + dark badge **"לנרשמים מראש"** (same as luxury sun).

Counts (balanced):
- Fashion: 56 sun (unchanged) + **56 reading**.
- Luxury: trim sun from 40 → **30**, add **30 reading**. (30/30.)

Keep: brand-spread ordering, hover-swap to 2nd image, the image lightbox (2-angle nav), all via the
same-origin /api/image/ proxy.

## 4. Data — query it yourself (you have DB access; avoids Cowork truncation)

Use these EXACT queries (Prizma tenant `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`, product_type filters,
>=2 images) and write the results into `src/data/supersale-launch.json` as new arrays
`fashion_reading` (56) and `luxury_reading` (30), and trim `luxury` (sun) to 30.

FASHION READING (take 4 newest per brand, brand-spread, target 56) — brands:
Gucci, Etnia, Saint Laurent, Prada, MiuMiu, Dior, Fendi, BALENCIAGA, Emporio Armani, Bvlgari,
Montblanc, Kenzo, Valentino, Celine, Jimmy Choo — product_type='eyeglasses', quantity>0, 2+ images,
ORDER BY barcode DESC within brand. Fields per card: {b: brand, m: model, i1, i2}. NO price.

LUXURY READING (target 30) — brands Cazal (≈19), KameManNen (≈6), Matsuda (≈5),
product_type='eyeglasses', quantity>0, 2+ images, newest first. Fields {b,m,i1,i2}. NO price.

LUXURY SUN trim: keep the first 30 of the existing 40 luxury sun items (preserve brand variety —
drop excess Cazal first since it's over-represented).

(For reference, the curated 56 fashion-reading + 30 luxury-reading rows I already pulled are pasted at
the end of this brief as JSON, in case you prefer to use them verbatim instead of re-querying.)

## 5. "Just a taste" messaging

Both reading sub-tabs (and ideally the sun ones too) must make clear this is a small sample, not the
full event inventory. Use a note like: "זו רק טעימה קטנה - באירוע יחכה מבחר רחב הרבה יותר, בשמש
ובראייה." Don't let anyone think these are all the models.

## 6. FAQ — add reading questions

Add 2-3 Q&A about reading glasses. One MUST be (verbatim answer):
Q: "יש הטבות גם על העדשות עצמן?"
A: "כמובן! יש מגוון הטבות בלעדיות על עדשות ראייה חד-מוקדיות ועדשות מולטיפוקל במיוחד באירוע!"
Others (you phrase): is there a frames+lenses package / 1+1 on reading frames / are prescription
lenses available same-day. Keep tone consistent with existing FAQ.

## 7. Constraints (storefront Iron Rules)

Rule 25 image proxy, 26 transparent bg-white, 27 RTL logical props, 28 mobile-first, 32 a11y AA
(the new sub-toggle needs aria + keyboard; reading cards still open the lightbox with role=dialog).
File-size ≤350 (if index.astro grows past it, extract the card/data logic — note what you split).
Develop only, never main. Preview deploy only (push → auto Vercel preview).
Run `node scripts/full-test.mjs --no-build` — must pass.

## 8. Deliverables + verification

- Updated route with sun/reading toggle in both tabs, 56+56 fashion, 30+30 luxury, copy fixes,
  takanon link, FAQ additions.
- full-test.mjs passes; build succeeds.
- Push to develop; report commit SHA (I'll fetch the auto preview URL from the Vercel connector).
- Confirm one /api/image/ reading-card URL returns 200.
- Commit by explicit filenames; clean git status; do NOT touch the pre-existing WIP.

## 9. Stop-on-deviation
Images 404, safety-net failure, build break, unavoidable rule violation, anything needing main/prod.
