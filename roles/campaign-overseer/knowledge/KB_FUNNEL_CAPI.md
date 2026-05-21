# KB — Funnel Measurement + FB CAPI

> **Synthesized snapshot, 2026-05-21.** Authority surface: `docs/FB_CAPI.md` (canonical CAPI reference), `roles/site-overseer/FUNNEL_ROADMAP.md` (cross-funnel state), `mv_funnel_health_dashboard` (live data), `funnel_weekly_briefs` (weekly synthesis).
> **Read when:** task is in `CAMPAIGN_KB_MAP.md` row "Analyze campaign performance" or "Plan campaign strategy" or "Post-campaign retrospective."

---

## 1. The real-vs-raw rule (single most important metric discipline)

**Source metrics from business-state columns, NEVER from click events.**

| Metric | Preferred source (business state) | Avoid (event log) |
|---|---|---|
| Unsubscribe rate | `crm_leads.unsubscribed_at IS NOT NULL` | `short_link_clicks` with target contains `/unsubscribe` (~95% bots) |
| Purchase rate | `crm_event_attendees.purchase_amount > 0` | `crm_message_log` clicks |
| Registration rate | `crm_event_attendees.status IN ('registered', 'confirmed', ...)` | inferred from click sequences |
| Funnel stage | `crm_leads.status` GROUP BY | guessed from touchpoint patterns |
| Channel deliverability | `crm_message_log.status='sent' / 'failed'` | webhook-level (out of band) |

**Why:** SMS-gateway preview bots fire ~95% of clicks within 6 minutes of send. Using click logs as a proxy for customer behavior measures BOT behavior, not customer behavior. This was caught live on 2026-05-20 (`M4_SHORT_LINKS_DASHBOARD_REDESIGN` F-BOT-NOISE amendment — raw CTR 36.2% → real-action rate 1.4%). Memory: `feedback_clicks_are_not_actions`.

If forced to use clicks (no business-state column exists), label the metric "raw" with a bot-decontamination caveat in the output.

## 2. FB CAPI — 4-event chain (full architecture)

Optic Up uses a **hybrid browser Pixel + server-side CAPI** strategy for Facebook event measurement. The hybrid dedupes via shared `event_id` UUID.

### 2.1 Event types fired (server-side CAPI)

| Event | When | Source | Phase shipped |
|---|---|---|---|
| `Lead` | At `crm_leads` INSERT (lead-intake EF) | storefront `/supersale/` form submit | 2026-05-15 P2.1 |
| `CompleteRegistration` | At `crm_event_attendees` INSERT (`register_lead_to_event` RPC) | form/operator registration | 2026-05-15 P2.1 |
| `EventAttended` | At `crm_event_attendees.status` change to `'attended'` | operator check-in | 2026-05-15 P2.1 |
| `Purchase` | At `crm_event_attendees.purchase_amount` set + `purchased_at` set | operator purchase-amount entry | 2026-05-19 `M4_CAPI_PURCHASE_EVENTS` |

All 4 events queue to `crm_capi_dispatch_queue` (status='queued'). The `fb-capi-dispatch` EF runs every 60s, claims up to 20 rows (FOR UPDATE SKIP LOCKED), hashes em + ph server-side, POSTs to `graph.facebook.com/v19.0/{pixel_id}/events`.

### 2.2 Dedup contract

Browser Pixel + server CAPI carry the same `fb_event_id` UUID. Meta dedupes via the shared `event_id` field — Lead counts once, not twice.

The storefront generates the UUID on `/supersale/` form submit (browser-side), passes to `lead-intake` EF (server stores in `crm_leads.fb_event_id`), and redirects to `/successfulsupersale/?fbe=<uuid>` where the browser Pixel fires with `eventID = <uuid>`.

### 2.3 Pixel back-wire (closes the measurement loop)

After `fbq` fires on the thank-you page, the storefront POSTs `{event_id, tenant_id}` to `pixel-fired` EF which stamps `crm_leads.fb_pixel_fired_at = NOW()`. Idempotent.

This lets the ERP distinguish:
- "CAPI dispatched" = `crm_capi_dispatch_queue.status='sent'`
- "Browser Pixel actually fired" = `fb_pixel_fired_at IS NOT NULL`

Without back-wire, ad-blocker / redirect-failure / tab-close events would be undetectable.

### 2.4 Token storage

`storefront_config.analytics->>'fb_capi_token'` (JSONB key alongside `facebook_pixel_id` and `pixel_events`). No `tenants.fb_capi_token` column. Per D-AUTH-1.

**Enable CAPI for a tenant:**
```sql
UPDATE storefront_config
SET analytics = analytics || '{"fb_capi_token": "<token>"}'
WHERE tenant_id = '<tenant_uuid>';
```

**Verify:**
```sql
SELECT analytics->>'fb_capi_token' AS capi_token, analytics->>'facebook_pixel_id' AS pixel_id
FROM storefront_config WHERE tenant_id = '<tenant_uuid>';
```

Demo runs `skipped_no_token` by design (no sandbox token configured). Prizma token confirmed present.

## 3. CAPI dispatch queue mechanics

### 3.1 Table: `crm_capi_dispatch_queue`

Key columns: `id`, `tenant_id`, `lead_id`, `event_id` (shared UUID), `event_name` (Lead / CompleteRegistration / EventAttended / Purchase), `event_payload` (jsonb, **hashed em+ph only — NO plaintext PII**), `status`, `retries`, `error_message`, `meta_response` (Meta API response), `created_at`, `scheduled_at`, `processed_at`.

Unique constraint: `(lead_id, tenant_id, event_name)` — prevents duplicate dispatch per lead per event-type per tenant.

RLS: canonical 2-policy (`service_bypass` + JWT-claim `tenant_isolation`).

