# Escalation: REPO_CLEANUP_2026_05_18 — desktop sees 6 entries, not 2,340. SPEC's Phase 1 classification was 99% FUSE-mount phantom.

> Created by: opticup-executor (Windows desktop session, DESKTOP-C6N6M28)
> Created at: 2026-05-17T1050Z
> SPEC: modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_2026_05_18/SPEC.md
> Status: OPEN

---

**Stuck at:** Pre-flight desktop re-verification of SPEC Phase 1 (per activation prompt mandate). Desktop state does not match Cowork-side classification. STOP triggered by CLAUDE.md §9 ("output doesn't match expectation"). No destructive ops attempted.

**Desktop ground truth (DESKTOP-C6N6M28, `C:\Users\User\opticup`):**

| Probe | Cowork-side classification | Desktop reality |
|-------|---------------------------|----------------|
| `HEAD` | `c2528b0` = origin/develop | ✅ `c2528b0` = origin/develop (matches) |
| `git status --porcelain | wc -l` | 2,340 (Buckets B + S + X) | **6** |
| `.git/index.lock` | 3-day-old ghost | **Absent** |
| `.git/MERGE_HEAD` / `REBASE_HEAD` / etc. | Absent | ✅ Absent |
| `npm run verify:integrity` | not run on Cowork (FUSE) | ✅ Exit 0, "All clear" |
| `_archive/pipeline-sessions/` | absent in Cowork VM | ✅ Empty dir (no active lock files) |

**The 6 desktop entries breakdown:**

| Entry | SPEC mapping |
|-------|-------------|
| `M docs/guardian/GUARDIAN_ALERTS.md` | SPEC §2.6 Bucket X file 1 — Sentinel auto-write, HEAD is newer per SPEC; restore from HEAD is correct |
| `?? _archive/pr-drafts/` (1 file, 6.8KB) | SPEC §3 S5 — delete (Daniel pre-authorized) |
| `?? modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_INVENTORY_MOCKUP_1TO1_BRIEF.md` | SPEC §3 S6 — commit (12.9KB, dated 2026-05-17) |
| `?? .../M1_LENS_INVENTORY_UNIFIED_FLOW_BRIEF.md` | SPEC §3 S6 — commit (15.1KB) |
| `?? .../M1_LENS_MOCKUP_FIDELITY_REBUILD_BRIEF.md` | SPEC §3 S6 — commit (16.3KB) |
| `?? modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_2026_05_18/` | The SPEC folder itself (Commit 5 closeout) |

**NOT present on desktop:**

- The 2,233 "Bucket B (pure CRLF rot)" files — **0 of 2,233 present**. The bulk-restore commit (SPEC Commit 1, "2,339 files VM-rot/stale cleanup") would be a complete no-op on desktop.
- The 104 "Bucket S (stale-disk)" files — **0 of 104 present**.
- The 8 M4 CRM cutover QA harness files (SPEC §3 S7, Commit 3) — searched via `find . -iname "*cutover*"`, `find . -iname "*qa-harness*"`, `find . -path "*M4*" -name "*.md"`, plus repo-wide grep for `m4-crm-cutover|cutover-qa-harness`. Only hits are the SPEC + activation prompt themselves. **8 of 8 absent**. The `_archive/m4-crm-cutover-qa-harness-2026-04-29/` directory does not exist; M4 module's `docs/specs/` contains tracked `PRE_CUTOVER_QA_*` SPEC folders, not loose untracked QA files.
- The 2nd Bucket X file (`_archive/launch-plan-draft-superseded-2026-05-15/campaign-overseer/DECISIONS_LOG.md` orphan-path issue) — not in desktop's `git status`. `_archive/launch-plan-draft-superseded-2026-05-15/` exists as a tracked directory; no working-tree drift.

**Interpretation:** the 2,340 "modifications" the Cowork-side Architect classified were **100% Cowork-FUSE-mount snapshot artifacts**. The bulk-restore commit the SPEC authorizes (Commit 1) has nothing to restore. The 8 M4 QA files the SPEC wants to archive are not on desktop and may also be Cowork-only. The 3 actually-applicable items (3 Briefs commit, pr-drafts delete, GUARDIAN_ALERTS restore) are present and within the SPEC's intent.

This finding is itself the strongest possible confirmation of the Phase 5 lesson the SPEC wanted to capture: **Cowork-VM-side classification cannot be trusted for destructive ops; the desktop is the source of truth.**

**What I tried:**

- Full First Action sequence (`git remote -v`, branch, HEAD, fetch, status) — all pass except for the count mismatch
- Integrity gate `npm run verify:integrity` — exit 0, "All clear, 4 files scanned in 2ms" (corroborates absence of widespread null-byte/CRLF corruption on desktop)
- Located all 4 applicable desktop items and confirmed sizes/contents match SPEC expectations
- Searched repo for the 8 M4 QA files (3 search strategies + grep) — 0 hits
- Verified `.git/` has no ghost lock files
- Verified `_archive/pipeline-sessions/` has no active session locks (safe to proceed coordination-wise)
- Did NOT touch any file. Did NOT run any `git checkout`, `rm`, `mv`, or commit.

**Options I see:**

