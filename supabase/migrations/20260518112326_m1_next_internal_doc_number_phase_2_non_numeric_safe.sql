-- M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2 2026-05-18 IDT — 2/4 (next_internal_doc_number).
-- Regex guard before CAST. Dynamic prefix; SUBSTRING uses LENGTH(p_prefix)+2.

CREATE OR REPLACE FUNCTION public.next_internal_doc_number(p_tenant_id uuid, p_prefix text DEFAULT 'DOC'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_seq INT; v_new_number TEXT;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  SELECT COALESCE(MAX(CAST(SUBSTRING(internal_number FROM LENGTH(p_prefix) + 2) AS INT)), 0) INTO v_max_seq
  FROM supplier_documents
  WHERE tenant_id = p_tenant_id
    AND internal_number LIKE p_prefix || '-%'
    AND SUBSTRING(internal_number FROM LENGTH(p_prefix) + 2) ~ '^[0-9]+$';
  v_new_number := p_prefix || '-' || LPAD((v_max_seq + 1)::TEXT, 5, '0');
  RETURN v_new_number;
END;
$function$;
