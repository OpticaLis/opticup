# Daniel's Quick Reference — Optic Up Working Method

> One-page cheat sheet for the 4-layer chat hierarchy. Open this when you forget what to do.
> Last updated: 2026-04-11 (Module 3.1 Phase 3B).

---

## 1. The 4 Layers — Who Is Who

| # | Layer | Who | When to use | Lifetime |
|---|---|---|---|---|
| 1 | **Main Strategic Chat** | One long-running chat at the project level | Project-wide decisions, MASTER_ROADMAP changes, cross-module rules, opening new modules, locking architectural principles | Persistent — only replaced when context fills up |
| 2 | **Module Strategic Chat** | One per module | Phase planning inside one module, writing PHASE SPECs, reviewing handbacks, deciding the order of phases | Lives for the lifetime of the module |
| 3 | **Secondary Chat** | One per phase | Executing one PHASE SPEC, writing Claude Code prompts, verifying outputs against success criteria | **Dies at the end of each phase** — open a new one for the next phase |
| 4 | **Claude Code (terminal)** | The CLI tool | Reads `CLAUDE.md`, runs SPECs, edits files, commits to `develop` | Per session; reads project state from disk every time |

**Daniel's role:** the courier between layers. You bridge Main ↔ Module Strategic ↔ Secondary, and you run prompts in Claude Code. You are not a decision-maker inside the chats — you carry decisions between them.

---

## 2. Common Scenarios — One-Line Answers

| Scenario | What to do |
|---|---|
| **Start a new module** | Open Main Strategic. Paste `MASTER_ROADMAP.md`. Decide on the new module's scope with Main, then open a new Module Strategic Chat for it. |
| **Start a new phase in an existing module** | Open a **new** Module Strategic Chat with `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` + the module's `ROADMAP.md`. Don't reuse the previous strategic chat across modules. |
| **A phase needs a secondary chat** | Open a new chat. Paste `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` **as text** (NOT as an attachment). Wait for it to ask for the SPEC. Then send the SPEC. One file at a time. |
| **Run code Claude Code wrote** | Open a terminal in the **correct repo**. Verify branch = `develop`. Paste the prompt. |
| **A chat is offering you a menu of options** | Tell it to follow the SPEC. Do not pick options. The SPEC is the source of truth. |
| **A chat is asking 3 questions in one message** | Tell it: "One question at a time, please." Repeat as needed. (See §4 — this is the rule that matters most.) |
| **You don't know which repo a task belongs to** | Run `git remote -v` in the terminal you're about to use. If it doesn't match the task — STOP and switch. |
| **You're between phases and want to verify the previous phase closed cleanly** | Open the module's `ROADMAP.md` — the previous phase should be ✅. Open `SESSION_CONTEXT_PHASE_X.md` — should say `Status: COMPLETE`. |
| **A phase has been running for 2 hours and you're not sure it's done** | Ask the secondary chat: "Status — are you mid-phase, blocked, or complete?" If complete, ask for the one-line handback summary. |
| **You want to merge to main** | **Only you do this. Never Claude Code, never any chat.** Run `git checkout main && git merge develop && git push && git checkout develop` after QA on demo tenant. |

---

## 3. The 7 Forbidden Behaviors of Secondary Chats

If a secondary chat does any of these, **tell it to stop and start over from the operating instructions**:

1. **Offering you a menu of options** — "Option A, Option B, which?" The SPEC has no options. Execute the SPEC.
2. **Asking "what role am I playing in this chat"** — the role is in §1 of the universal template. Asking is a sign the template wasn't read.
3. **Summarizing what the module is or what the phase does before executing** — summaries are not deliverables.
4. **Asking "should I" or "would you like me to" or "one question before I proceed"** — if the SPEC says do it, do it. Genuine ambiguities go into the Claude Code prompt as the secondary chat's interpretation.
5. **Asking you for clarification on something that could be discovered by reading a file** — request the file, don't interrogate Daniel.
6. **Assuming the job is to "understand" the module** — the job is to execute the SPEC. Understanding is a side effect.
7. **Writing a "what I understand so far" preamble** — the strategic chat already understands. Secondary chats execute.

If you see any of the above, copy this list back into the chat and say: "You are doing #N. Stop and execute the SPEC."

---

## 4. The One-Question-at-a-Time Rule (CRITICAL)

> **When any chat needs information from Daniel, it asks ONE question at a time.**
> **No tables of multiple questions. No (1)(2)(3) lists. No "and also."**
> **One question, one response, repeat.**

This is the rule you care about most. It applies to:

- Module Strategic Chats during phase planning
- Secondary Chats when something contradicts the SPEC
- Main Strategic Chat when locking decisions
- Any chat at any time that wants to ask you something

**If a chat batches questions, your response is one sentence:**

> "One question at a time, please. Start with the first one."

You don't have to answer the batch. Repeat the rule until the chat complies. The chat will adapt within one or two messages.

**Why this rule exists:** Daniel is doing many things in parallel. A chat that fires three questions in a table forces you to either context-switch three times (slow + error-prone) or batch your answers (which the chat then processes wrong because the answers depend on each other). One question at a time is faster *and* more accurate for both sides.

---

## 5. File Locations Cheat Sheet

### `opticup` repo root (project-wide artifacts)

