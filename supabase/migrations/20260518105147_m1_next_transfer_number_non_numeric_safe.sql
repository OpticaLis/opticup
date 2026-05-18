-- M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE 2026-05-18 IDT — 4/4 (next_transfer_number).
-- Regex guard before CAST. Signature unchanged. Called by record_transfer K-RPC.

CREATE OR REPLACE FUNCTION public.next_transfer_number(p_tenant_id uuid)
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
  v_prefix := 'TRN-';
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  SELECT COALESCE(MAX(CAST(SUBSTRING(transfer_number FROM LENGTH(v_prefix) + 1) AS INT)), 0)
    INTO v_max_seq
    FROM stock_transfer
    WHERE tenant_id = p_tenant_id
      AND transfer_number LIKE v_prefix || '%'
      AND SUBSTRING(transfer_number FROM LENGTH(v_prefix) + 1) ~ '^[0-9]+$';
  v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 6, '0');
  RETURN v_new_number;
END;
$function$;
