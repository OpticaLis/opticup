# SPEC — WORKING_TREE_RECOVERY

> **Location:** `modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-24
> **Module:** 4 — CRM (filed under Module 4 since this recovery blocks CRM merge-to-main)
> **Phase:** N/A — emergency recovery
> **Author signature:** Cowork strategic session 2026-04-24

---

## 1. Goal

Restore the local `opticup` ERP working tree to a clean, LF-only state matching `origin/develop` HEAD (`6cd332f`), while preserving 3 legitimate untracked/modified files from the prior session. After this SPEC, `git status` shows only the 3 expected files, and zero CRLF or truncation corruption remains.

---

## 2. Background & Motivation

On 2026-04-24 morning, a new Cowork strategic session opened the repo and found `git status` showing 1,083 modified/untracked/deleted files — vastly more than the 3 files the prior Cowork session claimed to have left uncommitted. A forensic QA (read-only general-purpose subagent) concluded:

- **1,065 files** modified; only **244** have real non-whitespace diffs — the remaining 821 are pure LF→CRLF conversions (no `.gitattributes`, no `core.autocrlf` policy).
- **40+ files truncated** mid-statement with null-byte padding. Verified examples: `js/shared.js` (~3KB of null bytes at EOF), `modules/crm/crm-init.js` (ends at `console.error('CRM` with no closing characters).
- **3 files legitimately changed** from the prior session and **verified intact**: `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`, `modules/Module 4 - CRM/final/CRM_PRE_MERGE/ACTIVATION_PROMPT.md`, `docs/guardian/MISSION_8_XMOD_AUDIT_2026-04-24.md`.
- **HEAD is clean:** local `develop` == `origin/develop` == `6cd332f`. Production unaffected.
- **Root cause:** single catastrophic write event (Cowork VM file sync / null-byte padding pattern documented in auto-memory `feedback_cowork_truncation.md`). Not accumulated drift.

The prior session's "3 files pending" summary is accurate for legitimate work, but the working tree around those 3 files got corrupted between session close and this session open.

Recovery must not require manually re-creating the 3 legitimate files from memory — they're intact on disk and the forensic report confirms their content.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop` | `git branch --show-current` → `develop` |
| 2 | HEAD matches remote | Local HEAD == origin/develop | `git rev-parse HEAD` == `git rev-parse origin/develop` (both `6cd332f` at SPEC start) |
| 3 | Total `git status` entries | Exactly 4 untracked/modified items | `git status --short \| wc -l` → `4` |
| 4 | Modified entries | Exactly 1 (SESSION_CONTEXT) | `git status --short \| grep -c "^ M"` → `1` |
| 5 | Untracked paths | Exactly 3 untracked entries: MISSION_8 file, CRM_PRE_MERGE folder, and the combined new SPEC folders under final/ (WORKING_TREE_RECOVERY and INTEGRITY_GATE_SETUP — these may show as individual untracked paths or grouped by their parent) | `git status --short \| grep "^??" \| wc -l` → `3–4` depending on git's grouping |
| 6 | Modified file is SESSION_CONTEXT | Exact path present | `git status --short \| grep -c "modules/Module 4 - CRM/docs/SESSION_CONTEXT.md"` → `1` |
| 7 | ACTIVATION_PROMPT.md exists | File present | `test -f "modules/Module 4 - CRM/final/CRM_PRE_MERGE/ACTIVATION_PROMPT.md"` → exit 0 |
| 8 | MISSION_8 audit exists | File present | `test -f "docs/guardian/MISSION_8_XMOD_AUDIT_2026-04-24.md"` → exit 0 |
| 8a | SPEC 1 file exists at new location | File present | `test -f "modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/SPEC.md"` → exit 0 |
| 8b | SPEC 2 file exists at new location | File present | `test -f "modules/Module 4 - CRM/final/INTEGRITY_GATE_SETUP/SPEC.md"` → exit 0 |
| 8c | Watcher folder preserved | All HEAD-tracked files present | `git ls-tree -r HEAD watcher-deploy/ \| awk '{print $4}' \| while read f; do test -f "$f" \|\| echo "MISSING: $f"; done` → empty output (no missing files) |
| 9 | No CRLF in tracked files | 0 files with CRLF | `git diff --numstat \| awk '{sum+=$1+$2} END {print sum}'` — combined with `--ignore-all-space` must produce IDENTICAL output. If they differ, CRLF is back. |
| 10 | No truncation in sampled files | All 5 files end cleanly | `tail -c 5 js/shared.js modules/crm/crm-init.js modules/crm/crm-activity-log.js modules/crm/crm-event-send-message.js js/shared-field-map.js` — none should contain null bytes (`\x00`) or end mid-identifier |
| 11 | crm-init.js intact at HEAD | Matches commit | `diff <(git show HEAD:modules/crm/crm-init.js) modules/crm/crm-init.js` → empty (no diff) |
| 12 | SESSION_CONTEXT.md line count | 184 lines (±2) | `wc -l "modules/Module 4 - CRM/docs/SESSION_CONTEXT.md"` → `~184` |
| 13 | SESSION_CONTEXT.md contains "POST-MERGE" | Grep hit | `grep -c "POST-MERGE" "modules/Module 4 - CRM/docs/SESSION_CONTEXT.md"` → ≥1 |
| 14 | ACTIVATION_PROMPT.md line count | 133 lines (±2) | `wc -l "modules/Module 4 - CRM/final/CRM_PRE_MERGE/ACTIVATION_PROMPT.md"` → `~133` |
| 15 | MISSION_8 line count | 265 lines (±2) | `wc -l "docs/guardian/MISSION_8_XMOD_AUDIT_2026-04-24.md"` → `~265` |
| 16 | No commits produced | 0 new commits | `git log origin/develop..HEAD --oneline \| wc -l` → `0` |

Criterion 16 is critical: **this SPEC intentionally produces ZERO commits.** The 3 legitimate files remain uncommitted at the end of this SPEC so that SPEC 2 (INTEGRITY_GATE_SETUP) can decide what to do with them in the right order (commit them as part of Integration Ceremony, after the integrity gate exists).

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read the 3 legitimate files AND both SPEC folders to back them up
- Copy them to a temporary location outside the repo (`/tmp/optic-recovery/`), preserving folder structure
- Run `git checkout -- .` to restore all tracked files to HEAD (this also resolves the watcher-deploy/ paradox — files marked "D" in index but present on disk and in HEAD will be restored to the index, NOT deleted from disk)
- Run `git clean -fd` ONLY AFTER the backup is complete — this removes truly untracked items: `modules/Module 4 - CRM/final/` (our SPECs, already backed up), `modules/Module 4 - CRM/final/CRM_PRE_MERGE/` (already backed up), `docs/guardian/MISSION_8_XMOD_AUDIT_2026-04-24.md` (already backed up). The `watcher-deploy/` folder and all its contents (INCLUDING `9361.csv`) are tracked in HEAD and MUST NOT be removed — `git checkout -- .` handles them by restoring to index.
- Restore the 3 backed-up files AND both SPEC folders to their correct paths (using `mkdir -p` for parent folders first)
- Verify every criterion in §3 before declaring success
- Commit **nothing**
- Write `EXECUTION_REPORT.md` and `FINDINGS.md` into `modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/` as part of the closing ritual

### Critical safety note — Watcher service
The `watcher-deploy/` folder is part of HEAD and MUST remain on disk — the Windows Watcher service reads from it. Git currently shows its files as "D" (removed from index) due to the corruption event, but they physically exist on disk AND in HEAD. `git checkout -- .` will restore them to the index without touching disk. DO NOT delete the `watcher-deploy/` folder or any of its HEAD-tracked files under any circumstance.

### What REQUIRES stopping and reporting
- Any of the 3 backup files failing to copy (e.g., path not found, read error) → STOP, report, wait
- After `git checkout -- .` + `git clean -fd`, if `git status` is NOT completely clean (pristine HEAD state) → STOP, report
- After restoring the 3 files, if any criterion in §3 fails → STOP, report
- Any file on disk containing null bytes after step 4 (restore) → STOP, report — the backup itself may be corrupt
- If criterion 9 (CRLF check) still fails after recovery → STOP and investigate (possible git filter misconfig)
- Any temptation to `git add` or `git commit` — absolute stop-trigger

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **Any null byte detected in the 3 backed-up files OR the 2 SPEC files before restoration.** Use `grep -l $'\x00' <file>` or `xxd <file> | grep -c "0000 0000"` — expected 0 in legit files. If nonzero → the corruption may have reached the backups too; STOP and escalate.
- **HEAD commit changes mid-execution.** If `git rev-parse HEAD` at end differs from start (it shouldn't, nothing should be committing) → STOP.
- **`git clean -fdn` dry-run output contains ANY path under `watcher-deploy/`.** The entire Watcher service directory is HEAD-tracked and must be preserved. After `git checkout -- .`, `git clean -fdn` should contain ZERO watcher-deploy paths. If any appear → STOP immediately. This is a safety fence around the Watcher.
- **`git clean -fdn` dry-run output contains any path NOT in this allowlist:** `modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/` and `modules/Module 4 - CRM/final/INTEGRITY_GATE_SETUP/` (SPEC folders, will be restored from backup), `modules/Module 4 - CRM/final/CRM_PRE_MERGE/` (restored from backup), `docs/guardian/MISSION_8_XMOD_AUDIT_2026-04-24.md` (restored from backup). If an unexpected path appears → STOP, investigate, don't clean.

---

## 6. Rollback Plan

This SPEC is itself recovery from a broken state. Rollback means restoring the broken state, which is not useful. However, if execution fails mid-way:

- **If backup step fails:** stop immediately. Nothing has been changed yet. No rollback needed.
- **If `git checkout -- .` succeeds but restore-from-backup fails:** the 3 legitimate files are lost from working tree. Rollback: manually retrieve the backup from `/tmp/optic-recovery/` and copy back. If the tmp dir was cleaned, the files can be reconstructed from the forensic report in the prior chat context OR from `git stash` (if stashed first).
- **Safety add-on:** BEFORE `git checkout -- .`, also run `git stash push -u -m "WORKING_TREE_RECOVERY pre-reset safety net"` as belt-and-suspenders. Never apply the stash unless recovery fails — it contains the corrupted state.

This 2-layer backup (copy to /tmp AND git stash) ensures no data loss is possible.

---

## 7. Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:

- **No Iron Rule changes.** Rule 31 and all skill edits are SPEC 2's scope.
- **No `.gitattributes` creation.** That's SPEC 2.
- **No `scripts/verify-tree-integrity.mjs`.** That's SPEC 2.
- **No git config changes** (`core.autocrlf`, `core.eol`). That's SPEC 2.
- **No commits.** The 3 legitimate files remain uncommitted for SPEC 2 to handle.
- **No updates to MODULE_MAP, GLOBAL_MAP, GLOBAL_SCHEMA, SESSION_CONTEXT** (beyond what already exists in the 3 legitimate files).
- **The sibling repo `opticup-storefront`** — not touched by this SPEC.
- **The `watcher-deploy/` folder** — it's not part of current tracked code (deleted in git history March 21). `git clean -fd` will remove it; that's expected and correct.

---

## 8. Expected Final State

### New files
None. This SPEC creates no new files in the working tree beyond restoring 3 pre-existing files.

### Files created inside the SPEC folder (by executor at close)
- `modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/FINDINGS.md` (if any findings emerge)

### Modified files on disk (restored to HEAD state)
- All 1,065 files currently showing as modified — restored to HEAD version with LF line endings.

### Files preserved unchanged from prior session
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — still modified vs HEAD with POST-MERGE content (184 lines)
- `modules/Module 4 - CRM/final/CRM_PRE_MERGE/ACTIVATION_PROMPT.md` — untracked (133 lines)
- `docs/guardian/MISSION_8_XMOD_AUDIT_2026-04-24.md` — untracked (265 lines)
- `modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/SPEC.md` — untracked (this very SPEC; ~300 lines)
- `modules/Module 4 - CRM/final/INTEGRITY_GATE_SETUP/SPEC.md` — untracked (SPEC 2; ~330 lines)

### Preserved (already tracked — must remain intact)
- `watcher-deploy/` — all HEAD-tracked files restored to the index by `git checkout -- .`. Physical files stay on disk throughout. **Critical:** the Windows Watcher service depends on these files. Do NOT delete any file that appears in `git ls-tree -r HEAD watcher-deploy/`.

### Deleted / cleaned (only truly-untracked local artifacts)
- After `git checkout -- .` restores the watcher-deploy/ tracked files, and after the 5 backups above are saved, `git clean -fd` should have ZERO items left on the allowlist to remove. If anything unexpected appears in dry-run, STOP per §5.

### Temporary artifacts (executor creates and MAY leave)
- `/tmp/optic-recovery/SESSION_CONTEXT.md` (backup copy of the modified file)
- `/tmp/optic-recovery/ACTIVATION_PROMPT.md` (backup copy of untracked file)
- `/tmp/optic-recovery/MISSION_8_XMOD_AUDIT_2026-04-24.md` (backup copy)
- `/tmp/optic-recovery/docs-specs/WORKING_TREE_RECOVERY/SPEC.md` (backup copy of this SPEC itself)
- `/tmp/optic-recovery/docs-specs/INTEGRITY_GATE_SETUP/SPEC.md` (backup copy of SPEC 2)
- Git stash `WORKING_TREE_RECOVERY pre-reset safety net` (MUST NOT be applied unless recovery fails)

### DB state
No DB changes. This SPEC does not touch Supabase.

### Docs updated (MUST include)
- **None** beyond `EXECUTION_REPORT.md` and `FINDINGS.md` inside the SPEC folder itself. MASTER_ROADMAP, GLOBAL_MAP, GLOBAL_SCHEMA, SESSION_CONTEXT, CHANGELOG — all untouched by this SPEC.

---

## 9. Commit Plan

**Zero commits.** This SPEC intentionally produces no commits. The 3 legitimate files remain as working-tree changes for SPEC 2 to handle.

The only write-to-repo actions are:
1. `EXECUTION_REPORT.md` and (optional) `FINDINGS.md` created inside `modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/` at end of execution. These are **also not committed** by this SPEC — they join the pending changes list for SPEC 2 to commit as part of Integration Ceremony.

If the executor finishes and finds a compelling reason to commit anyway, that is a STOP-trigger per §4.

---

## 10. Dependencies / Preconditions

- Local repo path: `C:\Users\User\opticup` (Windows desktop) mapped to `/sessions/exciting-gallant-rubin/mnt/opticup/` in bash.
- Git available.
- Bash shell.
- `/tmp/` writable.
- **Prerequisite verified at SPEC start time (by Foreman, not executor):**
  - HEAD: `6cd332f` (fix(crm): auto-clear unsubscribed_at on re-registration)
  - origin/develop: `6cd332f`
  - Prior session forensic report identified the 3 files by name and verified their content integrity.

---

## 11. Lessons Already Incorporated

Harvested from the 3 most recent FOREMAN_REVIEWs:

- **FROM `EVENT_CONFIRMATION_EMAIL/FOREMAN_REVIEW.md` Proposal 1 (row-existence check)** → NOT APPLICABLE. This SPEC performs no INSERTs.
- **FROM `EVENT_CONFIRMATION_EMAIL/FOREMAN_REVIEW.md` Proposal 2 (feature-existence grep)** → APPLIED. Searched for existing `modules/Module 4 - CRM/final/` folder and `WORKING_TREE_RECOVERY` folder — none exist. Safe to create.
- **FROM `CRM_HOTFIXES/FOREMAN_REVIEW.md` Proposal 1 (runtime state verification at author time)** → APPLIED. Every criterion in §3 is derived from forensic data verified at SPEC-authoring time by the read-only subagent (HEAD hash, file existence, file line counts, CRLF scope, truncation list). No criterion relies on memory or prior session context.
- **FROM `CRM_HOTFIXES/FOREMAN_REVIEW.md` Proposal 2 (Expected Final State lists ALL modified files)** → APPLIED. §8 lists every state change, including backups, stash, deletions, and preserved files.
- **FROM `SHORT_LINKS/FOREMAN_REVIEW.md` Proposal 1 (line-count projection)** → NOT APPLICABLE. No new code files; only restoration.
- **FROM `SHORT_LINKS/FOREMAN_REVIEW.md` Proposal 2 (rollback plan mandatory)** → APPLIED. §6 includes a 2-layer backup strategy (tmp copy + git stash).

### Cross-Reference Check (Rule 21 enforcement at author time)
- New names introduced: SPEC folder `WORKING_TREE_RECOVERY` under `modules/Module 4 - CRM/final/`.
- `modules/Module 4 - CRM/final/` directory exists with existing SPECs (CRM_HOTFIXES, EVENT_CONFIRMATION_EMAIL, SHORT_LINKS, CRM_PRE_MERGE, CRM_EVENT_STATUS_FIX, CRM_RESUBSCRIBE_FIX, etc.) — this SPEC joins the existing pattern.
- No collisions with existing names. No existing `WORKING_TREE_RECOVERY` anywhere in the repo.
- **Cross-Reference Check completed 2026-04-24: 0 collisions / 0 hits resolved.**

---

*End of SPEC. Hand to opticup-executor for execution.*
