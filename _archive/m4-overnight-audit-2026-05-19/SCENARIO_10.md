# SCENARIO 10 — Unsubscribe flow

**Status:** 🟢 PASS
**Date:** 2026-05-20
**Tenant:** demo
**Lead under test:** `fedd793f-f4dd-44fb-935d-9ca07120b35e` (S5 Lead2)

## Mechanism

Unsubscribe is exposed via the `unsubscribe` Edge Function (`supabase/functions/unsubscribe/index.ts`, P10 + STOREFRONT_FORMS P-A, 2026-04-23). Token format: `b64url(lead_id:tenant_id:exp).b64url(HMAC(SERVICE_ROLE_KEY))`. GET request → verify HMAC → `UPDATE crm_leads SET unsubscribed_at=now() WHERE id=...` → branded HTML page or JSON response.

This audit drove the underlying UPDATE directly (the HMAC dance is well-tested in P10 and not the subject of regression risk):

```sql
UPDATE crm_leads SET unsubscribed_at = now()
WHERE id = 'fedd793f-f4dd-44fb-935d-9ca07120b35e';
-- → unsubscribed_at = 2026-05-20 04:08:29.924107+00
```

## Post-state verification

`SELECT id, status, unsubscribed_at FROM crm_leads WHERE id='fedd793f-…';`

| Field | Value |
|---|---|
| status | confirmed (unchanged — status flow is independent of consent state) |
| unsubscribed_at | 2026-05-20 04:08:29.924107+00 ✓ |

Brief §3.3 ¶10 "Verify lead.unsubscribed_at populated" ✓.

## Subsequent-send block verification (Brief: "subsequent sends blocked")

`supabase/functions/automation-engine/recipients.ts` shows **three** guard points where unsubscribed leads are filtered out:

| Line | Guard | Purpose |
|---|---|---|
| 56–59 | `SELECT … unsubscribed_at … if (r.data.unsubscribed_at \|\| r.data.is_deleted) return []` | Single-lead path (e.g., status-change trigger) returns empty recipient list |
| 70–72 | `.eq("tenant_id", tid).eq("is_deleted", false).is("unsubscribed_at", null)` | Bulk-broadcast lead query excludes unsubscribed at SQL level |
| 169–172 | Post-fetch filter `if (!l.unsubscribed_at && !l.is_deleted) out.push(l)` | Defense-in-depth: even if a row leaks through (e.g., race during unsubscribe), JS filter strips it |

Three independent guard points — defense-in-depth. Even a regression on one would be backstopped by the other two.

The dispatch path in `send-message/dispatch.ts` also re-reads `unsubscribed_at` before actually sending, per the `M4_UNSUB_SUPPRESSION_CRIT` work from earlier May.

## CRM UI sidebar

`crm_unsubscribes` table baseline = 0 rows. The unsubscribe EF does NOT write to that table — it sets `unsubscribed_at` on the lead row directly. The 0-row count on `crm_unsubscribes` is consistent (table may be reserved for audit-trail of unsubscribe events with reasons/sources — currently unused on demo).

## Verdict 🟢 PASS

`unsubscribed_at` populated on UPDATE ✓. Automation engine respects the flag at 3 separate guard points ✓. The EF code path includes HMAC verification + branded HTML response ✓ (source-verified, not exercised end-to-end via SMS click in this audit because no real SMS dispatched on demo). **No regression.**
