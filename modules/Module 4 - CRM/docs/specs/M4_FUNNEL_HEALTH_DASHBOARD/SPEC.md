# SPEC — M4_FUNNEL_HEALTH_DASHBOARD (Deliverable A of FUNNEL Phase 2.5)

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_FUNNEL_HEALTH_DASHBOARD/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M4) — overnight worktree-isolated session
> **Authored on:** 2026-05-19 night
> **Module:** 4 — CRM
> **Phase:** FUNNEL_ROADMAP Phase 2.5 — Deliverable A (Dashboard layer)
> **Parent Brief:** `modules/Module 4 - CRM/architecture-brief/M4_FUNNEL_PHASE_2_5_OVERNIGHT_BRIEF.md` (sealed 2026-05-19 evening)
> **Worktree:** `C:\Users\User\opticup-funnel-25\` on branch `claude/funnel-phase-2-5-overnight-2026-05-19`
> **Risk class:** MEDIUM. New materialized view + pg_cron + index + ~600 LOC frontend. Pure additive — zero touches to existing M4 messaging path.

---

## 0. Pre-Authoring Reality Check

- ✅ Parent Brief read in FULL including §4 Cross-Module Safety Audit (BINDING).
- ✅ M2 knowledge map (`roles/site-overseer/knowledge-build/funnel-q3/M2_FUNNEL_HEALTH_DASHBOARD_DATA_MODEL.md`) read in full — provides 6 verbatim query bodies (§5.1-§5.6) + index recommendation (§6 G1) + dashboard layout (§7).
- ✅ M6 knowledge map referenced in Brief §2 does NOT exist on origin/main — M2 §5.6 already inlines the latency query (PERCENTILE_CONT p50/p95/p99 over crm_message_queue). Sufficient. Logged F-A1.
- ✅ Foreman pre-flight DB probes (2026-05-19 night):
  - `mv_funnel_health_dashboard` does NOT exist (Rule 21 clean).
  - `idx_crm_message_log_tenant_created` does NOT exist (Rule 21 clean).
  - `refresh_funnel_health_dashboard` pg_cron job does NOT exist (Rule 21 clean).
  - `crm_message_log` has 5,306 rows (matches M2 §1 TL;DR baseline of "5K rows today").
  - `crm_permissions` table exists with schema `(id text, module text, action text, name_he text, description text, created_at, tenant_id uuid)`. 7 active cron jobs exist.
  - 6 referenced views all present: `v_crm_campaign_performance`, `v_crm_event_dashboard`, `v_crm_event_stats`, `v_crm_lead_first_touch`, `v_crm_lead_timeline`, `v_crm_message_performance`.
- ✅ Cron pattern confirmed via `daily-alert-generation` precedent — `cron.schedule(jobname, '*/5 * * * *', $$ REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_funnel_health_dashboard $$)`.
- ✅ Existing pixel-gap tile: `modules/crm/crm-pixel-gap-tile.js` (98 lines, exports `window.renderPixelGapTile`). Embedded in `crm-messaging-performance.js` (194 lines) inside the Messaging Hub "📊 ביצועי הודעות" sub-tab. D9 directive: **relocate the embed** (not the file) — Messaging Hub stops embedding it; Funnel Dashboard starts embedding it.
- ✅ Runtime semantics rehearsed — see §0.6 below.
- ✅ Iron Rule 21 cross-reference grep — see §0.5 below.
- ✅ Skill-improvement lessons applied (from today's earlier SPECs + the morning's harvest):
  - SKILL_IMPROVEMENT_HARVEST_2026_05_19 Step 0.7 (Live-State Probe) — DONE via §0.4 probes.
  - Step 0.8 (Line-Budget ±5 buffer) — applied in §3 criteria where applicable.
  - Step 0.9 (User Memory Compliance) — confirmed; this SPEC produces NO Hebrew chat status instructions for downstream agents.
  - executor Step 1.5.6 (DB Probe Pre-Flight) — Executor will re-confirm at Step 1.5.
  - executor Step 1.5.7 (SECURITY DEFINER Rehearsal) — N/A; this SPEC has no SECURITY DEFINER functions.

### 0.4 Live DB Baselines (referenced by §3 Success Criteria as BASE_*)

| Symbol | Source | Value (captured 2026-05-19) |
|---|---|---|
| `BASE_CRM_MESSAGE_LOG_ROWS` | `SELECT count(*) FROM crm_message_log` | 5,306 |
| `BASE_ACTIVE_CRON_JOBS` | `SELECT count(*) FROM cron.job WHERE active=true` | 7 |
| `BASE_MV_EXISTS` | `pg_matviews WHERE matviewname='mv_funnel_health_dashboard'` | 0 (clean) |
| `BASE_PIXEL_GAP_TILE_LINES` | `wc -l modules/crm/crm-pixel-gap-tile.js` | 98 (UNCHANGED — file stays, only embed location moves) |
| `BASE_MESSAGING_PERF_LINES` | `wc -l modules/crm/crm-messaging-performance.js` | 194 (will SHRINK by ~10 lines after pixel-gap embed removed) |
| `BASE_CRM_HTML_LINES` | `wc -l crm.html` | ~430 (Executor confirms exact; +2-3 lines for new script tags) |

### 0.5 Cross-Reference Check (Iron Rule 21)

| Name | Search | Hits | Resolution |
|---|---|---|---|
| `mv_funnel_health_dashboard` | `pg_matviews` | 0 | Genuinely new |
| `idx_crm_message_log_tenant_created` | `pg_indexes` | 0 | Genuinely new |
| `idx_mv_funnel_health_tenant` (UNIQUE for CONCURRENTLY) | `pg_indexes` | 0 | Genuinely new |
| `refresh_funnel_health_dashboard` (cron job) | `cron.job` | 0 | Genuinely new |
| `modules/crm/crm-funnel-dashboard.js` (file) | filesystem | does-not-exist | Genuinely new |
| `modules/crm/crm-funnel-dashboard-queries.js` (file, OPTIONAL extraction) | filesystem | does-not-exist | Genuinely new (gated by D-AUTH-3) |
| `css/crm-funnel-dashboard.css` (file) | filesystem | does-not-exist | Genuinely new |
| `window.renderFunnelDashboard` (global) | `grep -rn "renderFunnelDashboard"` | 0 | Genuinely new |
| `crm.funnel_health.view` (permission id) | `SELECT id FROM crm_permissions WHERE id='crm.funnel_health.view'` | 0 | Genuinely new |

**Cross-Reference Check completed 2026-05-19 night against live DB + worktree filesystem: 0 collisions / 0 hits.**

### 0.6 Runtime Semantics Rehearsal

This SPEC creates:
- 1 materialized view (`mv_funnel_health_dashboard`).
- 1 UNIQUE index ON the mv (required for `REFRESH MATERIALIZED VIEW CONCURRENTLY`).
- 1 partial-or-regular index on `crm_message_log` (M2 §6 G1 — performance).
- 1 pg_cron job (5-min refresh).
- 1 permission row per tenant.
- 4-5 new JS files + 1 CSS file + crm.html script-tag additions + new tab registration.

**Materialized view structure (rehearsed):**

Single row per tenant. Aggregates 14 tiles' worth of data. Multi-row tile data stored as JSONB columns. Scalar tile data as numeric/integer columns.

```sql
CREATE MATERIALIZED VIEW public.mv_funnel_health_dashboard AS
SELECT
  t.id AS tenant_id,
  NOW() AS refreshed_at,
  -- Tile 1: Leads captured 30d + 7d delta
  (SELECT count(*) FROM crm_leads WHERE tenant_id=t.id AND created_at > NOW() - INTERVAL '30 days' AND is_deleted=false) AS leads_30d,
  (SELECT count(*) FROM crm_leads WHERE tenant_id=t.id AND created_at > NOW() - INTERVAL '7 days' AND is_deleted=false) AS leads_7d,
  -- Tile 2: Lead → attendee conv rate (30d)
  (SELECT count(DISTINCT a.lead_id) FROM crm_event_attendees a WHERE a.tenant_id=t.id AND a.created_at > NOW() - INTERVAL '30 days' AND a.is_deleted=false) AS attendees_30d,
  -- Tile 3: Attendee → buyer conv rate (30d)
  (SELECT count(*) FROM crm_event_attendees WHERE tenant_id=t.id AND purchase_amount > 0 AND created_at > NOW() - INTERVAL '30 days' AND is_deleted=false) AS buyers_30d,
  -- Tile 4: Total revenue 30d
  (SELECT COALESCE(SUM(purchase_amount), 0) FROM crm_event_attendees WHERE tenant_id=t.id AND purchase_amount > 0 AND created_at > NOW() - INTERVAL '30 days') AS revenue_30d,
  (SELECT COALESCE(SUM(purchase_amount), 0) FROM crm_event_attendees WHERE tenant_id=t.id AND purchase_amount > 0 AND created_at > NOW() - INTERVAL '7 days') AS revenue_7d,
  -- Tile 5: Source mix (JSONB array of {source, count})
  (SELECT jsonb_agg(jsonb_build_object('source', first_touch_type, 'count', n))
   FROM (SELECT first_touch_type, count(*) AS n FROM v_crm_lead_first_touch WHERE tenant_id=t.id GROUP BY first_touch_type) s) AS source_mix,
  -- Tile 6: Top 5 broadcasts by CTR (JSONB array)
  (SELECT jsonb_agg(row_to_json(b) ORDER BY b.ctr_pct DESC)
   FROM (SELECT id, name, channel, total_sent,
                ROUND(100.0 * (SELECT count(DISTINCT c.id) FROM short_link_clicks c WHERE c.broadcast_id=b.id AND c.tenant_id=t.id) / NULLIF(total_sent, 0), 2) AS ctr_pct
         FROM crm_broadcasts b WHERE tenant_id=t.id AND created_at > NOW() - INTERVAL '30 days'
         ORDER BY ctr_pct DESC NULLS LAST LIMIT 5) b) AS top_broadcasts,
  -- Tile 7: Pixel/CAPI gap — REUSE existing tile, NOT in mv (live query from crm-pixel-gap-tile.js)
  -- Tile 8: CAPI queue health (JSONB {status: count})
  (SELECT jsonb_object_agg(status, n)
   FROM (SELECT status, count(*) AS n FROM crm_capi_dispatch_queue WHERE tenant_id=t.id GROUP BY status) s) AS capi_queue_health,
  -- Tile 9: Message latency p50/p95/p99 by channel (JSONB array, last 7d)
  (SELECT jsonb_agg(jsonb_build_object(
            'channel', q.channel,
            'p50_seconds', PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (q.processed_at - q.created_at))),
            'p95_seconds', PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (q.processed_at - q.created_at))),
            'p99_seconds', PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (q.processed_at - q.created_at))),
            'n', count(*)))
   FROM crm_message_queue q WHERE q.tenant_id=t.id AND q.processed_at IS NOT NULL AND q.processed_at > NOW() - INTERVAL '7 days'
   GROUP BY q.channel) AS latency_p_by_channel,
  -- Tile 10: Event registration funnel chart (JSONB array per event status)
  (SELECT jsonb_agg(row_to_json(s))
   FROM (SELECT status, count(*) AS n FROM crm_events WHERE tenant_id=t.id AND is_deleted=false GROUP BY status) s) AS event_funnel,
  -- Tile 11: Unsubscribe rate 7d/30d
  (SELECT count(*) FILTER (WHERE unsubscribed_at > NOW() - INTERVAL '7 days') FROM crm_leads WHERE tenant_id=t.id AND is_deleted=false) AS unsubs_7d,
  (SELECT count(*) FILTER (WHERE unsubscribed_at > NOW() - INTERVAL '30 days') FROM crm_leads WHERE tenant_id=t.id AND is_deleted=false) AS unsubs_30d,
  -- Tile 12: Failed-send error breakdown (JSONB array {error_kind, count, channel, status})
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
  -- Tile 13: Campaign ROAS/CAC (delegated to v_crm_campaign_performance — live join, not in mv)
  -- Tile 14: Trend sparklines — JSONB with daily buckets for leads / attendees / revenue (last 28 days)
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

