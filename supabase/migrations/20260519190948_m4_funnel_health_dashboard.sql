-- =============================================================================
-- M4_FUNNEL_HEALTH_DASHBOARD migration
-- Creates: mv_funnel_health_dashboard (14-tile), 2 indexes, RLS policies,
--          pg_cron refresh job, and permission seeds for demo + prizma.
-- Part of FUNNEL Phase 2.5 Deliverable A.
-- Rollback recipe: see modules/Module 4 - CRM/backups/ for per-step recipe.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. MATERIALIZED VIEW — mv_funnel_health_dashboard
--    One row per active tenant. Aggregates 14 tile values.
--    CONCURRENTLY refresh requires the UNIQUE index seeded below.
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW public.mv_funnel_health_dashboard AS
SELECT
  t.id AS tenant_id,
  NOW() AS refreshed_at,

  -- Tile 1: Leads captured 30d + 7d delta
  (SELECT count(*) FROM crm_leads WHERE tenant_id=t.id AND created_at > NOW() - INTERVAL '30 days' AND is_deleted=false) AS leads_30d,
  (SELECT count(*) FROM crm_leads WHERE tenant_id=t.id AND created_at > NOW() - INTERVAL '7 days' AND is_deleted=false) AS leads_7d,

  -- Tile 2: Lead to attendee conversion rate (30d) — attendee count
  (SELECT count(DISTINCT a.lead_id) FROM crm_event_attendees a WHERE a.tenant_id=t.id AND a.created_at > NOW() - INTERVAL '30 days' AND a.is_deleted=false) AS attendees_30d,

  -- Tile 3: Attendee to buyer conversion rate (30d) — buyer count
  (SELECT count(*) FROM crm_event_attendees WHERE tenant_id=t.id AND purchase_amount > 0 AND created_at > NOW() - INTERVAL '30 days' AND is_deleted=false) AS buyers_30d,

  -- Tile 4: Total revenue 30d + 7d delta
  (SELECT COALESCE(SUM(purchase_amount), 0) FROM crm_event_attendees WHERE tenant_id=t.id AND purchase_amount > 0 AND created_at > NOW() - INTERVAL '30 days') AS revenue_30d,
  (SELECT COALESCE(SUM(purchase_amount), 0) FROM crm_event_attendees WHERE tenant_id=t.id AND purchase_amount > 0 AND created_at > NOW() - INTERVAL '7 days') AS revenue_7d,

  -- Tile 5: Source mix JSONB array of {source, count}
  (SELECT jsonb_agg(jsonb_build_object('source', first_touch_type, 'count', n))
   FROM (SELECT first_touch_type, count(*) AS n FROM v_crm_lead_first_touch WHERE tenant_id=t.id GROUP BY first_touch_type) s) AS source_mix,

  -- Tile 6: Top 5 broadcasts by CTR (JSONB array)
  (SELECT jsonb_agg(row_to_json(b) ORDER BY b.ctr_pct DESC)
   FROM (SELECT cb.id, cb.name, cb.channel, cb.total_sent,
                ROUND(100.0 * (SELECT count(DISTINCT c.id) FROM short_link_clicks c WHERE c.broadcast_id=cb.id AND c.tenant_id=t.id) / NULLIF(cb.total_sent, 0), 2) AS ctr_pct
         FROM crm_broadcasts cb WHERE cb.tenant_id=t.id AND cb.created_at > NOW() - INTERVAL '30 days'
         ORDER BY ctr_pct DESC NULLS LAST LIMIT 5) b) AS top_broadcasts,

  -- Tile 7: Pixel/CAPI gap — live query via crm-pixel-gap-tile.js (not stored in mv)

  -- Tile 8: CAPI queue health JSONB {status: count}
  (SELECT jsonb_object_agg(status, n)
   FROM (SELECT status, count(*) AS n FROM crm_capi_dispatch_queue WHERE tenant_id=t.id GROUP BY status) s) AS capi_queue_health,

  -- Tile 9: Message latency p50/p95/p99 by channel (JSONB array, last 7d)
  -- PERCENTILE_CONT cannot be nested inside jsonb_agg directly; pre-aggregate
  -- using a subquery then build JSONB from the pre-computed rows.
  (SELECT jsonb_agg(jsonb_build_object(
            'channel', lat.channel,
            'p50_seconds', lat.p50_seconds,
            'p95_seconds', lat.p95_seconds,
            'p99_seconds', lat.p99_seconds,
            'n', lat.n))
   FROM (
     SELECT q.channel,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (q.processed_at - q.created_at))) AS p50_seconds,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (q.processed_at - q.created_at))) AS p95_seconds,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (q.processed_at - q.created_at))) AS p99_seconds,
            count(*) AS n
     FROM crm_message_queue q
     WHERE q.tenant_id=t.id AND q.processed_at IS NOT NULL AND q.processed_at > NOW() - INTERVAL '7 days'
     GROUP BY q.channel
   ) lat) AS latency_p_by_channel,

  -- Tile 10: Event funnel chart (JSONB array per event status)
  (SELECT jsonb_agg(row_to_json(s))
   FROM (SELECT status, count(*) AS n FROM crm_events WHERE tenant_id=t.id AND is_deleted=false GROUP BY status) s) AS event_funnel,

  -- Tile 11: Unsubscribe rate 7d/30d
  (SELECT count(*) FILTER (WHERE unsubscribed_at > NOW() - INTERVAL '7 days') FROM crm_leads WHERE tenant_id=t.id AND is_deleted=false) AS unsubs_7d,
  (SELECT count(*) FILTER (WHERE unsubscribed_at > NOW() - INTERVAL '30 days') FROM crm_leads WHERE tenant_id=t.id AND is_deleted=false) AS unsubs_30d,

  -- Tile 12: Failed-send error breakdown (JSONB array, last 30d)
  (SELECT jsonb_agg(row_to_json(f))
   FROM (SELECT
           CASE
             WHEN error_message LIKE 'unsubstituted_placeholder%' THEN 'unsubstituted_placeholder'
             WHEN error_message LIKE 'payment_link_missing%' THEN 'payment_url_mismatch'
             WHEN error_message LIKE 'lead_unsubscribed%' THEN 'lead_unsubscribed'
             WHEN error_message LIKE 'phone_not_allowed%' THEN 'phone_not_allowed'
             WHEN error_message LIKE 'email_not_allowed%' THEN 'email_not_allowed'
             ELSE 'other'
           END AS error_kind,
           status, channel, count(*) AS n
         FROM crm_message_log
         WHERE tenant_id=t.id AND status IN ('failed','rejected') AND created_at > NOW() - INTERVAL '30 days'
         GROUP BY 1, status, channel) f) AS failed_breakdown,

  -- Tile 13: Campaign ROAS/CAC — live join from v_crm_campaign_performance (not stored in mv)

  -- Tile 14: Trend sparklines — JSONB with daily buckets for leads / revenue (last 28 days)
  (SELECT jsonb_build_object(
    'leads_daily', (SELECT jsonb_agg(jsonb_build_object('d', d, 'n', n) ORDER BY d)
                    FROM (SELECT DATE_TRUNC('day', created_at)::date AS d, count(*) AS n
                          FROM crm_leads WHERE tenant_id=t.id AND created_at > NOW() - INTERVAL '28 days' AND is_deleted=false
                          GROUP BY d) ld),
    'revenue_daily', (SELECT jsonb_agg(jsonb_build_object('d', d, 'r', r) ORDER BY d)
                      FROM (SELECT DATE_TRUNC('day', created_at)::date AS d, COALESCE(SUM(purchase_amount), 0) AS r
                            FROM crm_event_attendees WHERE tenant_id=t.id AND purchase_amount > 0 AND created_at > NOW() - INTERVAL '28 days'
                            GROUP BY d) rd)
  )) AS sparklines

