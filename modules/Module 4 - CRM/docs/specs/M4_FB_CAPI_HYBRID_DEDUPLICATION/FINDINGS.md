# FINDINGS — M4_FB_CAPI_HYBRID_DEDUPLICATION

> **Author:** opticup-executor (Claude Sonnet 4.6)
> **Date:** 2026-05-15
> **Findings:** 5 (2 INFO, 2 LOW, 1 MEDIUM)

## F-1 — INFO: Fix migration not in repo as .sql file

**Severity:** INFO
**Location:** DB-only — migration `m4_fb_capi_dispatch_consumer_fix` applied via MCP
**Description:** The cron consumer fix was applied as a Supabase migration but NOT saved locally as a .sql file. Instance of pre-existing TD-2 (migrations git drift). Live DB state is correct and verifiable.
**Suggested next action:** Include in next TD-2 migrations-git-drift cleanup SPEC.

---

## F-2 — LOW: SPEC pg_cron SQL used vault.decrypted_secrets (wrong for this project)

**Severity:** LOW
**Location:** SPEC.md §8 Expected Final State (pg_cron consumer SQL body)
**Description:** SPEC described pg_cron SQL using vault.decrypted_secrets for URL + key. All existing pg_cron jobs use hardcoded URL + anon key inline. Vault lookup caused NULL URL on first cron tick. Required fix migration at runtime.
**Suggested next action:** Apply P-EXEC-2 to opticup-executor SKILL.md at next skill-improvement session.

---

## F-3 — LOW: M1 SPEC file committed in C3 (scope impurity)

**Severity:** LOW
**Location:** Commit 8f6969b — M1_LENS_PHASE_1B_GAP_CLOSURE/SPEC.md included unintentionally
**Description:** Pre-existing untracked M1 SPEC file captured in C3 due to worktree/main-repo index confusion. File is legitimate and belongs in repo. C3 has two logical concerns.
**Suggested next action:** Apply P-EXEC-1 (worktree CWD awareness) for future Pipeline sessions. No corrective action needed for the file itself.

---

## F-4 — MEDIUM: ROLLBACK.md supabase functions delete may not exist in CLI v2.75

**Severity:** MEDIUM
**Location:** ROLLBACK.md §2 EF delete step
**Description:** supabase functions delete is a newer CLI subcommand, unverified for v2.75.0. Rollback step may silently fail.
**Suggested next action:** Verify command availability before rollback. Use Supabase Dashboard if CLI unavailable. Low urgency.

---

## F-5 — INFO: UNIQUE(lead_id, tenant_id) prevents Purchase event re-enqueue for same lead

**Severity:** INFO
**Location:** crm_capi_dispatch_queue constraint crm_capi_dispatch_queue_tenant_lead_unique
**Description:** One row per lead per tenant. For future M4_FB_CAPI_PURCHASE_EVENTS: a lead may need both Lead and Purchase queue rows. Current UNIQUE blocks the second row.
**Suggested next action:** Change UNIQUE to (lead_id, tenant_id, event_name) in the M4_FB_CAPI_PURCHASE_EVENTS SPEC.

---

*End of FINDINGS.md — 5 findings (2 INFO, 2 LOW, 1 MEDIUM). No CRITICAL or HIGH findings.*
