# M7 Orders — Closure Brief (V7 = Variant A)

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 7 — Orders

---

## 1. Purpose

Daniel selected **Variant A** (two-pane work surface + sticky tools strip) from `M7_CENTER_REDESIGN_V7_VARIANTS.html` 2026-05-11. This brief locks Variant A as the canonical M7 sketch (V7), archives variants B and C, and updates the documentation chain so the next session knows V7 = Variant A.

This is a documentation-only closure SPEC. No new design, no code changes.

## 2. Deliverables

1. **Extract Variant A** from `M7_CENTER_REDESIGN_V7_VARIANTS.html` into a standalone canonical file:
   `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html`
   - This is the single-variant file (no tabs, no banner). Just Variant A rendered as a complete M7 mockup.
   - It REPLACES `M7_ORDERS_FULL_MOCKUP_V6.html` as the active sketch.

2. **Archive V6 and the 3-variants file:**
   - Move `M7_ORDERS_FULL_MOCKUP_V6.html` → `_archive/m7-sketches-v6-prior/M7_ORDERS_FULL_MOCKUP_V6.html`
   - Move `M7_CENTER_REDESIGN_V7_VARIANTS.html` → `_archive/m7-sketches-v6-prior/M7_CENTER_REDESIGN_V7_VARIANTS.html` (kept for decision history)
   - Move `M7_ORDERS_CENTER_COLUMN_VARIANTS.html` → `_archive/m7-sketches-v6-prior/M7_ORDERS_CENTER_COLUMN_VARIANTS.html` (prior failed exploration)
   - Add `_archive/m7-sketches-v6-prior/README.md` explaining what was archived and why.

3. **Update M7 Brief (`M7_ORDERS_BRIEF.md`):**
   - Add a "Canonical Sketch" line at top: "Active sketch: `M7_ORDERS_FULL_MOCKUP_V7.html` (Variant A — two-pane + sticky tools strip). Selected by Daniel 2026-05-11."
   - Keep all other content unchanged.

4. **Update Module 7 docs:**
   - `modules/Module 7 - Orders/docs/SESSION_CONTEXT.md` — note V7 selection + archive of V6
   - `modules/Module 7 - Orders/docs/MODULE_MAP.md` — update sketch file references
   - `modules/Module 7 - Orders/docs/CHANGELOG.md` — add entry for V7 closure

5. **Update DECISIONS_LOG:**
   - `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — append entry 18 in cross-module log:
     `| 18 | 2026-05-11 | M7 V7 sketch selected (Variant A) | Daniel chose two-pane work surface + sticky tools strip over Variants B (accordion) and C (T-layout). Reason: all 9 v6 regions visible simultaneously, no clicks needed to see pricing or print actions. V6 + 2 variants archived. |`
   - `.claude/skills/opticup-architect/references/decisions/M7.md` — append entry 10 with full Architect/Daniel/reasoning text.

6. **Update OPEN_TASKS.md:**
   - Mark task #1 (M7 sketch redesign) as completed in the "Completed recently" section.
   - Promote task #2 (Audit of 9 module sketches) to task #1.

## 3. Out of Scope

- No design changes. V7 is exactly Variant A as it stands.
- No production code changes.
- No SPEC for building M7 in production. That happens later via separate Brief.

## 4. Destructive Operations

Declared:
- File move: `M7_ORDERS_FULL_MOCKUP_V6.html` → `_archive/`
- File move: `M7_CENTER_REDESIGN_V7_VARIANTS.html` → `_archive/`
- File move: `M7_ORDERS_CENTER_COLUMN_VARIANTS.html` → `_archive/`

All three are MOVES (git mv), NOT deletes — fully reversible. No table drops, no rebases, no force-pushes.

## 5. Continuous-Run Mandate

Run end-to-end through the skill chain in one Claude Code chat. No mid-pipeline questions. Stop only on:
- Iron Rule 31/32 violation.
- Success criterion in §6 unmet.
- File-operation permission failure.

## 6. Success Criteria

1. `M7_ORDERS_FULL_MOCKUP_V7.html` exists in `modules/Module 7 - Orders/architecture-brief/`, is self-contained, RTL, opens in browser, shows the V7 layout (Variant A only, no tabs/banner).
2. The 3 archived files exist under `_archive/m7-sketches-v6-prior/` with their original names.
3. `_archive/m7-sketches-v6-prior/README.md` exists and explains the archive.
4. `M7_ORDERS_BRIEF.md` has "Canonical Sketch" line referencing V7.
5. M7 docs (SESSION_CONTEXT/MODULE_MAP/CHANGELOG) updated.
6. DECISIONS_LOG index has entry 18; per-module M7.md has full entry.
7. OPEN_TASKS.md reflects task closure + reorder.
8. `npm run verify:integrity` exit 0.
9. `git status` clean at end (except pre-existing baseline untracked files).
10. All changes pushed to `origin/develop`.

## 7. References

- `M7_CENTER_REDESIGN_V7_VARIANTS.html` — source of the chosen Variant A
- `M7_CENTER_REDESIGN_BRIEF.md` — context for why the redesign happened
- `.claude/skills/opticup-architect/references/decisions/M7.md` — existing M7 decision log

---

*End of brief.*
