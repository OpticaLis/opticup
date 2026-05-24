# M4 Scale Readiness Master Plan — Path to 10K Leads

**Author:** Architect (opticup-architect, Tier-2 strategic)
**Date:** 2026-05-24
**Trigger:** 1,137-lead broadcast caused live screen timeouts. Daniel plans 10K leads within months.
**Scope:** Cross-cutting M4 infrastructure. Decomposes into 5 sequenced SPECs for the Foreman/Executor pipeline.

---

## Current State (measured live 2026-05-24)

| Metric | Value | 10K projection | Breaking point |
|---|---|---|---|
| crm_message_queue rows | 20,637 (23 MB) | 120K+ after a few campaigns | Screen timeouts on aggregate queries |
| Queue status distribution | 54% cancelled (never cleaned), 45% sent (90d retention), 1% other | Cancelled rows grow unbounded | Table bloat, index inefficiency |
| crm_message_log rows | 11,238 (37 MB) | 60K+ | Aggregate screens slow |
| Dispatch throughput | ~15 msg/tick, 1-min cron | 20K msgs = 6-22 hrs | Operator babysitting required |
| Vendor daily caps | Unknown/unenforced | Silent failures at volume | Partial sends, no operator visibility |
| Email deliverability | No warm-up, no dedicated IP | Spam-flagging at 10K | Campaign failure |
| List quality | 13 placeholder failures / 7 bad leads (Wave 1) | Scales linearly | Wasted throughput + deliverability harm |
| Migration-git drift | 1 live index not in migrations | N/A | Reproducibility risk |

---

## SPEC Sequence (priority order)

### SPEC 1: M4_QUEUE_LIFECYCLE_ARCHIVE (PRE-10K BLOCKING)

**Problem:** The 90-day cleanup only deletes `sent` rows. 11,226 `cancelled` rows (54% of the table) accumulate forever. After several campaigns at 10K scale, the table grows to hundreds of thousands of rows and screens time out on any non-indexed query path.

**Scope:**
1. Expand the daily cleanup cron to archive ALL terminal rows (`sent`, `failed`, `cancelled`, `rejected`) older than N days (configurable per-tenant, default 7 days for operational view) into a new `crm_message_queue_archive` table (same schema + tenant_id + RLS).
2. The archive table is the source for historical reports; the hot table stays small (only `queued`/`processing` + last-7-days terminal).
3. Capture today's live-hotfix index (`idx_crm_message_queue_tenant_created`) in a git migration — close the migration-drift gap.
4. Add `idx_crm_message_queue_archive_tenant_created` on the archive table.

**Success criteria:**
- Hot queue stays under 5,000 rows after a 10K campaign (within 24h of completion).
- Archive table queryable for historical stats via date-range filter.
- Zero migration-git drift for queue indexes.
- Configurable retention window per tenant (Iron Rule 19).

**Timing:** Must land BEFORE first 5K+ campaign. Estimated effort: 1-2 sessions.

---

### SPEC 2: M4_DISPATCH_THROUGHPUT_SCALING (PRE-10K BLOCKING)

**Problem:** At 15 msg/tick × 1-min cron, a 20K-message campaign takes 6-22 hours of continuous sending. No vendor daily cap enforcement — a large blast can hit Green API / email provider limits and silently fail.

**Scope:**
1. Make dispatch batch size configurable per-tenant in a `crm_dispatch_config` table (Iron Rule 19): `batch_size` (default 15, tunable to 50-100), `sms_throttle_ms` (default 1000), `email_throttle_ms` (default 500).
2. Add vendor-aware daily caps: `sms_daily_cap`, `email_daily_cap` per tenant. Dispatch-queue checks the running daily total before dequeuing; if cap reached, skip until tomorrow (status → `deferred_cap`). Surface the cap state in the operator dashboard.
3. Implement exponential back-off on vendor HTTP 429/5xx at the batch level (not just per-message): if a batch gets rate-limited, wait 2^N minutes before retrying the next batch.
4. Auto-spread: if the estimated send time exceeds a configurable threshold (e.g. 2 hours), chunk the blast into waves with configurable inter-wave delays. Log the chunking plan. A 10K blast self-distributes across 3-4 hours without human intervention.

**Success criteria:**
- 10K × 2-channel campaign completes in ≤4 hours (vs. current 6-22h).
- Vendor cap hit → operator sees a clear "מכסה יומית הושגה" status, not a silent fail.
- No 4-cron-tick overlap (advisory lock discipline maintained).
- Configurable per-tenant (Iron Rule 19).

