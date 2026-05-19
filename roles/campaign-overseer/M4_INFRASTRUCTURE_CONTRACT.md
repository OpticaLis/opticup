# M4 Infrastructure Contract — Campaign Overseer Reference

**Authored by:** `M4_DUAL_PATH_CLEAN_FIX_2026_05_19` SPEC, Layer 3-KT.
**Audience:** Campaign Overseer role, before authoring any M4 change.
**Companion rule:** Iron Rule 35 (CLAUDE.md) — Campaign Overseer authority boundary.
**Companion architecture doc:** `docs/CRM_RULE_CHAINING.md` — post-action chaining + Layer 3 self-loop guard.

---

## Purpose

This file is the canonical reference the Campaign Overseer MUST read before touching any M4 configuration. It captures the contract between Campaign Overseer authority (template body, rule conditions, broadcast scheduling) and Architect SPEC-level infrastructure (placeholders, action types, trigger types, EF code, DB triggers).

A Campaign Overseer edit that violates this contract WILL silently fail at dispatch time. The cause-and-effect: an undeclared `%var%` placeholder becomes a literal `%var%` string in the SMS body (or, after `M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX`, gets caught by `validateTemplateOutput` and rejected pre-enqueue with `unsubstituted_placeholder` in `crm_message_log.error_message`). Either way, the message doesn't reach the customer.

---

## 1. Variable Contract — Templates

A `crm_message_templates` row's `body` and `subject` columns can use `%var_name%` placeholders. The resolver populates these from the trigger context and the lead row. New placeholders require an Architect SPEC to extend the resolver (`supabase/functions/automation-engine/prepare-plan.ts buildVariables()` AND `supabase/functions/send-message/<dispatch.ts or per-channel>`). Campaign Overseer may NOT add a new placeholder by editing a template alone — the resolver must learn the new name first.

### 1.1 Lead-level variables (always available)

| Placeholder | Source column | Format | Notes |
|---|---|---|---|
| `%name%` | `crm_leads.full_name` | string | Empty string if unset. |
| `%phone%` | `crm_leads.phone` | string (normalized) | E.164 or local Israeli format. |
| `%email%` | `crm_leads.email` | string | Lowercase. |
| `%lead_id%` | `crm_leads.id` | uuid (as string) | For internal cross-reference. |
| `%unsubscribe_url%` | derived | URL | Server-side substitution at send time. Preview shows placeholder text. |

### 1.2 Event-level variables (available when `triggerData.eventId` is set)

| Placeholder | Source column | Format | Notes |
|---|---|---|---|
| `%event_name%` | `crm_events.name` | string | |
| `%event_date%` | `crm_events.event_date` | `DD.MM.YYYY` | Formatted via `CrmHelpers.formatDate` mirror. |
| `%event_time%` | `crm_events.start_time` | `HH:MM:SS` | |
| `%event_location%` | `crm_events.location_address` | string | |
| `%event_day_of_week%` | derived from `event_date` | Hebrew name | E.g., "ראשון", "שני". Added 2026-05-19 (`M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX`). |
| `%event_deposit_amount%` | `crm_events.booking_fee` | integer (raw, no currency symbol) | E.g., "50". Templates append `₪` after the placeholder. |
| `%event_max_attendees%` | `crm_events.max_capacity` | integer | E.g., "50". |
| `%registration_url%` | `crm_events.registration_form_url` (or derived) | URL | Per-event override unless legacy `r.html`/`app.opticalis` URL; otherwise placeholder text. Server-side resolves at send time. |

### 1.3 Out-of-scope placeholders (requires SPEC to add)

If a template needs ANY of these, the Campaign Overseer must open a request to the Architect:
- Customer purchase history.
- Cross-event registration count.
- Coupon code (currently NOT a placeholder — auto-resolved per-event via `crm_events.coupon_code`, exposed differently).
- Branch/store metadata.
- Any tenant-config value (currency, VAT, brand name) — currently NOT a placeholder; the system resolves these implicitly via tenant_config.

### 1.4 Channel applicability

