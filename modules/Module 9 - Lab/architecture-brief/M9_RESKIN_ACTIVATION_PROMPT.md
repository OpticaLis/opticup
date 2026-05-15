# Activation: M9 Sketches Re-Skin to Hybrid+Navy

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 9 - Lab/architecture-brief/M9_RESKIN_BRIEF.md`

**Mission:** Re-skin 5 M9 architecture-brief sketches (KDS, Shipments, Dashboard, Settings, Compensation) from legacy palette (purple-deep / Prizma-gold / gradients) to Hybrid+Navy solid tokens. Re-skin only — no business or IA changes.

**Deliverables:**
- 5 files re-skinned in place under `modules/Module 9 - Lab/architecture-brief/`
- 5 pre-commit git tags: `pre-reskin-M9-{stem}` per file
- 1 main commit (or per-file commits — Executor's call) + 1 retrospective commit
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- M9 docs updates (SESSION_CONTEXT / CHANGELOG)

**Continuous-Run Mandate:**
- Run in ONE Claude Code chat.
- DO NOT ask Daniel anything — token map is normative.
- Status lines (one Hebrew line per file or per module) only.

**Destructive Operations Envelope:**
- 5 in-place file overwrites with git tags
- NO deletes, renames, schema changes, force-push
- NO touching M9_LAB_BRIEF.md
- NO touching any other module's files
- Anything outside the swap map → STOP + escalate

**Token Swap Map (normative — same as M13 + Batch 3):**

| From | To |
|---|---|
| `#534AB7` / `--purple` | `#1e3a8a` / `--accent` |
| `#EEEDFE` / `--purple-soft` | `#e6f1fb` / `--accent-soft` |
| `#26215C` / `--purple-deep` text | `#0f172a` / `--text-primary` |
| `#26215C` / `--purple-deep` bg | `#1e3a8a` with white text |
| `#7F77DD` / `--purple-mid` | `#1e40af` / `--accent-hover` |
| `#c9a555` Prizma-gold | `#1e3a8a` |
| `#a88838` gold-deep | `#1e40af` |
| Any `linear-gradient(...)` | Solid Hybrid token |
| `--bg` `#FAFAF7` | `--bg-page` `#fafaf7` |
| `--surface` `#FFFFFF` | `--bg-surface` `#ffffff` |
| `--soft` `#F1EFE8` | `--bg-surface-alt` `#f4f4f5` |
| `--text` `#1F1F1E` | `--text-primary` `#0f172a` |
| `--text-2` `#5F5E5A` | `--text-secondary` `#475569` |
| Decorative multi-color (non-semantic) | `--text-secondary` or `--accent-soft` |
| Semantic colors (success/warn/danger/info) | KEEP |

**Success Criteria (self-verifies):**
1. `grep -i "26215c\|534ab7\|c9a555\|a88838\|linear-gradient" modules/Module\ 9\ -\ Lab/architecture-brief/*.html` = 0 matches across all 5 files
2. `grep "1e3a8a" *.html` ≥ 5 matches (each file has Navy)
3. Each file's DOM tag count within ±5% of original
4. RTL retained per file
5. Hebrew content preserved per file
6. 5 git tags `pre-reskin-M9-{stem}` exist
7. `npm run verify:integrity` exit 0
8. Working tree clean
9. Pushed to `origin/develop`

**Closure:** Pipeline writes FOREMAN_REVIEW.md + applies 2 lessons each. End with ONE Hebrew summary:

> ✅ M9 Re-Skin CLOSED 🟢 — 5 סקיצות ב-Hybrid+Navy. כל סקיצות המודולים הקיימים אחידות בעיצוב.

Begin.
