# Supervisor Skill (משגיח) — Architecture Brief

**Brief version:** v1
**Date:** 2026-05-17
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Module Strategist (`opticup-strategic`) → 3-phase SPEC chain
**Owning module:** Module 1.5 — Shared Components (cross-module infrastructure)

---

## 1. Purpose

Build a new skill — **`opticup-supervisor`** (Hebrew: משגיח) — that sits **between** the Pipeline (Executor/Reviewer/Tester) and Daniel, and answers questions on Daniel's behalf when the answer already exists in the project's DECISIONS_LOG history.

The Supervisor is **NOT** a new decision-maker. It is a **lookup + retry + harvest** layer. It never invents new strategic decisions; it only:
1. Searches DECISIONS_LOG for answers to escalations.
2. Triggers automated retry-with-alternative when verification fails.
3. Detects recurring patterns and proposes skill updates (Daniel approves with one click).

The end-goal is **autonomous Pipeline execution** during periods when Daniel is unavailable, with full reversibility on any destructive step.

The skill is designed to be **portable to future projects** via Core/Adapter separation from day one.

## 2. Current Pain (Daniel's words, 2026-05-17)

1. **"בנו משהו אחר לגמרי":** M1 expansion Pipeline ran autonomously, deviated from approved sketches, cost a full day of rework. No supervisor caught the drift mid-run.
2. **"עוצרים עם סיבה שלא נראת לי מספיק חשובה":** Skills escalate to Daniel for questions already answered in DECISIONS_LOG. Daniel becomes a manual lookup tool.
3. **"אני מחפש צוות אוטונומי מלא":** Daniel wants to reuse this team on future projects. Today's skills are project-aware; learning loop requires Daniel.
4. **"גיבוי לפני שינוי הרסני":** Today snapshot/rollback exists but is invoked manually. Daniel wants automated "try-verify-rollback-try-again" loop before any human escalation.

## 3. Scope — In (3 phases)

### Phase 1 — Triage + DECISIONS_LOG Resolver
The Supervisor reads escalation files written by Pipeline skills. For each escalation:
- Searches `references/DECISIONS_LOG.md` + `references/decisions/*.md` + project-wide `CLAUDE.md` + `MASTER_ROADMAP.md` for answers.
- If finds a clear, applicable answer → writes an `ARCHITECT_DECISION_*.md` response file in the same escalation folder + emits Hebrew status to Pipeline ("✅ פתור מ-DECISIONS_LOG entry #N — תמשיך"). Pipeline resumes automatically.
- If no clear answer OR answer is ambiguous → escalates to Daniel as today.
- Logs every triage decision (resolved-from-log / escalated-to-Daniel) to `_archive/supervisor-log/{ISO_DATE}.md` for audit.

**Strict rule:** Supervisor never invents a decision. If the DECISIONS_LOG doesn't cover the question unambiguously, it escalates. Better to ask Daniel than to fabricate.

### Phase 2 — Retry-with-Alternative + Snapshot/Rollback
When a Pipeline verification fails (smoke test, Localhost-Tester VFV, integrity gate, etc.), the Supervisor:
- Takes a git snapshot tag before any retry (`pre-supervisor-retry-{SPEC}-{N}`).
- Re-reads the SPEC + the failure output.
- Proposes an alternative approach via the Executor skill chain.
- Verifies again. If pass → continues Pipeline. If fail → rolls back to snapshot.
- Up to **3 retry attempts** total before escalating to Daniel.
- Each retry attempt is logged with: original approach, alternative tried, why it failed, rollback completed yes/no.

**Strict rule:** Retry only applies to **non-destructive verification failures** (failed test, missing element, wrong color, layout drift). Destructive operations (DROP, file delete, force-push, rebase) NEVER auto-retry — they always escalate per Iron Rule 32.

### Phase 3 — Auto-Harvest + Pending-Promotions Inbox
After every SPEC closure (FOREMAN_REVIEW.md written), the Supervisor:
- Reads the SPEC's full lifecycle (SPEC.md, EXECUTION_REPORT.md, FINDINGS.md, FOREMAN_REVIEW.md, supervisor log).
- Identifies recurring failure patterns (Triage events resolved, retry attempts, common escalation topics).
- Cross-references against existing patterns in opticup-architect / opticup-strategic / opticup-executor SKILL.md.
- If a pattern fires 3+ times across SPECs → writes a **promotion proposal** to `_archive/supervisor-pending-promotions/{ISO_DATE}_{PATTERN_SLUG}.md`.
- Each proposal includes: pattern observed, 3 source SPECs, recommended skill destination, exact text to add, classification Core vs Project-Adapter.
- Daniel reviews pending-promotions inbox at his convenience. One-click approve → Supervisor applies the edit + updates Pattern Recurrence Tracker.

**Strict rule:** Supervisor never auto-applies a skill edit. Proposals only. Daniel approves manually.

## 4. Scope — Out