**Timing:** Must land BEFORE first 5K+ campaign. Estimated effort: 2-3 sessions.

---

### SPEC 3: M4_SCREEN_QUERY_AUDIT (PRE-10K BLOCKING, lower effort)

**Problem:** Today's incident proved that screen queries hit Seq Scans on growing tables. The hotfix index solved one query; others will break at scale.

**Scope:**
1. Audit every M4 screen query (queue tab, short-links stats, dashboard, activity log, broadcasts table, campaign metrics) by running `EXPLAIN ANALYZE` against current data. Document each query's plan.
2. For any Seq Scan on tables expected to exceed 50K rows: add a covering index (tenant_id + relevant filter columns).
3. For aggregate/stats screens: add scheduled materialized views (refreshed every 5 minutes via pg_cron) so the screen reads from pre-computed data, not from full-table scans.
4. Capture all new indexes in git migrations.

**Success criteria:**
- Zero Seq Scan on any M4 screen query with tables at 50K+ rows.
- Aggregate stats screens render in < 500ms at 100K-row tables.
- All indexes in git migrations (zero drift).

**Timing:** Should land before 10K but can trail SPECs 1-2 slightly. Estimated effort: 1 session.

---

### SPEC 4: M4_EMAIL_VENDOR_EVALUATION (CAN WAIT — trigger: first 5K email campaign)

**Problem:** Sending 10K emails from one domain in a short window = spam-flagging. No SPF/DKIM/DMARC strategy, no warm-up, no dedicated IP.

**Scope:**
1. Evaluate SES vs. SendGrid vs. current path. Decision criteria: deliverability guarantees, warm-up tooling, cost at 10K-50K emails/month, SPF/DKIM/DMARC setup effort, integration with existing dispatch EF.
2. If a vendor migration is warranted: write a sub-SPEC for the integration, warm-up schedule, and DNS changes.
3. If current path is sufficient with configuration: document the warm-up plan (gradual volume increase over 2-4 weeks).

**Success criteria:**
- Decision documented: stay or migrate.
- If migrate: sub-SPEC authored with warm-up schedule.
- If stay: warm-up plan documented + SPF/DKIM/DMARC verified.

**Timing:** Can wait until email volume is consistently 3K+/campaign. Not pre-10K-blocking if SMS is the primary channel. Estimated effort: 1 session (evaluation) + 2-3 sessions (migration if needed).

---

### SPEC 5: M4_LIST_HYGIENE_SUSPICIOUS_LEADS (CAN WAIT — pairs well with SPEC 1)

**Problem:** 13 `unsubstituted_placeholder` failures across 7 leads in Wave 1. Fictitious/dead leads waste throughput and harm deliverability. No mechanism to surface them.

**Scope:**
1. Create a `crm_lead_health` materialized view (or scheduled query) that flags leads by:
   - Repeated message failures (≥ 3 failures in last 30 days).
   - Missing critical fields (no email when email templates are in use, no phone for SMS).
   - Zero engagement (no click, no open) across last N campaigns.
2. Surface flagged leads in a "Leads — לבדיקה" tab in the CRM UI (read-only list, operator decides keep/delete/fix).
3. Optionally: auto-suppress flagged leads from new broadcasts until reviewed (configurable per-tenant flag).

