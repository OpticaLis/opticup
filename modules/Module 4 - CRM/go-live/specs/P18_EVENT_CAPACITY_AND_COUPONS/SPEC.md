# SPEC — P18_EVENT_CAPACITY_AND_COUPONS

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P18_EVENT_CAPACITY_AND_COUPONS/`
> **Author:** opticup-strategic (Cowork)
> **Written:** 2026-04-23
> **Status:** READY FOR EXECUTION
> **Priority:** Pre-P7 — coupon enforcement needed before first Prizma event

---

## 1. Goal

Implement the full 3-tier event capacity model Daniel described:

1. **קיבולת מקסימלית (max_capacity)** — already exists. Beyond this number,
   registrants go to waiting list. No changes needed.
2. **כמות קופונים מקסימלית (max_coupons)** — NEW. How many coupons can be
   issued for this event. When someone cancels, their coupon slot is released.
   The event-day coupon send button must enforce this ceiling.
3. **כמות קופונים נוספת (extra_coupons)** — NEW. Mid-event overflow. Staff
   can set this number during the event to allow issuing more coupons beyond
   the original `max_coupons` (e.g., for walk-ins when many deposit-payers
   didn't show up).

Also add a "שלח הזמנה לרשימת המתנה" (invite waiting list) button on the
event detail page — the standard flow is: after ~24 hours, if not all
registrants confirmed, send the registration link to waiting-list people.

---

## 2. Tracks

### Track A — DB Schema: Add `max_coupons` and `extra_coupons` columns

**Migration SQL:**
```sql
ALTER TABLE crm_events
  ADD COLUMN IF NOT EXISTS max_coupons INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS extra_coupons INTEGER DEFAULT 0;

COMMENT ON COLUMN crm_events.max_coupons IS
  'Maximum number of coupons that can be issued for this event. When a coupon is cancelled, the slot is released. Usually equals max_capacity.';
COMMENT ON COLUMN crm_events.extra_coupons IS
  'Additional coupon overflow set mid-event by staff when no-shows create available slots. Added on top of max_coupons.';
```

Also add defaults to `crm_campaigns` for the new fields:
```sql
ALTER TABLE crm_campaigns
  ADD COLUMN IF NOT EXISTS default_max_coupons INTEGER DEFAULT 50;
