# HISTORY_DOCUMENTATION_AUDIT — P32

> Daniel's specific ask: enumerate WHAT the audit trail captures per scenario, and identify GAPS for an operator debugging a customer complaint without a developer. Documentation-only — no schema changes.

---

## What the 3 audit tables capture today

### `crm_message_log` (per-dispatch row)

Columns observed in P32:

| Column | Always populated? | What it tells the operator |
|---|---|---|
| `id` | yes | UUID primary key — used to link to other tables |
| `tenant_id` | yes | Which tenant the dispatch belongs to |
| `lead_id` | yes (when dispatch carries one) | Which CRM lead is the recipient (FK to `crm_leads`) |
| `event_id` | optional | Which event the dispatch is bound to (FK to `crm_events`) |
| `template_id` | populated on `sent`; **NULL** when EF rejected before template lookup (e.g., `template_not_found`) | Which template was used (FK to `crm_message_templates`) |
| `broadcast_id` | optional | If part of a broadcast wizard run |
| `channel` | yes | `sms` or `email` |
| `content` | populated on `sent`; **empty string** on EF early-failures | The fully-substituted message body that was sent (or attempted) |
| `status` | yes | `sent`, `failed`, `rejected`, `pending`, `pending_review`, `superseded`, `delivered`, `read` |
| `external_id` | **always NULL** today | Reserved for vendor message-id; **NEVER populated** because the EF marks `sent` after Make webhook ACK with no vendor callback (P28-003) |
| `error_message` | populated when status=failed/rejected | Raw English error code (e.g., `template_not_found:<slug>`, `phone_not_allowed:<phone>`, `make_webhook_502:<body slice>`) |
| `created_at` | yes | When the row was inserted |
| `run_id` | populated for rule-driven dispatches; NULL for direct sends | FK to `crm_automation_runs` — links message to the rule-evaluation run |

### `activity_log` (per-action row)

Columns:

| Column | Populated when | What it tells the operator |
|---|---|---|
| `id, tenant_id, user_id, branch_id` | always | Audit anchor + who did it |
| `level` | `info`/`warning`/`error`/`critical` | Severity |
| `action` | always | Verb-string like `crm.lead.create`, `crm.attendee.payment_marked_paid`, `crm.event.status_change`, `crm.lead.status_change` |
| `entity_type` | always | Plural table name (post-P26): `crm_leads`, `crm_events`, `crm_event_attendees` |
| `entity_id` | usually | The id of the row that was acted on |
| `details` | populated post-P26 (free-form JSONB) | Action-specific details — for `lead.status_change`: `{from, to, source}`; for `attendee.coupon_sent`: `{event_id, code, channel}`; varies per action |
| `created_at` | always | When the action happened |

### `crm_automation_runs` (per-rule-evaluation row)

Columns:

| Column | What it tells the operator |
|---|---|
| `id, tenant_id, rule_id, rule_name, trigger_type, trigger_data` | Which rule fired + the input data that triggered it (lead_id, event_id, status changes are in `trigger_data` JSONB) |
| `event_id` | Which event scope (when applicable) |
| `total_recipients, sent_count, failed_count, rejected_count` | Counters reconcile with the matching `crm_message_log` rows for `run_id` |
| `status` | `running`/`completed`/`failed`/`aborted` (P29 added the latter via reaper) |
| `started_at, finished_at, updated_at` (P29) | Timing — for stuck-run detection by the reaper |
| `error_message` | Free-form. Used by the reaper to write `'Approval window expired (no admin action within 1 hour)'` |

---

## Cross-references that exist today

| From | To | Status |
|---|---|---|
| `crm_message_log.run_id` → `crm_automation_runs.id` | works for rule-driven sends ✓ (P29 commit 3 fix) | P29 verification still holds |
| `crm_message_log.template_id` → `crm_message_templates.id` | works on `sent` rows; NULL on EF early-failures (template_not_found) | known-gap-by-design |
| `crm_message_log.lead_id` → `crm_leads.id` | always present | clean |
| `crm_message_log.event_id` → `crm_events.id` | optional | clean |
| `crm_automation_runs.rule_id` → `crm_automation_rules.id` | always | clean (FK) |
| `activity_log.entity_id` → (varies by entity_type) | usually present | depends on caller — P26 fix doesn't enforce |
| `activity_log` ↔ `crm_message_log` | **no direct link** today | gap — see GAPS below |

---

## GAPS — what an operator debugging a customer complaint CAN'T see

