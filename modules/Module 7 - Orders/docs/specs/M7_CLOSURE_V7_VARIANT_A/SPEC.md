# SPEC — M7_CLOSURE_V7_VARIANT_A

> **Location:** `modules/Module 7 - Orders/docs/specs/M7_CLOSURE_V7_VARIANT_A/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) under Full-Auto Pipeline
> **Authored on:** 2026-05-11
> **Module:** 7 — Orders
> **Phase:** Pre-build (architecture-brief closure)
> **Author signature:** Claude Code · Opus 4.7 · 2026-05-11 Full-Auto session

---

## 1. Goal

Lock **Variant A** ("two-pane work surface + sticky tools strip") from `M7_CENTER_REDESIGN_V7_VARIANTS.html` as the canonical M7 sketch. Extract it into a standalone `M7_ORDERS_FULL_MOCKUP_V7.html`, archive the V6 baseline + the 3-variants comparison file + the prior failed center-column attempt, and update the documentation chain so the next session reads V7 = Variant A. This is a **documentation-only** closure SPEC — no production code changes, no DB changes, no design changes.

---

## 2. Background & Motivation

- 2026-05-07 — M7 Architecture Brief sealed (`M7_ORDERS_FULL_MOCKUP_V6.html`, 984 lines), 9 v6 data-regions in a 3-column layout.
- 2026-05-11 (earlier) — Daniel rejected v6's center column ("stack/clicks problem"); Architect wrote `M7_CENTER_REDESIGN_BRIEF.md` + 3-variant exploration (`M7_CENTER_REDESIGN_V7_VARIANTS.html`, 1,239 lines, A/B/C in one file with reco-banner + sticky tab nav).
- 2026-05-11 (this session) — **Daniel selected Variant A**. Variant A is the only one keeping all 9 v6 regions visible simultaneously (B accordion hides 5 of 6; C T-layout hides 4 of 5).
- The prior failed center-column attempt (`M7_ORDERS_CENTER_COLUMN_VARIANTS.html`, 861 lines, "Tabs / Scan-first / Staged") is kept for decision history.

Closing this loop locks the canonical M7 sketch and clears the runway for the upcoming "Audit of 9 module sketches against Hybrid design system" task. After this SPEC closes, only `M7_ORDERS_FULL_MOCKUP_V7.html` lives in `architecture-brief/` as the active sketch reference.

Source brief: [`modules/Module 7 - Orders/architecture-brief/M7_CLOSURE_BRIEF.md`](../../../architecture-brief/M7_CLOSURE_BRIEF.md) (v1, 2026-05-11).

### Already-done discovery contingency

- The brief states "no new design" — if at execution time the V7 canonical file or the archive subfolder is found to already exist (Daniel re-ran a previous step, or another chat raced), the executor MUST stop and escalate. This SPEC is the **first** authoring of these artifacts; an existing file means a parallel run, not idempotent restart.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at start | On `develop`, clean modulo pre-existing baseline untracked files (status before SPEC: 2 modified + 16 untracked, see EXECUTION_REPORT.md §1 baseline) | `git status --short` |
| 2 | New canonical sketch | `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html` exists, self-contained, RTL, between 500–700 lines (revised post-extraction; original estimate of 600–1100 was author-side overestimate — actual measured 518 lines after mechanical extraction; see FINDINGS.md F-AUTH-1) | `ls` + `wc -l` |
| 3 | V7 contains no Variants-comparison artifacts | 0 occurrences of each removed token in V7 file | `grep -c "reco-banner\|var-tab\|VARIANT B\|VARIANT C\|data-var-panel\|variant-panel\|vb-acc\|vb-stack\|vc-tab\|vc-panel\|vc-tabbar\|switchVariant" "modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html"` → `0` |
| 4 | V7 preserves all Variant A structural class names | ≥ 1 occurrence each of: `va-panes`, `va-pane`, `va-tools-strip`, `panel-comms`, `class="header"`, `class="page"`, `class="app"` | `grep -c "<pattern>" V7` → `≥ 1` per token |
| 5 | V7 title updated | `<title>M7 — Orders · Full Mockup V7 (Variant A)</title>` | `grep -c "M7 — Orders · Full Mockup V7" V7` → `1` |
| 6 | V7 has no `<script>` block (pure HTML+CSS mockup) | 0 `<script>` tags | `grep -c "<script" V7` → `0` |
| 7 | V7 declares `dir="rtl"` and `lang="he"` | both present in `<html>` tag | `grep -c 'lang="he"' V7` → `≥ 1` AND `grep -c 'dir="rtl"' V7` → `≥ 1` |
| 8 | Archive folder exists | `_archive/m7-sketches-v6-prior/` exists with 4 files: 3 archived HTMLs + `README.md` | `ls _archive/m7-sketches-v6-prior/ \| wc -l` → `4` |
| 9 | All 3 source files moved (not copied) | Source paths no longer exist in `architecture-brief/`; archived paths exist | `ls "modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V6.html"` → not found; `ls _archive/m7-sketches-v6-prior/M7_ORDERS_FULL_MOCKUP_V6.html` → found |
| 10 | Moves preserve git history | `git log --follow --oneline` from each archive path returns the original commit | `git log --follow --oneline -- _archive/m7-sketches-v6-prior/M7_ORDERS_FULL_MOCKUP_V6.html \| tail -1` returns a commit hash |
| 11 | Archive README written | `_archive/m7-sketches-v6-prior/README.md` exists, ≥ 30 lines, mentions all 3 archived files by name + V7 canonical path | `wc -l` + `grep -c` |
| 12 | M7 Brief updated | `M7_ORDERS_BRIEF.md` has a "Canonical Sketch" line at top referencing V7 + Daniel selection date | `grep -c "Canonical Sketch" M7_ORDERS_BRIEF.md` → `1` |
| 13 | SESSION_CONTEXT updated | Cites V7 as active + archived prior set | `grep -c "M7_ORDERS_FULL_MOCKUP_V7" SESSION_CONTEXT.md` → `≥ 1` |
| 14 | MODULE_MAP updated | Table lists V7 as active, V6 + 2 variants in archive | `grep` checks |
| 15 | CHANGELOG entry added | New section dated 2026-05-11 describing V7 closure | `grep -c "2026-05-11 — V7" CHANGELOG.md` → `1` |
| 16 | DECISIONS_LOG index — Cross-Module entry 18 | Row 18 present with literal text from brief §5 | `grep -c "M7 V7 sketch selected (Variant A)" DECISIONS_LOG.md` → `1` |
| 17 | DECISIONS_LOG index — M7 sub-table entry 10 | Row `\| 10 \| 2026-05-11 \| M7 V7 sketch selected (Variant A) \|` present | `grep` |
| 18 | decisions/M7.md — full entry | New `## 2026-05-11 — M7 V7 selected: Variant A locked as canonical` section appended with Situation/Recommendation/Daniel's response/Reason/Lesson | `grep -c "M7 V7 selected: Variant A locked" decisions/M7.md` → `1` |
| 19 | OPEN_TASKS — task 1 closed + reorder | Task #1 (M7 sketch redesign) moved to "Completed recently" with V7 closure note; old task #2 (audit) becomes new task #1 | `grep` checks |
| 20 | Backup folder created | `modules/Module 7 - Orders/backups/2026-05-11_M7_CLOSURE_V7_VARIANT_A/` exists with the 4 pre-change files | `ls` returns 4 files |
| 21 | Integrity Gate (Iron Rule 31) | Exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 22 | Destructive Operations Gate (Iron Rule 32) | `verify --staged` passes for every commit | implicit in pre-commit hook (must NOT be skipped) |
| 23 | Commits produced | 3 commits on `develop` between SPEC start and EXECUTION_REPORT close | `git log origin/develop..HEAD --oneline \| wc -l` → `3` |
| 24 | All commits pushed | `git status` shows "Your branch is up to date with 'origin/develop'" | `git status` |
| 25 | Final tree clean | `git status --porcelain` returns only the pre-existing baseline untracked paths captured in §3 #1 | diff against baseline |