CREATE UNIQUE INDEX idx_mv_funnel_health_tenant ON public.mv_funnel_health_dashboard (tenant_id);
```

**Refresh rehearsal:** `REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_funnel_health_dashboard` runs in <30s (Brief §8 limit). The CONCURRENTLY option requires the UNIQUE index above. Tested mentally: 2 active tenants × ~14 scalar/JSONB columns × tenant-scoped sub-queries = sub-second total wall time on current 5K-row scale.

**Frontend rehearsal:** new tab "מצב פאנל" registered in CRM SPA. New file `crm-funnel-dashboard.js` (≤ 250 lines target / ≤ 350 absolute per Rule 12) exposes `window.renderFunnelDashboard(host)`. Optional extraction `crm-funnel-dashboard-queries.js` (≤ 120 lines) for the 14 tile-render helpers if main file would exceed 280 lines. Reads `mv_funnel_health_dashboard` via single tenant-scoped SELECT, then renders 14 tile DOM elements + 5 drill-down modals (via existing `Modal.show`).

**Permission rehearsal:** insert row `{id: 'crm.funnel_health.view', module: 'crm', action: 'funnel_health.view', name_he: 'צפייה במצב פאנל', tenant_id: <each-tenant>}` for both demo + prizma. The Executor probes existing crm_permissions rows to match the description-field convention.

**Pixel-gap relocation rehearsal:** the embed call `if (typeof window.renderPixelGapTile === 'function') { ... }` currently lives in `crm-messaging-performance.js` (lines ~48-53). Remove that block. Add equivalent embed call inside the new funnel-dashboard's render flow. The pixel-gap-tile JS file itself stays at `modules/crm/crm-pixel-gap-tile.js` (no `git mv`). The HTML script tag at `crm.html:413` stays (the file is still consumed, just from a different parent).

**Runtime semantics rehearsed: yes.**

### Lessons Applied from Recent FOREMAN_REVIEWs

| From | Lesson | Applied here |
|---|---|---|
| `SKILL_IMPROVEMENT_HARVEST_2026_05_19/FOREMAN_REVIEW.md` P-AUTHOR-1 | Light Pipeline shape (doc-only) | N/A — this is a code+DB SPEC, full Pipeline. |
| `SKILL_IMPROVEMENT_HARVEST_2026_05_19/FOREMAN_REVIEW.md` P-AUTHOR-2 | Insertion-Point Resolution as §0.4 | Applied where applicable (mv structure rehearsed in §0.6). |
| `M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/FOREMAN_REVIEW.md` P-AUTHOR-1 | pg_proc.namespace probe for extension functions | N/A — this SPEC uses only core PostgreSQL (no uuid-ossp, no extensions schema dependencies). |
| `M4_PIXEL_VALIDATION_GAP_DASHBOARD/FOREMAN_REVIEW.md` P-AUTHOR-2 | Line-budget sub-allocation | Applied: tile JS file ≤ 250 lines, queries ≤ 120 lines if extracted, CSS ≤ 200 lines. |
| `M4_TEMPLATE_VALIDATION_UI_LINT/FOREMAN_REVIEW.md` P-AUTHOR-1 | Dependency-graph rehearsal for script tag order | Applied: §0.6 rehearsal confirms new funnel-dashboard.js loads AFTER `crm-pixel-gap-tile.js` (since dashboard embeds the tile). |

### D-AUTH (Foreman decisions pre-committed)

- **D-AUTH-1 (mv structure).** Single materialized view, single row per active tenant. All 14 tile values pre-computed and cached. JSONB for multi-row tile data. `REFRESH MATERIALIZED VIEW CONCURRENTLY` requires UNIQUE index on `(tenant_id)`.
- **D-AUTH-2 (cron schedule).** Every 5 minutes: `*/5 * * * *`. Matches Brief §3.1 "5min cache" + §6 D1.
- **D-AUTH-3 (file extraction gate).** Target: keep `crm-funnel-dashboard.js` ≤ 250 lines (well under Rule 12 absolute 350). If post-edit > 280 lines → EXTRACT to `crm-funnel-dashboard-queries.js` (target ≤ 120 lines). Executor decides at Step 2.
- **D-AUTH-4 (pixel-gap relocation: embed move, not file move).** File `crm-pixel-gap-tile.js` stays at current path. Embed code moves from `crm-messaging-performance.js` to new `crm-funnel-dashboard.js`. HTML script tag stays. This is Daniel's D9 intent literally interpreted as "show in dashboard, stop showing in messaging hub".
- **D-AUTH-5 (Iron Rule 32 declared = 0).** All work additive. New mv, new index, new file, new permission row. The pixel-gap relocation removes ~6 lines from `crm-messaging-performance.js` (an embed call) — NOT a destructive op pattern (file deletes, DROP TABLE, etc. per Rule 32 definition). Net JS code unchanged (~same total lines across the new + reduced files).
- **D-AUTH-6 (Iron Rule 34 — UI verification REQUIRED).** This SPEC modifies browser-consumed JS → Iron Rule 34 triplet at LH-Tester phase: (a) Chrome MCP screenshot of new "מצב פאנל" tab on demo + (if accessible) Prizma, (b) `window.__funnelTrace` runtime trace showing mv-read + tile-render sequence, (c) DB-probe evidence showing mv populated for both tenants.
- **D-AUTH-7 (Iron Rule 35 — no Campaign Overseer surfaces touched).** Zero placeholder/action_type/trigger_type changes. Read-only on `crm_message_templates` (Tile 12 reads error_message classifier).
- **D-AUTH-8 (Iron Rule 22 — defense-in-depth tenant_id).** Every dashboard `.select()` call from the JS layer chains `.eq('tenant_id', getTenantId())`. The mv is RLS-protected via inherited canonical policy on `mv_funnel_health_dashboard` (executor adds standard `service_bypass` + `tenant_isolation` 2-policy pair).
- **D-AUTH-9 (Pixel-gap tile NOT duplicated in mv — kept as live query).** The pixel-gap tile already has its own queries in `crm-pixel-gap-tile.js`. The mv intentionally OMITS pixel-gap data (M2 §3 marks Tile 7 as ⬛ blocked but already shipped separately by `M4_PIXEL_VALIDATION_GAP_DASHBOARD`). The dashboard embeds the existing tile component; doesn't re-query.
- **D-AUTH-10 (Permission seed pattern).** Per probed `crm_permissions` schema. Permission rows per-tenant (tenant_id is NOT NULL). Seed for both demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`) + Prizma (`SELECT id FROM tenants WHERE slug='prizma'`). Description optional. The new mv tab is visible to roles that have this permission — Executor follows existing role-permission mapping convention (likely via `crm_role_permissions` table — probes at Step 1.5).

