-- SECURITY_HOTFIX_2026_05_13 §6.4 — Mutator RPCs JWT-claim tenant validation + REVOKE
--
-- Audit Finding 10 (STAFF-DATA-HARM): 9 SECURITY DEFINER mutators with no JWT
-- validation, accepting caller-supplied p_tenant_id. submit_storefront_lead is
-- handled by §6.7 (the EF cutover). The other 8 are handled here.
--
-- Pattern (canonical JWT gate, Iron Rule 15 alignment):
--   v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
--   IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
--     RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
--   END IF;
--
-- Special case: increment_shipment_counters has no p_tenant_id — resolves
-- tenant from the shipments row before comparing against the JWT claim.
--
-- Bonus defense-in-depth: every function recreation also adds
--   SET search_path = 'public'
-- closing the function_search_path_mutable WARN (audit Finding 17) for these
-- 8 functions specifically. Other 29 functions remain in scope for a future
-- bulk cleanup SPEC.
--
-- Iron Rule 22 / M4-DB-01: REVOKE includes FROM PUBLIC.

BEGIN;

-- =====================================================================
-- 1. apply_stock_count_delta
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
SET search_path = 'public'
AS $function$
DECLARE
  v_current_qty INTEGER;
  v_delta INTEGER;
  v_new_qty INTEGER;
  v_jwt_tenant uuid := nullif(
    ((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2026_05_13: JWT-claim tenant validation
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;

  -- Lock the row and read current quantity atomically
  SELECT quantity INTO v_current_qty
  FROM inventory
  WHERE id = p_inventory_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_inventory_id;
  END IF;

  -- Calculate delta from CURRENT state (not start-of-count state)
  v_delta := p_counted_qty - v_current_qty;
  v_new_qty := p_counted_qty;

  -- Guard against negative
  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Quantity cannot go below zero (item: %, counted: %, current: %)',
      p_inventory_id, p_counted_qty, v_current_qty;
  END IF;

  -- Apply counted quantity
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
-- 2. increment_shipment_counters — SPECIAL CASE (no p_tenant_id param)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.increment_shipment_counters(
  p_shipment_id uuid,
  p_items_delta integer,
  p_value_delta numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_jwt_tenant uuid := nullif(
    ((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_shipment_tenant uuid;
BEGIN
  -- SECURITY_HOTFIX_2026_05_13: JWT-claim tenant validation via shipment row
  IF v_jwt_tenant IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: missing tenant context' USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id INTO v_shipment_tenant FROM shipments WHERE id = p_shipment_id;
  IF v_shipment_tenant IS NULL OR v_shipment_tenant <> v_jwt_tenant THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch on shipment' USING ERRCODE = '42501';
  END IF;

  UPDATE shipments
  SET items_count = items_count + p_items_delta,
      total_value = total_value + p_value_delta
  WHERE id = p_shipment_id;
END;
$function$;

-- =====================================================================
-- 3. next_box_number
-- =====================================================================
CREATE OR REPLACE FUNCTION public.next_box_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_max INTEGER;
  v_jwt_tenant uuid := nullif(
    ((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2026_05_13: JWT-claim tenant validation
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;

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
-- 4. next_internal_doc_number
-- =====================================================================
CREATE OR REPLACE FUNCTION public.next_internal_doc_number(
  p_tenant_id uuid,
  p_prefix text DEFAULT 'DOC'::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_max_seq INT;
  v_new_number TEXT;
  v_jwt_tenant uuid := nullif(
    ((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2026_05_13: JWT-claim tenant validation
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;

  -- Lock tenant row to serialize concurrent calls
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;

  -- Find max sequence INCLUDING deleted docs (unique index covers all rows)
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
-- 5. next_po_number
-- =====================================================================
CREATE OR REPLACE FUNCTION public.next_po_number(
  p_tenant_id uuid,
  p_supplier_number text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_max_seq INT;
  v_prefix TEXT;
  v_new_number TEXT;
  v_jwt_tenant uuid := nullif(
    ((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2026_05_13: JWT-claim tenant validation
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;

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
-- 6. next_return_number
-- =====================================================================
CREATE OR REPLACE FUNCTION public.next_return_number(
  p_tenant_id uuid,
  p_supplier_number text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_max_seq INT;
  v_prefix TEXT;
  v_new_number TEXT;
  v_jwt_tenant uuid := nullif(
    ((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2026_05_13: JWT-claim tenant validation
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;

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
-- 7. record_purchase  (already had SET search_path TO 'public' — preserved)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.record_purchase(
  p_tenant_id uuid,
  p_attendee_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_attendee crm_event_attendees%ROWTYPE;
  v_jwt_tenant uuid := nullif(
    ((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2026_05_13: JWT-claim tenant validation
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;

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
-- 8. register_lead_to_event
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
SET search_path = 'public'
AS $function$
DECLARE
  v_event              crm_events%ROWTYPE;
  v_current_count      int;
  v_attendee_id        uuid;
  v_existing           record;
  v_existing_other_id  uuid;
  v_move_result        jsonb;
  v_promote_status     text;
  v_jwt_tenant uuid := nullif(
    ((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2026_05_13: JWT-claim tenant validation
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;

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
        -- M4_INVITED_GHOST_ATTENDEE_FIX 2026-05-13: exclude 'invited' from capacity counts.
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

  -- Fresh-INSERT path. M4_INVITED_GHOST_ATTENDEE_FIX: exclude 'invited' from capacity.
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

-- =====================================================================
-- REVOKE + GRANT discipline (Iron Rule 22 — strip PUBLIC inheritance)
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.apply_stock_count_delta(uuid, integer, uuid, uuid, uuid)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_shipment_counters(uuid, integer, numeric)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_box_number(uuid)                                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_internal_doc_number(uuid, text)                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_po_number(uuid, text)                                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_return_number(uuid, text)                              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_purchase(uuid, uuid, numeric)                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.register_lead_to_event(uuid, uuid, uuid, text)              FROM PUBLIC, anon, authenticated;

-- Restore authenticated EXECUTE (admin UI uses PIN-minted JWT with tenant claim).
GRANT EXECUTE ON FUNCTION public.apply_stock_count_delta(uuid, integer, uuid, uuid, uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_shipment_counters(uuid, integer, numeric)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_box_number(uuid)                                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_internal_doc_number(uuid, text)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_po_number(uuid, text)                                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_return_number(uuid, text)                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_purchase(uuid, uuid, numeric)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_lead_to_event(uuid, uuid, uuid, text)              TO authenticated;
-- service_role retains EXECUTE by default.

COMMIT;
