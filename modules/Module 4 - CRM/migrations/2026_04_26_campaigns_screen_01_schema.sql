-- M4_CAMPAIGNS_SCREEN v2 — DB foundation
-- Date: 2026-04-26
-- SPEC: modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_SCREEN/SPEC.md §8.1
--
-- Adapts existing campaigns infrastructure (Phase A + B2) to per-event-type
-- unit economics + daily-snapshot ad_spend. Daniel approved the DROP+CREATE
-- on crm_ad_spend (88 historical rows from Monday import) and crm_unit_economics
-- (2 rows on prizma) — P7 cutover will re-import from Monday.
--
-- crm_campaigns and crm_campaign_pages are OFF LIMITS (event-type templates +
-- unused, respectively).

-- 1. Drop the broken view first (depends on old schema)
DROP VIEW IF EXISTS v_crm_campaign_performance;

-- 2. Rebuild crm_ad_spend with daily-snapshot schema
DROP TABLE IF EXISTS crm_ad_spend CASCADE;

CREATE TABLE crm_ad_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  campaign_id TEXT NOT NULL,
  spend_date DATE NOT NULL,
  total_spend NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, campaign_id, spend_date)
);

CREATE INDEX idx_ad_spend_campaign ON crm_ad_spend(tenant_id, campaign_id);
CREATE INDEX idx_ad_spend_date ON crm_ad_spend(tenant_id, spend_date DESC);

ALTER TABLE crm_ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON crm_ad_spend
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY tenant_isolation ON crm_ad_spend
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- 3. Adapt crm_facebook_campaigns (currently empty — created earlier today)
ALTER TABLE crm_facebook_campaigns
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT now();

-- 4. Rebuild crm_unit_economics (event_type-based, was campaign_id-based)
DROP TABLE IF EXISTS crm_unit_economics CASCADE;

CREATE TABLE crm_unit_economics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_type TEXT NOT NULL,
  gross_margin_pct NUMERIC(5,2) NOT NULL,
  kill_multiplier NUMERIC(5,2) NOT NULL,
  scaling_multiplier NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, event_type)
);

ALTER TABLE crm_unit_economics ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON crm_unit_economics
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY tenant_isolation ON crm_unit_economics
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- 5. Recreate the performance view
CREATE OR REPLACE VIEW v_crm_campaign_performance AS
WITH latest_spend AS (
  SELECT DISTINCT ON (tenant_id, campaign_id)
    tenant_id, campaign_id, total_spend, spend_date
  FROM crm_ad_spend
  ORDER BY tenant_id, campaign_id, spend_date DESC
),
campaign_totals AS (
  SELECT tenant_id, campaign_id, SUM(total_spend) AS total_spend_all_time
  FROM crm_ad_spend
  GROUP BY tenant_id, campaign_id
)
SELECT
  c.id AS campaign_uuid,
  c.tenant_id,
  c.campaign_id,
  c.name,
  c.status,
  c.event_type,
  c.daily_budget,
  c.master,
  c.interests,
  c.last_synced_at,
  COALESCE(ct.total_spend_all_time, 0) AS total_spend,
  COALESCE(ls.spend_date, NULL) AS last_spend_date,
  COUNT(DISTINCT l.id) AS leads_num,
  COUNT(DISTINCT a.id) FILTER (WHERE a.payment_status IN ('paid','credit_used')) AS buyers_num,
  COALESCE(SUM(a.purchase_amount) FILTER (WHERE a.payment_status IN ('paid','credit_used')), 0) AS total_revenue,
  CASE WHEN COUNT(DISTINCT a.id) FILTER (WHERE a.payment_status IN ('paid','credit_used')) > 0
       THEN COALESCE(ct.total_spend_all_time, 0) / COUNT(DISTINCT a.id) FILTER (WHERE a.payment_status IN ('paid','credit_used'))
       ELSE NULL END AS cac,
  CASE WHEN COUNT(DISTINCT l.id) > 0
       THEN COALESCE(ct.total_spend_all_time, 0) / COUNT(DISTINCT l.id)
       ELSE NULL END AS cpl,
  ue.gross_margin_pct,
  ue.kill_multiplier,
  ue.scaling_multiplier,
  COALESCE(SUM(a.purchase_amount) FILTER (WHERE a.payment_status IN ('paid','credit_used')), 0)
    * COALESCE(ue.gross_margin_pct, 0) / 100 - COALESCE(ct.total_spend_all_time, 0) AS gross_profit
FROM crm_facebook_campaigns c
LEFT JOIN campaign_totals ct ON ct.tenant_id = c.tenant_id AND ct.campaign_id = c.campaign_id
LEFT JOIN latest_spend ls ON ls.tenant_id = c.tenant_id AND ls.campaign_id = c.campaign_id
LEFT JOIN crm_leads l ON l.utm_campaign_id = c.campaign_id AND l.tenant_id = c.tenant_id
LEFT JOIN crm_event_attendees a ON a.lead_id = l.id AND a.tenant_id = c.tenant_id
LEFT JOIN crm_unit_economics ue ON ue.event_type = c.event_type AND ue.tenant_id = c.tenant_id
GROUP BY c.id, c.tenant_id, c.campaign_id, c.name, c.status, c.event_type, c.daily_budget,
         c.master, c.interests, c.last_synced_at, ct.total_spend_all_time, ls.spend_date,
         ue.gross_margin_pct, ue.kill_multiplier, ue.scaling_multiplier;

GRANT SELECT ON v_crm_campaign_performance TO authenticated;

-- 6. Ensure index on crm_leads.utm_campaign_id exists
CREATE INDEX IF NOT EXISTS idx_crm_leads_utm_campaign_id
  ON crm_leads(tenant_id, utm_campaign_id)
  WHERE utm_campaign_id IS NOT NULL;

-- 7. Seed unit_economics for demo + prizma
INSERT INTO crm_unit_economics (tenant_id, event_type, gross_margin_pct, kill_multiplier, scaling_multiplier)
SELECT id, 'SuperSale', 20, 4, 2 FROM tenants WHERE slug IN ('demo', 'prizma')
ON CONFLICT (tenant_id, event_type) DO NOTHING;

INSERT INTO crm_unit_economics (tenant_id, event_type, gross_margin_pct, kill_multiplier, scaling_multiplier)
SELECT id, 'MultiSale', 50, 3, 1.5 FROM tenants WHERE slug IN ('demo', 'prizma')
ON CONFLICT (tenant_id, event_type) DO NOTHING;
