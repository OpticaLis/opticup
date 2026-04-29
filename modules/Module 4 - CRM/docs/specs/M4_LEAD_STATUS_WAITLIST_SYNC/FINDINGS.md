# FINDINGS — M4_LEAD_STATUS_WAITLIST_SYNC

## F1 — `crm_event_attendees` has no `updated_at` column

- **Severity:** MEDIUM
- **Location:** `crm_event_attendees` schema
- **What happened:** Discovered when the sync RPC's `ORDER BY updated_at` errored. The table uses state-specific timestamps (registered_at, confirmed_at, checked_in_at, purchased_at, paid_at, refund_requested_at, refunded_at) instead of a general updated_at.
- **Suggested action:** Future SPECs touching this table must NOT assume updated_at exists. Add to `db-schema.sql` for visibility OR add a generated `updated_at` column via trigger (cross-tenant DDL — separate SPEC). Doesn't block any active flow.

## F2 — Rung 2 used Hebrew attendee statuses; canonical is English (carry-over)

- **Severity:** HIGH (would have made all the Rule 2.2/2.4 rules inert at runtime)
- **Location:** `crm_automation_rules.action_config.post_action_attendee_upsert.status` for 3 rules + `lead-intake/dispatch.ts` upsert
- **What happened:** Rung 2 SPEC referenced `'הוזמן'` for attendee status; canonical attendee enum is English (registered, waiting_list, confirmed, attended, etc.). Hebrew names live in `crm_statuses.name_he`.
- **Resolution:** Fixed in this micro-SPEC's commit — 4 rules updated to 'invited', 'invited' slug added to crm_statuses.attendee on demo (name_he='הוזמן'), engine code + EF code aligned. Documented in proposal 2 above.
- **Suggested action:** Closed.

## F3 — Backfill no-op on current demo because no live attendee rows

- **Severity:** INFO
- **Location:** demo tenant
- **What happened:** All 6 demo leads went to `waiting` (default). No actual sync from attendee state because no attendee rows exist on active events.
- **Suggested action:** None. Real verification will come at Rung 3 smoke / Daniel's manual demo testing once EFs deploy.

---

*End of FINDINGS — 3 findings, 1 medium, 1 high (resolved in same commit), 1 info.*
