# M13_SKETCH_RESKIN — Re-Skin M13 Sketches to Hybrid+Navy

**SPEC version:** v1
**Authored by:** opticup-strategic (Foreman, Full-Auto Pipeline mode)
**Date:** 2026-05-11
**Owning module:** Module 13 — Loyalty Club
**Brief:** `modules/Module 13 - Loyalty Club/architecture-brief/M13_RESKIN_BRIEF.md`
**Activation prompt:** `modules/Module 13 - Loyalty Club/architecture-brief/M13_RESKIN_ACTIVATION_PROMPT.md`

## 1. Goal

Re-skin `M13_SKETCHES.html` (5 loyalty-club sketches) from the legacy Prizma-gold palette (`#c9a555`, `#a88838`, multi-stop gradients) and Apple-gray scaffolding (`#f5f5f7`, `#1d1d1f`, `#86868b`, `#e5e5ea`, `#d2d2d7`, `#fafafc`) to the canonical Hybrid+Navy design system (Navy `#1e3a8a`, solid colors, slate text + borders). One file, in-place overwrite. No business decisions change. Information architecture, sketch count (5), text content, and JS behavior all preserved verbatim.

## 2. Scope

### In (1 file)

- `modules/Module 13 - Loyalty Club/architecture-brief/M13_SKETCHES.html`

### Transformations (normative token swap map from Brief §2)

**Primary tokens (replace_all-safe):**

| From | To | Context |
|---|---|---|
| `#c9a555` | `#1e3a8a` | gold accent → Navy accent |
| `#a88838` | `#1e40af` | gold-deep → Navy accent-hover |
| `#f5f5f7` | `#fafaf7` | Apple page bg → Hybrid warm off-white (also fine as subtle separator) |
| `#1d1d1f` | `#0f172a` | Apple near-black → text-primary |
| `#86868b` | `#475569` | Apple secondary text → text-secondary |
| `#e5e5ea` | `#e2e8f0` | Apple border → border-subtle |
| `#d2d2d7` | `#cbd5e1` | Apple border-strong → border-default |
| `#fafafc` | `#f4f4f5` | subtle surface → bg-surface-alt |
| `#fff8e8` | `#e6f1fb` | gold-light callout bg → accent-soft |
| `#fff3d6` | `#e6f1fb` | gold-mid callout bg → accent-soft (same Navy-tinted callout family) |
| `#e0c97f` | `#1e3a8a` | gold border → Navy accent border |

**Gradients (eliminate — Hybrid is solid-only):**

| From | To | Location |
|---|---|---|
| `linear-gradient(135deg, #c9a555 0%, #a88838 100%)` | `#1e3a8a` solid | tier-hero (line 25) AND welcome-bonus (line 409) — duplicate string, single replace_all handles both |
| `linear-gradient(135deg, #fff8e8 0%, #fff3d6 100%)` | `#e6f1fb` solid | checkout-block (line 75) |
| `linear-gradient(135deg, #c9a555 0%, #1a1a2e 100%)` | `#1e3a8a` solid | storefront hero-img (line 86) — `#1a1a2e` disappears with the gradient |

