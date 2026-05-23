You are in opticalis/opticup-storefront on branch develop. Five edits to the existing /supersale-launch/
page (index.astro + src/data/supersale-launch.json, commit 7a9e9a4). Full context:
campaigns/supersale/sketches/BRIEF_launch_landing_v4_event_pricing_faq.md (ERP repo) — read first.

PRE-FLIGHT
1. git branch -> develop. git status -> leave pre-existing WIP untouched; selective add by filename.

CHANGES
2. LUXURY SUN +2 (30 -> 32): append these 2 John Dalia sunglasses to the `luxury` array (no price):
   {"b":"John Dalia","m":"Curtis","i1":"frames/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/0a176cd5-07be-41ee-bbc0-facaf09c088b/1777309537865_fpym.webp","i2":"frames/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/0a176cd5-07be-41ee-bbc0-facaf09c088b/1777309538438_vlff.webp"}
   {"b":"John Dalia","m":"Curtis","i1":"frames/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/fdff3a2e-e453-446f-8d20-957e6c15b426/1777309605514_rixs.webp","i2":"frames/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/fdff3a2e-e453-446f-8d20-957e6c15b426/1777309606291_lqcl.webp"}
3. RENAME price wording "מחיר השקה"->"מחיר אירוע" and "מחירי השקה"->"מחירי אירוע" EVERYWHERE on the
   page (card label + any subtitle/FAQ). Do NOT change the event-name title "אירוע השקת קולקציות".
   Only the PRICE label changes.
4. FAQ coupon precision — ensure these are stated accurately:
   - "המחירים מתממשים עם קופון אישי בלבד."
   - "לכל אירוע יש כמות קופונים מוגבלת, שנשלחת למשתתפים עד 48 שעות לאחר השריון הסופי."
   - "בנוסף, יש הטבות נוספות בשווי מאות שקלים לנרשמים מראש בלבד, על מגוון מהמותגים המשתתפים."
5. FAQ walk-in Q/A (verbatim):
   Q "אפשר להגיע בלי להירשם מראש?"
   A "אפשר להגיע ביום האירוע, אבל זה יהיה על בסיס קופון פנוי בלבד וללא ההטבות הנוספות שמשתנות מאירוע
   לאירוע. כדי להבטיח מקום, את הקופון האישי ואת ההטבות המלאות - חשוב להירשם מראש."
6. FAQ 1+1-reading explainer: add that there are also additional benefits on the prescription lenses
   themselves (single-vision + multifocal exclusive event benefits).

UNCHANGED: sub-toggles, fashion 56+56, luxury reading 32, brand-spread, lightbox, /api/image/ proxy,
takanon link, 14-day price-match wording, generic luxury subtitles.

RULES: 25/26/27/28/32. File <=350. Develop only. PREVIEW only.

VERIFY + DEPLOY
7. node scripts/full-test.mjs --no-build (must pass). Build.
8. Confirm luxury sun=32, zero "השקה" as a PRICE label (event-name title kept), FAQ updated.
9. curl one new luxury-sun /api/image/ -> 200.
10. Push develop, commit by explicit filenames. Report commit SHA. Clean git status.

STOP-ON-DEVIATION: images 404, safety-net fail, build break, unavoidable rule violation, anything
needing main/prod. Report, don't improvise.
