-- SECURITY_HOTFIX_2026_05_13 §6.4 ROLLBACK
--
-- Restores the 8 mutator RPCs to their pre-hotfix bodies (no JWT validation,
-- search_path mutable) AND restores anon + authenticated EXECUTE grants.
-- Re-introduces the STAFF-DATA-HARM risk; use only if a smoke failure proves
-- the JWT gate breaks legitimate calls in a way that cannot be fixed forward.

BEGIN;

-- =====================================================================
-- 1. apply_stock_count_delta (original body, no JWT gate, no search_path)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.apply_stock_count_delta(
  p_inventory_id uuid,
  p_counted_qty integer,
  p_tenant_id uuid,
  p_user_id uuid,
  p_count_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_current_qty INTEGER;
  v_delta INTEGER;
  v_new_qty INTEGER;
BEGIN
  SELECT quantity INTO v_current_qty
  FROM inventory
  WHERE id = p_inventory_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_inventory_id;
  END IF;

  v_delta := p_counted_qty - v_current_qty;
  v_new_qty := p_counted_qty;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Quantity cannot go below zero (item: %, counted: %, current: %)',
      p_inventory_id, p_counted_qty, v_current_qty;
  END IF;

  UPDATE inventory SET quantity = v_new_qty
  WHERE id = p_inventory_id AND tenant_id = p_tenant_id;

  RETURN json_build_object(
    'previous_qty', v_current_qty,
    'counted_qty', p_counted_qty,
    'delta', v_delta,
    'new_qty', v_new_qty
  );
END;
$function$;

-- =====================================================================
-- 2. increment_shipment_counters (original)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.increment_shipment_counters(
  p_shipment_id uuid,
  p_items_delta integer,
  p_value_delta numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE shipments
  SET items_count = items_count + p_items_delta,
      total_value = total_value + p_value_delta
  WHERE id = p_shipment_id;
END;
$function$;

-- =====================================================================
-- 3. next_box_number (original)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.next_box_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_max INTEGER;
BEGIN
  PERFORM 1 FROM tenants WHERE id = p_tenant_id FOR UPDATE;

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(box_number FROM 5) AS INTEGER)), 0)
  INTO v_max
  FROM shipments
  WHERE tenant_id = p_tenant_id
    AND box_number LIKE 'BOX-%'
    AND is_deleted = false;

  RETURN 'BOX-' || LPAD((v_max + 1)::TEXT, 4, '0');
END;
$function$;

-- =====================================================================
-- 4. next_internal_doc_number (original)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.next_internal_doc_number(
  p_tenant_id uuid,
  p_prefix text DEFAULT 'DOC'::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_max_seq INT;
  v_new_number TEXT;
BEGIN
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(internal_number FROM LENGTH(p_prefix) + 2) AS INT)
  ), 0)
  INTO v_max_seq
  FROM supplier_documents
  WHERE tenant_id = p_tenant_id
    AND internal_number LIKE p_prefix || '-%';

  v_new_number := p_prefix || '-' || LPAD((v_max_seq + 1)::TEXT, 5, '0');
  RETURN v_new_number;
END;
$function$;

-- =====================================================================
-- 5. next_po_number (original)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.next_po_number(
  p_tenant_id uuid,
  p_supplier_number text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_max_seq INT;
  v_prefix TEXT;
  v_new_number TEXT;
BEGIN
  v_prefix := 'PO-' || p_supplier_number || '-';
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(po_number FROM LENGTH(v_prefix) + 1) AS INT)
  ), 0)
  INTO v_max_seq
  FROM purchase_orders
  WHERE tenant_id = p_tenant_id
    AND po_number LIKE v_prefix || '%';
  v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 4, '0');
  RETURN v_new_number;
END;
$function$;

-- =====================================================================
-- 6. next_return_number (original)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.next_return_number(
  p_tenant_id uuid,
  p_supplier_number text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_max_seq INT;
  v_prefix TEXT;
  v_new_number TEXT;
BEGIN
  v_prefix := 'RET-' || p_supplier_number || '-';
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(return_number FROM LENGTH(v_prefix) + 1) AS INT)
  ), 0)
  INTO v_max_seq
  FROM supplier_returns
  WHERE tenant_id = p_tenant_id
    AND return_number LIKE v_prefix || '%';
  v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 4, '0');
  RETURN v_new_number;
END;
$function$;

