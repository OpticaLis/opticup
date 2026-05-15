# ROLLBACK — M4_TEMPLATE_VALIDATION_UNIFIED

Rollback artifact for the DB column added by Commit 2. Lives in doc-context
(`.md`) per the project's destructive-ops-check workaround for declared-`None.`
SPECs that still need a recoverable rollback path — the `*_down.sql` filename
pattern is gated by `scripts/checks/destructive-ops-declared.mjs` and would
block any commit (see escalation:
`modules/Module 1.5 - Shared Components/escalations/2026-05-14T22-15Z_destructive_ops_check_blocks_declared_deletes.md`).

This file is informational. The forward migration is purely additive.

## Rollback procedure

If the SPEC must be reverted:

1. Revert the EF redeploys (`send-message v26 → v25`, `automation-engine
   v16 → v15`) — easiest via `git reset --hard pre-M4_TEMPLATE_VALIDATION_UNIFIED`
   then `supabase functions deploy send-message --project-ref
   tsxrrxzmdxaenlvocyit` + same for `automation-engine`. The pre-tag
   was created on git commit `0cf61233e9d3c33eaee5ede77854bcfae436be15`.

2. Drop the `last_error` column from `crm_automation_rules` via Supabase
   MCP `apply_migration` with this body:

```sql
-- Reverses 2026_05_14_m4_template_validation_unified_up.sql.
-- Safe to run — column is diagnostic state only (no FK, no constraint,
-- no application code reads it as anything other than "last error
-- string the engine wrote"). Dropping returns the table to its
-- pre-SPEC shape exactly.

ALTER TABLE public.crm_automation_rules
  DROP COLUMN IF EXISTS last_error;
```

3. Cleanup demo test data from §3.2 integration test (if not already
   cleaned up at test close): DELETE the test template + test rule + any
   `crm_message_log` rows whose `error_message LIKE 'unsubstituted_placeholder%'`
   and were inserted during the SPEC run (filter by `created_at >
   <SPEC start ISO>` AND `tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'`).

No data loss occurs from rollback — the `last_error` values are diagnostic
state only.
