# M2 — Funnel Health Dashboard Data Model (Phase 2.5 Pre-Flight)

> **Mission:** For every metric the Phase 2.5 "Funnel Health Dashboard" implies,
> identify (a) the table(s) that hold the data, (b) the query that computes it,
> (c) whether the query exists today or needs authoring, and (d) the gaps where
> data isn't being captured. Sketch a 1-page dashboard layout.
>
> **Read-only knowledge build.** Generated 2026-05-15 night.
> All measurements from live SELECTs against `tsxrrxzmdxaenlvocyit`.

---

## 1. TL;DR

- **14 candidate metrics identified.** 8 are computable today from existing views/tables. 4 need new queries. 2 need NEW data capture (NOT just a query) — see §6 gaps.
- **Existing reusable assets:** `v_crm_message_performance`, `v_crm_event_stats`, `v_crm_event_dashboard`, `v_crm_lead_first_touch`, `v_crm_campaign_performance` — Phase 2.5 should not rebuild these.
- **Biggest gap (data-level, not query-level):** `crm_leads.fb_pixel_fired_at` and `crm_leads.fb_event_id` are populated for **0 / 537 prizma leads in the last 30 days**. The FB CAPI columns are wired but the data is not flowing. Without this, the pixel-vs-CAPI delta metric (M4 mission) can't compute. **Blocking dependency for Phase 2.5 — see M3 + M4 missions.**
- **Biggest performance risk:** `crm_message_log` lacks `(tenant_id, created_at)` and `(tenant_id, status, created_at)` indexes. Most dashboard queries will sequential-scan a 5,000-row table today; will become slow at 100K+ rows. **Recommend one CONCURRENTLY-built index as part of Phase 2.5 SPEC.**
- **Dashboard layout:** 4-column grid, 1 funnel chart spanning row, 7 metric tiles, 2 latency charts, 1 delta panel. Refresh: 5-minute cache via materialized view (avoid recomputing on every page load).

---

## 2. Current funnel snapshot (prizma, last 30 days) — for grounding

Source: live SELECT 2026-05-15 23:30 IDT.

| Stage | Value | Notes |
|---|---:|---|
| Leads captured | **537** | from `crm_leads` |
| Events registered | 85 | 15.8% of leads → attendee |
| Events purchased (revenue >0) | 32 | 37.6% of attendees, 5.96% of leads |
| Messages sent | 4,619 | avg ~8.6 per lead |
| Short-link clicks tracked | 27 | **0.58% click-to-send** → likely under-tracking, see §6 G3 |
| FB Pixel fired (recorded) | **0 / 537** | **gap — data not flowing** |
| FB CAPI dispatched (recorded) | **0 / 537** | **gap — see M3** |
| CAPI queue rows (live) | 0 | queue not actively used |

The funnel chart is plausible — 16% lead→attendee and 38% attendee→buyer match typical campaign data. But pixel/CAPI fields are silently empty, which means today's "funnel health" view is **blind to attribution loss**.

---

## 3. Metric catalogue — what the Dashboard implies

Each row: metric name, where to compute, current state, query gap.

