-- SECURITY_HOTFIX_2_2026_05_15 §1.1
-- F-CRIT-1: Restore `search_path = 'public'` hardening on sync_lead_status_from_attendee
-- The function regressed after the original SECURITY_HOTFIX_2026_05_13 (likely via a
-- later CREATE OR REPLACE that omitted the SET clause). pg_proc.proconfig is currently
-- NULL on this function. ALTER FUNCTION sets the configuration without touching the body.
-- Note: §1.3's CREATE OR REPLACE for the same function also includes SET search_path,
-- so this fix is preserved through §1.3.

ALTER FUNCTION public.sync_lead_status_from_attendee(uuid, uuid) SET search_path = 'public';
