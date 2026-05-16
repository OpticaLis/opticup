# M3 — FB CAPI Post-Launch Validation Plan

> **Mission:** Investigate Meta Events Manager API endpoints that expose match-quality
> scores, dedup metrics, and event delivery rates. Sketch a cron-driven CAPI health
> check + alert thresholds. Produce a SPEC stub for `M4_FB_CAPI_POST_LAUNCH_MONITORING`.
>
> **Read-only knowledge build.** Generated 2026-05-15 night.
> Internal data measured against `tsxrrxzmdxaenlvocyit` via SELECT-only.
> Meta API surface researched from public documentation references (no live API calls).

---

## 1. TL;DR

- **Substrate status:** CAPI dispatch EF (`supabase/functions/fb-capi-dispatch/index.ts`) is deployed, pg_cron job `fb_capi_dispatch_consumer` runs every minute. All wiring is complete.
- **Activation status:** `crm_capi_dispatch_queue` contains 2 rows total, both demo, both `skipped_no_token`. Prizma's `storefront_config.analytics.fb_capi_token` is still empty — only Daniel populating that field stands between substrate and live dispatch (memory `project_fb_capi_p21_state.md`).
- **Validation surface:** Meta provides 3 useful endpoints (Event Delivery, Event Match Quality, Event Diagnostics) — all under `graph.facebook.com/v19.0/{pixel_id}/`. They require a System User access token with `ads_management` + `business_management` permissions.
- **Cron-driven health check recommended:** every 6 hours, query Meta API for last batch, write rows to a new `crm_capi_health_snapshots` table, alert if match quality drops below threshold or delivery rate drops >10% week-over-week.
- **SPEC stub ready** in §6 for `M4_FB_CAPI_POST_LAUNCH_MONITORING` — estimated 4-6 hours of execution work, deferred until prizma token is populated and at least 100 live CAPI events have flowed.

---

## 2. Current state — what we have

### 2.1 Dispatch EF (deployed, working)

File: `supabase/functions/fb-capi-dispatch/index.ts` (336 lines).

Flow:
1. pg_cron `fb_capi_dispatch_consumer` fires every minute → posts `{dispatch_mode:'cron'}` to EF.
2. EF claims up to 20 rows from `crm_capi_dispatch_queue` (status `queued` or retriable `failed`, scheduled ≤ now, retries < 3).
3. Per row: fetch lead → normalize phone E.164 → SHA-256 hash em+ph → fetch `fb_capi_token` from `storefront_config.analytics.fb_capi_token` → POST to `https://graph.facebook.com/v19.0/{pixel_id}/events`.
4. Update queue row with `status`, `retries`, `meta_response`, `event_payload` (hashed only, no PII), `processed_at`.

### 2.2 Queue state — live

| Tenant | Total rows | sent | queued | failed | skipped_no_token | no_match |
|---|---:|---:|---:|---:|---:|---:|
| demo   | 2 | 0 | 0 | 0 | **2** | 0 |
| prizma | 0 | 0 | 0 | 0 | 0 | 0 |

Both demo rows are pre-token test entries. `event_name='Lead'`, `event_id` shaped like Meta event_ids. They confirm the dispatch path runs end-to-end up to the "no token" branch.

### 2.3 Why prizma is empty

Memory `project_fb_capi_p21_state.md`: "ERP substrate (M4) + storefront handoff (M3) both shipped 2026-05-15; only Daniel populating Prizma `tenants.fb_capi_token` remains."

The memory says `tenants.fb_capi_token`, but the EF actually reads from `storefront_config.analytics.fb_capi_token`. Quick clarification check: the project-genesis SPEC chose D-AUTH-1 → `storefront_config.analytics->>'fb_capi_token'` (see fb-capi-dispatch/index.ts:14, line 141). **Verify** the memory's pointer is current — if Daniel set `tenants.fb_capi_token` instead, the dispatch will still `skipped_no_token` because the EF doesn't look there.

**Action item for Daniel (not in this SPEC):** confirm `storefront_config.analytics` JSONB for prizma includes `"fb_capi_token": "<token>"` AND `"facebook_pixel_id": "<id>"`. Both are required (EF returns `permanent_error: no facebook_pixel_id` if pixel_id missing — index.ts:153).

