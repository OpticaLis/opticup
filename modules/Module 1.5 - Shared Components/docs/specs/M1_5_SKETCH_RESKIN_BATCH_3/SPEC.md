# M1_5_SKETCH_RESKIN_BATCH_3 — Sketch Revision Batch 3 (M5/M6/M8/M11/M12/M14/M15 → Hybrid+Navy)

**SPEC version:** v1
**Authored by:** opticup-strategic (Foreman, Full-Auto Pipeline mode)
**Date:** 2026-05-11
**Owning module:** Module 1.5 — Shared Components
**Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/SKETCH_REVISION_BATCH_3_BRIEF.md`

## 1. Goal

Re-skin 17 architecture-brief mockup files across 7 modules (M5/M6/M8/M11/M12/M14/M15) from the legacy purple-deep palette to the Hybrid+Navy design system. Structure-preserving — no layout changes, no IA changes, no new screens, no content drift.

## 2. Scope

### In (17 files)

- **M5** — `M5_CUSTOMER_CARD_MOCKUP.html`, `M5_CUSTOMERS_LIST_MOCKUPS.html`
- **M6** — `M6_PRESCRIPTION_EDITOR_MOCKUP.html`
- **M8** — `M8_CHECKOUT_MOCKUP_V3.html`, `M8_CHECKS_PIPELINE_MOCKUP_V1.html`, `M8_DAILY_CLOSE_MOCKUP_V2.html`, `M8_PROVIDER_CONFIG_MOCKUP_V2.html`
- **M11** — `M11_REPORTS_LIST_MOCKUP.html`, `M11_REPORT_EDITOR_MOCKUP.html`, `M11_REPORT_VIEW_MOCKUP.html`
- **M12** — `M12_CHANNEL_CONFIGS_MOCKUP.html`, `M12_CUSTOMER_HISTORY_MOCKUP.html`, `M12_TEMPLATES_MOCKUP.html`, `M12_WHATSAPP_INBOX_MOCKUP.html`
- **M14** — `M14_APPOINTMENTS_MOCKUP.html`, `M14_APPOINTMENTS_SCREENS.html`
- **M15** — `M15_QUEUE_MOCKUP.html`

### Out
- M7 (already Hybrid+Navy V7), M9 (no sketches — separate Batch), M13 (gold-gradient — separate Batch), M1 (Daniel directive).
- M2/M3/M4 production HTML.
- IA revisions, new screens, layout changes.

## 3. Approach

Single transformation script — `reskin.mjs` — co-located in this SPEC folder. For each file it:

1. Locates the `:root{ ... }` block in the `<style>` section.
2. Replaces it with a new `:root` block that defines **both** the Hybrid+Navy canonical tokens AND backward-compatible aliases (`--bg → var(--bg-page)`, `--purple → var(--accent)`, `--purple-deep → var(--text-primary)`, etc.). Aliases preserve every legacy reference site without touching DOM/CSS rules.
3. Performs targeted in-place sweeps for the special-cased context inversions called out in the Brief:
   - Dark-background uses of `--purple-deep` (`background:var(--purple-deep)`, `background:linear-gradient(...,var(--purple-deep)...)`) → `--accent` (#1e3a8a Navy) so headers stay dark with white text per Brief §2.2.
   - Inline hex `#26215C` and `#534AB7` and `#EEEDFE` references → Navy / accent-soft replacements.
   - Inline `--purple-mid` references swapped to `--accent-hover`.
4. Leaves all DOM, content, layout, padding/margin, radii, JS behavior, and Hebrew strings untouched.

The script logs each file's: line count before/after, byte count diff, hex/var hit counts pre and post.

## 4. Destructive Operations

Declared per Iron Rule 32:
- **File overwrites:** 17 in-place HTML overwrites (preserved by git history + per-file `pre-reskin-M{N}-{stem}` git tags before each commit).
- **No deletes.** No renames. No moves. No schema changes. No force-push. No `main` branch operations.

Anything outside this list → STOP + escalate.

## 5. Stop-on-Deviation Triggers

- Iron Rule 31 (integrity gate) fails at any point.
- Iron Rule 32: any destructive op beyond §4 needed.
- A re-skinned file fails to render or `<html lang="he" dir="rtl">` lost.
- DOM tag count drifts by > 5% on any file (structure preservation breach).
- Customer/brand/price/placeholder text changes (content drift breach).
- Unexpected `#26215C` / `#534AB7` reference remains in any of the 17 files after the script run.
- A file outside the 17-file allowlist is modified.
- M7, M9, M13, M1 files touched (out of scope).

