# SPEC — M4_FB_CAPI_SUPPRESSION_GATE

> **Authored:** 2026-05-22. Closes the FB CAPI GDPR hole flagged in `M4_SUPPRESSION_LIST` FINDINGS F-02.

## Goal
Apply the suppression-list gate to `fb-capi-dispatch` so a suppressed/unsubscribed contact's hashed PII can never reach Meta. GDPR Art. 7(3) / Israeli Privacy Law compliance for the Meta dispatch path.

## Acceptance bar
- `fb-capi-dispatch` EF refuses to call Meta when the lead is unsubscribed (Layer 1) OR the contact is in `crm_suppressions` (Layer 2).
- Skipped queue rows tagged `skipped_suppressed` with reason `lead_unsubscribed` or `contact_suppressed`.
- 3 live smoke tests pass on demo (normal lead, unsubscribed lead, suppressed contact).
- 0 fetches to `META_CAPI_URL` for the two suppressed cases (verified via EF log).
- Iron Rule 31 exit 0.

## Files modified
| File | Change |
|---|---|
| `supabase/functions/fb-capi-dispatch/index.ts` | Step 1 select extended with `unsubscribed_at, status`; new Step 2.5 gate (Layer 1 + Layer 2) inserted before Step 3 token check. |
| `supabase/migrations/20260522080000_m4_capi_queue_skipped_suppressed_status.sql` | ALTER CHECK constraint on `crm_capi_dispatch_queue.status` to accept new value `skipped_suppressed`. |

## Destructive Operations
1. EF redeploy: `fb-capi-dispatch` (additive logic; no schema removal).
2. DDL: DROP + ADD CHECK constraint on `crm_capi_dispatch_queue.status` (destructive but additive — same value set + 1 new). No data change. Demo + Prizma share schema; this is a schema migration that applies to both, but no row data is touched.
3. DML on demo only: 3 sentinel queue rows for the 3 smoke tests + cleanup.
4. NO Prizma data writes. Prizma READ-ONLY beyond the schema migration.
5. NO touch on Daniel's `M4_DANIEL_MANUAL_TEST_2026_05_21` 10K leads.

## Verification (demo-first, synthetic)
1. Enqueue FB CAPI event for a NORMAL demo lead → dispatch fires OR returns `skipped_no_token` (demo has no `fb_capi_token`; both outcomes prove the gate let it through). Confirms Layer 1+2 don't false-positive.
2. Enqueue FB CAPI event for an unsubscribed demo lead → queue row `skipped_suppressed` / `lead_unsubscribed`. Confirms Layer 1.
3. Enqueue FB CAPI event for a new lead with email matching `crm_suppressions` → queue row `skipped_suppressed` / `contact_suppressed`. Confirms Layer 2.
4. EF logs show `[fb-capi-gate] skip queue=... reason=...` and ZERO `fetch(META_CAPI_URL)` for the suppressed cases.

---
*End of SPEC.*
