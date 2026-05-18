-- M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE 2026-05-18 IDT — 3/4 (next_po_number, frames-era).
-- Regex guard before CAST. Signature unchanged. Reads purchase_orders (frames table).

CREATE OR REPLACE FUNCTION public.next_po_number(p_tenant_id uuid, p_supplier_number text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_seq INT; v_prefix TEXT; v_new_number TEXT;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  v_prefix := 'PO-' || p_supplier_number || '-';
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM LENGTH(v_prefix) + 1) AS INT)), 0) INTO v_max_seq
  FROM purchase_orders
  WHERE tenant_id = p_tenant_id
    AND po_number LIKE v_prefix || '%'
    AND SUBSTRING(po_number FROM LENGTH(v_prefix) + 1) ~ '^[0-9]+$';
  v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 4, '0');
  RETURN v_new_number;
END;
$function$;
