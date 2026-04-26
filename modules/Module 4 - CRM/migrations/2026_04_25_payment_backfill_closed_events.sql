-- M4_ATTENDEE_PAYMENT_AUTOMATION — one-shot backfill (commit 3 of 4)
--
-- Context: SPECs #1 (schema) and #2 (UI) shipped without an automation. This SPEC
-- (#3, M4_ATTENDEE_PAYMENT_AUTOMATION) wires `markUnpaidForCompletedEvent` into the
-- event-status change flow. For events that ALREADY transitioned to 'completed' before
-- this automation existed, attendees who never paid + never checked in are still in
-- 'pending_payment' — the new automation will catch all FUTURE completions, but won't
-- retroactively touch historical ones. This migration is the one-shot retroactive pass.
--
-- IMPORTANT: scope is ONLY events with status='completed' (event ran, it's over).
-- NOT 'closed' (registration closed because coupons exhausted, but event is still
-- upcoming — attendees may still pay). Daniel approved the strict scope.
--
-- Cross-tenant by design: WHERE clauses scope only by event status + attendee state,
-- not by tenant_id, so any tenant with 'completed' events with stale pending_payment
-- attendees will be backfilled. Per pre-flight: only demo has rows (Prizma has 0
-- attendees per SPEC #1 baseline). Pre-flight forecast on demo: 0 rows
-- (the only completed event's pending attendee is checked in).
--
-- Idempotent: re-running affects 0 rows because the UPDATE filter requires
-- payment_status='pending_payment'; any row already flipped to 'unpaid' is excluded.

WITH targets AS (
  SELECT a.id
    FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id
   WHERE a.payment_status = 'pending_payment'
     AND a.checked_in_at IS NULL
     AND e.status = 'completed'
     AND a.is_deleted = false
)
UPDATE crm_event_attendees
   SET payment_status = 'unpaid'
 WHERE id IN (SELECT id FROM targets);
