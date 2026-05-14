# Legacy Dispatch Inventory — 2026-05-14

**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_LEGACY_DISPATCH_DECOMMISSION_BRIEF.md`
**Pipeline:** Full Auto Pipeline (overnight, single Claude Code chat, Opus)
**Phase:** 1 — Discovery
**Master safety tag:** `pre-legacy-dispatch-decommission-2026-05-14` @ commit `24409fd063072cd620a27d5fdec4b69156d2c17d`
**Result:** Discovery complete. Phases 2–4 blocked by Brief premise issues. See companion escalations.

---

## 1. Live grep result for the literal symbol the Brief asks to decommission

The Brief §1 names the legacy entry point as `CrmAutomation.evaluate(...)`. The exact symbol no longer exists in the live codebase:

```
ripgrep: CrmAutomation\.evaluate\(   →   0 source-code matches
                                          (only string-literal mentions in comments)
```

The actual live legacy entry-point symbol is **`CrmAutomationClient.evaluate(...)`** — introduced by `M4_AUTOMATION_ENGINE_SERVER_SIDE` Rung 2 (per the docstring of `modules/crm/crm-automation-client.js`). `CrmAutomationClient` is a thin browser wrapper that calls the server-side `automation-engine` Edge Function with a synchronous evaluate→preview-modal→dispatch round-trip.

The Brief's *spirit* is correct: there is a synchronous, browser-driven, modal-gated dispatch path that runs in parallel with a DB-trigger → queue → cron-consumer path. The naming has just drifted.

## 2. Live in-process callsites — the 5 sites

| # | File | Line | Trigger string | Triggering operator action |
|---|---|---|---|---|
| 1 | `modules/crm/crm-attendee-move.js` | 111 | `'attendee_moved'` | Operator clicks "העברת משתתף" on an attendee row, picks new event, hits אשר |
| 2 | `modules/crm/crm-event-actions.js` | 217 | `'event_status_change'` | Operator changes event status (e.g., `draft` → `registration_open`) via `dispatchEventStatusMessages` |
| 3 | `modules/crm/crm-event-register.js` | 110 | `'event_registration'` | Operator (or storefront) registers a lead to an event; rule fires on the just-created attendee row |
| 4 | `modules/crm/crm-lead-actions.js` | 9 | `'lead_status_change'` | Operator changes a lead's status field via `fireLeadStatusAutomation` |
| 5 | `modules/crm/crm-lead-actions.js` | 143 | `'lead_intake'` | Operator creates a new lead via the lead-create form |

Notes:
- All 5 callsites use the same wrapper (`CrmAutomationClient.evaluate(triggerType, triggerData)` → `automation-engine` EF → `CrmConfirmSend` modal → operator decides → dispatch).
- All 5 are **interactive** — the modal is visible to the operator who picks one of: (a) "אישור ושלח הודעות" (approve + dispatch), (b) "אישור ללא הודעות" (approve, no message), (c) cancel.
- `crm-attendee-cancel.js`, `crm-coupon-dispatch.js`, `crm-payment-automation.js`, `crm-confirm-send.js`, `crm-automation-queue-send.js`, `crm-automation-recipient-resolvers.js`, `crm-automation-dispatch.js`, `crm-automation-engine.js`, `crm-automation-runs.js`, `crm-automation-post-actions.js` — referenced in earlier grepped lists — do NOT contain a direct `CrmAutomationClient.evaluate(...)` callsite. They reference the symbol only in docstrings or call sibling code paths that eventually flow into one of the 5 sites above.

The Brief's mention of `broadcast-send` and `attendee-cancel` as legacy callsites is **inaccurate**: cancellation flows via `crm-attendee-cancel.js` UPDATE → `trg_attendee_status_change_event` → queue (already queue-based, not legacy). `broadcast-send` is a separate one-shot dispatch path, not a `crm_automation_rules` evaluator.

## 3. Live `crm_automation_rules` rows on demo (tenant `8d8cfa7e-ef58-49af-9702-a862d459cccb`)

Active rules grouped by `trigger_entity.trigger_event`:

### attendee.created (i.e. `event_registration` callsite)
- `הרשמה: אישור הרשמה` — template `event_registration_confirmation`, condition `status_equals='registered'`, `is_active=true`
- `הרשמה: אישור רשימת המתנה` — template `event_waiting_list`, condition `status_equals='waiting_list'`, `is_active=true`

### attendee.moved (i.e. `attendee_moved` callsite — synthetic trigger; NO DB trigger fires this)
- `העברת משתתף ידנית - לא שילם` — template `event_attendee_moved_unpaid`, condition `status_equals='unpaid'`, `is_active=true`
- `העברת משתתף ידנית - שילם` — template `event_attendee_moved_paid`, condition `status_equals='paid'`, `is_active=true`

### attendee.status_change (i.e. queue-only, fired by `trg_attendee_status_change_event` on UPDATE)
- `צ'ק אין לאירוע` — template `check_in_event`, condition `status_equals='attended'`, `is_active=true`

### event.status_change (legacy callsite #2 + queue-fired in parallel)
- `שינוי סטטוס: ייפתח מחר` (will_open_tomorrow) — `is_active=true`
- `שינוי סטטוס: נפתחה הרשמה` (registration_open) — `is_active=true`
- `אירוע פתח להרשמה - הזמנת רשימת המתנה` (registration_open) — `is_active=true`
- `שינוי סטטוס: הזמנה חדשה` (invite_new) — `is_active=true`
- `שינוי סטטוס: 2-3 ימים לפני` (2_3d_before) — `action_type=queue_send`, `is_active=true`
- `שינוי סטטוס: יום אירוע` (event_day) — `action_type=queue_send`, `is_active=true`
- `שינוי סטטוס: הזמנה ממתינים` (invite_waiting_list) — `is_active=true`
- `שינוי סטטוס: אירוע הושלם` (completed) — template NULL, `is_active=true`
- `שינוי סטטוס: אירוע נסגר` (closed) — `is_active=false`
- `שינוי סטטוס: רשימת המתנה` (waiting_list) — `is_active=false`
- 2 `qa_redesign_test_rule_events` / `qa_round1_test_rule_events` — `is_active=false`

### lead.created (legacy callsite #5)
- `ליד חדש: ברוך הבא` — template `lead_intake_new`, condition `type=always`, `is_active=true`
- 2 QA test rules — `is_active=false`

### lead.status_change (legacy callsite #4)
- `שינוי סטטוס ליד: ברוך הבא לרשומים` — `is_active=false` (active rule list is empty)
- 1 QA test rule — `is_active=false`

**Total active rules across the 5 trigger categories:** 16. Well under the Brief's `~30` halt threshold.

## 4. Queue-producer coverage analysis

The Brief assumes "the queue framework will fire for the same triggering event". Live triggers in the DB:

| Trigger name | Table | Timing | Event | Body guard |
|---|---|---|---|---|
| `trg_attendee_status_change_event` | `crm_event_attendees` | AFTER | UPDATE | `IF OLD.status IS DISTINCT FROM NEW.status THEN ...` |
| `trg_event_status_change_event` | `crm_events` | AFTER | UPDATE | `IF OLD.status IS DISTINCT FROM NEW.status THEN ...` |
| `trg_lead_status_change_event` | `crm_leads` | AFTER | UPDATE | `IF OLD.status IS DISTINCT FROM NEW.status THEN ...` |

**No `AFTER INSERT` triggers exist on any of the three tables.** **No trigger captures attendee MOVE (event_id change without status change).**

### Coverage matrix — 5 callsites × queue-producer status

| # | Callsite | Synthetic trigger string | Live DB queue-producer that would fire instead | Status |
|---|---|---|---|---|
| 1 | `crm-attendee-move.js:111` | `attendee_moved` | NONE — `trg_attendee_status_change_event` is guarded on `status` delta, not `event_id` delta. The 2 active "moved" rules condition on `status_equals='unpaid|paid'` — they fire when the operator moves an attendee whose status didn't change, so the queue path would silently miss them. | ❌ NO PARITY |
| 2 | `crm-event-actions.js:217` | `event_status_change` | `trg_event_status_change_event` — exists, fires in parallel today (per `crm-automation-engine.js` line 38–44 comment) | ✅ COVERED |
| 3 | `crm-event-register.js:110` | `event_registration` | NONE — no INSERT trigger on `crm_event_attendees`. The live `trg_attendee_status_change_event` is UPDATE-only and would not fire when a new attendee row is created. | ❌ NO PARITY (DDL needed) |
| 4 | `crm-lead-actions.js:9` | `lead_status_change` | `trg_lead_status_change_event` — exists, fires in parallel today | ✅ COVERED |
| 5 | `crm-lead-actions.js:143` | `lead_intake` | NONE — no INSERT trigger on `crm_leads`. | ❌ NO PARITY (DDL needed) |

**Net coverage: 2 of 5 callsites can be decommissioned today without schema work. 3 of 5 require DDL.**

## 5. UX impact — the modal that the Brief doesn't mention

All 5 legacy callsites today route through `CrmConfirmSend.show(planItems, onChoice)` — the operator sees a 3-button preview modal with the resolved recipient list and template payload **before** any message dispatches. The operator can:
- Approve + dispatch (default action),
- Approve without messages (run post-actions but skip dispatch),
- Cancel entirely.

The queue path has **no operator confirmation modal**. The DB trigger writes to `crm_status_change_events`; the pg_cron consumer evaluates rules and dispatches automatically. There is currently no UI bridge that surfaces the queue's pending dispatches for operator approval.

Decommissioning the legacy callsites without addressing this changes the **user-facing operator semantics from "preview-and-approve" to "fire-and-forget"** for every legacy callsite. The Brief is silent on this. This is a Brief-level UX policy decision Daniel must make explicitly before any callsite can be removed.

The author of the most recent extension (`M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION`, 2026-05-14) explicitly acknowledged this in `crm-automation-engine.js` lines 38–44:

> M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION (2026-05-14): lead_status_change AND
> event_status_change ALSO route through the queue now (DB triggers
> trg_lead_status_change_event + trg_event_status_change_event). The legacy
> in-process dispatch (crm-lead-actions.js, crm-event-actions.js direct
> CrmAutomationClient.evaluate calls) **still runs in parallel — both paths
> are active intentionally**; the queue path is a decoupled bus for monitoring
> and future-rule wiring.

The "intentionally both paths" sentence is the smoking gun: the most recent SPEC author kept both paths because they were doing different jobs (operator-facing UX vs. server-side bus), not because the migration was incomplete. The Brief's premise — that one path is "legacy" and the other is its drop-in replacement — was true at the architecture-decision level (eventual goal: queue-only) but is **not yet true at the implementation level** (modal UX is still operator-required).

## 6. Migration plan table (per Brief §3 Phase 1 step 3)

| Rule slug | Legacy callsite | Queue equivalent | Migration action | Smoke needed |
|---|---|---|---|---|
| `event_registration_confirmation` | `crm-event-register.js:110` | NONE — no INSERT trigger | **Blocked: DDL required (Brief §2.6)** | n/a |
| `event_waiting_list` (attendee.created) | `crm-event-register.js:110` | NONE — no INSERT trigger | **Blocked: DDL required (Brief §2.6)** | n/a |
| `event_attendee_moved_unpaid` | `crm-attendee-move.js:111` | NONE — no MOVE trigger | **Blocked: DDL required (Brief §2.6)** | n/a |
| `event_attendee_moved_paid` | `crm-attendee-move.js:111` | NONE — no MOVE trigger | **Blocked: DDL required (Brief §2.6)** | n/a |
| `event_will_open_tomorrow` | `crm-event-actions.js:217` | `trg_event_status_change_event` | Disable legacy callsite **iff** UX-modal regression is acceptable to Daniel | Yes (modal removal smoke) |
| `event_registration_open` (×2) | `crm-event-actions.js:217` | `trg_event_status_change_event` | Same as above | Yes |
| `event_invite_new` | `crm-event-actions.js:217` | `trg_event_status_change_event` | Same as above | Yes |
| `event_2_3d_before` (queue_send) | `crm-event-actions.js:217` | `trg_event_status_change_event` | Same as above | Yes |
| `event_day` (queue_send) | `crm-event-actions.js:217` | `trg_event_status_change_event` | Same as above | Yes |
| `event_invite_waiting_list` | `crm-event-actions.js:217` | `trg_event_status_change_event` | Same as above | Yes |
| `event_completed` (template NULL) | `crm-event-actions.js:217` | `trg_event_status_change_event` | Same as above | Yes |
| `lead_intake_new` (active) | `crm-lead-actions.js:143` | NONE — no INSERT trigger | **Blocked: DDL required (Brief §2.6)** | n/a |
| (none active for lead.status_change) | `crm-lead-actions.js:9` | `trg_lead_status_change_event` | Disable legacy callsite — no active rules to break, but UX modal is still removed for any future rule | Yes (modal removal smoke) |

**Tally:**
- 5 rules: blocked by missing INSERT/MOVE trigger (DDL needed → Brief §2.6 escalation)
- 8 rules + the no-rule lead_status_change callsite: technically migrate-able, but only after Daniel approves the modal-UX regression at the Brief level

## 7. Decision sent to Daniel for morning review

The Pipeline halts the migration phases (2, 3, 4) and writes:

- This inventory (Phase 1 deliverable).
- A meta-escalation describing the Brief-premise issues (`escalations/2026-05-14T00-30Z_LEGACY_DISPATCH_DECOMMISSION_BRIEF_PREMISE_BLOCKER.md`).
- A morning summary with NO-GO verdict and a recommended Brief revision (`docs/audits/LEGACY_DISPATCH_DECOMMISSION_SUMMARY_2026_05_14.md`).

No code was modified. The safety tag `pre-legacy-dispatch-decommission-2026-05-14` is unused.

---

*End of Phase 1 inventory.*