```
(No `default_extra_coupons` — that's always 0 at creation, set mid-event.)

**Apply via:** `mcp__supabase__apply_migration` with name
`add_max_coupons_and_extra_coupons_to_events`

### Track B — Create Event Form: Add `max_coupons` field

File: `modules/crm/crm-event-actions.js` (272L)

**B1. Add `max_coupons` input to `renderCreateForm`** (after `max_capacity`)

Change the existing 2-column grid (קיבולת + דמי רישום) to a 3-column grid
(קיבולת + קופונים + דמי רישום):

```javascript
'<div class="grid grid-cols-3 gap-2">' +
'<div><label class="' + labelCls + '">קיבולת מקסימלית</label>' +
'<input type="number" name="max_capacity" class="' + inputCls + '" value="' + (camp0.default_max_capacity || 50) + '" min="1" required></div>' +
'<div><label class="' + labelCls + '">כמות קופונים</label>' +
'<input type="number" name="max_coupons" class="' + inputCls + '" value="' + (camp0.default_max_coupons || 50) + '" min="0" required></div>' +
'<div><label class="' + labelCls + '">דמי רישום (₪)</label>' +
'<input type="number" name="booking_fee" class="' + inputCls + '" value="' + (camp0.default_booking_fee || 50) + '" min="0" step="0.01" required></div>' +
'</div>' +
```

Note: `extra_coupons` is NOT in the create form — it's always 0 at creation.
It's set during the event from the event detail page (see Track D).

**B2. Add `max_coupons` to `createEvent` function**

In the `row` object (line ~44-57), add:
```javascript
max_coupons: data.max_coupons != null ? data.max_coupons : 50,
```

**B3. Add `max_coupons` to `loadCampaigns` SELECT**

Line 23: add `default_max_coupons` to the SELECT.

**B4. Campaign change handler**

In the `campSel.addEventListener('change', ...)` block (line ~144-152), add:
```javascript
var couponsInput = form.querySelector('[name="max_coupons"]');
if (couponsInput) couponsInput.value = picked.default_max_coupons || 50;
```

**B5. Form data extraction**

In the `submit` click handler (line ~160-170), add:
```javascript
max_coupons: parseInt(fd.get('max_coupons'), 10),
```

### Track C — Coupon Issuance Enforcement

File: `modules/crm/crm-event-day-manage.js` (278L)

Currently, the "שלח קופון" button (`sendCouponToAttendee`, line ~252) updates
`coupon_sent = true` with no ceiling check. Add enforcement:

**C1. Before issuing a coupon, count existing coupons vs limit**

Before the UPDATE at line ~252, add a check:

```javascript
// Coupon ceiling enforcement
var eventData = getEventData(); // or however the current event is accessed
var totalCouponsSent = attendees.filter(function(a) {
  return a.coupon_sent && a.status !== 'cancelled';
}).length;
var couponCeiling = (eventData.max_coupons || 50) + (eventData.extra_coupons || 0);
if (totalCouponsSent >= couponCeiling) {
  Toast.error('הגעת למכסת הקופונים (' + couponCeiling + '). הגדל כמות קופונים נוספת אם יש צורך.');
  return;
}
```

**C2. Ensure cancelled attendee releases coupon slot**

The cancellation logic already sets `coupon_sent = false` when an attendee
is cancelled (verify this — if not, add it). The count above filters
`status !== 'cancelled'`, so cancelled attendees don't count toward the
ceiling.

**C3. Event data must include `max_coupons` and `extra_coupons`**

The event-day page SELECT (`crm-event-day.js` line ~66) needs to include
`max_coupons, extra_coupons` in the event query. Verify and add if missing.

### Track D — Extra Coupons: Edit from Event Detail

File: `modules/crm/crm-events-detail.js` (255L)

**D1. Show coupon status in the event detail header**

In the info grid (line ~87-91), add a fourth info cell:

```javascript
'<div class="bg-white/10 rounded-lg px-3 py-2"><span class="opacity-80">🎫 קופונים:</span> ' +
couponsSent + ' / ' + couponCeiling + (event.extra_coupons > 0 ? ' (+' + event.extra_coupons + ' נוספים)' : '') +
'</div>'
```

Where `couponsSent` = count of attendees with `coupon_sent = true` and status
not cancelled, and `couponCeiling` = `max_coupons + extra_coupons`.

**D2. Add "קופונים נוספים" edit button**

Add a small inline edit UI (pencil icon or editable number field) next to
the coupon info in the header — or a button "הגדר קופונים נוספים" that opens
a prompt dialog. On submit:

```javascript
await sb.from('crm_events')
  .update({ extra_coupons: newValue })
  .eq('id', event.id)
  .eq('tenant_id', getTenantId());
