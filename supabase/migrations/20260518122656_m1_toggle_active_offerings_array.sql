-- M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS 2026-05-18 IDT
-- NEW server-side array RPC for atomic per-(offering × location) bulk toggle.
-- Resolves M1_LENS_DESIGNS_SELECTION_REBUILD F-1 MEDIUM (Daniel Option a, morning 2026-05-18).
-- Old toggle_active_offering(p_offering_id, ..., p_location_id) KEPT unchanged
-- for per-row UI clicks. This new RPC iterates the Cartesian product per pair
-- in one atomic transaction.

CREATE OR REPLACE FUNCTION public.toggle_active_offerings_array(
  p_tenant_id uuid,
  p_offering_ids uuid[],
  p_location_ids uuid[],
  p_is_active boolean
) RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role   text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_offering_id uuid;
  v_location_id uuid;
  v_pair_count int := 0;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_offering_ids IS NULL OR array_length(p_offering_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'p_offering_ids must be a non-empty array' USING ERRCODE = '22023';
  END IF;
  IF p_location_ids IS NULL OR array_length(p_location_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'p_location_ids must be a non-empty array' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(p_offering_ids) AS oid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.supplier_catalog_offering sco
      WHERE sco.id = oid AND sco.tenant_id = p_tenant_id AND sco.is_deleted = false
    )
  ) THEN
    RAISE EXCEPTION 'one or more offerings not found for tenant %', p_tenant_id USING ERRCODE = '23503';
  END IF;

  FOREACH v_offering_id IN ARRAY p_offering_ids LOOP
    FOREACH v_location_id IN ARRAY p_location_ids LOOP
      INSERT INTO public.tenant_active_offerings (tenant_id, offering_id, location_id, is_active, activated_at)
      VALUES (p_tenant_id, v_offering_id, v_location_id, p_is_active, now())
      ON CONFLICT (tenant_id, offering_id, location_id) WHERE (is_deleted = false)
      DO UPDATE SET
        is_active    = EXCLUDED.is_active,
        activated_at = now(),
        updated_at   = now();
      v_pair_count := v_pair_count + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'pairs_processed', v_pair_count,
    'offerings', array_length(p_offering_ids, 1),
    'locations', array_length(p_location_ids, 1),
    'is_active', p_is_active
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.toggle_active_offerings_array(uuid, uuid[], uuid[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_active_offerings_array(uuid, uuid[], uuid[], boolean) TO authenticated;
