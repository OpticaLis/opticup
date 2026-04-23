# SPEC — P22_COUPON_TRACKING

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P22_COUPON_TRACKING/`
> **Author:** opticup-strategic (Cowork)
> **Written:** 2026-04-23
> **Status:** READY FOR EXECUTION
> **Priority:** Pre-P7 — Daniel requires coupon redemption visibility for event ROI
> **Origin:** Daniel: "מעקב שימוש בקופונים זה חובה! חייב לראות כמה אנשים מתוך
>   מי ששילם פיקדון וקיבל קופון לא הגיעו"

---

## 1. Goal

Add a coupon tracking panel to the event detail page that shows:
- How many attendees received a coupon
- Of those, how many showed up (checked in)
- Of those, how many purchased
- **Critical metric: how many got a coupon but did NOT show up** (paid deposit
  + got coupon + no-show = lost revenue opportunity)

All data already exists in `crm_event_attendees` — `coupon_sent`, `checked_in_at`,
`purchase_amount`, `booking_fee_paid`, `status`. This is a display/UI task only.
No DB changes needed.

---

## 2. Tracks

### Track A — Add coupon funnel panel to event detail

File: `modules/crm/crm-events-detail.js` (currently 237L → target ~280L)

**A1. Add a coupon tracking section below the capacity bar**

After the capacity bar and before the KPI sparklines, insert a collapsible
panel (click to expand/collapse) showing the coupon funnel:

```
┌──────────────────────────────────────────────────┐
│  🎫 מעקב קופונים                          [▾]   │
│──────────────────────────────────────────────────│
│                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │   12    │  │    8    │  │    6    │          │
│  │ קיבלו  │→│  הגיעו  │→│  רכשו  │          │
│  │ קופון  │  │         │  │         │          │
│  └─────────┘  └─────────┘  └─────────┘          │
│                                                  │
│  ⚠️ 4 קיבלו קופון ולא הגיעו                     │
│  ┌────────────────────────────────────────────┐   │
│  │ שם          │ טלפון      │ פיקדון │ קופון │   │
│  │─────────────│────────────│────────│───────│   │
│  │ דנה כהן     │ 053-788... │   ✓    │   ✓   │   │
│  │ יוסי לוי    │ 050-334... │   ✓    │   ✓   │   │
│  │ ...         │            │        │       │   │
│  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

**Data source:** Compute from the existing `attendees` array that's already
loaded in `openCrmEventDetail()`:

```javascript
var withCoupon = attendees.filter(function (a) {
  return a.coupon_sent && a.status !== 'cancelled';
});
var arrivedWithCoupon = withCoupon.filter(function (a) {
  return a.checked_in_at;
});
var purchasedWithCoupon = withCoupon.filter(function (a) {
  return a.purchase_amount && a.purchase_amount > 0;
});
var noShowWithCoupon = withCoupon.filter(function (a) {
  return !a.checked_in_at;
});
```

**A2. Funnel summary cards**

Three inline cards showing the funnel:
- Card 1: **קיבלו קופון** — count of `coupon_sent=true` (excluding cancelled)
- Card 2: **הגיעו** — subset of card 1 who checked in (`checked_in_at IS NOT NULL`)
- Card 3: **רכשו** — subset of card 1 who purchased (`purchase_amount > 0`)

Cards should use the existing CRM style (indigo/emerald/amber gradient
backgrounds, bold number on top, label below).

Arrow (`→`) between cards to show the funnel flow.

**A3. No-show alert + table**

Below the funnel cards, show:
- Alert line: "⚠️ X קיבלו קופון ולא הגיעו" — in amber/warning style
  (only if `noShowWithCoupon.length > 0`)
