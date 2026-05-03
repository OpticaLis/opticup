-- =========================================================================
-- M4 CAMPAIGNS v2 — Rung 1: schema additions + range-aware function
-- SPEC: modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/
-- Authorised: opticup-strategic Foreman review 2026-05-02
-- =========================================================================

-- Step 1: additive columns on crm_facebook_campaigns
ALTER TABLE crm_facebook_campaigns
  ADD COLUMN IF NOT EXISTS start_time     TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS city           TEXT        NULL,
  ADD COLUMN IF NOT EXISTS audience_label TEXT        NULL;

-- Step 2: additive columns on crm_ad_spend
ALTER TABLE crm_ad_spend
  ADD COLUMN IF NOT EXISTS impressions BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks      BIGINT NOT NULL DEFAULT 0;

-- Step 3: drop the old view (will be recreated as wrapper at Step 5)
DROP VIEW IF EXISTS v_crm_campaign_performance;

-- Step 4: create range-aware function
-- Returns the same column shape as the old view, plus 6 new columns:
--   start_time, days_running, impressions, clicks, ctr, roas
-- All metrics are filtered by [p_range_start, p_range_end] inclusive.
CREATE OR REPLACE FUNCTION get_campaign_performance(
  p_tenant_id    UUID,
  p_range_start  DATE,
  p_range_end    DATE
)
RETURNS TABLE (
  campaign_uuid       UUID,
  tenant_id           UUID,
  campaign_id         TEXT,
  name                TEXT,
  status              TEXT,
  event_type          TEXT,
  daily_budget        NUMERIC,
  master              TEXT,
  interests           TEXT,
  last_synced_at      TIMESTAMPTZ,
  start_time          TIMESTAMPTZ,
  city                TEXT,
  audience_label      TEXT,
  total_spend         NUMERIC,
  last_spend_date     DATE,
  impressions         BIGINT,
  clicks              BIGINT,
  ctr                 NUMERIC,
  days_running        INT,
  leads_num           BIGINT,
  buyers_num          BIGINT,
  total_revenue       NUMERIC,
  cac                 NUMERIC,
  cpl                 NUMERIC,
  roas                NUMERIC,
  gross_margin_pct    NUMERIC,
  kill_multiplier     NUMERIC,
  scaling_multiplier  NUMERIC,
  gross_profit        NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH range_spend AS (
    SELECT
      s.tenant_id,
      s.campaign_id,
      SUM(s.total_spend)  AS total_spend,
      SUM(s.impressions)  AS impressions,
      SUM(s.clicks)       AS clicks,
      MAX(s.spend_date)   AS last_spend_date
    FROM crm_ad_spend s
    WHERE s.tenant_id = p_tenant_id
      AND s.spend_date BETWEEN p_range_start AND p_range_end
    GROUP BY s.tenant_id, s.campaign_id
  ),
  range_leads AS (
    SELECT
      l.tenant_id,
      l.utm_campaign_id AS campaign_id,
      COUNT(DISTINCT l.id) AS leads_num
    FROM crm_leads l
    WHERE l.tenant_id = p_tenant_id
      AND l.created_at::date BETWEEN p_range_start AND p_range_end
      AND l.utm_campaign_id IS NOT NULL
    GROUP BY l.tenant_id, l.utm_campaign_id
  ),
  range_attendees AS (
    SELECT
      a.tenant_id,
      l.utm_campaign_id AS campaign_id,
      COUNT(DISTINCT a.id) FILTER (WHERE a.payment_status IN ('paid','credit_used')) AS buyers_num,
      COALESCE(SUM(a.purchase_amount) FILTER (WHERE a.payment_status IN ('paid','credit_used')), 0) AS total_revenue
    FROM crm_event_attendees a
    JOIN crm_leads l ON l.id = a.lead_id AND l.tenant_id = a.tenant_id
    WHERE a.tenant_id = p_tenant_id
      AND a.registered_at::date BETWEEN p_range_start AND p_range_end
      AND l.utm_campaign_id IS NOT NULL
    GROUP BY a.tenant_id, l.utm_campaign_id
  )
  SELECT
    c.id            AS campaign_uuid,
    c.tenant_id,
    c.campaign_id,
    c.name,
    c.status,
    c.event_type,
    c.daily_budget,
    c.master,
    c.interests,
    c.last_synced_at,
    c.start_time,
    c.city,
    c.audience_label,
    COALESCE(rs.total_spend, 0)                                  AS total_spend,
    rs.last_spend_date                                           AS last_spend_date,
    COALESCE(rs.impressions, 0)                                  AS impressions,
    COALESCE(rs.clicks, 0)                                       AS clicks,
    CASE WHEN COALESCE(rs.impressions, 0) > 0
         THEN ROUND((rs.clicks::numeric / rs.impressions::numeric) * 100, 2)
         ELSE NULL
    END                                                          AS ctr,
    CASE
      WHEN c.start_time IS NULL THEN NULL
      WHEN c.start_time::date > p_range_end THEN 0
      ELSE (LEAST(p_range_end, CURRENT_DATE)
            - GREATEST(c.start_time::date, p_range_start))::int + 1
    END                                                          AS days_running,
    COALESCE(rl.leads_num, 0)                                    AS leads_num,
    COALESCE(ra.buyers_num, 0)                                   AS buyers_num,
    COALESCE(ra.total_revenue, 0)                                AS total_revenue,
    CASE WHEN COALESCE(ra.buyers_num, 0) > 0
         THEN COALESCE(rs.total_spend, 0) / ra.buyers_num
         ELSE NULL END                                           AS cac,
    CASE WHEN COALESCE(rl.leads_num, 0) > 0
         THEN COALESCE(rs.total_spend, 0) / rl.leads_num
         ELSE NULL END                                           AS cpl,
    CASE WHEN COALESCE(rs.total_spend, 0) > 0
         THEN ROUND(COALESCE(ra.total_revenue, 0) / rs.total_spend, 2)
         ELSE NULL END                                           AS roas,
    ue.gross_margin_pct,
    ue.kill_multiplier,
    ue.scaling_multiplier,
    COALESCE(ra.total_revenue, 0) * COALESCE(ue.gross_margin_pct, 0) / 100
      - COALESCE(rs.total_spend, 0)                              AS gross_profit
  FROM crm_facebook_campaigns c
  LEFT JOIN range_spend     rs ON rs.tenant_id = c.tenant_id AND rs.campaign_id = c.campaign_id
  LEFT JOIN range_leads     rl ON rl.tenant_id = c.tenant_id AND rl.campaign_id = c.campaign_id
  LEFT JOIN range_attendees ra ON ra.tenant_id = c.tenant_id AND ra.campaign_id = c.campaign_id
  LEFT JOIN crm_unit_economics ue ON ue.tenant_id = c.tenant_id AND ue.event_type = c.event_type
  WHERE c.tenant_id = p_tenant_id;
$$;

GRANT EXECUTE ON FUNCTION get_campaign_performance(UUID, DATE, DATE) TO authenticated;

-- Step 5: recreate v_crm_campaign_performance as a thin wrapper around the function
-- This preserves the live screen (modules/crm/crm-campaigns.js:64) until Rung 3
-- migrates the call site to a direct RPC call.
CREATE OR REPLACE VIEW v_crm_campaign_performance AS
SELECT *
FROM get_campaign_performance(
  (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid,
  '1900-01-01'::date,
  CURRENT_DATE
);

GRANT SELECT ON v_crm_campaign_performance TO authenticated;
