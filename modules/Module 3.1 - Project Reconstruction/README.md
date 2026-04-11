# Module 3.1 — Project Reconstruction

> **Status:** Active (started 2026-04-11)
> **Owner:** Daniel + Module 3.1 Strategic Chat
> **Blocks:** Module 3 Phase B
> **Blocked by:** Nothing — this is the unblocking module

---

## What this module does

Module 3.1 audits, repairs, and restandardizes the documentation of the Optic Up project after Module 3 introduced two changes that disrupted the previous documentation pattern: (1) the addition of a second repo (`opticup-storefront`), and (2) an experimental "autonomous mode" execution structure that was abandoned mid-stream. The result was that documentation drifted out of sync with reality, splits between the two repos became inconsistent, and `MASTER_ROADMAP.md` no longer reflects the true state of the project.

This module produces no new product features. It produces clarity.

---

## Folder structure

```
modules/Module 3.1 - Project Reconstruction/
├── README.md                                 ← this file
├── MODULE_3.1_ROADMAP.md                     ← the module roadmap (Main Strategic wrote it)
├── MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md     ← template for any secondary chat in this module
├── docs/
│   ├── SESSION_CONTEXT.md                    ← master session context (strategic chat owns)
│   ├── PHASE_1A_FOUNDATION_AUDIT_SPEC.md     ← SPEC for parallel chat A
│   ├── PHASE_1B_MODULES_1_2_AUDIT_SPEC.md    ← SPEC for parallel chat B
│   ├── PHASE_1C_MODULE_3_DUAL_REPO_AUDIT_SPEC.md ← SPEC for parallel chat C
│   ├── SESSION_CONTEXT_PHASE_1A.md           ← created by chat A during execution
│   ├── SESSION_CONTEXT_PHASE_1B.md           ← created by chat B during execution
│   ├── SESSION_CONTEXT_PHASE_1C.md           ← created by chat C during execution
│   ├── audit-reports/
│   │   ├── PHASE_1A_FOUNDATION_AUDIT_REPORT.md
│   │   ├── PHASE_1B_MODULES_1_2_AUDIT_REPORT.md
│   │   └── PHASE_1C_MODULE_3_DUAL_REPO_AUDIT_REPORT.md
│   ├── current prompt/                       ← active Claude Code prompts (secondary chats write here)
│   └── old prompt/                           ← archived prompts (Claude Code moves here at end of run)
└── backups/                                   ← phase backups for any phase that mutates files
```

---

## Phase plan (high level)

1. **Phase 1 (parallel)** — Three audit chats run simultaneously, each producing one report. Read-only.
2. **Phase 2** — Strategic chat reads all 3 reports, synthesizes the unified picture, and produces a cleanup plan with Daniel.
3. **Phase 3+** — Production of the 5 (or more) mandatory artifacts per the ROADMAP, using new secondary chats as needed.
4. **Phase QA** — Final verification, MASTER_ROADMAP update, removal of the block on Module 3 Phase B, module closure.

See `MODULE_3.1_ROADMAP.md` for full goals and constraints.

---

## How to start a Phase 1 secondary chat

1. Open a new Claude chat
2. Paste `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` as the first message
3. Attach: the relevant `PHASE_1[A/B/C]_*_SPEC.md` and `MODULE_3.1_ROADMAP.md`
4. The chat will read the SPEC, identify which phase it owns, and produce its first Claude Code prompt for you to run

You can run all three chats in parallel — they don't share writeable state.

---

## Important rules

- **READ-ONLY phase** — Phase 1 modifies no files in the project except its own outputs (audit reports + per-phase SESSION_CONTEXT files)
- **No commits to main** — ever
- **No DB writes** — ever
- **Each chat owns only its assigned files** — no cross-chat writes
- **MASTER_ROADMAP.md and MODULE_3.1_ROADMAP.md are read-only during Phase 1** — they get updated only at the end of the module by the QA phase

---

## Files to attach when opening a Phase 1 secondary chat

Required:
1. `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md`
2. The specific `PHASE_1[A/B/C]_*_SPEC.md` for the chat
3. `MODULE_3.1_ROADMAP.md`

Not needed (Claude Code reads from disk):
- CLAUDE.md (read automatically by First Action Protocol)
- Any file the SPEC asks the chat to audit