## 6. Success Criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | All 17 files re-skinned | `git status` shows exactly 17 modified HTMLs in the listed paths |
| 2 | No legacy purple hex remains | `grep -i "26215c\\|534ab7" modules/Module*/architecture-brief/*.html` → 0 hits across the 17 in-scope files |
| 3 | Hebrew RTL preserved | Every file still has `<html lang="he" dir="rtl">` |
| 4 | DOM tag count within ±5% | Open-tag count delta ≤ 5% per file |
| 5 | No content drift | Customer names / brand names / prices / placeholder data verbatim |
| 6 | Per-file pre-reskin git tags | 17 tags named `pre-reskin-M{N}-{stem}` exist at commit `HEAD~1` of each module commit |
| 7 | 7 module commits + 1 retrospective = 8 commits | `git log --oneline` shows the chain |
| 8 | `npm run verify:integrity` exit 0 | Run after each module + at end |
| 9 | Working tree clean at end | Modulo pre-existing dirty baseline (TECH_DEBT.md mod, untracked briefs, accdb test files, etc.) |
| 10 | All commits pushed to `origin/develop` | `git status` shows `up to date` |

## 7. Expected Final State

- 17 mockup files re-skinned, all with Hybrid+Navy `:root` block and aliases.
- 17 git tags `pre-reskin-M{N}-{stem}` pointing at parent commit of each module commit.
- 8 commits ahead of starting `develop` HEAD (`8ac5382`).
- SPEC folder populated with: `SPEC.md`, `reskin.mjs`, `EXECUTION_REPORT.md`, `FINDINGS.md`, `FOREMAN_REVIEW.md`.
- Module 1.5 `SESSION_CONTEXT.md` + `CHANGELOG.md` updated.
- `OPEN_TASKS.md` updated (close Batch 3, list M9 + M13 remaining).
- `references/DECISIONS_LOG.md` cross-module entry added.

## 8. Commit Plan

7 per-module commits + 1 retrospective commit (= 8 commits in SPEC range):

```
feat(m5):  reskin M5 architecture-brief sketches to Hybrid+Navy (2 files)
feat(m6):  reskin M6 architecture-brief sketches to Hybrid+Navy (1 file)
feat(m8):  reskin M8 architecture-brief sketches to Hybrid+Navy (4 files)
feat(m11): reskin M11 architecture-brief sketches to Hybrid+Navy (3 files)
feat(m12): reskin M12 architecture-brief sketches to Hybrid+Navy (4 files)
feat(m14): reskin M14 architecture-brief sketches to Hybrid+Navy (2 files)
feat(m15): reskin M15 architecture-brief sketches to Hybrid+Navy (1 file)
chore(spec): close M1_5_SKETCH_RESKIN_BATCH_3 with retrospective + docs
```

Each module commit explicitly adds only:
- The mockup HTML files for that module
- (For the first commit only) the SPEC folder + `reskin.mjs` + `SKETCH_REVISION_BATCH_3_BRIEF.md` + `SKETCH_REVISION_BATCH_3_ACTIVATION_PROMPT.md`

No `git add -A` — the pre-existing dirty baseline (TECH_DEBT.md, M7/M3 untracked retrospectives, accdb test files) is **untouched** by this SPEC.

## 9. Out of Scope

- Modifying `_tokens.css` source file.
- Touching any production HTML.
- Re-skinning M7/M9/M13/M1.
- Removing decorative legacy variables from `:root` (they're remapped to neutrals via aliases — leaving the var names in the body CSS untouched is the structure-preservation discipline).
- Adding/removing sections in any mockup.
- Removing the script after run (kept as SPEC artifact for audit).

## 10. Rollback Plan

Per-file revert: `git revert <commit-hash>` on the relevant module commit, or restore a single file: `git checkout pre-reskin-M{N}-{stem} -- <path>`.

Tags allow independent revert of any one file without unwinding the whole batch.

## 11. Lessons Already Incorporated

Cross-Reference Check completed 2026-05-11 against GLOBAL_SCHEMA + GLOBAL_MAP + FILE_STRUCTURE: 0 collisions. SPEC introduces 0 new DB objects, 0 new functions, 0 new files in production code paths. Re-skin only.

Harvest from recent FOREMAN_REVIEWs in this repo:
- (M7_CLOSURE_V7_VARIANT_A) "Author at the script level for batch mechanical work, not per-file manual edits." → Applied: `reskin.mjs` handles all 17.
- (M3_REC014_ORPHAN_CLEANUP) "Per-module commits with explicit file lists, never `git add -A`." → Applied: §8 above.
- (M3_TIER1_CATEGORY_SLUG_FIX) "Pre-commit git tags for independent revert when batch ops touch many files." → Applied: 17 `pre-reskin-*` tags.

---

*End of SPEC. Begin execution.*
