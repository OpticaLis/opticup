-- M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2 2026-05-18 IDT — 1/4 (next_box_number).
-- Regex guard before CAST. Signature unchanged. Phase 2 closes the defect class
-- across the 4 sibling next_*_number RPCs (Phase 1 covered the original 4).

CREATE OR REPLACE FUNCTION public.next_box_number(p_tenant_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max INTEGER;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  SELECT COALESCE(MAX(CAST(SUBSTRING(box_number FROM 5) AS INTEGER)), 0) INTO v_max
  FROM shipments
  WHERE tenant_id = p_tenant_id
    AND box_number LIKE 'BOX-%'
    AND is_deleted = false
    AND SUBSTRING(box_number FROM 5) ~ '^[0-9]+$';
  RETURN 'BOX-' || LPAD((v_max + 1)::TEXT, 4, '0');
END;
$function$;
