# Claude Code Activation Prompt — C1 + D5

> **Authored:** 2026-04-26 by opticup-strategic (Cowork session)
> **For:** Claude Code on Windows desktop (`C:\Users\User\opticup`)
> **Purpose:** Execute two pre-authored SPECs sequentially under Bounded Autonomy.
> **Daniel:** copy everything between the `--- BEGIN PROMPT ---` and
> `--- END PROMPT ---` markers below and paste into Claude Code.

---

--- BEGIN PROMPT ---

Load the `opticup-executor` skill and execute the following two SPECs in order, under Bounded Autonomy. Each is a SPEC folder containing `SPEC.md` plus a stub `EXECUTION_REPORT.md` you will overwrite at execution close.

**SPEC 1 (do this first):**
`modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/C1_PERMISSIONS_UPSERT/SPEC.md`

Goal: 1-character-list fix to `modules/permissions/employee-list.js:321` — add `tenant_id` to the `onConflict` parameter of the `role_permissions` upsert. Bug blocks all permission edits in Platform Admin.

**SPEC 2 (do this second, after SPEC 1 is committed):**
`modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D5_HIDDEN_PRODUCT_RECOVERY/SPEC.md`

Goal: remove the `if (resolved === 'hidden') return false;` filter at `modules/storefront/storefront-products.js:46` so admins can recover hidden products via the Studio UI. Recovers stuck product 0004223. Includes minor comment cleanup at lines 37-43.

---

**Execution rules for both SPECs:**

1. Run the executor First Action protocol (sync gate, integrity gate, branch verify).
2. Read each SPEC in full. Verify all required sections are present.
3. For each SPEC, before editing the source file:
   - Run `npm run verify:integrity` and confirm exit 0.
   - Re-read the target source line range to confirm pre-edit state matches the SPEC's "before" snippet.
4. Apply the edit, run `npm run verify:integrity` again, confirm zero deviation.
5. Update the relevant ROADMAP row (`📝 SPEC ready` → `✅` with commit hash) and Progress Tracking table.
6. Write the proper `EXECUTION_REPORT.md` (overwrite the stub) per the executor template, including Iron-Rule Self-Audit and 2 self-improvement proposals for the executor skill.
7. Commit each SPEC as its own commit with explicit `git add` (NEVER `git add -A`):
   - C1: `fix(permissions): add tenant_id to role_permissions upsert on_conflict (C1)`
   - D5: `fix(storefront): show hidden products in Studio Products tab (D5)`
8. After both commits land, push to `origin develop`.

**Pre-existing repo state warning:**

The Cowork session that authored these SPECs reported a corrupted index in the VM mount (the working tree on Windows desktop is independent and should be fine). Before starting:

```
git status
```

If the working tree shows pre-existing uncommitted changes that are NOT related to this work — STOP and ask Daniel before proceeding (per CLAUDE.md First Action step 4).

If the working tree is clean (or only shows the four files this work touches: 2 source + ROADMAP + 4 SPEC-folder files) — proceed.

**Files this work touches (exhaustive list — anything else means a deviation):**

- `modules/permissions/employee-list.js` (1 line edit)
- `modules/storefront/storefront-products.js` (~9 line edit, removing dead vars + adjusting comment)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/ROADMAP.md` (status updates)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/C1_PERMISSIONS_UPSERT/SPEC.md` (already authored — do not modify, just reference)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/C1_PERMISSIONS_UPSERT/EXECUTION_REPORT.md` (overwrite stub)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D5_HIDDEN_PRODUCT_RECOVERY/SPEC.md` (already authored — do not modify, just reference)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D5_HIDDEN_PRODUCT_RECOVERY/EXECUTION_REPORT.md` (overwrite stub)

**Stop-on-deviation triggers (in addition to anything in each SPEC):**

- `git status` shows files outside the list above — STOP and report.
- `npm run verify:integrity` fails — STOP, fix root cause, never `--no-verify`.
- The pre-edit snippet in any SPEC doesn't match the actual file content — STOP.
- Any error from any tool — STOP.

**Final report (after both commits + push):**

Reply in chat with:
- 2 commit hashes
- `git status --short` final output (must be clean)
- Confirmation that both `EXECUTION_REPORT.md` files were written
- Verdict: "C1 and D5 closed. Awaiting Foreman review."

--- END PROMPT ---

---

## Why this prompt format

- It is self-contained — Claude Code does not need to read any prior conversation.
- It enumerates the exact files in scope so any unexpected diff is a stop trigger.
- It hands authority by referencing the SPEC folders, not by repeating their content.
- It splits the work into two logical commits (one per fix), matching SPEC-per-commit discipline.
- It accounts for the Cowork-VM corruption (which lives in the Cowork mount, not on Daniel's Windows desktop — so Claude Code should see a clean working tree).

## After Claude Code finishes — Foreman review (next session)

Once Claude Code reports both commits, the next opticup-strategic session
should:
1. Read `EXECUTION_REPORT.md` in both SPEC folders.
2. Read the 2 commit diffs (`git show <hash>`).
3. Spot-check live behavior on the demo tenant (filter mode = "מוסתר" returns rows; toggling a permission no longer 400s).
4. Write `FOREMAN_REVIEW.md` in each SPEC folder with the standard sections (SPEC quality, Execution quality, Findings processing, 2+2 skill improvements, Verdict).
5. Update `MASTER_ROADMAP.md` if any cross-module status moved.
