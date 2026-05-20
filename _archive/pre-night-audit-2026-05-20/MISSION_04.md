# MISSION 04 — Cross-Module Ripple Analysis

**Audit:** M4_PRE_NIGHT_COMPREHENSIVE_AUDIT  
**Date:** 2026-05-20  
**Auditor:** opticup-localhost-tester (read-only)

---

## 1. Complete Messaging Path Trace

```
Operator clicks "Resend" in CRM
     ↓
[Browser JS] INSERT into crm_message_queue
    - tenant_id, lead_id, event_id, channel, template_slug, body, 
      variables, language, broadcast_id (from original log row)
    - status='queued', retries=0, scheduled_at=now()
     ↓
[pg_cron: 'dispatch_queue'] every 15 seconds
    - Calls dispatch-queue EF at /functions/v1/dispatch-queue
    - Body: {} (no parameters)
     ↓
[dispatch-queue EF]
    - batchSize=15 (hotfixed 2026-05-20 from 60)
    - Claims rows: UPDATE status='processing' WHERE status='queued' FOR UPDATE SKIP LOCKED
    - Calls send-message EF for each row (1-second sleep between)
    - Handles allowlist check (test_mode_sms_allowlist) — Layer 2
     ↓
[send-message EF]
    - Resolves template variables
    - Validates template output (M4_TEMPLATE_VALIDATION_UNIFIED P2.3)
    - Dispatches to SMS provider (Make webhook → Green API)
    - Writes crm_message_log row
    - Updates crm_message_queue.status='sent' or 'failed'
     ↓
[DB trigger: trg_promote_lead_on_message_sent]
    - AFTER UPDATE on crm_message_queue
    - Calls promote_lead_on_message_sent() function
    - Fires when status changes to 'sent'
    - May update crm_leads.status if auto_promote_lead_status rule configured
```

---

## 2. Tables Touched by the Resend Flow

| Table | Operation | Actor | Notes |
|---|---|---|---|
| crm_message_queue | INSERT (new row) | Browser JS (or new EF) | resend action |
| crm_message_queue | UPDATE status | dispatch-queue EF | 'queued'→'processing'→'sent'/'failed' |
| crm_message_log | INSERT | send-message EF | new log entry per resend attempt |
| crm_leads | UPDATE (conditional) | promote_lead_on_message_sent() trigger | only if auto_promote_lead_status configured |
| crm_automation_runs | UPDATE (reaper path) | dispatch-queue EF | marks abandoned runs as 'aborted' (unrelated to resend but in same tick) |
| crm_capi_dispatch_queue | INSERT | fb-capi-dispatch triggers | if message send triggers CAPI event |

**Secondary touches NOT directly caused by resend but active in same cron tick:**
- `crm_automation_runs`: stale-run reaper in dispatch-queue EF updates abandoned runs
- `crm_status_change_events`: if promote_lead triggers a lead status change, SCE producer fires

---

## 3. pg_cron Job Schedule

| Job | Schedule | Purpose |
|---|---|---|
| `dispatch_queue` | every 15 seconds | Drains crm_message_queue |
| `consume_status_change_events` | every 15 seconds | Automation-engine consumer |
| `fb_capi_dispatch_consumer` | every 1 minute | CAPI dispatch |
| `event_day_status_flip` | daily 05:30 | Sets event_day status |
| `event_2_3d_before_status_flip` | daily 05:30 | Sets 2_3d_before status |
| `refresh_funnel_health_dashboard` | every 5 minutes | Refreshes MV |
| `weekly_funnel_brief_generation` | Sundays 03:00 | Generates weekly brief |

**Cron interaction risk for resend:** `dispatch_queue` and `consume_status_change_events` both run every 15 seconds. If a resend triggers a lead status change (via promote_lead_on_message_sent), the SCE will be consumed within ~15-30 seconds and could trigger additional automation rules. This is **expected and correct behavior** — not a risk, but operators should be aware that resending a message may trigger downstream automations.

---

## 4. Activity Log / Audit Trail

**Concern:** Does the resend action create an audit trail?  
**Finding:** The existing mechanisms (Mechanism A via `retry-failed` EF, Mechanism B via `sendMessage`) do NOT explicitly write to `crm_audit_log` for the resend action. The new `crm_message_log` row created by send-message EF IS the implicit audit trail — it shows the resend attempt (new row with new timestamp).  
**Recommendation:** The night-run SPEC for the resend button should explicitly write to `crm_audit_log` with action_type='message_resend' or similar. The `acknowledged_at`/`acknowledged_by` pattern on the original failed row could also be used to mark "this failure was addressed" — separate from the actual resend.