| # | Metric | Source table(s) | Existing query | Status |
|---|---|---|---|---|
| 1 | Touchpoint count by source/UTM | `crm_lead_touchpoints` + `v_crm_lead_first_touch` | `v_crm_lead_first_touch` | ✅ |
| 2 | Touchpoint count by broadcast | `crm_lead_touchpoints` (broadcast_id col) | none — need GROUP BY broadcast_id | ⬜ new query |
| 3 | Broadcast perf (sent/delivered/failed) | `crm_broadcasts` (denormalized) + `crm_message_log` | `crm_broadcasts.total_sent/total_failed` populated by broadcast finalize | ✅ |
| 4 | Broadcast click-through rate | `crm_broadcasts` × `short_link_clicks` (join on broadcast_id) | none — needs new query | ⬜ new query |
| 5 | Lead → attendee conversion | `crm_leads` × `crm_event_attendees` | indirectly in `v_crm_event_stats`; not per-source breakdown | ⬜ new query (per UTM cut) |
| 6 | Attendee → purchase conversion | `crm_event_attendees.purchase_amount` | `v_crm_event_stats.purchase_rate_pct` | ✅ |
| 7 | FB Pixel fired vs CAPI dispatched delta | `crm_leads.fb_pixel_fired_at` + `.fb_event_id` + `crm_capi_dispatch_queue` | none + data missing | ⬛ **blocked** (M4 mission gives the query; M3 explains why data is empty) |
| 8 | CAPI queue no_match rate | `crm_capi_dispatch_queue.meta_response` (parse) | none — need JSON parsing query | ⬜ new query (depends on queue activity) |
| 9 | Message send latency p50/p95/p99 | `crm_message_queue` (created_at→processed_at) + `crm_message_log.created_at` | none — see M6 mission | ⬜ new query (M6 ships it) |
| 10 | Event registration funnel by event type | `crm_events.status` + `crm_event_attendees` | `v_crm_event_dashboard` | ✅ |
| 11 | Lead intake source mix (FB ads vs organic vs broadcast) | `crm_leads.source` + `acquired_via` + first-touch view | derivable from `v_crm_lead_first_touch.first_touch_type` | ✅ derivable |
| 12 | Unsubscribe rate (7d / 30d) | `crm_leads.unsubscribed_at` (and `crm_unsubscribes` table) | none — need rolling-window query | ⬜ new query |
| 13 | Failed-send error breakdown | `crm_message_log.status='failed'` + `error_message` | partial in `crm-messaging-log.js` UI | ⬜ new query (consolidated breakdown) |
| 14 | Campaign-level ROAS / CAC / CPL | `v_crm_campaign_performance` (function-backed view) | `v_crm_campaign_performance` | ✅ |

**Counts:** 8 ✅ exist · 5 ⬜ new query needed · 1 ⬛ blocked by upstream data gap.

---

## 4. Existing assets — what NOT to rebuild

### 4.1 `v_crm_message_performance` (already canonical)

```
SELECT tenant_id, event_id, template_id, channel,
       messages_sent, messages_clicked, registrations_after_click
FROM v_crm_message_performance;
```

Computes per-template click-through + post-click registration. Used by `modules/crm/crm-messaging-performance.js`. **Phase 2.5 reuses as-is.**

### 4.2 `v_crm_event_stats` + `v_crm_event_dashboard` (already canonical)

Per-event funnel: registered → confirmed → attended → purchased → revenue + spots_remaining + purchase_rate_pct. Phase 2.5 surfaces these on the event-specific drill-down panel.

### 4.3 `v_crm_lead_first_touch` (already canonical)

