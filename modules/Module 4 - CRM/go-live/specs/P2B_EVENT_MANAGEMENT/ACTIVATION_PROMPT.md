# Claude Code Activation — Commit P2a Review + Execute P2b

> **Machine:** 🖥️ Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop

---

## Phase 1: Commit Pending File

One file needs to be committed from the previous Cowork session:

| # | File | Commit message |
|---|------|---------------|
| 1 | `modules/Module 4 - CRM/go-live/specs/P2A_LEAD_MANAGEMENT/FOREMAN_REVIEW.md` | `docs(spec): add Foreman Review for P2A_LEAD_MANAGEMENT` |
| 2 | `modules/Module 4 - CRM/go-live/specs/P2B_EVENT_MANAGEMENT/SPEC.md` + `ACTIVATION_PROMPT.md` | `docs(spec): author P2B_EVENT_MANAGEMENT SPEC` |

Selective `git add` only. Do NOT add other files.

---

## Phase 2: Execute P2b SPEC

Load the `opticup-executor` skill and execute:

```
modules/Module 4 - CRM/go-live/specs/P2B_EVENT_MANAGEMENT/SPEC.md
```

The SPEC has everything: 15 success criteria, technical design for 4 features (event creation, event status change, register lead to event, row click), full test protocol with 6 tests, verified preconditions with queries.

**Key notes:**
- Demo has 0 campaigns — Commit 0 seeds one (approved in SPEC §4)
- Toast API: use `.success/.error/.warning/.info` only — NOT `.show` (P2a lesson)
- Pre-commit hook `set +e` fix already landed in P2a — but run tooling probe to verify
- Testing via chrome-devtools MCP on `http://localhost:3000/crm.html?t=demo`

**End state:** Repo clean, all criteria pass, EXECUTION_REPORT.md + FINDINGS.md written.
