You are in opticalis/opticup-storefront on branch develop. This is a READ-FIRST context task
plus ONE precisely-scoped price edit. Companion brief:
campaigns/supersale/sketches/BRIEF_supersale_price_update_and_context.md (in the ERP repo).

PRE-FLIGHT
1. git branch -> must be develop. git remote -v -> must be opticalis/opticup-storefront.
2. git status -> if dirty, report each file and STOP; ask how to proceed.

PART A - CONTEXT (read-only; summarize back, <=400 words total). DO NOT modify the takanon.
3. Read the takanon page (route /supersale-takanon/ - find its source). Summarize: the Challenge
   mechanism, the 14-day guarantee, the free-glasses fallback, and ANY existing price-commitment /
   "cheapest" wording - quote verbatim if present.
4. Read the main SuperSale page (route /supersale/). Summarize: page structure, where the price-grid
   data comes from (DB view/RPC vs hardcoded in source - state which, exactly), and how registration
   links work (per-lead short links r/CODE?).

PART B - PRICE EDIT: every FINAL price of 790 -> 890 in the SuperSale main grid (prices went up).
5. Locate the 790 values:
   - If DB-sourced (view/RPC/table): write the exact SELECT listing every row with final-price=790
     (brand+model+id) and report the COUNT and the exact column. DO NOT run any UPDATE - return the
     proposed UPDATE SQL and STOP for Daniel.
   - If hardcoded in page source: grep "790" in the supersale page source, enumerate every match with
     file:line + context, report the COUNT, then apply 790->890 on develop (final price only - do NOT
     touch struck/original prices that legitimately differ), re-grep to prove zero stray 790 finals
     remain, and show the git diff.
6. Spot-check 3 of the changed items against what actually renders on the page.

CONSTRAINTS
- Takanon is READ-ONLY. Surgical edit only - no layout/copy/refactor, only 790->890 final prices.
- Enumerate, never estimate. Develop branch only, never main. End clean (git status).

OUTPUT: one report = PART A summary + PART B punch list (data source, exact count, enumerated
changes, spot-checks). If DB-sourced, apply nothing and return the proposed SQL. Stop and wait for Daniel.
