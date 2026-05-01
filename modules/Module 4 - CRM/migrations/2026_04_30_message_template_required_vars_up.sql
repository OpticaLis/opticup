-- P31 commit 1 — Variable contract on crm_message_templates.
-- Adds required_variables JSONB column with parser-driven backfill.
-- Per SPEC §3.1: NOT NULL DEFAULT '[]'; no CHECK constraint; idempotent.

-- Pre-flight verified 2026-04-30:
--   * pg_constraint on crm_message_templates: 0 CHECK (column is JSONB free-form)
--   * 30 active templates inventoried; tightened regex %([a-z][a-z0-9_]*)% catches
--     real placeholders without false-positives on URL-encoded Hebrew (%D7%, %94%)
--   * Auto-fill set (Daniel-approved 2026-04-30):
--       FROM crm_leads:    name, phone, email, lead_id
--       FROM crm_events:   event_name, event_date, event_time, coupon_code
--   * Existing auto-inject (event-variables.ts):
--       unsubscribe_url, registration_url, event_max_attendees,
--       event_deposit_amount, event_day_of_week, event_location, payment_url_*
--   * payment_url_* is guarded separately by scanForPaymentUrlMismatch (loud
--     422 on missing). Excluded from required_variables to avoid double-failure.

-- 1. Add column. IF NOT EXISTS makes this rerun-safe.
ALTER TABLE public.crm_message_templates
  ADD COLUMN IF NOT EXISTS required_variables JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Backfill all active templates by parsing body+subject for %lowercase_var%
--    placeholders, then subtracting the auto-fill and auto-inject sets.
--    Idempotent — re-running this UPDATE produces the same arrays.
WITH excluded AS (
  SELECT ARRAY[
    'name','phone','email','lead_id',
    'event_name','event_date','event_time','coupon_code',
    'unsubscribe_url','registration_url',
    'event_max_attendees','event_deposit_amount',
    'event_day_of_week','event_location'
  ] AS exc
), parsed AS (
  SELECT t.id,
         COALESCE(
           (SELECT ARRAY_AGG(DISTINCT m[1] ORDER BY m[1])
              FROM regexp_matches(
                     COALESCE(t.body,'') || ' ' || COALESCE(t.subject,''),
                     '%([a-z][a-z0-9_]*)%', 'g'
                   ) AS m
             WHERE m[1] !~ '^payment_url_'
           ),
           ARRAY[]::text[]
         ) AS all_vars
    FROM public.crm_message_templates t
   WHERE t.is_active = true
), with_required AS (
  SELECT p.id,
         COALESCE(
           (SELECT ARRAY_AGG(v ORDER BY v)
              FROM UNNEST(p.all_vars) AS v
             WHERE v <> ALL(e.exc)
           ),
           ARRAY[]::text[]
         ) AS required_vars
    FROM parsed p, excluded e
)
UPDATE public.crm_message_templates t
   SET required_variables = to_jsonb(COALESCE(w.required_vars, ARRAY[]::text[]))
  FROM with_required w
 WHERE t.id = w.id;
