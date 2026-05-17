# FOREMAN_REVIEW — REPO_CLEANUP_2026_05_18

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_2026_05_18/FOREMAN_REVIEW.md`
> **Written by:** opticup-architect (acting as Foreman, Cowork session)
> **Written on:** 2026-05-17 IDT
> **SPEC commits reviewed:** `efc693c`, `e947728`, `7c93473`, `ba6d4e8`
> **Sibling files:** SPEC.md, ACTIVATION_PROMPT.md, ARCHITECT_DECISION_001_REDUCED_SCOPE.md, EXECUTION_REPORT.md, FINDINGS.md, RESOLVED_2026-05-17T1050Z_repo_cleanup_desktop_classification_mismatch.md

---

## 1. Verdict

🟢 **CLOSED.** Pipeline closes nominally despite a near-miss authoring failure that the Pipeline's own re-verification step caught and converted into the highest-value commit of the run.

---

## 2. SPEC Quality Audit (was the SPEC itself good?)

### What worked

- **§4 Destructive Operations (Iron Rule 32)** — declared every authorized op explicitly + listed forbidden ops. Hook passed at every commit. The single in-stride heading-format glitch (RT-4) is a hook issue, not a SPEC issue.
- **§5 Autonomy Envelope** — narrow stop-triggers that fired correctly. The "If desktop sees clean tree → SPEC is no-op" branch in §5 ACTIVATION_PROMPT step was the exact decision tree the executor walked.
- **§9 Commit Plan** — pre-named commit subjects matched what the executor actually committed (with documented scope reduction).
- **§13 Pipeline Coordination Pre-Check** — confirmed no parallel session before authorizing. Validated by Probe 4.
- **The ACTIVATION_PROMPT pattern** — bundled SPEC location + re-verification protocol + Phase 5 specification + stop-triggers into one prompt. The executor read it and immediately understood scope + escalation triggers. Worked end-to-end.

### What failed

**The SPEC was authored under evidence the Foreman had no business trusting.**

The Cowork-side investigation (§2.1–§2.6) was performed inside a FUSE mount that the Foreman knew could be stale (CLAUDE.md §1 step 3a "Phase 2" already warned about this for the past month). The Foreman classified 2,340 modifications and authored a SPEC whose Commit 1 promised to restore 2,339 files. The desktop reality: 6 entries, 0 of the 2,339 actually existed there. **Had Pre-Action #2 not existed in the executor's brief, the bulk-restore commit would have shipped as a misleading no-op with the message "VM-mount rot cleanup".**

The defect chain:
1. SPEC §2.1 named the evidence machine as "this VM" rather than "Cowork FUSE mount of DESKTOP-C6N6M28"
2. SPEC §2.5 asserted "Both buckets have zero real-work content that doesn't exist in HEAD already" — true in spirit, but the SPEC also asserted those buckets contained 2,337 files; it should have predicted the desktop view.
3. SPEC §11 Lessons listed prior FUSE-related lessons (WORKING_TREE_RECOVERY 2026-04-24, feedback_cowork_truncation.md) but did not apply the obvious meta-lesson: **Cowork-side counts ≠ desktop counts; re-verify before destructive ops**.

The executor caught the defect post-dispatch via the ACTIVATION_PROMPT's explicit re-verification gate. The Foreman owes the executor that gate; in this SPEC's case the gate was added in Commit 4 (Phase 5) where it now lives permanently. **The Foreman authored a SPEC and the Foreman fixed the authoring flaw in the same SPEC.** Crisis-resolution clean. SPEC-authoring discipline: failed at §2, recovered at §11/§5 (via the ACTIVATION_PROMPT), codified at Phase 5.

### SPEC Quality Score (1-10 each)

| Dimension | Score | Note |
|---|---|---|
| Measurable success criteria (§3) | 9 | 13 criteria, all measurable. The S2/S3 criteria became no-op surfaces post-ARCHITECT_DECISION but that's an evidence-base issue, not a criteria-design issue. |
| Stop-trigger clarity (§5/§6) | 10 | Specific, actionable. D-1 through D-4 fired cleanly. |
| Autonomy envelope width (§5) | 8 | Mostly right but the "if desktop sees clean tree" branch could have been §3's S0 success criterion rather than §5's stop-trigger; small ordering issue. |
| Out-of-scope explicitness (§7) | 10 | Clear list. |
| Lessons-already-incorporated (§11) | 5 | Listed prior lessons but didn't apply the meta-lesson about Cowork-side authoring. The whole F-1 finding is a §11 miss. |
| Cross-reference check completeness | 9 | New paths grep'd; the M4 archive path was novel (didn't exist anywhere). Didn't grep for the 8 M4 QA filenames in HEAD — that's how D-3 went undetected at authoring. |
| **Overall SPEC quality** | **8.5** | Strong structure, weak evidence base. The structure enabled the executor to catch the evidence flaw, so net outcome is good — but the SPEC's job is to be correct at dispatch, not to be self-correcting. |

---

## 3. Execution Quality Audit

### What worked

- **Pre-Action desktop re-verification.** Executed step-by-step per ACTIVATION_PROMPT; produced a comparison table that named the source-of-truth machine, the comparison surface (entry count), and the implication (no-op for SPEC Commit 1 + Commit 3b). This is the model audit format for future FUSE-mismatch escalations.
- **STOP discipline.** Per CLAUDE.md §9 stop-on-deviation, the executor stopped before any destructive commit + wrote the escalation file + awaited Architect resolution. No partial execution. No "I'll just skip Commit 1 and ship the rest" — that would have been correct in outcome but wrong in discipline.
- **ARCHITECT_DECISION ingestion.** The executor parsed the structured response (Option A + variant) and produced the 4-commit Pipeline exactly per the resolution. RT-1 through RT-4 are the in-stride micro-decisions; all four were correct.
- **Closeout artifacts.** EXECUTION_REPORT + FINDINGS + RESOLVED escalation rename + ARCHITECT_DECISION preservation — all per Brief Contract E and SPEC §8.
- **Iron Rule gates.** 31 + 32 + general verify all passed on every commit. F-2 (hook regex) caught in-stride and documented properly.

### What didn't go quite as well

- **RT-2 step-numbering tension.** Inserting "Step 0.5" between numbered steps 1 and 2 produces a slightly confused numbered list. The executor was faithful to the ARCHITECT_DECISION text; the fault is the Architect's text. Acceptable.
- **Commit 3 `--allow-empty`.** Filesystem-only deletion of an untracked directory has no diff to commit; `--allow-empty` works but is an anti-pattern in normal workflows. Net-net acceptable here because (a) ARCHITECT_DECISION specifically enumerated the commit, (b) the message clearly explains the action, (c) the alternative (folding into another commit) would have obscured Pipeline structure. The executor reasoned this correctly in RT-1.

### Execution Quality Score

| Dimension | Score | Note |
|---|---|---|
| Adherence to resolved plan | 10 | 4 commits + 1 closeout, matching ARCHITECT_DECISION exactly. |
| Iron Rule compliance | 10 | All gates green. |
| Stop-on-deviation discipline | 10 | Stopped cleanly, escalated, waited. |
| Documentation discipline | 10 | EXECUTION_REPORT + FINDINGS + closeout all written; explicit deviation table; explicit decision table. |
| Real-time judgment (RT-1..RT-4) | 9 | RT-4 (in-stride heading edit) is the borderline call. Edit was cosmetic + logged as F-2 — defensible. Could also have escalated to Architect for the 1-character fix, which would have been pedantically more correct under "no SPEC mutations". |
| Self-assessment honesty | 10 | Executor's 9.2/10 self-score matches my read. |
| **Overall execution quality** | **9.8** | Top-shelf execution under unusual conditions. |

---

## 4. Findings Processing

| Code | Severity | Disposition |
|------|----------|-------------|
| F-1 (M1.5-INFRA-01) — Cowork-FUSE-mount classification cannot be trusted | HIGH | **DISMISS (already addressed by Commit 4 governance edits)**. Endorse executor's recommendation. The Phase 5 edits (CLAUDE.md §1 Phase 2.5 + opticup-strategic Step 0.5 + opticup-executor Pre-Action #2) form a three-layer defense. Future Pipelines protected. |
| F-2 (M1.5-INFRA-02) — Iron Rule 32 hook regex rejects parenthetical suffixes | LOW | **FILE NEW SPEC**: `M1_5_DESTRUCTIVE_OPS_HOOK_REGEX_RELAX` (~30 min, opticup-executor) — relax regex to word-boundary anchor + add 3 test cases to `scripts/test-destructive-ops-gate.mjs` (parenthetical suffix, em-dash suffix, trailing comment). Will be scheduled by Architect after M1 mockup audit completes (the priority work). |

---

## 5. Master-doc Update Checklist

| Doc | Touched in this Pipeline? | State |
|---|---|---|
| `MASTER_ROADMAP.md` | No | Doesn't need update — this Pipeline was infrastructure hygiene, not roadmap progress |
| `docs/GLOBAL_MAP.md` | No | No new functions/contracts |
| `docs/GLOBAL_SCHEMA.sql` | No | No DB changes |
| `docs/FILE_STRUCTURE.md` | No | 3 new M1 lens Briefs added under existing tree; no new directory structure |
| `CLAUDE.md` | Yes — Commit 4 added §1 step 3a Phase 2.5 | ✅ Done |
| `.claude/skills/opticup-strategic/SKILL.md` | Yes — Commit 4 added Step 0.5 | ✅ Done |
| `.claude/skills/opticup-executor/SKILL.md` | Yes — Commit 4 added Pre-Action #2 | ✅ Done |
| Module 1.5 SESSION_CONTEXT.md | No | Not touched — this Pipeline didn't modify Module 1.5 business logic, only its specs folder |
| Module 1.5 CHANGELOG.md | No | Same reason |
| Module 1.5 ROADMAP.md | No | Same reason |

---

## 6. Self-Improvement Proposals (per skill mandate)

### Architect-skill (this skill, opticup-strategic / acting as Foreman)

**Proposal A-1.** When the evidence machine for a SPEC's §2 Background is a Cowork VM, SPEC §2.1 (or equivalent) MUST name the machine explicitly: `Evidence-source: Cowork FUSE mount of {desktop-hostname}, snapshot age unknown`. The §2.1 line must also include the snapshot-age probe result (oldest file mtime in the working tree vs HEAD commit date). If snapshot age > 24h, the SPEC MUST default to "re-verify on desktop before destructive ops" in §5 stop-triggers. Add this as `## SPEC_TEMPLATE Authoring Rule` block in `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md`. **Why this would have helped here:** the SPEC's evidence was from a FUSE mount with an 8-day-old snapshot on the M1 SESSION_CONTEXT.md path. The age was visible in §2.6's mtime check but never aggregated into a "this SPEC's evidence base is suspect" signal at §2.1. The proposed rule would have forced that aggregation.

