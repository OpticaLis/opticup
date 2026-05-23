You are in opticalis/opticup-storefront on branch develop. Build a campaign landing page as a real
storefront route and deploy a Vercel PREVIEW (never production, never main). Full context is in the
ERP repo at campaigns/supersale/sketches/BRIEF_launch_landing_route_build.md — read it first. The
approved design + exact data is the sketch at campaigns/supersale/sketches/premium-launch-landing-v3.html
(its two <script id="data-fashion"> / <script id="data-luxury"> JSON blocks are the curated, approved
model list — use them as-is, do NOT re-query inventory).

PRE-FLIGHT
1. git branch -> develop. git remote -v -> opticup-storefront. git status -> if dirty, report & ask.
   (There is known pre-existing WIP: tenant-fallback-map.json + docs/investigations/* — leave them
   untouched, use selective git add by filename.)

BUILD
2. Create route /supersale-launch/ (descriptive slug; NO phase letters). Port the sketch verbatim:
   hero, trust strip, the legal price-pledge line, 3 tabs (בתי אופנה נבחרים / קולקציות יוקרה /
   שאלות ותשובות), 56 fashion product cards (brand, model, struck price w, event price e, badges
   "קופון אישי בלבד" + "לנרשמים מראש"), 40 luxury cards (badge "הטבות אירוע בלעדיות", NO price),
   8 FAQ accordions, lightbox, brand-spread ordering, hover-swap to 2nd image.
3. IMAGES: route every image through the SAME-ORIGIN proxy /api/image/[...path].ts (Iron Rule 25) —
   each item's i1/i2 is the storage_path. bg-white transparent product style (Rule 26).
4. CTA = WhatsApp ONLY: https://wa.me/972533645404?text=<encoded> with text
   "היי, אני רוצה לשריין מקום לאירוע השקת הקולקציות ביום שישי 29.5 בסניף אשקלון. [הגעתי מעמוד ההשקה]"
5. LEGAL wording exactly: "קונים באירוע עם מנגנון התחייבות למחיר הזול בישראל - מצאתם את אותו הדגם
   בזול יותר? הראו לנו ונשתדל להשוות." (never an absolute "cheapest" claim).

RULES (storefront): 25 image-proxy, 26 transparent/bg-white, 27 RTL logical-props, 28 mobile-first,
32 accessibility AA (alt text, aria-labels, focus-visible, lightbox role=dialog aria-modal + Esc +
focus trap, AA contrast). File <=350 lines. Develop only. PREVIEW deploy only.

VERIFY + DEPLOY
6. Run: node scripts/full-test.mjs --no-build  (must pass).
7. Build, then deploy a Vercel PREVIEW. Report the preview URL.
8. curl one /api/image/ URL from the page -> confirm 200 (images load).
9. Confirm tabs + lightbox work (Chrome MCP screenshot if available).
10. Commit by explicit filenames (no wildcards) on develop. Report commit hash + clean git status.

STOP-ON-DEVIATION: images 404 through proxy, any safety-net failure, build break, unavoidable
Rule 24-32 violation, or anything needing production/main. Report, don't improvise.
