# SPEC — M4_ATTENDEE_PAYMENT_AUTOMATION

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_AUTOMATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Cowork session 2026-04-25
> **Authored on:** 2026-04-25
> **Module:** 4 — CRM
> **Phase:** Payment lifecycle SPEC #3 of 3 (closes the trio)
> **Predecessor SPECs (closed):** `M4_ATTENDEE_PAYMENT_SCHEMA` (`ddad783`), `M4_ATTENDEE_PAYMENT_UI` (`fd38982` + F1 `46e9877`), `M4_EVENT_DAY_PARITY_FIX` (`8318372` + F1 `55cdbed`)

**Executor TL;DR (1 sentence):** Wire two automations into the existing `CrmAutomation.evaluate` engine — (1) when an event flips to `completed` (NOT `closed` — see §1.1), all attendees in `pending_payment` who didn't check in get auto-flipped to `unpaid`; (2) when a lead registers for a new event AND has an open `credit_pending` attendee whose `credit_expires_at` is in the future, call the existing `transfer_credit_to_new_attendee` RPC to move the credit forward — no new tables, no new RPCs, just engine wiring + 1 helper module + 1 SQL migration to backfill any `completed` events that were missed.

---

## 1. Goal

Two automations, both fully wired into existing infrastructure:

### 1.1 Auto-mark `unpaid` when event is completed

When an event's `status` flips to `'completed'`, every attendee on that event whose `payment_status='pending_payment'` AND who did NOT check in (`checked_in_at IS NULL`) gets auto-flipped to `payment_status='unpaid'`.

