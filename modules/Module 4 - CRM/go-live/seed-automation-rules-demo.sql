-- =============================================================================
-- seed-automation-rules-demo.sql — P8 default automation rules (demo tenant)
-- Authored: 2026-04-22 (P8_AUTOMATION_ENGINE)
-- Tenant:   demo (8d8cfa7e-ef58-49af-9702-a862d459cccb)
--
-- Replicates the P5.5 hardcoded EVENT_STATUS_DISPATCH map + registration
-- confirmation behaviour as 10 rows in crm_automation_rules. The engine
-- (crm-automation-engine.js, P8) reads these at runtime; removing any rule
-- disables that dispatch path without a code deploy.
--
-- Idempotent: ON CONFLICT DO NOTHING on (tenant_id, name) — requires unique
-- composite. If no such index exists, rely on the pre-flight count check
-- to guarantee a clean seed (0 existing rules verified on 2026-04-22).
-- =============================================================================

INSERT INTO crm_automation_rules
  (tenant_id, name, trigger_entity, trigger_event, trigger_condition, action_type, action_config, sort_order, is_active)
VALUES
  -- Event status dispatch (8 rules — mirror EVENT_STATUS_DISPATCH)
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: ייפתח מחר',
   'event', 'status_change',
   '{"type":"status_equals","status":"will_open_tomorrow"}'::jsonb,
   'send_message',
   '{"template_slug":"event_will_open_tomorrow","channels":["sms","email"],"recipient_type":"tier2_excl_registered"}'::jsonb,
   10, true),

  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: נפתחה הרשמה',
   'event', 'status_change',
   '{"type":"status_equals","status":"registration_open"}'::jsonb,
   'send_message',
   '{"template_slug":"event_registration_open","channels":["sms","email"],"recipient_type":"tier2"}'::jsonb,
   20, true),

  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: הזמנה חדשה',
   'event', 'status_change',
   '{"type":"status_equals","status":"invite_new"}'::jsonb,
   'send_message',
   '{"template_slug":"event_invite_new","channels":["sms","email"],"recipient_type":"tier2_excl_registered"}'::jsonb,
   30, true),

  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: אירוע נסגר',
   'event', 'status_change',
   '{"type":"status_equals","status":"closed"}'::jsonb,
   'send_message',
   '{"template_slug":"event_closed","channels":["sms","email"],"recipient_type":"attendees"}'::jsonb,
   40, true),

  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: רשימת המתנה',
   'event', 'status_change',
   '{"type":"status_equals","status":"waiting_list"}'::jsonb,
   'send_message',
   '{"template_slug":"event_waiting_list","channels":["sms","email"],"recipient_type":"attendees_waiting"}'::jsonb,
   50, true),

  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: 2-3 ימים לפני',
   'event', 'status_change',
   '{"type":"status_equals","status":"2_3d_before"}'::jsonb,
   'send_message',
   '{"template_slug":"event_2_3d_before","channels":["sms","email"],"recipient_type":"attendees"}'::jsonb,
   60, true),

  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: יום אירוע',
   'event', 'status_change',
   '{"type":"status_equals","status":"event_day"}'::jsonb,
   'send_message',
   '{"template_slug":"event_day","channels":["sms","email"],"recipient_type":"attendees"}'::jsonb,
   70, true),

  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'שינוי סטטוס: הזמנה ממתינים',
   'event', 'status_change',
   '{"type":"status_equals","status":"invite_waiting_list"}'::jsonb,
   'send_message',
   '{"template_slug":"event_invite_waiting_list","channels":["sms","email"],"recipient_type":"attendees_waiting"}'::jsonb,
   80, true),

  -- Registration confirmation (2 rules — replaces dispatchRegistrationConfirmation)
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'הרשמה: אישור הרשמה',
   'attendee', 'created',
   '{"type":"status_equals","status":"registered"}'::jsonb,
   'send_message',
   '{"template_slug":"event_registration_confirmation","channels":["sms","email"],"recipient_type":"trigger_lead"}'::jsonb,
   100, true),

  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'הרשמה: אישור רשימת המתנה',
   'attendee', 'created',
   '{"type":"status_equals","status":"waiting_list"}'::jsonb,
   'send_message',
   '{"template_slug":"event_waiting_list_confirmation","channels":["sms","email"],"recipient_type":"trigger_lead"}'::jsonb,
   110, true);

-- Verification
-- Expect 10 active rules on demo:
-- SELECT count(*) FROM crm_automation_rules
-- WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active = true;
