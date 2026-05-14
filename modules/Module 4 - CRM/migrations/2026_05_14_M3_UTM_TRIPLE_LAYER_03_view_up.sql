-- Migration: M3_UTM_TRIPLE_LAYER_PERSISTENCE — #03 first-touch view
-- v_crm_lead_first_touch — backward-compat first-touch read shape.
-- Priority: earliest lead_submit touchpoint > earliest short_link_click >
-- fallback to legacy crm_leads.utm_* (for pre-SPEC leads with no touchpoints).
-- security_invoker=true per SECURITY_HOTFIX_2026_05_13 hardening pattern.

CREATE OR REPLACE VIEW public.v_crm_lead_first_touch
WITH (security_invoker = true)
AS
WITH ranked_touchpoints AS (
  SELECT
    t.tenant_id,
    t.lead_id,
    t.touchpoint_type,
    t.occurred_at,
    t.utm_source, t.utm_medium, t.utm_campaign, t.utm_content, t.utm_term, t.utm_campaign_id,
    t.referrer_url, t.landing_url, t.short_link_code,
    -- Priority: lead_submit wins, else short_link_click, else event_register
    CASE t.touchpoint_type
      WHEN 'lead_submit'       THEN 1
      WHEN 'short_link_click'  THEN 2
      WHEN 'event_register'    THEN 3
      ELSE 9
    END AS type_priority,
    ROW_NUMBER() OVER (
      PARTITION BY t.tenant_id, t.lead_id
      ORDER BY
        CASE t.touchpoint_type
          WHEN 'lead_submit'       THEN 1
          WHEN 'short_link_click'  THEN 2
          WHEN 'event_register'    THEN 3
          ELSE 9
        END,
        t.occurred_at ASC
    ) AS rn
  FROM public.crm_lead_touchpoints t
  WHERE t.lead_id IS NOT NULL
)
SELECT
  l.tenant_id,
  l.id AS lead_id,
  COALESCE(rt.occurred_at, l.created_at) AS first_touch_at,
  rt.touchpoint_type AS first_touch_type,
  COALESCE(rt.utm_source,      l.utm_source)      AS utm_source,
  COALESCE(rt.utm_medium,      l.utm_medium)      AS utm_medium,
  COALESCE(rt.utm_campaign,    l.utm_campaign)    AS utm_campaign,
  COALESCE(rt.utm_content,     l.utm_content)     AS utm_content,
  COALESCE(rt.utm_term,        l.utm_term)        AS utm_term,
  COALESCE(rt.utm_campaign_id, l.utm_campaign_id) AS utm_campaign_id,
  rt.referrer_url,
  rt.landing_url,
  rt.short_link_code,
  (rt.tenant_id IS NULL) AS fallback_to_legacy_utm
FROM public.crm_leads l
LEFT JOIN ranked_touchpoints rt
  ON rt.tenant_id = l.tenant_id
 AND rt.lead_id   = l.id
 AND rt.rn        = 1
WHERE l.is_deleted = false;

GRANT SELECT ON public.v_crm_lead_first_touch TO authenticated;

COMMENT ON VIEW public.v_crm_lead_first_touch IS
  'M3_UTM_TRIPLE_LAYER_PERSISTENCE (2026-05-14): per-lead first-touch attribution. Prefers earliest lead_submit touchpoint, else earliest short_link_click, else falls back to legacy crm_leads.utm_* columns. fallback_to_legacy_utm=true when no touchpoint exists for this lead. security_invoker=true per SECURITY_HOTFIX_2026_05_13 hardening.';