### 0.7 Findings at SPEC Author Time

| # | Finding | Severity | Disposition |
|---|---|---|---|
| F-A1 | M6 knowledge map referenced in Brief §2 does NOT exist on origin/main. M2 §5.6 inlines the latency query, so functionally sufficient. | INFO | Brief reference is stale; tracked. No follow-up needed for this SPEC. |
| F-A2 | M2 §6 G2 notes that `crm_leads.fb_pixel_fired_at` is empty for 0/537 Prizma leads (CAPI not flowing yet) — Tile 7 was Brief's blocked metric. P2.1-P2.4 shipped today have CHANGED this state — CAPI substrate is live + Purchase events flowing on demo (`status='sent'`). Prizma still awaits `fb_capi_token` population. Tile 7 will show meaningful data on demo, mostly-empty on Prizma until token population. NOT a blocker — the pixel-gap tile component handles 0-state gracefully. | INFO | Document in Executor's EXECUTION_REPORT as a state observation. |

---

## 1. Goal

Ship a 14-tile Funnel Health Dashboard inside the ERP CRM module: new "מצב פאנל" tab, single materialized view backing all tiles (5-min refresh via pg_cron), 5 drill-down modals, new permission row, new index for `crm_message_log` performance, and relocation of the existing pixel-gap tile embed from Messaging Hub to the new dashboard.