**Important — `closed` is NOT a trigger.** Daniel clarified: `closed` means "registration closed because all coupons issued" (event hasn't happened yet, attendees may still pay). Only `completed` means "the event ran, it's over". Auto-flipping at `closed` would prematurely mark people as defaulters.

This happens via a new helper module `crm-payment-automation.js` invoked from `crm-event-actions.js`'s existing `fireEventStatusAutomation` path, AFTER the existing `CrmAutomation.evaluate` call. The existing automation engine handles message dispatch (if any rules use the new event status); this helper handles the payment-status side-effect.

Trigger ONLY on the transition INTO `completed` (not on every save, not on `closed`). The helper checks `oldStatus !== 'completed' AND newStatus === 'completed'`.

### 1.2 Auto-transfer credit on new registration

When a lead registers for a new event (via `crm-event-register.js`'s `registerLeadToEvent`), AFTER the new attendee row is created, the helper checks: does this lead have any other attendee row with `payment_status='credit_pending'` AND `credit_expires_at > now()`?

If YES — call `transfer_credit_to_new_attendee(<old_attendee_id>, <new_attendee_id>)` (the RPC built in SPEC #1). The RPC atomically flips the new row to `paid` and the old row to `credit_used`.

If MULTIPLE credit_pending rows exist — use the OLDEST `credit_expires_at` (FIFO). If the lead has 2 open credits and registers for 1 new event, only 1 credit transfers; the other stays `credit_pending` for next time.

### 1.3 Backfill task (one-shot)

Demo's 13 attendees include events that are already in `completed`/`closed` status but whose attendees were not auto-flipped (because the automation didn't exist when they closed). One SQL pass at SPEC start backfills them: for every closed/completed event on demo, flip `pending_payment` + no checkin → `unpaid`.

This is one-time cleanup, not part of the ongoing automation.

---

## 2. Background & Motivation

### 2.1 What SPEC #1 + #2 left us with

After SPECs #1 and #2:
- **Schema:** 7 payment_status values, `credit_expires_at`, `transfer_credit_to_new_attendee(uuid, uuid)` RPC, full type safety. ✓
- **UI:** Action panel for paid/refund/credit transitions. Bell + tier 2 highlight for credit warning. Coupon 3-state pills. Parity across event-detail + event-day-manage. ✓
- **What's missing:** the **automatic** transitions. Today, every payment status change is manual:
  - Daniel must remember to mark `unpaid` after each event ends. Easy to forget.
  - Daniel must remember to credit-transfer when a lead with open credit registers for a new event. The credit just sits at `credit_pending` until manually moved — defeating the entire purpose of the credit feature.

This SPEC closes the loop: schema → UI → automations.

### 2.2 Daniel's strategic decisions for this SPEC

| # | Decision | Source |
|---|---|---|
| Q1 | Auto-flip `unpaid` triggers ONLY on manual transition to `completed`. NOT `closed` (see §1.1 — `closed` is mid-lifecycle, attendees may still pay). | Daniel approved the strict scope: only `completed`. |
| Q2 | Credit transfer is FIFO when multiple credits exist on one lead. | Foreman default — Daniel didn't specify; FIFO is the safest "first-in-first-out" semantics. |
| Q3 | Credit transfer fires inside `registerLeadToEvent` flow, BEFORE registration confirmation message. | Foreman default — so the confirmation message can use updated payment state (avoids "you owe deposit" message when actually credit transferred). |
| Q4 | Backfill of historical closed events runs once at SPEC start, not as ongoing job. | Foreman default — historical state is not part of the engine. |

If Daniel disagrees with Q2/Q3/Q4 — pause SPEC, revise.

### 2.3 Why the helper module (not engine modification)

The `CrmAutomation.evaluate` engine is the contract for `lead-intake` EF, `event-register` EF, and `createManualLead`. Modifying its core dispatch logic risks all of those. Instead, this SPEC adds a thin `crm-payment-automation.js` helper module that:
- Exposes `markUnpaidForClosedEvent(eventId, oldStatus, newStatus)` — called from `fireEventStatusAutomation` after the engine finishes.
- Exposes `transferOpenCreditOnRegistration(leadId, newAttendeeId)` — called from `dispatchRegistrationConfirmation` BEFORE the engine.

The engine remains untouched. The helper does its own DB writes.

### 2.4 Cross-tenant scope

Like all prior payment SPECs: helper module + backfill is cross-tenant by code, but Prizma has 0 attendees so backfill only affects demo. Future Prizma activation gets the same logic for free.

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value.

### 3.1 File & repo state

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state | clean | `git status` |
| 2 | Commits produced | exactly 4 | `git log origin/develop..HEAD --oneline \| wc -l` |
| 3 | New `crm-payment-automation.js` size | between 100 and 180 lines | `wc -l` |
| 4 | Modified `crm-event-actions.js` size | within 5 lines of pre-SPEC (~349) | `wc -l` |
| 5 | Modified `crm-event-register.js` size | within 5 lines of pre-SPEC (~150) | `wc -l` |
| 6 | `crm.html` script tag added | 1 new script for `crm-payment-automation.js`, immediately after `crm-payment-helpers.js` | grep |
| 7 | All CRM JS files ≤350 lines (Rule 12) | 0 violations | `find` |
| 8 | Integrity gate | exit 0 | `npm run verify:integrity` |
| 9 | Pre-commit hooks pass | all pass | git commit |
| 10 | New migration file | 1 file (backfill) | `ls modules/Module\ 4\ -\ CRM/migrations/2026_04_25_payment_backfill_*.sql \| wc -l` → 1 |

### 3.2 Behavioral — auto-unpaid on event close

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 11 | After event flips to `completed`, all `pending_payment` attendees with `checked_in_at IS NULL` become `unpaid` | SQL count | QA path 2 |
| 12 | After event flips to `closed` — **NO auto-flip happens** | attendees stay in `pending_payment` | QA path 2b |
| 13 | Attendees with `checked_in_at IS NOT NULL` are NOT touched | their payment_status unchanged | QA path 2 |
| 14 | Attendees with `payment_status='paid'` are NOT touched | unchanged | QA path 2 |
| 15 | Attendees with `payment_status='credit_used'` are NOT touched | unchanged | QA path 2 |
| 16 | Trigger fires only on transition INTO completed/closed | re-saving an already-closed event with same status does NOT re-flip | QA path 3 |
| 17 | Console clean during transition | 0 errors | QA path 2 |

### 3.3 Behavioral — auto-transfer credit on new registration

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 18 | Lead with 1 open `credit_pending` registers for new event → new attendee gets `paid`, old gets `credit_used` | SQL row state via RPC | QA path 4 |
| 19 | Lead with 2 open `credit_pending` rows → only the OLDEST `credit_expires_at` transfers (FIFO) | SQL row state | QA path 4 |
| 20 | Lead with 0 open credits → new attendee remains `pending_payment` (no transfer attempted) | normal flow unchanged | QA path 5 |
| 21 | Credit with `credit_expires_at < now()` (expired) → NOT transferred (treated as no credit) | new attendee remains pending_payment | QA path 4 |
| 22 | Credit transfer happens BEFORE registration confirmation dispatch | timestamp order: paid_at < message_log.created_at | QA path 5 |
| 23 | Bell badge updates after credit transfer | `CrmNotificationsBell.refresh()` invoked | QA path 4 |

### 3.4 Backfill

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 24 | Backfill SQL identifies attendees on completed/closed events with pending_payment + no checkin | report count | pre-flight + post-backfill SQL |
| 25 | Backfill flips them to `unpaid` | SQL state matches | post-backfill SQL |
| 26 | Backfill is idempotent (re-running has no further effect) | 0 rows affected on 2nd run | re-run test |

### 3.5 Backward compat

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 27 | `crm-automation-engine.js` untouched | git verify | git verify |
| 28 | `transfer_credit_to_new_attendee` RPC untouched | git verify | git verify |
| 29 | All 13 demo attendees still load + render correctly | smoke test | QA path 6 |
| 30 | All prior automations (the 13 demo rules) still fire correctly | spot check | QA path 7 |
| 31 | DB schema untouched (no new columns/tables) | git verify | `git diff --name-only origin/develop...HEAD migrations/` shows only the backfill file |

### 3.6 Documentation

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 32 | New entry in MODULE_MAP for crm-payment-automation.js | 1 entry | grep |
| 33 | SESSION_CONTEXT updated | new Phase History row + payment-trio CLOSED note | grep |
| 34 | CHANGELOG updated | new section at top | grep |
| 35 | EXECUTION_REPORT.md present | exit 0 | `test -f` |
| 36 | FINDINGS.md present (or absent with reasoning) | inspect | inspect |
| 37 | Push to origin | exit 0, HEAD synced | `git status -uno` |

---

## 4. Autonomy Envelope

### 4.1 What the executor CAN do without asking

- Read any file (Level 1).
- Read-only SQL (Level 1).
- Run **the backfill migration only** via `apply_migration` (Level 3 SQL — bounded scope, single file). NOT for any other DDL.
- Edit `crm-event-actions.js` and `crm-event-register.js` to wire helper calls (within bounds of §8).
- Create `modules/crm/crm-payment-automation.js` (within bounds of §8).
- Edit `crm.html` to add 1 script tag.
- Edit MODULE_MAP, SESSION_CONTEXT, CHANGELOG.
- Commit and push to develop per §9.
- Create QA test attendees on demo via UI flow (Level 2 write, bounded). Cleanup at QA close.
- Decide internal helper-function names, internal state shape — anything not externally visible.
- Decide exact wording of console logs (e.g., "auto-flipped X attendees to unpaid" vs other phrasing).

### 4.2 What REQUIRES stopping and reporting

- **Any DDL beyond the backfill migration.** No schema changes. STOP.
- **Any change to `crm-automation-engine.js`.** Engine is contract surface. STOP.
- **Any change to the `transfer_credit_to_new_attendee` RPC.** It was built in SPEC #1, this SPEC consumes it as-is. STOP.
- **Any new table or column.** STOP.
- **Any change to any existing automation rule in `crm_automation_rules`.** STOP.
- **Any edit to a file outside the §8 list.**
- **Any edit that pushes a CRM JS file ≥350 lines.** Critical.
- **Pre-commit hook failure** that you cannot diagnose in one read.
- **Integrity gate failure.** STOP.
- **Any Prizma write** beyond the (cross-tenant safe) backfill SQL which has WHERE clauses to scope to demo only. STOP if any UPDATE returns rows for non-demo tenants.
- **Any unfamiliar file appearing in `git status`** that wasn't created by you.
- **More than 4 commits OR fewer than 4.** §9 commit plan is exact.
- **Backfill UPDATE row count ≠ what was forecast in pre-flight.** If forecast says 8 rows and UPDATE affects 9 → STOP, something drifted.
- **Auto-unpaid fires on a status transition that wasn't completed/closed.** STOP, the trigger filter is broken.

### 4.3 SQL autonomy

- **Level 1 (read-only):** unrestricted on demo + prizma.
- **Level 2 (writes on demo only, bounded):** allowed for QA + backfill.
- **Level 3 (DDL):** ALLOWED ONLY for the single backfill migration via `apply_migration` MCP. Never raw `execute_sql` for DDL.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. **Auto-unpaid fires on any status other than `completed`.** The trigger filter must be exact: `newStatus === 'completed' AND oldStatus !== 'completed'`. Specifically: `closed`, `event_day`, `registration_open`, etc. must NOT trigger the helper. STOP if it fires elsewhere.
2. **Credit transfer attempted on a NEW attendee that's not in `pending_payment`** — e.g., the new attendee is already `paid`. The RPC will reject; if the helper retries or swallows the error silently → STOP. The helper must check `pending_payment` first.
3. **Credit transfer attempted with expired credit** (`credit_expires_at < now()`). The helper must filter expired credits BEFORE calling the RPC. If you find expired credits being passed → STOP.
4. **Multiple credits exist and a non-FIFO one is transferred.** The query must `ORDER BY credit_expires_at ASC LIMIT 1`. STOP if FIFO is broken.
5. **Backfill UPDATE touches Prizma rows.** Prizma has 0 attendees per SPEC #1 baseline, so the count should be 0. If non-zero → STOP and report (means baseline drifted).
6. **Tailwind CDN tag accidentally moved.** `grep "cdn.tailwindcss.com" crm.html | wc -l` must remain 1.
7. **More than 4 commits OR fewer than 4.** §9 is exact.
8. **Auto-unpaid causes a downstream automation to fire** (e.g., a future automation rule keyed on `payment_status='unpaid'`). Today no such rule exists, but if you find that the engine re-evaluates after the helper writes, STOP — the helper should write directly without triggering re-evaluation.

---

## 6. Rollback Plan

```
git reset --hard 8318372   # PARITY_FIX close commit
git push --force-with-lease origin develop  # ONLY with Daniel's explicit go-ahead
```

For DB rollback (if backfill went wrong):
```sql
-- Reverse backfill: any attendee on demo flipped to 'unpaid' by the backfill
-- can be restored to 'pending_payment' if needed.
-- Prerequisite: the backfill migration logs its target IDs.
UPDATE crm_event_attendees
   SET payment_status = 'pending_payment'
 WHERE id IN (<backfilled_ids>) AND payment_status = 'unpaid';
```

For QA cleanup:
```sql
UPDATE crm_event_attendees
   SET payment_status='pending_payment', paid_at=NULL, refund_requested_at=NULL,
       refunded_at=NULL, credit_expires_at=NULL, credit_used_for_attendee_id=NULL
 WHERE tenant_id='8d8cfa7e-…' AND id IN ('<qa_modified_ids>');

DELETE FROM crm_event_attendees WHERE tenant_id='8d8cfa7e-…' AND lead_id IN
  (SELECT id FROM crm_leads WHERE full_name LIKE 'QA%Automation%');
DELETE FROM crm_leads WHERE tenant_id='8d8cfa7e-…' AND full_name LIKE 'QA%Automation%';
```

Force-pushing to develop requires Daniel's explicit authorization.

---

## 7. Out of Scope (explicit)

- **New automations beyond the 2 specified.** No auto-refund-on-cancel, no auto-credit-expiry-cleanup, no payment reminder messages. Future SPECs.
- **Schema changes.** None.
- **`crm-automation-engine.js` modifications.** Helper module sits AROUND the engine, not inside it.
- **`transfer_credit_to_new_attendee` RPC modifications.** Consume as-is.
- **`payment_received` template editing.** Already shipped.
- **UI for "this lead has open credit" preview when registering.** Future SPEC if Daniel wants a visual warning before the credit auto-transfers.
- **Credit expiry auto-cleanup (`credit_pending` → `credit_used` after expiry).** Daniel explicitly chose 30-day notification + manual review (SPEC #2 bell), not auto-expiry. Out of scope.
- **Audit log of payment_status changes.** Future SPEC.
- **Renaming or removing `purchase_amount`/`cancelled_at`.** Orthogonal columns.

### Forward-flags

- **Future SPEC `M4_PAYMENT_REMINDERS`:** auto-send `payment_link` reminder to attendees in `pending_payment` 24h after registration. Out of scope here; would use existing automation engine.
- **Future SPEC `M4_CREDIT_EXPIRY_REVIEW`:** when a credit hits 7 days from expiry, escalate notification + add "extend / refund / let expire" UI action. Out of scope.
- **Future SPEC `M4_PAYMENT_HISTORY_VIEW`:** `crm_attendee_payment_log` table for full audit. Out of scope.

---

## 8. Expected Final State

### 8.1 New file: `modules/crm/crm-payment-automation.js` — target 110–170 lines

Module pattern: IIFE registering `window.CrmPaymentAutomation`. Owns the 2 automations.

Public API:

```javascript
window.CrmPaymentAutomation = {
  // Trigger: event status changed to 'completed' (NOT 'closed').
  // Side-effect: flip pending_payment + no checkin attendees → unpaid.
  // No-op if newStatus !== 'completed' or already was 'completed'.
  // Returns: { flipped: <count>, eventId: <uuid> }
  markUnpaidForCompletedEvent: async function (eventId, oldStatus, newStatus) { ... },

  // Trigger: lead just registered for a new event (newAttendeeId is the row).
  // Side-effect: if lead has open credit_pending with credit_expires_at > now(),
  // call transfer_credit_to_new_attendee RPC (FIFO).
  // Returns: { transferred: <bool>, oldAttendeeId: <uuid|null>, newAttendeeId: <uuid> }
  transferOpenCreditOnRegistration: async function (leadId, newAttendeeId) { ... }
};
```

Implementation notes:
- `markUnpaidForCompletedEvent` first checks `newStatus === 'completed' && oldStatus !== 'completed'`; otherwise no-op. If passes: 1 UPDATE: `UPDATE crm_event_attendees SET payment_status='unpaid' WHERE event_id=$1 AND tenant_id=getTenantId() AND payment_status='pending_payment' AND checked_in_at IS NULL AND is_deleted=false`. Returns row count.
- `transferOpenCreditOnRegistration` does 1 SELECT (find oldest unexpired credit) + (if found) 1 RPC call. Uses ORDER BY credit_expires_at ASC LIMIT 1.
- Both fire `CrmNotificationsBell.refresh()` if `window.CrmNotificationsBell` exists.
- Both log to console with prefix `[CrmPaymentAutomation]` + meaningful detail.
- Both swallow non-fatal errors (UPDATE returns 0 rows = ok, RPC error logged but doesn't throw upstream).

### 8.2 Modified file: `modules/crm/crm-event-actions.js` — currently ~349 lines, target ≤350

In `fireEventStatusAutomation` (line 208 area), AFTER the existing `CrmAutomation.evaluate('event_status_change', ...)` call, add:

```javascript
if (window.CrmPaymentAutomation) {
  CrmPaymentAutomation.markUnpaidForCompletedEvent(eventId, oldStatus, newStatus)
    .catch(function(e) { console.error('CrmPaymentAutomation.markUnpaid error:', e); });
}
```

If file would exceed 350 lines: STOP and request guidance. Likely to be ~3-5 line addition.

### 8.3 Modified file: `modules/crm/crm-event-register.js` — currently ~150 lines, target ≤155

In `dispatchRegistrationConfirmation` (line 88 area) — BUT actually the credit transfer must happen BEFORE the dispatch (so confirmation message reflects updated state). Add the call BEFORE the existing `CrmAutomation.evaluate('event_registration', ...)` call:

```javascript
if (window.CrmPaymentAutomation) {
  try {
    await CrmPaymentAutomation.transferOpenCreditOnRegistration(leadId, newAttendeeId);
  } catch (e) { console.error('CrmPaymentAutomation.transferCredit error:', e); }
}
// Existing dispatch follows...
return CrmAutomation.evaluate('event_registration', { leadId, eventId, outcome: regStatus });
```

The executor needs to ensure `newAttendeeId` is available at this point. If not, the executor adds a SELECT to fetch it post-INSERT. Document the choice in EXECUTION_REPORT §4.

### 8.4 Modified file: `crm.html` — currently ~387 lines, target ~388

Add 1 `<script src="modules/crm/crm-payment-automation.js" defer></script>` immediately after the existing `crm-payment-helpers.js` tag.

### 8.5 New migration: `modules/Module 4 - CRM/migrations/2026_04_25_payment_backfill_closed_events.sql`

```sql
-- One-shot backfill: for every attendee on a 'completed' event whose
-- payment_status is still 'pending_payment' and who never checked in,
-- flip to 'unpaid' (the new automation will catch all future events).
-- IMPORTANT: only 'completed' (event ran). Not 'closed' (registration closed but event upcoming).
-- Cross-tenant by design; Prizma has 0 attendees so this is effectively demo-only.

WITH targets AS (
  SELECT a.id
    FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id
   WHERE a.payment_status = 'pending_payment'
     AND a.checked_in_at IS NULL
     AND e.status = 'completed'
     AND a.is_deleted = false
)
UPDATE crm_event_attendees
   SET payment_status = 'unpaid'
 WHERE id IN (SELECT id FROM targets);
```

Pre-flight expectation: executor reports count BEFORE running migration. Foreman approves count. Migration runs. Executor verifies post-run count = pre-flight count.

### 8.6 New retrospective files

- `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_AUTOMATION/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_AUTOMATION/FINDINGS.md` (only if findings)

### 8.7 Files NOT modified

- `crm-automation-engine.js` — engine untouched (criterion 27).
- `crm-payment-helpers.js` — also untouched (could grow but the new module is separate by design — separation of concern: helpers = UI rendering, automation = side-effects).
- `crm-leads-detail.js` (349 lines) — DO NOT TOUCH.
- All other `crm-*.js` files — untouched unless explicitly listed.

### 8.8 File-size projection summary

| File | Currently | Projected |
|---|---|---|
| `crm-payment-automation.js` | (new) | 110–170 |
| `crm-event-actions.js` | 349 | 352–354 ⚠️ TIGHT |
| `crm-event-register.js` | ~150 | 154–158 |
| `crm.html` | ~387 | ~388 |

**🔴 CRITICAL:** `crm-event-actions.js` projected at 349 + 3-5 lines = 352-354, BREACHING Rule 12. Mitigation:
- Try to keep the addition to 1 line: `(window.CrmPaymentAutomation && CrmPaymentAutomation.markUnpaidForClosedEvent(eventId, oldStatus, newStatus).catch(console.error));`
- If still over: extract a tiny existing function from the file into `crm-payment-helpers.js` to free 5 lines. Get Foreman approval before doing this.
- If still over: STOP and request guidance.

### 8.9 Docs that DO NOT need updating

- `docs/GLOBAL_MAP.md` — `CrmPaymentAutomation` is internal-to-CRM. Add at next Integration Ceremony.
- `docs/GLOBAL_SCHEMA.sql` — no schema change.
- `docs/FILE_STRUCTURE.md` — already stale, deferred.
- `MASTER_ROADMAP.md` — phase status updates here once payment trio fully closes (after this SPEC).

---

## 9. Commit Plan

Exactly 4 commits.

### Commit 1 — `feat(crm): add CrmPaymentAutomation helper for auto-status transitions`

- Files: `modules/crm/crm-payment-automation.js` (new), `crm.html` (1 script tag).
- Self-contained: registers `window.CrmPaymentAutomation` but isn't yet consumed.
- Verify on `crm.html?t=demo`: `typeof window.CrmPaymentAutomation === 'object'`, both methods callable.

### Commit 2 — `feat(crm): wire auto-unpaid + auto-credit-transfer into existing flows`

- Files: `crm-event-actions.js` + `crm-event-register.js`.
- Both call sites added in one commit (cohesive change).
- Pre-commit hook attention: check both files for IIFE-local helper name collisions (per FOREMAN_REVIEW lesson). Likely safe — different concerns.
- Tight Rule 12 watch on `crm-event-actions.js` — keep additions to ≤2 lines.

### Commit 3 — `chore(db): backfill payment_status for closed events on demo`

- Files: 1 migration file (backfill).
- Apply via `apply_migration` MCP.
- Executor reports row count in EXECUTION_REPORT.

### Commit 4 — `chore(spec): close M4_ATTENDEE_PAYMENT_AUTOMATION with retrospective`

- Files: EXECUTION_REPORT.md (new), FINDINGS.md (new if any), MODULE_MAP.md, SESSION_CONTEXT.md, CHANGELOG.md.
- NO code changes.

---

## 10. Test Subjects (Pinned)

### 10.1 Tenant
- demo — `tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'`.

### 10.2 Pre-flight verification (executor MUST run BEFORE commit 1)

```sql
-- Total attendees + per-status breakdown (current baseline)
SELECT payment_status, count(*) FROM crm_event_attendees
 WHERE tenant_id='8d8cfa7e-…' AND is_deleted=false
 GROUP BY payment_status ORDER BY payment_status;
-- Expected: paid:1, pending_payment:12 (post-PARITY-cleanup baseline)

-- Forecast backfill targets (used in commit 3 verification) — completed events ONLY
SELECT count(*) FROM crm_event_attendees a
  JOIN crm_events e ON e.id = a.event_id
 WHERE a.tenant_id='8d8cfa7e-…' AND a.is_deleted=false
   AND a.payment_status='pending_payment' AND a.checked_in_at IS NULL
   AND e.status = 'completed';
-- Pin this count. Backfill UPDATE must affect exactly this many rows.

-- Cross-tenant safety check
SELECT t.slug, count(*) FROM crm_event_attendees a
  JOIN tenants t ON t.id=a.tenant_id
  JOIN crm_events e ON e.id = a.event_id
 WHERE a.is_deleted=false
   AND a.payment_status='pending_payment' AND a.checked_in_at IS NULL
   AND e.status = 'completed'
 GROUP BY t.slug;
-- Expected: only demo has rows. If prizma or test-stores have any, STOP.

-- Confirm RPC exists
SELECT proname FROM pg_proc WHERE proname='transfer_credit_to_new_attendee';
-- Expected: 1 row.
```

### 10.3 Phone allowlist
Only `0537889878` and `0503348349`. Same as prior SPECs.

### 10.4 No real dispatches
This SPEC's QA does NOT require sending messages. The trigger paths are exercised; the dispatched messages from existing rules may fire as a side-effect, but only on attendees with allowlisted phones. Pre-test snapshot crm_message_log; post-test verify no new rows for non-allowlisted phones.

---

## 11. Lessons Already Incorporated

Cross-Reference Check 2026-04-25 against `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, all `modules/Module 4 - CRM/docs/MODULE_MAP.md`, repo grep. **Result: 0 collisions.**

- `CrmPaymentAutomation` global — does not exist (verified via grep).
- `crm-payment-automation.js` filename — does not exist.
- `markUnpaidForClosedEvent` / `transferOpenCreditOnRegistration` function names — do not exist.

Lessons applied:
1. **FROM `M4_EVENT_DAY_PARITY_FIX/FOREMAN_REVIEW.md §6 Proposal 1 (mechanism-level QA verification)** → APPLIED in §3: every behavioral criterion specifies SQL or counter verification, not just "button looks right".
2. **FROM `M4_EVENT_DAY_PARITY_FIX/FOREMAN_REVIEW.md §6 Proposal 2 (Path 0 baseline reset)** → APPLIED in §10.2: pre-flight includes per-status SQL count to anchor baseline before commit 1.
3. **FROM `M4_ATTENDEE_PAYMENT_UI/FOREMAN_REVIEW.md §6 Proposal 1 (re-baseline file sizes)** → APPLIED in §8.8: live `wc -l` confirmed at SPEC author time. crm-event-actions.js at 349 = TIGHT, mitigation explicitly documented.
4. **FROM `M4_ATTENDEE_PAYMENT_UI/FOREMAN_REVIEW.md §6 Proposal 2 (persistent UI anchor pattern)** → NOT APPLICABLE here (no new persistent UI element).
5. **FROM `M4_ATTENDEE_PAYMENT_SCHEMA/FOREMAN_REVIEW.md §6 Proposal 1 (criteria-vs-§8 sync)** → APPLIED: 37 criteria ↔ 4 commits in §9 ↔ file lists in §8 all sync.
6. **FROM `CRM_UX_REDESIGN_AUTOMATION/FOREMAN_REVIEW.md §7 Proposal 1 (co-staged file pre-flight)** → APPLIED: commit 2 stages 2 existing files. Executor must check for IIFE-local helper collisions (`toast`, `logWrite`) before commit. Documented in §9.
7. **General lesson — pin test-subject IDs** → APPLIED in §10.2.

---

## 12. Foreman QA Protocol

Delegated to Claude Code on Windows desktop per established workflow.

### 12.1 Path 0 — Baseline reset
Pre-SPEC SQL reset to documented baseline (1 paid + 12 pending_payment + 0 others). Per Skill Proposal from PARITY_FIX review.

### 12.2 Path 1 — Pre-flight + module load
- SQL queries from §10.2.
- Navigate `crm.html?t=demo` → verify `typeof window.CrmPaymentAutomation === 'object'` in console.

### 12.3 Path 2 — Auto-unpaid on event completion
1. Pick a demo event currently in `registration_open` status with attendees in `pending_payment` and no checkin.
2. Snapshot pre-state SQL.
3. Via UI (event-detail edit), flip event status to `completed`.
4. SQL verify: those attendees now `unpaid`. Paid attendees unchanged. Checked-in attendees unchanged.
5. Console: 0 errors. Log entry from `[CrmPaymentAutomation]` visible.

### 12.4 Path 2b — `closed` does NOT trigger auto-unpaid
1. Pick another event in `registration_open` with `pending_payment` attendees.
2. Flip status to `closed` (not `completed`).
3. SQL verify: attendees STAY in `pending_payment`. Helper did NOT fire.
4. Then flip the same event from `closed` to `completed` → NOW the attendees flip to `unpaid`.

### 12.5 Path 3 — Trigger only on transition INTO completed
1. Pick event already in `completed` status.
2. Save event (no status change).
3. Verify NO additional flips happened. (Helper checks `oldStatus !== 'completed'`.)

### 12.6 Path 4 — Auto-credit-transfer on new registration
1. Create test lead "QA Automation Test 1" with phone `0537889878`.
2. Create attendee in `credit_pending` with credit_expires_at = +30 days.
3. Register the lead to a different event (using existing UI flow).
4. SQL verify:
   - New attendee: payment_status='paid', paid_at IS NOT NULL.
   - Old attendee: payment_status='credit_used', credit_used_for_attendee_id = new attendee id.
5. Bell badge: refreshed (count -1 if it was 1).
6. Test FIFO: create lead with 2 credits (different expiry dates). Register for new event. Verify only oldest credit transferred; second still `credit_pending`.

### 12.7 Path 5 — No transfer if no open credit OR expired credit
1. Create lead with 0 open credits → register → new attendee stays `pending_payment`.
2. Create lead with credit_pending but credit_expires_at = -1 day (expired) → register → new attendee stays `pending_payment`. Old credit unchanged.

### 12.8 Path 6 — Backward compat
- Open existing event-detail → action modal still works.
- Bell + tier 2 still work.
- Templates/Automation editors still work.
- All 13 baseline attendees load correctly.
- 0 console errors beyond pre-existing baseline.

### 12.9 Path 7 — Existing automations still fire
- Spot-check 1 existing rule: e.g., create test lead, verify `lead_intake_new` rule still fires.
- Verify dispatch path goes through `CrmAutomation.evaluate` (engine untouched).

### 12.10 Path 8 — Final cleanup + integrity
```sql
-- Reset QA test rows
DELETE FROM crm_event_attendees WHERE tenant_id='8d8cfa7e-…' AND lead_id IN
  (SELECT id FROM crm_leads WHERE full_name LIKE 'QA%Automation%');
DELETE FROM crm_leads WHERE tenant_id='8d8cfa7e-…' AND full_name LIKE 'QA%Automation%';

-- Verify baseline (after backfill, expect possible new unpaid count from backfill)
SELECT payment_status, count(*) FROM crm_event_attendees
 WHERE tenant_id='8d8cfa7e-…' AND is_deleted=false
 GROUP BY payment_status;
-- Expected: paid:1, unpaid:<backfill count>, pending_payment:<remainder>
-- The backfill is permanent; QA cleanup just removes QA-created rows.
```

```bash
npm run verify:integrity   # exit 0
git status                 # clean
git log origin/develop..HEAD --oneline  # empty
grep -c "cdn.tailwindcss.com" crm.html  # exactly 1
```

---

## 13. Pre-Merge Checklist

- [ ] All §3 criteria pass.
- [ ] Integrity gate exit 0.
- [ ] `git status --short` empty.
- [ ] HEAD pushed.
- [ ] EXECUTION_REPORT + FINDINGS written.
- [ ] MODULE_MAP / SESSION_CONTEXT / CHANGELOG updated.
- [ ] Rule 12 not breached (especially `crm-event-actions.js`).
- [ ] No new orphan globals.
- [ ] `crm-automation-engine.js` untouched.
- [ ] `transfer_credit_to_new_attendee` RPC untouched.
- [ ] No real SMS/Email to non-allowlisted phone.
- [ ] Backfill row count matches pre-flight forecast.

---

## 14. Dependencies / Preconditions

- Branch develop current.
- M4_EVENT_DAY_PARITY_FIX closed (commit `8318372`). ✓
- Demo state: 13 attendees baseline. The backfill will create N new `unpaid` rows depending on how many demo events are in completed/closed status with pending attendees.
- `transfer_credit_to_new_attendee` RPC exists and grants intact (verified). ✓
- Local dev server reachable for QA.

---

*End of SPEC.*

*Ready for execution by opticup-executor. Do not begin until Daniel reviews and approves.*
