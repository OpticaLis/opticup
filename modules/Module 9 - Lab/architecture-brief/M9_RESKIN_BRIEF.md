# M9 Lab — Sketch Re-Skin to Hybrid+Navy

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 9 — Lab/KDS

---

## 1. Purpose

M9 has 5 architecture-brief sketches (KDS, Shipments, Dashboard, Settings, Compensation) authored 2026-05-10, all using legacy palette references (purple-deep / Prizma-gold / gradients — 57 hits across the 5 files). They need re-skin to Hybrid+Navy to align with the canonical design system.

This is re-skin only — no business changes. M9's 25 locked decisions (entities, engines, sketch C v2, two-clock thresholds, compensation matrix, etc.) remain locked.

## 2. Scope — In

### Files (5)

| File | Lines | Legacy hits |
|---|---|---|
| `M9_SKETCHES.html` | 430 | 11 |
| `M9_SHIPMENTS_SKETCHES.html` | 301 | 9 |
| `M9_DASHBOARD_SKETCHES.html` | 373 | 24 |
| `M9_SETTINGS_SKETCHES.html` | 238 | 5 |
| `M9_COMPENSATION_SKETCHES.html` | 423 | 8 |

All under `modules/Module 9 - Lab/architecture-brief/`.

### Token swap map (same as Batch 3 + M13)

| Legacy | Hybrid+Navy |
|---|---|
| `#534AB7` / `--purple` | `#1e3a8a` / `--accent` |
| `#EEEDFE` / `--purple-soft` | `#e6f1fb` / `--accent-soft` |
| `#26215C` / `--purple-deep` (text) | `#0f172a` / `--text-primary` |
| `#26215C` / `--purple-deep` (bg) | `#1e3a8a` / `--accent` with white text |
| `#7F77DD` / `--purple-mid` | `#1e40af` / `--accent-hover` |
| `#c9a555` / Prizma-gold | `#1e3a8a` / `--accent` |
| `#a88838` / gold-deep | `#1e40af` / `--accent-hover` |
| Any `linear-gradient(...)` | Solid Hybrid token |
| `#FAFAF7` / `--bg` | `#fafaf7` / `--bg-page` (same hex, rename) |
| `#FFFFFF` / `--surface` | `#ffffff` / `--bg-surface` |
| `#F1EFE8` / `--soft` | `#f4f4f5` / `--bg-surface-alt` |
| `#1F1F1E` / `--text` | `#0f172a` / `--text-primary` |
| `#5F5E5A` / `--text-2` | `#475569` / `--text-secondary` |
| Decorative multi-color accents (NOT semantic) | `--text-secondary` or `--accent-soft` |
| Semantic colors (success/warning/danger/info) | KEEP — map to Hybrid semantic tokens |

### Preserve verbatim

- All HTML structure (DOM tree)
- All text content including Hebrew labels
- All placeholder data (order IDs, threshold values, compensation amounts)
- All JS behavior (sketch navigation, tab switching, accordion toggles)
- All grid/flex layout, padding/margin/border-radius
- All component patterns

### Out of scope

- M9 business decisions — locked, no changes
- New sketches — 5 stay 5
- Information architecture — unchanged
- Other M9 files (M9_LAB_BRIEF.md) — out of scope
- File moves or renames — files stay in place

## 3. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Re-skin only, no business or IA changes | Architect 2026-05-11 |
| 2 | All gradients → solid Hybrid tokens | Inherited from M13 re-skin pattern |
| 3 | 5 files overwritten in place with per-file git tags | Architect 2026-05-11 |
| 4 | Pre-commit git tags: `pre-reskin-M9-{stem}` per file (5 tags) | Architect 2026-05-11 |
| 5 | Continuous-Run Mandate | Daniel 2026-05-11 |

## 4. Quality Bar — Acceptance Criteria

1. `grep -i "26215c\|534ab7\|c9a555\|a88838\|linear-gradient" modules/Module\ 9\ -\ Lab/architecture-brief/*.html` returns 0 matches.
2. `grep "1e3a8a" modules/Module\ 9\ -\ Lab/architecture-brief/*.html` returns ≥1 match per file (5+ total).
3. DOM tag count within ±5% of original per file.
4. RTL retained.
5. Each file renders standalone in browser.
6. Hebrew content + placeholder data preserved verbatim.
7. 5 pre-reskin git tags created (one per file).
8. `npm run verify:integrity` exit 0.
9. Working tree clean at end.
10. All commits pushed to `origin/develop`.

## 5. Destructive Operations

Declared:
- **5 in-place file overwrites** with pre-commit git tags for per-file rollback.
- NO file deletes. NO renames. NO schema changes. NO force-push.

## 6. Continuous-Run Mandate

Run in ONE Claude Code chat. Stop only on Iron Rule violation, success criterion that can't be met, or file no longer rendering post-swap.

## 7. Anti-Patterns

- DO NOT alter business decisions or IA
- DO NOT add or remove sketches (5 stays 5)
- DO NOT touch M9_LAB_BRIEF.md
- DO NOT preserve any gradient
- DO NOT touch files in any other module

## 8. References

- `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/_tokens.css` — token source
- `.claude/skills/opticup-architect/references/decisions/M9.md` — locked business decisions
- Batch 3 pattern reference: `modules/Module 1.5 - Shared Components/architecture-brief/SKETCH_REVISION_BATCH_3_BRIEF.md`

---

*End of brief.*
