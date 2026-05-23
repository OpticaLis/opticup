You are in opticalis/opticup-storefront on branch develop. Final-punch edits to the existing
/supersale-launch/ page (index.astro + src/data/supersale-launch.json + components/SupersaleLaunchCard.astro,
latest commit on develop). Full context: campaigns/supersale/sketches/BRIEF_launch_landing_v5_final_punch.md
(ERP repo) — read first. You have Supabase DB access; query reading data yourself (Prizma tenant
6ad0781b-37f0-47a9-92e3-be9ed1477e1c).

PRE-FLIGHT
1. git branch -> develop. git status -> pre-existing WIP untouched; selective add by filename.

CHANGES
2. FASHION READING swaps: remove the 4 Emporio Armani items + ALL Celine + ALL Dior + ALL Jimmy Choo
   from fashion_reading. Keep total = 56. Backfill with NEWEST eyeglasses (product_type='eyeglasses',
   qty>0, 2+ images, ORDER BY barcode DESC), brand-spread/mixed, from: Prada, MiuMiu, SWAROVSKI,
   Dolce Gabbana, VERSACE, Montblanc, Bvlgari, Gast, LOOL, Moscot. {b,m,i1,i2}, no price, badge
   "1+1 על מותגים נבחרים". No two same-brand adjacent.
3. Hero subtitle -> "בתי האופנה הגדולים וקולקציות היוקרה הנדירות - במחירי אירוע בלעדיים, עם הטבות שוות
   לנרשמים מראש בלבד."
4. FAQ: (a) REMOVE Q "אפשר לצרף מסגרת ראייה עם עדשות באותו האירוע?"
        (b) "למתי האירוע, ואיפה?" answer -> start "האירוע הקרוב יתקיים ביום שישי..." (add הקרוב).
        (c) Booking-fee Q reworded (no "50" in the question): "למה יש 'דמי שריון מקום' ברוב האירועים?"
            keep accurate answer (₪50 reserves spot + personal coupon, fully credited, refundable ≤48h).
5. ADD 3 new FAQ (verbatim answers below) AND give the MOST IMPORTANT questions a SUBTLE GOLD highlight
   (faint gold inline-start accent or warm bg or gold question text) — these 3 new ones + the
   price-commitment Q. Subtle/premium, AA contrast preserved. Others stay white.
   Q1 "אני צריך משקפי ראייה ומגיע מרחוק, האם אצטרך לחזור אליכם פעם נוספת?"
   A1 "ברוב המקרים לא. במעבדת המסגורים שלנו בסניף אנחנו חותכים, מלטשים ומרכיבים משקפי ראייה חד-מוקדיים
   במקום - לרוב תוך 15 עד 90 דקות, כשהעדשה במלאי. כך שגם אם הגעתם מרחוק, אתם יוצאים עם המשקפיים מוכנים
   באותו ביקור. בעדשות מיוחדות (מולטיפוקל / הזמנה מיוחדת) שלוקחות יותר זמן - נשמח לשלוח את המשקפיים עד הבית."
   Q2 "מה מיוחד באירועי המותגים שלכם?"
   A2 "מעבר למחירים - הוודאות. רוב הדגמים של המותגים (למעט קולקציות היוקרה) במחיר אירוע מיוחד ואחיד,
   בלי הפתעות בקופה. ויותר מזה: אין סיכוי 'לצאת פראיירים' - מצאתם את אותו הדגם, מיבואן רשמי, במחיר נמוך
   יותר בכל רשת אופטיקה אחרת בישראל (לא כולל אילת)? נשווה את המחיר, בכפוף לתקנון. זאת התחייבות."
   Q3 "אני גר רחוק מאשקלון - איך זה עובד מבחינת הגעה ומשלוח?"
   A3 "אפשר להגיע לסניף בהרצל 32 אשקלון ולצאת עם המשקפיים מוכנים באותו ביקור (לעדשות שבמלאי). ולמי
   שמעדיף - יש לנו שירות משלוחים עד בית הלקוח; נציג יתאם את הפרטים והעלות לפי היעד. כך שגם מרחוק,
   אפשר ליהנות מהאירוע."

UNCHANGED: sun tabs, fashion sun 56, luxury 32+32, lightbox, sub-toggles, /api/image/ proxy, takanon
link, 14-day price-match wording, generic luxury subtitles, "מחיר אירוע" label.

RULES: 25/26/27/28/32 (gold highlight keeps AA contrast). File <=350. Develop only. PREVIEW only.

VERIFY + DEPLOY
6. node scripts/full-test.mjs --no-build (must pass). Build.
7. Confirm fashion_reading=56 (no Armani/Celine/Dior/Jimmy Choo), 3 new FAQ present + gold-highlighted,
   removed Q gone, subtitle + הקרוב + booking-fee reword applied.
8. curl one new reading-card /api/image/ -> 200.
9. Push develop, commit by explicit filenames. Report commit SHA. Clean git status.

STOP-ON-DEVIATION: images 404, safety-net fail, build break, unavoidable rule violation, anything
needing main/prod. Report, don't improvise.
