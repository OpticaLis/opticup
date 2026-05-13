# Escalation — Brief Premise Blocker (Phase 1 → Phase 2 transition halt)

**SPEC/Brief:** M4_LEGACY_DISPATCH_DECOMMISSION
**Brief location:** `modules/Module 4 - CRM/architecture-brief/M4_LEGACY_DISPATCH_DECOMMISSION_BRIEF.md`
**Triggered at:** 2026-05-14 (overnight, after Phase 1 Discovery)
**Trigger:** Brief §2.9 — "An assumption in this Brief is contradicted by live state." (multiple counts)
**Severity:** HIGH (Phases 2–4 cannot proceed; the Brief needs revision before any code change is safe)
**Action taken by Pipeline:** Phase 1 inventory written. Phases 2, 3, 4 SKIPPED. No code modified. Safety tag unused.
**Companion documents:**
  - Inventory: `modules/Module 4 - CRM/docs/audits/LEGACY_DISPATCH_INVENTORY_2026_05_14.md`
  - Earlier escalation (allowlist superset): `modules/Module 4 - CRM/escalations/2026-05-14T00-15Z_LEGACY_DISPATCH_DECOMMISSION_ALLOWLIST_SUPERSET.md`
  - Morning summary: `modules/Module 4 - CRM/docs/audits/LEGACY_DISPATCH_DECOMMISSION_SUMMARY_2026_05_14.md`

---

## What the Brief assumed

§1: "Today the CRM runs TWO automation engines side by side: legacy in-process (CrmAutomation.evaluate) + new queue-based engine."
§3 Phase 2: "For each automation rule … verify the queue framework will fire for the same triggering event."
§3 Phase 4: "Remove the legacy CrmAutomation.evaluate and equivalent dispatch entry points."

The implicit assumptions:
1. The literal symbol `CrmAutomation.evaluate` exists in the live codebase.
2. The queue framework already covers the triggering event for every legacy callsite (or trivially can be made to).
3. Decommissioning the legacy path has no operator-facing UX impact.

## What live state shows

### 1. Symbol-name drift

`ripgrep CrmAutomation\.evaluate\(` against the entire repo returns ZERO source-code matches — only docstring comments. The symbol was already replaced by `CrmAutomationClient.evaluate(...)` (a thin browser wrapper around the `automation-engine` Edge Function) under SPEC `M4_AUTOMATION_ENGINE_SERVER_SIDE` Rung 2. The Brief asks the Pipeline to grep for a name that has been gone for weeks.

**Severity:** LOW — cosmetic. The Pipeline can substitute `CrmAutomationClient.evaluate(...)` wherever the Brief says `CrmAutomation.evaluate(...)` and continue. (Reflected in the inventory.)

### 2. Queue coverage gap (the hard blocker)

The 5 live in-process callsites use these synthetic trigger types: `attendee_moved`, `event_status_change`, `event_registration`, `lead_status_change`, `lead_intake`.

The 3 live queue producers are: `trg_attendee_status_change_event`, `trg_event_status_change_event`, `trg_lead_status_change_event` — all `AFTER UPDATE` and all guarded by `IF OLD.status IS DISTINCT FROM NEW.status THEN ...`.

This means:
- `event_status_change` ✅ — covered by `trg_event_status_change_event` (status delta).
- `lead_status_change` ✅ — covered by `trg_lead_status_change_event` (status delta).
- `attendee_moved` ❌ — no DB trigger captures attendee MOVE (event_id change). The 2 active "moved" rules condition on payment status, NOT a status flip, so even when an attendee status delta happens to coincide with a move, the rule's condition wouldn't match cleanly.
- `event_registration` ❌ — no INSERT trigger on `crm_event_attendees`. New attendee creation is silently invisible to the queue.
- `lead_intake` ❌ — no INSERT trigger on `crm_leads`. New lead creation is silently invisible to the queue.

**3 of the 5 callsites cannot be decommissioned without new DB triggers.** Adding triggers is DDL.

The Brief explicitly forbids DDL outside `INSERT INTO crm_automation_rules`:

> §2.6 DDL rules — Schema changes are minimal — possibly NONE. The queue framework already exists. Migration is about wiring automation rule rows + removing JS code, not schema. If any DDL beyond `INSERT INTO crm_automation_rules` (data writes only on demo) surfaces as needed → STOP, escalate.

So the Brief asks for a migration that is impossible without DDL, AND forbids the DDL. The only Brief-compliant action is to halt and escalate.

**Severity:** HIGH. This is the hard blocker for Phase 2.

### 3. Operator-facing UX regression (a Brief-level decision Daniel must own)

Today, every legacy callsite routes through `CrmConfirmSend.show(planItems, onChoice)` — the operator sees a 3-button preview modal showing the resolved recipient list and the message preview, and clicks one of: "אישור ושלח הודעות" (approve + dispatch), "אישור ללא הודעות" (approve, no dispatch), or cancel. The operator gets to inspect and approve every dispatch.

The queue path has no operator-facing modal. The cron consumer evaluates rules and dispatches automatically once per cron tick.