- SMS templates (slug ends `_sms_<lang>`) have a 160-char soft limit per segment. The resolver substitutes the full text; the operator authoring the template is responsible for keeping the post-substitution length under the multi-segment threshold.
- Email templates (slug ends `_email_<lang>`) use `subject` separately from `body`. Both are scanned for placeholders by `validateTemplateOutput`. HTML email is supported in `body`.

---

## 2. Action Contract — Rules

A `crm_automation_rules` row's `action_type` MUST be one of:

### 2.1 Supported action_types

| action_type | Behavior | action_config fields | Side effects |
|---|---|---|---|
| `send_message` | Resolve recipients, compose template, enqueue to `crm_message_queue`. | `template_slug`, `channels` (e.g. `["sms","email"]`), `recipient_type`, optional `language`, optional `post_action_status_update`, optional `skip_auto_promote`, optional `recipient_status_filter`. | Inserts into `crm_message_queue`; via `dispatch-queue` cron → `send-message` EF → `crm_message_log`. Lead `waiting → invited` promotion via DB trigger after successful send. |
| `queue_send` | Schedule a future-dated message in `crm_message_queue`. Fires the schedule N days before/after event date at a specific time. | `template_slug`, `channels`, `recipient_type`, `language`, `schedule: { offset_days, send_time }`. | Inserts future-dated rows into `crm_message_queue`; same dispatch chain. |

### 2.2 NOT supported (would require SPEC)

- `send_email_only` (use `send_message` + `channels: ["email"]`)
- `update_field` (use `post_action_status_update`)
- `webhook_call` (no such action_type exists; would require new SPEC + EF extension)
- `tag_lead` (no such action_type exists today)

### 2.3 recipient_type values

Set in `action_config.recipient_type`:

| value | Resolves to |
|---|---|
| `trigger_lead` | The single lead from the trigger context (e.g. `lead_intake`, `lead_status_change`). |
| `tier2` | All active leads (not deleted, not unsubscribed) in Tier 2 statuses (default: waiting/invited/confirmed/confirmed_verified). |
| `tier2_excl_registered` | Same as `tier2` but excludes leads already in `crm_event_attendees` for the trigger's event. |
| `leads_by_status` | Custom status list — REQUIRES `recipient_status_filter` array in action_config. |
| `attendees` | Attendees for the trigger event with active statuses (registered, confirmed, attended, purchased, no_show). |
| `attendees_waiting` | Attendees with status='waiting_list'. |
| `attendees_all_statuses` | All attendees regardless of status. |
| `attendees_with_active_coupon` | Attendees where coupon_sent=true AND status != cancelled. |
| `cross_event_active_waitlist` | Waiting/invited attendees of OTHER open events (parallel-event invite pattern). |

New recipient_type → Architect SPEC.

### 2.4 post_action_status_update

When set on a rule, after the primary action completes the engine UPDATEs all resolved recipient leads' `crm_leads.status` to the target value. Layer 3 self-loop guard prevents this from re-firing the same rule on its own derivative SCE. See `docs/CRM_RULE_CHAINING.md` for full mechanism + 1-hour window.

Common values: `warmed`, `invited`, `confirmed`. Any value in `crm_statuses` (or implicit Tier-2 set) is acceptable.

### 2.6 SCE payload — operator dispatch overrides (M4_MODAL_DESELECTION_RESTORE, 2026-05-19)

When a status change is committed via the V2 modal-confirm flow with operator deselections (or test-send subset), the `crm_status_change_events.payload` jsonb carries two optional keys that the consumer reads and threads into `evaluate()`'s top-level `excludeLeadIds` / `recipientSubset` inputs:

| payload key | type | semantics |
|---|---|---|
| `exclude_lead_ids` | `string[]` (uuid) | Lead IDs the operator UNCHECKED in the V2 modal. Engine drops these from the plan. |
| `recipient_subset` | `string[]` (uuid) | Lead IDs the operator restricted dispatch to (e.g., "send test to first 3"). When non-empty, engine sends ONLY to these. |

Both keys are absent when the operator confirms without deselections OR when the status change happens silently (no modal — e.g., `auto_promote_lead_status` path).

