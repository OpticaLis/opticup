-- Migration: enable Supabase Realtime for crm_leads (Incoming Leads pilot)
-- SPEC: CRM_REALTIME_INCOMING_PILOT (modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/SPEC.md)
-- Author: opticup-strategic (Foreman) on behalf of Daniel directive 2026-05-03 / REC-012
-- Counts toward M4-DEBT-01 backlog (MCP-applied migrations not yet in git's authoritative
-- migrations folder; this .sql is preserved in the SPEC folder so a future audit/restore
-- SPEC can fold it back into the canonical migrations directory).
--
-- Idempotent — safe to re-run.
--
-- Why REPLICA IDENTITY FULL: Supabase Realtime UPDATE events otherwise carry only the
-- primary key + changed columns in `payload.new`/`payload.old`. The Tier-1 incoming-tab
-- subscription's UPDATE handler currently merges `payload.new` onto local state via
-- Object.assign (so partial rows would still work), but FULL replica-identity future-proofs
-- the handler if it ever reads `payload.old.status` or `payload.old.is_deleted` for
-- transition-detection (e.g. "moved out of Tier 1" logic that wants to fire only on
-- the actual status change). Performance cost on crm_leads is negligible: rows are small,
-- update volume is low (status changes + edits, not high-frequency mutations).
--
-- Why the publication ADD is wrapped in a DO block: ALTER PUBLICATION ... ADD TABLE
-- raises an error if the table is already in the publication. The IF NOT EXISTS guard
-- against pg_publication_tables makes this migration safe to apply twice (e.g. re-running
-- a SPEC, or replaying migrations on a cloned environment).

-- Step 1 — REPLICA IDENTITY FULL (idempotent — repeated calls are no-ops if already FULL)
ALTER TABLE public.crm_leads REPLICA IDENTITY FULL;

-- Step 2 — Add crm_leads to supabase_realtime publication (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'crm_leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;
  END IF;
END $$;

-- Verification (read-only — run after migration to confirm):
-- SELECT pubname, schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime' AND tablename = 'crm_leads';
-- Expected: 1 row.
--
-- SELECT relreplident
-- FROM pg_class
-- WHERE relname = 'crm_leads' AND relnamespace = 'public'::regnamespace;
-- Expected: 'f' (FULL).
