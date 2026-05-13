-- SECURITY_HOTFIX_2026_05_13 §6.2 ROLLBACK
--
-- Restores the prior anon/authenticated EXECUTE grants. Re-introduces the
-- LIVE/STAFF risk; only use if smoke fails in a way that requires immediate
-- restoration of anon-callability for create_tenant (very unlikely — admin UI
-- uses service_role).

BEGIN;

GRANT EXECUTE ON FUNCTION public.create_tenant(text, text, text, text, text, uuid, text, text, uuid)
  TO anon, authenticated;

COMMIT;
