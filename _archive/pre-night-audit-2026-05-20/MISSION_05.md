# MISSION 05 — Pixel Infrastructure Pre-Flight (Dual-Pixel Architecture)

**Audit:** M4_PRE_NIGHT_COMPREHENSIVE_AUDIT  
**Date:** 2026-05-20  
**Auditor:** opticup-localhost-tester (read-only)

---

## 1. Current Single-Pixel Architecture

### Storage Location
Pixel config lives in `storefront_config.analytics` (JSONB column), NOT in `tenants.ui_config`.

**Prizma production config (storefront_config.analytics):**
```json
{
  "pixel_events": [
    {"event": "Lead", "label": "סופרסייל - טופס נשלח", "url_pattern": "/successfulsupersale/"},
    {"event": "Lead", "label": "SuperSale EN", "url_pattern": "/en/successfulsupersale/"},
    {"event": "Lead", "label": "SuperSale RU", "url_pattern": "/ru/successfulsupersale/"},
    {"event": "Lead", "label": "טופס כללי - נשלח", "url_pattern": "/successfulmulti/"}
  ],
  "fb_capi_token": "[PRESENT — redacted from audit doc]",
  "facebook_pixel_id": "304574492100180"
}
```

**Key observations:**
- Single `facebook_pixel_id` field (string, not array)
- Single `fb_capi_token` field (string, not array)
- `pixel_events` array defines which URL patterns trigger which FB events on the frontend
- Both pixel ID and CAPI token are co-located in same JSONB object

**Demo config:**
- `facebook_pixel_id`: null
- `fb_capi_token`: null
- No analytics config at all (demo row has analytics=null)

---

## 2. fb-capi-dispatch EF — Current Architecture

**File:** `supabase/functions/fb-capi-dispatch/index.ts` (confirmed read)

**Token fetch pattern:**
```typescript
// Step 3: Fetch CAPI token from storefront_config.analytics (D-AUTH-1)
const analytics = config?.analytics ?? {};
const capiToken = analytics["fb_capi_token"];

// Step 4: Fetch pixel ID from same analytics config
const pixelId = analytics["facebook_pixel_id"];
```

**Current behavior for missing pixel ID:** Returns `permanent_error` if pixelId is null/missing.

**Events dispatched:** Lead, CompleteRegistration, EventAttended, Purchase

**Currency:** Hardcoded `"ILS"` at line 177 (`purchaseCustomData = { value: Number(attendee.purchase_amount), currency: "ILS" }`) — this is M-NEW-41-1 EXTENSION in GUARDIAN_ALERTS.md.

**Batch processing:** BATCH_SIZE=20 per cron tick. `fb_capi_dispatch_consumer` pg_cron job runs every minute.

---

## 3. Dual-Pixel Architecture Analysis

### What "dual pixel" means in context
Adding a SECOND Facebook Pixel ID to the tenant config so that CAPI events are dispatched to TWO pixels simultaneously (e.g., the original `304574492100180` AND a new pixel ID for a new campaign or AdAccount separation).

### Schema changes required for dual-pixel

**Option A (minimal, backward-compatible):** Change `facebook_pixel_id` from a single string to an array of strings, or add a `facebook_pixel_ids` array alongside the existing `facebook_pixel_id`.

```sql
-- storefront_config.analytics JSONB would contain:
{
  "facebook_pixel_id": "304574492100180",   -- legacy (keep for backward compat)
  "facebook_pixel_ids": ["304574492100180", "NEW_PIXEL_ID"],  -- new
  "fb_capi_token": "...",                   -- still one token (tokens can span pixels)
  "fb_capi_tokens": {...}                   -- optional: per-pixel tokens if needed
}
```

**Option B (clean, breaking):** Replace `facebook_pixel_id` with `facebook_pixel_ids: []` and handle migration of existing Prizma row.

**Recommendation:** Option A (no migration risk, backward compatible). fb-capi-dispatch EF reads `facebook_pixel_ids` if present, falls back to `[facebook_pixel_id]` if only the old field exists.

### EF changes required for dual-pixel

```typescript
// Current:
const pixelId = analytics["facebook_pixel_id"];
// → Sends to 1 pixel

// New (dual-pixel):
const pixelIds = analytics["facebook_pixel_ids"] 
  || (analytics["facebook_pixel_id"] ? [analytics["facebook_pixel_id"]] : []);
// → For each pixelId in pixelIds, dispatch independently
```

**Complexity:** For each queued CAPI event, the EF would need to make N calls to Meta CAPI (one per pixel). Each call is independent — a failure on pixel 2 should not block pixel 1.

**Deduplication:** The `event_id` field in CAPI payload (from `crm_capi_dispatch_queue.event_id`) is the Meta dedup key. If the same event_id is sent to pixel 1 and pixel 2, Meta's dedup will prevent double-counting WITHIN each pixel. No cross-pixel dedup concern from Meta's side.

---

## 4. Storefront Frontend Pixel Firing

**Where storefront fires browser-side pixels:** `storefront_config.analytics.pixel_events` array — URL pattern matching on page load triggers `fbq('track', event_name)`.

**For dual-pixel from the browser:** The storefront's pixel initialization code (in `opticup-storefront`) must initialize `fbq` for BOTH pixel IDs:
```js
fbq('init', '304574492100180');
fbq('init', 'NEW_PIXEL_ID');
// Then fbq('track', ...) fires to both initialized pixels
```

**Assessment:** This change would be in the storefront repo (`opticup-storefront`), not in this repo. The storefront reads `storefront_config.analytics.facebook_pixel_id` to init fbq. For dual-pixel, it would need to read either a `facebook_pixel_ids` array or both the old and new field.

**Note:** Storefront repo was not accessible for read (path `C:\Users\User\opticup-storefront` not confirmed). This audit documents the knowledge-map based on the ERP-side references only.

---

## 5. Risk Assessment

| Risk | Severity | Notes |
|---|---|---|
| Schema change required | LOW | JSONB column — no migration needed for new keys |
| EF change required | MEDIUM | fb-capi-dispatch needs dual-loop per pixel_id |
| Storefront change required | MEDIUM | Browser pixel init needs to fire for both pixel IDs |
| Backward compatibility | LOW | Option A preserves existing single-pixel behavior |
| Meta rate limits | LOW | Two pixels = two independent quotas; not a problem |
| Token management | MEDIUM | If pixels have different accounts, each may need its own access token |
| ILS hardcoding | MEDIUM (existing) | Line 177 `currency: "ILS"` — pre-existing issue M-NEW-41-1; no new risk added by dual-pixel |

---

## 6. Ready for Morning Execution?

**🟡 PROCEED WITH PREPARATION**

- CAPI infrastructure (EF + DB schema) is well-designed and supports extension
- The dual-pixel change is an EF + storefront change — NOT a schema migration
- BEFORE authoring the SPEC: Daniel must confirm the new pixel_id value and whether it uses the SAME CAPI token as the existing pixel or a different one
- The storefront-side change requires coordination with opticup-storefront repo
- Recommend: morning SPEC authoring session with Daniel to confirm pixel ID + token architecture before the Executor runs

**NOT a blocker for the other night-run deliverables (Resend button, Skill Harvest)**

---

*Mission 05 complete.*
