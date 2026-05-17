---
spec_id: REPO_CLEANUP_2026_05_18
title: Cowork VM-mount drift cleanup + untracked file disposition
author: opticup-architect (acting as Foreman)
authored: 2026-05-17 IDT
module: Module 1.5 - Shared Components
status: SEALED — ready for execution
---

# SPEC — Repo Cleanup 2026-05-18

## 1. Goal

Restore the Cowork VM working tree to a clean state matching `origin/develop`,
without losing any real work, by:

1. Classifying 2,340 modified files into VM-rot vs stale-disk buckets.
2. Restoring all rot/stale files from HEAD blobs (no real content is lost —
   HEAD is authoritative; verified by Phase 1 investigation).
3. Disposing the 12 known untracked files per Daniel's prior authorization
   (delete pr-drafts / commit M1 lens Briefs / archive M4 QA harness).
4. Producing a clean working tree (`git status` empty) and a single coherent
   push to `origin/develop` containing only the genuinely new tracked content
   (Group 2 + Group 3 archived files).

## 2. Background — Phase 1 Findings (read-only, complete before sealing)

### 2.1 Probe 1: HEAD identity
- `HEAD = origin/develop = c2528b0` ("chore(architect): sweep applied pending entries 2026-05-17")
- Author: OpticaLis, 2026-05-17 13:10:48 +0300
- Branch tracking: `develop → origin/develop`
- **Zero local commits ahead of origin.** No work can be lost by a hard restore
  from HEAD — there is nothing to lose at the commit level.

### 2.2 Probe 2: 20-file representative sample (diverse paths)
Sample covered: 3 skill SKILL.md files (strategic, supervisor, architect),
infra files (.github/workflows/verify.yml, .husky/pre-commit, package.json),
3 module SESSION_CONTEXT.md files, GUARDIAN_ALERTS.md, ROADMAP.md, code files
(shared.js, auth-service.js, lens-tabs.css, index.html), canonical docs
(GLOBAL_MAP.md, GLOBAL_SCHEMA.sql).

Conclusive pattern observed in **every** sample:
- Files where `wc -l working-tree == wc -l HEAD blob`: byte-delta in
  `[0..line_count]`, hex-dump shows CRLF (`0d0a`) in working-tree vs LF (`0a`)
  in HEAD. `git diff --ignore-cr-at-eol HEAD -- <file>` returns empty.
  → **Pure CRLF rot** (Bucket B).
- Files where `wc -l working-tree < wc -l HEAD blob`: working-tree mtime
  predates the last commit that touched the file (often by 6-8 days).
  → **Stale-disk** (Bucket S) — FUSE mount snapshot didn't refresh.

### 2.3 Probe 3: Bulk classification of all 2,340 M files
Method: for each file, compare `stat -c %s working-tree` vs
`git cat-file -s HEAD:<file>`. If wt_b < head_b → Bucket S. If
wt_b >= head_b AND delta ≤ line_count → Bucket B (pure rot). Otherwise →
Bucket X (mixed).

Results:
- **Bucket B (pure CRLF rot)**: 2,233 files
- **Bucket S (stale-disk, content older)**: 104 files
- **Bucket X (mixed/special)**: 2 files
- **Bucket A (real divergence from parallel session)**: 0 files
- **Bucket C (Sentinel auto-writes)**: 125 paths in `docs/guardian/` —
  but these overlap with Buckets B/S, not a separate disposition class.
  Sentinel cron will regenerate them on its next run; restoring from HEAD
  is safe.
- **Bucket D (untracked new work)**: 12 already-known files, dispositions
  decided in §3.

### 2.4 Probe 4: No active parallel CLI session detected in this VM
- No `node`/`claude`/`python` processes running inside the Linux sandbox
- No pipeline-coordination lock files (`_archive/pipeline-sessions/` doesn't
  exist on this VM)
- No `.git/REBASE_HEAD`, `MERGE_HEAD`, `CHERRY_PICK_HEAD`, `BISECT_LOG`
- No recent (< 5 min) writes to `.git/HEAD`
- `.git/index.lock` exists with `2026-05-14 04:05` mtime — **3-day-old
  stale lock from a fallen op, not an active lock**. `.git/index` itself
  was updated `2026-05-17 04:02` (today) so git operations work despite
  the stale lock.
- Windows host processes are invisible from inside the Linux sandbox, but
  the Supervisor SPEC 1 commits from the handoff already appear in
  `origin/develop` (cdc2a6e, 27bc..., etc.) → that session pushed and
  closed. No coordination needed.

