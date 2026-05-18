-- M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE 2026-05-18 IDT — 1/4 (next_lot_number).
-- Adds regex guard so non-numeric suffixes (e.g. legacy/test rows like
-- LOT-PO300005-1 on demo) are filtered BEFORE the CAST AS INT step.
-- Signature unchanged. Reversible by re-applying the pre-fix body.
--
-- See modules/Module 1.5 - Shared Components/docs/specs/
--     M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE/SPEC.md §0 for the pre-fix body capture.

CREATE OR REPLACE FUNCTION public.next_lot_number(p_tenant_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_seq INT;
  v_prefix TEXT;
  v_new_number TEXT;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  v_prefix := 'LOT-';
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  SELECT COALESCE(MAX(CAST(SUBSTRING(lot_number FROM LENGTH(v_prefix) + 1) AS INT)), 0)
    INTO v_max_seq
    FROM stock_lot
    WHERE tenant_id = p_tenant_id
      AND lot_number LIKE v_prefix || '%'
      AND SUBSTRING(lot_number FROM LENGTH(v_prefix) + 1) ~ '^[0-9]+$';
  v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 6, '0');
  RETURN v_new_number;
END;
$function$;
