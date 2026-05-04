-- =============================================================================
-- soft_delete_event_if_empty(p_tenant_id uuid, p_event_id uuid)
-- Soft-deletes a CRM event ONLY IF no purchases were made on it.
-- Cascades soft-delete to all attendees on the event and cancels any
-- queued/pending message-queue rows. Writes a single activity_log entry.
--
-- Returns JSON:
--   { success: true,  deleted_attendees: N, cancelled_messages: M }
--   { success: false, error: 'event_not_found' }
--   { success: false, error: 'has_purchases', total_purchases: NN.NN }
--
-- Tenant isolation: the function explicitly filters every UPDATE by
-- p_tenant_id (Iron Rule 14 + Rule 22 defense-in-depth) AND verifies
-- the event belongs to the tenant before any writes.
--
-- Atomicity: SELECT FOR UPDATE locks the crm_events row for the
-- duration of the transaction, preventing a race where another caller
-- could insert a purchased attendee between the check and the delete.
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
  v_event_tenant   uuid;
  v_event_number   integer;
  v_event_name     text;
  v_total_purchases numeric;
  v_deleted_attendees integer;
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

  -- 3. Soft-delete the event.
  UPDATE public.crm_events
     SET is_deleted = true
   WHERE id        = p_event_id
     AND tenant_id = p_tenant_id;

  -- 4. Cascade: soft-delete every non-deleted attendee on this event.
  WITH cascade_atts AS (
    UPDATE public.crm_event_attendees
       SET is_deleted = true
     WHERE event_id   = p_event_id
       AND tenant_id  = p_tenant_id
       AND is_deleted = false
     RETURNING 1
  )
  SELECT count(*) INTO v_deleted_attendees FROM cascade_atts;

  -- 5. Cancel any queued/pending message-queue rows for this event.
  WITH cancelled_msgs AS (
    UPDATE public.crm_message_queue
       SET status = 'cancelled'
     WHERE event_id  = p_event_id
       AND tenant_id = p_tenant_id
       AND status IN ('queued', 'pending')
     RETURNING 1
  )
  SELECT count(*) INTO v_cancelled_messages FROM cancelled_msgs;

  -- 6. Activity-log entry.
  INSERT INTO public.activity_log (tenant_id, level, action, entity_type, entity_id, details)
  VALUES (
    p_tenant_id,
    'info',
    'crm.event.delete',
    'crm_events',
    p_event_id::text,
    jsonb_build_object(
      'event_id', p_event_id,
      'event_number', v_event_number,
      'event_name', v_event_name,
      'deleted_attendees', v_deleted_attendees,
      'cancelled_messages', v_cancelled_messages
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_attendees', v_deleted_attendees,
    'cancelled_messages', v_cancelled_messages
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_event_if_empty(uuid, uuid) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.soft_delete_event_if_empty(uuid, uuid) IS
  'Soft-deletes a CRM event only when no purchases exist on its attendees. Cascades to attendees and cancels queued messages. Writes activity_log row. SECURITY DEFINER with explicit tenant_id filter on every write.';
