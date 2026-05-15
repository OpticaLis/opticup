-- ============================================================
-- Canonical JWT validation header for SECURITY DEFINER RPCs
-- ============================================================
-- Source: harvested from SECURITY_HOTFIX_2_2026_05_15 (F-5 + RESOLVED escalation 2026-05-15T1010Z).
-- A literally-written `IF p_tenant_id != ((current_setting...))::uuid` has a NULL-comparison
-- loophole (p_tenant_id != NULL yields NULL, never TRUE), so the IF never fires for anon
-- callers without a JWT. This file pins the vetted 3-role-aware version.
--
-- ============================================================
-- WHEN TO USE WHICH BLOCK
-- ============================================================
-- Block A     — SECURITY DEFINER RPC with `p_tenant_id` parameter; service_role-callable
--               (Edge Functions); strict for authenticated + anon.
-- Block A-alt — SECURITY DEFINER RPC that LEGITIMATELY needs anon access (e.g., storefront
--               public lookup that doesn't have a JWT). Use the slug-anchored variant —
--               require the caller to supply a slug, resolve to a tenant via the public
--               `v_public_tenant` view, and assert that the resolved id matches
--               `p_tenant_id`. Default to Block A. Choose Block A-alt only when grep
--               proves a real anon caller exists.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Block A — 3-role-aware tenant_id validation (DEFAULT)
-- ────────────────────────────────────────────────────────────
-- Place at the TOP of the function body, immediately after BEGIN
-- (or after a DECLARE block).
-- Behavior:
--   * service_role  → bypass (parallels Iron Rule 15 `service_bypass` policy paradigm)
--   * authenticated → must have JWT tenant_id matching p_tenant_id, else 42501
--   * anon (role=anon, tenant_id NULL) → fails the inner check → 42501
--
-- DO NOT inline a hand-rolled version. Past SPECs have shipped variants
-- with NULL-comparison loopholes (p_tenant_id != NULL is NULL, not TRUE).

DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  -- … original body follows …
END;

-- ────────────────────────────────────────────────────────────
-- Block A-alt — Anon-safe slug-anchored validation
-- ────────────────────────────────────────────────────────────
-- For RPCs callable by anon legitimately (storefront public-tenant lookups).
-- The check anchors p_tenant_id against the public `v_public_tenant` view —
-- only known public tenants resolve, and the caller cannot pass an arbitrary uuid.

BEGIN
  IF p_tenant_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.v_public_tenant WHERE id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'tenant_id does not resolve to a known public tenant' USING ERRCODE = '42501';
  END IF;
  -- … original body follows …
END;

-- ============================================================
-- Required function-level metadata for every SECURITY DEFINER RPC
-- ============================================================
-- CREATE OR REPLACE FUNCTION public.<name>(<args>)
--  RETURNS <return type>
--  LANGUAGE plpgsql              -- sql-language functions must be converted to plpgsql for the IF/RAISE
--  SECURITY DEFINER
--  SET search_path TO 'public'   -- F-CRIT-1 hardening — non-negotiable for SECURITY DEFINER
-- AS $function$
-- (body using one of the blocks above)
-- $function$;
--
-- GRANT pattern after creation:
--   REVOKE EXECUTE ON FUNCTION public.<name>(<args>) FROM anon, PUBLIC;
--   GRANT  EXECUTE ON FUNCTION public.<name>(<args>) TO authenticated, service_role;
-- For Block A-alt:
--   GRANT  EXECUTE ON FUNCTION public.<name>(<args>) TO anon, authenticated, service_role;
-- ============================================================
