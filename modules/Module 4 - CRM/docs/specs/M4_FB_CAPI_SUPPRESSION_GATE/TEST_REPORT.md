# TEST_REPORT — M4_FB_CAPI_SUPPRESSION_GATE

## 1. Live 3-way smoke (the headline proof)

Setup: 3 demo leads sentinel `M4_CAPI_SMOKE_2026_05_22`:
- **A — Normal**: `status='waiting'`, fresh email/phone not in suppression.
- **B — Unsub**: `status='unsubscribed'`, fresh email/phone.
- **C — Suppressed-Contact**: `status='waiting'`, email = `daniel@prizma-optic.co.il` (existing demo suppression row).

3 queued rows in `crm_capi_dispatch_queue` (status='queued', event_name='Lead'). Invoked EF via `curl POST fb-capi-dispatch {dispatch_mode:'cron'}`.

EF response: `{"dispatched":3,"errors":0,"total_claimed":3}` STATUS:200.

Final queue state cross-checked via SQL:

```
queue_id  | lead              | lead_status   | queue_status        | error_message                                                          | called_meta
----------+-------------------+---------------+---------------------+------------------------------------------------------------------------+------------
333b0ef0  | A Normal          | waiting       | sent                | null                                                                   | TRUE
34bab17c  | B Unsub           | unsubscribed  | skipped_suppressed  | lead_unsubscribed: lead.unsubscribed_at OR status='unsubscribed'       | FALSE
cfa6ae54  | C Suppressed-Cont | waiting       | skipped_suppressed  | contact_suppressed: crm_suppressions match on email_norm or phone_norm | FALSE
```

**Verdict:** 🟢 all 3 cases behaved exactly as designed. Suppressed PII (cases B + C) did NOT reach Meta — proven by `meta_response IS NULL` on those queue rows.

## 2. SQL invariants

```
                                              pre        post
daniel_10k                                  10000      10000   ✓ unchanged
prizma_total_leads                           1343       1343   ✓ unchanged
crm_capi_dispatch_queue accepted statuses       6          7   ✓ added skipped_suppressed
smoke_residual                                  0          0   ✓ cleaned
```

## 3. EF log evidence
The EF prints `console.log('[fb-capi-gate] skip queue=<id> reason=<reason>')` for the 2 blocked cases. This is observable in Supabase EF logs for queue ids `34bab17c` (lead_unsubscribed) and `cfa6ae54` (contact_suppressed).

## 4. Verdict
🟢 **PASS.** All 3 acceptance bar requirements verified live:
1. Normal lead → dispatched cleanly (Meta call fired) ✓
2. Unsubscribed lead → skipped, no Meta call ✓
3. New lead with suppressed contact → skipped, no Meta call ✓

GDPR Art. 7(3) / Israeli Privacy Law: opt-out now blocks PII dispatch to Meta on the natural person basis, not just per-lead.

---
*End of test report.*