- Expandable table of no-show attendees with columns:
  - שם מלא
  - טלפון (LTR direction)
  - פיקדון (✓ if `booking_fee_paid`, ✗ if not)
  - קופון (always ✓ since they're in the coupon-sent list)

The table uses `escapeHtml()` on all user-facing fields (Rule 8).

**A4. Collapsible behavior**

- Panel starts collapsed (just header "🎫 מעקב קופונים" + arrow icon)
- Click header to expand/collapse
- If `couponsSent === 0` → hide the entire panel (no coupons issued yet,
  nothing to track)

**A5. Booking fee column in attendee list**

Currently the attendee list in the "משתתפים" sub-tab shows: name, phone,
status badge, purchase amount. Add a `booking_fee_paid` indicator:
- If `booking_fee_paid === true` → show "💰" or small green "₪" badge
- If `booking_fee_paid === false` → show nothing (no badge = no fee paid)

This is a small addition to `renderAttendeesGrouped()` — add after the
purchase amount display.

### Track B — Add coupon columns to event-day manage table

File: `modules/crm/crm-event-day-manage.js` (currently 273L → target ~285L)

**B1. Add coupon-sent indicator to manage sub-tab table**

The manage sub-tab table currently shows: Name, Phone, Status, Purchase,
Coupon (yes/no), Booking fee. The "Coupon" column already exists as a
yes/no indicator. Add visual differentiation:
- `coupon_sent=true` + `checked_in_at` → green badge "✓ הגיע"
- `coupon_sent=true` + no `checked_in_at` → amber badge "⚠️ לא הגיע"
- `coupon_sent=false` → gray "—"

This replaces the plain yes/no with a status-aware indicator.

---

## 3. Success Criteria

| # | Criterion | Expected |
|---|-----------|----------|
| 1 | Event detail shows coupon funnel panel | Visual: 3 cards (received/arrived/purchased) |
| 2 | No-show alert shows correct count | Count = attendees with `coupon_sent=true` AND `checked_in_at IS NULL` AND `status != cancelled` |
| 3 | No-show table shows name + phone + deposit + coupon | Visual check |
| 4 | Panel hidden when no coupons issued | If `couponsSent=0` → no panel visible |
| 5 | Panel collapsible | Click header → toggle expand/collapse |
| 6 | Booking fee indicator in attendee list | Visual: 💰 badge for `booking_fee_paid=true` |
| 7 | Manage sub-tab coupon column shows arrival status | Visual: green/amber badge |
| 8 | `wc -l` all modified files | ≤ 350 each |
| 9 | Zero new console errors on `crm.html?t=demo` | Manual browser check |

---

## 4. Autonomy Envelope

**MAXIMUM AUTONOMY** — no checkpoints. This is a pure UI display task using
existing data. Execute all tracks and commit.

---

## 5. Stop-on-Deviation Triggers

1. Any CRM file would exceed 350 lines after edits
2. The attendee data query needs modification (it shouldn't — all fields are
   already in the SELECT)
3. The attendee list rendering breaks existing functionality

---

## 6. Files Affected

| File | Track | Changes |
|------|-------|---------|
| `modules/crm/crm-events-detail.js` (237L) | A | Add coupon funnel panel + booking fee badge (~280L) |
| `modules/crm/crm-event-day-manage.js` (273L) | B | Coupon arrival-status badges (~285L) |

---

## 7. Out of Scope

- Coupon redemption at POS (no payment integration exists yet)
- Coupon code generation per attendee (shared event-level code today)
- Sending follow-up messages to no-show attendees (use broadcast wizard)
- Adding new DB columns or tables
- Modifying the coupon issuance logic in event-day check-in

---

## 8. Expected Final State

```
crm-events-detail.js    — ~270–290L (+40–50 for funnel panel + booking badge)
crm-event-day-manage.js — ~280–290L (+7–12 for status-aware coupon badges)
```

1 commit:
`feat(crm): add coupon tracking funnel to event detail + arrival-status badges`

---

## 9. Rollback Plan

1. Revert commit.
2. Event detail reverts to current display (coupon count in header only).

---

## 10. Commit Plan

See §8. Single commit — both tracks are tightly coupled (same feature,
same data source).

---

## 11. Verification Evidence (Guardian Protocol)

| Claim | Verification |
|-------|-------------|
| `coupon_sent` field exists on attendees | **VERIFIED** — `crm_event_attendees.coupon_sent boolean NOT NULL DEFAULT false` (schema line 150) |
| `checked_in_at` field exists | **VERIFIED** — `crm_event_attendees.checked_in_at timestamptz` (schema line 144) |
| `purchase_amount` field exists | **VERIFIED** — `crm_event_attendees.purchase_amount numeric(10,2)` (schema line 147) |
| `booking_fee_paid` field exists | **VERIFIED** — `crm_event_attendees.booking_fee_paid boolean NOT NULL DEFAULT false` (schema line 148) |
| Attendee SELECT already includes coupon_sent | **VERIFIED** — `crm-events-detail.js:60`: select includes `coupon_sent` |
| Attendee SELECT already includes checked_in_at | **VERIFIED** — same line |
| Attendee SELECT already includes purchase_amount | **VERIFIED** — same line |
| Attendee SELECT does NOT include booking_fee_paid | **VERIFIED** — `booking_fee_paid` NOT in the select at line 60. Must add it. |
| `crm-events-detail.js` current line count | **VERIFIED** — 237 lines (within budget for +50L addition) |
| `crm-event-day-manage.js` current line count | **VERIFIED** — 273 lines (within budget for +12L addition) |
| Cross-Reference: no `renderCouponFunnel` function exists | **VERIFIED** — grep = 0 hits |

**NOTE:** `booking_fee_paid` is not in the current attendee SELECT query at
line 60. The executor must add it to the `.select()` call. This is a safe
addition — the column exists, it's a boolean, and adding it to a SELECT
doesn't affect existing data flow.

---

## 12. Lessons Already Incorporated

- **From P21 FOREMAN_REVIEW proposal 2:** Line-count estimates use ranges
  (~270–290L, ~280–290L) instead of point estimates.
- **From P20 FOREMAN_REVIEW proposal 1:** Column-existence verification — all
  target columns verified against schema. Caught that `booking_fee_paid` is
  NOT in the current SELECT (must be added).
- **From P19 FOREMAN_REVIEW proposal 1:** Sample-content self-test — success
  criteria cross-checked against SPEC examples.
- **Cross-Reference Check completed 2026-04-23:** `renderCouponFunnel`
  0 hits repo-wide. No collisions.

---

*End of SPEC — P22_COUPON_TRACKING*
