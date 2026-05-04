-- =============================================================================
-- restore_event_from_log(p_tenant_id uuid, p_log_id uuid)
-- Inverse of soft_delete_event_if_empty. Restores a CRM event AND the
-- explicit list of attendees recorded in the source `crm.event.delete`
-- activity_log row's `details->'attendee_ids'` array (Approach B).
--
-- Returns JSON:
--   { success: true,  event_id, restored_attendees: N, source_log_id }
--   { success: false, error: 'invalid_log_id' }
--   { success: false, error: 'event_not_found' }
--   { success: false, error: 'event_not_deleted' }
--
-- Backward compatibility: if the source log row predates v2 of
-- soft_delete_event_if_empty (no `attendee_ids` key in details), the
-- event row is restored alone and the response carries
-- `restored_attendees: 0` with `note: 'pre_v2_log_event_only'`.
--
-- Tenant isolation: every UPDATE filters by p_tenant_id (Iron Rule 14 +
-- Rule 22 defense-in-depth). The function refuses log rows whose
-- tenant_id <> p_tenant_id (cross-tenant restore is impossible).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.restore_event_from_log(
  p_tenant_id uuid,
  p_log_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_tenant   uuid;
  v_log_action   text;
  v_log_entity   text;
  v_log_entity_id text;
  v_log_details  jsonb;
  v_event_id     uuid;
  v_event_tenant uuid;
  v_event_is_deleted boolean;
  v_event_name   text;
  v_attendee_ids jsonb;
  v_restored     integer := 0;
  v_note         text;
BEGIN
  -- 1. Load the source log row and validate it.
  SELECT tenant_id, action, entity_type, entity_id, details
    INTO v_log_tenant, v_log_action, v_log_entity, v_log_entity_id, v_log_details
    FROM public.activity_log
   WHERE id = p_log_id;

  IF v_log_tenant IS NULL
     OR v_log_tenant <> p_tenant_id
     OR v_log_action <> 'crm.event.delete'
     OR v_log_entity <> 'crm_events'
     OR v_log_entity_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_log_id');
  END IF;

  -- Cast text entity_id to uuid (activity_log.entity_id is TEXT by schema).
  BEGIN
    v_event_id := v_log_entity_id::uuid;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_log_id');
  END;

  -- 2. Lock the event row + verify tenant ownership + currently-deleted state.
  SELECT tenant_id, is_deleted, name
    INTO v_event_tenant, v_event_is_deleted, v_event_name
    FROM public.crm_events
   WHERE id = v_event_id
     AND tenant_id = p_tenant_id
   FOR UPDATE;

  IF v_event_tenant IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  IF v_event_is_deleted = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_deleted');
  END IF;

  -- 3. Restore the event itself.
  UPDATE public.crm_events
     SET is_deleted = false
   WHERE id        = v_event_id
     AND tenant_id = p_tenant_id;

  -- 4. Restore attendees by EXPLICIT id list (Approach B).
  v_attendee_ids := v_log_details -> 'attendee_ids';

  IF v_attendee_ids IS NULL OR jsonb_array_length(v_attendee_ids) = 0 THEN
    -- Pre-v2 log row OR a fresh delete on an empty event. Event-only restore.
    v_restored := 0;
    v_note := CASE
      WHEN v_attendee_ids IS NULL THEN 'pre_v2_log_event_only'
      ELSE NULL
    END;
  ELSE
    WITH restored AS (
      UPDATE public.crm_event_attendees
         SET is_deleted = false
       WHERE id IN (
               SELECT (jsonb_array_elements_text(v_attendee_ids))::uuid
             )
         AND tenant_id  = p_tenant_id
         AND is_deleted = true
       RETURNING 1
    )
    SELECT count(*) INTO v_restored FROM restored;
  END IF;

  -- 5. Activity-log entry for the restore action.
  INSERT INTO public.activity_log (tenant_id, user_id, level, action, entity_type, entity_id, details)
  VALUES (
    p_tenant_id,
    auth.uid(),
    'info',
    'crm.event.restore',
    'crm_events',
    v_event_id::text,
    jsonb_build_object(
      'event_name',         v_event_name,
      'restored_attendees', v_restored,
      'source_log_id',      p_log_id::text
    ) || CASE WHEN v_note IS NOT NULL
              THEN jsonb_build_object('note', v_note)
              ELSE '{}'::jsonb
         END
  );

  RETURN jsonb_build_object(
    'success',            true,
    'event_id',           v_event_id,
    'restored_attendees', v_restored,
    'source_log_id',      p_log_id::text
  ) || CASE WHEN v_note IS NOT NULL
            THEN jsonb_build_object('note', v_note)
            ELSE '{}'::jsonb
       END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_event_from_log(uuid, uuid) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.restore_event_from_log(uuid, uuid) IS
  'Inverse of soft_delete_event_if_empty. Reads the explicit attendee_ids array from the source delete-log row''s details jsonb (Approach B) and restores exactly those attendees. Pre-v2 log rows (missing attendee_ids) restore the event alone with note=pre_v2_log_event_only. SECURITY DEFINER with strict tenant_id matching on log row, event row, and every UPDATE.';