Decommissioning the legacy callsites changes operator semantics from "preview-and-approve" to "fire-and-forget" for every legacy callsite. The Brief is silent on this. The most recent SPEC author (`M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION`, 2026-05-14) explicitly chose to keep both paths active in parallel because they were doing different jobs:

> `crm-automation-engine.js` lines 38–44:
> "M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION (2026-05-14): lead_status_change AND event_status_change ALSO route through the queue now (DB triggers …). The legacy in-process dispatch (crm-lead-actions.js, crm-event-actions.js direct CrmAutomationClient.evaluate calls) **still runs in parallel — both paths are active intentionally**; the queue path is a decoupled bus for monitoring and future-rule wiring."

The Pipeline cannot autonomously override the prior SPEC author's intentional decision, especially when the override removes operator-facing UX. This needs Daniel's explicit say-so.

**Severity:** HIGH. Even for the 2 of 5 callsites where queue parity exists, removing the legacy path is a UX regression the Brief did not authorize.

### 4. Brief mentions of "broadcast-send" and "attendee-cancel" as legacy callsites are inaccurate

§1 mentions: "called from event-edit, attendee-move, attendee-cancel, lead-status-change, broadcast-send, etc."

- `crm-attendee-cancel.js` — does NOT call `CrmAutomationClient.evaluate(...)` directly. Cancellation flows via UPDATE on `crm_event_attendees.status='cancelled'` → `trg_attendee_status_change_event` fires → queue → consumer. **Cancellation is already queue-based.**
- `broadcast-send` — there is no module file by that name in the legacy callsite list. Broadcasts are a separate one-shot mass-dispatch path, not a `crm_automation_rules` evaluation.

**Severity:** LOW. The inventory has the correct list; the Brief just over-counted.

## Why I did NOT proceed with the 2 of 5 "cleanly migrate-able" callsites

Two callsites (`event_status_change`, `lead_status_change`) DO have queue producers. In principle the Pipeline could disable just these and ship a partial migration.

I chose not to, for these reasons:

1. **The UX regression in §3 above applies to these callsites equally.** Removing the legacy path = removing the operator confirmation modal = a Brief-level UX policy choice that needs Daniel's go-ahead. The Brief's "all-green or skip Phase 4" gate (§3 Phase 4) implies an all-or-nothing migration; partial migration was not sketched.

2. **The most recent SPEC author chose to keep both paths intentionally** ("intentionally" — `crm-automation-engine.js` line 41). Overriding that choice without prior author consultation would be a unilateral architectural reversal mid-overnight-run, which is exactly the kind of "new decision not covered by the original plan" that Bounded Autonomy §9 says should stop.

3. **Phase 4 (legacy code removal) gates on ALL migrations being green.** With 3 of 5 callsites blocked, Phase 4 cannot run. Half-migrating leaves the codebase with a worse split (some callsites legacy, some not) than today, AND the legacy helper files (`crm-automation-engine.js`, `crm-automation-post-actions.js`, `crm-automation-recipient-resolvers.js`, `crm-confirm-send.js`) cannot be deleted because the remaining 3 callsites still need them. Net effect: no file count reduction, no code-debt reduction, just churn.

4. **No live production rule in the `lead.status_change` slot is `is_active=true` on demo today.** Migrating callsite #4 would change behavior for ZERO active rules, while removing the operator preview UX for any future rule. Negative ROI.

So the safest action is no action: leave the codebase exactly as found, write a complete diagnostic, and let Daniel make the next call.

## Recommendation for Daniel (morning review)

Pick one of three paths:

### Path A — Brief revision and re-run (recommended)
Revise the Brief to:
1. Use the correct symbol name (`CrmAutomationClient.evaluate`).
2. **Authorize the 2 DDL items** needed for INSERT triggers on `crm_leads` and `crm_event_attendees` (or a "MOVE" trigger / RPC-side queue write for attendee moves) — OR explicitly defer the `lead_intake`, `event_registration`, `attendee_moved` callsites to a later SPEC and scope this Brief to only the 2 status-change callsites.
3. **Explicitly authorize (or veto) the operator-modal UX removal.** If keeping the modal, the Brief must specify whether the queue path gets a separate operator-review UI before dispatch (a substantial UX SPEC of its own).
4. Re-run with the revised Brief.

### Path B — Accept partial scope as-is
Re-issue the Brief as a `M4_LEGACY_DISPATCH_DECOMMISSION_PARTIAL` covering ONLY the `event_status_change` callsite (callsite #2) — explicitly stating: "the operator modal is removed, the queue path becomes the sole dispatcher for event status changes." Run the partial SPEC; leave the other 4 callsites in the legacy path for now. This is a smaller win but a real one.

### Path C — Do nothing this run
Leave both paths running in parallel as the prior SPEC author intended. Revisit when:
- Daniel decides on the modal-UX policy
- An INSERT-trigger SPEC has run for `crm_leads` and `crm_event_attendees`
- An attendee-MOVE queue producer (trigger or RPC-side write) has been built

This is the "do no harm tonight, sleep on it" option.

---

*End of escalation. Pipeline continues to Phase 5 (morning summary). No code was modified during this run; no rollback needed.*
