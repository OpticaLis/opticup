-- C001 (2026-05-03) — replace hardcoded SMS allowlist in send-message + dispatch-queue
-- EFs with a tenant-level config column. NULL = production (all phones); JSONB array =
-- test mode (only listed E.164 phones receive SMS). Pre-populated prizma + demo with the
-- existing 3-phone array so the deploy preserves behavior; cutover-day flips prizma to
-- NULL via a single-row UPDATE on the operational checklist.
--
-- Authoritative comment is on the column itself (see COMMENT ON COLUMN below).
-- See modules/Module 4 - CRM/docs/specs/C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/.

ALTER TABLE tenants
  ADD COLUMN test_mode_sms_allowlist JSONB NULL;

COMMENT ON COLUMN tenants.test_mode_sms_allowlist IS
'When NULL: production mode — SMS to any phone is allowed.
When NOT NULL: must be a JSONB array of E.164 phone strings (e.g. ["+972537889878"]) — only those phones receive SMS, all others rejected with phone_not_allowed (test mode).
Set during pre-cutover QA windows; set to NULL by cutover-day operational checklist when tenant goes live.
Replaces the hardcoded ALLOWED_PHONES constants in send-message + dispatch-queue EFs (C001, 2026-05-03).';

UPDATE tenants
SET test_mode_sms_allowlist = '["+972537889878", "+972503348349", "+972507168471"]'::jsonb
WHERE id IN (
  '6ad0781b-37f0-47a9-92e3-be9ed1477e1c',  -- prizma
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'   -- demo
);
