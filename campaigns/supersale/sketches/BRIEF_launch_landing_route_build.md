# BRIEF — Build the SuperSale "launch collections" landing page as a real storefront route + deploy preview

**Author:** Events-Operations (Cowork)
**For:** Claude Code in the `opticup-storefront` repo
**Date:** 2026-05-22
**Companion:** `ACTIVATION_PROMPT_launch_landing_route_build.md` (paste into Claude Code)
**Reference sketch (ERP repo):** `campaigns/supersale/sketches/premium-launch-landing-v3.html`

---

## 1. Objective

Turn the approved sketch into a REAL, live storefront route on a Vercel **preview** (not production),
so Daniel can open it on desktop + mobile with images and tabs actually working. This is the
registration-driver page we will send to ~1,137 not-yet-registered leads on Sunday for the Friday 29.5
"אירוע השקת קולקציות" event. Speed matters but correctness matters more — it must look premium and work.

## 2. What the page is (from the sketch — copy its content exactly)

A campaign landing page with a hero, a trust strip, a legal price-pledge line, **3 tabs**, and a
WhatsApp-only CTA. Copy all Hebrew text, structure, and styling from the sketch verbatim. Tabs:

1. **בתי אופנה נבחרים** — 56 product cards (sunglasses): Prada, Miu Miu, Tiffany & Co, Versace, Ray-Ban.
   Each card: brand, model, struck price (`w`), event price (`e`), two badges ("קופון אישי בלבד" /
   "לנרשמים מראש"). Ray-Ban is the ₪400 anchor, spread among the cards.
2. **קולקציות יוקרה** — 40 cards (sunglasses): John Dalia, Cazal, KameManNen, Matsuda, Fred.
   Badge "הטבות אירוע בלעדיות", NO price (these get exclusive event offers, not launch pricing).
3. **שאלות ותשובות** — 8 Q&A accordions (copy verbatim from sketch).

Also: image **lightbox** (click a card → enlarge, arrow between the 2 angles), brand-spread ordering
(no two same-brand cards adjacent), hover swaps to the 2nd product image.

**The exact model list + prices + image storage_paths are the inline JSON in the sketch's two
`<script id="data-fashion">` and `<script id="data-luxury">` blocks. Use those as the data source —
do NOT re-query inventory, the selection is already curated and approved.**

## 3. CRITICAL — image handling (this is why we're building a real route)

The sketch points images at `https://prizma-optic.co.il/api/image/{storage_path}`. In the storefront
repo, route every image through the SAME-ORIGIN image proxy `/api/image/[...path].ts` (Iron Rule 25)
so images load correctly and the private `frame-images` bucket stays private. Each item's
`i1`/`i2` value is the `storage_path` — feed it to the proxy. Product cards use `bg-white`,
transparent-PNG style (Iron Rule 26).

## 4. Route + slug

Recommend a new route `/supersale-launch/` (descriptive name — NO Module-3 phase letters in this repo).
If the team prefers it as a `storefront_pages` block-driven page like `/supersale/`, that's also fine,
but a dedicated `.astro` page is simpler for a one-off campaign LP and keeps it isolated. State which
approach you took and why.

## 5. CTA — WhatsApp only (per Daniel)

There is no single registration link (each lead has a per-lead short link). So the CTA is WhatsApp-only:
opens `https://wa.me/972533645404?text=<prefilled>` where the prefilled message is:
`היי, אני רוצה לשריין מקום לאירוע השקת הקולקציות ביום שישי 29.5 בסניף אשקלון. [הגעתי מעמוד ההשקה]`
The `[הגעתי מעמוד ההשקה]` tag lets the branch team identify the source and send the personal
registration link manually. (053-364-5404 = 972533645404 international.)

## 6. Legal wording (already vetted — use exactly)

Price-pledge line: "קונים באירוע עם **מנגנון התחייבות למחיר הזול בישראל** - מצאתם את אותו הדגם בזול
יותר? הראו לנו ונשתדל להשוות." Do NOT use an absolute "המחיר הזול בישראל" claim. The FAQ uses the
same framing. (Consumer-protection: an absolute "cheapest" claim is a factual claim that must be
provable; the mechanism framing is defensible.)

## 7. Constraints (Iron Rules in force — storefront repo)

- Rule 24: Views/RPC only for any DB read (but here data is from the sketch JSON, so likely none).
- Rule 25: image proxy mandatory. Rule 26: transparent product images on bg-white.
- Rule 27: RTL-first, logical CSS properties. Rule 28: mobile-first (test narrow breakpoint).
- Rule 32: accessibility IS 5568 / WCAG 2.0 AA — alt text, aria-labels on icon buttons, focus-visible,
  the lightbox needs role="dialog" aria-modal + focus handling + Esc close, contrast AA.
- File-size rules (≤350 .astro). Develop branch only — never main. Deploy a PREVIEW, not production.
- Run the safety-net scripts (Rule 30): `node scripts/full-test.mjs --no-build` after the change.

## 8. Expected deliverables

1. The new route built and rendering all 56 + 40 cards via the same-origin image proxy.
2. Tabs, lightbox (2-angle nav), hover-swap, WhatsApp CTA all working.
3. Safety-net scripts pass; build succeeds.
4. A Vercel **preview** URL (not production) — report it back.
5. Final `git status` clean on develop (commit by explicit filenames, no wildcards).

## 9. Verification evidence required

- The preview URL.
- Confirmation images load through `/api/image/` (curl one image URL → 200).
- A note that tabs + lightbox work (or a screenshot via Chrome MCP if available).
- `full-test.mjs --no-build` output.
- The commit hash + clean `git status`.

## 10. Stop-on-deviation

Stop and report if: images 404 through the proxy, any safety-net test fails, the build breaks, a Rule
24-32 violation is unavoidable, or anything requires touching production/main. Do not improvise around
a blocker — report it.
