-- M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES Phase 2 — 7/8

CREATE OR REPLACE FUNCTION public.next_box_number(p_tenant_id uuid)
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
  v_new_seq := nextval('public.seq_box_number');
  RETURN 'BOX-' || LPAD(v_new_seq::TEXT, 4, '0');
END;
$function$;
