# BRIEF — SuperSale main-page price update (790→890) + launch-page context gathering

**Author:** Events-Operations (Cowork)
**For:** Claude Code session in the `opticup-storefront` repo
**Date:** 2026-05-22
**Companion file:** `ACTIVATION_PROMPT_supersale_price_update.md` (paste that into Claude Code)

---

## 1. Objective

Two things, in order:

1. **(Read-only context)** Give back enough understanding of the live SuperSale page (`/supersale/`)
   and the takanon (`/supersale-takanon/`) that the Events-Ops chat can keep improving the new
   launch landing page we're building, with full knowledge of what the event legally commits Prizma to.
2. **(One surgical edit)** In the SuperSale main page price grid, change every item whose **final
   price is ₪790** to **₪890**. Prices went up; ₪790 is confusing newly-registering leads.

## 2. Background — what's already done & verified (don't re-derive)

- We are building a NEW dedicated launch landing page (separate from `/supersale/`). That work is
  happening in Cowork and is NOT part of this Claude Code job.
- The open event is "אירוע המותגים - מאי 2026", Friday 29.5, Ashkelon branch, ₪50 booking fee.
- Price model in use on the new page (FYI, not for this edit): event prices 890 / 690 / 400 by brand
  tier; struck price = inventory final-price + 100 rounded up to 50. This edit is ONLY about the
  EXISTING `/supersale/` grid's 790 values becoming 890.
- WhatsApp number for the brand is 053-364-5404 (verified from the registration-confirmation template).

## 3. Constraints (Iron Rules in force)

- **Takanon: DO NOT MODIFY. Read-only.** Daniel confirmed the takanon is already reviewed and correct.
  Pattern P41 (surgical edits only) — but for THIS job the takanon is strictly read-for-context.
- **Surgical edit only** on the price change. Do not refactor the grid, do not touch other prices,
  do not change layout/copy. Only 790→890 where 790 is the *final/displayed* price.
- **Verify before claiming** (opticup-guardian Rule 23b): enumerate every 790 occurrence, don't estimate.
- **Develop branch only.** Never main. Report final `git status` clean.
- **If prices come from the DB** (a view/RPC/table): do NOT run an UPDATE — report the exact rows +
  the exact SQL that *would* do it, and STOP for Daniel. If they're **hardcoded in page source**,
  the edit may be applied on develop after enumeration, then verified.

## 4. Expected deliverables (what to return)

**PART A — context summary (≤ 400 words):**
- Takanon: the Challenge mechanism, 14-day guarantee, free-glasses fallback, and any existing
  price-commitment / "cheapest" wording (quote it verbatim if present).
- SuperSale page: structure, where the price grid data comes from (DB view/RPC vs hardcoded), and
  how registration links work (per-lead short links `r/CODE`?).

**PART B — price-edit punch list:**
- Exact data source of the 790 values (file:line if hardcoded, or table/view+column if DB).
- Exact COUNT of items currently at final-price 790, enumerated (not estimated).
- 3 spot-checks against what actually renders.
- If hardcoded: apply 790→890 on develop, re-verify, report the diff.
- If DB-sourced: STOP and return the proposed SQL for Daniel's approval (do not run it).

## 5. Verification evidence required

- The enumerated list of 790→890 changes (before/after).
- For a code edit: the git diff + a re-grep proving zero stray 790 finals remain.
- For a DB path: the SELECT output + the proposed (un-run) UPDATE.
- Final `git status` (clean) if any commit was made.
