# Optic Up — Continuous Improvement Flow

> Every problem that takes longer than it should is a system failure, not a one-time event.
> Fix the system, not just the symptom.

---

## The Principle

When something goes wrong — a bug that took too long to find, a deviation that shouldn't
have happened, a question that reached Daniel when it shouldn't have, a rule that was missed —
the fix has two parts:

1. **Fix the immediate problem** (tactical)
2. **Fix the system so it doesn't happen again** (strategic)

Part 2 is not optional. It's as mandatory as the fix itself.

---

## Trigger — When Does This Flow Activate?

Any time ANY of these happen:

- A problem took more than one escalation to resolve
- The same type of issue appeared for the second time
- An agent broke a rule that should have been caught earlier
- A SPEC had a gap that was discovered during execution (not during review)
- Daniel received a question that wasn't strategic
- Context was lost during a handoff
- Documentation was missing or contradictory
- A decision had to be reversed after work was already done

The role that encounters the trigger is responsible for logging it — regardless of
whether they can fix it themselves.

---

## The Flow — 4 Steps

### Step 1: CAPTURE (Any Role)

When you hit a trigger, log it immediately. Don't wait for the task to finish.

**Improvement Entry format:**

```
## IMP-[YYYY-MM-DD]-[short-id]

**Triggered by:** [role] during [what task]
**Category:** [see categories below]
**What happened:** [2-3 sentences — what went wrong]
**Time cost:** [how much extra time did this take — rough estimate]
**Root cause:** [why did this happen — not the symptom, the cause]
**Proposed fix:** [what system change would prevent this]
**Fix type:** [rule | skill | doc | hook | process | tool]
**Priority:** [CRITICAL — blocks work | HIGH — slows work | MEDIUM — friction | LOW — nice to have]
```

### Step 2: REVIEW (Main Strategic)

Main Strategic reviews improvement entries and decides:

- **Accept** — the proposed fix is correct, proceed to implement
- **Modify** — the fix needs adjustment (Main Strategic provides direction)
- **Defer** — valid but not now (add to backlog with reason)
- **Reject** — not a system problem, was a one-time event (with explanation)

For CRITICAL and HIGH: review within the same session if possible.
For MEDIUM and LOW: review at next phase boundary.

### Step 3: IMPLEMENT (Depends on Fix Type)

| Fix Type | Who Implements | What Changes |
|---|---|---|
| rule | Main Strategic proposes to Daniel | CLAUDE.md updated, guardian skill updated |
| skill | Main Strategic or Module Strategic | Skill files updated |
| doc | The role closest to the documentation | Relevant .md files updated |
| hook | Code Writer (with Module Strategic approval) | Pre-commit hooks or verify scripts updated |
| process | Main Strategic | Escalation protocol, role definitions, or flow updated |
| tool | Code Writer (with Module Strategic approval) | New script or automation added |

Every implementation includes:
- The change itself
- Update to the guardian skill if rules or roles are affected
- A note in the improvement log that the fix was applied

### Step 4: VERIFY (QA Reviewer or Main Strategic)

After implementation, verify:

- Does the fix actually prevent the original problem?
- Did the fix introduce new friction?
- Is the fix documented where the next agent will find it?
- If it's a new rule — is it in CLAUDE.md, guardian skill, AND rules-quick.md?

---

## Categories

| Category | Description | Examples |
|---|---|---|
| SPEC_GAP | SPEC was missing information that caused execution failure | RC-3: SPEC assumed columns existed |
| DOC_DRIFT | Documentation was wrong, outdated, or contradictory | RC-2: MASTER_ROADMAP §5/§6 contradiction |
| ESCALATION_LEAK | Question reached wrong level (usually too high) | RC-4: Technical question reached Daniel |
| RULE_MISS | A rule was broken that should have been caught | Agent used innerHTML, pre-commit didn't catch it |
| CONTEXT_LOSS | Information lost during handoff or session change | RC-5: Context exhaustion in Module 3 |
| REPEAT_ISSUE | Same type of problem appeared again | Second time a SPEC missed table prerequisites |
| TOOL_GAP | No tool exists to catch or prevent this class of error | No RLS audit script before Phase B |
| SCOPE_CREEP | Work expanded beyond approved plan without authorization | Secondary fixed unrelated issues during phase |

---

## The Improvement Log

Location: `docs/IMPROVEMENT_LOG.md` in the repo.

Structure:
```markdown
# Improvement Log

## Active
[entries being worked on]

## Completed
[entries that were implemented and verified]

## Deferred
[entries accepted but postponed, with reason and target date]
```

This log is the single source of truth for all system improvements.
It is reviewed at every phase boundary during Integration Ceremony.

---

## Connection to Existing Patterns

This flow builds on what already exists:

- **Pattern 14 (Self-Verification)** was born from RC-4 in Module 3 investigation.
  That was an improvement — this flow makes that process repeatable.
- **Pre-commit hooks** were born from the need to catch rule violations automatically.
  Each new hook is an improvement entry that was implemented.
- **The "Sources checked" requirement** for SPECs was born from RC-1.
  Same pattern — problem → system fix → prevention.

The difference now: this is no longer ad-hoc. Every problem feeds into the same pipeline.

---

## Success Metric

The system is improving if:
- The same category of problem appears less frequently over time
- Problems are caught at lower levels (Code Writer catches what used to reach Module Strategic)
- Daniel receives fewer questions per module than the previous module
- Time from problem detection to system fix is decreasing
- The improvement log grows in "Completed" and shrinks in "Active"