- **Option A — Execute a reduced-scope SPEC (3 commits instead of 5).** Skip Commit 1 entirely (bulk restore is a no-op on desktop). Skip Commit 3 (8 M4 QA files don't exist on desktop). Execute Commit 2 (3 Briefs), a one-file restore (`git checkout HEAD -- docs/guardian/GUARDIAN_ALERTS.md` — or leave it for Sentinel to overwrite on next run), Commit 4 (Phase 5 skill+CLAUDE.md edits — STILL HIGH VALUE), and Commit 5 (closeout with EXECUTION_REPORT noting what happened). _Pros:_ delivers the real Phase 5 lesson + clears the desktop's actual debt; SPEC ID preserved for traceability. _Cons:_ requires Cowork-Architect to amend §4 Destructive Operations list (current list authorizes ops that won't run) + §9 Commit Plan; success criteria S2/S3/S7 become "N/A scope-not-present" rather than meeting their stated values.

- **Option B — Close SPEC as no-op-with-lesson, write a Phase-5-only follow-up SPEC.** Close REPO_CLEANUP_2026_05_18 with EXECUTION_REPORT noting "Phase 1 classification did not survive desktop re-verification → SPEC declared no-op for cleanup phases". Then a small follow-up SPEC `VM_ROT_DETECTION_PROTOCOL_2026_05_18` captures Phase 5 (skill + CLAUDE.md edits) cleanly. The 3 desktop items (Briefs commit, pr-drafts delete, GUARDIAN_ALERTS restore) become 3 small ad-hoc commits on develop, no SPEC needed. _Pros:_ keeps each SPEC's classification valid w.r.t. its own scope; the high-value Phase 5 lesson is captured under a SPEC name that matches its actual scope. _Cons:_ more SPEC overhead; the 3 desktop items lose SPEC-folder traceability.

- **Option C — Stop fully and wait for Cowork-Architect to dispatch a corrected SPEC.** Don't write any commit. Hand back to Cowork-Architect to re-author Phase 1 from desktop ground truth, then dispatch the corrected SPEC. _Pros:_ preserves SPEC discipline cleanly; no scope creep mid-execution. _Cons:_ ~30-60 min round-trip cost; the desktop sits with its 6 entries until that round-trip completes; risk that Cowork-Architect rewrites Phase 1 again from FUSE-mount-stale state and the cycle repeats.

- **Option D — Execute the SPEC as-written, treating absent buckets as auto-success.** SPEC §10 Rollback Plan says "If Pipeline fails mid-execution: Bucket B/S restorations are reversible by re-reading from FUSE mount" — the SPEC anticipates that the bulk restore may be reversible/empty. Interpret S2/S3/S7 as "0 files in scope → criterion vacuously satisfied". Run Commits 2 + 4 + 5 (skipping 1 + 3 as no-op-but-recorded). _Pros:_ adheres to literal SPEC commit plan minus no-ops; minimal Cowork round-trip. _Cons:_ silently reinterprets success criteria; future readers of EXECUTION_REPORT may misread "S2: 0 files restored" as "S2 not attempted". Closest to the stop-on-deviation discipline being relaxed.

**My recommendation:** **Option A** — Execute the reduced-scope SPEC. The Phase 5 lesson (VM-rot detection protocol applied to skills + CLAUDE.md) is the highest-value deliverable in the entire SPEC and is fully executable on desktop. The 3 desktop items map cleanly to SPEC intent. Skipping the no-op commits (1 + Commit 3's M4 archival) avoids fabricating bulk-restore activity that didn't actually happen. EXECUTION_REPORT honestly documents "S2: N/A — 0 Bucket B files present on desktop; SPEC classification reflected Cowork-FUSE-mount state, not on-disk state."

**Question for Architect:** Should I proceed with Option A (reduced-scope: 3 desktop items + Phase 5 lessons, ~4 commits, deletes pr-drafts + commits 3 Briefs + restores GUARDIAN_ALERTS + applies Phase 5 skill/CLAUDE edits), or do you prefer Option C (stop fully, await re-authored SPEC)?

---

## Architect Decision (filled in by Architect from Cowork, then ingested by the paused skill)

**Resolution:** APPROVED — Option A with one variant (skip GUARDIAN_ALERTS restore + skip M4 archive). Full text in `modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_2026_05_18/ARCHITECT_DECISION_001_REDUCED_SCOPE.md`.

**Reasoning for Foreman/Executor:** Desktop is source of truth (CLAUDE.md §9 Multi-Machine). The 2,340-file mismatch IS Phase 5's predicted lesson — the SPEC was written under FUSE-stale evidence, and the executor's re-verification on the desktop empirically validated the protocol Phase 5 will codify. Cleanest possible validation: the Pipeline produced its own corrective lesson before any destructive commit landed. Skip Commit 1 (no-op, 0 of 2,339 present) + Commit 3b M4 archive (no-op, 8 of 8 absent) + GUARDIAN_ALERTS restore (Sentinel cron will overwrite anyway). Execute Commit 2 (3 Briefs), Commit 3 (`rm -rf _archive/pr-drafts/`), Commit 4 (Phase 5 governance edits — highest-value commit), Commit 5 (closeout).

**Resume instruction:** Execute 4 commits + closeout per ARCHITECT_DECISION_001 §"Phase 5 edits — exact specification". No SPEC amendment needed; reduced-scope execution is the resolution. Push to origin/develop when done. Cowork-Architect takes over for FOREMAN_REVIEW.md and final Hebrew summary post-push.

---

## Resolution log

Once the Architect's decision is pasted in above AND the pipeline successfully resumes, prepend `RESOLVED_` to this file's name (per Brief Contract E — Escalation File Lifecycle, never deleted).
