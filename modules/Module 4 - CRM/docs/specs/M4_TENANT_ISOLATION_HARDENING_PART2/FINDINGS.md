# FINDINGS — M4_TENANT_ISOLATION_HARDENING_PART2

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_TENANT_ISOLATION_HARDENING_PART2/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Postgres `EXECUTE TO PUBLIC` default makes `REVOKE FROM anon` a no-op for SECURITY DEFINER functions

- **Code:** `M4-DB-01`
- **Severity:** MEDIUM (project-wide pattern; will repeat on every future RPC-permission SPEC unless codified)
- **Discovered during:** Stage 1 verification (post-migration `has_function_privilege('anon', ...)` still returned `true`)
- **Location:** Pattern applies to every public-schema function in this project that uses `SECURITY DEFINER` plus the default Postgres ACL.
- **Description:** PostgreSQL functions get `EXECUTE TO PUBLIC` granted at creation by default. The Supabase project's existing functions all carry the `=X/postgres` PUBLIC entry in `pg_proc.proacl`. When a SPEC says `REVOKE EXECUTE ON FUNCTION x FROM anon`, that strips anon's direct grant — but anon still inherits EXECUTE via the PUBLIC entry. `has_function_privilege('anon', oid, 'EXECUTE')` returns `true` because PostgreSQL's privilege check considers role-tree inheritance from PUBLIC. The fix is `REVOKE EXECUTE ... FROM PUBLIC`, applied additively to `REVOKE ... FROM anon`. The SPEC's first attempt at this SPEC was effectively a no-op until Stage 2 corrective applied the FROM PUBLIC.
- **Reproduction:**
  ```sql
  -- Inspect the ACL on any project function
  SELECT proname, proacl FROM pg_proc
  WHERE pronamespace='public'::regnamespace AND proname='move_attendee_between_events';
  -- → {=X/postgres,postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
  --   ^^^^^^^^^^^
  --   This entry IS the PUBLIC grant. Until you REVOKE FROM PUBLIC, anon inherits.

  -- After REVOKE FROM anon (no observable change):
  SELECT has_function_privilege('anon', 'public.move_attendee_between_events(uuid,uuid)', 'EXECUTE');
  -- → true (anon inherits via PUBLIC)

  -- After REVOKE FROM PUBLIC:
  SELECT has_function_privilege('anon', 'public.move_attendee_between_events(uuid,uuid)', 'EXECUTE');
  -- → false (PUBLIC parent grant gone)
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §3 #4-#6): `REVOKE EXECUTE FROM anon` denies anon access.
  - Actual: REVOKE strips direct grant only; anon still has EXECUTE via PUBLIC inheritance.
- **Suggested next action:** **APPLY immediately** to BOTH opticup-strategic AND opticup-executor SKILL files (Step 1.5 §). The check is mechanical: any SPEC that includes `REVOKE EXECUTE` on a function MUST also include `REVOKE EXECUTE FROM PUBLIC` on the same function (or pre-verify via `pg_proc.proacl` that the `=X/...` entry doesn't exist). Without this codification, the next RPC-permission SPEC will repeat the same no-op error. See executor Proposal 1 in EXECUTION_REPORT §8 and a parallel author-side proposal.
- **Foreman override:** { }

---

### Finding 2 — Test 3 (Chrome MCP CRM walk) deferred-with-SQL-substitute is now a 2-occurrence pattern

- **Code:** `M4-INFRA-07`
- **Severity:** LOW (process pattern; not a project bug)
- **Discovered during:** §3 Deviation #3 (this SPEC) + same pattern in M4_TENANT_ISOLATION_HARDENING_PART1
- **Location:** SPEC template §12 QA Plan + executor SKILL.md §"Common Test Patterns".
- **Description:** Two consecutive SPECs (PART1 view-RLS, this SPEC RPC-EXECUTE) have called for "CRM staff Chrome MCP walk" as a regression test. Both times the executor session did not have Chrome MCP loaded, so the walk was deferred to Daniel UAT and a SQL-level matrix substitute was used (e.g., `has_function_privilege('authenticated', ...)` confirming staff path). The SQL substitute is strictly stronger (deterministic security boundary verification), but each occurrence is logged as a deviation. Codifying the substitution pattern would remove the deviation-noise.
- **Reproduction:** N/A — process observation.
- **Expected vs Actual:**
  - Expected: Chrome MCP walk runs and verifies UI behavior end-to-end.
  - Actual: Chrome MCP not loaded; SQL matrix substitution used instead.
- **Suggested next action:** TECH_DEBT — apply executor Proposal 2 (codify the SQL-matrix substitution as a sanctioned pattern in opticup-executor SKILL.md §"Common Test Patterns"). Alternatively, Daniel could ensure Chrome MCP is loaded by default at session start for SPECs that explicitly require it.
- **Foreman override:** { }

---

### Finding 3 — Two-stage migration history for a single git commit may confuse future audits

- **Code:** `M4-DOC-10`
- **Severity:** INFO
- **Discovered during:** Migration consolidation step (writing `_up.sql` to capture both stages)
- **Location:** Supabase `supabase_migrations.schema_migrations` table — shows 2 entries (`m4_revoke_anon_rpc_execute` + `m4_revoke_anon_rpc_execute_v2_strip_public`); git shows 1 fix commit.
- **Description:** Stage 1 + Stage 2 of this SPEC were applied as two separate `apply_migration` calls (the second was the corrective for Stage 1's PUBLIC-inheritance no-op). The local `_up.sql` consolidates both into a single canonical script, so re-running it from scratch produces the final state in one shot. But the Supabase migration history shows 2 stages with different names. This is intentional — it preserves the audit trail of "we applied something, observed it didn't work, applied corrective" — but a future auditor might be confused if they grep for `m4_revoke_anon_rpc_execute` and find only Stage 1's name.
- **Reproduction:** N/A.
- **Expected vs Actual:**
  - Expected: 1:1 mapping between git commit and migration history entry.
  - Actual: 1 git commit, 2 migration history entries.
- **Suggested next action:** DISMISS — this is correct behavior given the corrective was needed. For future SPECs, if a corrective is needed mid-flight, log the pattern explicitly in EXECUTION_REPORT (already done in §3 Deviation #1) so the audit trail is clear. No action needed.
- **Foreman override:** { }

---

*End of FINDINGS.*