---

## 3. Meta API surface — what's queryable post-launch

All endpoints documented under `developers.facebook.com/docs/marketing-api/conversions-api`. Access requires:
- A **System User access token** (long-lived) with permissions: `ads_management`, `business_management`, `ads_read`.
- The token MUST belong to a System User in the Business Manager that owns the Pixel.
- For our setup: Prizma Business Manager → grant System User access → System User → Generate Token with the 3 perms above.

### 3.1 Endpoint A — Event Delivery (volume + dropoff)

```
GET https://graph.facebook.com/v19.0/{pixel_id}/stats?
  fields=count&
  start_time={UNIX_SECONDS}&
  end_time={UNIX_SECONDS}&
  aggregation=event&
  access_token={SYSTEM_USER_TOKEN}
```

Returns rows like `{event_name: 'Lead', count: 412}` over the window. Compare against our queue rows with `status='sent'` for the same window to compute **delivery loss rate** = `(our_sent_count - meta_count) / our_sent_count`. >5% loss is a red flag (Meta is dropping events server-side, often due to malformed payload).

### 3.2 Endpoint B — Event Match Quality (EMQ)

```
GET https://graph.facebook.com/v19.0/{pixel_id}/event_quality?
  start_time={UNIX_SECONDS}&
  end_time={UNIX_SECONDS}&
  access_token={SYSTEM_USER_TOKEN}
```

Returns EMQ score 0-10 per event_name. Meta's documented thresholds:
- **8.0-10.0** = excellent (em + ph + fbp + first_name + last_name + city + ip + ua)
- **6.0-7.9** = good (em + ph + fbp + ip + ua)
- **<6.0** = poor — Meta may downweight or drop the event for optimization

Our payload sends `em + ph` only (hashed). Expected score: **mid-range 6.0-7.5**.

Add to alerts: if EMQ drops below 5.5 → critical. If drops below 6.0 → warning.

### 3.3 Endpoint C — Event Diagnostics (per-event drill-down)

```
GET https://graph.facebook.com/v19.0/{pixel_id}/events_diagnostics?
  start_time={UNIX_SECONDS}&
  end_time={UNIX_SECONDS}&
  access_token={SYSTEM_USER_TOKEN}
```

Returns per-event-name issues:
- `missing_field` (e.g. event_time, action_source)
- `invalid_field` (malformed)
- `dedup_status` (matched_browser / unmatched / partial)

**Dedup** is the most important metric for us. Hybrid dedup requires `event_id` to match exactly between the pixel event (sent from storefront browser) and the CAPI event (sent from EF). If `dedup_status` shows high `unmatched`, our event_id propagation between storefront pixel + ERP CAPI dispatch is broken.

### 3.4 Token rotation note

System User tokens are long-lived but Meta recommends rotation every 60 days. Build the alert system to surface tokens older than 50 days. (Out of scope for first SPEC iteration; document as future hardening.)

---

## 4. Proposed monitoring architecture

### 4.1 New table: `crm_capi_health_snapshots`

```sql
CREATE TABLE crm_capi_health_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  pixel_id        TEXT NOT NULL,
  window_start    TIMESTAMPTZ NOT NULL,
  window_end      TIMESTAMPTZ NOT NULL,
  meta_event_count    INTEGER NOT NULL DEFAULT 0,
  our_dispatch_count  INTEGER NOT NULL DEFAULT 0,
  delivery_loss_pct   NUMERIC(5,2),       -- (our - meta) / our × 100
  emq_score           NUMERIC(3,1),       -- 0.0 to 10.0
  dedup_matched_pct   NUMERIC(5,2),
  dedup_unmatched_pct NUMERIC(5,2),
  raw_response        JSONB,              -- full Meta API response for forensics
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_capi_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON crm_capi_health_snapshots
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

CREATE POLICY service_bypass ON crm_capi_health_snapshots
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_capi_health_tenant_fetched
  ON crm_capi_health_snapshots (tenant_id, fetched_at DESC);
```

