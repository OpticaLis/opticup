You are running a Full-Auto Pipeline SPEC for the Optic Up project. Read the Brief at:

`modules/Module 4 - CRM/architecture-brief/M4_DUAL_PATH_DEPRECATION_PHASE_1_BRIEF.md`

Author the SPEC (Foreman), then execute via Foreman → Executor → Reviewer → Localhost-Tester → Foreman close.

**Pre-conditions:**

1. `M4_STATUS_CHANGE_MODAL_GATE_FIX` 🟢 closed.
2. `git status` clean. Pipeline lock claimed.
3. Smoke 7/7 PASS.

**Constraints:**

- Latency benchmark P95 < 65s gates the SPEC.
- `rule_match_probe` calls STAY (modal UX uses them).
- §4 Destructive Operations: `None.`
- Iron Rules 12/31/32 enforced.

**When done:**

> "M4_DUAL_PATH_DEPRECATION_PHASE_1 🟢 נסגר. [N] commits. consumer P95=[X]ms. שינוי סטטוס = 1 run בדיוק (לא 2). M4 repair slate complete."

Read the Brief and start.
