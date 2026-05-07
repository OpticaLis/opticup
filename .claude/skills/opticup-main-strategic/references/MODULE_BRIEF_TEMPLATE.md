# Module Brief — Template

> **Purpose:** Hand-off document from Main Strategic to Module Strategist. Short, scope-defining, decision-encoded.
> **NOT a SPEC.** Module Strategist authors the SPECs from this brief.
> **Target length:** 1-2 pages.

---

# Module {N} — {Name}

**Brief version:** v1
**Date:** {YYYY-MM-DD}
**Author:** Main Strategic
**Hand-off to:** Module Strategist (`opticup-strategic` skill)

---

## 1. Purpose (1 paragraph)

{What this module does in plain language. What user problem it solves. What it replaces in the legacy system if applicable.}

## 2. Scope — In

What MUST be in this module for LIVE-day readiness:

- {bullet 1 — concrete capability}
- {bullet 2}
- {bullet 3}
- ...

(Pulled from `MASTER_LIVE_PLAN.md` §4. Don't add new requirements without consulting Main Strategic.)

## 3. Scope — Out (anti-creep)

What is explicitly NOT in this module:

- {feature deferred to v2}
- {capability owned by another module — name it}
- {nice-to-have not required for LIVE}

## 4. Locked Decisions

These decisions are pre-locked. Do not relitigate without consulting Main Strategic.

| # | Decision | Source |
|---|---|---|
| 1 | {decision} | DECISIONS_LOG.md / MASTER_LIVE_PLAN §7 |
| 2 | {decision} | {source} |
| 3 | {decision} | {source} |

## 5. Dependencies

### Upstream (must exist before this module starts)

- {Module X} — {what's needed from it}
- {Module Y} — {what's needed from it}

### Downstream (waiting on this module)

- {Module Z} — {what they need from this module}

## 6. Cross-Module Contracts

These contracts MUST be honored. The Module Strategist may extend them but not break them.

- **Contract A:** {what shape, what consumer}
- **Contract B:** {what shape, what consumer}

## 7. Open Questions Specific to This Module

Questions Main Strategic could not resolve without deeper module knowledge. Module Strategist resolves with Daniel.

- {question 1}
- {question 2}

## 8. Anti-Patterns (Things to Avoid)

- {anti-pattern 1 — usually harvested from a previous module's lessons}
- {anti-pattern 2}

## 9. Iron Rules in Sharp Focus

Out of the 30 Iron Rules, these are the ones most likely to be tested by this module:

- {rule N} — {why}
- {rule M} — {why}

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `__LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md` §4 ({module}) | Full requirements |
| `__LAUNCH_PLAN_DRAFT__/access-audit/{relevant report}` | Source data structure |
| `docs/GLOBAL_MAP.md` | Existing functions to reuse (Iron Rule 21) |
| `docs/GLOBAL_SCHEMA.sql` | Existing schema |
| `CLAUDE.md` §4-§6 | Iron Rules |

## 11. Hand-off Note

Daniel takes this brief to a fresh session, activates `opticup-strategic` skill, and the Module Strategist:
1. Reads brief + references
2. Writes `modules/Module {N} - {Name}/ROADMAP.md` (phases)
3. Writes per-phase SPECs
4. Dispatches to Executor

Main Strategic stays out unless: cross-module decision, scope change, strategic blocker.

---

*End of brief. Module Strategist owns from here.*
