# SPEC — VISUAL_FIDELITY_GATE — Blocking visual gate + M5 fidelity fix

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/VISUAL_FIDELITY_GATE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-23
> **Module:** 1.5 — Shared Components (infrastructure SPEC) + Module 5 application
> **Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/VISUAL_FIDELITY_GATE_BRIEF.md`
> **Trigger:** M5 customer card shipped 🟢 in Phase D + CLOSURE_SPEC but rendered with empty CSS variables because shared/css/variables.css doesn't define the mockup's Hybrid+Navy token names (`--bg-page`, `--accent`, etc. — it uses `--color-primary`, `--color-success` etc.). All var(--*) resolved to "" → card looked unstyled. The Chrome MCP closure evidence we attached was a paperwork PASS, not a real one. **Second strike** (first was M1 lens). Daniel directive: visual fidelity must be a BLOCKING gate.
> **No Prizma writes. No schema change. No merge to main. Demo only.**

---

## 0. Pre-Authoring Reality Check

### Probes (pinned at SPEC seal)

**Probe 1 — `customers.html` actually links `css/customers.css`:** confirmed via grep — line 29 `<link rel="stylesheet" href="css/customers.css">`. The Brief's "never linked the stylesheet" premise is wrong in current state — the link IS present. But the EFFECT was the same.

**Probe 2 — Hybrid+Navy variables empty at `:root`:**
- `getComputedStyle(document.documentElement).getPropertyValue('--bg-page')` returns `""` (empty).
- Same for `--bg-surface`, `--accent`, `--border-subtle`, `--text-primary`, etc.
- `getComputedStyle(card).backgroundColor` returns `rgba(0,0,0,0)` (transparent) because `var(--bg-surface)` has no value.

**Probe 3 — `shared/css/variables.css` token naming:**
- Production variables file uses `--color-primary`, `--color-primary-hover`, `--color-success`, `--color-error`, `--color-warning`, etc.
- Mockup `M5_CUSTOMER_CARD_MOCKUP.html` uses `--bg-page`, `--bg-surface`, `--accent`, `--border-subtle`, `--text-primary`, etc.
- **The two token naming systems don't intersect.** My `css/customers.css` (Phase D) was authored against the mockup names but never declared them anywhere — so they all resolved to empty.

**Root cause:** when I wrote `css/customers.css` in Phase D I copied the mockup's `var(--*)` references but FORGOT to also copy the mockup's `:root { --bg-page: …; … }` declaration block. The mockup is self-contained (declares its own tokens); my CSS file was not. This is the M5-specific bug.

**The Brief's claim was directionally correct, mechanically wrong** — the user (Architect) experienced "card looks unstyled", which is true. The mechanism is variable-scope, not link-missing. Either way the Visual-Fidelity Gate would have caught it.

### Lessons applied

- **CLOSURE_SPEC P-AUTHOR-3** (screenshot retry/quality fallback) — applies here: JPEG q=60/70 with retry.
- **Memory `feedback_no_polish_by_validation`** — central to this SPEC. Embed real screenshots + comparison tables; no "fidelity PASS" without them.
- **Memory `feedback_vfv_must_use_not_just_inspect`** — the gate must USE the surface (open it, screenshot it, compare it) not just inspect the file.

### Cross-Reference Check (Step 1.5)

New names introduced by this SPEC:
- "Visual-Fidelity Gate" — new role/protocol name; 0 grep hits prior to this SPEC ✓
- No new tables, RPCs, views, functions, T-constants, files (only skill + governance edits + a few JPEGs + retros).

---

## 1. Goal

Two outcomes in one SPEC:
1. **Part A (durable):** make visual fidelity vs the mockup a HARD, BLOCKING gate owned by `opticup-localhost-tester` — wired into Iron Rule 34 + the Foreman closure checklist + the Reviewer audit. A UI SPEC cannot close 🟢 without an embedded live screenshot + a region-by-region mockup-vs-live comparison table that the Reviewer + Foreman + Architect have actually inspected.
2. **Part B (immediate):** apply the upgraded gate to M5 card + list — fix every fidelity gap that surfaces (starting with the CSS-variable-scope bug already found), re-screenshot, embed comparison tables in TEST_REPORT + FOREMAN_REVIEW, prove 1:1 (or document each remaining gap explicitly).

---

## 2. Background & Motivation

Phase D closed 🟢 (incl. CLOSURE_SPEC). Phase E closed 🟢. Both attached "Chrome MCP fidelity PASS" evidence — screenshots saved + a11y snapshots captured + DB traces logged. But the screenshots were taken AS IS, and "AS IS" was a card rendering with empty CSS variables — looking visually nothing like the mockup. The Architect spotted this from a separate review; Daniel agreed; this SPEC closes the gap structurally.

Second strike in a row (M1 lens screen had a similar story earlier — paperwork-PASS without genuine mockup match). The team needs an enforcement mechanism, not a discipline reminder.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | SPEC folder files | SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + REVIEW.md + FOREMAN_REVIEW.md | `ls` |
| 2 | `opticup-localhost-tester` SKILL.md edited | New "Visual-Fidelity Gate (MANDATORY BLOCKING)" section appended | grep |
| 3 | `CLAUDE.md` Iron Rule 34 edited | Closure language tightened to require "Localhost-Tester Visual-Fidelity Gate PASS with embedded screenshot + mockup-vs-live table" | grep |
| 4 | `opticup-strategic` SKILL.md edited | Foreman closure checklist references the gate | grep |
| 5 | `opticup-reviewer` SKILL.md edited | Reviewer audit references the gate | grep |
| 6 | M5 card CSS variable bug fixed | `.cust-page` scope declares Hybrid+Navy tokens; computed styles resolve (card bg white, header bg Navy, active tab Navy-soft) | Chrome MCP `getComputedStyle` |
| 7 | M5 card mockup-vs-live comparison | Region-by-region table embedded in TEST_REPORT.md with live screenshot + mockup screenshot referenced | grep |
| 8 | M5 list mockup-vs-live comparison | Same | grep |
| 9 | Card fidelity verdict | 1:1 OR documented gaps each marked as: (a) schema-blocked / (b) feature-blocked / (c) fix-applied-in-this-SPEC | TEST_REPORT.md |
| 10 | List fidelity verdict | Same | TEST_REPORT.md |
| 11 | Integrity gate | exit 0 or 2 at every commit | `npm run verify:integrity` |
| 12 | Destructive Ops | declared additive only (skill+governance edits + 1-block addition to css/customers.css) | hook |
| 13 | No `-a` / `add .` | git history shows explicit-filename adds only | `git log --raw` |
| 14 | No Prizma writes / no schema change / no merge to main | confirmed by SQL probe + no `apply_migration` calls | verify |
| 15 | M5 SESSION_CONTEXT + CHANGELOG updated | new fidelity-gate note added; M5 status note about the variable-scope fix | grep |

---

## 4. Autonomy Envelope

### Executor CAN
- Edit `.claude/skills/opticup-localhost-tester/SKILL.md` (append-style — new section).
- Edit `.claude/skills/opticup-strategic/SKILL.md` (append a Foreman-closure-checklist note referencing the gate).
- Edit `.claude/skills/opticup-reviewer/SKILL.md` (append a Reviewer-audit note).
- Edit `CLAUDE.md` §Iron Rule 34 (tighten closure language; append-style).
- Edit `css/customers.css` (add the Hybrid+Navy token declaration block to `.cust-page` scope).
- Take Chrome MCP screenshots of M5 card + list against the mockup files.
- Build the mockup-vs-live comparison tables.
- Update M5 docs (SESSION_CONTEXT, CHANGELOG).
- Selective `git add` by explicit filename only.

### Executor MUST STOP
- Any DROP/TRUNCATE/DELETE attempt.
- Any schema change attempt.
- Any Prizma write attempt.
- Any merge to main.
- Use of `git add -A` / `git add .` / `git commit -a` / `git commit -am`.
- Any change to a Phase D/E JS file beyond the CSS-variable fix scope (the card + list code itself stays the same).

---

## 5. Stop-on-Deviation

- If the CSS-variable fix doesn't make `card_bg = rgb(255,255,255)` and `header_bg = rgb(30,58,138)` on live demo → STOP.
- If the mockup-vs-live comparison surfaces a STRUCTURAL gap that requires a schema change → document as finding, do NOT change schema.
- If `git add` accidentally stages a file outside the explicit list → STOP, unstage, restart.

---

## 6. Rollback

Pure additive code change. Rollback = `git revert` the build commits. No DB writes.

---

## Destructive Operations

This SPEC declares the following non-DROP destructive-class operations per Iron Rule 32:

1. **In-place edit** of `.claude/skills/opticup-localhost-tester/SKILL.md` — append a new "Visual-Fidelity Gate (MANDATORY BLOCKING)" section. NO removal of existing content.
2. **In-place edit** of `.claude/skills/opticup-strategic/SKILL.md` — append a Foreman-closure-checklist note. NO removal.
3. **In-place edit** of `.claude/skills/opticup-reviewer/SKILL.md` — append a Reviewer-audit note. NO removal.
4. **In-place edit** of `CLAUDE.md` Iron Rule 34 — tighten the wording with an append (rule still says what it said before, plus the new requirement).
5. **In-place edit** of `css/customers.css` — replace the head comment + `.cust-page` block with a version that declares the Hybrid+Navy tokens inside `.cust-page` scope. Surgical.
6. **In-place edit** of M5 module docs (SESSION_CONTEXT, CHANGELOG).
7. **NEW files** in `modules/Module 1.5 - Shared Components/docs/specs/VISUAL_FIDELITY_GATE/` — SPEC.md + retros + screenshots/.

**NO DROP** anywhere. **NO TRUNCATE.** **NO DELETE.** **NO `-a` / `add .` / amend.** Explicit-filename adds only.

---

## 7. Out of Scope

- M5 schema changes (the mockup-vs-live gaps that are schema-rooted — address breakdown, work_phone, discount group, etc. — get FLAGGED, not fixed).
- M5 JS logic changes (card + list code stays as-is; only CSS variable scope is fixed).
- M6/M7/M8/M9 screens (don't exist yet — the gate applies when they're built).
- Re-opening the Phase D/E retros (closed 🟢; this SPEC adds a fidelity addendum, not a reopener).
- Prizma writes.
- Merge to main.

---

## 8. Expected Final State

### Modified files (additive only)
- `.claude/skills/opticup-localhost-tester/SKILL.md` — new gate section.
- `.claude/skills/opticup-strategic/SKILL.md` — Foreman closure checklist note.
- `.claude/skills/opticup-reviewer/SKILL.md` — Reviewer audit note.
- `CLAUDE.md` Iron Rule 34 — tightened closure language.
- `css/customers.css` — `.cust-page` block now declares Hybrid+Navy tokens.
- `modules/Module 5 - Customers/docs/SESSION_CONTEXT.md` — fidelity-gate note + variable-scope fix note.
- `modules/Module 5 - Customers/docs/CHANGELOG.md` — fidelity addendum entry.

### New files
- SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + REVIEW.md + FOREMAN_REVIEW.md in this folder.
- Screenshots: card_live_before.jpeg + card_live_after.jpeg + card_mockup_tab1.jpeg + list_live.jpeg + list_mockup.jpeg.

### DB / Storage state
- Unchanged. No DDL. No DML.

### Commits
1. `fix(m5): scope Hybrid+Navy tokens to .cust-page (var-resolve bug)` — css/customers.css.
2. `feat(skills): VISUAL_FIDELITY_GATE — Localhost-Tester blocking gate + CLAUDE.md/Foreman/Reviewer wiring` — 4 skill+governance edits.
3. `docs(m1.5): VISUAL_FIDELITY_GATE SPEC + retros + M5 mockup-vs-live tables + screenshots` — SPEC folder.

---

## 9. Dependencies / Preconditions

- M5 Phase D + E 🟢 — verified. This SPEC adds a fidelity addendum.
- localhost:3000 still running.
- Chrome MCP harness available.
- Demo PIN session in the browser tab.

---

## 10. Pre-Merge Checklist

- [ ] All 15 §3 success criteria pass.
- [ ] M5 card + list each have an embedded live JPEG + a comparison table in TEST_REPORT.
- [ ] Integrity gate exit 0/2.
- [ ] No `-a` in any commit.
- [ ] HEAD pushed to develop.
- [ ] No Prizma writes / no schema change / no merge to main.

---

*End of VISUAL_FIDELITY_GATE SPEC. Durable gate + immediate M5 fix. The screen must match the mockup 1:1 before any UI closes.*
