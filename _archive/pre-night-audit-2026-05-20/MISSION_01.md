# MISSION 01 — Resend Button Pre-Flight

**Audit:** M4_PRE_NIGHT_COMPREHENSIVE_AUDIT  
**Date:** 2026-05-20  
**Auditor:** opticup-localhost-tester (read-only)

---

## 1. Schema Verification

### crm_message_log columns (16 total)
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | — |
| lead_id | uuid | NO | — |
| event_id | uuid | YES | — |
| template_id | uuid | YES | — |
| broadcast_id | uuid | YES | — |
| channel | text | NO | — |
| content | text | NO | — |
| status | text | NO | 'sent' |
| external_id | text | YES | — |
| error_message | text | YES | — |
| created_at | timestamptz | NO | now() |
| run_id | uuid | YES | — |
| acknowledged_at | timestamptz | YES | — |
| acknowledged_by | uuid | YES | — |
| acknowledged_reason | text | YES | — |

**Key findings:**
- `status`, `error_message` CONFIRMED present (PASS)
- Default status='sent' — resend must write 'queued' to crm_message_queue (not update this table status to 'queued')
- `acknowledged_at` / `acknowledged_by` / `acknowledged_reason` present — resend button must check for `acknowledged_at IS NULL` for unacknowledged failures only

### crm_message_queue columns (19 total)
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | — |
| run_id | uuid | YES | — |
| lead_id | uuid | NO | — |
| event_id | uuid | YES | — |
| channel | text | NO | — |
| template_slug | text | YES | — |
| body | text | YES | — |
| subject | text | YES | — |
| variables | jsonb | YES | — |
| language | text | NO | 'he' |
| status | text | NO | 'queued' |
| retries | integer | NO | 0 |
| scheduled_at | timestamptz | NO | now() |
| created_at | timestamptz | NO | now() |
| processed_at | timestamptz | YES | — |
| error_message | text | YES | — |
| log_id | uuid | YES | — |
| broadcast_id | uuid | YES | — |

**Key finding:** `template_slug` (not `template_id`) is the queue-side key. Resend must preserve original template_slug, lead_id, event_id, channel, broadcast_id, and variables.

---

## 2. Failure Taxonomy (Prizma Production)

### crm_message_log status distribution:
| Status | Error | Count |
|---|---|---|
| sent | (null) | 5,230 |
| **failed** | **unsubstituted_placeholder: registration_url** | **758** |
| failed | make_webhook_400: timeout exceeded when trying to connect | 4 |
| rejected | lead_unsubscribed | 4 |
| pending_review | (null) | 4 |

**Critical finding:**
- **762 total failed rows** on Prizma. The dominant failure class (99.5%) is `unsubstituted_placeholder: registration_url` — these occurred BEFORE `M4_TEMPLATE_VALIDATION_UNIFIED` (P2.3) closed on 2026-05-14. These are historical failures, not new.
- The 4 `make_webhook_400` rows are SMS provider webhook timeouts — transient, resendable
- **Resend button DOES need pagination** (762 > 50): should show filtered view + page through
- `crm_message_queue` shows all rows as `sent=4,642` — **no currently-failed queue rows**. Good: no in-flight stuck messages.

---

## 3. Existing Retry/Resend Mechanisms (Iron Rule 21 — no duplicates)

Three existing mechanisms found:

### Mechanism A: `crm-automation-history.js` (run-level retry)
- Location: `modules/crm/crm-automation-history.js:185-205`
- Trigger: "נסה שוב את הכושלים (N)" button per automation run
- Path: calls `retry-failed` Edge Function with `{ run_id, tenant_id }`
- Scope: **run-level** (re-queues all failed messages in a run)
- Does NOT update `crm_message_log.status` — creates new queue rows

### Mechanism B: `crm-leads-detail-messages.js` (per-lead message retry)
- Location: `modules/crm/crm-leads-detail-messages.js:109-153`
- Trigger: "🔄 נסה שוב" button on each failed row in lead detail modal
- Path: calls `CrmMessaging.sendMessage(...)` with original `template_slug`, `event_id`, `run_id`, language
- Scope: **per-message** on a specific lead; drops the failed row from in-memory array (audit row stays)
- Does NOT re-queue: calls `sendMessage` directly (creates new queue row via automation)

### Mechanism C: `crm-messaging-log.js` (log-level resend for `pending_review`)
- Location: `modules/crm/crm-messaging-log.js:117-178`
- Trigger: "שלח מחדש" button on `pending_review` rows only
- Path: opens `CrmSendDialog.openQuickSend()` prefilled with `channel + body`; on confirm writes `status='superseded'` to old log row
- Scope: **pending_review** only — NOT for `failed` rows