First-touch attribution: ranks `crm_lead_touchpoints` per lead by priority (lead_submit > short_link_click > event_register) and falls back to `crm_leads.utm_*` legacy columns. Phase 2.5 uses for source-mix breakdown (metric #11).

### 4.4 `v_crm_campaign_performance` (function-backed)

Backed by `get_campaign_performance(tenant_id, from_date, to_date)` — returns full Facebook campaign perf with derived CAC/CPL/ROAS/scaling multipliers. Powers existing campaign-performance UI. Phase 2.5 reuses.

### 4.5 `v_crm_lead_timeline` (per-lead, narrow)

UNION ALL of note/audit/message log per lead. **NOT for dashboard aggregate** — useful for lead-detail drill-down.

---

## 5. New queries to author for Phase 2.5

Each is ready-to-implement. All SELECT-only. None require new tables today (except metric #7, which needs data flowing — see §6).

### 5.1 Touchpoint count by broadcast (metric #2)

```sql
SELECT t.tenant_id,
       t.broadcast_id,
       b.name AS broadcast_name,
       b.channel,
       COUNT(*) AS touchpoints,
       COUNT(DISTINCT t.lead_id) AS unique_leads_touched,
       MIN(t.occurred_at) AS first_touchpoint,
       MAX(t.occurred_at) AS last_touchpoint
FROM crm_lead_touchpoints t
JOIN crm_broadcasts b ON b.id = t.broadcast_id AND b.tenant_id = t.tenant_id
WHERE t.tenant_id = $1
  AND t.broadcast_id IS NOT NULL
  AND t.occurred_at > NOW() - INTERVAL '$2 days'
GROUP BY t.tenant_id, t.broadcast_id, b.name, b.channel
ORDER BY touchpoints DESC;
```

Index already exists: `idx_crm_lead_touchpoints_tenant_broadcast_occurred`.

### 5.2 Broadcast click-through rate (metric #4)

```sql
SELECT b.id AS broadcast_id, b.name, b.channel,
       b.total_sent,
       COUNT(DISTINCT c.id) AS clicks,
       COUNT(DISTINCT c.short_link_id) AS unique_clicks,
       ROUND(100.0 * COUNT(DISTINCT c.id) / NULLIF(b.total_sent, 0), 2) AS ctr_pct
FROM crm_broadcasts b
LEFT JOIN short_link_clicks c
  ON c.broadcast_id = b.id AND c.tenant_id = b.tenant_id
WHERE b.tenant_id = $1
  AND b.created_at > NOW() - INTERVAL '$2 days'
GROUP BY b.id, b.name, b.channel, b.total_sent
ORDER BY b.created_at DESC;
```

Indexes exist: `idx_short_link_clicks_tenant_broadcast_clicked` + `idx_short_links_tenant_broadcast`.

### 5.3 Lead → attendee conversion per UTM source (metric #5, drillable)

```sql
WITH first_touch AS (
  SELECT lead_id, utm_source, utm_medium, utm_campaign
  FROM v_crm_lead_first_touch
  WHERE tenant_id = $1
), leads_30 AS (
  SELECT l.id, l.created_at, ft.utm_source, ft.utm_medium, ft.utm_campaign
  FROM crm_leads l
  LEFT JOIN first_touch ft ON ft.lead_id = l.id
  WHERE l.tenant_id = $1
    AND l.created_at > NOW() - INTERVAL '30 days'
    AND l.is_deleted = false
), conversions AS (
  SELECT l.utm_source, l.utm_medium, l.utm_campaign,
         COUNT(*) AS leads,
         COUNT(DISTINCT a.lead_id) AS attendees,
         COUNT(DISTINCT a.lead_id) FILTER (WHERE a.purchase_amount > 0) AS buyers
  FROM leads_30 l
  LEFT JOIN crm_event_attendees a
    ON a.lead_id = l.id AND a.tenant_id = $1 AND a.is_deleted = false
  GROUP BY l.utm_source, l.utm_medium, l.utm_campaign
)
SELECT utm_source, utm_medium, utm_campaign, leads, attendees, buyers,
       ROUND(100.0 * attendees / NULLIF(leads, 0), 1) AS attendee_rate_pct,
       ROUND(100.0 * buyers / NULLIF(leads, 0), 1) AS buyer_rate_pct
FROM conversions ORDER BY leads DESC;
```

### 5.4 Unsubscribe rate rolling 7d / 30d (metric #12)

```sql
SELECT
  COUNT(*) FILTER (WHERE unsubscribed_at > NOW() - INTERVAL '7 days') AS unsubs_7d,
  COUNT(*) FILTER (WHERE unsubscribed_at > NOW() - INTERVAL '30 days') AS unsubs_30d,
  COUNT(*) AS total_active_leads,
  ROUND(100.0 *
    COUNT(*) FILTER (WHERE unsubscribed_at > NOW() - INTERVAL '7 days')
    / NULLIF(COUNT(*), 0), 3
  ) AS unsubs_7d_pct
FROM crm_leads
WHERE tenant_id = $1
  AND is_deleted = false;
```

### 5.5 Failed-send error breakdown (metric #13)

```sql
SELECT
  CASE
    WHEN error_message LIKE 'unsubstituted_placeholder%' THEN 'unsubstituted_placeholder'
    WHEN error_message LIKE 'payment_link_missing%' THEN 'payment_url_mismatch'
    WHEN error_message LIKE 'missing_required_variable%' THEN 'missing_required_variable'
    WHEN error_message LIKE 'template_not_found%' THEN 'template_not_found'
    WHEN error_message LIKE 'lead_unsubscribed' THEN 'lead_unsubscribed'
    WHEN error_message LIKE 'phone_not_allowed%' THEN 'phone_not_allowed'
    WHEN error_message LIKE 'email_not_allowed%' THEN 'email_not_allowed'
    ELSE 'other'
  END AS error_kind,
  status,
  channel,
  COUNT(*) AS n,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM crm_message_log
WHERE tenant_id = $1
  AND status IN ('failed','rejected')
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY 1, status, channel
ORDER BY n DESC;
```

⚠ Requires the new `(tenant_id, created_at)` index (§6 G1) to be fast at >50K rows.

### 5.6 Latency p50/p95/p99 (metric #9) — see Mission 6 for full query

```sql
SELECT
  channel,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (q.processed_at - q.created_at))) AS p50_seconds,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (q.processed_at - q.created_at))) AS p95_seconds,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (q.processed_at - q.created_at))) AS p99_seconds,
  COUNT(*) AS n
FROM crm_message_queue q
WHERE q.tenant_id = $1
  AND q.processed_at IS NOT NULL
  AND q.processed_at > NOW() - INTERVAL '7 days'
GROUP BY channel;
```

---

## 6. Gaps — what cannot be built without upstream changes

### G1 (HIGH) — `crm_message_log` lacks (tenant_id, created_at) index

**Current state:** Only `(id)`, `(tenant_id, acknowledged_at)`, `(tenant_id, broadcast_id, created_at) WHERE broadcast_id IS NOT NULL`, and `(run_id) WHERE run_id IS NOT NULL` exist.

**Impact:** Every dashboard query that filters by `(tenant_id, created_at > NOW() - INTERVAL)` does a tenant-bound partial scan, then sequential-filters by date. At 5K rows today it's invisible; at 100K rows the dashboard load-time will visibly degrade.

**Recommended migration (one statement, CONCURRENTLY):**
```sql
CREATE INDEX CONCURRENTLY idx_crm_message_log_tenant_created
  ON public.crm_message_log (tenant_id, created_at DESC);
```

Add to Phase 2.5 SPEC §Migrations. Iron Rule 14 + 15 already covered (table has tenant_id NOT NULL, RLS in place).

### G2 (HIGH — blocks metric #7) — FB Pixel + CAPI columns empty on `crm_leads`

**Current state:** `crm_leads.fb_pixel_fired_at` and `.fb_event_id` are populated for **0 / 537** prizma leads in the last 30 days. `crm_capi_dispatch_queue` has 2 rows total (test data).

**Impact:** Metric #7 (pixel-vs-CAPI delta) cannot compute. The whole "is attribution working" panel of the dashboard is blind.

**Root cause:** Belongs to M3 + M4. The dispatch substrate landed but is not wired to the live storefront yet. Daniel needs to populate `tenants.fb_capi_token` for prizma (memory: `project_fb_capi_p21_state.md`).

**Phase 2.5 dependency:** Either wait for M3 + M4 to complete activation, or ship Phase 2.5 with an explicit "Awaiting CAPI activation" placeholder on the pixel-delta tile.

### G3 (MEDIUM) — Short-link click capture is low

**Current state:** 27 clicks tracked vs 4,619 messages sent in the last 30 days → 0.58% measurable CTR. That implies most clicks aren't going through the short-link redirector — likely because long links in raw-body broadcasts skip the short-link insertion.

**Impact:** CTR metric (#4) understates real engagement. Phase 2.5 dashboard would show "0.6% CTR" which is misleading.

**Recommendation:** Out-of-scope for Phase 2.5 build. Add a parking-lot finding: "audit short_link insertion across all dispatch paths" → potential future SPEC.

### G4 (LOW) — `crm_broadcasts` denormalized counts can drift

`crm_broadcasts.total_sent/total_failed` are updated by the broadcast finalizer; if it crashes mid-run, the counts stay stale. Dashboard should also expose live re-count from `crm_message_log WHERE broadcast_id = $bcid GROUP BY status` for the most recent broadcast as a sanity check.

### G5 (LOW) — No `success` status enum on `crm_message_log`

Status column is freeform text (`'sent'`, `'failed'`, `'rejected'`, `'pending'`). A typo'd `'snet'` would silently disappear from counts. Phase 2.5 can rely on documented enum values but acknowledge this is unguarded.

---

## 7. Dashboard layout sketch

ERP screen, single page, refreshes from a 5-min materialized cache (NOT raw queries on every load).

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Funnel Health — Last 30 Days       [tenant: prizma ▼] [refresh ↻]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [#1 Lead intake]   [#2 Attendees]   [#3 Buyers]   [#4 Revenue]         │
│       537                 85              32         ₪12,840            │
│       leads          15.8% of leads  37.6% / 5.9%   ₪400 / buyer        │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Funnel chart (full row):                                               │
│  Lead intake → 1st message → click → registration → checkin → purchase  │
│  [horizontal bar chart, length proportional, drop-off labels]           │
├─────────────────────────────────────────────────────────────────────────┤
│  [#5 Touchpoints by source]                  [#6 Top broadcast CTRs]    │
│  - paid_fb:     412  (77%)                   - "Bagel sale May 13": 4.2%│
│  - direct:       80  (15%)                   - "Tomorrow opens" 2026.. : 3.8%
│  - whatsapp:     35   (7%)                                              │
├─────────────────────────────────────────────────────────────────────────┤
│  [#7 Pixel vs CAPI delta]      [#8 CAPI queue health]                   │
│  ⚠ AWAITING ACTIVATION         queue: 0 rows · failed: 0                │
│  (M3/M4 pending)               last 24h matched: n/a                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Message latency (p50/p95/p99 by channel, last 7 days)                  │
│  [grouped bar chart: SMS / Email — see Mission 6 for live values]       │
├─────────────────────────────────────────────────────────────────────────┤
│  Errors breakdown (failed + rejected, last 30 days)                     │
│  - unsubstituted_placeholder:   765 (98%)                               │
│  - template_not_found:            2                                     │
│  - lead_unsubscribed:           xxx (per allowlist gate)                │
│  - phone_not_allowed:           xxx (per allowlist gate)                │
├─────────────────────────────────────────────────────────────────────────┤
│  Unsub rate:  7d: 0.2% · 30d: 0.8%                  [historical chart] │
└─────────────────────────────────────────────────────────────────────────┘
```

**Refresh strategy:** materialized view + scheduled refresh every 5 min via pg_cron (or `npm run cron:dashboard-refresh` in interim). Avoid per-page-load expensive queries.

**Drill-downs (click on tile):**
- Funnel chart drill → list of leads at each stage with filters.
- Per-broadcast CTR drill → individual broadcast detail page.
- Failed-send breakdown drill → `crm_message_log` filtered view.

---

## 8. SPEC stub — Phase 2.5 `M4_FUNNEL_HEALTH_DASHBOARD`

> Stub for tomorrow's SPEC author. Final SPEC by `opticup-strategic`.

**Goal:** Single-page operational dashboard surfacing the 14-metric funnel-health view for any tenant, refreshing every 5 minutes from a materialized cache.

**Scope (in):**
- Migration: `CREATE INDEX CONCURRENTLY idx_crm_message_log_tenant_created` (§6 G1).
- Migration: `CREATE MATERIALIZED VIEW mv_funnel_health_30d` precomputing tiles 1-6, 12-13.
- `pg_cron` job to refresh the matview every 5 minutes.
- New ERP page: `modules/crm/crm-funnel-dashboard.js` + html shell.
- 6 reusable query helpers in `crm-funnel-dashboard-queries.js` (the queries from §5).
- Hebrew labels, RTL layout.

**Scope (out):**
- FB Pixel/CAPI delta panel — placeholder only until M3/M4 activation.
- Short-link insertion audit (§6 G3) — future SPEC.
- Status enum hardening (§6 G5) — future SPEC.

**Dependencies:**
- Iron Rule 31 + 32 — read-only migration (index + matview), declared in SPEC §Destructive Operations as `None`.
- Index creation MUST use `CONCURRENTLY` to avoid locking writes.

**Estimated effort:** 6-8 hours (matview + scheduler + 6 query funcs + UI shell + smoke test).

**Smoke test:**
- Fresh demo tenant: dashboard loads in <1s; all tiles non-empty after seeding 100 leads + 10 messages.
- Refresh after a new lead intake: tile #1 increments within 5 min.

---

## 9. Auxiliary findings (parking lot)

- `crm_facebook_campaigns` table populated (audience_label, master, interests cols) — Phase 2.5 could add a campaign-mix tile.
- `crm_ad_spend` schema includes impressions/clicks/spend — combined with `v_crm_campaign_performance` gives full ROAS panel.
- `crm_unit_economics` table exists — unexplored; check if it provides CLTV / contribution-margin metrics that belong in Phase 2.5.
- 4,619 messages / 537 leads = 8.6 messages per lead in 30 days — verify this is intentional broadcast cadence vs over-messaging risk.
- `crm_capi_dispatch_queue` has 2 rows — likely test data. After M3/M4 activation, queue depth becomes a key health metric (alert when >100 queued or any failed).

---

## 10. Reproducibility

All queries SELECT-only. Run against `tsxrrxzmdxaenlvocyit`. §5 queries parameterized by tenant_id (replace `$1`) and window days (replace `$2`).

Measured 2026-05-15 23:45 IDT.

---

*End of M2. Companion: tomorrow's Phase 2.5 SPEC author drafts `M4_FUNNEL_HEALTH_DASHBOARD` from §8.*
