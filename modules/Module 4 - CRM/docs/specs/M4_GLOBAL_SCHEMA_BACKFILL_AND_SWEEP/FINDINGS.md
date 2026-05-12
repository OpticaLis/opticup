# FINDINGS — M4_GLOBAL_SCHEMA_BACKFILL_AND_SWEEP

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_GLOBAL_SCHEMA_BACKFILL_AND_SWEEP/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — event-register EF reads `tenants.ui_config` directly instead of using `_shared/tenant-config.ts`

- **Code:** `M4-FINDING-01`
- **Severity:** LOW
- **Discovered during:** §9.D sweep of `_shared/` helper usage
- **Location:** `supabase/functions/event-register/index.ts:189` — `.select("name, logo_url, ui_config")` direct from `tenants` table
- **Description:** SPEC §9.D anticipated event-register would reference `_shared/tenant-config.ts` (the helper created in M4_HARDCODED_PRIZMA_REMOVAL commit `c576bd3`). 4 EFs were expected: quick-register, send-message, resolve-link, event-register. Verified via grep: only 3 actually use the helper (quick-register/index.ts, resolve-link/index.ts, send-message/url-builders.ts). event-register reads `tenants.ui_config` directly. Both work correctly today (same DB read), but consistency is broken.
- **Reproduction:**
  ```bash
  grep -l "tenant-config\|loadTenantConfig" supabase/functions/*/index.ts
  # → quick-register/index.ts, resolve-link/index.ts, NOT event-register
  grep -n "ui_config" supabase/functions/event-register/index.ts
  # → line 189 direct select
  ```
- **Suggested next action:** NEW_SPEC stub — `M4_EVENT_REGISTER_TENANT_CONFIG_HELPER`
- **Rationale for action:** Trivial refactor (~10 lines changed), improves consistency, makes future tenant_config fields automatically available to event-register. Low priority — not a bug, just inconsistency.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — DB_TABLES_REFERENCE.md missing all 28 M4 CRM tables + short_links

- **Code:** `M4-FINDING-02`
- **Severity:** MEDIUM
- **Discovered during:** §9.G — read of `docs/guardian/GUARDIAN_ALERTS.md` Sentinel scan output (alert M-12 NEW 2026-05-07)
- **Location:** `docs/DB_TABLES_REFERENCE.md` (151 lines) — `grep -c "crm_"` returns 0; `grep -c "short_links"` returns 0
- **Description:** Per Sentinel M-12: "Prior scan marked this 'presumed closed' by Integration Ceremony, but verification today shows only GLOBAL_SCHEMA.sql + GLOBAL_MAP.md were updated — DB_TABLES_REFERENCE.md was missed. Daily-use file for `T.CONSTANT_NAME → table → key columns` lookups; Iron Rule 21 explicitly requires this file be updated when tables are added." M4_CLOSURE_AND_INTEGRATION_CEREMONY's §10 Integration Ceremony checklist did NOT include DB_TABLES_REFERENCE.md (only GLOBAL_MAP + GLOBAL_SCHEMA). 28 CRM tables + short_links are missing rows in this file.
- **Reproduction:** Open `docs/DB_TABLES_REFERENCE.md`; search for `crm_leads`, `crm_events`, `short_links` — no matches.
- **Suggested next action:** NEW_SPEC stub — `M4_DB_TABLES_REFERENCE_BACKFILL` (Sentinel pre-named it)
- **Rationale for action:** Daily-reference file. T-constant lookups for CRM development go to this file first. Missing rows = developer friction every time someone needs `T.CRM_LEADS` etc. Single-commit fix, ~30 minutes.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — 75 SECURITY DEFINER function-executable advisor warnings

