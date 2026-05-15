-- SECURITY_HOTFIX_3 §1.5 — 14 Option B + 1 Option C carry RPCs
-- Per modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/SPEC.md §11
--
-- 14 Option B: REVOKE EXECUTE FROM anon + (where applicable) add Block A JWT header + SET search_path.
-- 1 Option C: validate_slug — keep anon EXECUTE, no body change (pure validation, no side effects).
--
-- Section A: body changes (CREATE OR REPLACE) for 5 RPCs
-- Section B: ALTER FUNCTION SET search_path for 4 RPCs (body unchanged)
-- Section C: REVOKE EXECUTE FROM anon + GRANT to authenticated/service_role for 14 RPCs

-- ====================================================================
-- Section A: CREATE OR REPLACE (5 RPCs with body changes)
-- ====================================================================

-- A.1 — increment_paid_amount: add 3-role-aware Block A (tenant derived via supplier_documents JOIN) + search_path
CREATE OR REPLACE FUNCTION public.increment_paid_amount(p_doc_id uuid, p_delta numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_doc_tenant uuid;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    SELECT tenant_id INTO v_doc_tenant FROM supplier_documents WHERE id = p_doc_id;
    IF v_doc_tenant IS NULL OR v_jwt_tenant IS NULL OR v_jwt_tenant <> v_doc_tenant THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE supplier_documents
  SET paid_amount = paid_amount + p_delta,
      status = CASE
        WHEN paid_amount + p_delta >= total_amount THEN 'paid'
        ELSE 'partially_paid'
      END
  WHERE id = p_doc_id;
END;
$function$;

-- A.2 — increment_prepaid_used: add 3-role-aware Block A (tenant derived via prepaid_deals JOIN) + search_path
CREATE OR REPLACE FUNCTION public.increment_prepaid_used(p_deal_id uuid, p_delta numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_deal_tenant uuid;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    SELECT tenant_id INTO v_deal_tenant FROM prepaid_deals WHERE id = p_deal_id;
    IF v_deal_tenant IS NULL OR v_jwt_tenant IS NULL OR v_jwt_tenant <> v_deal_tenant THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE prepaid_deals
  SET total_used = total_used + p_delta,
      total_remaining = total_remaining - p_delta,
      status = CASE
        WHEN total_remaining - p_delta <= 0 THEN 'fully_used'
        ELSE status
      END
  WHERE id = p_deal_id;
END;
$function$;

-- A.3 — mark_translations_stale: add 3-role-aware Block A (tenant derived via storefront_pages JOIN) + search_path
CREATE OR REPLACE FUNCTION public.mark_translations_stale(p_page_id uuid, p_changed_blocks text[] DEFAULT NULL::text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_page_tenant uuid;
  v_group_id UUID;
  v_count INTEGER;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    SELECT tenant_id INTO v_page_tenant FROM storefront_pages WHERE id = p_page_id;
    IF v_page_tenant IS NULL OR v_jwt_tenant IS NULL OR v_jwt_tenant <> v_page_tenant THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT translation_group_id INTO v_group_id
  FROM storefront_pages
  WHERE id = p_page_id;

  IF v_group_id IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE storefront_pages
  SET translation_status = 'needs_update',
      stale_since = now(),
      stale_blocks = COALESCE(p_changed_blocks, stale_blocks),
      updated_at = now()
  WHERE translation_group_id = v_group_id
    AND id != p_page_id
    AND translation_status != 'source';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- A.4 — register_lead_to_event: upgrade weak Block A (no service_role bypass) to canonical 3-role-aware
CREATE OR REPLACE FUNCTION public.register_lead_to_event(p_tenant_id uuid, p_lead_id uuid, p_event_id uuid, p_method text DEFAULT 'manual'::text, p_utm_source text DEFAULT NULL::text, p_utm_medium text DEFAULT NULL::text, p_utm_campaign text DEFAULT NULL::text, p_utm_content text DEFAULT NULL::text, p_utm_term text DEFAULT NULL::text, p_utm_campaign_id text DEFAULT NULL::text, p_referrer_url text DEFAULT NULL::text, p_landing_url text DEFAULT NULL::text, p_short_link_code text DEFAULT NULL::text, p_broadcast_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event              crm_events%ROWTYPE;
  v_current_count      int;
  v_attendee_id        uuid;
  v_existing           record;
  v_existing_other_id  uuid;
  v_move_result        jsonb;
  v_promote_status     text;
  v_phone              text;
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_event FROM crm_events WHERE id = p_event_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  UPDATE crm_leads SET unsubscribed_at = NULL, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id AND unsubscribed_at IS NOT NULL;

  SELECT phone INTO v_phone FROM crm_leads WHERE id = p_lead_id AND tenant_id = p_tenant_id LIMIT 1;

  SELECT a.id INTO v_existing_other_id
    FROM crm_event_attendees a JOIN crm_events e ON e.id = a.event_id
   WHERE a.lead_id = p_lead_id AND a.tenant_id = p_tenant_id AND a.event_id <> p_event_id
     AND a.status IN ('waiting_list','invited') AND a.is_deleted = false
     AND e.status NOT IN ('completed','cancelled') AND e.is_deleted = false
   ORDER BY a.created_at DESC LIMIT 1;

  IF v_existing_other_id IS NOT NULL THEN
    v_move_result := move_attendee_between_events(v_existing_other_id, p_event_id);
    PERFORM public._record_touchpoint(
      p_tenant_id, p_lead_id, v_phone, 'event_register',
      p_event_id, (v_move_result->>'new_attendee_id')::uuid,
      NULL, p_short_link_code, p_broadcast_id,
      p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, p_utm_campaign_id,
      p_referrer_url, p_landing_url,
      'event_register:' || (v_move_result->>'new_attendee_id')
    );
    RETURN jsonb_build_object('success', true, 'auto_moved', true,
      'attendee_id', v_move_result->>'new_attendee_id', 'status', v_move_result->>'new_status',
      'fee_mismatch', (v_move_result->>'fee_mismatch')::boolean);
  END IF;

  SELECT id, is_deleted, status INTO v_existing FROM crm_event_attendees
   WHERE tenant_id = p_tenant_id AND lead_id = p_lead_id AND event_id = p_event_id;

  IF FOUND THEN
    IF v_existing.is_deleted = false THEN
      IF v_existing.status = 'invited' THEN
        SELECT COUNT(*) INTO v_current_count FROM crm_event_attendees
         WHERE event_id = p_event_id AND tenant_id = p_tenant_id
           AND status NOT IN ('cancelled', 'duplicate', 'invited')
           AND is_deleted = false AND id <> v_existing.id;
        IF v_current_count >= v_event.max_capacity THEN
          v_promote_status := CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END;
        ELSE
          v_promote_status := 'registered';
        END IF;
        UPDATE crm_event_attendees SET status = v_promote_status, registration_method = p_method
         WHERE id = v_existing.id AND tenant_id = p_tenant_id;
        PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
        PERFORM public._record_touchpoint(
          p_tenant_id, p_lead_id, v_phone, 'event_register',
          p_event_id, v_existing.id,
          NULL, p_short_link_code, p_broadcast_id,
          p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, p_utm_campaign_id,
          p_referrer_url, p_landing_url,
          'event_register:' || v_existing.id::text
        );
        RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', v_promote_status);
      ELSE
        RETURN jsonb_build_object('success', false, 'error', 'already_registered', 'attendee_id', v_existing.id);
      END IF;
    ELSE
      UPDATE crm_event_attendees
         SET is_deleted = false, status = 'registered', registration_method = p_method, checked_in_at = NULL
       WHERE id = v_existing.id AND tenant_id = p_tenant_id;
      PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
      PERFORM public._record_touchpoint(
        p_tenant_id, p_lead_id, v_phone, 'event_register',
        p_event_id, v_existing.id,
        NULL, p_short_link_code, p_broadcast_id,
        p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, p_utm_campaign_id,
        p_referrer_url, p_landing_url,
        'event_register:' || v_existing.id::text
      );
      RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', 'registered');
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_current_count FROM crm_event_attendees
   WHERE event_id = p_event_id AND tenant_id = p_tenant_id
     AND status NOT IN ('cancelled', 'duplicate', 'invited') AND is_deleted = false;

  IF v_current_count >= v_event.max_capacity THEN
    INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
    VALUES (p_tenant_id, p_lead_id, p_event_id,
            CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END, p_method)
    RETURNING id INTO v_attendee_id;
    PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
    PERFORM public._record_touchpoint(
      p_tenant_id, p_lead_id, v_phone, 'event_register',
      p_event_id, v_attendee_id,
      NULL, p_short_link_code, p_broadcast_id,
      p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, p_utm_campaign_id,
      p_referrer_url, p_landing_url,
      'event_register:' || v_attendee_id::text
    );
    RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id,
      'status', CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END);
  END IF;

  INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
  VALUES (p_tenant_id, p_lead_id, p_event_id, 'registered', p_method)
  RETURNING id INTO v_attendee_id;
  PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
  PERFORM public._record_touchpoint(
    p_tenant_id, p_lead_id, v_phone, 'event_register',
    p_event_id, v_attendee_id,
    NULL, p_short_link_code, p_broadcast_id,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, p_utm_campaign_id,
    p_referrer_url, p_landing_url,
    'event_register:' || v_attendee_id::text
  );
  RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'registered');
END;
$function$;

-- A.5 — resolve_touchpoints_to_lead: upgrade weakest Block A (NULL trap fires anon) to canonical 3-role-aware
CREATE OR REPLACE FUNCTION public.resolve_touchpoints_to_lead(p_tenant_id uuid, p_lead_id uuid, p_phone_normalized text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_count      int  := 0;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
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

-- ====================================================================
-- Section B: ALTER FUNCTION SET search_path (body unchanged for 3 RPCs)
-- ====================================================================

ALTER FUNCTION public.is_platform_super_admin() SET search_path TO 'public';
ALTER FUNCTION public.promote_to_platform(uuid[]) SET search_path TO 'public';
ALTER FUNCTION public.promote_lead_on_message_sent() SET search_path TO 'public';

-- ====================================================================
-- Section C: REVOKE EXECUTE FROM anon + GRANT to authenticated/service_role (14 Option B RPCs)
-- ====================================================================

REVOKE EXECUTE ON FUNCTION public.acknowledge_failed_messages(uuid[], text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.acknowledge_failed_messages(uuid[], text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.attendee_status_change_event_fn() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.attendee_status_change_event_fn() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.event_status_change_event_fn() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.event_status_change_event_fn() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.event_status_close_recycle_leads_fn() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.event_status_close_recycle_leads_fn() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_all_tenants_overview() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_all_tenants_overview() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.increment_paid_amount(uuid, numeric) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.increment_paid_amount(uuid, numeric) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.increment_prepaid_used(uuid, numeric) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.increment_prepaid_used(uuid, numeric) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_platform_super_admin() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_platform_super_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.lead_status_change_event_fn() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.lead_status_change_event_fn() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.mark_translations_stale(uuid, text[]) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.mark_translations_stale(uuid, text[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.promote_lead_on_message_sent() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.promote_lead_on_message_sent() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.promote_to_platform(uuid[]) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.promote_to_platform(uuid[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.register_lead_to_event(uuid, uuid, uuid, text, text, text, text, text, text, text, text, text, text, uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.register_lead_to_event(uuid, uuid, uuid, text, text, text, text, text, text, text, text, text, text, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.resolve_touchpoints_to_lead(uuid, uuid, text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.resolve_touchpoints_to_lead(uuid, uuid, text) TO authenticated, service_role;

-- ====================================================================
-- Option C — validate_slug: NO change (anon EXECUTE retained for storefront signup flow)
-- ====================================================================
-- No statement; existing GRANT EXECUTE TO anon stays.
