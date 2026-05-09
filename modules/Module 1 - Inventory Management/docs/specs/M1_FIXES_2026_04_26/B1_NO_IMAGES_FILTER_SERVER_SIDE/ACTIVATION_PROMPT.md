# Activation Prompt — B1_NO_IMAGES_FILTER_SERVER_SIDE

> Daniel: copy everything between `--- BEGIN PROMPT ---` and `--- END PROMPT ---` into Claude Code and run.

--- BEGIN PROMPT ---

Load the `opticup-executor` skill and execute this SPEC under Bounded Autonomy:

`modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/B1_NO_IMAGES_FILTER_SERVER_SIDE/SPEC.md`

Goal: move the `_noImagesFilter` predicate from client-side post-filter (lines 87–92 of `modules/inventory/inventory-table.js`) into the Supabase query itself, so the filter operates over the full tenant catalog with correct count + pagination.

**Approach (try in order; stop on success):**
1. Preferred — add `query = query.is('inventory_images.id', null)` when `_noImagesFilter` is true, before `range()`. Use the demo tenant in QA to verify it returns rows where the inventory_images embed is empty.
2. Fallback — if (1) returns wrong rows in QA, use a 2-query approach: SELECT DISTINCT `inventory_id` FROM `inventory_images` for the tenant, then `query.not('id', 'in', '(${ids.join(",")})')`. STOP and report if the ID list exceeds ~500 entries.
3. Last resort — escalate to Foreman before authoring any RPC or DDL (Level 3 SQL is never autonomous).

**Process:**
- Run the executor First Action (sync gate, integrity gate, branch verify).
- Apply the chosen approach. Remove the dead client-side block at lines 87–92 once the server-side filter works (the `count` from PostgREST line 72 already provides the true total).
- QA on demo: toggle ON the no-images button. Verify (a) total count matches `SELECT COUNT(*) FROM inventory WHERE tenant_id = '${DEMO_UUID}' AND id NOT IN (SELECT inventory_id FROM inventory_images WHERE tenant_id = '${DEMO_UUID}' AND inventory_id IS NOT NULL)`, (b) page 2 (if applicable) returns different image-less items, (c) toggling OFF restores the unfiltered count.
- Update `ROADMAP.md` row B1 + Progress Tracking row.
- Use the **two-commit pattern** from SPEC §9 (fix + chore-spec).

**Pre-existing-state expected:**
The working tree on Windows desktop has the same pre-existing dirty state from C1/D5 (untracked `outputs/`, modified `docs/guardian/*`, untracked test artifacts). Use selective explicit-name `git add` only — same option-B as C1/D5. Do NOT touch those files.

**In-scope file list (anything else = stop trigger):**
- `modules/inventory/inventory-table.js`
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/ROADMAP.md`
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/B1_NO_IMAGES_FILTER_SERVER_SIDE/SPEC.md` (already authored — reference only)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/B1_NO_IMAGES_FILTER_SERVER_SIDE/EXECUTION_REPORT.md` (overwrite stub)

**Stop-on-deviation:**
- Any other file modified/staged → STOP.
- `npm run verify:integrity` fails → STOP.
- Approach (1) returns wrong rows AND the fallback (2) hits >500 IDs → STOP.
- A required RPC/DDL is implied by anything → STOP, escalate to Foreman.

**Final report (in chat after both commits + push):**
- 2 commit hashes
- Final `git status --short` (only the unrelated pre-existing dirty state should remain)
- QA evidence: count comparison + page-2 sample
- Verdict: "B1 closed. Awaiting Foreman review."

--- END PROMPT ---
