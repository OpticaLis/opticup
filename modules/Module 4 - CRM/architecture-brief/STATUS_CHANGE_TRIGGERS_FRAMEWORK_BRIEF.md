# Brief — Status-Change Triggers Framework + Multi-Channel Synchronization

**Version:** v1
**Date:** 2026-05-12
**Author:** Architect
**Hand-off to:** Module Strategist (`opticup-strategic` skill, M4)
**Tracking SPEC name:** `STATUS_CHANGE_TRIGGERS_FRAMEWORK`

---

## 1. Purpose

Two related gaps in M4's automation engine that should ship together:

**(a) Status-change triggers framework.** Today the engine supports only 5 trigger types. The rule-editor UI lets staff save a rule against a non-existent trigger (e.g. "when attendee status becomes הגיע → send check-in SMS"), but the engine never fires it. Silent breakage. Daniel directive 2026-05-12: build this as a generic framework that scales to future entities (sale, payment, inventory) by adding a config row, not engine code.

**(b) Multi-channel parallel delivery.** Today when a template is configured for SMS + Email, the two channels dispatch sequentially with seconds between them. Customer-facing UX is poor — looks like the system fires twice. Should dispatch in parallel (one DB transaction enqueues both, queue drains both at the same time).

---

## 2. Scope — In

What MUST be in this SPEC:

- Extend `TRIGGER_TYPES` in automation-engine to accept `attendee_status_change` (immediate need: check-in SMS automation).
- **Generic framework design** — adding `sale_status_change` / `payment_status_change` / `inventory_status_change` in the future = adding a config row in a mapping table, NOT new engine code. The framework must be entity-agnostic on day one even though only attendee is wired.
- **Database trigger listener pattern** (per Architect-Daniel decision 2026-05-12) — every entity table with a `status` column gets a DB trigger that, on transition, inserts an event into a central queue (e.g. `crm_status_change_events`). automation-engine reads from that queue. This replaces a "every call-site must remember to call AutomationClient.evaluate()" pattern and removes the at-most-once-best-effort risk.
- Rule-editor UI "fires on" picker on the attendees board: `created` vs `status_change`, with condition surfaces (status_equals, status_changed_from, status_changed_to).
- Backward compat for the silently-broken attendee rules saved today: auto-route to the new trigger type OR surface in audit history as "needs review".
- Multi-channel parallel dispatch: when a template has both SMS and Email body configured AND the recipient has both phone and email, both queue rows are inserted in the same transaction with the same `scheduled_for` time. `dispatch-queue` cron picks both up on the same tick. If recipient has only one channel — dispatch only that channel (current "skip silently" behavior preserved).
- Migration committed to git per TD-2 discipline.

## 3. Scope — Out (anti-creep)

What is explicitly NOT in this SPEC:

- Wiring `sale_status_change`, `payment_status_change`, `inventory_status_change` to actual call-sites. M7/M8/M9 don't exist yet — adding placeholder triggers without consumers is YAGNI. Framework must SUPPORT them; this SPEC does not WIRE them.
- A new rule-editor UI for arbitrary entities. Attendees board only this round.
- Retroactive backfill of past missed automations.
- Channel preference per-recipient (some customers might prefer email-only). Defer to a future M12-related SPEC.
- WhatsApp parallel dispatch. Channel exists in code but not yet in production rotation — defer.

## 4. Locked Decisions (from Architect-Daniel 2026-05-12 conversation)

| # | Decision | Reason |
|---|----------|--------|
| 1 | Build as **generic framework**, not one-off attendee fix. | Daniel directive: "חייב להיות פתרון קבוע כי יש עוד אוטומציות בעתיד". |
| 2 | Each module **owns its call-sites**, NOT M4 polling other modules' tables. | Iron Rule 16 (contracts between modules). Required for future repo split after P7. |
| 3 | But the **call mechanism is a DB trigger**, not a code-level call to `AutomationClient.evaluate()`. | Closes the 3 weaknesses of pure-code-call: forgotten call sites, retry on failure, M4 transient unavailability. Industry standard (Stripe / Shopify / Salesforce pattern). |
| 4 | DB triggers write to a central queue table (`crm_status_change_events` or similar) that automation-engine reads. | Decouples write from automation execution. Lets engine batch + retry. |
| 5 | Multi-channel SMS+Email dispatch **in parallel**, not sequential. | UX: today customers see two pings seconds apart. |
| 6 | If recipient missing one channel → dispatch the other silently. No error, no warning. | Matches current behavior; Daniel confirmed 2026-05-12. |
| 7 | Build for attendee status-change only in this SPEC; sale/payment/inventory framework-ready but not wired. | M7/M8/M9 don't exist yet; no consumers to wire. |

## 5. Dependencies

### Upstream (must exist before this SPEC starts)

- `crm_event_attendees` table (exists)
- `crm_automation_rules` table (exists)
- `crm_message_queue` + `dispatch-queue` cron (exists, EV-002/003/004/005 closed)
- `crm_message_log` (exists)
- `send-message` EF + `automation-engine` EF (exist)

### Downstream (waiting on this SPEC)

- Check-in SMS automation (immediate, daily-ops blocker — Daniel asked for this 2026-05-12).
- Future M7 (sale status → Facebook CAPI purchase event for retargeting).
- Future M8 (payment confirmed → receipt).
- Future M9 (lab job status → customer pickup-ready notification).
- Future M1 expansion (stock low → supplier alert).

