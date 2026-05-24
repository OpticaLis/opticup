You are in opticalis/opticup-storefront on branch develop. Simplify the early-reserver discount on the
existing /supersale-launch/ page (src/pages/supersale-launch/index.astro + src/components/SupersaleLaunchCard.astro),
latest commit 5d4b3f8 on develop.

PRE-FLIGHT
1. git branch -> develop. git status -> pre-existing WIP untouched; selective add by filename.

CHANGES (simplify — the ₪50 extra is now ₪890-tier ONLY, no per-frame limit)
2. The "*למשריינים מראש: {e−50} ש"ח" gold line on cards: keep it ONLY on cards where event price (`e`)
   = 890 (shows "למשריינים מראש: 840 ש"ח"). REMOVE the line from the ₪690 and ₪400 cards entirely.
   (So only the ₪890 / Prada-MiuMiu-Tiffany cards show the early-reserver line.)
3. REMOVE the leading asterisk — it now reads "למשריינים מראש: 840 ש"ח" (no "*"), since there is no
   longer a footnote/caveat it points to.
4. FAQ "איך עובדים מחירי האירוע?" answer:
   - KEEP the coupon-limit sentence: "כל קופון אישי מזכה ב-2 משקפי שמש + 2 מסגרות ראייה." (this is real, leave it)
   - REMOVE the sentence about the ₪50 extra / one-sunglasses-frame caveat (the one starting
     "מי שמשריין מקום מראש מקבל הטבת אקסטרא של ₪50..."). Delete that sentence only.
   - Keep the rest of the answer intact.

UNCHANGED: items, catalog event prices, tabs, sub-toggles, lightbox, scatter order, other FAQ, CTA, hero.

RULES: 25/26/27/28/32. File <=350. Develop only. PREVIEW only.

VERIFY + DEPLOY
5. node scripts/full-test.mjs --no-build (must pass). Build.
6. Confirm rendered DOM: "למשריינים מראש: 840 ש"ח" appears ONLY on ₪890 cards (41 of them), and is
   ABSENT on ₪690 + ₪400 cards; no asterisk anywhere on that line; FAQ keeps coupon-limit, drops the
   ₪50 sentence.
7. Push develop, commit by explicit filenames. Report commit SHA. Clean git status.

STOP-ON-DEVIATION: build break, safety-net fail, unavoidable rule violation, anything needing main/prod.