**Apply order matters:** gradients FIRST (so the gold tokens inside them don't get pre-swapped into a still-gradient form). Then primary tokens via replace_all.

### Out

- No business-decision changes (13 M13 decisions stay locked).
- No new sketches. 5 stay 5.
- No information-architecture changes.
- No file moves or renames.
- No touching M13_HANDOFF.md / M13_LOYALTY_BRIEF.md / M13_LOYALTY_DRAFT.md / M13_DECISIONS_FOR_LOG.md / RESKIN_BRIEF / RESKIN_ACTIVATION_PROMPT.
- Diamond tier pill (`#e8e4ff` / `#5b3fc7`) stays — purple is not gold and not in the swap map. Diamond is a tier accent unrelated to the Prizma-gold palette being eliminated.
- Hebrew tier name "זהב" stays as text (it's a business term in the loyalty model, not a CSS color reference).
- Status colors `#00a854` (green earn) and `#d92c2c` (red redeem) stay — semantic.

## 3. Approach

Direct edits on `M13_SKETCHES.html` in-place. No transformation script needed — the swap list is short and replace_all-safe once gradients are eliminated first. Sequence:

1. Replace the 3 unique gradient strings (one with replace_all, two with specific edits) with their solid Hybrid replacements.
2. Run replace_all for each of the 11 primary token swaps.
3. Verify success criteria.

## 4. Destructive Operations

Declared per Iron Rule 32:
- **File overwrite:** `M13_SKETCHES.html` in place. Rollback via pre-commit git tag `pre-reskin-M13-sketches`.
- **No deletes. No renames. No moves. No schema changes. No force-push. No `main` branch operations.**

Anything outside this list → STOP + escalate per CLAUDE.md §0.5 / Iron Rule 32.

## 5. Stop-on-Deviation Triggers

- Iron Rule 31 (integrity gate) fails at any point — `npm run verify:integrity` non-zero.
- Iron Rule 32: a destructive op beyond §4 needed.
- A re-skinned file fails to render or `<html lang="he" dir="rtl">` lost.
- DOM tag count drifts by > 5% from original.
- Hebrew tier name "זהב" altered or removed.
- Customer/brand/price/placeholder/date text changes (content drift breach).
- Unexpected gold/gradient reference remains after swap (i.e. any of `#c9a555`, `#a88838`, `linear-gradient`).
- Any file other than `M13_SKETCHES.html` modified by the swap pass.

## 6. Rollback Plan

If any stop-trigger fires:
1. `git reset --hard pre-reskin-M13-sketches` restores HEAD.
2. Tag is created BEFORE the swap edits begin — guaranteed clean rollback point.

## 7. Out of Scope (Explicit)

- M13 build work — module is in design phase, no `docs/SESSION_CONTEXT.md` / `MODULE_SPEC.md` / `db-schema.sql` exists or will be created by this SPEC.
- Other M13 architecture-brief files (HANDOFF, BRIEF, DRAFT, DECISIONS_FOR_LOG, RESKIN_BRIEF, RESKIN_ACTIVATION_PROMPT) — out.
- Other modules' files — out.
- Any pre-existing untracked work in the repo (M3 SPECs, M7 architecture brief, M1.5 design briefs, tests/*.accdb, modified TECH_DEBT.md) — out. Do NOT `git add` them.

## 8. Expected Final State

- `M13_SKETCHES.html` opens in a browser, all 5 sketches navigable, RTL retained, Hebrew preserved including "זהב" tier label.
- `grep -E "c9a555|a88838|linear-gradient" M13_SKETCHES.html` returns 0 matches.
- `grep "1e3a8a" M13_SKETCHES.html` returns ≥ 1 match (Navy accent present).
- DOM tag count within ±5% of original (read pre-edit count first; verify post-edit).
- Git tag `pre-reskin-M13-sketches` exists.
- `npm run verify:integrity` exit 0.
- 1 main commit (`feat(m13): reskin architecture-brief sketches to Hybrid+Navy (1 file)`) + 1 retrospective commit (`chore(spec): close M13_SKETCH_RESKIN with retrospective`).
- Working tree clean (modulo the pre-existing untracked files from First Action which are out of scope per §7).
- Both commits pushed to `origin/develop`.
- DECISIONS_LOG entry in `.claude/skills/opticup-architect/references/decisions/M13.md` documenting the re-skin event.

## 9. Commit Plan

**Commit 1 — main reskin** (after edits + grep guards + integrity gate pass + tag exists):

```
feat(m13): reskin architecture-brief sketches to Hybrid+Navy (1 file)

Replaces Prizma-gold palette (#c9a555, #a88838) and all gradients with
Hybrid+Navy solid tokens. Apple-gray scaffolding swept to slate.
Structure-preserving: 5 sketches unchanged, IA unchanged, Hebrew + "זהב"
tier label preserved, JS behavior preserved.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Files staged: `modules/Module 13 - Loyalty Club/architecture-brief/M13_SKETCHES.html` only.

**Commit 2 — retrospective** (after closure protocol writes EXECUTION_REPORT/FINDINGS/FOREMAN_REVIEW + DECISIONS_LOG entry):

```
chore(spec): close M13_SKETCH_RESKIN with retrospective + decisions-log

EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md written under
M13/docs/specs/M13_SKETCH_RESKIN/. DECISIONS_LOG entry added to M13.md
documenting the re-skin event. 2 author + 2 executor skill improvements
proposed for next-pipeline application.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Files staged:
- `modules/Module 13 - Loyalty Club/docs/specs/M13_SKETCH_RESKIN/SPEC.md`
- `modules/Module 13 - Loyalty Club/docs/specs/M13_SKETCH_RESKIN/EXECUTION_REPORT.md`
- `modules/Module 13 - Loyalty Club/docs/specs/M13_SKETCH_RESKIN/FINDINGS.md`
- `modules/Module 13 - Loyalty Club/docs/specs/M13_SKETCH_RESKIN/FOREMAN_REVIEW.md`
- `.claude/skills/opticup-architect/references/decisions/M13.md`

## 10. Success Criteria (Measurable — from Brief §4 + Activation Prompt)

1. `grep -iE "c9a555|a88838|linear-gradient" M13_SKETCHES.html` = 0 matches.
2. `grep "1e3a8a" M13_SKETCHES.html` ≥ 1 match.
3. All 5 sketches navigable via tab nav.
4. Hebrew "זהב" preserved as tier text label (grep `זהב` in file ≥ 1 match in S1 tier-hero or S5 tier section).
5. DOM tag count ±5% of original (target: original = 794 lines, edits should change byte count slightly but tag count stays).
6. RTL retained (`<html lang="he" dir="rtl">` intact).
7. File renders in browser (visual check at session end if possible; minimum: file syntactically valid HTML).
8. Git tag `pre-reskin-M13-sketches` exists.
9. `npm run verify:integrity` exit 0.
10. Working tree clean modulo pre-existing untracked files (per §7).
11. Both commits pushed to `origin/develop`.

## 11. Lessons Already Incorporated

- **Cross-Reference Check** (Foreman protocol Step 1.5): no new DB objects, no new functions, no new file paths, no new T-constants. Only color tokens inside an HTML file. Sweep N/A — zero collision surface.
- Applied from prior M14/M15 re-skins: keep changes structure-preserving; sequence gradients BEFORE token swaps (otherwise the inside-gradient hex gets pre-replaced and gradient survives as `linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)`). This SPEC encodes the order in §3.
- Applied from prior `M1_5_SKETCH_RESKIN_BATCH_3` SPEC: use replace_all where the from-string is globally unambiguous; specific Edit where uniqueness requires it.
- Applied from prior reskins: explicit pre-commit git tag for instant rollback (Brief §5 Destructive Operations envelope).

## 12. Autonomy Envelope

The executor (this same chat in Full-Auto Pipeline mode) may proceed without asking Daniel on any of the following:
- Apply every swap in §2 in the order specified in §3.
- Create the SPEC folder + retro files.
- Create the pre-commit git tag.
- Run grep guards + integrity gate.
- Create both commits, push to develop.
- Write the closure Hebrew status line.

Stop ONLY on the deviation triggers in §5.

---

*End of SPEC.*
