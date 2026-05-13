-- SECURITY_HOTFIX_2026_05_13 §6.2 — REVOKE anon EXECUTE on create_tenant
--
-- Audit Finding 16 (Daniel re-classified to STAFF in Brief §2 Q3): the function
-- has no auth.uid() gate; self-signup is a future capability, today only
-- platform-admin path creates tenants. The future self-signup design will be a
-- separate Module 2 SPEC with CAPTCHA + verification + rate limiting.
--
-- Iron Rule 22 / M4-DB-01 lesson: include FROM PUBLIC; revoking from anon
-- alone is a no-op due to PUBLIC inheritance.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.create_tenant(text, text, text, text, text, uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
-- service_role retains EXECUTE (default; not revoked).

COMMIT;