| File | What it is |
|---|---|
| `CLAUDE.md` | The ERP repo's constitution. Iron Rules 1–23, First Action Protocol, Authority Matrix. Read first by every Claude Code session. |
| `MASTER_ROADMAP.md` | Project-wide roadmap. All modules, all decisions. Updated only at module closure. |
| `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` | Paste-as-text into a new Module Strategic Chat. |
| `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` | Paste-as-text into a new Secondary Chat. |
| `MODULE_DOCUMENTATION_SCHEMA.md` | The 6 rules for how documentation lives across the dual-repo split. |
| `DANIEL_QUICK_REFERENCE.md` | This file. |

### `opticup/docs/` (project-wide reference)

| File | What it is |
|---|---|
| `GLOBAL_MAP.md` | Function registry, contracts, module ownership map. |
| `GLOBAL_SCHEMA.sql` | Full DB schema across all modules. |
| `FILE_STRUCTURE.md` | Repo file tree with one-line descriptions. |
| `DB_TABLES_REFERENCE.md` | `T.CONSTANT → table_name` quick reference. |
| `CONVENTIONS.md` | UI patterns, idioms (cascading dropdowns, wizards, soft delete, etc.). |
| `TROUBLESHOOTING.md` | Known issues + fixes + prevention. |
| `AUTONOMOUS_MODE.md` | Bounded Autonomy execution protocol. |

### `opticup/modules/Module X - Name/` (per-module structure)

```
Module X - Name/
├── ROADMAP.md                ← phase map ⬜ / ✅
├── docs/
│   ├── SESSION_CONTEXT.md    ← current status (read at session start)
│   ├── MODULE_SPEC.md        ← business logic + current state
│   ├── MODULE_MAP.md         ← code map (files, functions, globals)
│   ├── db-schema.sql         ← DB tables owned by this module
│   ├── CHANGELOG.md          ← commit history per phase
│   ├── PHASE_X_SPEC.md       ← active SPEC for the current phase
│   └── SESSION_CONTEXT_PHASE_X.md  ← per-phase secondary chat output
└── backups/
    └── M{X}F{phase}_{date}/  ← phase-end backups
```

### `opticalis/opticup-storefront` (sibling repo)

Separate repo. Has its own `CLAUDE.md`, `VIEW_CONTRACTS.md`, `BRAND_CONTENT_GUIDE.md`, `SCHEMAS.md`, `MODULE_MAP.md` at the root. **Do not edit storefront files from inside `opticup`** — switch terminals, switch repos.

---

## 6. DB Safety Levels — Quick Recap

The project uses three SQL autonomy levels. Each is more dangerous than the last.

| Level | What | When allowed | Who approves |
|---|---|---|---|
| **Level 1** | `SELECT` only via `optic_readonly` DB role + application-level red-list keyword check. Read-only inspection. | Any phase from Module 3 Phase B onward. | Automatic (no approval needed). |
| **Level 2** | `INSERT` / `UPDATE` on **data tables only** (not RLS, not schema). Batch approval allowed for homogeneous batches from the same template. | Not before end of Module 3. | Module Strategic Chat (you, the strategic chat — not Daniel). |
| **Level 3** | `CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY`, `ALTER POLICY`, `GRANT`, `REVOKE`. Anything that touches schema or RLS. | Always — never automatic. | Daniel only. Always. |

**Rule of thumb:** if it could leak data between tenants, it's Level 3 and requires Daniel's explicit approval. If you're unsure which level something is, treat it as one level higher than you think.

**Module 3.1 (this module)** does not touch the DB at all. It's all documentation work.

---

## 7. End-of-Phase Checklist (for Daniel to verify)

When a secondary chat declares a phase complete, before you mark it ✅:

- [ ] Output report or build artifacts exist at the path the SPEC specified
- [ ] `SESSION_CONTEXT_PHASE_X.md` exists for the phase, status = COMPLETE, deviations listed (or "None")
- [ ] `git status` is clean (no untracked or unexpected modifications)
- [ ] Commits are on `develop` only — `git log --oneline origin/develop..HEAD` shows the expected commits
- [ ] Pre-commit hooks passed (no Rule 14/15/18/21/23 violations)
- [ ] One-line handback summary received from the secondary chat

If any of the above is missing — push back to the secondary chat. Don't close the phase until they're all true.

---

## 8. Emergency Reference

**Wrong repo / wrong branch detected mid-task** → STOP. Run `git status` and `git remote -v`. Switch correctly. Re-read CLAUDE.md First Action Protocol §1.

**Pre-commit hook failing** → Read the hook output. It tells you exactly which rule (14 / 15 / 18 / 21 / 23) was violated. Fix the rule violation. Re-stage. New commit (never `--amend` after a hook failure).

**Secondary chat went rogue** → Copy §3 (Forbidden Behaviors) into the chat. Tell it which forbidden behavior it just did. Tell it to start over from the universal template.

**You're not sure who owns a decision** → If it affects only one module → Module Strategic Chat. If it affects multiple modules or MASTER_ROADMAP → Main Strategic Chat. If you're unsure → ask Main; over-escalating is cheap, under-escalating is expensive.

**A chat asks "should I X?"** → "Follow the SPEC." (You will say this many times. It is correct every time.)

---

*End of DANIEL_QUICK_REFERENCE.md.*
*Open this any time you forget what to do. Update it when the working method changes — it's the cheat sheet, not the constitution.*
