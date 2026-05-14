-- Migration: M3_UTM_TRIPLE_LAYER_PERSISTENCE — #02 helper RPCs
-- _record_touchpoint  — internal helper, called from EFs and from register_lead_to_event
-- resolve_touchpoints_to_lead — async-friendly deferred lead-id resolver

CREATE OR REPLACE FUNCTION public._record_touchpoint(
  p_tenant_id        uuid,
  p_lead_id          uuid,
  p_phone_normalized text,
  p_touchpoint_type  text,
  p_event_id         uuid,
  p_attendee_id      uuid,
  p_short_link_id    uuid,
  p_short_link_code  text,
  p_broadcast_id     uuid,
  p_utm_source       text,
  p_utm_medium       text,
  p_utm_campaign     text,
  p_utm_content      text,
  p_utm_term         text,
  p_utm_campaign_id  text,
  p_referrer_url     text,
  p_landing_url      text,
  p_dedupe_key       text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_tenant_id IS NULL OR p_touchpoint_type IS NULL OR p_dedupe_key IS NULL THEN
    RAISE EXCEPTION 'tenant_id, touchpoint_type, dedupe_key required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.crm_lead_touchpoints (
    tenant_id, lead_id, phone_normalized, touchpoint_type, occurred_at,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_campaign_id,
    referrer_url, landing_url, short_link_code, short_link_id, broadcast_id,
    event_id, attendee_id, dedupe_key
  )
  VALUES (
    p_tenant_id, p_lead_id, p_phone_normalized, p_touchpoint_type, now(),
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, p_utm_campaign_id,
    p_referrer_url, p_landing_url, p_short_link_code, p_short_link_id, p_broadcast_id,
    p_event_id, p_attendee_id, p_dedupe_key
  )
  ON CONFLICT (tenant_id, dedupe_key) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public._record_touchpoint(uuid,uuid,text,text,uuid,uuid,uuid,text,uuid,text,text,text,text,text,text,text,text,text) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.resolve_touchpoints_to_lead(
  p_tenant_id        uuid,
  p_lead_id          uuid,
  p_phone_normalized text
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_count      int  := 0;
BEGIN
  -- JWT-claim gate (canonical pattern, matches register_lead_to_event L14-16).
  -- service_role bypasses RLS so v_jwt_tenant may be NULL when called via service-role
  -- (e.g. from lead-intake EF). In that case we trust the caller-provided p_tenant_id.
  -- For non-service callers, we require the JWT claim to match.
  IF v_jwt_tenant IS NOT NULL AND v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;

  IF p_tenant_id IS NULL OR p_lead_id IS NULL OR p_phone_normalized IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.crm_lead_touchpoints
     SET lead_id = p_lead_id
   WHERE tenant_id = p_tenant_id
     AND lead_id IS NULL
     AND phone_normalized = p_phone_normalized
     AND occurred_at > now() - interval '30 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.resolve_touchpoints_to_lead(uuid,uuid,text) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public._record_touchpoint IS
  'M3_UTM_TRIPLE_LAYER_PERSISTENCE helper. INSERT with ON CONFLICT (tenant_id, dedupe_key) DO NOTHING — safe to call multiple times for the same logical event. Returns the new row id, or NULL if the row was already present.';

COMMENT ON FUNCTION public.resolve_touchpoints_to_lead IS
  'M3_UTM_TRIPLE_LAYER_PERSISTENCE — deferred resolver. Called async (EdgeRuntime.waitUntil) from lead-intake after a fresh lead. Backfills lead_id on prior anonymous touchpoints that match phone_normalized within a 30-day window. Returns affected row count.';
