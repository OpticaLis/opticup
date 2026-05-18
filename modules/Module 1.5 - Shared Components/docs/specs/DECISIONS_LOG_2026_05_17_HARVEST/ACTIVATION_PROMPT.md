# ACTIVATION_PROMPT — DECISIONS_LOG_2026_05_17_HARVEST

**Paste into Claude Code session on Windows desktop.**

---

Append 2 decision entries to `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` so the Supervisor can cite them in future triage.

Both entries codify lessons learned during the 2026-05-17 REPO_CLEANUP_2026_05_18 Pipeline + its follow-ups (commits 23ce2ea, 72a7a9e, 139fd44, 7269a1a). The SKILL.md edits landed but the DECISIONS_LOG didn't get the corresponding entries — closing that gap now.

---

## Edit — append to `.claude/skills/opticup-architect/references/DECISIONS_LOG.md`

**Find** the line `## 2026-05-17 — Supervisor Skill Phase 1 sealed + Parallel Pipeline Coordination sealed` (existing first entry under that date).

**Above it** (so today's entries stay grouped chronologically), insert these 2 entries:

```markdown
## 2026-05-17 — Cowork-Foreman push discipline + Closing-the-loop rule (REPO_CLEANUP follow-up)

**Situation:** Cowork-Architect wrote FOREMAN_REVIEW.md to outputs and emitted "🟢 SPEC closed" summary to Daniel before the FOREMAN_REVIEW commit existed in origin. Daniel had to manually identify the missing commit + push step. Root cause: skill Step 9 hand-off rule was ambiguous on "author vs land" — closure was treated as authoring complete, but the Pipeline definition of closed = origin contains the commit.

**My recommendation:** Codify two-phase closure (Phase A = author in Cowork outputs; Phase B = land in origin via Claude Code) into opticup-strategic SKILL.md. Strict format for Step 9 hand-off: Push instruction first (blocking), "🟢 closed" only after Daniel confirms push. Add "no closing summary before FOREMAN_REVIEW commit lands" to NEVER block. New ## Cowork Environment Constraints section with explicit Closing-the-loop discipline.

**Daniel's response:** Approved. Push commit 23ce2ea (54 insertions, 2 deletions) landed the 3 edits.

**Reason for agreement:** Cowork sessions cannot self-verify a push happened (no git writes from FUSE-bound sandbox); without explicit Phase B gate the Pipeline closes "blind" from Cowork's perspective. The cost of one extra Hebrew line ("חכה לאישור push") is trivial vs the cost of orphan artifacts on disk that never reach git history.

**Lesson (for Architect):** Closeout artifacts written from Cowork outputs are not yet "in the system" — they are FUSE-disk-only until Claude Code commits + pushes them. Treat every Pipeline closeout as a TWO-machine handoff, not a single Cowork action.

**Cross-references:**
- Commit: `23ce2ea` (chore(skills): enforce Cowork-Foreman push discipline)
- Activation prompt: `modules/Module 1.5 - Shared Components/docs/specs/COWORK_FOREMAN_PUSH_DISCIPLINE/ACTIVATION_PROMPT.md`
- Root-cause Pipeline: `modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_2026_05_18/`

---

## 2026-05-17 — Abnormal-state triage gate: dispatch-first over investigate-first (REPO_CLEANUP root-cause)

**Situation:** Cowork-Architect spent ~60 min running multi-file probes inside Cowork VM at session start (2,340 phantom modifications + ghost `.git/index.lock` + FUSE inconsistencies) and authored a 297-line SPEC under Cowork-FUSE evidence. The desktop reality, when finally checked by the executor: 6 modifications, no ghost lock. ~95% of the investigation work was wasted because Cowork's FUSE mount cannot reliably mirror desktop git state at scale when the snapshot is stale.

**My recommendation:** Add Step 0.7 "Abnormal-state triage gate" to opticup-strategic SKILL.md First Action. After Step 0.5 detects no ghost lock, but BEFORE any other reads, count modifications. If > 50 modified-tracked entries (excluding untracked Cowork-authored output), STOP self-investigation immediately. Write a 50-line INVESTIGATION_BRIEF to outputs for Claude Code, then hand off in Hebrew. Do NOT probe a 20-file sample to "verify" the count first — the sample is just as susceptible to FUSE staleness as the bulk classification.

**Daniel's response:** Approved. Push commits 139fd44 + 7269a1a landed Step 0.7 (65 insertions) + the activation prompt provenance.

**Reason for agreement:** Cowork's strength is read + plan + strategic conversation — NOT bulk file-state classification. The right default for any session-start anomaly is dispatch to desktop, not investigate locally. The 5-second `git status | wc -l` triage costs nothing; the 60-minute alternative cost ~95% wasted work today.

**Lesson (for Architect):** Reframe Cowork's role at session start to "triage + dispatch, then strategic." The Architect's job is not to be the investigator-of-last-resort when the VM is showing anomalies — the Architect's job is to recognize the anomaly class, hand it to the right executor, and resume strategic work after the executor reports back. Self-investigation at scale on a FUSE mount = anti-pattern.

**Cross-references:**
- Commit: `139fd44` (chore(skills): add Step 0.7 Abnormal-state triage gate)
- Commit: `7269a1a` (docs(spec): preserve ARCHITECT_DISPATCH_FIRST_DISCIPLINE activation prompt for provenance)
- Activation prompt: `modules/Module 1.5 - Shared Components/docs/specs/ARCHITECT_DISPATCH_FIRST_DISCIPLINE/ACTIVATION_PROMPT.md`
- Root-cause Pipeline: `modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_2026_05_18/` (Phase 5 governance edits in commit 7c93473)

---
```

---

## Commit + push

```powershell
cd C:\Users\User\opticup
git add .claude\skills\opticup-architect\references\DECISIONS_LOG.md
git add "modules\Module 1.5 - Shared Components\docs\specs\DECISIONS_LOG_2026_05_17_HARVEST\ACTIVATION_PROMPT.md"
git commit -m "docs(decisions): harvest 2 lessons from REPO_CLEANUP_2026_05_18 follow-ups for Supervisor citation"
git push origin develop
```

Report commit hash.

**Estimated wall clock: 5 min.**
