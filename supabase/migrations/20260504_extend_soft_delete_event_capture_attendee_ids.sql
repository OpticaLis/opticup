-- =============================================================================
-- Migration v2 of soft_delete_event_if_empty(p_tenant_id, p_event_id).
--
-- Identical to v1 (20260504_add_soft_delete_event_if_empty_rpc.sql) EXCEPT:
-- captures the explicit list of attendee IDs (BEFORE the cascade soft-delete)
-- and persists it in the activity_log row's `details` jsonb under the new
-- key `attendee_ids` (text[] of UUID-as-text).
--
-- Required by RESTORE_DELETED_EVENT_UI Approach B: the inverse RPC
-- (`restore_event_from_log`) reads this array back to selectively restore
-- only the attendees that existed at delete time, never re-activating
-- attendees that were already deleted before this event delete.
--
-- Tenant isolation, locking, and return shape are unchanged.
-- Iron Rule 14: tenant_id filter on every UPDATE. Iron Rule 15: SECURITY
-- DEFINER + explicit JWT-claim-equivalent (the function's own
-- p_tenant_id parameter is the tenant boundary).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_event_if_empty(
  p_tenant_id uuid,
  p_event_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_tenant       uuid;
  v_event_number       integer;
  v_event_name         text;
  v_total_purchases    numeric;
  v_attendee_ids       text[];
  v_deleted_attendees  integer;
  v_cancelled_messages integer;
BEGIN
  -- 1. Lock the event row + verify tenant ownership.
  SELECT tenant_id, event_number, name
    INTO v_event_tenant, v_event_number, v_event_name
    FROM public.crm_events
   WHERE id = p_event_id
   FOR UPDATE;

  IF v_event_tenant IS NULL OR v_event_tenant <> p_tenant_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  -- 2. Compute total purchases across non-deleted attendees of this event.
  SELECT COALESCE(SUM(COALESCE(purchase_amount, 0)), 0)
    INTO v_total_purchases
    FROM public.crm_event_attendees
   WHERE event_id  = p_event_id
     AND tenant_id = p_tenant_id
     AND is_deleted = false;

  IF v_total_purchases > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'has_purchases',
      'total_purchases', v_total_purchases
    );
  END IF;

  -- 3. Capture the explicit list of currently-active attendee IDs BEFORE
  --    the cascade. This is the Approach B audit-trail field that lets
  --    restore_event_from_log selectively re-activate exactly these rows
  --    without disturbing any attendee that was deleted earlier.
  SELECT COALESCE(array_agg(id::text), ARRAY[]::text[])
    INTO v_attendee_ids
    FROM public.crm_event_attendees
   WHERE event_id   = p_event_id
     AND tenant_id  = p_tenant_id
     AND is_deleted = false;

  -- 4. Soft-delete the event.
  UPDATE public.crm_events
     SET is_deleted = true
   WHERE id        = p_event_id
     AND tenant_id = p_tenant_id;

  -- 5. Cascade: soft-delete every non-deleted attendee on this event.
  WITH cascade_atts AS (
    UPDATE public.crm_event_attendees
       SET is_deleted = true
     WHERE event_id   = p_event_id
       AND tenant_id  = p_tenant_id
       AND is_deleted = false
     RETURNING 1
  )
  SELECT count(*) INTO v_deleted_attendees FROM cascade_atts;

  -- 6. Cancel any queued/pending message-queue rows for this event.
  WITH cancelled_msgs AS (
    UPDATE public.crm_message_queue
       SET status = 'cancelled'
     WHERE event_id  = p_event_id
       AND tenant_id = p_tenant_id
       AND status IN ('queued', 'pending')
     RETURNING 1
  )
  SELECT count(*) INTO v_cancelled_messages FROM cancelled_msgs;

  -- 7. Activity-log entry — now includes attendee_ids array (Approach B).
  INSERT INTO public.activity_log (tenant_id, level, action, entity_type, entity_id, details)
  VALUES (
    p_tenant_id,
    'info',
    'crm.event.delete',
    'crm_events',
    p_event_id::text,
    jsonb_build_object(
      'event_id',           p_event_id,
      'event_number',       v_event_number,
      'event_name',          v_event_name,
      'deleted_attendees',  v_deleted_attendees,
      'cancelled_messages', v_cancelled_messages,
      'attendee_ids',       to_jsonb(v_attendee_ids)
    )
  );

  RETURN jsonb_build_object(
    'success',            true,
    'deleted_attendees',  v_deleted_attendees,
    'cancelled_messages', v_cancelled_messages
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_event_if_empty(uuid, uuid) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.soft_delete_event_if_empty(uuid, uuid) IS
  'Soft-deletes a CRM event only when no purchases exist on its attendees. Cascades to attendees and cancels queued messages. v2 (2026-05-04): records the explicit attendee_ids array in activity_log.details for inverse-restore by restore_event_from_log. SECURITY DEFINER with explicit tenant_id filter on every write.';
