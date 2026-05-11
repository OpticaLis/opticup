# M9_SKETCH_RESKIN — Re-Skin M9 Lab Sketches to Hybrid+Navy

**SPEC version:** v1
**Authored by:** opticup-strategic (Foreman, Full-Auto Pipeline mode)
**Date:** 2026-05-11
**Owning module:** Module 9 — Lab/KDS
**Brief:** `modules/Module 9 - Lab/architecture-brief/M9_RESKIN_BRIEF.md`
**Activation prompt:** `modules/Module 9 - Lab/architecture-brief/M9_RESKIN_ACTIVATION_PROMPT.md`

## 1. Goal

Re-skin 5 M9 architecture-brief sketches (KDS, Shipments, Dashboard, Settings, Compensation) from legacy Prizma-gold palette + Apple-gray scaffolding to canonical Hybrid+Navy (`#1e3a8a` Navy + slate text/borders + Hybrid bg tokens). In-place overwrites only. No business or IA changes. M9's 25 locked decisions remain locked.

## 2. Scope

### In (5 files, all under `modules/Module 9 - Lab/architecture-brief/`)

| # | File | Lines | Tags (baseline) |
|---|---|---|---|
| 1 | `M9_SKETCHES.html` | 430 | 736 |
| 2 | `M9_SHIPMENTS_SKETCHES.html` | 301 | 307 |
| 3 | `M9_DASHBOARD_SKETCHES.html` | 373 | 792 |
| 4 | `M9_SETTINGS_SKETCHES.html` | 238 | 406 |
| 5 | `M9_COMPENSATION_SKETCHES.html` | 423 | 762 |

### Normative Token Swap Map (per Brief §2 + Foreman color inventory)

Applied as `replace_all` per Edit calls. **Apply gradients FIRST, then primary tokens** (M13 lesson — otherwise mid-gradient hex gets pre-swapped and a Navy-tinted gradient survives, violating Hybrid solid-only).

**Gradients to eliminate (1 unique string, 4 files):**

| From | To | Files |
|---|---|---|
| `linear-gradient(135deg, #fff8e8 0%, #fff3d6 100%)` | `#e6f1fb` | M9_SKETCHES (L83), M9_DASHBOARD (L19), M9_SETTINGS (L16), M9_COMPENSATION (L19) |

(M9_SHIPMENTS has zero gradients.)

**Primary token swaps (replace_all-safe):**

| From | To | Context |
|---|---|---|
| `#c9a555` | `#1e3a8a` | Prizma-gold accent → Navy accent |
| `#e0c97f` | `#1e3a8a` | gold border → Navy accent border |
| `#fff8e8` | `#e6f1fb` | gold-light callout bg → accent-soft |
| `#fff3d6` | `#e6f1fb` | gold-mid callout bg → accent-soft |
| `#1d1d1f` | `#0f172a` | Apple near-black → text-primary |
| `#86868b` | `#475569` | Apple secondary text → text-secondary |
| `#e5e5ea` | `#e2e8f0` | Apple border-subtle → slate border-subtle |
| `#d2d2d7` | `#cbd5e1` | Apple border-default → slate border-default |
| `#f5f5f7` | `#fafaf7` | Apple page bg → Hybrid warm off-white |
| `#fafafc` | `#f4f4f5` | subtle surface → bg-surface-alt |