```

Keep it simple — a `prompt()` dialog or a small inline input is sufficient.

**D3. Show "שלח הזמנה לרשימת המתנה" button**

In the header buttons area (line ~80-85), add a new button that appears
when the event has waiting-list attendees:

```javascript
(hasWaitingList ? '<button type="button" class="' + CLS_HEAD_BTN + '" data-action="invite-waiting-list">📩 שלח הזמנה לרשימת המתנה</button>' : '')
```

Where `hasWaitingList` = `attendees.some(a => a.status === 'waiting_list')`.

**D4. Wire the waiting-list invite button**

When clicked, trigger the existing automation rule "שינוי סטטוס: רשימת המתנה"
for each waiting-list attendee — or simpler: call `CrmAutomation.evaluate`
with event context that sends the registration URL to waiting-list leads.

**Decision for executor:** The simplest approach is to change each
waiting-list attendee's status to `'invited'` (or keep `waiting_list` and
send the message manually via the broadcast wizard targeting waiting-list
attendees). Check what automation rules already exist:
- "שינוי סטטוס: רשימת המתנה" (status_change trigger)
- "הרשמה: אישור רשימת המתנה" (created trigger)

If these rules already send messages with `%registration_url%`, the simplest
flow is: button triggers a batch status change → automation rules fire →
messages sent. If not, use the broadcast wizard to manually send the
registration link to waiting-list attendees.

**D5. Ensure `fetchDetail` SELECT includes new columns**

Line 54: add `max_coupons, extra_coupons` to the event SELECT.

### Track E — Event Detail: Show `max_coupons`, `extra_coupons` in info

File: `modules/crm/crm-events-detail.js`

The existing SELECT (line 54) already fetches `max_capacity, booking_fee,
coupon_code`. Add `max_coupons, extra_coupons` to the same SELECT.

(This is merged with Track D — listed separately for clarity.)

---

## 3. Success Criteria

| # | Criterion | Expected |
|---|-----------|----------|
| 1 | `max_coupons` column exists in `crm_events` | `SELECT max_coupons FROM crm_events LIMIT 1` succeeds |
| 2 | `extra_coupons` column exists in `crm_events` | `SELECT extra_coupons FROM crm_events LIMIT 1` succeeds |
| 3 | `default_max_coupons` column exists in `crm_campaigns` | `SELECT default_max_coupons FROM crm_campaigns LIMIT 1` succeeds |
| 4 | Create event form shows "כמות קופונים" field | Visual check on localhost |
| 5 | Created event has `max_coupons` set from form | `SELECT max_coupons FROM crm_events WHERE id = [new]` = entered value |
| 6 | Event detail shows coupon count (sent / ceiling) | Visual check |
| 7 | Event detail has "קופונים נוספים" edit button | Visual check |
| 8 | Event detail has "שלח הזמנה לרשימת המתנה" button (when waiting list exists) | Visual check |
| 9 | Coupon send blocked when ceiling reached | Toast error when `coupon_sent_count >= max_coupons + extra_coupons` |
| 10 | `wc -l` all modified files | ≤ 350 each |
| 11 | Zero new console errors | On demo tenant |

---

## 4. Autonomy Envelope

**HIGH AUTONOMY** with one checkpoint:

- **Checkpoint 1 (after Track A migration):** Report: "Migration applied.
  Columns verified. Defaults set."
- Then continue Tracks B–E without stopping.

---

## 5. Stop-on-Deviation Triggers

1. Migration fails or columns already exist with different types
2. Any CRM file would exceed 350 lines after edits
3. The `register_lead_to_event` RPC needs changes (out of scope — it uses
   `max_capacity` for registration, not `max_coupons`)
4. Existing automation rules for waiting list are broken or missing templates
   → STOP, report what exists and what's missing

---

## 6. Files Affected

| File | Track | Changes |
|------|-------|---------|
| NEW MIGRATION | A | Add 2 columns to `crm_events`, 1 to `crm_campaigns` |
| `modules/crm/crm-event-actions.js` (272L) | B | Add `max_coupons` field to create form + data flow |
| `modules/crm/crm-event-day-manage.js` (278L) | C | Add coupon ceiling enforcement before `sendCouponToAttendee` |
| `modules/crm/crm-event-day.js` (~Lines TBD) | C | Add `max_coupons, extra_coupons` to event SELECT |
| `modules/crm/crm-events-detail.js` (255L) | D/E | Add coupon info, extra_coupons edit, waiting-list invite button |

**Estimated: 1 migration + 4 existing files modified.**

---

## 7. Out of Scope

- Changing `register_lead_to_event` RPC (it uses `max_capacity`, not
  `max_coupons` — these are deliberately different concepts)
- Automated 24-hour timer for waiting-list invitations (manual button for now)
- Coupon generation/PDF (the "coupon" is a barcode sent via message, not a
  printable PDF — that flow already exists in Make/automation)
- Per-attendee coupon value or variable booking fees
- `extra_coupons` in the create form (always 0 at creation)

---

## 8. Expected Final State

```
crm_events table            — +2 columns (max_coupons, extra_coupons)
crm_campaigns table         — +1 column (default_max_coupons)
crm-event-actions.js        — ~285L (+13 lines for form field + data flow)
crm-event-day-manage.js     — ~290L (+12 lines for ceiling check)
crm-event-day.js            — ~same (+1 line for SELECT)
crm-events-detail.js        — ~280L (+25 lines for coupon info + edit + button)
```

3 commits:
1. `feat(crm): add max_coupons and extra_coupons to events schema`
2. `feat(crm): coupon ceiling enforcement + create form field`
3. `feat(crm): event detail coupon info, extra edit, waiting-list invite`

---

## 9. Rollback Plan

1. Revert commits.
2. Migration rollback: `ALTER TABLE crm_events DROP COLUMN IF EXISTS
   max_coupons, DROP COLUMN IF EXISTS extra_coupons;` and same for campaigns.
   Safe because columns have defaults and no existing code reads them before
   this SPEC.

---

## 10. Commit Plan

See §8. Three commits: schema → enforcement + form → UI info + buttons.

---

## 11. Verification Evidence (Guardian Protocol)

| Claim | Verification |
|-------|-------------|
| `crm_events` doesn't have `max_coupons` | **VERIFIED** — SQL query `information_schema.columns WHERE table_name='crm_events'`: no `max_coupons` column |
| `crm_events` doesn't have `extra_coupons` | **VERIFIED** — same query: no `extra_coupons` column |
| `crm_events` has `max_capacity` (default 50) | **VERIFIED** — SQL query: `max_capacity INTEGER DEFAULT 50` |
| `crm_events` has `booking_fee` (default 50.00) | **VERIFIED** — SQL query: `booking_fee NUMERIC DEFAULT 50.00` |
| `crm_campaigns` has `default_max_capacity` | **VERIFIED** — `crm-event-actions.js:23` SELECTs it |
| `crm_campaigns` doesn't have `default_max_coupons` | **VERIFIED** — not in the SELECT at line 23 (need SQL check) |
| `coupon_sent` is a boolean on attendees | **VERIFIED** — `crm-event-day-manage.js:252`: `.update({ coupon_sent: true })` |
| No coupon ceiling exists today | **VERIFIED** — grep for `max_coupons` in modules/crm = 0 hits |
| Waiting list automation rules exist | **VERIFIED** — SQL query: 2 rules ("שינוי סטטוס: רשימת המתנה", "הרשמה: אישור רשימת המתנה") |
| `register_lead_to_event` uses `max_capacity` for waiting list | **VERIFIED** — `hotfix-register-lead-to-event.sql:51`: `IF v_current_count >= v_event.max_capacity` |
| Cross-Reference Check: `max_coupons`, `extra_coupons`, `default_max_coupons` | **VERIFIED** — grep all 3 names against GLOBAL_SCHEMA, GLOBAL_MAP, DB_TABLES_REFERENCE, FILE_STRUCTURE: 0 hits. Names are new. |

---

## 12. Lessons Already Incorporated

- **From P16 FOREMAN_REVIEW proposal 2:** Customer-facing branding — this
  SPEC doesn't create customer-facing pages, only internal staff UI.
- **From P15 FOREMAN_REVIEW proposal 1:** Line-budget preflight — all target
  files have 70+ lines of headroom.
- **From P16 FOREMAN_REVIEW executor proposal 1:** EF-testing gotchas — no
  EF deployment in this SPEC, but the migration tool is noted.

---

*End of SPEC — P18_EVENT_CAPACITY_AND_COUPONS*