Iron Rule 14 (tenant_id) + 15 (RLS, canonical pattern from `pending_sales`) + 18 (no UNIQUE without tenant scope) all satisfied.

### 4.2 New EF: `fb-capi-health-check`

```
/* Called by pg_cron every 6 hours (0 0,6,12,18 * * *) per tenant where
   storefront_config.analytics.fb_capi_token IS NOT NULL.

   1. Compute window = [now - 6 hours, now].
   2. For each tenant with token:
        a. GET /stats          → meta_event_count
        b. GET /event_quality  → emq_score
        c. GET /events_diagnostics → dedup pcts
        d. SELECT COUNT FROM crm_capi_dispatch_queue
             WHERE tenant_id = $1 AND status = 'sent'
             AND processed_at BETWEEN $window_start AND $window_end
           → our_dispatch_count
        e. delivery_loss_pct = (our - meta) / our × 100
        f. INSERT into crm_capi_health_snapshots.
        g. IF emq_score < 6.0 OR delivery_loss_pct > 5.0 OR dedup_unmatched_pct > 10.0
             → insert into docs/guardian/GUARDIAN_ALERTS.md (via existing alert pipeline). */
```

### 4.3 pg_cron schedule

Add to existing cron set:
```sql
SELECT cron.schedule(
  'fb_capi_health_check',
  '0 0,6,12,18 * * *',  -- every 6 hours
  $$ SELECT net.http_post(
       url := 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/fb-capi-health-check',
       headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <anon-jwt>'),
       body := '{"check_mode":"cron"}'::jsonb
     ); $$
);
```

Same pattern as the existing `fb_capi_dispatch_consumer` cron — reuse the auth approach.

### 4.4 Alerting

Hook into the existing `generate_daily_alerts(tenant_id)` function (called from cron job `daily-alert-generation`, 0 5 * * *). Add a sub-check:

```sql
-- pseudo: within generate_daily_alerts, after existing checks:
WITH last_24h AS (
  SELECT MAX(fetched_at) AS latest, MIN(emq_score) AS min_emq,
         MAX(delivery_loss_pct) AS max_loss, MAX(dedup_unmatched_pct) AS max_unmatched
  FROM crm_capi_health_snapshots
  WHERE tenant_id = $1
    AND fetched_at > NOW() - INTERVAL '24 hours'
)
SELECT
  CASE
    WHEN min_emq < 5.5      THEN 'CAPI EMQ critical: ' || min_emq
    WHEN min_emq < 6.0      THEN 'CAPI EMQ warning: ' || min_emq
    WHEN max_loss > 10      THEN 'CAPI delivery loss critical: ' || max_loss || '%'
    WHEN max_loss > 5       THEN 'CAPI delivery loss warning: ' || max_loss || '%'
    WHEN max_unmatched > 25 THEN 'CAPI dedup unmatched critical: ' || max_unmatched || '%'
    WHEN max_unmatched > 10 THEN 'CAPI dedup unmatched warning: ' || max_unmatched || '%'
  END AS alert_text
FROM last_24h
WHERE … (insert as critical/warning row in alerts table).
```

---

## 5. Threshold rationale

| Metric | Warning | Critical | Reasoning |
|---|---|---|---|
| EMQ score | <6.0 | <5.5 | Meta downweights events <6.0 for optimization; <5.5 risks delivery throttling. |
| Delivery loss | >5% | >10% | <5% is normal noise (network, browser blockers); >10% indicates schema or auth issue. |
| Dedup unmatched | >10% | >25% | Pixel-CAPI hybrid dedup requires event_id match; >25% means propagation broken. |
| Token age | >50 days | >58 days | Meta tokens have ~60d expiry; rotate before. |
| Queue stuck rows | >50 queued for >1h | >500 queued | Healthy queue should be near-empty between cron ticks. |

---

## 6. SPEC stub — `M4_FB_CAPI_POST_LAUNCH_MONITORING`

**Goal:** Establish post-launch CAPI health monitoring with cron-driven polling of Meta API + threshold-based alerting.

**Activation gate (mandatory):** before SPEC author starts, verify ALL of:
1. Prizma `storefront_config.analytics->>'fb_capi_token'` is non-empty.
2. At least 100 rows in `crm_capi_dispatch_queue` with `status='sent'` for prizma in the last 7 days.
3. Pixel events fire correctly from storefront (verified via Meta Events Manager Test Events).