- **No new SPEC authoring** (Strategic owns that).
- **No code execution** (Executor owns that).
- **No code review** (Reviewer owns that).
- **No runtime verification** (Localhost-Tester owns that).
- **No cross-module strategic decisions** (Architect owns that, with Daniel).
- **No destructive operations** ever. Even rollback uses git tags, never `rm` or `DROP`.
- **No edits to `main` branch.**
- **No DECISIONS_LOG writes.** Only reads. New decisions belong to Architect + Daniel.

## 5. Destructive Operations

**None.** The Supervisor performs only:
- Read operations (file reads, DECISIONS_LOG searches).
- Write operations confined to: `_archive/supervisor-log/`, `_archive/supervisor-pending-promotions/`, escalation response files (`ARCHITECT_DECISION_*.md` siblings to escalation files).
- Git tag creation for rollback safety.
- Git rollback to existing tag (reversible operation — restores prior tag's state).

Skill edits (Phase 3) are gated on Daniel's manual approval and use `Edit` tool — reversible via git revert.

## 6. Core/Adapter Separation (project-portability)

The Supervisor is built in two layers from day one:

### Core layer (project-agnostic)
Lives in `.claude/skills/opticup-supervisor/core/`. Files:
- `triage-protocol.md` — how to read an escalation file, search a decisions log, write a response.
- `retry-protocol.md` — snapshot → retry → verify → rollback loop logic.
- `harvest-protocol.md` — pattern detection, 3-strike rule, proposal generation.
- `escalation-format.md` — required fields in any escalation file (universal).

### Adapter layer (Optic Up specific)
Lives in `.claude/skills/opticup-supervisor/adapters/opticup/`. Files:
- `decisions-log-paths.md` — where to find decisions in this project (`references/DECISIONS_LOG.md`, `references/decisions/*.md`, CLAUDE.md, MASTER_ROADMAP.md).
- `skill-destinations.md` — which skill file each pattern type goes to.
- `verification-criteria.md` — what counts as "verification failed" in this project (smoke 7/7, VFV, integrity gate).
- `snapshot-recipe.md` — how to make a git tag in this repo's conventions.

**For a future project:** copy the Core unchanged. Write a new Adapter folder pointing at the new project's decision-history files and verification commands. Same Supervisor skill, new project.

## 7. Success Criteria

The Brief is delivered correctly when the resulting SPECs produce:

1. New skill file `.claude/skills/opticup-supervisor/SKILL.md` (description + triggers + bootstrap + protocols summary).
2. Core protocol files (`core/triage-protocol.md`, `core/retry-protocol.md`, `core/harvest-protocol.md`, `core/escalation-format.md`).
3. Adapter files for Optic Up (`adapters/opticup/*`).
4. Updates to existing Pipeline skills (`opticup-executor`, `opticup-reviewer`, `opticup-localhost-tester`) to write escalations in the standardized format and ping the Supervisor before pinging Daniel.
5. New folders created (not committed empty — but `.gitkeep` if needed): `_archive/supervisor-log/`, `_archive/supervisor-pending-promotions/`.
6. CLAUDE.md §11 Autonomous Mode updated to describe the Supervisor layer.
7. One end-to-end test run on a small SPEC where the Supervisor catches an escalation that's already covered by an existing DECISIONS_LOG entry, resolves it, and the Pipeline continues without Daniel intervention.

## 8. Phasing (recommended split across 3 SPECs)

- **SPEC 1 — Core + Triage:** Build skill skeleton, Core layer, Optic Up adapter for decisions-log lookup, Triage protocol. Wire Executor/Reviewer/Tester to ping Supervisor before Daniel.
- **SPEC 2 — Retry + Snapshot:** Add retry-with-alternative loop + automatic snapshot/rollback. Verify on a known-failing SPEC pattern.
- **SPEC 3 — Harvest + Pending-Promotions:** Add pattern detection + proposal generation. Build the pending-promotions inbox UI in CLAUDE.md docs.

Each SPEC is independently shippable. Daniel can choose to stop after SPEC 1 or 2 if value is sufficient.

## 9. Risks + Mitigations

| Risk | Mitigation |
|---|---|
| Supervisor misreads DECISIONS_LOG and resolves an escalation wrongly | Strict rule: any ambiguity → escalate to Daniel. Logged for audit. Phase 1 includes 1-week shadow mode where Supervisor logs proposed resolutions but Daniel still gets the escalation. |
| Retry-with-alternative gets stuck in a loop | Hard cap: 3 attempts. After 3rd failure, mandatory escalation. |
| Auto-harvest proposes wrong skill edits | Proposals never auto-applied. Daniel approves manually. |
| Project-portability becomes false promise (Core leaks Optic Up specifics) | Brief mandates the Core/Adapter separation from day one. Reviewer skill must audit Core for project-specific terms. |
| Skill conflict with existing strategic skill (which already does post-execution review) | Supervisor reads FOREMAN_REVIEW after Strategic writes it. No overlap on authoring or review — only on harvest synthesis and pattern detection. |

## 10. Pre-Flight (for SPEC authoring)

Before SPEC 1 begins, the Module Strategist must:
1. Read this Brief end-to-end.
2. Read `.claude/skills/opticup-architect/SKILL.md` to understand the existing escalation flow.
3. Read `.claude/skills/opticup-strategic/SKILL.md` to verify no overlap with current Foreman responsibilities.
4. Read `references/DECISIONS_LOG.md` + a sample of `references/decisions/*.md` to confirm the format Supervisor must parse.
5. Confirm with Architect (Cowork chat) before any destructive change to other skill files.

## 11. Shadow Mode → Active Mode (Daniel-locked 2026-05-17)

**3-day Shadow Mode** before Active. During Shadow:
- Every escalation is processed by both Supervisor (logs proposed resolution) AND Daniel (gives actual resolution).
- Supervisor's log file at `_archive/supervisor-log/shadow-{ISO_DATE}.md` records side-by-side:
  - Escalation question
  - Supervisor's proposed resolution + confidence score (1-5) + which DECISIONS_LOG entry it cited
  - Daniel's actual resolution
  - **Match / Mismatch** classification
- After day 3: compute accuracy rate. If ≥80% match AND no high-confidence mismatches → flip to Active. If <80% OR any 5-confidence-mismatch → extend Shadow + investigate.

## 12. Learning Loop (mandatory during Shadow + Active)

### 12.1 Confidence Score on every resolution
Every Supervisor resolution carries a confidence score 1-5:
- **5:** Exact DECISIONS_LOG entry quoted verbatim, situation is identical.
- **4:** Clear DECISIONS_LOG entry, situation is close-analog.
- **3:** Multiple DECISIONS_LOG entries point same direction, no single one is exact.
- **2:** One DECISIONS_LOG entry partially applies; significant inference.
- **1:** Pattern inferred from multiple sources, no single one decisive → should escalate.

**Hard rule:** Confidence ≤ 2 → escalate, do not auto-resolve. Even in Active mode.

### 12.2 Reverse-harvest (when Daniel chooses differently)
Every Shadow-mode mismatch + every Active-mode-Daniel-override generates an automatic `_archive/supervisor-pending-promotions/reverse-{ISO_DATE}_{TOPIC}.md` proposal:
- What Supervisor proposed + reasoning
- What Daniel chose + reasoning (asked from Daniel in chat: "למה X ולא Y?")
- Recommended Adapter update (which lookup rule changed, which DECISIONS_LOG entry needs clarification, which new rule belongs in the Adapter)
- Daniel approves with one click → Supervisor updates its own Adapter files.

This is how the Supervisor improves itself **without Daniel writing skill code**.

### 12.3 Weekly accuracy snapshot
Every 7 days (active mode), Supervisor writes `_archive/supervisor-log/weekly-{ISO_DATE}.md`:
- Total escalations processed
- Auto-resolved count + accuracy (via Daniel post-hoc review of a 10% sample)
- Retry attempts triggered + success rate
- Patterns proposed for promotion + Daniel-approval rate
- Drift signals: any escalation type the Supervisor consistently mishandles

Weekly report goes to Architect (this skill) on next Cowork session for cross-skill harvesting.

### 12.4 Mistake taxonomy
Every Supervisor mistake (any mismatch + any rejected proposal) is classified:
- **A — Lookup miss:** the DECISIONS_LOG had the answer; Supervisor didn't find it. Fix: improve search heuristic in Adapter.
- **B — Lookup wrong-match:** Supervisor found an entry but applied it to wrong context. Fix: tighten entry-applicability rules.
- **C — Genuine novelty:** the question wasn't in DECISIONS_LOG. Fix: not a mistake — confirm the escalation was correct, log new decision when Daniel resolves.
- **D — Confidence miscalibration:** Supervisor was high-confidence but wrong. Fix: review what made it falsely confident; add anti-pattern to Adapter.

Each mistake gets a taxonomy tag in its log entry. Weekly report aggregates by tag.

## 13. Daniel-locked Decisions (2026-05-17)

1. **Decision sources Supervisor reads (in priority order):**
   - `references/DECISIONS_LOG.md` (top-level index) — canonical, max confidence allowed.
   - `references/decisions/CROSS.md` — cross-module decisions, canonical, max confidence allowed.
   - `references/decisions/M{N}.md` — per-module decisions, canonical, max confidence allowed.
   - `CLAUDE.md` + `MASTER_ROADMAP.md` — project rules, canonical, max confidence allowed.
   - Auto-memory `MEMORY.md` + files it indexes — **read-only**, **confidence capped at 3** (auto-memory reflects Daniel's preferences but is not canon). If confidence cap fires → escalate.

2. **Search order in Triage protocol:**
   - Look in canonical sources first. If found → resolve.
   - Only consult auto-memory if canonical sources had no match → can resolve only at confidence ≤ 3 → mandatory escalate per §12.1 hard rule.
   - Net effect: auto-memory is a hint source, never a deciding source.

---

**End of Brief.**
