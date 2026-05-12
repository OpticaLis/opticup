# Activation: Sketch Revision Batch 3 — M5/M6/M8/M11/M12/M14/M15 Re-Skin to Hybrid+Navy

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/SKETCH_REVISION_BATCH_3_BRIEF.md`

**Mission:** Re-skin 17 architecture-brief sketch files across 7 modules (M5/M6/M8/M11/M12/M14/M15) from the legacy purple-deep palette to the Hybrid+Navy design system. STRUCTURE PRESERVATION is the central rule — no layout changes, no IA changes, no new screens, no content drift. Only CSS tokens swap.

**Deliverables:**
- 17 mockup files re-skinned in place (paths and filenames unchanged)
- A git tag per file before its commit (format: `pre-reskin-M{N}-{stem}`) for independent revert
- 7 per-module commits (one commit per module covering its file(s)) + 1 retrospective commit
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md per Pipeline protocol
- Module 1.5 docs updates (SESSION_CONTEXT / CHANGELOG)
- DECISIONS_LOG index update (cross-module entry)
- OPEN_TASKS.md update (close Batch 3, list M9 + M13 remaining)

**Continuous-Run Mandate:**
- Run end-to-end in ONE Claude Code chat.
- DO NOT stop between modules.
- DO NOT ask Daniel about color choices — token map in Brief §2 is normative.
- Status lines (one Hebrew line per module) only.
- Stop only on: Iron Rule 31/32 violation, file no longer renders post-swap, success criterion that cannot be met, or unexpected legacy-palette references outside the swap map.

**Destructive Operations Envelope:**
- 17 in-place file overwrites with pre-commit git tags for rollback.
- NO file deletes.
- NO renames or moves.
- NO schema changes.
- NO force-push.
- NO touching: M7, M9, M13, M1 files. Anything outside the 17-file list → STOP + escalate.

**Token Map (normative — applies to all 17 files):**

| Legacy token | Hybrid+Navy replacement |
|---|---|
| `--purple` `#534AB7` | `--accent` `#1e3a8a` |
| `--purple-soft` `#EEEDFE` | `--accent-soft` `#e6f1fb` |
| `--purple-deep` `#26215C` (text use) | `--text-primary` `#0f172a` |
| `--purple-deep` `#26215C` (bg use) | `--accent` `#1e3a8a` (with `#ffffff` text) |
| `--purple-mid` `#7F77DD` | `--accent-hover` `#1e40af` |
| `--bg` `#FAFAF7` | `--bg-page` `#fafaf7` (unchanged hex, rename only) |
| `--surface` `#FFFFFF` | `--bg-surface` `#ffffff` (rename) |
| `--soft` `#F1EFE8` | `--bg-surface-alt` `#f4f4f5` |
| `--text` `#1F1F1E` | `--text-primary` `#0f172a` |
| `--text-2` `#5F5E5A` | `--text-secondary` `#475569` |
| `--text-3` `#888780` | `--text-tertiary` `#94a3b8` |
| `--border` `rgba(0,0,0,0.12)` | `--border-subtle` `#e2e8f0` |
| `--border-strong` `rgba(0,0,0,0.22)` | `--border-default` `#cbd5e1` |
| Semantic colors (teal/amber/blue/coral/pink/green/red) used for semantic state (success/warning/danger/info) | KEEP. Map to Hybrid semantic tokens. |
| Decorative multi-color accents (NOT semantic) | Replace with `--text-secondary` or `--accent-soft` |

**Success Criteria (Pipeline self-verifies):**
1. All 17 files re-skinned per §5 of Brief.
2. `grep -i "26215c\|534ab7" modules/Module*/architecture-brief/*.html` returns 0 matches across the 17 in-scope files. (M9 + M13 + M7 + M1 NOT in this scope.)
3. Each file retains `<html lang="he" dir="rtl">`.
4. Each file's DOM tag count is within ±5% of original (structure preservation check).
5. Customer names, brand names, prices, all placeholder data preserved verbatim.
6. Each re-skin commit has a `pre-reskin-M{N}-{stem}` git tag created BEFORE the commit.
7. 7 per-module commits + 1 retrospective = 8 commits in this SPEC's range.
8. `npm run verify:integrity` exit 0.
9. Working tree clean at end (modulo pre-existing baseline).
10. All commits pushed to `origin/develop`.

**Closure:** Pipeline writes FOREMAN_REVIEW.md + applies 2 lessons each to opticup-strategic and opticup-executor SKILL.md. End with ONE Hebrew summary to Daniel:

> ✅ Batch 3 Re-Skin CLOSED 🟢 — 17 סקיצות עברו ל-Hybrid+Navy. רשימה לבדיקה: [computer://...]. הבא בתור: M13 revision + M9 from scratch.

Begin.
