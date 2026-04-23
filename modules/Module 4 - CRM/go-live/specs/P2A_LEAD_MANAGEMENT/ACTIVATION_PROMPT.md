# Claude Code Activation — Commit Backlog + Execute P2a

> **Machine:** 🖥️ Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop

---

## Phase 1: Commit Pending Files (before starting P2a)

Three files need to be committed — they were created by a Cowork session:

| # | File | Commit message |
|---|------|---------------|
| 1 | `modules/Module 4 - CRM/go-live/specs/P1_INTERNAL_LEAD_INTAKE/FOREMAN_REVIEW.md` | `docs(spec): add Foreman Review for P1_INTERNAL_LEAD_INTAKE` |
| 2 | `CLAUDE.md` (modified — added "Clean Repo at Session End" rule in §9) | `docs: add mandatory clean-repo-at-session-end rule to CLAUDE.md §9` |
| 3 | `modules/Module 4 - CRM/go-live/specs/P2A_LEAD_MANAGEMENT/SPEC.md` + `ACTIVATION_PROMPT.md` | `docs(spec): author P2A_LEAD_MANAGEMENT SPEC` |

Also delete `modules/Module 4 - CRM/go-live/specs/P2_ACTIVATION_PROMPT.md` (obsolete draft) in commit 3.

Use selective `git add` for each commit. Do NOT add any other files.

---

## Phase 2: Execute P2a SPEC

Load the `opticup-executor` skill and execute:

```
modules/Module 4 - CRM/go-live/specs/P2A_LEAD_MANAGEMENT/SPEC.md
```

The SPEC has everything: 15 success criteria, technical design for all 5 features (individual status change, bulk status change, add note, tier transfer, row click → detail), full test protocol, autonomy envelope, and commit plan.

**Testing note:** This SPEC requires browser testing on localhost. Use chrome-devtools MCP to navigate to `http://localhost:3000/crm.html?t=demo` and verify UI behavior. Create a test lead first via the `lead-intake` Edge Function (curl in SPEC §13).

**End state:** Repo clean on develop, all criteria pass, EXECUTION_REPORT.md + FINDINGS.md written.