**Success criteria:**
- Operator can see a list of "suspicious" leads and act on them.
- Suppression from broadcasts is opt-in (not auto-delete, per Daniel's direction on lead ownership).
- Multi-tenant (tenant_id + RLS on health view/table).

**Timing:** Nice-to-have; value increases with lead count. Can be built alongside SPEC 1 (shares the archive query infrastructure). Estimated effort: 1-2 sessions.

---

### SPEC 6: M4_WHATSAPP_CHANNEL (URGENT — Daniel directive 2026-05-24)

**Problem:** Daniel needs to send WhatsApp messages to customers. M4 dispatch pipeline is hardcoded to SMS + email. Green API is already used via Make for QR/catalog flows, but not for CRM campaign dispatch.

**Key insight (from code audit):** The dispatch architecture is webhook-based — `send-message EF → Make webhook → Make routes by channel → vendor`. The Make payload already includes `{ channel, recipient_phone, body }`. Adding WhatsApp is primarily a **validation/schema lift**, not a re-architecture. The heaviest work is Make-side (ops, not code).

**Scope:**
1. send-message EF: expand channel validation to accept `'whatsapp'`. Add recipient phone check (same as SMS). Add WhatsApp test-mode allowlist (same pattern as SMS/email allowlists in `tenants.ui_config`).
2. dispatch-queue EF: wire WhatsApp throttling via `crm_dispatch_config` table (added by SPEC 2 — if SPEC 6 lands first, create the config row directly).
3. crm_message_templates: allow `channel='whatsapp'` in schema. Create WhatsApp templates for existing automation flows (body format: plain text, similar to SMS).
4. Make scenario (9104395): Daniel/ops add a WhatsApp route calling Green API sendMessage. This is a Make-side config change — not ERP code.
5. Short links: activate `W`-prefix convention for WhatsApp links (already reserved).
6. Consent: for v1, same gate as SMS (phone + not unsubscribed). Formal WhatsApp opt-in flow is a separate future SPEC.

**Not in scope:** WhatsApp Business API migration (Green API via Make is fastest; migrate later if volume justifies). Bidirectional WhatsApp conversations. Rich media templates.

**Success criteria:**
- A WhatsApp template can be created in the CRM template editor with `channel='whatsapp'`.
- A broadcast or automation can dispatch WhatsApp messages through the same pipeline as SMS/email.
- Test-mode allowlist gates WhatsApp on demo (same as SMS/email).
- Make scenario receives `channel='whatsapp'` and routes to Green API.
- Short links with `W` prefix resolve and increment `click_count`.

**Timing:** URGENT per Daniel. Can run in parallel with SPEC 3 (screen audit) — no dependency on SPECs 1-2. Make-side config is ops work, not blocked by ERP pipeline. Estimated effort: 1-2 sessions (ERP-side) + ops Make config.

---

## Sequencing + Timeline Recommendation (updated 2026-05-24)

```
Now ─────────────────── First 5K campaign ──────── 10K+ campaigns
  │                           │                        │
  ├─ SPEC 1 (queue lifecycle) │                        │
  ├─ SPEC 2 (throughput)      │                        │
  ├─ SPEC 3 (screen queries)  │                        │
  ├─ SPEC 6 (WhatsApp) ═══╗  │                        │
  │   (parallel w/ SPEC 3) ╚══╝                        │
  │                           ├─ SPEC 4 (email vendor) │
  │                           ├─ SPEC 5 (list hygiene) │
```

**Pre-10K-blocking (must land first):** SPECs 1, 2, 3 — in that order. SPEC 1 is the highest-leverage fix (table lifecycle); SPEC 2 is the usability fix (operator doesn't babysit); SPEC 3 is the safety net (no screen breaks).

**Urgent (Daniel directive):** SPEC 6 (WhatsApp) — can run in parallel with SPEC 3. No dependency on SPECs 1-2 (WhatsApp uses the same queue/dispatch path that already works for SMS/email). SPEC 2's `crm_dispatch_config` should include WhatsApp columns from day one.

**Can wait:** SPECs 4, 5 — triggered by volume milestones, not calendar dates.

**Questions for Daniel (blocking SPEC 6):**
1. Does the Make scenario (9104395) already have a WhatsApp route, or does one need to be added?
2. Is the Green API account configured for outbound marketing messages (not just inbound QR/catalog)?
3. Consent: OK to send WhatsApp to all leads with a phone number (same as SMS), or require explicit WhatsApp opt-in first?

**Question for Daniel (blocking SPECs 1-3):** When is the first campaign likely to hit 5K+ leads? That date minus 2 weeks is the deadline for SPECs 1-3.

---

## Challenged priority from the brief

The brief's priority order (1-queue, 2-throughput, 3-screens, 4-email, 5-hygiene) is correct. No challenge. The only refinement:

- **SPEC 3 (screen queries) is lower effort than SPECs 1-2** and could be parallelized with SPEC 2 by a second executor session. However, it depends on SPEC 1 (the archive table changes the query patterns), so it should follow SPEC 1.
- **SPEC 5 (list hygiene) pairs well with SPEC 1** — the archive infrastructure makes the "repeated failure" query cheap. Consider bundling them or sequencing 5 right after 1.

---

## Key finding: cancelled rows are the real bloat

The existing 90-day cleanup only targets `sent` rows. **54% of the hot table (11,226 rows) is `cancelled` status — never cleaned.** This is the highest-leverage fix: expanding cleanup to all terminal statuses will cut the hot table by >50% immediately and prevent the unbounded growth that breaks screens at scale.

---

## Migration-git-drift register

| Index/Object | Applied | In git migration? | Action |
|---|---|---|---|
| `idx_crm_message_queue_tenant_created` | 2026-05-24 via MCP | NO | Capture in SPEC 1 migration |
| `crm_message_queue_cleanup` cron job | Live | Via SPEC migration | Expand in SPEC 1 |
