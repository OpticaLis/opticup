-- Migration: add acquired_via column to crm_leads
-- SPEC: QUICK_REGISTER_HOTFIX_2_DISPATCH_AND_TRACKING
-- Date: 2026-05-04
--
-- Adds a sibling column to `source`. While `source` captures the lead's first-touch flow,
-- `acquired_via` is updated on every flow the lead traverses (e.g., a returning phone
-- number coming through quick-register sets acquired_via='quick_register_qr' even though
-- source remains its original value).
--
-- Nullable on purpose: backward-compatible with existing INSERTs in event-register,
-- lead-intake, and other callers that don't yet populate it. Backfill copies current
-- source so historical data is not lost.

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS acquired_via text;

UPDATE crm_leads SET acquired_via = source WHERE acquired_via IS NULL;
