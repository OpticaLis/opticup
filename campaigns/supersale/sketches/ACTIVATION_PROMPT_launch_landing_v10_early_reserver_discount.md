You are in opticalis/opticup-storefront on branch develop. One change to the existing /supersale-launch/
page (src/pages/supersale-launch/index.astro + src/components/SupersaleLaunchCard.astro), latest commit
on develop (post-merge #30). Full context:
campaigns/supersale/sketches/BRIEF_launch_landing_v10_early_reserver_discount.md (ERP repo).

PRE-FLIGHT
1. git branch -> develop. git status -> pre-existing WIP untouched; selective add by filename.

CONCEPT
Extra ₪50 discount for customers who reserve a spot in advance, shown as a 3rd price line on PRICED
cards. Guardrails (legal/clarity): the ₪50 applies to ONE sunglasses frame only (not every frame
bought); coupon limit = 2 sunglasses + 2 reading frames; the discounted price IS the binding checkout
price for early reservers on that one frame.

CHANGES
2. CARD LAYOUT (priced cards = fashion sun only; luxury + reading cards have no price -> leave them):
   - Shrink the event price slightly; tighten the gap between brand/model and the price block to fit a
     third line without making the card taller/cluttered.
   - Keep struck price line + event price line ("מחיר אירוע").
   - ADD below "מחיר אירוע", in gold: "*למשריינים מראש: {e−50} ש"ח"
     (890->840, 690->640, 400->350; compute from field `e` minus 50). Leading asterisk required.
   - Mobile 2-col must stay clean.
3. FAQ — do NOT add a new question. Expand the answer to "איך עובדים מחירי האירוע?" to include:
   - "כל קופון אישי מזכה ב-2 משקפי שמש + 2 מסגרות ראייה."
   - "מי שמשריין מקום מראש מקבל הטבת אקסטרא של ₪50 הנחה (בנוסף למחירי האירוע ולשאר ההטבות) - ההטבה הזו
     היא על זוג משקפי שמש אחד, לא על כל המסגרות בקנייה."
   Keep the rest of that answer intact. This is the caveat the card asterisk points to.

UNCHANGED: same items, same catalog event prices (₪50 line is derived), tabs, sub-toggles, lightbox,
price-scatter order, other FAQ, CTA, hero.

RULES: 25/26/27/28/32 (gold AA, tidy card, mobile-OK). File <=350. Develop only. PREVIEW only.

VERIFY + DEPLOY
4. node scripts/full-test.mjs --no-build (must pass). Build.
5. Confirm: fashion-sun cards show 3 price lines incl gold "*למשריינים מראש: {e−50} ש"ח" (840/640/350
   correct); card not taller/cluttered; reading+luxury unchanged; FAQ "איך עובדים מחירי האירוע?"
   expanded with coupon-limit + one-sunglasses-frame caveat.
6. Push develop, commit by explicit filenames. Report commit SHA. Clean git status.

STOP-ON-DEVIATION: build break, safety-net fail, unavoidable rule violation, anything needing main/prod.
