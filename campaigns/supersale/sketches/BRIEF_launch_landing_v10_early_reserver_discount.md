# BRIEF — SuperSale launch v10: early-reserver ₪50 extra discount on cards + FAQ coupon-limit clarity

**Author:** Events-Operations (Cowork) · **For:** Claude Code in opticup-storefront · 2026-05-22
**Companion:** ACTIVATION_PROMPT_launch_landing_v10_early_reserver_discount.md
**Edits:** existing /supersale-launch/ (index.astro + SupersaleLaunchCard.astro), latest commit on develop (post-merge #30).

---

## Concept (this is a one-time push for the upcoming event)
Extra ₪50 discount for customers who RESERVE A SPOT IN ADVANCE, on top of the event prices. Shown on the
priced cards as a third price line. IMPORTANT legal/clarity guardrails (Daniel-confirmed):
- The extra ₪50 applies to **ONE sunglasses frame only** — NOT to every frame the customer buys.
- The coupon itself is limited to **2 sunglasses + 2 reading frames**.
- ₪840 (and 640 / 350) IS the binding checkout price for early-reservers on that one frame.

## 1. Card layout change (priced cards = fashion sun; reading cards have no price, leave them)
Current priced card shows: struck price (₪1,xxx, line-through) → event price (₪890/690/400, big gold) → "מחיר אירוע".
New layout — fit a third price line WITHOUT making the card taller/cluttered:
- Shrink the event price slightly (a bit smaller than now).
- Reduce the vertical gap between brand/model and the price block (tighten spacing) to make room.
- Keep: struck price line, event price line ("מחיר אירוע").
- ADD a new line BELOW "מחיר אירוע", in gold: **"*למשריינים מראש: {e−50} ש"ח"**
  i.e. 890→"*למשריינים מראש: 840 ש"ח", 690→640, 400→350. The leading asterisk is required (it ties to
  the FAQ caveat). Compute as event price (field `e`) minus 50.
- Only on cards that HAVE a price (fashion sun). Luxury + reading cards (no price) get NO discount line.

## 2. FAQ clarification (do NOT add a new question — reword/expand an existing one)
Expand the answer to **"איך עובדים מחירי האירוע?"** to include, clearly:
- Coupon limit: "כל קופון אישי מזכה ב-2 משקפי שמש + 2 מסגרות ראייה."
- Early-reserver extra: "מי שמשריין מקום מראש מקבל הטבת אקסטרא של ₪50 הנחה (בנוסף למחירי האירוע ולשאר
  ההטבות) — ההטבה הזו היא על זוג משקפי שמש אחד, לא על כל המסגרות בקנייה."
Keep the rest of the answer (coupon-only realization etc.) intact. Phrase naturally; this is the
caveat the card asterisk points to.

## Constraints
ORDERING/LAYOUT only — same items, same event prices (the ₪50 line is derived, not a price change to
the catalog). Iron Rules 25/26/27/28/32 (gold line keeps AA contrast; card stays tidy/mobile-OK).
File ≤350. Develop only, preview only. full-test must pass. Pre-existing WIP untouched.

## Deliverables + verify
- Every fashion-sun card shows the 3 price lines, with "*למשריינים מראש: {e−50} ש"ח" in gold,
  card not visibly taller/cluttered, mobile 2-col still clean.
- 840/640/350 computed correctly (890−50 / 690−50 / 400−50). Reading/luxury cards unchanged (no line).
- FAQ "איך עובדים מחירי האירוע?" expanded with coupon-limit + one-sunglasses-frame caveat.
- full-test passes; build clean; push develop; report commit SHA (I fetch preview). Clean git status.

## Stop-on-deviation
Build break, safety-net fail, unavoidable rule violation, anything needing main/prod.
