# ARCHITECT_DECISION 001 — Reduced Scope (Option A — variant)

**Decided by:** Cowork-Architect (Daniel-via-Cowork session)
**Date:** 2026-05-17 IDT
**Pipeline:** REPO_CLEANUP_2026_05_18
**Escalation source:** `modules/Module 1.5 - Shared Components/escalations/2026-05-17T1050Z_repo_cleanup_desktop_classification_mismatch.md`

---

## Decision: APPROVED — Option A with one variant (skip GUARDIAN_ALERTS restore)

### Rationale

Desktop is source of truth (CLAUDE.md §9.Multi-Machine). Desktop sees only 6 entries. The 2,340-file mismatch IS Phase 5's predicted lesson — the SPEC was written under FUSE-stale evidence, and the executor's re-verification on the desktop empirically validated the protocol Phase 5 will codify. This is the cleanest possible validation: the Pipeline produced its own corrective lesson before any destructive commit landed.

### Confirmed commit plan (4 commits + closeout)

| # | Commit | Status |
|---|--------|--------|
| 1 | ~~`chore(repo): restore working tree from HEAD — 2,339 files VM-rot/stale cleanup`~~ | **SKIP — no-op (0 of 2,339 files present on desktop)** |
| 2 | `docs(m1): preserve 3 architecture Briefs from M1 lens Pipelines` | **EXECUTE — applies as-is** |
| 3 | `chore(repo): remove _archive/pr-drafts/ (used PR body draft, pre-authorized)` | **EXECUTE — applies as-is** |
| 3b | ~~`chore(archive): preserve M4 CRM cutover QA harness 2026-04-29`~~ | **SKIP — no-op (8 of 8 files absent on desktop; they exist only in Cowork FUSE snapshot)** |
| 4 | `chore(skills): apply VM-rot detection protocol — REPO_CLEANUP_2026_05_18 lessons` | **EXECUTE — Phase 5, highest-value commit** |
| 5 | `chore(spec): close REPO_CLEANUP_2026_05_18 with FOREMAN_REVIEW + EXECUTION_REPORT + FINDINGS + this ARCHITECT_DECISION` | **EXECUTE — closeout** |

### Variant from executor's Option A: skip Commit 1 (GUARDIAN_ALERTS restore)

The executor's Option A proposed restoring `docs/guardian/GUARDIAN_ALERTS.md` from HEAD as Commit 1, or skipping. **Architect decision: skip.**

Reason: GUARDIAN_ALERTS.md is a Sentinel auto-write file. The Sentinel cron will overwrite it on its next scheduled run (4-hour cadence + daily missions). A manual restore would be 1 commit of churn that Sentinel will immediately overwrite. Net value: zero. Skip and let the cron handle it.

### Skip Commit 3-M4-archive entirely

The 8 M4 CRM cutover QA files exist **only in the Cowork FUSE snapshot**, not on the desktop or in HEAD blob. They are an artifact of the FUSE mount holding 3-week-old session-output state. The "archive them to preserve historical purpose" rationale was sound *if* they existed; since they don't exist on the source-of-truth machine, archiving is a no-op. The historical record was already preserved when `qa-runner.mjs` was committed (tracked, in `modules/Module 4 - CRM/go-live/`).

If Daniel later finds the 8 files in some other backup and wants to archive them retroactively, that's a separate trivial commit on its own merits — not part of this Pipeline.

### Phase 5 edits — exact specification

This is the high-value commit. Apply these edits in Commit 4:

**Edit 1 — `CLAUDE.md` §1 step 3a (Cowork-VM sync gate):**

Add a new sub-section **after** the existing "Phase 2 (Cowork VM only ...)" block:

```markdown
**Phase 2.5 (Cowork VM only — ghost-lock + FUSE-stale detection):**

After the Phase 1 untracked survey, run these probes BEFORE attempting any
git write op (commit, checkout, reset, rebase, push):

1. **Ghost-lock test:** `stat .git/index.lock` shows the file but `rm` or
   `cat` fail with "No such file or directory" → ghost file in FUSE mount.
   Cowork VM cannot self-recover. STOP.
2. **FUSE-stale test:** if `git status --porcelain | wc -l` returns
   significantly more than expected (e.g., >100 modified files when no
   active SPEC has touched that many), the FUSE mount is showing a stale
   snapshot. Compare on the desktop via `git status` — if desktop sees
   clean tree and Cowork sees N modifications, those N are FUSE phantoms.

In either case: Cowork VM cannot safely run destructive git ops. Escalate
to a Claude Code session on the desktop (the FUSE-source machine) with an
ACTIVATION_PROMPT. Cowork = read + plan + author SPECs; desktop = execute.
Never blur the line.
```

**Edit 2 — `.claude/skills/opticup-strategic/SKILL.md` `## First Action — Every Session`:**

Insert a new step **between current steps 1 and 2** (auto-memory and CLAUDE.md):

```markdown
**Step 0.5 — Cowork-VM viability check (only in Cowork sessions; skip on Claude Code):**

Before any planned git write, run:
```bash
stat .git/index.lock 2>&1 | head -1
ls .git/index.lock 2>&1
rm -f .git/index.lock 2>&1
```

If `stat` succeeds but `rm` reports "No such file or directory" → ghost
file in FUSE mount → all destructive ops in this session must be
dispatched to Claude Code via ACTIVATION_PROMPT. Don't try to execute
in-VM. Add this finding to the SPEC §4 Destructive Operations as
"Dispatched to desktop" and stop after authoring.

This is the **REPO_CLEANUP_2026_05_18 lesson** — confirmed empirically
when the executor re-verified on desktop and found 0/2,339 phantom
modifications.
```

**Edit 3 — `.claude/skills/opticup-executor/SKILL.md`:**

Add to the existing "First Action / Pre-Action collision check" section, as a new sub-section:

```markdown
**Pre-Action #2: Cowork-SPEC desktop re-verification gate (only when executing
a SPEC authored by a Cowork session).**

If the SPEC §2 Background cites Cowork-VM-side classification of modified
files OR references FUSE-mount measurements: RE-VERIFY all classification
numbers on the desktop before any destructive op.

Specifically:
- `git status --porcelain | Measure-Object -Line` on desktop
- Compare to Cowork-side counts in SPEC §2.3
- If desktop sees clean tree → SPEC is no-op; close as such, write
  FINDINGS.md with classification-mismatch evidence, escalate
- If desktop sees same/similar counts → SPEC scope holds; proceed
- If desktop sees DIFFERENT counts (neither clean nor same) → unknown
  3rd state; STOP, escalate

This is the **REPO_CLEANUP_2026_05_18 lesson** — confirmed empirically
when Cowork-side classified 2,340 files but desktop saw 6. The 2,334
non-existent files would have been a no-op bulk commit if executed blind.

Desktop = source of truth. FUSE mount = snapshot that may lag.
```

### Closeout protocol for this Pipeline

After Commits 2 + 3 + 4 + 5 land on origin/develop:

1. EXECUTION_REPORT.md captures actual desktop commit hashes + diff stats
2. FINDINGS.md captures the classification-mismatch as F-1 (high-value finding)
3. ARCHITECT_DECISION_001 (this file) becomes part of the SPEC folder's permanent record — DO NOT delete after closeout
4. FOREMAN_REVIEW.md (written by Architect after closeout) references this decision and harvests the lessons further

### Resume signal

Executor resumes immediately. No further input required. Pipeline goal: 4 commits + push + closeout within 30 min of resume.

---

**END ARCHITECT_DECISION 001**
