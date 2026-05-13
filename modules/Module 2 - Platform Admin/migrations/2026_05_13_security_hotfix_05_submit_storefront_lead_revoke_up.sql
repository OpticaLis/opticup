-- SECURITY_HOTFIX_2026_05_13 §6.7 — REVOKE anon EXECUTE on submit_storefront_lead
--
-- APPLY LAST. Only after §6.5 (submit-lead EF deployed) AND §6.6 (storefront
-- repo cutover landed AND demo smoke green).
--
-- After this migration: submit_storefront_lead is reachable ONLY via the
-- submit-lead EF, which authenticates via Origin header allowlist and calls
-- the RPC as service_role.
--
-- Iron Rule 22 / M4-DB-01: REVOKE includes FROM PUBLIC.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.submit_storefront_lead(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.submit_storefront_lead(uuid, uuid, text, text)
  TO service_role;

COMMIT;