### 2.5 Why Buckets B + S → same remediation (`git checkout HEAD -- <file>`)
Both buckets have zero real-work content that doesn't exist in HEAD already.
The mechanism that produced them is identical (FUSE mount snapshot lag +
CRLF translation between Linux git and Windows working tree). The only
difference is *how old* the mount snapshot is for each file. Restoring
from HEAD blob is **always** the correct remediation for both.

### 2.6 Bucket X (2 special files)
- `docs/guardian/GUARDIAN_ALERTS.md` — Sentinel auto-write. Working-tree
  is from `2026-05-16 03:30 UTC` scan; HEAD has the `2026-05-17 19:55 UTC`
  scan. **HEAD is newer.** Restore from HEAD. Sentinel cron will overwrite
  on its next run.
- `_archive/launch-plan-draft-superseded-2026-05-15/campaign-overseer/DECISIONS_LOG.md`
  — `git cat-file` errors with "No such file or directory" → this path was
  renamed into `_archive/launch-plan-draft-superseded-2026-05-15/` at some
  prior commit. The working-tree still sees the old path. Resolution:
  `git checkout HEAD -- <correct-archive-path>` and let the orphan FUSE
  artifact stay until the mount refreshes. Cosmetic only.

## 3. Success Criteria (measurable)

| # | Criterion | Verification command | Expected |
|---|-----------|---------------------|----------|
| S1 | `.git/index.lock` removed (stale, 3-day-old) | `ls .git/index.lock 2>&1` | `No such file or directory` |
| S2 | All 2,233 Bucket B files restored | `wc -l /tmp/bucket_B_pure_rot.txt`, then `git status --porcelain \| awk '{print $1}' \| grep -c '^M$'` after step | first command 2233; second matches Bucket S only (104 remaining) |
| S3 | All 104 Bucket S files restored | After S2 + Bucket S restore: `git diff --name-only HEAD \| wc -l` | 0 |
| S4 | Bucket X (2 files) handled | `git diff --name-only HEAD` includes neither file | absent from output |
| S5 | `_archive/pr-drafts/` deleted | `ls _archive/pr-drafts 2>&1` | `No such file or directory` |
| S6 | 3 M1 lens Briefs committed | `git log -1 --format=%s -- "modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_INVENTORY_MOCKUP_1TO1_BRIEF.md"` | non-empty (file is tracked) |
| S7 | 8 M4 QA files moved to archive | `ls "_archive/m4-crm-cutover-qa-harness-2026-04-29/"` shows all 8 files + README.md | 9 entries |
| S8 | Working tree clean | `git status --porcelain \| wc -l` | 0 |
| S9 | Pushed to origin | `git rev-parse HEAD == git rev-parse origin/develop` | true |
| S10 | Iron Rule 31 gate (integrity) passes | `npm run verify:integrity` | exit 0 |
| S11 | Iron Rule 32 gate (destructive ops declared) passes | `node scripts/checks/destructive-ops-declared.mjs` if available | exit 0 |
| S12 | No Prizma writes | Verified by absence — this Pipeline touches only this repo, not Supabase | true (repo-only Pipeline) |
| S13 | Skill files updated with VM-rot detection protocol | Phase 5 commit applies edits to opticup-strategic SKILL.md + CLAUDE.md §1 step 3a | edits present in commit log |

## 4. Destructive Operations

(Iron Rule 32 enforcement.)

This SPEC explicitly authorizes the following destructive operations, all
constrained to this repo:

1. **`git checkout HEAD -- <file>` on 2,339 files (Buckets B + S + X file 1)**
   — restores working-tree content from HEAD blob. Cannot lose work because
   HEAD is `origin/develop` and there are no local commits ahead. Reversible
   by re-fetching FUSE mount.
2. **`rm -rf _archive/pr-drafts/`** — delete the entire untracked directory.
   Daniel pre-authorized.
3. **`git mv` × 8** (M4 QA files into archive folder) — note: files are
   currently untracked, so this is `mv` not `git mv`, then `git add`. Not
   destructive in git sense, but listed for completeness.
4. **`rm .git/index.lock`** — stale lock file removal. Cannot harm because
   it's been stale 3 days and `.git/index` itself is operational.

