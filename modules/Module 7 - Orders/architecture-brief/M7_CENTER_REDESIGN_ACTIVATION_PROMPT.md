# Activation: M7 Orders — Center Column Redesign (3 Variants)

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 7 - Orders/architecture-brief/M7_CENTER_REDESIGN_BRIEF.md`

**Mission:** Build 3 layout variants of the M7 Orders screen's center column (V7), each preserving all 9 data regions from V6, all with the Daniel-locked 2×2 picker + scan-on-left action-bar. Daniel will pick one as the winner.

**Deliverables:**
- ONE new file: `modules/Module 7 - Orders/architecture-brief/M7_CENTER_REDESIGN_V7_VARIANTS.html`
- The file contains 3 tabs (Variant A / B / C), each rendering the full 3-column M7 mockup with only the center column varied per §3 of the brief.
- A recommendation banner at the top of the file.
- Updates to MODULE_MAP / CHANGELOG / SESSION_CONTEXT for Module 7 noting the new file.
- EXECUTION_REPORT.md + FINDINGS.md in the SPEC folder.
- FOREMAN_REVIEW.md at the end.

**Continuous-Run Mandate:**
- Run end-to-end through skill chain: Foreman → Executor → Reviewer → Localhost-Tester → Foreman-review.
- DO NOT stop between phases.
- DO NOT open new chats.
- DO NOT ask Daniel which color/font/spacing to use — the brief is normative; within §3 rules every visual choice is Executor's call.
- Status lines (one Hebrew line per phase) only.
- Stop only on: real escalation (write `escalations/{TS}_*.md` + one Hebrew line), Iron Rule 31/32 violation, or success criterion that cannot be met.

**Destructive Operations Envelope:** **None.** File-creation only. Pipeline writes ONE new HTML file + docs updates. Existing M7_ORDERS_FULL_MOCKUP_V6.html and M7_ORDERS_CENTER_COLUMN_VARIANTS.html remain untouched. Any deletion or rename mid-run = escalation.

**Success Criteria (Pipeline self-verifies):**
1. File `modules/Module 7 - Orders/architecture-brief/M7_CENTER_REDESIGN_V7_VARIANTS.html` exists.
2. 3 tabs (Variant A / B / C) with sticky tab nav.
3. Each variant shows the FULL M7 3-column layout (right rail + center + left audit), not just the center column.
4. All 3 variants honor Daniel-locked rules: 2×2 type picker on RIGHT of action-bar, scan + "פתח קטלוג" on LEFT, vertical divider between them.
5. Variant A = two-pane work surface + sticky tools strip. Variant B = 6 collapsible accordion sections, one open at a time. Variant C = items-on-top + 5-tab bar below.
6. All 9 v6 data regions present in all 3 variants (nothing dropped).
7. Real V6 placeholder data preserved (Cazal 1280, Optimize Multifocal, etc.). RTL Hebrew.
8. Recommendation banner at file top names recommended variant + 1-sentence reason.
9. `npm run verify:integrity` exit 0.

**Closure:** When Pipeline finishes, write FOREMAN_REVIEW.md + apply 2 lessons each to opticup-strategic and opticup-executor SKILL.md. End with ONE Hebrew summary to Daniel:

> ✅ M7 Center Redesign CLOSED 🟢 — 3 וריאציות מוכנות. [computer://...M7_CENTER_REDESIGN_V7_VARIANTS.html] · המלצת הארכיטקט: וריאציה {X}. המתנה לבחירת דניאל.

Begin.