(Brief's `#a88838`, `#534AB7`, `#26215C`, `#7F77DD`, `#EEEDFE` are NOT present in any M9 file per pre-flight color inventory — no-op rows omitted.)

### Color Inventory — Foreman Reconciliation (M13 lesson 2 applied)

Every unique hex across all 5 files audited and bucketed:

- **A. SWAP** (11 entries above) — covers all Prizma-gold + Apple-gray scaffolding actually present.
- **B. PRESERVE — semantic** (success greens, danger reds, warning yellows/oranges, info blues, diamond purples): `#2d5a1a`, `#2d8050`, `#639922`, `#b8d8a0`, `#c8e9b8`, `#fafff7`, `#fffdf7`, `#791f1f`, `#a32d2d`, `#c93535`, `#d92c2c`, `#f0a4a4`, `#fde7e7`, `#fde9ec`, `#fffafa`, `#ffe7e7`, `#f7d5e3`, `#ffd6cc`, `#6b4400`, `#855011`, `#ba7517`, `#6b3a00`, `#ffd476`, `#ffd700`, `#fff200`, `#fff8c4`, `#fffbf0`, `#fffafa`, `#fffdf7`, `#ffe2c4`, `#185fa5`, `#0c447c`, `#1f3a72`, `#a3cae8`, `#c4e7ff`, `#e7f3ff`, `#5b1d7a`, `#5b3fc7`, `#d8e4ff`, `#e8e4ff`, `#f0d4ff`, `#1a1a2e` (game-banner dark Navy decorative — already Hybrid-aligned).
- **C. PRESERVE — generic scaffolding grays** (not in legacy gold palette, used as body text/shadow/dividers): `#333`, `#404040`, `#444`, `#555`, `#666`, `#888`, `#aaa`, `#b8b8b8`, `#c7c7cc`, `#c8c8c8`, `#d8d8d8`, `#e8e8e8`, `#fafafa`, `#fff`.

Every unique hex ends up in exactly one bucket. No "implicit extension" gaps to discover mid-execution.

### Out

- No business-decision changes (25 M9 decisions stay locked per `.claude/skills/opticup-architect/references/decisions/M9.md`).
- No new sketches. 5 stay 5.
- No information-architecture changes.
- No file moves or renames.
- No touching `M9_LAB_BRIEF.md`, `M9_RESKIN_BRIEF.md`, `M9_RESKIN_ACTIVATION_PROMPT.md`.
- No touching any file in any other module.
- No pre-existing untracked files from First Action (M3/M7/M1.5/M13 sketches/specs, TECH_DEBT.md mod, tests/*.accdb) staged.

## 3. Approach

Per-file ordering for each of the 5 files:

1. Create pre-commit git tag `pre-reskin-M9-{stem}` BEFORE first edit (5 tags total at current HEAD).
2. Replace the gradient string (where present — 4 of 5 files) via `Edit` `replace_all`.
3. Apply 10 primary token swaps via `Edit` `replace_all` per swap, per file.
4. Spot-check: `grep -i "c9a555\|26215c\|534ab7\|a88838\|e0c97f\|fff8e8\|fff3d6\|1d1d1f\|86868b\|e5e5ea\|d2d2d7\|f5f5f7\|fafafc\|linear-gradient" {file}` = 0 hits.

Across-file final sweep:

5. `grep -i "26215c\|534ab7\|c9a555\|a88838\|linear-gradient" *.html` = 0 (Brief §4 criterion 1).
6. `grep -c "1e3a8a" *.html` each ≥ 1 (Brief §4 criterion 2).
7. DOM tag count per file within ±5% of baseline in §2.
8. `npm run verify:integrity` exit 0.
9. Commit + push.

## 4. Destructive Operations

Declared per Iron Rule 32:

- **5 in-place file overwrites** (the 5 sketch HTMLs listed in §2). Each guarded by a per-file pre-commit git tag (`pre-reskin-M9-M9_SKETCHES`, `pre-reskin-M9-M9_SHIPMENTS_SKETCHES`, `pre-reskin-M9-M9_DASHBOARD_SKETCHES`, `pre-reskin-M9-M9_SETTINGS_SKETCHES`, `pre-reskin-M9-M9_COMPENSATION_SKETCHES`) for granular rollback.
- **NO file deletes. NO renames. NO moves. NO schema changes. NO force-push. NO `main` branch operations.**

Anything outside this envelope → STOP + escalate per CLAUDE.md §0.5 / Iron Rule 32.

## 5. Stop-on-Deviation Triggers

- Iron Rule 31 (integrity gate) fails — `npm run verify:integrity` non-zero.
- Iron Rule 32 — a destructive op beyond §4 needed.
- Re-skinned file fails to render or `<html lang="he" dir="rtl">` lost.
- DOM tag count drifts > 5% from baseline for any file.
- Hebrew content altered or removed (placeholder data is also content; preserve verbatim).
- An unexpected legacy hit remains after swap (any of `#c9a555`, `#a88838`, `#26215C`, `#534AB7`, `linear-gradient`).
- Any file outside §2 In-list modified by the swap pass.

## 6. Rollback Plan

If any stop-trigger fires mid-execution:

- Per-file: `git checkout pre-reskin-M9-{stem} -- modules/Module\ 9\ -\ Lab/architecture-brief/{file}` restores just that file from its pre-edit tag.
- Whole-batch: `git reset --hard <SPEC-start-HEAD>` reverts all 5. The pre-commit tags persist even after a hard reset (tags are independent of HEAD).

Tags are created BEFORE any edits begin — guaranteed clean rollback points.

## 7. Out of Scope (Explicit)

- M9 build work — module is in design phase, no `docs/SESSION_CONTEXT.md` / `MODULE_SPEC.md` / `db-schema.sql` exists. This SPEC does NOT create them.
- M9 module-level docs (`MODULE_MAP.md`, `CHANGELOG.md`) — do not exist, do not create.
- Other M9 architecture-brief files (`M9_LAB_BRIEF.md`, `M9_RESKIN_*`) — out.
- Other modules' files — out.
- Pre-existing untracked work (M3 SPECs, M7 architecture-brief, M1.5 design briefs, M13 architecture-brief, `tests/*.accdb`, modified `TECH_DEBT.md`) — out. Do NOT `git add` them.

## 8. Expected Final State

- All 5 files re-skinned in place.
- `grep -iE "c9a555|a88838|26215c|534ab7|linear-gradient" modules/Module\ 9\ -\ Lab/architecture-brief/*.html` returns 0.
- `grep "1e3a8a" {each file}` ≥ 1 (each file has Navy).
- DOM tag count per file within ±5% of baseline (§2 table).
- RTL retained on all 5 (`<html lang="he" dir="rtl">` intact).
- Hebrew content + placeholder data unchanged.
- 5 git tags `pre-reskin-M9-{stem}` exist.
- `npm run verify:integrity` exit 0.
- 1 main commit (`feat(m9): reskin architecture-brief sketches to Hybrid+Navy (5 files)`) + 1 retrospective commit (`chore(spec): close M9_SKETCH_RESKIN with retrospective + skill improvements`).
- Working tree clean modulo pre-existing untracked files (per §7).
- Both commits pushed to `origin/develop`.

## 9. Commit Plan

**Commit 1 — main reskin** (after edits + grep guards + integrity gate pass + 5 tags exist):

```
feat(m9): reskin architecture-brief sketches to Hybrid+Navy (5 files)

Replaces Prizma-gold palette (#c9a555, #e0c97f, #fff8e8, #fff3d6) and
Apple-gray scaffolding (#1d1d1f, #86868b, #e5e5ea, #d2d2d7, #f5f5f7,
#fafafc) with Hybrid+Navy solid tokens and slate text/borders. All
gradients eliminated. Structure-preserving: 5 sketches unchanged, IA
unchanged, RTL + Hebrew + placeholder data preserved, JS behavior
unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Files staged (explicit by name — NEVER `git add -A`):
- `modules/Module 9 - Lab/architecture-brief/M9_SKETCHES.html`
- `modules/Module 9 - Lab/architecture-brief/M9_SHIPMENTS_SKETCHES.html`
- `modules/Module 9 - Lab/architecture-brief/M9_DASHBOARD_SKETCHES.html`
- `modules/Module 9 - Lab/architecture-brief/M9_SETTINGS_SKETCHES.html`
- `modules/Module 9 - Lab/architecture-brief/M9_COMPENSATION_SKETCHES.html`

**Commit 2 — retrospective** (after closure protocol writes EXECUTION_REPORT/FINDINGS/FOREMAN_REVIEW):

```
chore(spec): close M9_SKETCH_RESKIN with retrospective + skill improvements

EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md written under
M9/docs/specs/M9_SKETCH_RESKIN/. 2 author + 2 executor skill improvement
proposals harvested for next-pipeline application.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Files staged:
- `modules/Module 9 - Lab/docs/specs/M9_SKETCH_RESKIN/SPEC.md`
- `modules/Module 9 - Lab/docs/specs/M9_SKETCH_RESKIN/EXECUTION_REPORT.md`
- `modules/Module 9 - Lab/docs/specs/M9_SKETCH_RESKIN/FINDINGS.md`
- `modules/Module 9 - Lab/docs/specs/M9_SKETCH_RESKIN/FOREMAN_REVIEW.md`

## 10. Success Criteria (Measurable — from Brief §4)

1. `grep -iE "c9a555|a88838|26215c|534ab7|linear-gradient" modules/Module\ 9\ -\ Lab/architecture-brief/*.html` returns 0.
2. `grep -c "1e3a8a" {each of 5 files}` ≥ 1.
3. DOM tag count per file within ±5% of baseline (§2 table).
4. `<html lang="he" dir="rtl">` intact in all 5 (verified pre-edit, re-verified post-edit).
5. Hebrew content + placeholder data preserved verbatim (spot-checked via diff sample).
6. 5 git tags `pre-reskin-M9-{stem}` exist (`git tag --list 'pre-reskin-M9-*'` returns 5 lines).
7. `npm run verify:integrity` exit 0.
8. Working tree clean (modulo §7).
9. Both commits pushed to `origin/develop`.

## 11. Lessons Already Incorporated

- **Cross-Reference Check (Step 1.5):** no new DB objects, no new functions, no new file paths, no new T-constants, no new config keys. Only color tokens inside HTML files + SPEC folder creation. Sweep N/A — zero collision surface beyond the SPEC folder name itself, which was checked against `modules/Module 9 - Lab/docs/specs/` (empty before — no collision).
- **Color Inventory (Step 1.6 — applied from M13 FOREMAN_REVIEW Author Improvement #2):** ran `grep -oiE "#[0-9a-f]{3,6}\b"` per file pre-SPEC; reconciled every unique hex into Bucket A (swap), B (semantic preserve), or C (generic scaffolding preserve) in §2. Zero implicit gaps.
- **Preserve-Target Verification (applied from M13 FOREMAN_REVIEW Author Improvement #1):** Brief did not name specific Hebrew strings to preserve beyond "Hebrew content + placeholder data" generally — no string-specific success criterion that risks being moot. RTL verified pre-edit (all 5 files have `<html lang="he" dir="rtl">` at L2).
- **Gradient ordering (M13 SPEC §3):** gradients FIRST, primary tokens SECOND. Encoded in §3 and §10.
- **Per-file pre-commit tags (M13 Brief pattern, extended to 5 files):** each file independently rollback-able.
- **Explicit-name `git add` only:** never `git add -A` / `git add .` — Iron Rule from CLAUDE.md §9 + Out-of-Scope §7 protects pre-existing untracked work.

## 12. Autonomy Envelope

The executor (this same chat in Full-Auto Pipeline mode) may proceed without asking Daniel on:

- Apply every swap in §2 in the order specified in §3.
- Create the SPEC folder + retro files.
- Create the 5 pre-commit git tags.
- Run grep guards + integrity gate + DOM tag-count diff.
- Create both commits (main reskin + retro), push to `develop`.
- Write the closure Hebrew status line.

Stop ONLY on the deviation triggers in §5.

---

*End of SPEC.*