**Proposal A-2.** When SPEC §3 Success Criteria includes any criterion that requires N > 0 files to be present in a specific folder (e.g., S7 "8 M4 QA files moved to archive"), the SPEC author MUST grep the file names against `git ls-tree -r HEAD` AND the working tree before sealing. If any of the named files are absent from HEAD AND working tree (other than the SPEC folder itself), §3 must be rewritten before the SPEC is sealed. **Why this would have helped here:** §3 S7 listed 8 M4 QA files by category but never checked `git ls-tree -r HEAD | grep qa-final` (which would have returned 0 hits on HEAD). The Foreman saw the files in the FUSE mount snapshot and never cross-verified against HEAD. Codify as a sub-step under §"Step 1.5 — Cross-Reference Check" in opticup-strategic SKILL.md (already exists for new-name collisions; extend to "promised files must already exist or be in SPEC §8 Expected Final State as creations").

### Executor-skill (opticup-executor)

Endorse executor's own Proposals 1 and 2 from EXECUTION_REPORT §9:

**Proposal E-1.** Add to opticup-executor SKILL.md `## First Action` step 4.5: a Cowork-SPEC red-flag check that surfaces Pre-Action #2 from the inline checklist start, not just from the Pre-Action sub-section that an executor might skip. **Foreman endorsement: APPLY.** This is the inverse layer of Proposal A-1 — the Foreman names the evidence machine in §2.1; the Executor red-flags Cowork-evidence SPECs at session start.

