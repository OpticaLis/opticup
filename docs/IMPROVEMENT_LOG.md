# Improvement Log

> Every problem that takes longer than it should is a system failure, not a one-time event.
> Fix the system, not just the symptom.
>
> Protocol: see `.claude/skills/opticup-guardian/references/improvement-flow.md`

---

## Active

_No active entries._

---

## Completed

### IMP-2026-04-12-spec-sweep
**Triggered by:** Main Strategic during Module 3 Phase B root cause analysis
**Category:** SPEC_GAP
**What happened:** Phase B SPEC was written based on incomplete reading of project docs. Included 7 tables for RLS fixes, but MASTER_ROADMAP and GLOBAL_SCHEMA.sql clearly listed additional tables. Scope correction mid-execution.
**Time cost:** ~3 hours of escalation chain + frozen Secondary Chat
**Root cause:** SPEC authors didn't cross-reference all documented debt before writing the plan (RC-1)
**Fix:** Mandatory "Sources checked" section in every SPEC. Minimum: MASTER_ROADMAP §5-§6, GLOBAL_SCHEMA.sql security findings, TECH_DEBT.md, SESSION_CONTEXT.md.
**Fix type:** process
**Implemented:** April 2026 — added to SPEC writing requirements

### IMP-2026-04-12-column-exists
**Triggered by:** Secondary Chat during §1.1 execution
**Category:** SPEC_GAP
**What happened:** SPEC assumed tenant_id column existed on 4 tables. Gate 2 discovered it didn't. Execution stopped.
**Time cost:** ~1 hour escalation
**Root cause:** SPEC prerequisite check didn't verify column existence (RC-3)
**Fix:** SPEC prerequisite gate: "Does the column exist?" — verify via GLOBAL_SCHEMA.sql or live DB query before writing RLS fix SQL.
**Fix type:** process
**Implemented:** April 2026 — added to SPEC writing requirements

### IMP-2026-04-12-doc-before-escalation
**Triggered by:** Main Strategic during escalation chain analysis
**Category:** ESCALATION_LEAK
**What happened:** When Gate 2 failed, the escalation went Secondary → Module Strategic → Main → Daniel. Nobody checked GLOBAL_SCHEMA.sql first, which had the answer.
**Time cost:** Daniel received a technical question that wasn't strategic
**Root cause:** No self-verification protocol before escalation (RC-4)
**Fix:** Pattern 14 (Self-Verification) — before ANY escalation, check project documentation first. Must state "I checked [list of docs]. The answer is not there."
**Fix type:** process
**Implemented:** April 2026 — added to handoff protocol and guardian skill escalation flow

### IMP-2026-04-12-roadmap-contradiction
**Triggered by:** Main Strategic during root cause analysis
**Category:** DOC_DRIFT
**What happened:** MASTER_ROADMAP §5 lists SF-2 as a finding. §6 says it's NOT a finding (verified by Daniel). Both coexist in the same file.
**Time cost:** Confusion about actual scope during SPEC writing
**Root cause:** Retracted finding wasn't removed from original location (RC-2)
**Fix:** Mark SF-2 as RETRACTED in §5 with pointer to §6.
**Fix type:** doc
**Status:** Pending — fix ready, needs separate commit

### IMP-2026-04-12-cowork-migration
**Triggered by:** Main Strategic after context exhaustion
**Category:** CONTEXT_LOSS
**What happened:** Module 3 Strategic Chat went through two full handoffs within Phase B alone. Context window capacity exceeded.
**Time cost:** Handoff overhead, potential for dropped context
**Root cause:** Chat-based architecture can't sustain long multi-phase execution (RC-5)
**Fix:** Migration to Cowork mode with persistent memory system and guardian skill.
**Fix type:** tool
**Implemented:** April 2026 — Cowork active, guardian skill created, memory system operational

---

## Deferred

_No deferred entries._
