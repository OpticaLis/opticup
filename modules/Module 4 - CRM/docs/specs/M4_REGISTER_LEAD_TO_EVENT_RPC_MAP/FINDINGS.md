# FINDINGS — M4_REGISTER_LEAD_TO_EVENT_RPC_MAP

> All findings below were surfaced by the read-only diagnostic; **zero of them required mid-run escalation** (none cleared the §5 stop-trigger threshold of "constitutes a live production bug" requiring immediate halt). Each is queued for follow-up via the suggested next action.

---

## FIND-1 — MEDIUM — Fresh-insert over-capacity branch returns hardcoded `'waiting_list'` even when row was inserted as `'event_closed'`

**Severity:** MEDIUM
**Location:** `RPC_BODY.sql` L70–L73 (the over-capacity fresh-INSERT terminal)

### Description

In the fall-through branch where no existing same-event row exists for the lead AND `v_current_count >= v_event.max_capacity`, the RPC INSERTs the new attendee row with:

```sql
status = CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END
```

…but its `RETURN jsonb_build_object(...)` payload at L73 hardcodes the field literally:

```sql
RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'waiting_list');
```

The literal `'waiting_list'` is returned even when the inserted row has status `'event_closed'` (i.e., when `v_event.status='closed'` AND capacity is full).

### Why it is not a P0 production bug

- **Triggered only on a narrow corner case:** event must be both `status='closed'` AND at-or-over `max_capacity` AND the lead must have no existing same-event row AND no waiting/invited row on a different active event (else the auto-move branch wins). In practice, `closed` events typically have their public form gated upstream — but the RPC is the canonical attendee writer for staff actions too, so this branch IS reachable.
- **Callers don't fork on the distinction in a destructive way:**
  - ERP `crm-event-register.js:87` only fires `checkAndAutoWaitingList` when `data.status === 'registered'`. The hardcoded `'waiting_list'` correctly does NOT match, so no spurious auto-promotion.
  - event-register EF returns `result.status` to storefront, which renders a "waiting list" message — user is misinformed but the DB row state is preserved.
  - quick-register EF same as above.
- **DB row state is authoritative.** Staff dashboards reading `crm_event_attendees.status` directly see the correct `event_closed`. Reporting and downstream automations key off the row state, not the RPC return.

### Counter-check: existing-invited promote branch DOES return the correct status

L44–L50 uses the variable `v_promote_status` (assigned by the same `CASE WHEN` construct) and returns it. That branch is consistent. The bug is ONLY on the fresh-INSERT path. A 1-line fix (return `v_promote_status` here too) would close it.

### Suggested next action

**New follow-up SPEC** (small, ~15 minutes): `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX`. Migration recreates the function with the literal `'waiting_list'` swapped for a CASE expression or a captured variable. Smoke: 1 demo event set to `status='closed'` + `max_capacity=1` with 1 registered attendee; register a fresh lead → expect RPC return `status='event_closed'`, attendee row `status='event_closed'`. Today this returns `status='waiting_list'`. Bundle with the M4 cleanup sweep when scheduled.

---

## FIND-2 — MEDIUM — RPC writes no structured touchpoint / journey log; only mutates state

**Severity:** MEDIUM (architectural debt blocking Phase 4 E1 + partial E7 per FUNNEL_ROADMAP)
**Location:** Whole RPC body — every terminal branch.

### Description

The RPC mutates `crm_event_attendees` and (via `sync_lead_status_from_attendee`) `crm_leads.status` but writes no row to any structured journey-event table. The closest existing capture is the `crm_status_change_events` table (populated by triggers on attendee + lead status flips per `STATUS_CHANGE_TRIGGERS_FRAMEWORK`, 2026-05-13). That table:

- Captures status FLIPS (old → new), good for state-transition analytics.
- Does NOT capture semantic context: e.g. "registered → event_closed" via fresh-insert vs. "registered → event_closed" via invited promotion look identical in the event stream.
- Does NOT capture per-touchpoint attribution (UTM, broadcast_id, ad_creative_id, etc.). Today UTMs live on `crm_leads.utm_*` (single-bag, last-write-wins) and Phase 1 P1.1 is queued to fix UTM persistence — but Phase 4 E1 needs PER-TOUCHPOINT capture (i.e., every registration is one event in a journey with its own attribution).
- Does NOT capture cross-tenant or device-level context that elite-tier MTA would consume.

