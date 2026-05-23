# BRIEF — SuperSale launch v4: +2 luxury sun, "מחירי אירוע" rename, FAQ precision

**Author:** Events-Operations (Cowork) · **For:** Claude Code in opticup-storefront · 2026-05-22
**Companion:** ACTIVATION_PROMPT_launch_landing_v4_event_pricing_faq.md
**Edits:** existing /supersale-launch/ (index.astro + supersale-launch.json, commit 7a9e9a4)

---

## 1. Five changes

**(A) Luxury SUN +2 (30 → 32).** Add these 2 John Dalia sunglasses to the `luxury` array
(currently 30). Both have 2 images. Append as {b,m,i1,i2} (luxury cards show no price):
```
{"b":"John Dalia","m":"Curtis","i1":"frames/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/0a176cd5-07be-41ee-bbc0-facaf09c088b/1777309537865_fpym.webp","i2":"frames/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/0a176cd5-07be-41ee-bbc0-facaf09c088b/1777309538438_vlff.webp"}
{"b":"John Dalia","m":"Curtis","i1":"frames/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/fdff3a2e-e453-446f-8d20-957e6c15b426/1777309605514_rixs.webp","i2":"frames/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/fdff3a2e-e453-446f-8d20-957e6c15b426/1777309606291_lqcl.webp"}
```
(Result: luxury sun 32, luxury reading 32 — balanced.)

**(B) Rename "מחירי השקה" → "מחירי אירוע" everywhere.** Every occurrence on the page — the card
"מחיר השקה" label under the price, any "מחירי השקה" in section subtitles/FAQ. Reason: future events
include clearance sales where "השקה" (launch) won't fit; "מחירי אירוע" (event prices) is evergreen.
Search the page + data for "השקה" used as a price label and switch to "אירוע" form. (Do NOT rename
the page title "אירוע השקת קולקציות" — that's the event name, keep it. Only the PRICE wording changes:
"מחיר השקה"→"מחיר אירוע", "מחירי השקה"→"מחירי אירוע".)

**(C) FAQ — coupon mechanism precision.** Update/ensure the FAQ explains, accurately:
- Prices are realized **with a personal coupon only** ("המחירים מתממשים עם קופון אישי בלבד").
- Each event has a **limited number of coupons**, sent to participants **up to 48 hours after final
  reservation** ("לכל אירוע יש כמות קופונים מוגבלת, שנשלחת למשתתפים עד 48 שעות לאחר השריון הסופי").
- **Additional benefits worth hundreds of shekels** for pre-registered participants only, on a range
  of the participating brands ("בנוסף, יש הטבות נוספות בשווי מאות שקלים לנרשמים מראש בלבד, על מגוון
  מהמותגים המשתתפים").

**(D) FAQ — "walk-in without registration" (include, registration-pushing framing).** Ensure a Q/A:
Q: "אפשר להגיע בלי להירשם מראש?"
A: "אפשר להגיע ביום האירוע, אבל זה יהיה על בסיס קופון פנוי בלבד וללא ההטבות הנוספות שמשתנות מאירוע
לאירוע. כדי להבטיח מקום, את הקופון האישי ואת ההטבות המלאות - חשוב להירשם מראש."

**(E) FAQ — "1+1 on reading glasses" add lens benefits.** In the existing 1+1 reading explainer,
add that there are also additional benefits on the prescription lenses themselves (tie to the
existing lens-benefits answer: single-vision + multifocal exclusive event benefits).

## 2. Unchanged
Sun/reading sub-toggles, fashion 56+56, luxury reading 32, brand-spread, lightbox, image proxy,
takanon link, the 14-day price-match wording, generic luxury subtitles.

## 3. Constraints
Iron Rules 25/26/27/28/32. File ≤350 (card extracted already). Develop only, preview only.
`node scripts/full-test.mjs --no-build` must pass. Pre-existing WIP untouched. Commit explicit filenames.

## 4. Deliverables + verify
- luxury sun = 32. Zero "השקה" remaining as a PRICE label (event name title kept). FAQ updated per C/D/E.
- full-test passes; build clean; push develop; report commit SHA (I fetch preview URL).
- curl one luxury-sun new card /api/image/ → 200. Clean git status.

## 5. Stop-on-deviation
Images 404, safety-net fail, build break, unavoidable rule violation, anything needing main/prod.