- **Code:** `M4-FINDING-03`
- **Severity:** MEDIUM
- **Discovered during:** §9.G — read of `docs/guardian/GUARDIAN_ALERTS.md` Sentinel scan output (alert M-10 NEW 2026-05-07)
- **Location:** Supabase advisor lint — 41 `authenticated_security_definer_function_executable` + 34 `anon_security_definer_function_executable` + 36 `function_search_path_mutable`
- **Description:** Per Sentinel M-10: "These are mostly CRM RPCs hardened in M4_TENANT_ISOLATION_HARDENING_PART2 (PUBLIC + anon EXECUTE revoked) — the lint still fires because the functions exist as SECURITY DEFINER even though anon can no longer call them." After PART2 closed the CRITICAL (anon can't actually invoke them), the SECURITY DEFINER property remains, which the linter flags. Plus 36 related `function_search_path_mutable` warnings (set explicit `search_path` per function).
- **Reproduction:** Run Supabase advisor lints; observe 75 warnings in the SECURITY DEFINER cluster.
- **Suggested next action:** NEW_SPEC stub — `M4_SECURITY_DEFINER_FUNCTION_AUDIT` (Sentinel pre-named it)
- **Rationale for action:** Triage — flip to SECURITY INVOKER where safe (most JWT-claim-aware RPCs); document the rest as accepted post-PART2 (e.g., `import_leads_from_monday` legitimately needs SECURITY DEFINER for cross-tenant admin work). Plus add explicit `SET search_path` to each function. Not a security risk today — the CRITICAL was the EXECUTE grant, which PART2 closed; this is hygiene/lint cleanup.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — CHANGELOG.md missing entry for cdbba26 (M4_HARDCODED_DEMO_PHONE_CLEANUP commit)

- **Code:** `M4-FINDING-04`
- **Severity:** LOW
- **Discovered during:** §9.J — CHANGELOG vs commit log spot-check
- **Location:** `modules/Module 4 - CRM/docs/CHANGELOG.md` — no occurrence of `L-PROJECT-001`, `HARDCODED_DEMO_PHONE`, `cdbba26`, or `717-5675`
- **Description:** Commit `cdbba26 chore(crm): replace decorative demo phone with placeholder + LEARNINGS L-PROJECT-001` (M4_HARDCODED_DEMO_PHONE_CLEANUP, 2026-05-07) does not have a corresponding entry in CHANGELOG. Root cause: that SPEC's §2 in-scope file list omitted CHANGELOG. Captured in M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md §10 (backfilled in commit `1136106` of THIS SPEC) as a follow-up. Not unique to that SPEC — pattern is "SPEC-author forgot CHANGELOG in §2 in-scope".
- **Reproduction:**
  ```bash
  grep -n "L-PROJECT-001\|HARDCODED_DEMO_PHONE\|717-5675" "modules/Module 4 - CRM/docs/CHANGELOG.md"
  # → 0 hits
  ```
- **Suggested next action:** TECH_DEBT (1-line bump in next opticup-architect master-doc sweep — no separate SPEC needed)
- **Rationale for action:** Documentation drift, single line missing. Auto-include CHANGELOG in every SPEC_TEMPLATE going forward (logged as opticup-strategic Proposal 2 in M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md §6).
- **Foreman override (filled by Foreman in review):** { }

---

## Meta-finding (not numbered, for SPEC-quality feedback)

**SPEC §2 Gap A premise was FALSE.** SPEC author asserted GLOBAL_SCHEMA.sql lacked M4 tables based on a `git grep -c "crm_*..." docs/GLOBAL_SCHEMA.sql → 0 hits` claim. Live grep at execution time returned 9 hits — the M4 banner section at lines 165-229 (added in commit `d1f8c0d` during M4_CLOSURE) was already comprehensive, matching the file's intentional banner-style MAP design. SPEC author appears to have searched for `CREATE TABLE crm_*` (DDL form) and concluded the merge was partial.

This is the **4th occurrence** in the M4 cycle of "SPEC author cited file content from memory; live filesystem disagreed" (prior 3: M4-DOC-04 template slug, M4-DOC-02 column names, M4-DOC-06 path missing /public/). Per Self-Improvement Mandate's 3-occurrence rule, the next opticup-strategic session MUST add a "verify all §3 grep claims at SPEC author time" step to SKILL.md. Concrete proposal in EXECUTION_REPORT.md §8 Proposal 1.

This is meta-finding, not a numbered finding, because the resolution was already executed (Gap A skipped, sweep proceeded). It's logged here so the Foreman can apply the 4-occurrence rule binding change.

---

*End of FINDINGS.*