**Note on baseline untracked files:** Pre-SPEC `git status` lists 2 modified (`OPEN_TASKS.md`, `TECH_DEBT.md`) + 16 untracked paths (other module artifacts not owned by this SPEC). The Executor must capture this baseline in EXECUTION_REPORT.md §1 and ensure the SPEC's only adds/modifies are those listed in §8 below — anything else is a stop-trigger. `OPEN_TASKS.md` IS modified by this SPEC (see §8), so it is expected to remain modified-then-committed by SPEC end. `TECH_DEBT.md` is NOT touched.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo (especially the 3 source HTML mockups + M7 docs + DECISIONS_LOG variants).
- Create the SPEC folder, V7 canonical file, archive folder + README, and backup folder.
- Use `git mv` to move the 3 source files into `_archive/m7-sketches-v6-prior/` (preserves history).
- Edit M7_ORDERS_BRIEF.md (single-line insertion at top under metadata header).
- Edit M7 docs (SESSION_CONTEXT, MODULE_MAP, CHANGELOG) per §8.
- Edit DECISIONS_LOG.md index (cross-module table + M7 sub-table).
- Append to decisions/M7.md (new section at end of file).
- Edit OPEN_TASKS.md (close task #1, reorder).
- Commit + push to `develop`.
- Run `npm run verify:integrity` and inspect output.

### What REQUIRES stopping and reporting
- Any need to delete (not move) any file — Iron Rule 32 forbids it.
- Any need to modify a file outside §8 "Expected Final State" — even if it "looks broken."
- Any divergence in line count of the V7 file vs the 600–1100 range — investigate before committing.
- Pre-commit hook failure on Iron Rule 31 (null bytes) or Iron Rule 32 (destructive ops gate).
- `git mv` reporting it cannot follow rename (would imply git is treating it as delete+create — investigate before continuing).
- An existing `M7_ORDERS_FULL_MOCKUP_V7.html` or `_archive/m7-sketches-v6-prior/` at execution start — see §2 contingency.
- Any merge conflict with `origin/develop` after a push attempt (rebase pull first, then re-attempt — if still conflicting, STOP and escalate).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **Variant-A content corruption:** if §3 #4 grep returns 0 for any required Variant-A token after extraction, V7 is broken — STOP, do NOT commit.
- **Cross-contamination:** if §3 #3 grep returns >0 for any of the removed tokens in V7, content was not extracted cleanly — STOP, do NOT commit.
- **Rename detection failure:** if `git mv` does not record the move as a rename (`git log --follow` on archive path doesn't follow back to original commit), STOP — likely root-allowlist or wildcard issue.
- **Pre-commit hook failure on `destructive-ops-declared.mjs`:** § Destructive Operations of THIS SPEC must already list all moves — if hook still blocks, the gate is reading a different SPEC or the regex missed a pattern. Investigate; do not `--no-verify`.
- **`OPEN_TASKS.md` modification clash:** if the pre-SPEC modification to OPEN_TASKS.md (already on disk) conflicts with this SPEC's changes, STOP and reconcile — do not blindly overwrite.

---

## 6. Rollback Plan

If the SPEC fails partway and must be reverted:

1. Capture failure point and `git log --oneline origin/develop..HEAD`.
2. If 0 commits made — discard unstaged changes: `git checkout -- modules/ _archive/ MASTER_ROADMAP.md OPEN_TASKS.md .claude/skills/opticup-architect/references/`.
3. If 1 or more commits made — `git reset --hard origin/develop` to drop unpushed commits, OR `git revert <hash>` for already-pushed commits (preferred to maintain forward-only history).
4. Restore from backup folder if any file content was lost: `cp -r "modules/Module 7 - Orders/backups/2026-05-11_M7_CLOSURE_V7_VARIANT_A/*"` back to original paths.
5. Notify Foreman; SPEC marked REOPEN.

No DB changes in this SPEC — no DB rollback needed.

---

## 7. Out of Scope (explicit)

This SPEC MUST NOT:

- Change any pixel/style/content of Variant A vs the source — extraction is mechanical, not design.
- Touch any of the 4 print-form mockups (`M7_FORM_*.html`).
- Touch `M7_ORDERS_HANDOFF.md`, `M7_ORDERS_FEATURE_INVENTORY.md`, `M7_ORDERS_PRINT_FORMS.md`, `M7_CENTER_REDESIGN_BRIEF.md` (kept verbatim).
- Modify `MASTER_ROADMAP.md` (M7 row already reads "✅ v1 — main mockup + 5 forms + catalog"; the V7 selection is an in-design refinement, not a phase-status change).
- Modify any production code, HTML page, JS, CSS, or DB.
- Modify `CLAUDE.md`, any iron rule, or any other module's docs.
- Touch `TECH_DEBT.md` (the pre-existing `M` flag is unrelated and out of scope here).
- Write any SPEC for *building* M7 in production — that comes from the upcoming "9-sketch audit" task and a separate Brief.
- Skip the integrity gate or any pre-commit hook with `--no-verify`.

---

## 8. Expected Final State

### New files

1. **`modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html`**
   - Self-contained HTML mockup of Variant A only.
   - Derived from `M7_CENTER_REDESIGN_V7_VARIANTS.html` by mechanical extraction: keep `:root` + base styles + all shared component styles (`.header`, `.tabs`, `.panel`, `.panel-section`, `.lang-btn`, `.msg-card`, `.task-card`, `.log`, item-card, etc.) + Variant A specific styles (`.va-panes`, `.va-pane`, `.va-pane-h`, `.va-tools-strip`, `.va-tools-strip *`); drop reco-banner CSS, var-tabs CSS, Variant B styles, Variant C styles, `.variant-panel{display:none}` + `.variant-panel.active{display:block}`; drop reco-banner + var-tabs HTML; drop the `<div class="variant-panel active" data-var-panel="A">` wrapper around Variant A content (promote children to direct children of `.page`); drop entire Variant B + Variant C panels; drop the bottom Legend block; drop the entire trailing `<script>...</script>` block. Update `<title>` to `M7 — Orders · Full Mockup V7 (Variant A)`.
   - Resulting file must validate against §3 #2–#7.

2. **`_archive/m7-sketches-v6-prior/README.md`**
   - ≥ 30 lines explaining what's archived and why.
   - Names all 3 archived files individually with a 1–2 line purpose per file.
   - Points readers to the active canonical at `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html`.
   - Cites the closure date (2026-05-11) and the brief that authorized the archive (`M7_CLOSURE_BRIEF.md`).
   - Links to `decisions/M7.md` entry 10 for the full reasoning.

3. **`modules/Module 7 - Orders/docs/specs/M7_CLOSURE_V7_VARIANT_A/SPEC.md`** (this file).

4. **`modules/Module 7 - Orders/docs/specs/M7_CLOSURE_V7_VARIANT_A/EXECUTION_REPORT.md`** (written by executor at close).

5. **`modules/Module 7 - Orders/docs/specs/M7_CLOSURE_V7_VARIANT_A/FINDINGS.md`** (written by executor at close; may be empty/short if no surprises).

6. **`modules/Module 7 - Orders/docs/specs/M7_CLOSURE_V7_VARIANT_A/FOREMAN_REVIEW.md`** (written by Foreman after reading the executor's retrospective).

### Renamed (moved) files

7. `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V6.html` → `_archive/m7-sketches-v6-prior/M7_ORDERS_FULL_MOCKUP_V6.html` (via `git mv`)
8. `modules/Module 7 - Orders/architecture-brief/M7_CENTER_REDESIGN_V7_VARIANTS.html` → `_archive/m7-sketches-v6-prior/M7_CENTER_REDESIGN_V7_VARIANTS.html` (via `git mv`)
9. `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_CENTER_COLUMN_VARIANTS.html` → `_archive/m7-sketches-v6-prior/M7_ORDERS_CENTER_COLUMN_VARIANTS.html` (via `git mv`)

### Modified files

10. **`modules/Module 7 - Orders/architecture-brief/M7_ORDERS_BRIEF.md`** — add a single "Canonical Sketch" line in the metadata block at top (right after the existing version/date/author/target lines, before the blockquote `> זה לא SPEC...`):

    > **Canonical Sketch:** [`M7_ORDERS_FULL_MOCKUP_V7.html`](./M7_ORDERS_FULL_MOCKUP_V7.html) (Variant A — two-pane work surface + sticky tools strip). Selected by Daniel 2026-05-11. Predecessors archived at [`_archive/m7-sketches-v6-prior/`](../../../_archive/m7-sketches-v6-prior/).

11. **`modules/Module 7 - Orders/docs/SESSION_CONTEXT.md`** — rewrite "Current state" + "Next step" + "Predecessor artifacts" sections to reflect:
    - Active artifact = V7 (Variant A locked).
    - Next step = post-V7-lock: Architect's audit of 9 module sketches (per OPEN_TASKS #1).
    - Predecessor artifacts section relocated to `_archive/m7-sketches-v6-prior/`.
    - "Last update: 2026-05-11" preserved.

12. **`modules/Module 7 - Orders/docs/MODULE_MAP.md`** — update the "Architecture-brief artifacts (pre-build)" table:
    - Replace the `M7_ORDERS_FULL_MOCKUP_V6.html` row with `M7_ORDERS_FULL_MOCKUP_V7.html` (Variant A canonical, active).
    - Remove the `M7_ORDERS_CENTER_COLUMN_VARIANTS.html` row from the active table (now archived).
    - Remove the `M7_CENTER_REDESIGN_V7_VARIANTS.html` row from the active table (now archived).
    - Add a "Archived predecessors" note pointing to `_archive/m7-sketches-v6-prior/`.

13. **`modules/Module 7 - Orders/docs/CHANGELOG.md`** — append new section `## 2026-05-11 — V7 locked (Variant A canonical)` describing the closure, listing the 3 archived files, and citing this SPEC folder.

14. **`.claude/skills/opticup-architect/references/DECISIONS_LOG.md`** — TWO additions:
    - Cross-module table: append row 18 with text from brief §5 verbatim.
    - M7 sub-table: append row 10 `| 10 | 2026-05-11 | M7 V7 sketch selected (Variant A) | Variant A locked as canonical; V6 + 2 sibling variants archived. |`.

15. **`.claude/skills/opticup-architect/references/decisions/M7.md`** — append full `## 2026-05-11 — M7 V7 selected: Variant A locked as canonical` section using the standard Situation → Recommendation → Daniel's response → Reason → Lesson template, with at least one lesson harvested for future sketch-selection decisions.

16. **`OPEN_TASKS.md`** — update `Last updated` line + close task #1 (M7 sketch redesign), promote task #2 (9-module sketch audit) to position #1, renumber remaining; add a 2026-05-11 entry under "Completed recently" mentioning V7 closure and SPEC slug. Preserve all other content verbatim including the existing 2026-05-11 modification context.

### Backup folder

17. **`modules/Module 7 - Orders/backups/2026-05-11_M7_CLOSURE_V7_VARIANT_A/`** — copies of the following pre-change files (per CLAUDE.md §9 rule 9; trigger fired by 3 renames):
    - `M7_ORDERS_BRIEF.md`
    - `SESSION_CONTEXT.md`
    - `MODULE_MAP.md`
    - `CHANGELOG.md`
    - The 3 source HTMLs (V6, V7-variants, center-column-variants) — already preserved in `_archive/` by the rename, but a copy here keeps the backup self-contained.

    Note: per the literal rule wording, `MODULE_SPEC.md`, `ROADMAP.md`, and `db-schema.sql` would also be included if they existed for Module 7 — they do NOT (module is in-design, pre-build). Note this in EXECUTION_REPORT.md.

### DB state

No DB changes. No migrations. No RLS changes.

### Build-side-effect file expectations

No build / codegen runs in this SPEC. No build side-effects expected. If any unexpected file shows up in `git status` after a step, STOP per §5.

### Docs updated (MUST include)

- `MASTER_ROADMAP.md` — **NOT** updated. M7 row already reads "✅ v1"; V7 selection is a same-version refinement (not a new phase).
- `docs/GLOBAL_MAP.md` — **NOT** updated. No new functions/contracts.
- `docs/GLOBAL_SCHEMA.sql` — **NOT** updated. No DB changes.
- Module 7 `SESSION_CONTEXT.md` — UPDATED (#11).
- Module 7 `CHANGELOG.md` — UPDATED (#13).
- DECISIONS_LOG (index + per-module) — UPDATED (#14, #15).
- `OPEN_TASKS.md` — UPDATED (#16).

---

## 9. Commit Plan

3 commits total on `develop`:

**Commit A — Canonical V7 + archive + README** (single commit because moves + new V7 file are one logical action):

- Files staged:
  - NEW: `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html`
  - NEW: `_archive/m7-sketches-v6-prior/README.md`
  - RENAMED: `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V6.html` → `_archive/m7-sketches-v6-prior/M7_ORDERS_FULL_MOCKUP_V6.html`
  - RENAMED: `modules/Module 7 - Orders/architecture-brief/M7_CENTER_REDESIGN_V7_VARIANTS.html` → `_archive/m7-sketches-v6-prior/M7_CENTER_REDESIGN_V7_VARIANTS.html`
  - RENAMED: `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_CENTER_COLUMN_VARIANTS.html` → `_archive/m7-sketches-v6-prior/M7_ORDERS_CENTER_COLUMN_VARIANTS.html`
  - NEW: `modules/Module 7 - Orders/backups/2026-05-11_M7_CLOSURE_V7_VARIANT_A/` (all backup copies)
  - NEW: `modules/Module 7 - Orders/docs/specs/M7_CLOSURE_V7_VARIANT_A/SPEC.md`

- Commit message:
  ```
  feat(m7): lock V7 canonical sketch (Variant A) + archive V6 + 2 sibling variants

  - Extract Variant A from M7_CENTER_REDESIGN_V7_VARIANTS into standalone
    M7_ORDERS_FULL_MOCKUP_V7.html (no tabs, no banner, no Variants B/C).
  - Archive V6 baseline + 3-variants comparison file + prior failed
    center-column attempt under _archive/m7-sketches-v6-prior/ with README.
  - Author SPEC M7_CLOSURE_V7_VARIANT_A under Full-Auto Pipeline.
  - Backup pre-change docs per CLAUDE.md §9 rule 9 (3 renames trigger).

  Closure of M7_CLOSURE_BRIEF.md authored 2026-05-11.
  ```

**Commit B — Documentation updates** (single commit for all doc edits that depend on Commit A's file structure):

- Files staged:
  - MODIFIED: `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_BRIEF.md` (Canonical Sketch line)
  - MODIFIED: `modules/Module 7 - Orders/docs/SESSION_CONTEXT.md`
  - MODIFIED: `modules/Module 7 - Orders/docs/MODULE_MAP.md`
  - MODIFIED: `modules/Module 7 - Orders/docs/CHANGELOG.md`
  - MODIFIED: `.claude/skills/opticup-architect/references/DECISIONS_LOG.md`
  - MODIFIED: `.claude/skills/opticup-architect/references/decisions/M7.md`
  - MODIFIED: `OPEN_TASKS.md`

- Commit message:
  ```
  docs(m7): record V7 canonical selection across DECISIONS_LOG + module docs + OPEN_TASKS

  - M7_ORDERS_BRIEF.md: add Canonical Sketch header line.
  - SESSION_CONTEXT / MODULE_MAP / CHANGELOG: V7 active, V6+2 in archive.
  - DECISIONS_LOG index: cross-module entry 18 + M7 sub-table entry 10.
  - decisions/M7.md: full Architect/Daniel/reasoning entry for V7 selection.
  - OPEN_TASKS: close task #1 (M7 sketch redesign); promote 9-sketch audit.
  ```

**Commit C — SPEC closure + retrospective** (written by executor at end, after self-verification):

- Files staged:
  - NEW: `modules/Module 7 - Orders/docs/specs/M7_CLOSURE_V7_VARIANT_A/EXECUTION_REPORT.md`
  - NEW: `modules/Module 7 - Orders/docs/specs/M7_CLOSURE_V7_VARIANT_A/FINDINGS.md`

- Commit message:
  ```
  chore(spec): close M7_CLOSURE_V7_VARIANT_A with retrospective

  Variant A locked as M7's canonical sketch (V7). All 25 success criteria
  verified. 0 findings → empty FINDINGS.md (placeholder) OR N findings as
  documented inline.
  ```

After Commit C, the Foreman writes `FOREMAN_REVIEW.md` and commits separately:
  ```
  chore(foreman): review of M7_CLOSURE_V7_VARIANT_A — apply skill improvements
  ```

All commits pushed to `origin/develop` immediately after creation (no batching).

---

## 10. Dependencies / Preconditions

- Repo on `develop`, integrity gate passing (verified 2026-05-11 at session start: exit 0, 17 files scanned).
- The 3 source HTML files exist at their stated locations (verified by author).
- The 3 destination names do not collide with existing paths (verified by author via `Grep`: 0 hits outside the closure brief + activation prompt).
- `_archive/` exists as a top-level archive vault (verified — see `_archive/README.md` and `scripts/checks/root-allowlist.json`).
- `_archive/m7-sketches-v6-prior/` does NOT yet exist — executor creates it.
- `modules/Module 7 - Orders/backups/` may or may not exist — executor creates if needed.
- No browser action required (pure docs + file moves). No localhost smoke test required (no production code change). The Localhost-Tester phase of the Pipeline is **skipped** for this SPEC and noted in the chain hand-off — Reviewer reports directly back to Foreman.

### Browser readiness pre-flight (executor instructs at start)

**Pre-flight (executor): SPEC's QA is filesystem + grep + git-log + npm verify — no browser required. Skip Chrome readiness check.**

---

## 11. Lessons Already Incorporated

Harvested from the 3 most recent FOREMAN_REVIEWs in this and adjacent SPEC folders (per skill protocol):

- FROM `M7_CENTER_REDESIGN_V7_VARIANTS/FOREMAN_REVIEW.md` — *(file does not yet exist; the V7-variants SPEC was authored 2026-05-11 morning and closed as an artifact-deliverable per the MODULE_MAP entry, but no FOREMAN_REVIEW.md was committed for it).* → NOT APPLICABLE.
- FROM `M3_REC014_ORPHAN_CLEANUP/FOREMAN_REVIEW.md` — "Already-done discovery contingency" pattern → **APPLIED in §2** (existing V7 file or archive folder is a stop-trigger, not idempotent).
- FROM `M3_REC014_ORPHAN_CLEANUP/FOREMAN_REVIEW.md` — "Backup format guidance for DB-DELETE SPECs" → NOT APPLICABLE (no DB deletes).
- FROM `M3_SITEMAP_BRAND_404_CLEANUP/FOREMAN_REVIEW.md` — "Subset relationships in §7" → NOT APPLICABLE.
- FROM `M3_SITEMAP_BRAND_404_CLEANUP/FOREMAN_REVIEW.md` — "Build-side-effect file expectations" → **APPLIED in §8** (explicit "no build runs in this SPEC" line).
- FROM `M3_STUDIO_TRANSLATIONS_BRAND_FILTER/FOREMAN_REVIEW.md` — "Browser readiness pre-flight" → **APPLIED in §10** (explicit skip notice).
- FROM Full-Auto Pipeline test SPECs (`M1_5_FULL_AUTO_TEST_1_DOCS_ONLY` + `M1_5_FULL_AUTO_TEST_2_CODE_CHANGE`) — pipeline-mode SPECs should be self-contained and avoid mid-run questions → **APPLIED throughout** (every step has an expected value the executor can self-verify).

### Cross-Reference Check (Rule 21 enforcement at author time)

Performed 2026-05-11 by author against current HEAD:

- New name `M7_ORDERS_FULL_MOCKUP_V7.html` — `Grep` returned 2 hits, both in the closure brief / activation prompt for this very SPEC (no collisions).
- New folder `_archive/m7-sketches-v6-prior/` — `Grep` returned 2 hits, same context (no collisions).
- New SPEC slug `M7_CLOSURE_V7_VARIANT_A` — never used before (verified by `ls modules/Module 7 - Orders/docs/specs/`).
- No new DB objects, no new functions, no new T-constants, no new FIELD_MAP entries, no new shared.js helpers.

**Result: 0 collisions / 2 hits resolved (own references).**

---

## 12. Pre-Merge Checklist

Executor must check ALL before writing Commit C:

- [ ] All §3 success criteria 1–25 pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] **Destructive Ops Gate (Iron Rule 32):** every commit passed pre-commit hook without `--no-verify`.
- [ ] `git status --porcelain` matches baseline (only pre-existing untracked paths remain).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md written.
- [ ] Module SESSION_CONTEXT + CHANGELOG + MODULE_MAP updated.
- [ ] DECISIONS_LOG index + per-module M7.md updated.
- [ ] OPEN_TASKS.md updated.

---

## 4. Destructive Operations

Declared, per Iron Rule 32:

1. **`git mv` (file rename)** — `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V6.html` → `_archive/m7-sketches-v6-prior/M7_ORDERS_FULL_MOCKUP_V6.html`
2. **`git mv` (file rename)** — `modules/Module 7 - Orders/architecture-brief/M7_CENTER_REDESIGN_V7_VARIANTS.html` → `_archive/m7-sketches-v6-prior/M7_CENTER_REDESIGN_V7_VARIANTS.html`
3. **`git mv` (file rename)** — `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_CENTER_COLUMN_VARIANTS.html` → `_archive/m7-sketches-v6-prior/M7_ORDERS_CENTER_COLUMN_VARIANTS.html`

**No** file deletes. **No** `rm`, `git rm`, `Remove-Item`. **No** mass renames beyond the 3 listed (well under the ≥ 5 threshold). **No** rebase, **no** reset --hard, **no** force-push. **No** SQL DROP / TRUNCATE / DELETE / ALTER. **No** edit that removes a section from CLAUDE.md or any other governance file (all governance file edits are append-only or in-place updates to numbered/dated registers).

Encountering any need outside these 3 listed operations → STOP, write escalation file, halt pipeline.

---

*End of SPEC. Authoring complete 2026-05-11 by opticup-strategic. Hand-off to opticup-executor under Full-Auto Pipeline.*
