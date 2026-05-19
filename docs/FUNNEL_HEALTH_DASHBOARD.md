# Funnel Health Dashboard

> **Module:** CRM (Module 4) — FUNNEL Phase 2.5 Deliverable A
> **Shipped:** 2026-05-19 (M4_FUNNEL_HEALTH_DASHBOARD)
> **Tab:** ERP CRM → מצב פאנל

## What It Shows

A 14-tile at-a-glance view of the entire marketing + sales funnel, refreshed every 5 minutes.

## The 14 Tiles

| # | Tile | Source | Drill-down |
|---|------|--------|-----------|
| 1 | Leads captured 30d + 7d delta | mv scalar | Yes |
| 2 | Lead → attendee conversion rate (30d) | mv scalar | Yes |
| 3 | Attendee → buyer conversion rate (30d) | mv scalar | No |
| 4 | Revenue 30d + 7d delta | mv scalar | Yes |
| 5 | Source mix (JSONB) | mv JSONB | No |
| 6 | Top 5 broadcasts by CTR | mv JSONB | Yes |
| 7 | Pixel/CAPI gap | Live query (crm-pixel-gap-tile.js) | Yes |
| 8 | CAPI queue health by status | mv JSONB | No |
| 9 | Message latency p50/p95/p99 by channel | mv JSONB | No |
| 10 | Event registration funnel by status | mv JSONB | No |
| 11 | Unsubscribe rate 7d + 30d | mv scalar | No |
| 12 | Failed-send error breakdown by type | mv JSONB | Yes |
| 13 | Campaign ROAS (live join) | v_crm_campaign_performance | No |
| 14 | Trend sparklines — leads 28d | mv JSONB | No |

## Data Layer

- **Materialized view:** `public.mv_funnel_health_dashboard` — one row per active tenant.
- **Refresh:** pg_cron job `refresh_funnel_health_dashboard`, every 5 minutes (`*/5 * * * *`).
- **Performance index:** `idx_crm_message_log_tenant_created` on `crm_message_log (tenant_id, created_at DESC)`.
- **Unique index:** `idx_mv_funnel_health_tenant` on mv `(tenant_id)` — required for CONCURRENTLY refresh.

## Tenant Isolation

The mv contains rows for ALL active tenants. Tenant isolation is enforced at the JS layer:
every `sb.from('mv_funnel_health_dashboard').select('*').eq('tenant_id', tid)` call chains the
tenant_id filter per Iron Rule 22 (defense-in-depth). PostgreSQL does not support RLS on
materialized views — this is a known platform limitation.

## Permission

Permission id: `crm.funnel_health.view` — seeded for all roles (ceo, manager, team_lead, worker, viewer)
on both demo and prizma tenants.

## Drill-Down Modals

5 tiles open a `Modal.show` drill-down on click:
- Tile 1 → 100 most recent leads
- Tile 2 → 100 most recent attendees
- Tile 4 → Top 100 revenue-generating attendees
- Tile 6 → Latest 20 broadcasts with stats
- Tile 12 → 100 most recent failed/rejected messages

## Files

- `modules/crm/crm-funnel-dashboard.js` — orchestrator + 14 tile render fns + 5 modals
- `css/crm-funnel-dashboard.css` — 4-col grid → 2-col tablet → 1-col mobile
- `supabase/migrations/20260519190948_m4_funnel_health_dashboard.sql` — full DB setup

## IR34 Runtime Verification

After render, `window.__funnelTrace` contains entries:
`{ at: ISO8601, mv_query_ms: number, tiles_rendered: number }`.
Use in Chrome DevTools: `window.__funnelTrace` to verify the dashboard rendered.

---

## Weekly Optimization Brief (Deliverable B — M4_WEEKLY_OPTIMIZATION_BRIEF)

> **Shipped:** 2026-05-19. Runs every Sunday 03:00 UTC (~06:00 IST).

### What It Is

A deterministic weekly analysis panel rendered at the top of the Funnel Health Dashboard.
Every Sunday morning the `weekly-funnel-brief` Edge Function reads `mv_funnel_health_dashboard`
for each active tenant, classifies metrics against a 4-week prior average, and persists
a Hebrew prose brief into `funnel_weekly_briefs`.

### Classifier Logic (v1-deterministic — no AI)

| Delta vs 4-week avg | Classification |
|---|---|
| > +5% (higher-is-better) or < -5% (lower-is-better) | Improved |
| < -5% (higher-is-better) or > +5% (lower-is-better) | Degraded (concern) |
| Within ±5% | Steady |

First run (no prior history): all metrics show as steady. Baseline builds over 4 weeks.

### Tracked Metrics + Polarity

| Metric | Polarity |
|---|---|
| `leads_30d` | higher = better |
| `lead_attendee_conv_pct` (derived) | higher = better |
| `attendee_buyer_conv_pct` (derived) | higher = better |
| `revenue_30d` | higher = better |
| `unsubs_30d_per_lead_pct` (derived) | lower = better |
| `failed_send_count` (derived) | lower = better |

### Storage

Table `funnel_weekly_briefs` (1 row per tenant per week, UNIQUE `(tenant_id, week_start)`).
UPSERT on re-run — safe to re-trigger if a bug fix is needed mid-week.

### IR34 Runtime Trace (Weekly Brief)

`window.__weeklyBriefTrace` — array of `{ at: epoch_ms, rows: N, latest_week: 'YYYY-MM-DD' }`.
Used by LH-Tester for Chrome MCP verification per Iron Rule 34.
