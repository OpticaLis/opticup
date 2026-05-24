# Brief — M6 Visual-Fidelity QA Closure (Phase E + F)

> **Authored by:** opticup-architect (Cowork) — 2026-05-24
> **For:** fresh Claude Code session on the **Windows desktop** (the FUSE-source machine)
> **Pipeline:** Full-Auto — Foreman (opticup-strategic) → Executor (opticup-executor) → Reviewer (opticup-reviewer) → Localhost-Tester (opticup-localhost-tester) → Foreman closure
> **Companion Activation Prompt:** `M6_VISUAL_QA_CLOSURE_ACTIVATION_PROMPT.md` (sibling file)

---

## 1. Why this Brief exists

M6 (Prescriptions) is functionally complete. Schema, RPCs, views, and the recall engine are CLOSED with full smoke (M6_SCHEMA: 9/9 functional + 5/5 cross-contract). Two UI screens were **built last night (2026-05-24 night run)** but their SPECs were **never formally closed** — there is no `FOREMAN_REVIEW.md`, no `TEST_REPORT.md`, no `EXECUTION_REPORT.md` for either:

1. **M6_PRESCRIPTION_EDITOR** (Phase E) — the standalone `prescriptions.html` editor (sidebar history + center editor, glasses ↔ contacts).
2. **M6_M5_CARD_WIRING** (Phase F) — M5 customer-card tab-3 (prescriptions summary) + tab-2 (vision history) flipped from coming-soon stubs to live data.

The code is on disk (`prescriptions.html` + 13 files under `modules/prescriptions/`; the two M5 card tab files modified). Partial Chrome MCP screenshots already exist in the editor SPEC folder. **What is missing is the formal Visual-Fidelity Gate closure** required by Iron Rule 34 (strengthened 2026-05-23 by VISUAL_FIDELITY_GATE SPEC): a region-by-region mockup-vs-live comparison table embedded in BOTH `TEST_REPORT.md` AND `FOREMAN_REVIEW.md`. Without it, neither SPEC can be 🟢 and M6 cannot be declared module-complete.

This closure is the last tail-fix for M6. After it, the path is clear to the **Monorepo Migration** dispatch, which unblocks parallel module builds.

## 2. The repo-state warning (read before anything)

The Cowork VM that authored this Brief reports **2,649 uncommitted files** on `develop` — 2,611 marked Modified, spread across every module (CRM, Storefront, Inventory, guardian, etc.) plus **46 `.claude/skills/**` paths.** This is almost certainly the **FUSE-stale phantom snapshot** described in CLAUDE.md §3a Phase 2.5 — Cowork's mount showing a rotted view while the desktop working tree is actually clean (the exact 2,340-vs-6 incident class from 2026-05-17, and the recurring `.claude/skills` pile from the 2026-05-23 Clean-Repo incident).

**The desktop session MUST resolve this BEFORE touching M6 code, per CLAUDE.md §3a + Iron Rule 31 + the `clean-repo-gate.mjs` hard-fail (≥30 untracked OR any `.claude/skills/**` modified blocks every commit).**

Two-phase, survey-before-destroy, exactly per the constitution:
- **Phase 1 (always):** `git status --porcelain | grep '^??' > /tmp/untracked-before.txt` and eyeball it. The ~38 untracked files include real M6 architecture-brief drafts (build/editor-fix/QA activation prompts) — these are real work, NOT discardable.
- **Decision gate:** if the desktop `git status` shows the SAME 2,600+ modified pile → it is real local drift that needs investigating, STOP and report to Daniel. If the desktop shows a clean (or near-clean) tree and only Cowork saw the pile → the pile was a FUSE phantom; proceed with selective `git add` by filename for M6 work only.
- **NEVER** run `git clean -fd` or `git reset --hard` without Daniel's explicit confirmation in-chat. The `.claude/skills` paths must never be staged or committed.

This is the single highest-risk part of the job. Get the repo to a known-clean state for the M6 files first; everything else is mechanical.

## 3. Scope — what to close

### Screen 1: Prescription Editor (`prescriptions.html` + `modules/prescriptions/`)
- SPEC: `modules/Module 6 - Prescriptions/docs/specs/M6_PRESCRIPTION_EDITOR/SPEC.md`
- Mockup (locked 2026-05-23): `modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTION_EDITOR_MOCKUP.html`
- Existing screenshots (already captured): in the SPEC folder (`vfg-*.png/jpeg`) — reuse where current, recapture where stale.
- The VFG must cover BOTH the glasses view AND the contacts view (the type toggle), the per-eye param table, the ADD block (copy R→L), the recall pills, the print strip (coming-soon), and the DRAFT/COMMITTED context bar.