### 3.2 Status enum

`queued` → `processing` → `sent` | `failed` | `skipped_no_token`. Retries column increments on `failed`. The `fb_capi_dispatch_consumer` cron picks rows with `status IN ('queued', 'failed') AND (status='queued' OR retries < 3) AND scheduled_at <= now()`.

### 3.3 Advanced matching (server-side hashing)

`em = sha256(lowercase(trim(email)))`, `ph = sha256(E.164-digits)`. No PII in queue, no PII in logs. Iron Rule 23.

## 4. Funnel Health Dashboard + Weekly Brief

| Surface | Source | Refresh |
|---|---|---|
| Funnel Health Dashboard | `mv_funnel_health_dashboard` (materialized view) | pg_cron `refresh_funnel_health_dashboard` every 5 min |
| Weekly Brief | `funnel_weekly_briefs` table | pg_cron `weekly_funnel_brief_generation` Sundays 03:00 — invokes `weekly-funnel-brief` EF |
| Short Links Stats | `short_links` + `short_link_clicks` + `crm_lead_touchpoints` | live SELECT (embed-JOIN to bypass PostgREST 1000-row cap on Prizma's ~8K short_links) |

### 4.1 What the dashboard tells you

Funnel Health Dashboard fields (per tenant):
- Lead count by source (UTM source breakdown)
- Lead-to-attendee conversion %
- Attendee-to-purchase conversion %
- Real unsubscribe rate (sourced from `crm_leads.unsubscribed_at` — NOT from click logs)
- Channel deliverability (sent / failed / rejected counts per channel)
- CAPI dispatch state (queued / sent / failed by event type)

### 4.2 What the Weekly Brief tells you

Auto-generated every Sunday 03:00. Per-tenant summary of:
- New leads this week vs last week
- Registrations this week vs last week
- Purchases this week vs last week
- Top-performing template (by real conversion, not clicks)
- Anomalies (rate-limit storms, failed-message bursts, CAPI dispatch failures)

## 5. PostgREST cardinality discipline (for any analysis query)

Per `docs/CONVENTIONS.md` §N and memory `feedback_probe_biggest_production_tenant`:

| Prizma table | Approx rows (2026-05-21) | Treatment |
|---|---|---|
| `crm_leads` | ~1,340 | safe for standalone fetch |
| `crm_event_attendees` | ~235 | safe |
| `crm_message_log` | ~6,000 | safe but approaching limit — embed-JOIN preferred |
| `short_links` | ~8,200 | **MUST use embed-JOIN or RPC** (PostgREST 1000-row silent cap) |
| `crm_message_queue` | ~4,700 | safe but pin estimate |
| `crm_capi_dispatch_queue` | ~30 | safe |

If cardinality > 1000 → embed-JOIN via FK (PostgREST embeds bypass the cap on the child side) OR server-side aggregate (RPC / MV). Standalone fetch silently truncates.

Pin cardinality estimates in every analysis doc §0 (Reality Check section).

## 6. CAPI dispatch state — diagnostic queries

```sql
-- Per-tenant CAPI queue distribution (run as Analyst on demand)
SELECT t.slug AS tenant, q.event_name, q.status, COUNT(*) AS n
FROM crm_capi_dispatch_queue q
JOIN tenants t ON t.id = q.tenant_id
GROUP BY t.slug, q.event_name, q.status
ORDER BY t.slug, q.event_name, q.status;

-- Per-tenant pixel-vs-CAPI dispatch state (closes the loop)
SELECT t.slug AS tenant,
       COUNT(*) FILTER (WHERE l.fb_event_id IS NOT NULL) AS leads_with_event_id,
       COUNT(*) FILTER (WHERE l.fb_pixel_fired_at IS NOT NULL) AS browser_pixel_fired,
       (SELECT COUNT(*) FROM crm_capi_dispatch_queue q WHERE q.tenant_id=t.id AND q.status='sent') AS capi_dispatched
FROM crm_leads l
JOIN tenants t ON t.id = l.tenant_id
WHERE l.created_at > now() - interval '30 days'
GROUP BY t.slug;
```

If `capi_dispatched` >> `browser_pixel_fired`: ad-blocker or redirect-failure rate on the storefront.
If `browser_pixel_fired` >> `capi_dispatched`: CAPI EF backed-up / missing token / Meta rejecting.

## 7. Replay procedure (if CAPI was wrong for a window)

Per `docs/FB_CAPI.md`:
1. Set scope: which `tenant_id` + date range needs replay.
2. UPDATE `crm_capi_dispatch_queue SET status='queued', retries=0, scheduled_at=now() WHERE tenant_id=X AND created_at BETWEEN ...` (with snapshot + Daniel approval — Iron Rule 32 declared op).
3. Next `fb_capi_dispatch_consumer` tick picks them up.
4. Meta will dedupe by `event_id` — even if the browser Pixel already fired with the same UUID, Meta counts each event once.

## 8. Anti-patterns — do not

- Do NOT compute conversion / unsubscribe / purchase rates from click logs when a business-state column exists.
- Do NOT skip the cardinality estimate for `short_links` or `crm_message_log` queries on Prizma (1000-row silent truncation).
- Do NOT include raw PII (phone/email) in analysis docs. Aggregate or hash.
- Do NOT propose CAPI replay without Iron Rule 32 declared ops + Daniel snapshot approval.
- Do NOT confuse "CAPI dispatched" with "browser Pixel fired" — they answer different questions (server-side vs client-side measurement).

---

*KB_FUNNEL_CAPI v1, 2026-05-21. Refresh trigger: every FB CAPI SPEC; every Funnel Health Dashboard schema change; every memory update on metric semantics (e.g., `feedback_clicks_are_not_actions`).*
