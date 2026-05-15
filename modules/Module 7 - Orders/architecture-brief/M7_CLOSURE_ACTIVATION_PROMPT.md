# Activation: M7 Closure — Lock V7 = Variant A

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 7 - Orders/architecture-brief/M7_CLOSURE_BRIEF.md`

**Mission:** Daniel selected Variant A from the 3-variants file 2026-05-11. Extract it as the canonical `M7_ORDERS_FULL_MOCKUP_V7.html`, archive V6 + the 2 non-selected variants, update all documentation (brief, module docs, DECISIONS_LOG, OPEN_TASKS). Documentation-only closure SPEC — no design or code changes.

**Deliverables:**
- Canonical: `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html` (Variant A only, no tabs/banner)
- Archive folder: `_archive/m7-sketches-v6-prior/` with V6 + V7-variants file + center-column-variants file + README.md
- Updated: M7_ORDERS_BRIEF.md (Canonical Sketch line at top)
- Updated: SESSION_CONTEXT.md / MODULE_MAP.md / CHANGELOG.md for Module 7
- Updated: DECISIONS_LOG.md index (entry 18) + decisions/M7.md (entry 10)
- Updated: OPEN_TASKS.md (close task #1, reorder)
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md per Pipeline protocol

**Continuous-Run Mandate:**
- Run end-to-end through skill chain in ONE chat.
- DO NOT stop between phases.
- DO NOT ask Daniel questions answerable from the brief.
- Status lines (one Hebrew line per phase) only.
- Stop only on: Iron Rule 31/32 violation, escalation, or success criterion that cannot be met.

**Destructive Operations Envelope:**
- 3 file MOVES (git mv) into `_archive/m7-sketches-v6-prior/`:
  - `M7_ORDERS_FULL_MOCKUP_V6.html`
  - `M7_CENTER_REDESIGN_V7_VARIANTS.html`
  - `M7_ORDERS_CENTER_COLUMN_VARIANTS.html`
- NO deletes. NO rebases. NO table changes. NO force-push.
- Anything outside this list → STOP + escalate.

**Success Criteria (Pipeline self-verifies):**
1. `M7_ORDERS_FULL_MOCKUP_V7.html` exists, is self-contained, RTL, opens in browser, shows Variant A as a standalone mockup (no tab nav, no recommendation banner).
2. `_archive/m7-sketches-v6-prior/` contains the 3 moved files + README.md.
3. `M7_ORDERS_BRIEF.md` includes "Canonical Sketch" line at top referencing V7.
4. DECISIONS_LOG index entry 18 + per-module M7.md entry 10 both present.
5. OPEN_TASKS.md reflects M7 closure.
6. `npm run verify:integrity` exit 0.
7. `git status` shows clean working tree at end (modulo pre-existing baseline).
8. All commits pushed to `origin/develop`.

**Closure:** Pipeline writes FOREMAN_REVIEW.md + applies 2 lessons each to opticup-strategic and opticup-executor SKILL.md. End with ONE Hebrew summary to Daniel:

> ✅ M7 V7 CLOSED 🟢 — Variant A נעולה כסקיצה הקנונית. V6 + 2 וריאציות בארכיב. הבא בתור: אודיט סקיצות 9 מודולים.

Begin.
