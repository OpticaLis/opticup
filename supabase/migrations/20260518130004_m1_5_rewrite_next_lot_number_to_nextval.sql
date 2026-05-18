-- M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES Phase 2 — 5/8
-- Rewrite next_lot_number to use seq_lot_number nextval().
-- Preserves: signature (p_tenant_id uuid) RETURNS text, JWT guard, format 'LOT-NNNNNN'.

CREATE OR REPLACE FUNCTION public.next_lot_number(p_tenant_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_seq BIGINT;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  v_new_seq := nextval('public.seq_lot_number');
  RETURN 'LOT-' || LPAD(v_new_seq::TEXT, 6, '0');
END;
$function$;