**Forbidden** (not authorized by this SPEC, would require Daniel escalation):
- `git reset --hard` of any kind
- `git push --force`
- `git rebase`
- Any merge to `main`
- Any SQL `DROP` / `TRUNCATE` / `DELETE FROM` (no DB touched at all)
- File deletes outside Daniel's pre-authorized list (`_archive/pr-drafts/`)
- Modifying the 8 M4 QA files' content (move only)

## 5. Autonomy Envelope

**The executor CAN** without asking:
- Run `git checkout HEAD -- <file>` for any file in Bucket B or S, in batches
- Remove `.git/index.lock` (stale lock)
- Delete `_archive/pr-drafts/` recursively
- Move + commit the 8 M4 QA files to `_archive/m4-crm-cutover-qa-harness-2026-04-29/`
- Commit the 3 M1 lens Briefs as-is
- Run `git status` / `git diff` / `git log` as needed
- Group multiple `git checkout` operations into a single bulk operation
- Use temporary files in `/tmp/` for bucket lists

**The executor MUST stop and escalate to Daniel** if:
- Any file in Bucket S has a working-tree size that suggests *new content
  not in HEAD* (would surface as `wt_b > head_b` AND `delta > line_count` —
  i.e., Bucket X with non-Sentinel origin)
- A new lock file (`.git/MERGE_HEAD`, `REBASE_HEAD`, etc.) appears during
  execution (would indicate a parallel session is active)
- `git push origin develop` is rejected (would indicate origin advanced
  during this Pipeline → need to rebase, which is not authorized)
- Iron Rule 31 (verify:integrity) fails with exit 1
- Working tree is not clean after Phase 2 (would indicate Phase 1
  classification missed a file class)

## 6. Stop-on-Deviation Triggers (beyond global)

- Any file in Bucket S, after restore, still shows as M
- `npm run verify:integrity` exits 1 (null-byte corruption or truncation
  detected in any file)
- Push to `origin/develop` is rejected
- A `.lock` file in `_archive/pipeline-sessions/` appears (parallel session)
- Daniel sends a new message mid-execution

## 7. Out of Scope (do NOT touch)

- ANY storefront repo work (this is ERP-only)
- Anything on `main` branch
- Module 3 (Storefront) phase-letter docs in this repo are read-only here
- The 2 Bucket X files require special handling per §2.6 — do not bundle
  with bulk Bucket B/S restore
- Any change to actual source code logic
- Any change to docs that aren't VM-rot/stale
- Any Sentinel report files outside `docs/guardian/` (these regenerate)

## 8. Expected Final State

After Pipeline closes:
- `git status --porcelain` returns empty
- `git rev-parse HEAD == git rev-parse origin/develop`
- HEAD has advanced by **3 commits** from `c2528b0`:
  1. `chore(repo): restore working tree from HEAD — 2339 files VM-rot/stale cleanup` (REPO_CLEANUP_2026_05_18)
  2. `docs(m1): commit 3 M1 lens architecture Briefs from Pipeline records` (REPO_CLEANUP_2026_05_18)
  3. `chore(archive): preserve M4 cutover QA harness 2026-04-29 + README` (REPO_CLEANUP_2026_05_18)
- 3 new files in `modules/Module 1 - Inventory Management/architecture-brief/`
- 9 new files in `_archive/m4-crm-cutover-qa-harness-2026-04-29/`
- 0 files in `_archive/pr-drafts/` (directory deleted)
- This SPEC folder contains: SPEC.md, EXECUTION_REPORT.md, FINDINGS.md,
  FOREMAN_REVIEW.md
- Phase 5 commit: `chore(skills): apply VM-rot detection protocol — REPO_CLEANUP_2026_05_18 lessons` updates opticup-strategic SKILL.md + CLAUDE.md §1 step 3a

## 9. Commit Plan

| # | Commit subject | Files |
|---|----------------|-------|
| 1 | `chore(repo): restore working tree from HEAD — VM-mount rot cleanup (REPO_CLEANUP_2026_05_18)` | All 2,339 restored files (Buckets B + S + X file 1) |
| 2 | `docs(m1): preserve 3 architecture Briefs from M1 lens Pipelines` | 3 M1 lens Briefs (Group 2 from Daniel decision) |
| 3 | `chore(archive): preserve M4 CRM cutover QA harness 2026-04-29 as historical template` | 8 M4 QA files + README in archive folder |
| 4 | `chore(skills): apply VM-rot detection protocol — REPO_CLEANUP_2026_05_18 lessons` | opticup-strategic SKILL.md + CLAUDE.md §1 step 3a edits (Phase 5) |
| 5 | `chore(spec): close REPO_CLEANUP_2026_05_18 with FOREMAN_REVIEW + EXECUTION_REPORT + FINDINGS` | SPEC closeout artifacts |