### Screen 2: M5 Customer Card tabs (tab-3 prescriptions + tab-2 vision)
- SPEC: `modules/Module 6 - Prescriptions/docs/specs/M6_M5_CARD_WIRING/SPEC.md`
- Mockup for region-compare: `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMER_CARD_MOCKUP.html`
- VFG must cover tab-3 (prescription summary table + "+ מרשם חדש" button + navigation to editor) and tab-2 (vision history timeline), and confirm tabs 1/4/5 did not regress.

## 4. Definition of Done (per Iron Rule 34, strengthened)

For EACH of the two SPECs, the closure deliverables are:
1. **`EXECUTION_REPORT.md`** — what was verified, any deviations found + fixed during QA.
2. **`FINDINGS.md`** — any bugs/gaps surfaced (even if deferred).
3. **`TEST_REPORT.md`** — containing: (a) first-load styled-check PASS (CSS variables resolve, page rendered styled not raw text — this is the M5-card-CSS-link lesson from 2026-05-23); (b) functional smoke results (the S-cases in each SPEC §14); (c) the **region-by-region mockup-vs-live comparison TABLE** — one row per region, columns: mockup-element → live-state → match/mismatch → severity → classification (INTENTIONAL / DRIFT / SCHEMA-BLOCKED / FEATURE-BLOCKED).
4. **`FOREMAN_REVIEW.md`** — the same region table embedded again + verdict. A bare screenshot is explicitly INVALID ("paperwork PASS"). Any mismatch classified as DRIFT must be fixed before 🟢, OR the SPEC re-opens to REOPEN status.
5. Chrome MCP screenshots attached to the SPEC folder, current (recaptured tonight if the existing ones are stale).
6. Real fixes if the live screen drifts from the mockup — this is a closure that **may ship code changes** (per the "No Polish-by-Validation" rule: if the screen doesn't match, fix it, don't rationalize the gap).

## 5. Constraints (Iron Rules in force)

- **Demo tenant only** for all testing (slug=demo, PIN 12345). No Prizma writes.
- **No merge to main** — develop only. Merge is Daniel-only after he reviews.
- **Files ≤ 350 lines** (Iron Rule 12). The 13 rx-*.js files were built to this; if a fix pushes one over, split.
- **No innerHTML with user input** (Iron Rule 8); **no hardcoded business values** (Iron Rule 9).
- **`npm run verify:integrity` exit 0** before any commit (Iron Rule 31); **`clean-repo-gate.mjs`** must pass (Iron Rule 31 regime — the repo-state work in §2 is what makes this possible).
- **Destructive Operations: None** in both SPECs. If the repo cleanup in §2 requires anything destructive → that is a STOP-and-escalate to Daniel, not a silent action.
- **Selective `git add` by filename** — never `git add -A` / `git add .` given the phantom pile.

## 6. Expected end state

- Both SPEC folders contain the 4 closure docs + current screenshots.
- `modules/Module 6 - Prescriptions/docs/SESSION_CONTEXT.md` updated: Phase E + F → 🟢 CLOSED **with VFG evidence** (currently it claims closed but VFG is listed as pending under "What's next" #2 — remove that pending item once done).
- `MODULE_6_ROADMAP.md` updated: the phase table currently shows ALL phases as ⬜ — bring it in sync with reality (A/B/C/E/F → ✅, D migration still deferred).
- `OPEN_TASKS.md` updated: add an M6 row reflecting closure, and note M6 is module-complete except Phase D (migration, depends on M5_MIGRATION).
- Working tree clean for M6 files; phantom pile resolved or confirmed-phantom-and-left-untouched per §2.
- Hebrew summary to Daniel at the end.

## 7. Out of scope

- Phase D — OpticPlus migration (6,248 exams + 251 CL prescriptions) — separate SPEC, depends on M5_MIGRATION, Daniel-in-loop.
- Phase G+ — print/send actions, order-creation-from-prescription (M7 dependency).
- Recall axis EDITING (M12 owns recall_rules; M6 displays read-only).
- The Monorepo Migration (next dispatch after this closes).
- Any cleanup of non-M6 files in the phantom pile (leave them; §2 is only about getting M6 files committable).

## 8. After this closes

The next dispatch is the **Monorepo Migration** (OPEN_TASKS task #4, SEALED + VALIDATED, Brief at `modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_BRIEF.md`). Its hard-prerequisite list (Brief §5) includes "M1 Phase 2 + Funnel complete + merged" and "IRON_RULE_32_HOOK_COMMENT_AWARENESS closed" — the Architect will re-confirm those gates are met before dispatching it. This M6 closure is a clean stepping-stone: it ends with a known-clean repo state, which is itself a precondition for a safe monorepo migration.

---

*End of M6_VISUAL_QA_CLOSURE_BRIEF.md.*
