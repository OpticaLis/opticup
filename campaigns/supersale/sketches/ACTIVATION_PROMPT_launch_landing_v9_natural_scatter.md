You are in opticalis/opticup-storefront on branch develop. ONE refinement to the existing
/supersale-launch/ page (src/pages/supersale-launch/index.astro, latest commit 0fef1a6 on develop).

PRE-FLIGHT
1. git branch -> develop. git status -> pre-existing WIP untouched; selective add by filename.

PROBLEM
The current priceInterleavedSpread() for fashion-sun places a cheap anchor (₪400/₪690) at a FIXED
repeating slot — every group of 4, the anchor lands in the same column (right column). It looks too
regular/mechanical; visitors notice it's deliberate, and it reads as "few cheap items in a pattern."

FIX (ordering only — same 56 items, same prices/images)
2. Change the cheap-anchor placement from a fixed every-4th-in-the-same-column pattern to a NATURAL,
   IRREGULAR scatter:
   - Still guarantee a cheap (₪400 or ₪690) item is visible in the FIRST row (within the first ~3 cards).
   - Then distribute the remaining ₪400 + ₪690 items at UNEVEN intervals (e.g. positions 1, 6, 9, 14,
     18, 23, ... — not 1,5,9,13). Vary the gap so no two cheap anchors sit in the same column repeatedly
     and there's no obvious repeating rhythm.
   - Goal: looks organic, and gives the impression there are MORE low-priced items (not a tidy grid trick).
   - Keep: cheap item in the opening row, no two adjacent same-brand, all 8×₪400 + 7×₪690 + 41×₪890 used.
   Implementation: introduce controlled jitter into the tier sequence (e.g. pseudo-random but seeded so
   it's stable per build, OR a hand-tuned irregular index list) instead of the fixed group-of-4 anchor slot.
   Other lists (luxury sun, both reading) unchanged.

UNCHANGED: same 56 fashion-sun items, prices, images; all other tabs/sub-tabs, FAQ, CTA, hero.

RULES: 25/26/27/28/32. File <=350 (currently 347 — if the change pushes over, extract a small helper,
note it). Develop only. PREVIEW only.

VERIFY + DEPLOY
3. node scripts/full-test.mjs --no-build (must pass). Build.
4. Inspect rendered fashion-sun order: a cheap item in the first row; ₪400/₪690 positions are IRREGULAR
   (not a fixed every-4th-same-column pattern); same 56 items; no adjacent same-brand. Report the actual
   rendered list of cheap-anchor positions so I can see the scatter.
5. Push develop, commit by explicit filenames. Report commit SHA. Clean git status.

STOP-ON-DEVIATION: build break, safety-net fail, unavoidable rule violation, anything needing main/prod.
