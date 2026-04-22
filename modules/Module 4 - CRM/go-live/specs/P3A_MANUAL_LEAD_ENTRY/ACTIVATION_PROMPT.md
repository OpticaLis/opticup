# Claude Code Activation — Commit Backlog + Execute P3a

> **Machine:** 🖥️ Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop

---

## Phase 1: Commit Pending Files

Files from Cowork sessions that need to be committed:

| # | Files | Commit message |
|---|-------|---------------|
| 1 | `modules/Module 4 - CRM/go-live/specs/P2B_EVENT_MANAGEMENT/FOREMAN_REVIEW.md` | `docs(spec): add Foreman Review for P2B_EVENT_MANAGEMENT` |
| 2 | `modules/Module 4 - CRM/go-live/specs/P2B_EVENT_MANAGEMENT/COMMIT_BACKLOG.md` + `modules/Module 4 - CRM/go-live/specs/P3A_MANUAL_LEAD_ENTRY/SPEC.md` + `modules/Module 4 - CRM/go-live/specs/P3A_MANUAL_LEAD_ENTRY/ACTIVATION_PROMPT.md` | `docs(spec): author P3A_MANUAL_LEAD_ENTRY SPEC` |
| 3 | `MASTER_ROADMAP.md` | `docs(roadmap): update M4 Go-Live status, add repo-split + Cowork workflow decisions` |

Selective `git add` only. Do NOT add other files.

---

## Phase 2: Execute P3a SPEC

Load the `opticup-executor` skill and execute:

```
modules/Module 4 - CRM/go-live/specs/P3A_MANUAL_LEAD_ENTRY/SPEC.md
```

The SPEC has everything: 15 success criteria, technical design for 4 features (Toast shim, pending_terms seed, manual lead form, transfer guard), full test protocol with 6 tests, verified preconditions.

**Key notes:**
- Commit 0 is Toast.show compat shim in `shared/js/toast.js` — this is a SHARED file, not a module file. It's a 1-line addition: `Toast.show = Toast.info`. Pre-approved.
- Commit 1 seeds `pending_terms` status for BOTH tenants (demo + Prizma). Pre-approved in §4.
- `crm-lead-actions.js` is 230 lines — room for ~120 more. If it hits 350, stop and propose split per §5.
- Modal.show footer pattern: pass `footer: buttonsHtml` in config (P2b lesson).
- Toast API: use `.success/.error/.warning/.info` only — the shim from Commit 0 fixes legacy `.show` calls but new code should NOT use `.show`.
- Pre-commit hook: `set +e` fix from P2a should be in place, but run tooling probe to verify.

**End state:** Repo clean, all 15 criteria pass, EXECUTION_REPORT.md + FINDINGS.md written.