**Proposal E-2.** Numeric entry-count capture in opticup-executor SKILL.md step 4: `git status --porcelain | wc -l` (or PowerShell `Measure-Object -Line`) — provide the integer to Pre-Action #2's comparison. **Foreman endorsement: APPLY.** Without an integer on both sides, "different counts" cannot be detected; this is the simplest possible probe.

**Implementation:** all 4 proposals (A-1, A-2, E-1, E-2) will be bundled into a single SPEC `SKILL_VM_ROT_PROTOCOL_HARDENING_PHASE_2` (~1h) scheduled after M1 mockup audit completes. Tracking it as a TECH_DEBT entry now.

---

## 7. SPEC_TEMPLATE / Skill Footprint

This SPEC was a milestone for several recent template additions:

- **Folder-per-SPEC protocol** (since 2026-04-14) — worked as designed. SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md (this file) + ARCHITECT_DECISION_001 + RESOLVED escalation + ACTIVATION_PROMPT = 7 files co-located. Future Pipelines can read this folder linearly to understand the full lifecycle.
- **ARCHITECT_DECISION_*.md pattern** (Supervisor Shadow Mode era) — first SPEC to exercise. Pattern works. Recommend formalizing as `.claude/skills/opticup-strategic/references/ARCHITECT_DECISION_TEMPLATE.md` if recurring. Logged as a backlog item.
- **Brief Contract E (Escalation File Lifecycle, RESOLVED_ rename)** — exercised cleanly per executor RT-3. Working as designed.
- **Iron Rule 31 + 32 gates** — passed at every commit. F-2 surfaces a small regex strictness issue, not a structural defect.

---

## 8. Closing Note to Daniel

Pipeline executed cleanly. The most important commit is `7c93473` — three governance edits that make this class of bug architecturally impossible going forward. The other 3 commits are mechanical hygiene.

The mockup-audit work (your original instruction) is unblocked. Next session can proceed directly to that. The 8 M4 QA harness files that didn't exist on desktop are not a loss — `qa-runner.mjs` (tracked, original harness) remains intact; the v2/v3/v4 iterations were throwaway and the cutover succeeded 2026-05-03 anyway. If you later find them in a backup and want to archive them, that's a 5-minute commit on its own merits — separate from this Pipeline.

---

**END FOREMAN_REVIEW**