-- =====================================================================
-- 7. record_purchase (original — had SET search_path TO 'public' already)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.record_purchase(
  p_tenant_id uuid,
  p_attendee_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_attendee crm_event_attendees%ROWTYPE;
BEGIN
  SELECT * INTO v_attendee FROM crm_event_attendees
   WHERE id = p_attendee_id AND tenant_id = p_tenant_id AND is_deleted = false FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'attendee_not_found');
  END IF;

  UPDATE crm_event_attendees
     SET purchase_amount = p_amount, purchased_at = now()
   WHERE id = p_attendee_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('success', true, 'attendee_id', p_attendee_id, 'purchase_amount', p_amount);
END;
$function$;

-- =====================================================================
-- 8. register_lead_to_event (original)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.register_lead_to_event(
  p_tenant_id uuid,
  p_lead_id uuid,
  p_event_id uuid,
  p_method text DEFAULT 'manual'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_event              crm_events%ROWTYPE;
  v_current_count      int;
  v_attendee_id        uuid;
  v_existing           record;
  v_existing_other_id  uuid;
  v_move_result        jsonb;
  v_promote_status     text;
BEGIN
  SELECT * INTO v_event FROM crm_events
   WHERE id = p_event_id AND tenant_id = p_tenant_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  UPDATE crm_leads
     SET unsubscribed_at = NULL, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id AND unsubscribed_at IS NOT NULL;

  SELECT a.id INTO v_existing_other_id
    FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id
   WHERE a.lead_id = p_lead_id
     AND a.tenant_id = p_tenant_id
     AND a.event_id <> p_event_id
     AND a.status IN ('waiting_list','invited')
     AND a.is_deleted = false
     AND e.status NOT IN ('completed','cancelled')
     AND e.is_deleted = false
   ORDER BY a.created_at DESC
   LIMIT 1;

  IF v_existing_other_id IS NOT NULL THEN
    v_move_result := move_attendee_between_events(v_existing_other_id, p_event_id);
    RETURN jsonb_build_object(
      'success', true,
      'auto_moved', true,
      'attendee_id', v_move_result->>'new_attendee_id',
      'status', v_move_result->>'new_status',
      'fee_mismatch', (v_move_result->>'fee_mismatch')::boolean
    );
  END IF;

  SELECT id, is_deleted, status INTO v_existing FROM crm_event_attendees
   WHERE tenant_id = p_tenant_id AND lead_id = p_lead_id AND event_id = p_event_id;

  IF FOUND THEN
    IF v_existing.is_deleted = false THEN
      IF v_existing.status = 'invited' THEN
        SELECT COUNT(*) INTO v_current_count
          FROM crm_event_attendees
         WHERE event_id = p_event_id AND tenant_id = p_tenant_id
           AND status NOT IN ('cancelled', 'duplicate', 'invited')
           AND is_deleted = false
           AND id <> v_existing.id;

        IF v_current_count >= v_event.max_capacity THEN
          v_promote_status := CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END;
        ELSE
          v_promote_status := 'registered';
        END IF;

        UPDATE crm_event_attendees
           SET status = v_promote_status, registration_method = p_method
         WHERE id = v_existing.id AND tenant_id = p_tenant_id;

        PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
        RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', v_promote_status);
      ELSE
        RETURN jsonb_build_object('success', false, 'error', 'already_registered', 'attendee_id', v_existing.id);
      END IF;
    ELSE
      UPDATE crm_event_attendees
         SET is_deleted = false, status = 'registered', registration_method = p_method,
             checked_in_at = NULL
       WHERE id = v_existing.id AND tenant_id = p_tenant_id;
      PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
      RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', 'registered');
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_current_count
    FROM crm_event_attendees
   WHERE event_id = p_event_id AND tenant_id = p_tenant_id
     AND status NOT IN ('cancelled', 'duplicate', 'invited') AND is_deleted = false;

  IF v_current_count >= v_event.max_capacity THEN
    INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
    VALUES (p_tenant_id, p_lead_id, p_event_id,
            CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END,
            p_method)
    RETURNING id INTO v_attendee_id;
    PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
    RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'waiting_list');
  END IF;

  INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
  VALUES (p_tenant_id, p_lead_id, p_event_id, 'registered', p_method)
  RETURNING id INTO v_attendee_id;
  PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
  RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'registered');
END;
$function$;

-- Restore prior anon + authenticated grants.
GRANT EXECUTE ON FUNCTION public.apply_stock_count_delta(uuid, integer, uuid, uuid, uuid)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_shipment_counters(uuid, integer, numeric)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_box_number(uuid)                                       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_internal_doc_number(uuid, text)                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_po_number(uuid, text)                                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_return_number(uuid, text)                              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_purchase(uuid, uuid, numeric)                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_lead_to_event(uuid, uuid, uuid, text)              TO anon, authenticated;

COMMIT;
