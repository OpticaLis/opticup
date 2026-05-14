-- INTEGRATION_TEST.sql — M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX
-- Reproducible integration test for the fresh-INSERT closed+over-capacity branch.
-- Ran 2026-05-14 against demo tenant (8d8cfa7e-ef58-49af-9702-a862d459cccb) post-migration.
--
-- Captures the RPC return jsonb + the inserted attendee row's status into a TEMP
-- TABLE so the result is observable through MCP execute_sql (DO blocks alone
-- swallow RAISE NOTICE output).
--
-- Captured result on the canonical run:
--   db_row_status : "event_closed"
--   event_no      : 99992
--   pass          : true
--   rpc_return    : {"status":"event_closed","success":true,"attendee_id":"42485f52-8a9c-49f1-a792-6c02e60a9c4d"}
--
-- All test rows (1 event + 2 leads + 2 attendees) cleaned up before the TEMP
-- TABLE is dropped. Demo + Prizma counts bit-identical pre/post.

CREATE TEMP TABLE _m4_rs_test_capture (label text, val jsonb);

DO $$
DECLARE
  v_demo_tenant uuid := '8d8cfa7e-ef58-49af-9702-a862d459cccb';
  v_demo_campaign uuid := '9282b8ea-edd8-42ea-b3c3-e000f010db38';
  v_event_id uuid;
  v_event_no int;
  v_filler_lead_id uuid;
  v_fresh_lead_id uuid;
  v_filler_attendee_id uuid;
  v_rpc_result jsonb;
  v_inserted_status text;
  v_inserted_attendee_id uuid;
BEGIN
  -- JWT-claim setup (Iron Rule 15 canonical tenant-isolation gate inside the RPC).
  PERFORM set_config('request.jwt.claims', json_build_object('tenant_id', v_demo_tenant::text)::text, true);
  v_event_no := next_crm_event_number(v_demo_tenant, v_demo_campaign);

  -- 1. CLOSED event, max_capacity=1.
  INSERT INTO crm_events (tenant_id, campaign_id, event_number, name, event_date, location_address, coupon_code, max_capacity, status, is_deleted)
  VALUES (v_demo_tenant, v_demo_campaign, v_event_no, 'TEST_M4_RETURN_SHAPE_FIX_2026_05_14_CAPTURE',
          (current_date + 30)::date, 'TEST_LOCATION', 'TEST_COUPON_M4_RS_CAP', 1, 'closed', false)
  RETURNING id INTO v_event_id;

  -- 2. Filler lead + filler attendee at status=registered → capacity 1/1.
  INSERT INTO crm_leads (tenant_id, full_name, phone, status, is_deleted)
  VALUES (v_demo_tenant, 'TEST_M4_FILLER_RS_CAP', '0503348349', 'waiting', false)
  RETURNING id INTO v_filler_lead_id;

  INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method, is_deleted)
  VALUES (v_demo_tenant, v_filler_lead_id, v_event_id, 'registered', 'test_setup', false)
  RETURNING id INTO v_filler_attendee_id;

  -- 3. Fresh lead (the actor that triggers the fresh-INSERT branch).
  INSERT INTO crm_leads (tenant_id, full_name, phone, status, is_deleted)
  VALUES (v_demo_tenant, 'TEST_M4_FRESH_RS_CAP', '0507168471', 'waiting', false)
  RETURNING id INTO v_fresh_lead_id;

  -- 4. Call the RPC. This is the FIND-1 path: closed event + over-capacity + no
  --    existing row + no other-event waiting/invited row → fresh INSERT branch.
  v_rpc_result := register_lead_to_event(v_demo_tenant, v_fresh_lead_id, v_event_id, 'integration_test_m4_rs');

  -- 5. Capture for inspection by the caller.
  INSERT INTO _m4_rs_test_capture(label, val) VALUES ('rpc_return', v_rpc_result);
  INSERT INTO _m4_rs_test_capture(label, val) VALUES ('event_no', to_jsonb(v_event_no));

  v_inserted_attendee_id := (v_rpc_result->>'attendee_id')::uuid;
  SELECT status INTO v_inserted_status
    FROM crm_event_attendees
   WHERE id = v_inserted_attendee_id AND tenant_id = v_demo_tenant;

  INSERT INTO _m4_rs_test_capture(label, val) VALUES ('db_row_status', to_jsonb(v_inserted_status));
  INSERT INTO _m4_rs_test_capture(label, val) VALUES ('pass',
    to_jsonb(((v_rpc_result->>'success')::boolean = true)
          AND ((v_rpc_result->>'status') = 'event_closed')
          AND (v_inserted_status = 'event_closed')));

  -- 6. Cleanup — id-scoped + tenant-scoped per Iron Rule 22.
  DELETE FROM crm_event_attendees
    WHERE tenant_id = v_demo_tenant AND event_id = v_event_id;
  DELETE FROM crm_leads
    WHERE tenant_id = v_demo_tenant AND id IN (v_filler_lead_id, v_fresh_lead_id);
  DELETE FROM crm_events
    WHERE tenant_id = v_demo_tenant AND id = v_event_id;
END $$;

SELECT label, val FROM _m4_rs_test_capture ORDER BY label;

-- TEMP TABLE _m4_rs_test_capture auto-drops at session end; no explicit
-- cleanup statement included here. (The Iron-Rule-32 pre-commit gate
-- matches the literal string for temp-table teardown without distinguishing
-- temp tables from real ones — see this SPEC's FINDINGS.md.)
