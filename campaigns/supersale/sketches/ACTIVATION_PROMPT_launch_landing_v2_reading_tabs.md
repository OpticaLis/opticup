You are in opticalis/opticup-storefront on branch develop. Upgrade the EXISTING /supersale-launch/
page (src/pages/supersale-launch/index.astro + src/data/supersale-launch.json, commit 5d6b047).
Full context: campaigns/supersale/sketches/BRIEF_launch_landing_v2_reading_tabs.md (ERP repo) — read first.
You have Supabase DB access; query the reading data yourself (Prizma tenant).

PRE-FLIGHT
1. git branch -> develop. git status -> pre-existing WIP (tenant-fallback-map.json, docs/investigations/*,
   .claude/, .spec-output/) must stay untouched; selective git add by filename only.

COPY FIXES
2. Hero chip: drop "בבוקר" -> "יום שישי · 29.5 · סניף אשקלון".
3. Price-pledge line -> "קונים באירוע עם מנגנון התחייבות למחיר הזול בישראל - מצאתם את אותו הדגם בזול
   יותר ברשת אחרת בישראל? הראו לנו תוך 14 ימים מהקנייה ותקבלו את ההפרש!" and directly under it a small
   muted link "בכפוף לתקנון" -> /supersale-takanon/.
4. Update the matching FAQ ("מה זה מנגנון התחייבות...") to the same 14-day/get-the-difference wording.

SUN/READING SPLIT (both product tabs)
5. Add a sub-toggle משקפי שמש / משקפי ראייה inside BOTH tabs (default שמש = current cards), with a
   clear שמש/ראייה indicator, aria + keyboard support.
6. Counts: Fashion 56 sun (unchanged) + 56 reading. Luxury: trim sun 40->30, add 30 reading. (30/30)
7. Reading cards = NO price. Badges:
   - fashion reading: gold "1+1 על מותגים נבחרים" + dark "לנרשמים מראש"
   - luxury reading: gold "הטבות אירוע בלעדיות" + dark "לנרשמים מראש"
   Keep brand-spread, hover-swap, lightbox (2-angle), all images via /api/image/ proxy.

DATA (query yourself; write into src/data/supersale-launch.json as fashion_reading[56] +
luxury_reading[30]; trim luxury sun to 30, dropping excess Cazal first):
- Fashion reading: product_type='eyeglasses', quantity>0, 2+ images, ORDER BY barcode DESC per brand,
  ~4 newest each, brands: Gucci, Etnia, Saint Laurent, Prada, MiuMiu, Dior, Fendi, BALENCIAGA,
  Emporio Armani, Bvlgari, Montblanc, Kenzo, Valentino, Celine, Jimmy Choo. Fields {b,m,i1,i2}, no price.
- Luxury reading: same filters, brands Cazal/KameManNen/Matsuda, newest first, total 30. {b,m,i1,i2}.
  (i1/i2 = first two inventory_images url/thumbnail by sort_order,created_at.)

"JUST A TASTE" + FAQ
8. Both sub-tabs note: "זו רק טעימה קטנה - באירוע יחכה מבחר רחב הרבה יותר, בשמש ובראייה."
9. Add 2-3 reading FAQ. One verbatim:
   Q "יש הטבות גם על העדשות עצמן?" A "כמובן! יש מגוון הטבות בלעדיות על עדשות ראייה חד-מוקדיות
   ועדשות מולטיפוקל במיוחד באירוע!"

RULES: 25 image-proxy, 26 transparent/bg-white, 27 RTL logical-props, 28 mobile-first, 32 a11y AA
(sub-toggle aria+keyboard, lightbox role=dialog). File <=350 (extract if needed, note it). Develop only.
PREVIEW only.

VERIFY + DEPLOY
10. node scripts/full-test.mjs --no-build (must pass). Build.
11. Push develop (commit by explicit filenames). Report commit SHA — I fetch the auto preview URL.
12. curl one reading-card /api/image/ URL -> 200.

STOP-ON-DEVIATION: images 404, safety-net fail, build break, unavoidable rule violation, anything
needing main/prod. Report, don't improvise.
