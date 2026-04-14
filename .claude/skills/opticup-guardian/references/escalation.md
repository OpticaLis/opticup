# Optic Up — Escalation Protocol

## The Chain

```
Code Writer → Secondary → Module Strategic → Main Strategic → Daniel
```

Every escalation moves UP one level. Never skip levels. Never escalate sideways.

---

## What Goes to Each Level

### Code Writer → Secondary
- "The prompt says X but the file shows Y" (deviation from prompt)
- "Pre-commit hook failed with this error" (execution failure)
- "I found an unrelated issue in file Z" (out-of-scope finding)
- "The function doesn't exist where the prompt says it should be" (missing prerequisite)

### Secondary → Module Strategic
- "The SPEC assumption doesn't match reality" (SPEC gap)
- "Code Writer hit a deviation I can't resolve from the SPEC" (unresolvable deviation)
- "Phase step X completed but step Y has unclear success criteria" (SPEC ambiguity)

### Module Strategic → Main Strategic
- "This decision affects another module" (cross-module impact)
- "I need a rule interpretation" (rule ambiguity)
- "The SPEC needs architectural input" (design decision)
- "Phase completion — here's the integration ceremony checklist" (phase boundary)

### Main Strategic → Daniel
**Only these categories reach Daniel:**
- Scope changes (adding/removing features or modules)
- Business direction (which module next, product priorities)
- Rule changes (adding, modifying, or removing any of the 30 rules)
- SQL Level 3 approval (schema changes, RLS modifications)
- Production deployment approval (merge to main)
- Budget/resource decisions

**These should NEVER reach Daniel:**
- Technical implementation details
- File names, line numbers, function names
- Which pattern to use for a UI component
- How to structure a SQL query
- Debugging details
- SPEC structure decisions

---

## Self-Verification Gate (Pattern 14)

Before ANY escalation, the escalating role MUST:

1. **Check documentation first:**
   - CLAUDE.md (rules)
   - GLOBAL_MAP.md (functions, contracts)
   - GLOBAL_SCHEMA.sql (DB schema, security findings)
   - MODULE_SPEC.md (business logic)
   - SESSION_CONTEXT.md (current status)
   - TROUBLESHOOTING.md (known issues)

2. **Check memory system** — has this been answered before?

3. **State what was checked:** Every escalation must include:
   > "I checked [list of docs]. The answer is not there because [reason]."

If the answer IS in the documentation → use it. Do not escalate.

---

## Escalation Format

When escalating, use this structure:

```
ESCALATION FROM: [role] → [target role]
TOPIC: [one line]
CONTEXT: [2-3 sentences max]
DOCS CHECKED: [list]
QUESTION: [one specific question]
OPTIONS (if any): [A, B, C with tradeoffs]
```

One question per escalation. Never batch multiple questions.

---

## Emergency Stop

Any role can trigger an emergency stop if:
- A security rule (8, 14, 15, 22, 23) would be violated
- Production data would be affected
- A destructive git operation is about to happen
- Cross-tenant data leakage is possible

Emergency stop = halt all work, report to Main Strategic immediately.
Main Strategic decides whether to escalate to Daniel.

---

## De-escalation

Not everything needs to go up. Before escalating, ask:

1. "Is this in my role's authority?" → If yes, decide and move on.
2. "Is this covered by the approved plan?" → If yes, follow the plan.
3. "Is this a deviation?" → If yes, stop and escalate.
4. "Is this a new decision?" → If yes, escalate.
5. "Am I uncertain?" → Check docs first (Pattern 14). If still uncertain, escalate.
