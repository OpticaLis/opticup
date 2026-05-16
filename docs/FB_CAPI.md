# Facebook Conversions API (CAPI) — Optic Up Reference

> **Canonical reference for:** ERP-side CAPI substrate, event_id deduplication contract,
> advanced matching spec, queue mechanics, replay procedure, troubleshooting.
>
> **SPEC origin:** `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/`
> **Shipped:** 2026-05-15, Phase 2 P2.1 of `roles/site-overseer/FUNNEL_ROADMAP.md`.
> **Module ownership:** Module 4 — CRM.
> **Authority matrix:** this file is the single source of truth for CAPI architecture in Optic Up.

---

## 1. Architecture Overview

Optic Up uses a **hybrid browser Pixel + server-side CAPI** strategy for Facebook Lead-event measurement.

```
Storefront (opticup-storefront)              ERP / Supabase (this repo)
────────────────────────────────             ────────────────────────────────────────
User fills /supersale/ form
   │
   ├─ Generate UUID v4 (fb_event_id)  ──────► POST /functions/v1/lead-intake
   │                                            └─ INSERT crm_leads (fb_event_id = UUID)
   │                                            └─ INSERT crm_capi_dispatch_queue (queued)
   │
   └─ Redirect → /successfulsupersale/?fbe=<uuid>
        │
        ├─ Browser pixel fires Lead event  ─► Facebook (browser-side, cookie match)
        │   with eventID = UUID
        │
        └─ POST /functions/v1/pixel-fired  ─────► UPDATE crm_leads
            {event_id, tenant_id}                 SET fb_pixel_fired_at = NOW()
            keepalive: true, fire-and-forget      (idempotent — D4)

                                         pg_cron tick (every 60s)
                                            └─ fb-capi-dispatch EF
                                                 └─ Hash em + ph server-side
                                                 └─ POST graph.facebook.com/v19.0/{pixel_id}/events
                                                      with event_id = UUID  ← CAPI-side Lead
```

**Deduplication:** both the browser pixel and the CAPI call carry the same `fb_event_id` UUID. Meta deduplicates via the shared `event_id` field — Lead is counted once, not twice.

**Pixel-fire detection (back-wire):** after `fbq` fires on the thank-you page, the storefront also POSTs `{event_id, tenant_id}` to the `pixel-fired` Edge Function which stamps `crm_leads.fb_pixel_fired_at = NOW()`. This closes the measurement loop — the ERP can now distinguish "CAPI dispatched" (`crm_capi_dispatch_queue.status='sent'`) from "browser Pixel actually fired" (`fb_pixel_fired_at IS NOT NULL`). Without this, ad-blocker / redirect-failure / tab-close events would be undetectable. Shipped 2026-05-16 via `M3_FUNNEL_PIXEL_BACKWIRE`.

---

## 2. Token Storage (D-AUTH-1)

CAPI token is stored per-tenant in:

```
storefront_config.analytics->>'fb_capi_token'
```

This is a JSONB key alongside `facebook_pixel_id` and `pixel_events`. There is **no** `tenants.fb_capi_token` column and **no** new secrets table — per D-AUTH-1 (token storage at SPEC author time).

**To enable CAPI for a tenant:**

```sql
UPDATE storefront_config
SET analytics = analytics || '{"fb_capi_token": "<your_token_here>"}'
WHERE tenant_id = '<tenant_uuid>';
```

**To verify:**

```sql
SELECT analytics->>'fb_capi_token' AS capi_token,
       analytics->>'facebook_pixel_id' AS pixel_id
FROM storefront_config
WHERE tenant_id = '<tenant_uuid>';
```

---

## 3. Queue Mechanics

### Table: `crm_capi_dispatch_queue`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `tenant_id` | uuid NOT NULL FK(tenants) | Iron Rule 14 |
| `lead_id` | uuid NOT NULL FK(crm_leads) | Pointer to the lead |
| `event_id` | uuid NULL | Shared FB event_id (NULL until storefront SPEC) |
| `event_name` | text NOT NULL DEFAULT 'Lead' | Always 'Lead' for v1 |
| `event_payload` | jsonb NULL | Hashed em+ph only — NO plaintext PII |
| `status` | text NOT NULL DEFAULT 'queued' | See status enum below |
| `retries` | int NOT NULL DEFAULT 0 | Incremented on 'failed' transitions |
| `error_message` | text NULL | Human-readable error from dispatch |
| `meta_response` | jsonb NULL | Full Meta API response body |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `scheduled_at` | timestamptz NOT NULL DEFAULT now() | Retry rescheduling point |
| `processed_at` | timestamptz NULL | When the EF last processed this row |

**Unique constraint:** `(lead_id, tenant_id)` — prevents duplicate dispatch rows per lead per tenant.

**RLS:** 2-policy canonical pattern — `service_bypass` (service_role) + `tenant_isolation` (JWT-claim, public). Byte-identical to `crm_message_queue`.

### Status Enum