This is the heart of Daniel's question. For each common operator scenario, what's missing.

### Gap 1 — "Customer says 'I didn't get the SMS'; the row says `status='sent'`"

What the operator knows from `crm_message_log`:
- Yes, we attempted to dispatch this SMS at this time.
- The Make webhook returned 200 (that's all `status='sent'` confirms).

What the operator does NOT know:
- Did Make actually forward the SMS to the vendor (Global SMS)?
- Did Global SMS accept the recipient phone?
- Did the carrier deliver the SMS (delivered, undelivered, blocked, queued)?
- If undelivered, did the vendor return a reason (invalid number, unreachable, blacklisted)?
- Did the recipient's device receive it but mark it spam/silent?

Why: `external_id` is always NULL (P28-003). No vendor callback EF wires up Global SMS / Resend → `crm_message_log.external_id + delivery_status_received_at`.

**Recommendation (post-cutover):** P28-003 SPEC — add `vendor-delivery-callback` Edge Function registered with Global SMS + Resend; introduce `crm_message_log.delivered_at`, `failed_at`, vendor-side status enum; update Make scenario to forward vendor message-id to a callback URL or directly to a Supabase RPC.

### Gap 2 — "Customer's QR code in the email is broken — what placeholder didn't substitute?"

This is exactly the P32-001 finding. Today, an operator looking at `crm_message_log.content` would have to manually scan the body for `%X%` literals. There's no automated flag.

**Recommendation (now, schema-free):** add a render-step assertion in `send-message` EF: regex `/%[a-z][a-z0-9_]*%/` against `finalBody` AFTER substitution; if any match, write `crm_message_log` row with status='failed' + `error_message='unsubstituted_placeholder: <names>'`. This catches the SPEC-vs-EF drift class (P32-001 root cause) at dispatch time, not at customer time.

(The existing `scanForPaymentUrlMismatch` already does exactly this for `%payment_url_*%`. Generalizing the same pattern to all lowercase placeholders would have caught P32-001 immediately.)

### Gap 3 — "Customer says they got 2 of the 4 messages they were promised"

What the operator knows:
- 4 `crm_message_log` rows, all `status='sent'`.

What's missing:
- Which 2 actually arrived (vendor-side gap — see Gap 1).
- If the customer is right and 2 didn't arrive, was it a transient vendor issue, a spam filter, or our misconfig?

**Recommendation:** combine Gap 1 (vendor callback) with a per-recipient phone history view: `SELECT count(*) by status FROM crm_message_log WHERE lead_id=$1 AND created_at > now() - interval '7 days'`. The current lead detail modal's messages tab does show the per-lead history, but doesn't aggregate by vendor-status.

### Gap 4 — "Failed automation run — what triggered it?"

What `crm_automation_runs.trigger_data` JSONB gives:
- The input that fired the rule. Useful.

What's missing:
- The user/employee who took the upstream action (e.g., the manager who clicked "change status" on an event). Today the rule run shows what triggered it (status change) but not WHO caused the status change.

**Recommendation:** Engine-side — when `CrmAutomation.evaluate()` is called from a UI mutation, include the calling employee's id in `trigger_data` (e.g., `{ ..., triggered_by_employee_id: getCurrentEmployee().id }`). Schema-free.

### Gap 5 — "Was this dispatch part of an automation run, or was it a manual one-off?"

`crm_message_log.run_id`:
- NULL = manual / direct send / EF-direct (lead-intake EF, event-register EF). Operator can't easily tell which manual path.
- NON-NULL = rule-driven via the engine.

What's missing:
- A `dispatch_source` column or convention to distinguish: manual UI button, direct EF call (lead-intake / event-register), broadcast wizard, retry of a failed row, etc.

**Recommendation (schema):** add `dispatch_source TEXT` column to `crm_message_log` with values like `automation_engine`, `manual_quick_send`, `manual_coupon_button`, `lead_intake_ef`, `event_register_ef`, `broadcast_wizard`, `failed_msg_retry`. The EF caller already knows this; adding it to the payload is cheap.

### Gap 6 — "When was this row's status updated to 'sent'?"

`crm_message_log` has only `created_at`. After P29's `crm_automation_runs.updated_at`, it's clear that mutating tables benefit from explicit timestamps. The current pattern of mutating `status='pending' → 'sent'` overwrites the original status with no record of when the transition happened.

**Recommendation (schema):** add `sent_at`, `failed_at`, `delivered_at` (the latter for vendor callback). Already mentioned in P28 finding P28-008.

### Gap 7 — "How does the operator find ALL failures across the tenant in one place?"

The P31 failed-msg badge + chip + section is per-LEAD. There's no tenant-wide failure dashboard. An operator wanting to see "all dispatches that failed today" must:
1. Open every lead with a badge, OR
2. Run a SQL query manually

**Recommendation (UI, not schema):** add a top-level "תקלות הודעות" tab or a dashboard widget aggregating `crm_message_log WHERE status='failed' AND created_at > now() - interval '24 hours' GROUP BY error_label, lead_id, template_slug`. Schema-free.

### Gap 8 — "An automation_run had `total_recipients=0` — why?"

The S4 first-attempt produced a run row with `total_recipients=0` because the audience filter (rule's `recipient_status_filter=['waiting']`) didn't match any lead at evaluation time. The run row gives no hint about WHICH leads the engine considered and why each was excluded. P28 finding P28-012 already flagged this.

**Recommendation:** engine-side — when no recipients match, write `error_message='audience_filter_no_match: tier2_excl_registered, status_filter=[waiting]'` or similar to crm_automation_runs, even though the run completes. Schema-free.

### Gap 9 — "Pre-fix message_log row has `error_message` but no Hebrew label saved"

The Hebrew error labels (P31 commit 4) are computed client-side at render time. If the label map evolves, old failed rows render under the new label, which is fine. But if an operator wants to PERMANENTLY record what the customer-shown reason was (e.g., for a SLA report), there's no `error_label_he` column.

**Recommendation:** out of scope for P32 (the operator UI works); not a blocker. Just observe.

### Gap 10 — "Why did Make webhook return 502?"

`error_message='make_webhook_502: <body slice>'` truncates the body to 200 chars. For complex Make-side errors with longer JSON responses, the operator can't see the full reason from the DB row.

**Recommendation:** keep 200-char DB cap but ALSO log the full body to a separate `crm_message_log_extras` table or to Supabase Edge Function logs. Today, the EF has `console.error` calls; operators without log access can't see those.

---

## What's working well

- `run_id` cross-reference (post-P29) — `crm_message_log` rows from rule-driven dispatches are reliably linked to their automation run; the drill-down modal can render coherent per-run history (P29 commit 4 verified working).
- `entity_type` plural canonicalization (P26) — operators can filter activity_log consistently.
- Hebrew error labels (P31 commit 4) — translates raw codes to operator-friendly text in the UI.
- Failed-msg badge + chip + section (P31 commits 5+6) — gives the per-lead failure surface that didn't exist before P31.
- `scanForPaymentUrlMismatch` (pre-P31) — IS the right pattern for the bug class P32-001 surfaced (just not generalized beyond payment_url).

---

## Priority recommendations (from this audit)

| # | Recommendation | Schema change | Effort | Severity if not done |
|---|---|---|---|---|
| 1 | **Generalize `scanForPaymentUrlMismatch` to ALL `%[a-z]+%` placeholders** — fail-loud on any unsubstituted lowercase placeholder after substitution. | none | LOW (~5 lines in EF) | CRITICAL — would have caught P32-001 |
| 2 | **Vendor delivery callback** (P28-003 SPEC) | yes (delivered_at, vendor status enum) | HIGH (Make scenario change + new EF) | HIGH — operators can't actually verify delivery |
| 3 | Add `sent_at` / `failed_at` to `crm_message_log` (P28-008 already filed) | yes | LOW | MEDIUM |
| 4 | Add `dispatch_source` to `crm_message_log` | yes | LOW | MEDIUM (debug clarity) |
| 5 | Engine-side: when 0 recipients match, write `error_message` explaining why (P28-012 follow-up) | none | LOW | LOW |
| 6 | Engine-side: write `triggered_by_employee_id` to `trigger_data` | none | LOW | LOW |
| 7 | Tenant-wide failure dashboard | none | MEDIUM | LOW (operator workflow) |

**The single biggest near-term win is #1 — adding a post-substitution `%X%` scan in send-message EF would close the P32-001 class permanently in ~5 lines of code, no schema change.** This is also exactly what was missing from P31's design: validation by required_variables works, but only IF the template author correctly declares required_variables, AND the auto-fill set actually fills what the SPEC claims it fills. A post-substitution scan catches drifts in BOTH directions.

---

*End of HISTORY_DOCUMENTATION_AUDIT.md. Per dispatch: documentation-only — no fields added, no schema changed. Recommendations exist for the next SPEC author.*
