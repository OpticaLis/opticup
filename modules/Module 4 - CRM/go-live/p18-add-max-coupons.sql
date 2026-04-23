-- =============================================================================
-- p18-add-max-coupons.sql
-- Context: P18_EVENT_CAPACITY_AND_COUPONS — 3-tier event capacity model.
--   crm_events.max_capacity (exists) — registrants beyond this go to waiting list
--   crm_events.max_coupons (new) — ceiling on coupon issuance, released on cancel
--   crm_events.extra_coupons (new) — mid-event overflow set by staff for walk-ins
--   crm_campaigns.default_max_coupons (new) — seed value for new events
-- Applied via apply_migration as
--   add_max_coupons_and_extra_coupons_to_events
-- Authorized by Daniel in SPEC P18 execution (2026-04-23).
-- FIELD_MAP update (Rule 5) deferred — js/shared.js already at 408L, over
-- the 350-line hard max. Logged as P18 finding; tracked against the
-- shared.js split tech debt.
-- =============================================================================

ALTER TABLE crm_events
  ADD COLUMN IF NOT EXISTS max_coupons INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS extra_coupons INTEGER DEFAULT 0;

COMMENT ON COLUMN crm_events.max_coupons IS
  'Maximum number of coupons that can be issued for this event. When a coupon is cancelled, the slot is released. Usually equals max_capacity.';
COMMENT ON COLUMN crm_events.extra_coupons IS
  'Additional coupon overflow set mid-event by staff when no-shows create available slots. Added on top of max_coupons.';

ALTER TABLE crm_campaigns
  ADD COLUMN IF NOT EXISTS default_max_coupons INTEGER DEFAULT 50;

COMMENT ON COLUMN crm_campaigns.default_max_coupons IS
  'Default max_coupons value seeded into new events created under this campaign.';