**Commit 1 is large (2,339 files)** — this is unavoidable because the
working-tree drift is global. The diff is essentially empty in content
terms (CRLF↔LF translation + a few stale files restored to HEAD content)
so review noise is minimal. Single coherent commit is correct per Daniel's
"not 2340 individual commits" instruction.

## 10. Rollback Plan

If Pipeline fails mid-execution:
- Bucket B/S restorations are reversible by re-reading from FUSE mount
  (the working-tree content was identical to HEAD content already in
  terms of meaning, just CRLF/staleness; nothing was lost)
- Untracked file moves are reversible by `mv` back
- The `_archive/pr-drafts/` deletion is irreversible BUT Daniel
  pre-authorized it (PR body draft, already used)
- Commits not yet pushed can be undone via `git reset --soft HEAD~N`
- Commits pushed but rejected — n/a per stop-trigger §5
- No SQL means no DB rollback needed

## 11. Lessons Already Incorporated

This SPEC is a remediation Pipeline; lessons from prior cleanup work:
- `WORKING_TREE_RECOVERY` (2026-04-24) was closed as no-op after env-drift
  diagnosed → installed Iron Rule 31 integrity gate. Lesson: investigate
  before destructive action. Applied: Phase 1 (45min probes) before Phase 2.
- `INTEGRITY_GATE_SETUP` (2026-04-27) installed null-byte + truncation
  detection. Lesson: bulk file ops can hide real corruption. Applied: S10
  requires `verify:integrity` to pass at the end.
- Auto-memory `feedback_cowork_truncation.md`: "Cowork VM pads null bytes;
  causes real prod bugs. Verify with xxd, clean with PowerShell". Lesson:
  trust HEAD blob over working-tree on a Cowork VM. Applied: Phase 2 always
  restores from HEAD.
- Daniel's "investigate before destroy" directive (today): no `git
  clean -fd` without survey-first; no `git reset --hard` without per-bucket
  classification. Applied: this Pipeline survives the bar Daniel set.

Cross-reference check completed:
- New file paths: `_archive/m4-crm-cutover-qa-harness-2026-04-29/` —
  grep'd against GLOBAL_SCHEMA, GLOBAL_MAP, FILE_STRUCTURE: 0 collisions.
- No new DB objects, RPCs, T-constants, or functions introduced.
- Rule 21 (No Orphans): the archive folder is the canonical home for the
  obsolete QA harness; no duplicate exists.

## 12. QA / Verification Plan

After Phase 2 + Phase 3:
1. `git status --porcelain | wc -l` → 0
2. `git diff origin/develop HEAD --stat | tail -1` → 5 commits, ~2,346 files
   changed (2,339 restored + 3 Briefs + 8 QA archives + ~5 README + ~3 closeout)
3. `git log origin/develop..HEAD --oneline` → exactly 5 commits matching §9
4. `npm run verify:integrity` → exit 0
5. Spot-check 3 random restored files via `git diff HEAD -- <file>` → empty
6. Spot-check 1 random Bucket S file via `wc -l` working-tree vs HEAD blob
   → equal
7. `ls _archive/pr-drafts 2>&1` → "No such file or directory"
8. `ls "_archive/m4-crm-cutover-qa-harness-2026-04-29/"` → 9 entries
   (8 files + README.md)
9. Verify `.git/index.lock` removed

## 13. Pipeline Coordination Pre-Check

Per CLAUDE.md §9 Parallel Pipeline Coordination (added 2026-05-17 by
PARALLEL_PIPELINE_COORDINATION SPEC):
- `_archive/pipeline-sessions/` doesn't exist in this VM mount — this VM
  is detached from the active coordination layer. **Inferred safe** because:
  (a) no Linux processes here, (b) no lock files anywhere, (c) origin/develop
  already contains the Supervisor SPEC 1 commits (cdc2a6e..c2528b0) — that
  session pushed.
- If `_archive/pipeline-sessions/` reappears mid-Pipeline (FUSE mount
  refresh exposes Windows host state) → stop and rerun check.

---

**END SPEC**

Foreman seal: 2026-05-17 ~14:00 IDT (Cowork session).
Ready for execution by the same session (Foreman + Executor merged role
per Daniel directive: "dispatch a full investigation + cleanup Pipeline
instead of incremental instructions").