**Wire (DB-side):** `update_event_status_with_overrides(p_tenant_id, p_event_id, p_new_status, p_exclude_lead_ids, p_recipient_subset)` RPC sets transaction-local `m4.dispatch_exclude_lead_ids` + `m4.dispatch_recipient_subset` session vars, then UPDATEs `crm_events.status`. The 3 SCE-producer triggers (event/lead/attendee) read these vars via `current_setting(..., true)` and merge into payload.

**Wire (browser):** `CrmConfirmSendV2` collects deselections into `_state.excluded + _state.testSent`. On modal confirm, `ctx.excludeLeadIds` + `ctx.recipientSubset` flow through `CrmAutomationClient.probeAndCommit` → `commitCallback(meta)` → `changeEventStatus`'s commit closure routes through `update_event_status_with_overrides` RPC when either array is non-empty (direct UPDATE otherwise).

**Campaign Overseer impact:** zero. This contract is invisible to template authoring. Documented here so future contributors don't accidentally remove the bridge.

---

### 2.5 auto_promote_lead_status — explicit promotion opt-in (M4_AUTO_PROMOTE_GOVERNANCE, 2026-05-19)

When set on a rule, after a message in `crm_message_queue` flips to `status='sent'` for an event-bound row referencing this rule via `run_id`, the `promote_lead_on_message_sent` DB trigger promotes the recipient lead from `waiting` → `<auto_promote_lead_status value>`. Captures `m4.originated_by_rule_id` via `set_config` so the resulting lead-side SCE row carries `originated_by_rule_id` (Layer 3 self-loop guard mechanism).

**Values:**
- `null` (or key absent) → **no promotion**. The default for any rule where the recipient is already in the funnel (`trigger_lead`, `attendees*`).
- `'invited'` → promote `waiting` → `invited`. Default for invitation-flow recipient_types (`tier2`, `tier2_excl_registered`, `leads_by_status`).
- `'confirmed'` / `'confirmed_verified'` → advanced flows. Any value in the Tier-2 status set is accepted.

**UI:** Rule editor has a toggle "קדם סטטוס נמען אחרי שליחת ההודעה?" with a dropdown of statuses, shown only when toggle is checked. The toggle's state is saved as `null` (off) or the selected status (on).

**Safety constraint:** the trigger ONLY promotes leads currently in `waiting`. Never overwrites `invited`/`confirmed`/etc. Operator action wins over auto-promotion.

**Legacy `skip_auto_promote: true`:** still honored by the trigger for back-compat. `auto_promote_lead_status: null` is the canonical opt-out from 2026-05-19 onward. New rules saved through the UI will NOT write `skip_auto_promote`.

**Rule of thumb:** if you're authoring a new rule and you want lead status to change after the message sends → check the toggle and pick a status. If you don't want any status change → leave toggle off. There is no implicit promotion behavior.

---

## 3. Trigger Type Contract

`crm_automation_rules.trigger_entity` + `trigger_event` MUST match a row in `crm_trigger_type_registry`. Today's registered combinations:

| trigger_entity | trigger_event | trigger_type_slug (used by EF) | Producer |
|---|---|---|---|
| `event` | `status_change` | `event_status_change` | `trg_event_status_change_event` on `crm_events` UPDATE OF status |
| `lead` | `status_change` | `lead_status_change` | `trg_lead_status_change_event` on `crm_leads` UPDATE OF status |
| `attendee` | `status_change` | `attendee_status_change` | `trg_attendee_status_change_event` on `crm_event_attendees` UPDATE OF status |
| `attendee` | `created` | `event_registration` | Browser direct (no DB trigger today) |
| `attendee` | `moved` | `attendee_moved` | Browser direct (no DB trigger today — `move_attendee_between_events` RPC) |
| `lead` | `created` | `lead_intake` | Browser direct + lead-intake EF |

New trigger combination → Architect SPEC (add registry row + producer trigger + EF consumer handling).

---

## 4. Status Change Framework — Full Architecture Diagram