## 6. Cross-Module Contracts

These contracts MUST be honored. Module Strategist may extend, not break.

- **Contract A — DB queue contract.** Any module's status-bearing table can opt into the framework by attaching a trigger that inserts `(tenant_id, entity_type, entity_id, old_status, new_status, occurred_at, payload_jsonb)` into `crm_status_change_events`. Trigger code is one-line — `INSERT INTO crm_status_change_events ...`. M4 owns the consumer; the calling module owns the trigger DDL on its own table.
- **Contract B — Mapping table.** A new table (e.g. `crm_trigger_type_registry`) maps `entity_type` → display name + allowed condition operators + which condition fields the rule-editor surfaces. Adding a new entity = INSERT one row. No engine code change.
- **Contract C — Parallel dispatch.** `send-message` EF (or automation-engine, TBD by Module Strategist) inserts both SMS and Email rows into `crm_message_queue` in a single transaction with identical `scheduled_for`. Queue cron processes both within its normal tick.

## 7. Open Questions for Module Strategist

These need resolution before SPEC §3 (Execution Plan) is final:

1. Should `crm_status_change_events` be **purged after consumption** (queue semantics) or **kept as audit log** (event-sourcing semantics)? Architect recommends kept-as-audit — useful for the "why didn't automation fire?" debug case. Strategist confirms with Daniel.
2. What happens if automation-engine is down for 10 minutes — events accumulate in queue, then engine catches up? Architect recommends yes (this is the whole point of queue-based pattern). Confirm explicit polling cadence in SPEC.
3. Multi-channel timing — "same `scheduled_for` value" or "same DB transaction"? Architect recommends same `scheduled_for` (both rows queued with identical timestamp; queue picks both up on next tick). Strategist refines.
4. Rule editor "fires on" picker — does the attendees board need a UI redesign or can the existing picker be extended? Strategist surveys the current UI before deciding.

## 8. Anti-Patterns to Avoid

- **Wiring sale/payment/inventory call-sites now.** Those modules don't exist. YAGNI. Framework must SUPPORT them; this SPEC does not WIRE them.
- **Polling other modules' tables from automation-engine.** Iron Rule 16. The whole point of the framework is decoupling — don't reach across module boundaries.
- **Sequential dispatch with retry-on-failure between channels.** That's the current pattern. Parallel = single transaction, both queue rows.
- **Treating the DB trigger as a "fire and forget" notification.** It must write to the durable queue. If automation-engine is down, the event survives.

## 9. Iron Rules in Sharp Focus

- **Rule 16 — Contracts between modules.** Framework is THE contract. Don't shortcut.
- **Rule 22 — Defense-in-depth on writes.** Every INSERT into `crm_status_change_events` includes `tenant_id`. Every read filters by `tenant_id`. Even though RLS enforces it.
- **Rule 14 — tenant_id on every table.** New tables (`crm_status_change_events`, `crm_trigger_type_registry`) MUST have it.
- **Rule 15 — RLS on every new table.** Canonical JWT-claim pattern.
- **TD-2 — Migrations git drift.** Every migration committed to git this SPEC. Not MCP-applied-and-forgotten.
- **Rule 32 — Destructive Operations Gate.** SPEC must declare `## Destructive Operations` section. Expected: `None` for this SPEC (additive only — new tables, new triggers, new EF version, no DROP).

## 10. Relevant Reference Files

| File | Why |
|------|-----|
| `roles/campaign-overseer/OPEN_EVENTS_TICKETS.md` (EV-001) | Original ticket text from Daniel |
| `supabase/functions/automation-engine/engine.ts` | Current `TRIGGER_TYPES` definition + dispatch logic |
| `supabase/functions/automation-engine/index.ts` | EF entry point |
| `supabase/functions/send-message/index.ts` | Current sequential channel dispatch |
| `supabase/functions/send-message/allowlists.ts` | Test-mode envelope (don't break it) |
| `modules/crm/crm-automation-engine.js` | Browser-side mirror of TRIGGER_TYPES |
| `modules/Module 4 - CRM/docs/specs/M4_AUTOMATION_ENGINE_SERVER_SIDE/SPEC.md` | Most recent automation-engine SPEC (precedent for migration patterns) |
| `CLAUDE.md` §4–§6 | Iron Rules |

## 11. Hand-off Note

Daniel pastes the activation prompt below into a fresh Claude Code chat. The Module Strategist `opticup-strategic` skill loads, reads this brief, then authors the SPEC end-to-end via Full-Auto Pipeline. Expected SPEC outcome:

- New tables: `crm_status_change_events`, `crm_trigger_type_registry` (with seed for attendee).
- New DB trigger on `crm_event_attendees.status` → INSERT into events queue.
- automation-engine EF: new consumer loop polling `crm_status_change_events`, evaluating rules with `trigger_type = 'attendee_status_change'`.
- Rule-editor UI: "fires on" picker on attendees board with `created` / `status_change` + condition surfaces.
- send-message EF (or automation-engine): when template has both SMS+Email and recipient has both → enqueue both rows same transaction same `scheduled_for`.
- Migration committed to git.
- Smoke 7/7 PASS.

Architect stays out unless cross-module decision arises, scope changes, or strategic blocker hits.

---

*End of brief. M4 Module Strategist owns from here.*
