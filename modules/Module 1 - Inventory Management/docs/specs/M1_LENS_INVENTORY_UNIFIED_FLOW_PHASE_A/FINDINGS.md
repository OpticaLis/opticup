# FINDINGS — M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A

**Generated:** 2026-05-18 evening
**Executor:** opticup-executor (Claude Code)

Findings discovered during execution that are NOT in the SPEC and warrant follow-up action.

---

## F-1 (INFO) — Rule 32 hook regex requires exact heading; SPEC.md initial heading rejected

**Location:** `scripts/checks/destructive-ops-declared.mjs` + `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A/SPEC.md` line ~127 (heading position)

**Description:** SPEC.md was authored with heading `## 4. Destructive Operations (Iron Rule 32)` (descriptive trailing parenthetical for human readers). The Rule 32 pre-commit hook regex matches only the exact pattern `## Destructive Operations` OR `## 4. Destructive Operations` with NO trailing characters. Result: C-A0 commit was blocked with `[destructive-ops-declared] ... SPEC.md missing "## Destructive Operations" (or "## 4. Destructive Operations") heading`. Fixed in same C-A0 cycle by editing the heading to drop the suffix. Re-staged + retried — passed.

**Suggested next action:** Two paths, ranked:

1. **Soft (hook-side, recommended)** — relax the regex to accept `^## (\d+\.\s+)?Destructive Operations(\s*\(.*\))?\s*$` so descriptive parentheticals like `(Iron Rule 32)` are accepted. The hook's job is to verify the SECTION EXISTS so it can be parsed for declared ops; a parenthetical suffix doesn't change that. ~3-line regex edit in `scripts/checks/destructive-ops-declared.mjs`.
2. **Hard (template-side)** — update `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` to warn authors that the heading must be exact. Less robust (relies on author discipline) but doesn't require touching the hook.

**Severity INFO** because: caught at first commit attempt by the gate itself (working as designed); no downstream damage; resolved in 1 edit cycle.

---

## F-2 (INFO) — Pre-commit warning "architect-pending-applied" fires every commit; pending entry deferred to Phase E

**Location:** `_archive/architect-pending-entries/2026-05-17_decisions_log_for_autonomous_skill.md` (the pending entry file itself)

**Description:** A pre-commit hook check (`architect-pending-applied`) reads the contents of `_archive/architect-pending-entries/` and emits a warning on every commit when an entry exists. Brief §7 Phase E explicitly defers application of these pending entries to Phase E (commit message: `chore(skills): apply pending entries`). Result: every Phase A commit (C-A0, C-A1, this C-A2) emits the warning. Non-blocking, but creates 3× repetition of the same noise during this Pipeline.

**Suggested next action:** Two paths:

1. **Apply sooner** — fold Phase E's pending-entries sweep into Phase A's C-A0 commit (a one-line scope expansion). Trade-off: violates Brief's sequencing of Phases A→E but eliminates 4× more warnings across Phases B-D-E.
2. **Filter warning when SPEC scope is bounded** — make the hook recognize "current SPEC is not Phase E of a pipeline that explicitly defers pending entries" and downgrade to a single-line acknowledgement on first commit per pipeline. Hook-side complexity; deferred.

**Severity INFO** because: warning is informational (0 violations), commits land; only concern is operator noise. Phase E will resolve naturally.

---

*FINDINGS closed. 2 INFO entries logged. 0 LOW/MEDIUM/HIGH/CRITICAL.*