```
USER CLICKS STATUS DROPDOWN
        │
        ▼
[browser: changeEventStatus / changeLeadStatus / move_attendee_between_events]
        │
        ├── (Layer 1) CrmAutomationClient.probeAndCommit('<trigger_type>', triggerData, commit, opts)
        │       │
        │       ▼
        │   POST automation-engine EF mode='dispatch_preview'
        │   (ZERO writes — returns recipients_by_lead, rules, channels)
        │       │
        │   ┌───┴───────────────────┐
        │   │ recipients empty?     │
        │   │                       │
        │   ▼ YES                   ▼ NO
        │ commit() runs            CrmConfirmSendV2.showAsync(...)
        │ silently;                modal opens hydrated with recipients
        │ Toast "סטטוס עודכן".     │
        │                          │
        │                          ├── User clicks "אישור ושלח":
        │                          │     commit() runs → UPDATE crm_*.status
        │                          │     │
        │                          ├── User clicks "ביטול":
        │                          │     onCancel() fires; commit() NOT called.
        │                          │
        │                          └── (hidden by hideCommitWithoutNotify)
        │                                "אישור ללא הודעות" removed for status-change use cases.
        │
        ▼ commit() body
UPDATE crm_events.status / crm_leads.status / etc.
        │
        ▼ DB trigger fires (SECURITY DEFINER):
trg_event_status_change_event / trg_lead_status_change_event / trg_attendee_status_change_event
        │
        ▼ Inserts row into crm_status_change_events:
- entity_type, entity_id, old_status, new_status
- dispatch_lock_key (Layer 2 — SHA256 collapses same-second dups via ON CONFLICT DO NOTHING)
- originated_by_rule_id (Layer 3 — populated from current_setting('m4.originated_by_rule_id'))
- payload (entity-specific JSON)
- consumed_at = NULL (= pending)
        │
        ▼ pg_cron tick (every minute):
SELECT cron.schedule('consume_status_change_events', '* * * * *', ...)
        │
        ▼ For each active tenant, POSTs to automation-engine EF mode='consume_status_events':
consumer.ts claims unconsumed SCE rows (FOR UPDATE SKIP LOCKED via PostgREST claim pattern).
        │
        ▼ For each SCE:
1. Map entity_type → trigger_type_slug via crm_trigger_type_registry.
2. buildTriggerDataForEntity() — shape payload + adds _origin_rule_id from originated_by_rule_id.
3. evaluate(db, { tenantId, triggerType, triggerData, mode: 'dispatch', ... }).
        │
        ▼ engine.ts evaluate():
1. Load active rules matching (entity, event).
2. Filter out _origin_rule_id (Layer 3 self-loop guard).
3. Filter by trigger_condition (status_equals / status_changed_from / status_changed_to / ...).
4. For each matching rule, prepareRulePlan() builds plan_items (recipient × channel × template).
5. validateTemplateOutput() at plan-time — rejected items → crm_message_log status='rejected'.
6. Post-actions (lead status update via update_lead_status_with_origin RPC — sets m4.originated_by_rule_id transaction-local so produced SCE carries the origin).
7. dispatchPlanDirect() enqueues to crm_message_queue.
        │
        ▼ pg_cron dispatch_queue (every minute):
SELECT cron.schedule('dispatch_queue', '* * * * *', ...) — POSTs to dispatch-queue EF.
        │
        ▼ dispatch-queue EF claims queued rows + posts each to send-message EF.
        │
        ▼ send-message EF:
1. Re-fetch template at dispatch time (substitutions use the freshest data).
2. validateTemplateOutput() again (defense in depth).
3. Phone allowlist check (test phone allowlist for non-production tenants).
4. Per-channel: Make webhook (SMS) or SMTP-via-Make (Email).
5. Write to crm_message_log status='sent' / 'failed' / 'rejected'.
        │
        ▼ DB trigger:
trg_promote_lead_on_message_sent — fires when crm_message_queue.status flips to 'sent'.
Promotes lead waiting → invited (single-hop; rule's status filter prevents re-fire).
```

### Critical invariants

