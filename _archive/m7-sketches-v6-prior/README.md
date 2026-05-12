# `_archive/m7-sketches-v6-prior/` — M7 Pre-V7 Sketch Vault

> **Archived on:** 2026-05-11
> **Reason:** V7 = Variant A locked as the canonical M7 sketch. Predecessor and sibling explorations preserved here for decision-history and future-reference.
> **Authorizing brief:** [`modules/Module 7 - Orders/architecture-brief/M7_CLOSURE_BRIEF.md`](../../modules/Module%207%20-%20Orders/architecture-brief/M7_CLOSURE_BRIEF.md) (v1, 2026-05-11)
> **Authorizing SPEC:** [`modules/Module 7 - Orders/docs/specs/M7_CLOSURE_V7_VARIANT_A/SPEC.md`](../../modules/Module%207%20-%20Orders/docs/specs/M7_CLOSURE_V7_VARIANT_A/SPEC.md)
> **Full reasoning:** [`.claude/skills/opticup-architect/references/decisions/M7.md`](../../.claude/skills/opticup-architect/references/decisions/M7.md), entry 2026-05-11.

---

## What's the active sketch?

The single canonical M7 mockup lives here, not in this vault:

→ [`modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html`](../../modules/Module%207%20-%20Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html) — **Variant A: two-pane work surface + sticky tools strip**, selected by Daniel 2026-05-11.

---

## What's archived here

| File | Origin | Why archived | Why kept |
|---|---|---|---|
| `M7_ORDERS_FULL_MOCKUP_V6.html` | 2026-05-07 baseline mockup that sealed the M7 Architecture Brief. 3-column layout, 9 data regions stacked in the center column. | Superseded by V7 — Daniel rejected v6's center-column stack/clicks problem on 2026-05-11. | Historical baseline; Brief sealed text references v6 line counts and region inventory. Useful when grading whether V7 preserved all v6 regions (it did — by definition; Variant A was the only variant that kept all 9 visible simultaneously). |
| `M7_CENTER_REDESIGN_V7_VARIANTS.html` | 2026-05-11 morning — three layout candidates (A / B / C) in one file with reco-banner and sticky tab nav. Source of Variant A. | Daniel selected Variant A; B (accordion) and C (T-layout) hidden 5 of 6 and 4 of 5 regions respectively. The 3-variants comparison file served its purpose (decision aid) and is no longer the canonical sketch. | Decision history — shows the alternatives considered, the architect's recommendation rationale embedded in the reco-banner, and the comparison legend at file end. |
| `M7_ORDERS_CENTER_COLUMN_VARIANTS.html` | Earlier (rejected) center-column attempt: "Tabs / Scan-first / Staged" 3-variant exploration. | Daniel rejected this round; led to the V7 redesign brief and re-attempt. | Prior failed exploration; documents what didn't work and why subsequent rounds reframed the problem. |

---

## How to read this archive

1. Want the active canonical? → see "What's the active sketch?" above.
2. Want to see what changed from v6 to v7? → diff `M7_ORDERS_FULL_MOCKUP_V6.html` (here) against `M7_ORDERS_FULL_MOCKUP_V7.html` (in `architecture-brief/`). Variant A keeps all 9 v6 regions but reorganizes them into a two-pane horizontal layout with a sticky tools strip; v6 used a vertical center-column stack.
3. Want to see B and C alternatives? → open `M7_CENTER_REDESIGN_V7_VARIANTS.html` and click the B / C tabs in its sticky nav.
4. Want the full decision reasoning? → `decisions/M7.md` entry dated 2026-05-11.

---

## Git history preservation

All three files were moved via `git mv`. Use `git log --follow --oneline <archived_path>` to trace the history back to the original commits in `architecture-brief/`:

- `M7_ORDERS_FULL_MOCKUP_V6.html` — origin commits land in `modules/Module 7 - Orders/architecture-brief/` pre-2026-05-11.
- `M7_CENTER_REDESIGN_V7_VARIANTS.html` — single commit (`646b8d2`, 2026-05-11) authored the file.
- `M7_ORDERS_CENTER_COLUMN_VARIANTS.html` — earlier round, pre-2026-05-11.

---

## Restoration (if ever needed)

These files are git-tracked and can be restored to their original locations via:
```
git mv "_archive/m7-sketches-v6-prior/<filename>" "modules/Module 7 - Orders/architecture-brief/<filename>"
```
Restoration would also require updating `M7_ORDERS_BRIEF.md`'s "Canonical Sketch" line, `SESSION_CONTEXT.md`, `MODULE_MAP.md`, and `CHANGELOG.md` to reflect whichever sketch is active. Do NOT restore casually — if v6 (or B / C) ever becomes active again, write a new SPEC documenting why and update all references.

---

*This vault sits inside the project's single `_archive/` per CLAUDE.md §0.5 (Root Discipline Rule). Listed in `_archive/README.md`.*