**Gap analysis for new "Resend Failed Messages" button:**
- No existing mechanism handles **failed rows in the messaging log tab** (global view, not per-lead, not per-run)
- Mechanism B covers failed messages in the LEAD DETAIL view but not the MESSAGING LOG tab
- The new button must: (a) insert new `crm_message_queue` row with original parameters, (b) NOT change `crm_message_log.status` (preserve audit trail), OR optionally (c) acknowledge the old row + create new queue row

---

## 4. RLS Policy Verification

Both tables use the **canonical two-policy pattern** per Iron Rule 15:
- `service_bypass` — PERMISSIVE, service_role, ALL
- `tenant_isolation` — PERMISSIVE, public, ALL, using JWT-claim tenant_id

**CONFIRMED CORRECT** — matches CLAUDE.md §5 canonical pattern.

**Authorization implication for resend button:** The ERP JS client uses the tenant JWT, so the `tenant_isolation` policy via JWT-claim tenant_id is the active path. The operator clicking "Resend" must be authenticated with the correct tenant JWT — which is normal CRM usage.

---

## 5. Indexes

### crm_message_log indexes (5):
- `crm_message_log_pkey` (id)
- `idx_crm_message_log_ack` (tenant_id, acknowledged_at)
- `idx_crm_message_log_tenant_broadcast_created` (tenant_id, broadcast_id, created_at) PARTIAL WHERE broadcast_id IS NOT NULL
- `idx_crm_message_log_tenant_created` (tenant_id, created_at DESC)
- `idx_message_log_run` (run_id) PARTIAL WHERE run_id IS NOT NULL

**Gap:** No index on `(tenant_id, status)`. A resend button will need `WHERE tenant_id=X AND status='failed' AND acknowledged_at IS NULL`. Currently would use `idx_crm_message_log_tenant_created` which doesn't filter by status → full tenant scan then filter. **At 762 failed rows out of 6,000 total rows this is acceptable today but will require a `(tenant_id, status, created_at)` index as volume grows.**

### crm_message_queue indexes (4):
- `crm_message_queue_pkey` (id)
- `idx_crm_message_queue_tenant_broadcast_created` (tenant_id, broadcast_id, created_at) WHERE broadcast_id IS NOT NULL
- `idx_queue_run` (run_id) WHERE run_id IS NOT NULL
- `idx_queue_tenant_status_scheduled` (tenant_id, status, scheduled_at) WHERE status IN ('queued','processing') — PARTIAL
- `uq_crm_message_queue_idem` — unique idempotency key (0 scans — never yet used for idempotency enforcement)

**DB trigger on crm_message_queue:** `trg_promote_lead_on_message_sent` (AFTER UPDATE → calls `promote_lead_on_message_sent()`). Resend will trigger this trigger when the re-queued row transitions to 'sent'. **This is expected and correct behavior** — successfully sending a previously-failed message should promote the lead.

---

## 6. Status-Update Patterns (who writes to queue/log)

Places that update `crm_message_queue.status`:
1. `dispatch-queue` EF — updates 'queued'→'processing' (claim) and 'processing'→'sent'/'failed'/'rate_limited'
2. `crm-messaging-log.js:171` — writes `'superseded'` to `crm_message_log` (not queue) for `pending_review` rows
3. SMS hotfix SQL (2026-05-20) — bulk UPDATE 'failed'→'queued' via Supabase MCP (manual, documented)

**The resend button must follow pattern (3)'s shape** — a targeted UPDATE of specific queue row(s) from 'failed' back to 'queued', OR an INSERT of a new queue row.

---

## 7. Risk-Graded Recommendation

| Aspect | Verdict |
|---|---|
| Schema ready | PASS — all expected columns present |
| Existing mechanism to reuse | PARTIAL — Mechanism B (per-lead) covers 1 path; resend from log view needs new UI |
| Failed row count needs paging | YES — 762 Prizma rows; needs pagination (current PAGE_SIZE=50 in crm-messaging-log.js) |
| RLS safe | PASS — canonical pattern |
| Missing index (medium-term) | FLAG — add (tenant_id, status, created_at) index in follow-up |
| DB trigger side-effect | KNOWN — `promote_lead_on_message_sent` will fire on re-send; this is correct behavior |
| Recommended implementation path | New EF `resend-failed` (mirrors `retry-failed` shape) OR direct JS INSERT into crm_message_queue |

**Overall: 🟢 READY for night-run implementation.** Schema supports the feature; existing mechanisms can be reused/extended; no blockers.

---

*Mission 01 complete.*