- The DB-trigger → SCE → cron consumer is the ONLY path that produces `crm_message_log` writes for status-change-triggered automation. Browser code never inserts into `crm_message_queue` or `crm_message_log` directly for these flows.
- Single-path browser triggers (`lead_intake`, `event_registration`, `attendee_moved`) DO still dispatch from the browser since they have no DB-trigger producer. Those flows remain as-is.

---

## 5. Authority Boundary

Per Iron Rule 35:

**Campaign Overseer MAY edit:**
- Template body wording (subject, body, formatting) using **only** placeholders in §1.
- Rule trigger conditions on **existing** trigger types (§3) — adjust `status_equals` value, narrow with `recipient_status_filter`, switch `recipient_type` between supported values.
- Broadcast schedules and audience filters in `crm_broadcasts`.
- Active/inactive flags on existing rules and templates.

**Campaign Overseer MUST NOT edit (Architect SPEC required):**
- New `%var_name%` placeholders.
- New `trigger_type` slugs or `crm_trigger_type_registry` entries.
- New `action_type` values.
- EF code (any file under `supabase/functions/`).
- DB triggers (any function ending `_event_fn` + their trigger declarations).
- Automation-engine internals (`engine.ts`, `consumer.ts`, `prepare-plan.ts`, `recipients.ts`, `dispatch.ts`, `runs.ts`, `post-actions.ts`, `queue-send.ts`, `preview.ts`).
- Migrations (anything in `supabase/migrations/`).

Bypass requires Daniel's explicit in-chat authorization.

---

## 6. Live Verification Protocol

Iron Rule 33 already mandates: every template/rule change MUST be applied to demo first, tested on demo, then promoted to Prizma via `scripts/promote-config-to-prizma.mjs`.

Campaign Overseer test sequence for a template body change:
1. Apply change to demo's `crm_message_templates` row.
2. Pick a test event/lead on demo (event #28 + lead 01269ab9 are standard).
3. Reset state: event=planning, lead=waiting.
4. Toggle status to trigger the rule — wait 90s for cron consumer.
5. Check `crm_message_log` for the message with the new body. Verify wording.
6. If passes, promote to Prizma.

If the template change adds a `%var%` placeholder → STOP. Open an Architect SPEC request before promoting (per §1 + Iron Rule 35).

---

## 7. Rollback Path

If a Campaign Overseer change breaks production:
- `crm_message_templates`: re-apply prior body from `crm_audit_log` snapshot.
- `crm_automation_rules`: same.
- If demo and Prizma diverge: use `scripts/sync-prizma-config-to-demo.mjs --revert-prizma-to-demo` (or the equivalent reverse-direction script per `M4_CONFIG_SYNC_INFRASTRUCTURE`).
- The `crm_audit_log` table stores before/after JSON for every M4 config row change; that's the recovery source.

Architect rollback for EF/DB-trigger/migration changes: standard `git revert` + `supabase functions deploy` or migration replay.

---

## 8. Pre-Change Checklist (Campaign Overseer must complete before editing)

- [ ] I've read this file in full.
- [ ] My change uses only placeholders from §1.
- [ ] My change keeps `action_type` and `trigger_entity`/`trigger_event` within §2 + §3.
- [ ] I'm editing on demo first (Iron Rule 33).
- [ ] I have a rollback plan (§7).
- [ ] If I'm adding a new placeholder or new action/trigger, I've opened an Architect SPEC request instead.

If any checkbox is unchecked → STOP. Escalate to Architect.

---

## 9. Reference / Cross-links

- `CLAUDE.md` — Iron Rules 1-35.
- `docs/CRM_RULE_CHAINING.md` — Post-action chaining + Layer 3 self-loop guard mechanism.
- `docs/guardian/sentinel/mission-14-campaign-overseer-authority.md` — Daily audit of authority boundary.
- `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` — Sticky session-context for the Campaign Overseer role.
- `modules/Module 4 - CRM/docs/MODULE_SPEC.md` — Module-level business logic + current state.
- `supabase/functions/automation-engine/` — EF source (reference only; Campaign Overseer may NOT edit).

---

*End of M4_INFRASTRUCTURE_CONTRACT.md. Last reviewed 2026-05-19.*
