-- SECURITY_HOTFIX_2026_05_13 §6.7 ROLLBACK
--
-- Restores anon EXECUTE on submit_storefront_lead. Re-opens the direct-RPC
-- path for the storefront. Use only if the EF cutover breaks irretrievably.

BEGIN;

GRANT EXECUTE ON FUNCTION public.submit_storefront_lead(uuid, uuid, text, text)
  TO anon, authenticated;

COMMIT;