### Why this is structural, not a bug

The RPC was designed to be a state mutator (Iron Rule 11 atomic capacity gate). Adding journey-event writes inside it would couple the registration RPC to a future analytics schema that doesn't exist yet.

### Suggested next action

**Phase 1 P1.1 SPEC** (`M3_UTM_TRIPLE_LAYER_PERSISTENCE`) — the upstream lead-intake EF should write a touchpoint row per arrival (not per registration). The registration RPC remains state-mutator only; touchpoint capture lives upstream. **Foreman authors of P1.1 must verify this design before sealing P1.1.**

Alternatively: extend `crm_event_attendees` with `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `broadcast_id`, `acquisition_referrer` columns and have THIS RPC capture them from a per-call context (a new context-passing parameter or a temporary settings GUC). Architect to decide between (a) upstream touchpoint table vs (b) per-attendee attribution columns. **Both are valid; pick before P1.1 ships.**

This finding is the foundational data-architecture decision behind Funnel Phase 4 — log it in `MASTER_ROADMAP.md` cross-module debt log if Architect prefers to surface it at that level.

---

## FIND-3 — LOW — Soft-delete revival branch IGNORES capacity

**Severity:** LOW (intentional per current discipline, but worth documenting)
**Location:** `RPC_BODY.sql` L53–L58 (`is_deleted=true` → un-soft-delete branch)

### Description

When an attendee row exists for the (lead, event) pair AND `is_deleted=true`, the RPC reactivates the row with `status='registered'` UNCONDITIONALLY — it does NOT re-check `v_current_count` against `v_event.max_capacity`. This means a revival can overflow capacity.

### Why it is intentional

Soft-delete revival is implicitly a privileged operator action (staff manually un-deletes a row). The original delete presumably happened because of cancellation/uninterested, and revival means "the lead is back in" — capacity should accommodate the revival because the row was already counted before its delete. **But:** the row was probably NOT being counted while it was deleted (`is_deleted=false` filter applies to the COUNT). So a revival CAN overflow if cancelled rows were filled in by waiting-list promotions in between.

### Why this is currently LOW

- No production incident has been reported tied to over-capacity revivals.
- Staff revival is rare and typically supervised.
- Existing waiting-list logic still picks up the next-in-line per `checkAndAutoWaitingList` if a revival triggers a future cancellation.

### Suggested next action

**TECH_DEBT entry** in `TECH_DEBT.md`. Defer fix until either (a) Phase 3 status-column-split SPEC touches this code path, or (b) a production incident makes it urgent. Suggested fix: add capacity check + downgrade to `waiting_list` if over.

---

## FIND-4 — LOW — Return shape contract is undocumented; `fee_mismatch` field is only present on `auto_moved` path

**Severity:** LOW (documentation gap)
**Location:** `RPC_BODY.sql` L29–L32 (auto-move terminal) plus all other terminals.

### Description

The RPC's return shapes are not documented in `docs/GLOBAL_MAP.md`, `MODULE_SPEC.md`, or any contract file. Callers learn the shape by reading the RPC body. The field set varies by branch:

- `{success, error, error_code?}` on failures
- `{success, attendee_id, status}` on most successes
- `{success, auto_moved, attendee_id, status, fee_mismatch}` on auto-move
- `{success, error, attendee_id}` on `already_registered`

Specifically `fee_mismatch` only appears on the auto-move terminal — a caller relying on `result.fee_mismatch` from any other branch would silently get `undefined`.

### Suggested next action

**Documentation-only SPEC** (~15 minutes): add a "RPC return-shape contract" section to `modules/Module 4 - CRM/docs/MODULE_SPEC.md` listing each terminal's return shape (the table in `STATE_TRANSITIONS.md §3` of this SPEC is a good starting point). Could be folded into the next M4 doc-refresh SPEC.

---

## FIND-5 — INFO — Resubscribe-on-register clears `unsubscribed_at` but emits no audit event

**Severity:** INFO
**Location:** `RPC_BODY.sql` L20–L21 (the unconditional UPDATE on `crm_leads.unsubscribed_at`)

### Description

The RPC clears `crm_leads.unsubscribed_at` for any lead being registered (matches only rows where `unsubscribed_at IS NOT NULL`). This is the documented resubscribe-on-register pattern (`STATUS_MODEL.md:160`). However:

- `STATUS_CHANGE_TRIGGERS_FRAMEWORK` captures `crm_leads.status` flips into `crm_status_change_events` — but `unsubscribed_at` is a separate column. There is no trigger on `unsubscribed_at` column changes.
- `ActivityLog` is a client-side helper (`shared/js/activity-logger.js`) — not called from server-side RPCs.

Result: a lead's resubscribe-via-registration event is invisible to audit trails. If a future compliance audit asks "when was this lead resubscribed and why?", the answer requires inferring from a registration row's `created_at` + `crm_leads.updated_at`.

### Why it is INFO not LOW

- The RPC sets `updated_at = now()` on the lead row, so the timestamp IS recoverable.
- The downstream registration also creates an attendee row with a timestamp, which is implicit proof of resubscribe.
- Compliance has not asked for this trail yet.

### Suggested next action

**TECH_DEBT entry** in `TECH_DEBT.md` (M4-AUDIT-01 or similar). Worth surfacing when the M4 audit cycle next refreshes — if Phase 4 brings GDPR-like requirements, this becomes a higher priority.

---

## FIND-6 — INFO — Auto-move branch routes to a DIFFERENT-event row with `ORDER BY created_at DESC LIMIT 1`

**Severity:** INFO
**Location:** `RPC_BODY.sql` L22–L26 (the other-event probe)

### Description

The auto-move probe selects the **most recently created** waiting_list/invited row from a different event when multiple candidates exist. This means if a lead is on the waiting list for events A (created 2026-05-01) and B (created 2026-05-10), and registers to event C — the RPC moves the B row to C, not the A row.

### Why this is INFO

- Likely intentional (most-recent-first matches typical recency-bias UX).
- Documented in `STATE_TRANSITIONS.md §2` row L22–L26.
- No production incident reported.

### Suggested next action

None — document only. If business logic wants oldest-first ("first-come-first-served" precedence), it would be a 1-token change but no signal that this is wrong today.

---

## FIND-7 — INFO — Storefront repo grep deferred (no local checkout on this Windows machine)

**Severity:** INFO (process gap, not a code issue)
**Location:** n/a — process observation.

### Description

The Brief §1.3 + SPEC §6.5 call for a grep of the sibling `opticup-storefront/` repo for any direct invocation of `register_lead_to_event`. The Executor did not perform this grep on this machine because the storefront repo is not checked out locally adjacent to this working tree (no `../opticup-storefront/` sibling directory). However:

- The architecture explicitly forbids storefront → DB direct table access (Iron Rule 13). Storefront reaches the RPC only through `event-register` EF or `quick-register` EF (both grep'd in this repo).
- A direct `db.rpc('register_lead_to_event', ...)` call from the storefront would violate Iron Rule 13 — which means even if such a call existed, it would already be a known violation tracked elsewhere.

### Suggested next action

The next Foreman session that runs from a machine with both repos checked out can confirm via `grep -rn register_lead_to_event ../opticup-storefront/src/` (expected: 0 hits). If non-zero — log as Rule 13 violation and open a SPEC. No-op otherwise.

---

## Summary Table

| ID | Severity | Class | Suggested next action |
|---|---|---|---|
| FIND-1 | MEDIUM | RPC return-shape bug (corner case) | New small SPEC `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX` (~15 min) |
| FIND-2 | MEDIUM | Architectural — blocks Phase 4 E1 / partial E7 | Foreman authors of P1.1 (`M3_UTM_TRIPLE_LAYER_PERSISTENCE`) must address |
| FIND-3 | LOW | Soft-delete revival ignores capacity | TECH_DEBT entry; deferrable |
| FIND-4 | LOW | Return shape undocumented | Documentation patch — fold into next M4 doc-refresh SPEC |
| FIND-5 | INFO | Resubscribe leaves no audit row | TECH_DEBT entry; revisit at compliance audit |
| FIND-6 | INFO | Auto-move "most recent wins" — documented | None |
| FIND-7 | INFO | Storefront repo grep deferred | Next session with both repos verifies |

**Counts:** 0 CRITICAL · 0 HIGH · 2 MEDIUM · 2 LOW · 3 INFO · **7 total.**

**No findings cleared the §5 stop-trigger threshold of "constitutes a live production bug" requiring escalation.** FIND-1 is real but narrow; FIND-2 is architectural debt. Both are queued for follow-up SPECs; this diagnostic was completed end-to-end.

---

*End of FINDINGS.md.*
