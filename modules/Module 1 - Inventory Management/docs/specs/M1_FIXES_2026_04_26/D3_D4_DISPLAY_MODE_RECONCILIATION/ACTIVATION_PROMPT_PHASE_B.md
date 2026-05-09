# Activation Prompt — D3+D4 Phase B (substeps B-1 + B-2)

> Daniel: copy everything between `--- BEGIN PROMPT ---` and `--- END PROMPT ---` into Claude Code and run.

--- BEGIN PROMPT ---

Load the `opticup-executor` skill and execute **Phase B substeps B-1 + B-2 only** of this SPEC under Bounded Autonomy:

`modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D3_D4_DISPLAY_MODE_RECONCILIATION/`

**Read these files first, in order:**
1. `SPEC.md` — original 2-phase SPEC.
2. `INVESTIGATION_REPORT.md` — Phase A executor findings (LEGACY pair holds 100% of data; NEW pair empty).
3. `RECONCILIATION_DECISION.md` — Foreman picked **Option 2 (drop newer pair)**. This is your authority for Phase B.

**Important boundaries:**
- This dispatch covers **only B-1 + B-2** from RECONCILIATION_DECISION.md §3.
- **Substeps B-3 (view rewrite) and B-4 (DDL drop columns) are EXPLICITLY OUT OF SCOPE for this run.** They require Daniel sign-off (Iron Rule 29 + Level 3 SQL) and will be handled in a separate SPEC after one stable deploy cycle of B-2.
- Do NOT modify `v_storefront_products` view. Do NOT run `ALTER TABLE`. Do NOT drop any columns.

---

## Substep B-1 — Dead-code resolution (do FIRST, blocking B-2)

The investigation flagged `modules/storefront/studio-brands.js` and `modules/storefront/storefront-brands.js` as two parallel Brands-tab implementations writing to different field pairs. Before any rename, identify which is the live Brands tab and which is orphan.

**Steps:**
1. `grep -rn "studio-brands.js" --include="*.html" --include="*.js"` to find every loader of that file. Same for `storefront-brands.js`.
2. Open each `.html` page that loads either file and identify which is actually the navigated-to Studio Brands tab. The HTML pages of interest are likely `storefront-brands.html` and `storefront-studio.html`.
3. Run a `git log --follow --oneline modules/storefront/studio-brands.js` and the same on `storefront-brands.js` to see recency and intent.
4. Write a one-page note `B1_DEAD_CODE_MAPPING.md` in this SPEC folder listing: which file is live, which is dead-candidate, and the evidence (HTML loader chain + last commit dates + line counts).
5. **Do NOT delete the dead-candidate.** That's a separate housekeeping SPEC. B-1's only job is to identify so B-2 doesn't rename the wrong file.

**B-1 commit:** `chore(spec): D3+D4 Phase B-1 dead-code mapping`. Single commit. Files: `B1_DEAD_CODE_MAPPING.md` + (if needed) ROADMAP status update.

---

## Substep B-2 — JS rename (after B-1 commit lands)

In `modules/storefront/storefront-products.js`, replace all references to the NEW pair with the LEGACY pair, per the exact list from INVESTIGATION_REPORT.md Q6:

- Line 16 SELECT: `storefront_mode` → `display_mode`
- Line 29 SELECT: `storefront_mode_override` → `display_mode_override`
- Lines 66-67: derive from `display_mode_override || display_mode || 'store_all'` (note: default goes from `'catalog'` to `'store_all'` to match the LEGACY pair's idiom — verify this against the storefront's `displayMode` helper at `opticup-storefront/src/lib/products.ts:93`)
- Line 129: `p.storefront_mode_override` → `p.display_mode_override`
- Line 197 (changeProductMode write): `storefront_mode_override: newMode` → `display_mode_override: newMode`
- Line 206 (local mirror): same rename
- Line 232 (bulk write): same rename
- Line 243 (bulk local mirror): same rename

In the **live Studio Brands file from B-1** (whichever it turns out to be), apply the matching rename for the brand-level pair. **If B-1 identifies that the live file already writes LEGACY (`studio-brands.js` candidate), skip the rename for that file** — it's already correct, and the orphan (`storefront-brands.js`) doesn't need a rename either since it's slated for deletion in a future SPEC.

**Verification:**
1. `npm run verify:integrity` — must pass.
2. On demo tenant: open `storefront-products.html`, change a product's display override via the dropdown, then refresh the public storefront product card and verify the change reflects. Capture screenshot or page-text evidence.
3. Project-wide grep `storefront_mode_override` and `storefront_mode` (on its own, not as substring of `storefront-`) — both should now have **0 hits in JS source files** (other than the SPEC folder which can mention them historically).

**B-2 commits (two-commit pattern):**
1. `fix(storefront): align Studio JS on display_mode pair (D3+D4 B-2)` — code change + ROADMAP status flip.
2. `chore(spec): close D3+D4 Phase B-2 with retrospective` — EXECUTION_REPORT_PHASE_B.md (overwrite stub if exists, or create new) with full executor retrospective per template.

---

## In-scope file list (anything else = stop trigger)

- `modules/storefront/storefront-products.js` (renames)
- The live Studio Brands file from B-1 (rename if needed)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/ROADMAP.md`
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D3_D4_DISPLAY_MODE_RECONCILIATION/B1_DEAD_CODE_MAPPING.md` (new)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D3_D4_DISPLAY_MODE_RECONCILIATION/EXECUTION_REPORT_PHASE_B.md` (new)

---

## Pre-existing-state expected

The working tree on Windows desktop has the same pre-existing dirty state from C1/D5/B1/D3+D4-PhaseA (untracked `outputs/`, modified `docs/guardian/*`, untracked test artifacts, plus untracked Foreman docs that haven't been committed: `ACTIVATION_PROMPT*.md` files + `FOREMAN_REVIEW.md` files + `RECONCILIATION_DECISION.md`). Use selective explicit-name `git add` only — same option-B as before. Do NOT touch anything outside the in-scope list.

## Stop-on-deviation triggers

- Any modification to `v_storefront_products` view → STOP. Substep B-3.
- Any `ALTER TABLE` or `DROP COLUMN` → STOP. Substep B-4.
- B-1 reveals NEITHER file is loaded by any HTML (both orphan?) → STOP, report to Foreman.
- B-1 reveals BOTH files are loaded simultaneously by different HTML pages → STOP, this is a bigger architectural finding than expected; Foreman must decide.
- After rename, a project-wide grep for `storefront_mode_override` returns hits in JS files → STOP, complete the rename.
- `npm run verify:integrity` fails at any point → STOP, fix root cause, never `--no-verify`.
- Default value mismatch: if the LEGACY pair's idiomatic default is `'store_all'` (per storefront `products.ts:93`) but the renamed code in `storefront-products.js` ends up coalescing to `'catalog'`, that's a behavioral change. Verify the storefront's expected default and align — ask Foreman if unclear.

## Final report (in chat after B-2 push)

- 3 commit hashes (B-1 chore + B-2 fix + B-2 chore)
- Final `git status --short` (only the unrelated pre-existing dirty state should remain)
- B-1 verdict: which file is live, which is orphan, evidence
- B-2 QA evidence: storefront product card reflects override change after Studio toggle
- Verdict: "D3+D4 Phase B-1+B-2 closed. B-3 (view) + B-4 (DDL) deferred to separate SPEC pending Daniel sign-off."

--- END PROMPT ---
