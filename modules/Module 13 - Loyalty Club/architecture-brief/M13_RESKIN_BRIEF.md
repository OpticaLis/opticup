# M13 Loyalty — Sketch Re-Skin to Hybrid+Navy

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 13 — Loyalty Club

---

## 1. Purpose

`M13_SKETCHES.html` was authored 2026-05-10 using the **Prizma-gold palette** (`#c9a555` + gradient `#a88838`) — explicitly contradicting the SaaS-clean rule (default theme must be neutral; Prizma = tenant override). M13 must align with the canonical Hybrid+Navy design system before any production build.

This is a re-skin, not a re-design. All M13 business decisions remain locked (13 decisions logged in DECISIONS_LOG: 5 sketches, 6 entities, 4 engines, tier rules, redemption flow, family balance, etc).

## 2. Scope — In

### Single file targeted
`modules/Module 13 - Loyalty Club/architecture-brief/M13_SKETCHES.html`

### Transformations

1. **Replace ALL Prizma-gold tokens** with Hybrid+Navy:
   - `#c9a555` (gold) → `#1e3a8a` (Navy `--accent`)
   - `#a88838` (gold-deep) → `#1e40af` (Navy `--accent-hover`)
   - `linear-gradient(135deg, #c9a555 0%, #a88838 100%)` → `#1e3a8a` solid (NO gradients in Hybrid)
   - `#f5f5f7` (Apple-gray bg) → `#fafaf7` (Hybrid warm off-white)
   - `#1d1d1f` (Apple-near-black) → `#0f172a` (Hybrid `--text-primary`)
   - `#86868b` (Apple-secondary) → `#475569` (Hybrid `--text-secondary`)
   - `#e5e5ea` (Apple-border) → `#e2e8f0` (Hybrid `--border-subtle`)
   - `#d2d2d7` (Apple-border-strong) → `#cbd5e1` (Hybrid `--border-default`)
   - `#fafafc` (subtle bg) → `#f4f4f5` (Hybrid `--bg-surface-alt`)
   - `#f5f5f7` (callout bg) → `#e6f1fb` (Hybrid `--accent-soft`) where used as Navy-tinted callout, OR `#f4f4f5` where used as neutral surface

2. **Eliminate all gradients.** Replace every `linear-gradient(...)` with the closest solid Hybrid token:
   - `linear-gradient(...gold...)` → `#1e3a8a` (Navy accent solid)
   - Any other gradient → solid color from the same family

3. **Tier hero block** (currently gold gradient with white text) → Navy solid background with white text. Same structural treatment, different color.

4. **Active tab indicator** (`#c9a555` underline) → `#1e3a8a` underline.

5. **Font:** keep Rubik (already in line with Hybrid sans-only rule). No serif anywhere.

6. **Preserve verbatim:**
   - All HTML structure (5 sketches, navigation, tabs, blocks, hierarchy)
   - All text content (Hebrew labels, descriptions, tier names like "פלטינום", "זהב")
   - **NOTE on "זהב" tier label:** the WORD "זהב" stays — it's the tier name in the loyalty business model, not a design color. Only the visual treatment of that tier card changes from gold-gradient to Navy.
   - All JS behavior (sketch switching, tab switching)
   - All placeholder data (customer names, point counts, prices, dates)

### Out

- No business-logic changes. The 13 M13 decisions remain locked.
- No new sketches. 5 sketches stay 5.
- No information architecture changes.
- No file moves or renames. File stays at current path.

## 3. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Re-skin only — no business or IA changes | Architect 2026-05-11 |
| 2 | Gold tier label "זהב" is a business term, not a color — preserve as text | Architect 2026-05-11 |
| 3 | All gradients → solid Hybrid tokens | Architect 2026-05-11 |
| 4 | File overwrite in place (no rename, no archive — git history is rollback) | Architect 2026-05-11 |
| 5 | Pre-commit git tag for rollback: `pre-reskin-M13-sketches` | Architect 2026-05-11 |
| 6 | Continuous-Run Mandate — single chat, no human gates | Daniel 2026-05-11 |

## 4. Quality Bar — Acceptance Criteria

1. `grep -i "c9a555\|a88838\|linear-gradient" modules/Module\ 13\ -\ Loyalty\ Club/architecture-brief/M13_SKETCHES.html` returns 0 matches.
2. `grep "1e3a8a" modules/Module\ 13\ -\ Loyalty\ Club/architecture-brief/M13_SKETCHES.html` returns ≥1 match (Navy is present).
3. DOM tag count within ±5% of original (structure preservation).
4. All 5 sketches still navigable via the tab nav.
5. All Hebrew content preserved including the word "זהב" as a tier label (it's text content, not a CSS color).
6. RTL Hebrew throughout (`<html lang="he" dir="rtl">` retained).
7. File self-contained, opens in browser, no broken assets.
8. Pre-commit git tag `pre-reskin-M13-sketches` created BEFORE the re-skin commit.
9. `npm run verify:integrity` exit 0.
10. Working tree clean at end.
11. All changes pushed to `origin/develop`.

## 5. Destructive Operations

Declared:
- **File overwrite:** `M13_SKETCHES.html` (with pre-commit git tag for rollback).
- No file deletes. No renames. No schema changes. No force-push.

## 6. Continuous-Run Mandate

Run end-to-end in ONE Claude Code chat. Stop only on:
- Iron Rule 31/32 violation
- A success criterion that cannot be met
- Re-skinned file no longer renders
- Unexpected gold/gradient references outside the swap map

## 7. Anti-Patterns

- DO NOT alter business decisions (tier thresholds, point rules, redemption flow).
- DO NOT add or remove sketches. 5 sketches stay 5.
- DO NOT change information architecture.
- DO NOT touch any other M13 file (HANDOFF, BRIEF, DECISIONS_FOR_LOG, DRAFT — out of scope).
- DO NOT preserve gradients "for visual interest." Hybrid is solid-color only.

## 8. References

- `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/_tokens.css` — token source
- `.claude/skills/opticup-architect/references/decisions/M13.md` — locked business decisions (do not change)
- `modules/Module 13 - Loyalty Club/architecture-brief/M13_LOYALTY_BRIEF.md` — module business context

---

*End of brief.*
