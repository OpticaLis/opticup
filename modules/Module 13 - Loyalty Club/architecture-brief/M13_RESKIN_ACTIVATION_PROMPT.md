# Activation: M13 Sketches Re-Skin to Hybrid+Navy

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 13 - Loyalty Club/architecture-brief/M13_RESKIN_BRIEF.md`

**Mission:** Re-skin `M13_SKETCHES.html` from Prizma-gold + gradients to Hybrid+Navy solid tokens. Business decisions unchanged. 5 sketches unchanged. Information architecture unchanged. Only CSS tokens + gradient-elimination.

**Deliverables:**
- `M13_SKETCHES.html` re-skinned in place
- Pre-commit git tag `pre-reskin-M13-sketches`
- 1 main commit + 1 retrospective commit
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- M13 docs updates (SESSION_CONTEXT / CHANGELOG)
- DECISIONS_LOG entry

**Continuous-Run Mandate:**
- Run in ONE Claude Code chat.
- DO NOT ask Daniel anything — token map and brief are normative.
- Status lines (one Hebrew line) only.

**Destructive Operations Envelope:**
- 1 in-place file overwrite (M13_SKETCHES.html) with git tag for rollback
- NO file deletes
- NO renames
- NO touching other M13 files (HANDOFF/BRIEF/DECISIONS_FOR_LOG/DRAFT — out of scope)
- Anything outside the swap map → STOP + escalate

**Token Swap Map (normative):**

| From (Prizma-gold / Apple-gray) | To (Hybrid+Navy) |
|---|---|
| `#c9a555` (gold) | `#1e3a8a` (Navy `--accent`) |
| `#a88838` (gold-deep) | `#1e40af` (Navy `--accent-hover`) |
| Any `linear-gradient(...c9a555...)` etc | `#1e3a8a` solid |
| `#f5f5f7` (Apple page bg) | `#fafaf7` (Hybrid `--bg-page`) |
| `#1d1d1f` (Apple text) | `#0f172a` (`--text-primary`) |
| `#86868b` (Apple secondary text) | `#475569` (`--text-secondary`) |
| `#e5e5ea` (Apple border) | `#e2e8f0` (`--border-subtle`) |
| `#d2d2d7` (Apple border-strong) | `#cbd5e1` (`--border-default`) |
| `#fafafc` (subtle surface) | `#f4f4f5` (`--bg-surface-alt`) |
| Tier-hero gold gradient | Navy solid `#1e3a8a` with white text |
| Active tab `#c9a555` underline | `#1e3a8a` underline |

**Hebrew text "זהב" (gold tier name)** stays as-is — it's a business term for the tier in the loyalty model, not a color reference.

**Success Criteria (self-verifies):**
1. `grep -i "c9a555\|a88838\|linear-gradient" M13_SKETCHES.html` = 0 matches
2. `grep "1e3a8a" M13_SKETCHES.html` ≥ 1 match
3. All 5 sketches still navigable
4. Hebrew "זהב" preserved as tier text label
5. DOM tag count ±5% of original
6. RTL retained
7. File renders in browser
8. Git tag `pre-reskin-M13-sketches` exists
9. `npm run verify:integrity` exit 0
10. Working tree clean
11. Pushed to `origin/develop`

**Closure:** Pipeline writes FOREMAN_REVIEW.md + applies 2 lessons each. End with ONE Hebrew summary:

> ✅ M13 Re-Skin CLOSED 🟢 — סקיצות ב-Hybrid+Navy. הבא: M9 from scratch.

Begin.