FROM tenants t
WHERE t.is_active = true;

-- ---------------------------------------------------------------------------
-- 2. UNIQUE INDEX on mv — required for REFRESH MATERIALIZED VIEW CONCURRENTLY
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX idx_mv_funnel_health_tenant
  ON public.mv_funnel_health_dashboard (tenant_id);

-- ---------------------------------------------------------------------------
-- 3. PERFORMANCE INDEX on crm_message_log (M2 §6 G1 recommendation)
--    Plain CREATE INDEX (CONCURRENTLY not allowed inside migration transaction).
--    Documented in EXECUTION_REPORT as intentional.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_crm_message_log_tenant_created
  ON public.crm_message_log (tenant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. INITIAL REFRESH (non-concurrent — first refresh must be non-concurrent;
--    subsequent cron-driven refreshes use CONCURRENTLY)
-- ---------------------------------------------------------------------------
REFRESH MATERIALIZED VIEW public.mv_funnel_health_dashboard;

-- ---------------------------------------------------------------------------
-- 5. RLS ON MATERIALIZED VIEW — canonical 2-policy pair (Iron Rule 15)
--    PostgreSQL requires ALTER TABLE syntax (not ALTER MATERIALIZED VIEW)
--    to enable RLS on a materialized view relation.
-- ---------------------------------------------------------------------------
ALTER TABLE public.mv_funnel_health_dashboard
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.mv_funnel_health_dashboard
  TO service_role
  USING (true);

CREATE POLICY tenant_isolation ON public.mv_funnel_health_dashboard
  TO public
  USING (
    tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid
  );

-- ---------------------------------------------------------------------------
-- 6. PG_CRON JOB — refresh every 5 minutes (CONCURRENTLY after initial seed)
-- ---------------------------------------------------------------------------
SELECT cron.schedule(
  'refresh_funnel_health_dashboard',
  '*/5 * * * *',
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_funnel_health_dashboard $$
);

-- ---------------------------------------------------------------------------
-- 7. PERMISSION SEEDS — insert into 'permissions' table (actual table name;
--    SPEC referenced 'crm_permissions' but live table is 'permissions').
--    One row per tenant. ON CONFLICT DO NOTHING for idempotency.
--    Seed for demo tenant.
-- ---------------------------------------------------------------------------
INSERT INTO public.permissions (id, module, action, name_he, description, tenant_id, created_at)
VALUES (
  'crm.funnel_health.view',
  'crm',
  'funnel_health.view',
  'צפייה במצב פאנל',
  'מציג את דשבורד מצב הפאנל המאוחד',
  '8d8cfa7e-ef58-49af-9702-a862d459cccb',
  NOW()
)
ON CONFLICT (id, tenant_id) DO NOTHING;

-- Seed for prizma tenant.
INSERT INTO public.permissions (id, module, action, name_he, description, tenant_id, created_at)
VALUES (
  'crm.funnel_health.view',
  'crm',
  'funnel_health.view',
  'צפייה במצב פאנל',
  'מציג את דשבורד מצב הפאנל המאוחד',
  '6ad0781b-37f0-47a9-92e3-be9ed1477e1c',
  NOW()
)
ON CONFLICT (id, tenant_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. ROLE_PERMISSIONS SEEDS — grant crm.funnel_health.view to all 5 roles
--    for both tenants (matching crm.message_log.acknowledge pattern).
-- ---------------------------------------------------------------------------
INSERT INTO public.role_permissions (role_id, permission_id, tenant_id, granted)
SELECT role_id, 'crm.funnel_health.view', tenant_id, true
FROM (VALUES
  ('ceo',       '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('manager',   '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('team_lead', '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('worker',    '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('viewer',    '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('ceo',       '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('manager',   '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('team_lead', '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('worker',    '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('viewer',    '6ad0781b-37f0-47a9-92e3-be9ed1477e1c')
) AS v(role_id, tenant_id)
ON CONFLICT DO NOTHING;