---

## 5. Sentinel Monitoring Analysis — Double-Count Risk

### Current Sentinel missions that count failures:
- **Mission 6 (DB Health)** monitors `crm_message_log` and `crm_message_queue` sizes
- **L-NEW-28-1** (GUARDIAN_ALERTS.md): `crm_message_log` retention watch (14 MB, ~370MB/year projected)
- **L-NEW-34-4**: Single SMS failure row at 06:47 UTC 2026-05-15 under watch

### Double-count risk analysis:

**Scenario:** Message originally fails → enters `crm_message_log` with status='failed'. Operator resends → new row in `crm_message_queue` → new row in `crm_message_log` (second attempt).

**Risk 1 — FAIL count inflation:** Any monitoring that counts `crm_message_log` rows WHERE status='failed' will count the ORIGINAL failed row even after a successful resend. The original row stays failed (audit trail). Sentinel Mission monitoring raw fail counts will see the original failures permanently. **This is NOT a double-count problem — it accurately reflects that the original send failed. The resend produces a new 'sent' row.**

**Risk 2 — Alert threshold:** If Sentinel monitors `crm_message_log WHERE status='failed' AND created_at > 'X hours ago'` it would correctly NOT count old historical failures. **Recommended:** Any resend-related monitoring should filter by created_at to avoid historical noise.

**Risk 3 — The 758 `unsubstituted_placeholder: registration_url` rows:** These are historical pre-P2.3 failures. Resending them would likely FAIL AGAIN if `%registration_url%` is still unresolvable for those specific leads/events. **IMPORTANT: Do NOT bulk-resend the 758 unsubstituted_placeholder rows without first verifying the underlying template/event context is resolvable.** The resend button should show the error reason so operators can make informed decisions.

**Risk 4 — `uq_crm_message_queue_idem` unique constraint:** The idempotency index on (tenant_id, run_id, lead_id, template_slug, channel) WHERE status IN ('queued','processing','sent') has 0 scans — never used. **But it WOULD prevent re-queuing the exact same message for the same run if an in-flight version already exists.** For resend of a historical failed message from a completed run, `run_id` and `template_slug` would be the same — this could conflict. The night-run SPEC must handle this: either clear the old idem key (use INSERT with ON CONFLICT DO UPDATE) or set run_id=NULL for re-queued rows (the constraint WHERE clause excludes status='failed', so a new 'queued' row WOULD be blocked if the old row was 'sent' with the same run_id+lead_id+template_slug+channel).

---

## 6. Dependency Graph

```
crm_message_log (read)
    ↓ (operator sees failed row)
crm_message_queue (INSERT new row)
    ↓ (dispatch-queue cron claims it)
dispatch-queue EF (batches 15 rows)
    ↓ (calls)
send-message EF
    ├─→ crm_message_log (writes result row)
    ├─→ crm_message_queue (updates status)
    └─→ trg_promote_lead_on_message_sent (DB trigger)
              ↓ (if lead promoted)
         crm_leads (UPDATE status)
              ↓ (if status changed)
         crm_status_change_events (INSERT via trigger)
              ↓ (within 15s)
         automation-engine EF (consume_status_change_events)
              ↓ (if rule matches)
         crm_message_queue (INSERT additional messages)
```

---

## 7. Sentinel Rule Recommendations

1. **Add annotation to Sentinel Mission 6:** "Failure counts in crm_message_log are cumulative (soft audit trail). Historical failures from pre-P2.3 deployment (~758 rows) are permanent. Use created_at filter when computing recent failure rates."
2. **Alert threshold for resend:** Monitor `crm_message_log WHERE status='failed' AND acknowledged_at IS NULL AND created_at > now() - INTERVAL '7 days'` as the actionable failure surface — not total failed rows.
3. **Idempotency key interaction:** The `uq_crm_message_queue_idem` index needs design clarification before the resend button is built. The night-run SPEC must explicitly decide whether re-queued rows use NULL run_id (no idem key) or preserve the original run_id.

---

## 8. No Secondary Module Writes Found

Cross-module safety check:
- **Module 1 (Inventory):** No touches from messaging path
- **Module 2 (Platform Admin):** No touches
- **Module 3 (Storefront):** No touches from messaging path
- **Module 1.5 (Shared):** shared.js utilities used by CRM JS but no writes

---

*Mission 04 complete.*
