# Activation Prompt — PERMISSIONS_AUDIT_PHASE1_2026_04_27

> **For:** Claude Code on Daniel's Windows desktop / laptop / Mac
> **Repo:** `opticalis/opticup` (ERP only)
> **Branch:** `develop`
> **Authored:** 2026-04-27 by Cowork-strategic (Foreman)
> **Severity:** HIGH — read-only audit, drives Phase 2 fix decisions

---

## Paste this entire block into Claude Code

```
You are opticup-executor. Load your skill: opticup-skills:opticup-executor.

Execute SPEC at:
modules/Module 1 - Inventory/docs/specs/PERMISSIONS_AUDIT_PHASE1_2026_04_27/SPEC.md

THIS IS A READ-ONLY AUDIT. Phase 1 of 2.
DO NOT FIX ANYTHING in this run. Document only.

Context (read in this order before doing anything):
1. CLAUDE.md — Iron Rules 1–31
2. The SPEC.md above, in full
3. js/auth-service.js — the core permission engine
4. shared/js/permission-ui.js — UI permission application
5. modules/permissions/employee-list.js — the permissions admin screen
6. The 3 most recent FOREMAN_REVIEW.md files (lessons learned to apply)

Hard constraints:
- ZERO database writes. SELECT only. If you find yourself wanting to UPDATE
  or INSERT or DELETE to "test" something, STOP — that's Phase 2.
- ZERO code modifications. Don't touch js/auth-service.js, permission-ui.js,
  modules/permissions/employee-list.js, or any HTML with data-permission.
- ZERO form submissions on localhost. You can navigate, inspect, count DOM
  elements via Chrome MCP — but no clicking "save" on the permissions screen.
- The deliverables are 4 documentation files in the SPEC folder. That's it.

Bounded Autonomy:
- §3 has 17 success criteria. Match each → continue. Mismatch → STOP and report.
- Pre-flight (PRE_FLIGHT.json) is MANDATORY before any audit work begins.
- §7 Out-of-Scope is exhaustive.

The DIAGNOSIS_REPORT.md is the main deliverable. It has 10 sections (§A–§J).
Every section is required. Even if a section has "no findings", write that.
The most valuable parts are:
- §F — hypothesis answers (H1–H5 each marked CONFIRMED / RULED OUT / PARTIAL)
- §G — 5–15 numbered consolidation proposals (Daniel reviews each individually)
- §H — Phase 2 SPEC outline (conservative — smallest fix first)

For §C UI audit: use Chrome MCP `evaluate_script` to count DOM elements on
localhost:3000. If localhost isn't reachable, document and skip — don't try
to start the ERP.

Use Supabase MCP for DB queries (SELECT only). Don't write to .auto-memory.

Both repos must be CLEAN at end:
- ERP (opticup): on develop, "nothing to commit, working tree clean"
- Storefront: untouched

Mandatory deliverables in SPEC folder:
1. DIAGNOSIS_REPORT.md (≥500 lines, 10 sections)
2. EXECUTION_REPORT.md
3. FINDINGS.md
4. PRE_FLIGHT.json

Hebrew status to Daniel (one sentence) when done:
"דוח אבחון הרשאות מוכן — סקרתי 281 הרשאות, 5 השערות נבדקו, ויש N הצעות לצמצום."
(Replace N with actual proposal count from §G.)
Then list the 2 commit hashes.

If anything diverges from §3 expected values — STOP, run §6 rollback, report.
Do NOT attempt fixes. Phase 2 is a separate SPEC.
```

---

## Notes for Daniel

- **Read-only run.** Nothing in the system changes. No code, no DB.
- Expected runtime: 30–60 minutes (depends on how thorough the executor is on
  the cross-reference matrix).
- After it finishes, you'll get a long report (~500–1,500 lines) covering
  every aspect of the permissions system. The most important parts for you:
  - **§G** — proposals to reduce the 281 keys. You'll review each one and
    say YES / NO / DEFER.
  - **§F** — answers to which hypothesis is the actual root cause.
  - **§H** — outline of what Phase 2 (the actual fix) will cover.
- After you review the report, paste it back to me in Cowork. I'll write the
  Phase 2 SPEC based on your decisions.
- The audit makes ZERO changes. Whatever the executor finds, the system stays
  exactly as it is now. The fix is Phase 2.