If gate not met → SPEC blocks. Notify Daniel; don't author until live data is flowing.

**Scope (in):**
- Migration: `CREATE TABLE crm_capi_health_snapshots` (per §4.1).
- New EF: `supabase/functions/fb-capi-health-check/index.ts` — Meta API polling, snapshot writer.
- New pg_cron job: `fb_capi_health_check` (every 6 hours).
- Alert hook: extend `generate_daily_alerts(tenant_id)` (per §4.4).
- Dashboard tile: in Phase 2.5 funnel-health dashboard (M2 mission), replace "AWAITING ACTIVATION" placeholder with live snapshot data.

**Scope (out):**
- Token rotation UI (defer to future hardening SPEC).
- Per-event-name drilldown (defer; first version is global per tenant).
- Cost monitoring (Meta charges nothing for CAPI but tracks API call counts).

**Dependencies:**
- M3 (this mission) — knowledge map. ✅
- Activation gate (see above).
- Phase 2.5 dashboard (M2) — for surfacing snapshots in UI.

**Iron Rule compliance:**
- 14 (tenant_id NOT NULL): ✅ designed in §4.1.
- 15 (RLS canonical pattern): ✅ designed in §4.1.
- 18 (UNIQUE includes tenant_id): N/A (no UNIQUE constraint needed).
- 22 (defense in depth on writes): ✅ EF will set tenant_id explicitly on INSERT.
- 31 (integrity gate): ✅ standard.
- 32 (destructive ops): NONE — only INSERTs, no DROP/DELETE/ALTER.

**Risks:**
- Meta API rate limits — at 1 request per pixel per 6h × 1 tenant = 4 calls/day. Well under any limit.
- System User token compromise — token has `ads_management`; treat as production credential, store in Supabase Secrets only.
- Window-edge double-counting — adjacent snapshot windows might count the same `sent` row twice. Mitigation: use `fetched_at` deterministic window boundaries with exclusive end.

**Estimated effort:** 4-6 hours execution (migration + EF + cron + alert hook + smoke test on demo with mock token).

**Smoke test (post-activation):**
- Trigger `fb-capi-health-check` manually on demo with a token. Expect snapshot row inserted.
- Trigger with NULL token tenant → expect graceful skip (no row inserted, no error).
- Force a low EMQ by sending a single-field event → expect warning surfaced in next daily alert run.

---

## 7. Open questions for Daniel (do not block SPEC; SPEC author asks at kickoff)

1. Which Business Manager System User holds the token? Confirm permissions.
2. Want one snapshot per tenant or sub-snapshot per pixel (some tenants may have multiple pixels in the future)?
3. Alert delivery channel — same as existing daily-alert (Guardian Alerts file) or separate Telegram/email push?
4. Retention policy for `crm_capi_health_snapshots` — 90 days? 1 year? Forever?
5. Decision: continue using `storefront_config.analytics.fb_capi_token` or migrate to `tenants.fb_capi_token` (memory says the latter)? Single-source-of-truth choice.

---

## 8. Parking lot (out of scope for SPEC, future work)

- Use Meta's `Server-Side Events Verification` test endpoint to validate EF dispatch before pushing live (would catch payload schema breaks pre-prod).
- Build a "CAPI replay" admin tool that re-dispatches a date range from `crm_capi_dispatch_queue` (currently no replay if queue rows go stale).
- Cross-tenant comparison view for SaaS context — when tenant #2 onboards, compare EMQ trajectory.
- Webhook from Meta — Meta supports webhooks for some events; would eliminate polling. Lower priority because polling is simpler and 6h cadence is sufficient.

---

## 9. Reproducibility

Internal queries against `tsxrrxzmdxaenlvocyit` (SELECT only). Meta API surface described from public docs (no live calls made).

Measured 2026-05-15 23:55 IDT.

---

*End of M3. Companion: tomorrow's M4_FB_CAPI_POST_LAUNCH_MONITORING SPEC author — but only AFTER Daniel confirms activation gate per §6.*
