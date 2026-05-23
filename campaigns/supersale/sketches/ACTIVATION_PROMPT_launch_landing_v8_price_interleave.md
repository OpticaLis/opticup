You are in opticalis/opticup-storefront on branch develop. ONE ordering change to the existing
/supersale-launch/ page (src/data/supersale-launch.json and/or src/pages/supersale-launch/index.astro),
latest commit on develop (post-merge #29). Full context:
campaigns/supersale/sketches/BRIEF_launch_landing_v8_price_interleave.md (ERP repo).

PRE-FLIGHT
1. git branch -> develop. git status -> pre-existing WIP untouched; selective add by filename.

PROBLEM
The fashion → משקפי שמש grid opens with all ₪890 (top tier) cards. The cheapest tier must be visible
in the FIRST rows so visitors see affordability immediately.

FIX (ORDERING ONLY — do NOT change items, prices, or images)
2. Reorder the fashion-sun cards so low tiers are seeded into the opening rows (desktop = 4 cols):
   - cards 1-4: include >=1 ₪400 item (Ray-Ban)
   - cards 5-8: include >=1 ₪690 item (Dolce & Gabbana or Versace)
   - cards 9-12: include >=1 ₪400 item
   - cards 13-16: include >=1 ₪690 item
   Keep ₪400 + ₪690 recurring through the grid, not clustered at the end.
   Tiers (field `e`): ₪890=Prada/MiuMiu/Tiffany; ₪690=Dolce&Gabbana/Versace; ₪400=Ray-Ban.
3. CRITICAL: index.astro runs spread() (brand-spread) at render time, which will UNDO any JSON order.
   So enforce the price-interleave at RENDER time — either make spread() price-tier-aware for the
   fashion-sun list (cheap anchor guaranteed in each leading group-of-4, still avoiding same-brand
   adjacency where possible), or add a price-tier constraint to the leading groups. Your call; cleanest.
   Other lists (luxury sun, both reading) keep current behavior.

UNCHANGED: same 56 fashion-sun items, same prices/images, all other tabs/sub-tabs, FAQ, CTA, etc.

RULES: 25/26/27/28/32. File <=350. Develop only. PREVIEW only.

VERIFY + DEPLOY
4. node scripts/full-test.mjs --no-build (must pass). Build.
5. Inspect the RENDERED fashion-sun order (DOM/probe, not just JSON): first 4 include >=1 ₪400,
   cards 5-8 >=1 ₪690, 9-12 >=1 ₪400, 13-16 >=1 ₪690. Confirm same 56 items, no price changes.
6. Push develop, commit by explicit filenames. Report commit SHA. Clean git status.

STOP-ON-DEVIATION: build break, safety-net fail, unavoidable rule violation, anything needing main/prod.
