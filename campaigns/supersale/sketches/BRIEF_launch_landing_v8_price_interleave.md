# BRIEF — SuperSale launch v8: interleave price tiers in fashion-sun (cheap anchor visible first)

**Author:** Events-Operations (Cowork) · **For:** Claude Code in opticup-storefront · 2026-05-22
**Companion:** ACTIVATION_PROMPT_launch_landing_v8_price_interleave.md
**Edits:** existing /supersale-launch/ — the `fashion` (sun) array in src/data/supersale-launch.json
AND/OR the ordering logic in index.astro. Latest commit on develop (post-merge #29).

---

## The problem
On the fashion → משקפי שמש grid, the FIRST rows are all ₪890 (the top tier). A visitor scrolling for a
second sees only "expensive" and may leave before noticing there are also ₪690 and ₪400 items. The
cheap price anchor MUST be visible in the opening rows. (Merchandising: affordability first.)

## The fix (ORDERING ONLY — do NOT change items or prices)
Reorder the fashion-sun cards so the low tiers are seeded into the opening rows. Desktop grid = 4 cols,
so per group of 4:
- cards 1–4: include at least ONE ₪400 item (Ray-Ban)
- cards 5–8: include at least ONE ₪690 item (Dolce & Gabbana or Versace)
- cards 9–12: include at least ONE ₪400 item
- cards 13–16: include at least ONE ₪690 item
…and generally keep ₪400 + ₪690 items recurring through the grid, not clustered at the end.

Price tiers in the fashion-sun data: ₪890 = Prada/MiuMiu/Tiffany; ₪690 = Dolce & Gabbana/Versace;
₪400 = Ray-Ban. (Field `e` = event price.)

## IMPORTANT — the runtime spread() interaction
index.astro currently runs a `spread()` that reorders cards at render time to avoid same-brand
adjacency (brand-spread). That brand-spread will UNDO any order we set in the JSON. So the price-
interleave must be enforced at RENDER time, not just in the JSON. Options (your call, cleanest wins):
- (a) Replace/augment `spread()` for the fashion-sun list with a price-tier-aware interleave that
  guarantees a ₪400 in the first 4 and a ₪690 in the next 4, etc., WHILE still avoiding same-brand
  adjacency where possible. OR
- (b) Keep brand-spread but add a price-tier constraint so each leading group-of-4 contains the
  required cheap anchor.
Either way: the RENDERED fashion-sun order must show the cheap anchors early. Other tabs/sub-tabs
(luxury, reading) keep their existing behavior.

## Constraints
ORDERING only — same 56 items, same prices, same images. Iron Rules 25/26/27/28/32. File ≤350.
Develop only, preview only. full-test must pass. Pre-existing WIP untouched.

## Deliverables + verify
- Rendered fashion-sun: first 4 cards include ≥1 ₪400; cards 5–8 include ≥1 ₪690; 9–12 ≥1 ₪400;
  13–16 ≥1 ₪690. Confirm by inspecting rendered order (DOM/probe), not just JSON.
- Same 56 items, no price/image changes. Other tabs unchanged.
- full-test passes; build clean; push develop; report commit SHA (I fetch preview). Clean git status.

## Stop-on-deviation
Build break, safety-net fail, unavoidable rule violation, anything needing main/prod.