| Status | Meaning | Next state |
|---|---|---|
| `queued` | Freshly enqueued, waiting for cron tick | → `sent` / `skipped_no_token` / `no_match` / `failed` |
| `sent` | Successfully dispatched to Meta API | Terminal |
| `failed` | Transient error (network / Meta 5xx); retries < 3 | → `queued` (next cron tick) / `permanent_error` |
| `skipped_no_token` | No `fb_capi_token` in `storefront_config.analytics` | Terminal (expected for demo/unconfigured tenants) |
| `no_match` | Lead has neither email nor phone | Terminal |
| `permanent_error` | Non-retryable error (Meta 4xx / lead not found) | Terminal |

### Consumer (pg_cron)

- **Job name:** `fb_capi_dispatch_consumer`
- **Schedule:** `* * * * *` (every minute)
- **Batch:** claims up to 20 rows WHERE `status IN ('queued','failed') AND retries < 3 AND scheduled_at <= now()` ordered by `scheduled_at`

---

## 4. Edge Function: `fb-capi-dispatch`

- **Slug:** `fb-capi-dispatch`
- **verify_jwt:** false (Origin-allowlisted; pg_cron calls with anon key internally)
- **Entry point:** `supabase/functions/fb-capi-dispatch/index.ts`

### Dispatch Protocol

1. Receives `{ "dispatch_mode": "cron" }` from pg_cron.
2. Claims batch from `crm_capi_dispatch_queue` (see §3).
3. For each row:
   a. Fetches `crm_leads` → gets `email` and `phone` (re-read at dispatch time for freshness, per D-AUTH-8).
   b. Reads `storefront_config.analytics.fb_capi_token` and `facebook_pixel_id` for the row's `tenant_id`.
   c. No token → writes `status='skipped_no_token'` and stops.
   d. No email AND no phone → writes `status='no_match'` and stops.
   e. Hashes server-side:
      - `em` = `sha256(lowercase(trim(email)))` hex digest
      - `ph` = `sha256(E.164(phone) stripped of leading '+')` hex digest
      (Any missing field is omitted — union not intersection per D-AUTH-7)
   f. Posts to `graph.facebook.com/v19.0/{pixel_id}/events`.
   g. Meta 2xx + no error object → `status='sent'`.
   h. Meta 4xx → `status='permanent_error'` (not retried).
   i. Network / Meta 5xx → `status='failed'`, `retries++` (retried up to 3 times).
4. Returns `{ dispatched, errors, total_claimed }`.

### Advanced Matching (D-AUTH-7)

| Field | Source | Normalization |
|---|---|---|
| `em` (email) | `crm_leads.email` | `sha256(lowercase(trim(email)))` |
| `ph` (phone) | `crm_leads.phone` | Strip non-digits, prefix `+972` for 0xx local, then `sha256(E.164_digits_no_plus)` |
| `_fbp` / `_fbc` | Browser cookies | NOT forwarded in v1 (server-side EF has no cookie access) — deferred to storefront SPEC |

**PII policy (D-AUTH-8):** Plaintext email and phone are read at dispatch time, hashed in-memory, and discarded. The `event_payload` JSONB column on the queue row stores only the already-hashed values (`em`, `ph`) — never plaintext. No PII lands in `meta_response` either (Meta echoes back only event_id + events_received count on success).

---

## 5. New Columns on `crm_leads`

| Column | Type | Purpose |
|---|---|---|
| `fb_event_id` | uuid NULL | Shared FB event_id for browser-CAPI dedup. Populated by `lead-intake` EF from optional body field `fb_event_id`. NULL until storefront SPEC ships. |
| `fb_pixel_fired_at` | timestamptz NULL | When the storefront thank-you-page pixel fired. Populated by the `pixel-fired` Edge Function (M3_FUNNEL_PIXEL_BACKWIRE, 2026-05-16) — the storefront thank-you-page POSTs after `fbq` fires. NULL for historical rows + leads where the browser Pixel never fired (ad-blocker, redirect failure, tab-close before page load). Used by P2.2 pixel-validation-gap dashboard. |

---

## 6. `lead-intake` EF Changes (v26)

`lead-intake` (as of v26 deployed 2026-05-15) accepts an optional `fb_event_id` body field:

```json
{
  "tenant_slug": "demo",
  "name": "...",
  "email": "...",
  "phone": "...",
  "source": "supersale",
  "fb_event_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

- Field is optional — callers that omit it continue to work (backward-compat).
- Non-UUID values are silently nulled (null-tolerant).
- On fresh INSERT: `fb_event_id` is written to `crm_leads.fb_event_id` and a `crm_capi_dispatch_queue` row is enqueued via `EdgeRuntime.waitUntil` (non-blocking — 201 response unaffected).
- Duplicate / race branches: `fb_event_id` is NOT applied (existing lead, no new queue row).

---

## 7. Storefront Handoff — IMPLEMENTED (D-AUTH-2)

**SPEC:** `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF` (closed 2026-05-15) + `M3_FUNNEL_PIXEL_BACKWIRE` (closed 2026-05-16) in `opticalis/opticup-storefront`.

What ships:
1. On supersale form submit (via `src/lib/shortcodes/lead-form-validation.ts::buildScript()`): generate `crypto.randomUUID()` and include in the `lead-intake` POST body as `fb_event_id`.
2. Redirect to `/successfulsupersale/?fbe=<uuid>` carries the UUID forward via URL param.
3. On thank-you-page (any locale — pixel-firing is unified in `src/lib/analytics.ts::getPixelEventsScript()`): browser pixel fires `Lead` with `{eventID: uuid}` (4th arg to `fbq`); Meta dedups against the CAPI event with matching `event_id`.
4. **Back-wire (2026-05-16):** the same inline JS that fires `fbq` ALSO POSTs `{event_id, tenant_id}` to `/functions/v1/pixel-fired` with `keepalive: true` (fire-and-forget). The EF stamps `crm_leads.fb_pixel_fired_at = NOW()`.

**Activation for Prizma:** Daniel populates `tenants.fb_capi_token` for Prizma's row in Supabase (one-time Meta Business Manager workflow). Once populated, `fb-capi-dispatch` EF moves from `skipped_no_token` to `sent`. Demo intentionally has no token and stays at `skipped_no_token` (D-AUTH-3).

---

## 8. Replay Procedure

If rows are stuck in `failed` (retries < 3) after a transient error:

```sql
-- Check stuck rows
SELECT id, lead_id, status, retries, error_message, processed_at
FROM crm_capi_dispatch_queue
WHERE status = 'failed' AND retries < 3
ORDER BY processed_at DESC LIMIT 20;

-- Reset for retry (update scheduled_at to now)
UPDATE crm_capi_dispatch_queue
SET scheduled_at = now(), status = 'failed'
WHERE id = '<queue_row_id>' AND tenant_id = '<tenant_id>';
-- The consumer will claim it on the next cron tick.
```

If a row is stuck in `permanent_error` but you believe it should be retried:

```sql
-- Reset to queued (operator override)
UPDATE crm_capi_dispatch_queue
SET status = 'queued', retries = 0, error_message = NULL,
    scheduled_at = now(), processed_at = NULL
WHERE id = '<queue_row_id>' AND tenant_id = '<tenant_id>';
```

---

## 9. Troubleshooting

### "Why is everything `skipped_no_token`?"

No `fb_capi_token` key in `storefront_config.analytics` for the tenant. Expected behavior for demo (per D-AUTH-3) and for Prizma until Daniel populates the token. See §2 to configure.

### "Why is there a `no_match` row?"

The lead has no email AND no phone that survives E.164 normalization. Check the lead row's `email` and `phone` columns. Meta requires at least one matchable parameter.

### "Why does the cron job show `0 rows` in `cron.job_run_details`?"

Either the queue is empty (normal) or the consumer's `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 20` returned no eligible rows (all are in terminal states or `scheduled_at > now()`).

### "The cron job failed with URL NULL error"

The pg_cron SQL body was using `vault.decrypted_secrets` which wasn't populated. Fixed in migration `m4_fb_capi_dispatch_consumer_fix` to use hardcoded URL + anon key, matching the project's existing cron pattern.

### "I see rows stuck in `queued` for >2 minutes"

1. Check `cron.job_run_details` for `fb_capi_dispatch_consumer` — is it failing?
2. Check `cron.job WHERE jobname='fb_capi_dispatch_consumer'` — is `active=true`?
3. Check the `fb-capi-dispatch` EF logs in Supabase Dashboard.

---

## 10. Make Scenario 8542928 (Retired)

Make scenario `שליחת רכישות לפייסבוק` (ID 8542928) was previously an INACTIVE placeholder for CAPI send logic. Retired at SPEC close (2026-05-15). CAPI dispatch is now handled entirely by the `fb-capi-dispatch` Edge Function + `crm_capi_dispatch_queue` substrate.

Rationale (Brief D1): Messaging Architecture v2 says Make = pipe only, zero DB access. CAPI requires enriching each event with `crm_leads` data (email/phone hashing), which must be an Edge Function.

---

## 11. Future Work

| Item | Status |
|---|---|
| `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF` — storefront UUID gen + hidden field + thank-you pixel eventID | ✅ CLOSED 2026-05-15 |
| `M3_FUNNEL_PIXEL_BACKWIRE` — pixel-fired EF + storefront POST after `fbq` fires | ✅ CLOSED 2026-05-16 |
| `M4_FB_CAPI_PURCHASE_EVENTS` — Purchase events via CAPI after ≥200 dispatched Lead events validated | Queued in OPEN_TASKS |
| `M4_PIXEL_VALIDATION_GAP_DASHBOARD` (P2.2b) — query `crm_capi_dispatch_queue.status` counts joined with `crm_leads.fb_pixel_fired_at` | UNBLOCKED — substrate live as of 2026-05-16 |
| Cookie forwarding (`_fbp`, `_fbc`) — requires storefront capture + body field passthrough | Future SPEC |

---

*End of docs/FB_CAPI.md — M4_FB_CAPI_HYBRID_DEDUPLICATION canonical reference.*