After this SPEC: Daniel can open ERP CRM → Funnel Health and see the entire funnel state (leads, conversions, revenue, source mix, broadcast performance, CAPI health, message latency, errors, unsubscribes, trends) at-a-glance, refreshed every 5 minutes. Each tile click drills into the underlying rows.

---

## 2. Background & Motivation

FUNNEL Phase 2 closed today (P2.1 substrate + P2.2 dashboard tile + P2.3 template validation + P2.4 purchase events). Phase 2.5 brings the **dashboard layer** that consumes Phase 2's substrate.

Per Brief §1 + §2: Daniel directive *"I want to always improve, to know how to improve, what to improve."* Phase 2.5 makes that operational. This SPEC (Deliverable A) ships the data layer; companion SPEC `M4_WEEKLY_OPTIMIZATION_BRIEF` (Deliverable B) ships the analysis layer on top.

The M2 knowledge map (2026-05-15 night) catalogued all 14 metrics, authored 6 verbatim queries, and identified 1 performance index needed (G1). This SPEC implements M2 §8's SPEC stub end-to-end.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state | Worktree on `claude/funnel-phase-2-5-overnight-2026-05-19`, scope-clean at SPEC close | `git -C C:/Users/User/opticup-funnel-25 status --short` empty |
| 2 | Commits (Executor scope) | 3-4 commits: C2 (migration: mv + indexes + cron + permissions) + C3 (frontend: tiles JS + CSS + tab + relocation) + C4 (retrospective). ±1 acceptable. | `git log {SPEC_SEAL}..HEAD --oneline \| wc -l` |
| 3 | `mv_funnel_health_dashboard` materialized view exists with all 14 tile columns | exists | `SELECT count(*) FROM pg_matviews WHERE matviewname='mv_funnel_health_dashboard'` → 1 |
| 4 | UNIQUE index `idx_mv_funnel_health_tenant` on mv | exists | `SELECT count(*) FROM pg_indexes WHERE indexname='idx_mv_funnel_health_tenant'` → 1 |
| 5 | mv populated with ≥ 1 row (both active tenants) | ≥ 2 rows after first refresh | `SELECT count(*) FROM mv_funnel_health_dashboard` → ≥ 2 |
| 6 | Partial/regular index `idx_crm_message_log_tenant_created` on `crm_message_log` | exists, CONCURRENTLY-built | `SELECT count(*) FROM pg_indexes WHERE indexname='idx_crm_message_log_tenant_created'` → 1 |
| 7 | pg_cron job `refresh_funnel_health_dashboard` scheduled `*/5 * * * *` | exists, active=true | `SELECT count(*) FROM cron.job WHERE jobname='refresh_funnel_health_dashboard' AND active=true AND schedule='*/5 * * * *'` → 1 |
| 8 | mv REFRESH wall time ≤ 30s | observed | `EXPLAIN ANALYZE REFRESH MATERIALIZED VIEW CONCURRENTLY ...` OR pg_stat_user_tables-based timing |
| 9a | New file `modules/crm/crm-funnel-dashboard.js` ≤ 250 lines (±5 buffer = ≤ 255) | ≤ 255 | `wc -l` |
| 9b | OPTIONAL extracted `modules/crm/crm-funnel-dashboard-queries.js` ≤ 120 lines if created | ≤ 120 | `wc -l` (file may not exist if D-AUTH-3 didn't trigger) |
| 10 | New CSS file `css/crm-funnel-dashboard.css` ≤ 200 lines | ≤ 200 | `wc -l` |
| 11a | `window.renderFunnelDashboard` exposed | 1 hit | grep |
| 11b | New tab "מצב פאנל" registered in CRM SPA | hit in crm.html OR module-shell file | grep |
| 12 | Pixel-gap embed relocated — REMOVED from `crm-messaging-performance.js`, ADDED to `crm-funnel-dashboard.js` | grep | `grep "renderPixelGapTile" modules/crm/crm-messaging-performance.js` → 0; `grep "renderPixelGapTile" modules/crm/crm-funnel-dashboard.js` → ≥ 1 |
| 13 | `crm-pixel-gap-tile.js` UNCHANGED (file content) | byte-identical | `git diff origin/main -- modules/crm/crm-pixel-gap-tile.js` → empty |
| 14 | 14 tile render functions present (one per metric in §3.5) | 14 hits | `grep -c "renderTile_" modules/crm/crm-funnel-dashboard*.js` → 14 |
| 15 | 5 drill-down modals — clicking a top-5 tile opens `Modal.show` | 5 explicit `Modal.show` calls | grep |
| 16 | Permission row `crm.funnel_health.view` seeded for both demo + prizma | 2 rows | `SELECT count(*) FROM crm_permissions WHERE id='crm.funnel_health.view'` → 2 |
| 17 | RLS on mv: canonical 2-policy pair (service_bypass + tenant_isolation, JWT-claim USING) | 2 policies | `SELECT count(*) FROM pg_policies WHERE tablename='mv_funnel_health_dashboard'` → 2 |
| 18 | All `.select()` from mv chain `.eq('tenant_id', tid)` (Rule 22) | 100% | grep |
| 19 | Iron Rule 31 integrity gate at every commit | exit 0 or 2 | pre-commit hook |
| 20 | Iron Rule 32 destructive-ops | 0 declared, 0 detected | hook |
| 21 | Brief §4 Cross-Module Safety Audit holds — no §4.2 / §4.4 / §4.6 touched | confirmed | Reviewer audit |
| 22 | Iron Rule 34 — Chrome MCP triplet | (a) screenshot of dashboard, (b) `window.__funnelTrace` JSON, (c) DB probe of mv populated | LH-Tester writes to TEST_REPORT |
| 23 | Smoke 7/7 PASS on worktree | 7/7 (or 8/8 if Layer D smoke from prior SPEC inherited) | `node tests/smoke/baseline.test.mjs` |
| 24 | `docs/FUNNEL_HEALTH_DASHBOARD.md` documentation created | ≤ 80 lines | grep + wc -l |

### 3.5 Tile Catalogue + Render Mapping

The 14 tiles map to 14 render functions inside the new file. Each reads from the mv (via the single SELECT) and renders DOM. The mv columns above (§0.6) are the data source; this table is the rendering contract:

| # | Tile | mv column(s) | Render fn | Drill-down? |
|---|---|---|---|---|
| 1 | Leads 30d + 7d delta | `leads_30d, leads_7d` | `renderTile_leads` | Yes (Modal with list of recent leads) |
| 2 | Lead→Attendee conv rate | `leads_30d, attendees_30d` | `renderTile_leadAttendeeConv` | Yes (Modal with attendees list) |
| 3 | Attendee→Buyer conv rate | `attendees_30d, buyers_30d` | `renderTile_attendeeBuyerConv` | No (simple stat) |
| 4 | Revenue 30d + 7d delta | `revenue_30d, revenue_7d` | `renderTile_revenue` | Yes (Modal with paid-attendees list) |
| 5 | Source mix donut | `source_mix` (JSONB) | `renderTile_sourceMix` | No (visual breakdown) |
| 6 | Top 5 broadcasts CTR | `top_broadcasts` (JSONB) | `renderTile_topBroadcasts` | Yes (Modal with broadcast detail) |
| 7 | Pixel/CAPI Gap | (live — embed existing `renderPixelGapTile`) | `renderTile_pixelGap` (wrapper) | (inherited from existing tile's drill-down) |
| 8 | CAPI queue health | `capi_queue_health` (JSONB) | `renderTile_capiQueueHealth` | No |
| 9 | Message latency p50/p95/p99 | `latency_p_by_channel` (JSONB) | `renderTile_latency` | No |
| 10 | Event funnel chart | `event_funnel` (JSONB) | `renderTile_eventFunnel` | No |
| 11 | Unsub rate 7d/30d | `unsubs_7d, unsubs_30d` | `renderTile_unsubs` | No |
| 12 | Failed-send breakdown | `failed_breakdown` (JSONB) | `renderTile_failedBreakdown` | Yes (Modal with messages-log filtered to errors) |
| 13 | Campaign ROAS/CAC | `v_crm_campaign_performance` (LIVE join — not in mv) | `renderTile_campaignROAS` | No |
| 14 | Trend sparklines (28d) | `sparklines` (JSONB) | `renderTile_sparklines` | No |

**Drill-down modal count: 5** (tiles 1, 2, 4, 6, 12).

---

## 4. Autonomy Envelope

### CAN do autonomously

- Read any file in worktree.
- Run Level 1 (read-only) + Level 2 (declared mv/index/cron creation; permission seeds; mv RLS policies) SQL via Supabase MCP.
- Apply 1 migration via MCP `apply_migration` with name `m4_funnel_health_dashboard`.
- Modify exactly these files:
  - NEW: `modules/crm/crm-funnel-dashboard.js`, OPTIONAL `modules/crm/crm-funnel-dashboard-queries.js`, `css/crm-funnel-dashboard.css`, `supabase/migrations/{ts}_m4_funnel_health_dashboard.sql`, `docs/FUNNEL_HEALTH_DASHBOARD.md`.
  - MODIFIED: `crm.html` (3 script tags + 1 CSS link + 1 tab registration), `modules/crm/crm-messaging-performance.js` (remove pixel-gap embed; ~6 lines deleted).
- Use `OpticupConfig.tenant.id` for tenant-scoped queries.
- Reuse `Modal.show` from `shared/js/modal-builder.js` for drill-downs.
- Stage by explicit filename only.

### MUST STOP

- Need to modify ANY file outside the 6 declared.
- Brief §4.2 / §4.4 / §4.6 touch.
- Need to add ANY new placeholder, action_type, trigger_type (Iron Rule 35).
- More than 1 new mv, 1 new table, 1 new EF, 1 new index, 1 new cron job, OR 1 new permission row id.
- Need to modify `crm-pixel-gap-tile.js` content (Brief §6 D9 — reuse, don't modify).
- mv REFRESH wall time exceeds 30s.
- Iron Rule 31/32 fails.
- Smoke regresses.

### Bounded handling of EXPECTED deviations

- **Tab registration mechanism differs from expected.** If CRM SPA doesn't have a clean tab-registration API, embed in the page that's the closest match (likely `crm.html` direct script + new `<div>` tab + JS event handler matching existing tab pattern). Document in EXECUTION_REPORT.
- **Permission seed pattern probes find role-permission-mapping table.** Executor probes + follows convention. If no role-permission table exists (only the `crm_permissions` flat table), skip the role mapping — Daniel can map roles manually.
- **`tenants` table column names differ from rehearsed.** Confirm at Step 1.5; adjust SQL accordingly.
- **mv first REFRESH after initial CREATE is NOT-CONCURRENT** (Postgres requires non-concurrent for the first refresh — concurrent requires existing data). Execute initial REFRESH non-concurrently inside the migration; subsequent cron-driven refreshes use CONCURRENTLY.

---

## 5. Stop-Triggers

Beyond CLAUDE.md §9:

1. mv structure differs from §0.6 rehearsal in any tile column → STOP.
2. Cron schedule != `*/5 * * * *` → STOP.
3. Pixel-gap tile FILE modified (file bytes change vs origin/main) → STOP.
4. Adding a 2nd cron job → STOP (only `refresh_funnel_health_dashboard`).
5. Iron Rule 34 triplet missing at LH-Tester → STOP.
6. Brief §4.9 violation → STOP.

---

## 6. Pipeline

Full 5-hat:

1. **Foreman (Opus)** authors this SPEC (DONE).
2. **Executor (Sonnet)** Step 1.5 pre-flight, apply migration, write JS + CSS + doc, commit C2/C3, write EXECUTION_REPORT + FINDINGS (C4).
3. **Reviewer (default)** validates Iron Rules + Brief §4 + verbatim mv structure match. Writes REVIEW.md.
4. **Localhost-Tester (default)** smoke + Chrome MCP triplet on demo. Writes TEST_REPORT.md with screenshots in `artifacts/`.
5. **Foreman closes (Opus)** with FOREMAN_REVIEW.md.

---

## 7. Out of Scope

- All Brief §4.2 tables (msg log + queue + templates + automation_rules etc.).
- All Brief §4.4 EFs.
- All Brief §4.6 triggers.
- Pixel-gap tile file modification (D9 — relocate embed only).
- Storefront repo work.
- AI prose generation (Deliverable B's classifier is deterministic; no AI in v1 of EITHER deliverable).
- Real-time updates / WebSocket (5-min mv cache only).
- New placeholders / trigger types / action types.
- Modification of `_shared/template-validation.ts` or any EF.
- New ERP page route (single new tab inside CRM module, not a new top-level page).

---

## 8. Expected Final State

| File | Action | Expected size |
|---|---|---|
| `supabase/migrations/{ts}_m4_funnel_health_dashboard.sql` | NEW | ≤ 250 lines (mv definition + 2 indexes + 2 RLS policies + cron + 2 permission seeds + initial REFRESH) |
| `modules/crm/crm-funnel-dashboard.js` | NEW | ≤ 250 lines (orchestrator + 14 render fns, OR ≤ 180 lines if queries extracted) |
| `modules/crm/crm-funnel-dashboard-queries.js` | OPTIONAL NEW | ≤ 120 lines (only if D-AUTH-3 fires) |
| `css/crm-funnel-dashboard.css` | NEW | ≤ 200 lines |
| `crm.html` | MODIFIED | +3-5 lines (script tag for funnel-dashboard.js + optional queries + CSS link + tab registration) |
| `modules/crm/crm-messaging-performance.js` | MODIFIED | 194 → ~188 lines (~6 lines removed for pixel-gap embed) |
| `docs/FUNNEL_HEALTH_DASHBOARD.md` | NEW | ≤ 80 lines |
| `modules/Module 4 - CRM/docs/specs/M4_FUNNEL_HEALTH_DASHBOARD/SPEC.md` | NEW (this) | this file |
| `.../EXECUTION_REPORT.md` | NEW (Executor) | ~150 lines |
| `.../FINDINGS.md` | NEW (Executor) | ~30 lines |
| `.../REVIEW.md` | NEW (Reviewer) | ~100 lines |
| `.../TEST_REPORT.md` | NEW (LH-Tester) | ~120 lines + 2-3 PNG screenshots in `artifacts/` |
| `.../FOREMAN_REVIEW.md` | NEW (Foreman closure) | ~250 lines |

**DB state:**
- 1 new materialized view + 2 indexes (mv UNIQUE + crm_message_log perf) + 2 RLS policies + 1 cron job + 2 permission rows.
- 0 row changes on existing data.

**Git state:** 6-8 commits on the worktree branch (this SPEC seal + Executor C2/C3/C4 + Reviewer + LH-Tester + Foreman closure).

---

## 9. Rollback Plan

Per-commit revert. Worst-case:

```sql
DROP MATERIALIZED VIEW IF EXISTS public.mv_funnel_health_dashboard CASCADE; -- cascades drops the 2 RLS policies + UNIQUE index
DROP INDEX IF EXISTS public.idx_crm_message_log_tenant_created;
SELECT cron.unschedule('refresh_funnel_health_dashboard');
DELETE FROM crm_permissions WHERE id = 'crm.funnel_health.view';
```

Plus `git revert` for the frontend commits. All additive — safe rollback.

---

## 10. Commit Plan

- **C1** (already done — this SPEC.md): `chore(spec): seal M4_FUNNEL_HEALTH_DASHBOARD — Deliverable A of Phase 2.5`.
- **C2**: `feat(m4): M4_FUNNEL_HEALTH_DASHBOARD — mv + indexes + cron + permissions (Deliverable A migration)`.
- **C3**: `feat(m4): M4_FUNNEL_HEALTH_DASHBOARD — dashboard tiles + tab + pixel-gap relocation (Deliverable A frontend)`.
- **C4**: `chore(spec): M4_FUNNEL_HEALTH_DASHBOARD — Executor retrospective`.

Reviewer + LH-Tester + Foreman closure each add 1 commit.

---

## 11. Destructive Operations

**Count: 0.**

All work additive. The pixel-gap embed removal from `crm-messaging-performance.js` is a code edit (~6 lines), not a destructive-op pattern per Rule 32 definition (file deletes, DROPs, TRUNCATEs, mass renames). If Reviewer/Executor disagree and the destructive-ops hook fires → STOP, declare in this SPEC + amend before commit.

---

## 12. Cross-References

- **Parent Brief:** `modules/Module 4 - CRM/architecture-brief/M4_FUNNEL_PHASE_2_5_OVERNIGHT_BRIEF.md`.
- **Knowledge map (primary):** `roles/site-overseer/knowledge-build/funnel-q3/M2_FUNNEL_HEALTH_DASHBOARD_DATA_MODEL.md`.
- **Companion SPEC (Deliverable B):** `modules/Module 4 - CRM/docs/specs/M4_WEEKLY_OPTIMIZATION_BRIEF/` (consumes this SPEC's mv).
- **Deferred SPEC (Deliverable C, next session):** `modules/Module 4 - CRM/docs/specs/M4_FUNNEL_AUDIT_OVERNIGHT_2026_05_19/`.
- **Reuses:**
  - `modules/crm/crm-pixel-gap-tile.js` (embed; D9).
  - 6 existing views per §0.5.
  - `shared/js/modal-builder.js` `Modal.show` for drill-downs.
- **Iron Rules:** 12, 14, 15, 18, 21, 22, 31, 32, 34, 35.

---

## 13. Author Notes

This SPEC is the highest-leverage one shipped to date for daily operations: after it lands, Daniel opens ERP CRM → Funnel Health and sees the whole funnel state in 5 seconds, refreshed every 5 minutes, without running a single ad-hoc SQL. The Weekly Brief (Deliverable B) consumes the same mv for its analysis — so investing in mv quality here pays off twice.

The biggest design choice is the materialized-view-as-cache pattern vs live-query-on-page-load. M2 §1 TL;DR explicitly recommends the mv for performance + simplicity. At 5K message_log rows today, live queries would work; at 100K+ rows they degrade. The mv keeps page-load sub-100ms regardless of scale.

---

*End of SPEC.*
