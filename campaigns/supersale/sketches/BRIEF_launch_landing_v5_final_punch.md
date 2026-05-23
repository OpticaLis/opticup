# BRIEF — SuperSale launch v5: "final punch" — reading swaps, copy, gold-highlight FAQ

**Author:** Events-Operations (Cowork) · **For:** Claude Code in opticup-storefront · 2026-05-22
**Companion:** ACTIVATION_PROMPT_launch_landing_v5_final_punch.md
**Edits:** existing /supersale-launch/ (index.astro + supersale-launch.json + SupersaleLaunchCard.astro)
**Authority sources scanned (for FAQ answers):** Prizma `/lab/` page (framing lab: single-vision ready
15–90 min in-store) + `/משלוחים-והחזרות/` page (home delivery available; pickup free; rx glasses ≤14 biz days).

---

## 1. Reading-tab brand swaps (fashion reading)
Remove from `fashion_reading`: the 4 Emporio Armani items (EA4160, EA4115, EA4258, EA4115) AND ALL
Celine, ALL Dior, ALL Jimmy Choo. Keep the SAME total count (56) — backfill with the NEWEST eyeglasses
(2+ images, product_type='eyeglasses', qty>0, ORDER BY barcode DESC) from, mixed/brand-spread:
**Prada, MiuMiu, SWAROVSKI, Dolce Gabbana, VERSACE, Montblanc, Bvlgari, Gast, LOOL, Moscot.**
(Plenty available: Moscot 17, Prada 15, LOOL 15, Bvlgari 12, Montblanc 11, MiuMiu 10, Gast 9, Swarovski 7.)
{b,m,i1,i2}, no price, badge stays "1+1 על מותגים נבחרים". Mixed order, no two same-brand adjacent.

## 2. Hero subtitle copy
Replace: "בתי האופנה הגדולים וקולקציות היוקרה הנדירות - במחירי אירוע בלעדיים, לנרשמים מראש בלבד."
With:    "בתי האופנה הגדולים וקולקציות היוקרה הנדירות - במחירי אירוע בלעדיים, עם הטבות שוות לנרשמים מראש בלבד."

## 3. FAQ edits
(a) REMOVE entirely the Q: "אפשר לצרף מסגרת ראייה עם עדשות באותו האירוע?"
(b) "למתי האירוע, ואיפה?" answer — insert "הקרוב": "האירוע הקרוב יתקיים ביום שישי..." (rest unchanged).
(c) Reword the booking-fee Q (don't put 50 in the question): Q → "למה יש 'דמי שריון מקום' ברוב האירועים?"
    (keep the existing accurate answer about the ₪50 reserving the spot + personal coupon, fully credited,
    refundable up to 48h before.)

## 4. NEW "final punch" FAQ entries — these are the differentiators; HIGHLIGHT them in subtle gold.
Add a subtle-gold visual treatment (e.g. faint gold left/inline-start accent + slightly warmer bg or
gold question text) to mark the MOST IMPORTANT questions — these new ones, plus the price-commitment Q.
Keep the others on the current white. Subtle, premium — not loud.

NEW Q1: "אני צריך משקפי ראייה ומגיע מרחוק, האם אצטרך לחזור אליכם פעם נוספת?"
A (based on /lab/ scan): "ברוב המקרים לא. במעבדת המסגורים שלנו בסניף אנחנו חותכים, מלטשים ומרכיבים
משקפי ראייה חד-מוקדיים במקום - לרוב תוך 15 עד 90 דקות, כשהעדשה במלאי. כך שגם אם הגעתם מרחוק, אתם
יוצאים עם המשקפיים מוכנים באותו ביקור. בעדשות מיוחדות (מולטיפוקל / הזמנה מיוחדת) שלוקחות יותר זמן -
נשמח לשלוח את המשקפיים עד הבית."

NEW Q2: "מה מיוחד באירועי המותגים שלכם?"
A (Daniel-supplied, lightly polished): "מעבר למחירים - הוודאות. רוב הדגמים של המותגים (למעט קולקציות
היוקרה) במחיר אירוע מיוחד ואחיד, בלי הפתעות בקופה. ויותר מזה: אין סיכוי 'לצאת פראיירים' - מצאתם את
אותו הדגם, מיבואן רשמי, במחיר נמוך יותר בכל רשת אופטיקה אחרת בישראל (לא כולל אילת)? נשווה את המחיר,
בכפוף לתקנון. זאת התחייבות."

NEW Q3 (distance + delivery): "אני גר רחוק מאשקלון - איך זה עובד מבחינת הגעה ומשלוח?"
A (based on /משלוחים-והחזרות/ scan): "אפשר להגיע לסניף בהרצל 32 אשקלון ולצאת עם המשקפיים מוכנים באותו
ביקור (לעדשות שבמלאי). ולמי שמעדיף - יש לנו שירות משלוחים עד בית הלקוח; נציג יתאם את הפרטים והעלות לפי
היעד. כך שגם מרחוק, אפשר ליהנות מהאירוע."

## 5. Constraints
Storefront Iron Rules 25/26/27/28/32 (the gold-highlight must keep AA contrast). File ≤350 (card
extracted). Develop only, preview only. full-test.mjs must pass. Pre-existing WIP untouched.

## 6. Deliverables + verify
- fashion_reading still 56 (no Armani/Celine/Dior/Jimmy Choo; backfilled from the 10 listed brands, mixed).
- subtitle updated; obsolete Q removed; "הקרוב" added; booking-fee Q reworded; 3 new FAQ added; gold
  highlight on the key questions.
- full-test passes; build clean; push develop; report commit SHA (I fetch the preview URL). Clean git status.

## 7. Stop-on-deviation
Images 404, safety-net fail, build break, unavoidable rule violation, anything needing main/prod.
