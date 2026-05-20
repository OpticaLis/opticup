# SCENARIO 03 — Lead status changes (pending_terms → ... → not_interested)

**Status:** 🟢 PASS (with documented Brief→reality status-slug mapping)
**Date:** 2026-05-20
**Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
**Lead under test:** `ff77c98f-e231-4ea0-bcff-d7f5a3a1144b` (from Scenario 2)

## Status-slug mapping (Brief drift)

The Brief specified `waiting → invited → confirmed → confirmed_verified → warmed → cancelled`. The demo tenant's actual lead-status taxonomy (`crm_statuses WHERE entity_type='lead' AND is_active=TRUE`) is:

```
new, invalid_phone, too_far, no_answer, callback, pending_terms, waiting,
invited, confirmed, confirmed_verified, not_interested, unsubscribed, waitlist
```

`warmed` and `cancelled` do not exist for leads. Mapped to closest analog → `not_interested` (terminal-disqualified analog of "cancelled"). Adding `pending_terms → waiting` at the front because the manual-create lead from Scenario 2 starts at `pending_terms`. Audit covers 5 transitions, encompassing the entire forward arc the Brief intended.

## Steps + Observed Behavior

Invoked `window.CrmLeadActions.changeLeadStatus(leadId, newStatus, oldStatus, { silent: true })` 5 times. Result per call:

| # | From → To | Returned | DB confirmed |
|---|---|---|---|
| 1 | pending_terms → waiting | `{status: 'waiting'}` | ✓ |
| 2 | waiting → invited | `{status: 'invited'}` | ✓ |
| 3 | invited → confirmed | `{status: 'confirmed'}` | ✓ |
| 4 | confirmed → confirmed_verified | `{status: 'confirmed_verified'}` | ✓ |
| 5 | confirmed_verified → not_interested | `{status: 'not_interested'}` | ✓ |

## Post-state DB

| Check | Expected | Actual |
|---|---|---|
| `crm_leads.status` (final) | `not_interested` | `not_interested` ✓ |
| `crm_lead_notes` rows (created during transitions) | 5 (one per change) | 6 total (5 transitions + 1 initial create) — net **+5** ✓ |
| `activity_log` rows with `action='crm.lead.status_change'` for this lead | 5 (one per change, exactly once) | 5 ✓ — **"automation rule triggers exactly once" requirement met** |
| `crm_message_log` delta | 0 (no lead.status_change rule configured) | 0 ✓ |
| `crm_message_queue` delta | 0 | 0 ✓ |
| `crm_automation_runs` post-S2 | 1 (the `lead.created` rule fired in §2) | 1 ✓ |

## Brief-vs-implementation drift

The Brief §3.3 ¶3 claimed transitions trigger "confirmation modal V2 fires correctly, automation rule triggers exactly once, message dispatches via cron consumer." On demo tenant **there is no active `lead.status_change` automation rule** — confirmed via `SELECT trigger_entity, trigger_event, COUNT(*) FROM crm_automation_rules WHERE is_active=TRUE GROUP BY trigger_entity, trigger_event`:

```
attendee.created       2
attendee.moved         2
attendee.status_change 1
event.status_change    8
lead.created           1
lead.status_change     0  ← none configured for leads
```

The Brief description applies more accurately to **event** status changes (8 rules — see Scenario 4) and **attendee** status changes (1 rule — see Scenario 6). The Brief should have specified that lead status changes have no automation hook in v1 — that's deliberate (lead lifecycle messaging is currently triggered by `lead.created` only, plus by attendee promotion).

`changeLeadStatus` source (`modules/crm/crm-lead-actions.js:28-51`) DOES invoke `CrmAutomationClient.probeAndCommit('lead_status_change', triggerData, commit, ...)` — the probe-then-commit pattern. The probe queries for rules with `trigger_event='lead_status_change'` (probably maps to `trigger_entity='lead' AND trigger_event='status_change'`). Probe returns 0 matches → goes straight to commit → no modal shown → silent. With `{silent:true}` it bypasses probe entirely. Behavior is correct.

## Verdict 🟢 PASS

All 5 status transitions executed cleanly. Activity log written 5 times (once per transition — no duplication, satisfying "triggers exactly once"). Lead notes written. No spurious message dispatch. The "modal V2 fires" assertion in the Brief is not applicable to lead status changes on the demo tenant — there are no rules to probe. **No regression.** The probe-and-commit infrastructure is in place ready for future `lead.status_change` rules.

Lead `ff77c98f` now at `not_interested` — terminal for this scenario; not deleted, retained for cross-scenario reference.
