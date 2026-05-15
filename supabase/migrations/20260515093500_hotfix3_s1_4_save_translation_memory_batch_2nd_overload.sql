-- SECURITY_HOTFIX_3 §1.4 — Harden save_translation_memory_batch(p_entries jsonb) 2nd overload
-- Per SPEC §11 (Option B).
--
-- Adds 3-role-aware Block A header (adapted for entry-level tenant_id derivation since
-- this overload has no p_tenant_id parameter), SET search_path, REVOKE EXECUTE FROM anon.
--
-- The 1st overload (p_tenant_id uuid, p_entries jsonb) was hardened in SECURITY_HOTFIX_2.
-- Reference: .claude/skills/opticup-strategic/references/JWT_VALIDATION_HEADER.sql

CREATE OR REPLACE FUNCTION public.save_translation_memory_batch(p_entries jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  entry jsonb;
BEGIN
  -- 3-role-aware Block A (adapted for entry-level tenant_id):
  --   service_role  → bypass
  --   authenticated → must have JWT tenant_id matching ALL entries' tenant_id
  --   anon          → no JWT → fails (REVOKE anon also blocks at GRANT level)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_entries) e
      WHERE (e->>'tenant_id')::uuid IS DISTINCT FROM v_jwt_tenant
    ) THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Original body (unchanged below):
  FOR entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    INSERT INTO translation_memory (
      tenant_id, source_lang, target_lang, source_text, translated_text,
      context, scope, confidence, approved_by
    ) VALUES (
      (entry->>'tenant_id')::uuid,
      COALESCE(entry->>'source_lang', 'he'),
      entry->>'target_lang',
      entry->>'source_text',
      entry->>'translated_text',
      COALESCE(entry->>'context', 'general'),
      COALESCE(entry->>'scope', 'tenant'),
      CASE WHEN entry->>'approved_by' IS NOT NULL THEN 1.0 ELSE 0.7 END,
      entry->>'approved_by'
    )
    ON CONFLICT (tenant_id, source_lang, target_lang, source_hash)
    DO NOTHING;
  END LOOP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.save_translation_memory_batch(jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_translation_memory_batch(jsonb) TO authenticated, service_role;
