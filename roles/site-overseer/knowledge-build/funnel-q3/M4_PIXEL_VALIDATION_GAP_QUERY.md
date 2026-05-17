# M4 — Pixel Validation Gap Dashboard Query

> **Mission:** Author the dashboard query that detects "CAPI dispatched but pixel never fired" gaps.
> Test it on demo (read-only). Sketch the ERP UI hook for tomorrow's build.
>
> **Read-only knowledge build.** Generated 2026-05-15 night.
> Tested live against `tsxrrxzmdxaenlvocyit`.

---

## 1. TL;DR

- **The query is ready** (§3). Tested SELECT-only against both tenants:
  - **prizma**: 0/1,245 leads have `fb_event_id` populated (substrate not flowing — see M3).
  - **demo**: 1/2 with `fb_event_id` shows the pixel gap (1 lead aged >1h with no `fb_pixel_fired_at`). Query works correctly.
- **Critical caveat:** `fb_pixel_fired_at` requires a **back-wire from storefront pixel-fire → ERP that may not be deployed yet**. Per M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF closure (SC #12 DEFERRED), the column is populated only if/when the storefront calls a `/pixel-fired` endpoint after the Pixel fires on the thank-you page. If that endpoint doesn't exist, this query will ALWAYS report 100% gaps — false positives.
- **Pre-build action:** verify the back-wire exists OR ship the dashboard with a clear "back-wire unverified" caveat banner.
- **UI hook:** add a tile to the M2 dashboard (`crm-funnel-dashboard.js`) or as a standalone page in `crm-messaging-performance.js` extension. Single number + drill-down list.

---

## 2. Query — final form

```sql
-- Pixel Validation Gap query (per Brief §3 Mission 4)
-- Returns leads where:
--   CAPI was dispatched (fb_event_id IS NOT NULL)
--   AND lead is >1 hour old (giving pixel ample time to fire)
--   AND pixel never fired (fb_pixel_fired_at IS NULL)
SELECT
  l.id,
  l.full_name,
  l.phone,
  l.email,
  l.source,
  l.fb_event_id::text,
  l.created_at,
  EXTRACT(EPOCH FROM (NOW() - l.created_at))/3600 AS hours_since_intake,
  q.status AS capi_status,
  q.processed_at AS capi_processed_at
FROM crm_leads l
LEFT JOIN crm_capi_dispatch_queue q
  ON q.lead_id = l.id AND q.tenant_id = l.tenant_id
WHERE l.tenant_id = $1                            -- bind tenant
  AND l.is_deleted = false
  AND l.fb_event_id IS NOT NULL                   -- CAPI was scheduled
  AND l.fb_pixel_fired_at IS NULL                 -- but pixel record missing
  AND l.created_at < NOW() - INTERVAL '1 hour'    -- lead aged enough
ORDER BY l.created_at DESC
LIMIT 100;
```

### 2.1 Aggregate counter (for dashboard tile)

```sql
SELECT
  COUNT(*) FILTER (WHERE l.fb_event_id IS NOT NULL AND l.fb_pixel_fired_at IS NULL AND l.created_at < NOW() - INTERVAL '1 hour') AS gap_count,
  COUNT(*) FILTER (WHERE l.fb_event_id IS NOT NULL AND l.created_at < NOW() - INTERVAL '1 hour') AS total_capi_aged,
  ROUND(100.0 *
    COUNT(*) FILTER (WHERE l.fb_event_id IS NOT NULL AND l.fb_pixel_fired_at IS NULL AND l.created_at < NOW() - INTERVAL '1 hour')
    / NULLIF(COUNT(*) FILTER (WHERE l.fb_event_id IS NOT NULL AND l.created_at < NOW() - INTERVAL '1 hour'), 0)
  , 1) AS gap_pct
FROM crm_leads l
WHERE l.tenant_id = $1
  AND l.is_deleted = false;
```

### 2.2 7-day trend (for sparkline)

```sql
SELECT
  date_trunc('day', l.created_at)::date AS day,
  COUNT(*) FILTER (WHERE l.fb_event_id IS NOT NULL) AS capi_dispatched,
  COUNT(*) FILTER (WHERE l.fb_event_id IS NOT NULL AND l.fb_pixel_fired_at IS NULL AND l.created_at < NOW() - INTERVAL '1 hour') AS gaps,
  ROUND(100.0 *
    COUNT(*) FILTER (WHERE l.fb_event_id IS NOT NULL AND l.fb_pixel_fired_at IS NULL AND l.created_at < NOW() - INTERVAL '1 hour')
    / NULLIF(COUNT(*) FILTER (WHERE l.fb_event_id IS NOT NULL AND l.created_at < NOW() - INTERVAL '1 hour'), 0)
  , 1) AS gap_pct
FROM crm_leads l
WHERE l.tenant_id = $1
  AND l.is_deleted = false
  AND l.created_at > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1 DESC;
```

---

## 3. Live test results

Executed 2026-05-15 23:55 IDT against `tsxrrxzmdxaenlvocyit`.

| Tenant | Total leads | with fb_event_id | with pixel_fired_at | gap (aged >1h) | gap_pct |
|---|---:|---:|---:|---:|---:|
| prizma | 1,245 | 0 | 0 | 0 | n/a |
| demo   | 3     | 2 | 0 | 1 | 50.0% |

**Interpretation:**
- **prizma**: 0 substrate activity — confirms M3 finding. Query will be inactive until prizma's CAPI dispatch flows.
- **demo**: substrate flowing, but `fb_pixel_fired_at` never set on the 2 rows that have `fb_event_id`. This matches the M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF EXECUTION_REPORT.md's SC #12 DEFERRED finding — the pixel-fire back-wire may not exist as a deployed mechanism.

---

## 4. Critical caveat — the back-wire problem

### 4.1 What populates `fb_pixel_fired_at`?

Per `modules/Module 4 - CRM/docs/db-schema.sql:420`:
> `fb_pixel_fired_at: when the storefront thank-you-page pixel fires.`

Per `docs/FB_CAPI.md:193`:
> "Optionally: POST back to a Supabase endpoint to populate `crm_leads.fb_pixel_fired_at`."

**Key word: "Optionally".** The column was added to the schema in anticipation of a back-wire. Whether the back-wire was actually implemented in storefront code is **NOT confirmed** by reading the schema alone.

### 4.2 What did M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF actually deploy?

That SPEC (closed 2026-05-15) handed off the `event_id` from storefront → ERP via `lead-intake` EF (sets `crm_leads.fb_event_id`). It did NOT implement a back-wire from `pixel-fired-on-thank-you-page` → `UPDATE crm_leads SET fb_pixel_fired_at`.

The REVIEW.md explicitly notes:
> "SC #12 `fb_pixel_fired_at = NULL` confirmed via re-query. This SC is explicitly noted as observational/optional in SPEC §3 SC #12 (depends on a back-wire from storefront pixel firing → ERP that may not exist)."

### 4.3 Implications for the dashboard

If the back-wire does not exist:
- Every dashboard call will show 100% gap (every CAPI-dispatched lead older than 1 hour will lack `fb_pixel_fired_at`).
- That's a useless dashboard — every alert is a false positive.

**Two options for the Phase 2.5 build:**

**Option A (recommended for v1):** Ship the dashboard with a clear banner:
> "ℹ Pixel-fire tracking requires a storefront back-wire that may not be deployed. If gap_pct = 100% consistently, the back-wire is missing — see M3_FUNNEL_PIXEL_BACKWIRE SPEC."

**Option B (better long-term):** Author a tiny SPEC `M3_FUNNEL_PIXEL_BACKWIRE` first that implements the back-wire (storefront calls `POST /functions/v1/pixel-fired` with the event_id; EF UPDATEs `crm_leads.fb_pixel_fired_at = NOW()`). Then ship this dashboard.

§6 below contains the back-wire SPEC stub.

---

## 5. UI sketch — ERP

### 5.1 Tile placement

Embed in the Phase 2.5 Funnel Health Dashboard (M2 mission) as Tile #7 (replacing the AWAITING ACTIVATION placeholder):

```
┌──────────────────────────────────────┐
│  Pixel / CAPI Gap                    │
│                                      │
│         12  (3.4%)                   │
│  leads without pixel fire            │
│                                      │
│  [sparkline: 7-day trend]            │
│                                      │
│  ⚠ back-wire unverified              │
│  [view affected leads →]             │
└──────────────────────────────────────┘
```

### 5.2 Drill-down view

Click "view affected leads" → renders a table backed by the §2 detail query:

| Lead | Phone | Source | Created | Hours ago | CAPI status |
|---|---|---|---|---:|---|
| דנה כהן | 0501234567 | facebook | 2026-05-14 10:23 | 28.3 | sent |
| יוסי לוי | 0509876543 | ig_story | 2026-05-14 08:11 | 30.5 | sent |
| ... |

### 5.3 Implementation file pointers

- New JS module: `modules/crm/crm-pixel-gap-tile.js` (~80 lines).
- Lives in the same screen as `crm-messaging-performance.js`.
- Reuses existing `escapeHtml`, `formatDate`, `fetchAll` helpers from `shared/`.
- Hebrew labels; RTL.
- No new dependencies.

---

## 6. Optional SPEC stub — `M3_FUNNEL_PIXEL_BACKWIRE`

> Only needed if §4 Option B is chosen. Otherwise skip and ship dashboard with caveat banner.

**Goal:** Wire the storefront thank-you-page Pixel fire back to ERP so `crm_leads.fb_pixel_fired_at` becomes accurate.

**Mechanism:**
1. After the storefront Pixel fires `fbq('track','Lead',{eventID:<event_id>})`, the page also POSTs to a new Supabase EF: `pixel-fired` with body `{event_id, tenant_id}`.
2. EF authenticates origin (storefront only — same ALLOWED_ORIGINS list as fb-capi-dispatch).
3. EF UPDATEs `crm_leads SET fb_pixel_fired_at = NOW() WHERE fb_event_id = $1 AND tenant_id = $2 AND fb_pixel_fired_at IS NULL`.
4. Idempotent — second call for the same event_id is a no-op.

**Scope (in):**
- New EF: `supabase/functions/pixel-fired/index.ts` (~80 lines).
- Storefront change: `opticup-storefront` repo, thank-you-page template adds the POST call after Pixel fires.

**Scope (out):**
- Pixel-firing logic itself (already in storefront).
- The dashboard tile (separate SPEC, this mission's deliverable).

**Iron Rule compliance:**
- 14 + 15: only UPDATEs `crm_leads`, table already has tenant_id + RLS.
- 22: `.update().eq('tenant_id', tenantId)` defense in depth.
- 23 (secrets): EF uses service_role key from env; no secrets in code.
- 32: NONE destructive ops. Only UPDATE on a single column.

**Estimated effort:** 1-2 hours (EF + storefront snippet + smoke test).

**Smoke test:**
- Demo storefront thank-you page: fire pixel manually. Verify `crm_leads.fb_pixel_fired_at` is set within 5s.
- Verify idempotency: second POST does not change the timestamp.

---

## 7. Indexes — do we have what's needed?

Query at §2 filters on `(tenant_id, is_deleted, fb_event_id, fb_pixel_fired_at, created_at)`. Existing indexes on `crm_leads`:

- `crm_leads_pkey (id)` — not useful here.
- `crm_leads_tenant_phone_active_uniq (tenant_id, phone) WHERE is_deleted=false` — partial covers tenant+is_deleted but not the rest.
- `idx_crm_leads_utm_campaign_id (tenant_id, utm_campaign_id) WHERE utm_campaign_id IS NOT NULL` — irrelevant.

**Recommendation:** add `idx_crm_leads_capi_gap_partial (tenant_id, fb_event_id, fb_pixel_fired_at, created_at) WHERE fb_event_id IS NOT NULL AND is_deleted=false` — partial index covering the exact filter. Cheap on prizma today (0 rows match), grows linearly with CAPI activity.

```sql
CREATE INDEX CONCURRENTLY idx_crm_leads_capi_gap_partial
  ON crm_leads (tenant_id, fb_event_id, fb_pixel_fired_at, created_at)
  WHERE fb_event_id IS NOT NULL AND is_deleted = false;
```

Add as part of the dashboard SPEC migration. Not pressing today (table is 1,325 rows total) but worth shipping with the build so it never becomes a hotspot later.

---

## 8. Reproducibility

All queries SELECT-only. Bind `$1` to tenant UUID. Run against `tsxrrxzmdxaenlvocyit`.

Tested 2026-05-15 23:58 IDT.

---

*End of M4. Companion: Phase 2.5 dashboard SPEC author wires §2 + §3 queries + §5 UI sketch. Optionally, `M3_FUNNEL_PIXEL_BACKWIRE` SPEC first if §4 Option B is chosen.*
