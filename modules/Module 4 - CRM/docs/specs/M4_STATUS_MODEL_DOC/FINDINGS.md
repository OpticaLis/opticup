# FINDINGS — M4_STATUS_MODEL_DOC

**Date:** 2026-05-14
**Scope:** Issues, surprises, and code/data mismatches surfaced while writing `STATUS_MODEL.md`. Per Brief §3.4, **no fix SPECs are authored from this run** — Daniel + Architect read these and decide.

Findings are listed once here in execution order with severity. Cross-reference to the doc's §6 (Open Issues) is given for each. Severities: **HIGH** = silent correctness bug visible to operators or external consumers; **MEDIUM** = latent bug that hasn't fired yet but will when state X is reached; **LOW** = code hygiene / clarity.

---

## F1 — `purchased` attendee slug referenced by code, missing from `crm_statuses` (MEDIUM)

`move_attendee_between_events` carries forward `purchased` as a preserved status, and `sync_lead_status_from_attendee` maps it to `lead.confirmed_verified`. But `purchased` is not a row in `crm_statuses` for `entity_type='attendee'` on either tenant. Either a writer was deleted in a refactor and these guards became dead, or the slug is supposed to be seeded and was missed in a migration. Doc §6.2.

## F2 — `cancelled` event slug referenced by code, missing from `crm_statuses` (MEDIUM)

Three RPCs (`register_lead_to_event`, `move_attendee_between_events`, `sync_lead_status_from_attendee`) guard against `e.status IN (..., 'cancelled')`. Operators cannot reach this state — `cancelled` is not in `crm_statuses` for `entity_type='event'`. The guards are dormant. If a future change ever does set an event to `cancelled`, the guards will fire — but until then they're noise. Doc §6.2.

## F3 — `quick_registration` and `manual_registration` attendee slugs exist but no writer (MEDIUM)

Both slugs are seeded in `crm_statuses` and both are explicitly mapped in `sync_lead_status_from_attendee`'s CASE expression (→ `lead.confirmed`). But every code path I traced (`register_lead_to_event`, `quick-register/index.ts`, `event-register/index.ts`, automation rules' `post_action_attendee_upsert`) writes a *different* field — `registration_method` — to those values, not `status`. So the slugs exist as configuration but have no producer. Two possibilities:

1. The mapping in `sync_lead_status_from_attendee` is wrong — it should be matching `registration_method`, not `status`.
2. There's a code path I missed that does write `status='quick_registration'`.

Worth a focused investigation. Doc §6.1, §5.1.

## F4 — Direct `.update({status})` writes bypass `sync_lead_status_from_attendee` (HIGH)

`crm-attendee-cancel.js` writes `status='cancelled'` directly to `crm_event_attendees` without calling `sync_lead_status_from_attendee`. After a cancel, the lead row keeps stale `status='confirmed'` (or whatever it was before the cancel) until something else triggers a re-sync. Examples of "something else":

- Another attendee row created/updated for the same lead.
- An automation rule with `post_action_status_update` for that lead.
- A manual operator status change.

If none of those happen, the lead stays out of sync indefinitely. This is a silent inconsistency, not a crash. Doc §6.4.

## F5 — `crm_status_change_events` queue is attendee-only (MEDIUM, by design but worth flagging)

The queue framework is wired only for attendee changes. Lead status changes and event status changes do NOT pass through the queue — they go through the legacy in-process `automation-engine` dispatch. A monitoring tool reading the queue therefore sees 1/3 of the system's status-change volume. Either intentional (attendee was the pilot) or a half-finished rollout. Doc §5.4.

## F6 — `pending_terms` and `waiting` lead slugs share `sort_order=6` (LOW)

On both tenants, both slugs have `sort_order=6`. The dropdown order between them is non-deterministic depending on tie-break behavior. Doc §6.4.

## F7 — `crm_statuses.is_terminal` is unused for leads/attendees (LOW)

The column exists, but is `false` for every lead and attendee slug — even `not_interested` and `unsubscribed` which `sync_lead_status_from_attendee` treats as terminal in code. Either backfill the column to match code or drop the column for those entity types. Doc §6.6.

## F8 — `event_day_status_flip` cron excludes `planning`, not just terminal slugs (LOW)

The cron job that auto-flips events to `event_day` on event-date morning excludes `status NOT IN ('event_day','planning','closed','completed')`. Excluding `planning` is the surprise: an event that the operator left in draft state on its event date does NOT auto-advance. Probably intentional, but undocumented and operator-surprising. Doc §6.5.

## F9 — Lead `confirmed` vs `confirmed_verified` and `waiting` vs `waitlist` are visually ambiguous (LOW)

`confirmed` = lead has an active attendee row in `registered`/`confirmed`/`no_show`/etc. `confirmed_verified` = lead actually attended/purchased. Operators can't tell the difference from the Hebrew label alone. Same for `waiting` (between events) vs `waitlist` (currently on event overflow list). Doc §6.3.

## F10 — Two automation rules ("ידנית - לא שילם" / "ידנית - שילם") test `payment_status` values in a `status` slot (MEDIUM)

The two rules condition on `trigger_event='moved'`, `trigger_condition={type:'status_equals', status:'unpaid'/'paid'}`. Those values are payment_status values, not main-status values. If the `attendee_moved` dispatcher passes `payment_status` into the `newStatus` slot of `triggerData`, this works; otherwise the rules silently never fire. The condition evaluator (`engine.ts:28`) reads `data.newStatus ?? data.outcome ?? data.status` — depends entirely on what the dispatcher writes. Worth tracing once. Doc §6.7.

## F11 — Event-close recycle has two parallel paths to `lead.status='waiting'` (LOW)

The DB trigger `event_status_close_recycle_leads_fn` recycles `invited`+`attended` attendees' leads. The automation rules "שינוי סטטוס: אירוע נסגר" (disabled) + "שינוי סטטוס: אירוע הושלם" (active) do the same via `post_action_status_update='waiting'` on different recipient scopes. Two paths, same target. If the operator disables the rule expecting recycle to stop, the trigger still recycles. If they re-enable expecting recycle to happen, the rule runs on a different recipient set than the trigger does. Doc §5.2.

---

## Suggested follow-up SPECs (NOT authored here)

- **SPEC-A: Reconcile `crm_statuses` with code-referenced slugs.** Decide for each: add the row, remove the code reference, or rename. Covers F1, F2, F3 partially.
- **SPEC-B: Make every attendee status write call `sync_lead_status_from_attendee`.** Either via a DB trigger (cleanest) or via mandatory client-side discipline. Covers F4.
- **SPEC-C: Backfill `crm_statuses.is_terminal` from code, then enforce in CI.** Covers F7.
- **SPEC-D: Rename ambiguous slugs.** Covers F9, and the `pending_terms`/`waiting` collision F6.
- **SPEC-E: Investigate F10 (payment_status vs status confusion in two active automation rules).** Read the `attendee_moved` dispatcher in `crm-attendee-move.js` and confirm what flows into `triggerData.newStatus`.
- **SPEC-F: Extend `crm_status_change_events` to lead + event producers.** Then decommission the legacy in-process dispatch. Covers F5.
