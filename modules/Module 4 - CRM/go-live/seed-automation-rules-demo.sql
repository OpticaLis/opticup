-- =============================================================================
-- seed-automation-rules-demo.sql — Optic Up CRM automation rules (demo tenant)
-- Snapshot regenerated 2026-04-28 by P5_V2_REBUILD_RUNG2_RULES_REWIRE.
-- Tenant:   demo (8d8cfa7e-ef58-49af-9702-a862d459cccb)
--
-- Rule set after Rung 2:
--   14 active rules (event/attendee/lead lifecycle + manual-move + scheduled queue_send)
--   8 inactive (T10 retired event_closed + 6 QA test rules + waiting_list status-change)
--
-- Idempotent: ON CONFLICT (tenant_id, name) DO UPDATE — re-running this file
-- restores the live state. Use to reset demo OR to seed a fresh tenant.
-- =============================================================================

BEGIN;

-- Wipe + reseed pattern matches the V2 rebuild — replays the exact live state.
DELETE FROM crm_automation_rules
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';

INSERT INTO crm_automation_rules
  (tenant_id, name, trigger_entity, trigger_event, trigger_condition, action_type, action_config, sort_order, is_active)
VALUES
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'QA TEST RULE — qa_redesign_test',
   'lead', 'created', '{"type":"always"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"qa_redesign_test","recipient_type":"trigger_lead"}',
   0, false),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'qa_redesign_test_rule_events',
   'event', 'status_change', '{"type":"status_equals","status":"registration_open"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"event_registration_open","recipient_type":"tier2_excl_registered"}',
   0, false),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'qa_round1_test_rule_attendees',
   'attendee', 'created', '{"type":"status_equals","status":"registered"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"event_registration_confirmation","recipient_type":"trigger_lead"}',
   0, false),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'qa_round1_test_rule_events',
   'event', 'status_change', '{"type":"status_equals","status":"closed"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"event_closed","recipient_type":"tier2_excl_registered","recipient_status_filter":["invited"]}',
   0, false),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'qa_round1_test_rule_incoming',
   'lead', 'created', '{"type":"always"}',
   'send_message',
   '{"channels":["sms"],"template_slug":"lead_intake_new","recipient_type":"trigger_lead"}',
   0, false),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'qa_round1_test_rule_tier2',
   'lead', 'status_change', '{"type":"status_equals","status":"confirmed"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"lead_intake_new","recipient_type":"trigger_lead"}',
   0, false),

  -- T3 — pre-open warning (24h before)
  -- PRE_CUTOVER_QA_A B4: skip_auto_promote keeps lead.status='waiting' so the
  -- "ייפתח מחר" notification does not flip waiting→invited; only the open
  -- registration rule (T4 / Rule 2.4) is allowed to invite.
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: ייפתח מחר',
   'event', 'status_change', '{"type":"status_equals","status":"will_open_tomorrow"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"event_will_open_tomorrow","recipient_type":"tier2_excl_registered","skip_auto_promote":true}',
   10, true),

  -- T4 — registration open
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: נפתחה הרשמה',
   'event', 'status_change', '{"type":"status_equals","status":"registration_open"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"event_registration_open","recipient_type":"tier2","recipient_status_filter":["waiting"]}',
   20, true),

  -- Rule 2.4 (V2) — parallel event opens → T7 to active waitlist + attendee_upsert
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'אירוע פתח להרשמה - הזמנת רשימת המתנה',
   'event', 'status_change', '{"type":"status_equals","status":"registration_open"}',
   'send_message',
   '{"channels":["sms","email"],"language":"he","template_slug":"event_invite_waiting_list","recipient_type":"cross_event_active_waitlist","post_action_attendee_upsert":{"status":"invited"}}',
   25, true),

  -- T5 — invite_new + Rule 2.2 attendee_upsert post-action
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: הזמנה חדשה',
   'event', 'status_change', '{"type":"status_equals","status":"invite_new"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"event_invite_new","recipient_type":"tier2_excl_registered","post_action_attendee_upsert":{"status":"invited"}}',
   30, true),

  -- T10 retired (Rung 2 / 2026-04-28). Row kept for audit; is_active=false.
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: אירוע נסגר',
   'event', 'status_change', '{"type":"status_equals","status":"closed"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"event_closed","recipient_type":"leads_by_status","recipient_status_filter":["invited"],"post_action_status_update":"waiting"}',
   40, false),

  -- Status-change waiting_list rule — kept inactive; over-capacity now fires T6 via attendee.created
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: רשימת המתנה',
   'event', 'status_change', '{"type":"status_equals","status":"waiting_list"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"event_waiting_list","recipient_type":"attendees_all_statuses"}',
   50, false),

  -- Rules 2.5 + 2.6 (V2) — scheduled queue_send via crm_message_queue + dispatch-queue + pg_cron
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: 2-3 ימים לפני',
   'event', 'status_change', '{"type":"status_equals","status":"2_3d_before"}',
   'queue_send',
   '{"channels":["sms","email"],"schedule":{"send_time":"10:00","offset_days":3},"template_slug":"event_2_3d_before","recipient_type":"attendees","recipient_status_filter":["confirmed"]}',
   60, true),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: יום אירוע',
   'event', 'status_change', '{"type":"status_equals","status":"event_day"}',
   'queue_send',
   '{"channels":["sms","email"],"schedule":{"send_time":"08:00","offset_days":0},"template_slug":"event_day","recipient_type":"attendees","recipient_status_filter":["confirmed"]}',
   70, true),

  -- T7 — invite_waiting_list (status-change-driven; recipient cross_event_active_waitlist)
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: הזמנה ממתינים',
   'event', 'status_change', '{"type":"status_equals","status":"invite_waiting_list"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"event_invite_waiting_list","recipient_type":"cross_event_active_waitlist","post_action_attendee_upsert":{"status":"invited"}}',
   80, true),

  -- Confirmation messages on registration
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'הרשמה: אישור הרשמה',
   'attendee', 'created', '{"type":"status_equals","status":"registered"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"event_registration_confirmation","recipient_type":"trigger_lead"}',
   100, true),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס ליד: ברוך הבא לרשומים',
   'lead', 'status_change', '{"type":"status_equals","status":"waiting"}',
   'send_message',
   '{"channels":["sms","email"],"language":"he","template_slug":"lead_intake_new","recipient_type":"trigger_lead"}',
   100, true),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: אירוע הושלם',
   'event', 'status_change', '{"type":"status_equals","status":"completed"}',
   'send_message',
   '{"channels":[],"template_slug":null,"recipient_type":"attendees_all_statuses","post_action_status_update":"waiting"}',
   100, true),

  -- T1 — lead_intake_new (server-side EF still dispatches; this rule covers the manual-CRM path)
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'ליד חדש: ברוך הבא',
   'lead', 'created', '{"type":"always"}',
   'send_message',
   '{"channels":["sms","email"],"language":"he","template_slug":"lead_intake_new","recipient_type":"trigger_lead"}',
   101, true),

  -- T6 — over-capacity registration response (V2 rewire — was event_waiting_list_confirmation)
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'הרשמה: אישור רשימת המתנה',
   'attendee', 'created', '{"type":"status_equals","status":"waiting_list"}',
   'send_message',
   '{"channels":["sms","email"],"template_slug":"event_waiting_list","recipient_type":"trigger_lead"}',
   110, true),

  -- Rule 2.7 (V2) — manual move notification, branched by attendee.payment_status
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'העברת משתתף ידנית - לא שילם',
   'attendee', 'moved', '{"type":"status_equals","status":"unpaid"}',
   'send_message',
   '{"channels":["sms","email"],"language":"he","template_slug":"event_attendee_moved_unpaid","recipient_type":"trigger_lead"}',
   120, true),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'העברת משתתף ידנית - שילם',
   'attendee', 'moved', '{"type":"status_equals","status":"paid"}',
   'send_message',
   '{"channels":["sms","email"],"language":"he","template_slug":"event_attendee_moved_paid","recipient_type":"trigger_lead"}',
   121, true);

COMMIT;
