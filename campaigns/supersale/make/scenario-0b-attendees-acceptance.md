# Scenario 0B — Attendees Acceptance (אישור הגעה)

> **Make ID:** 8601355 | **Modules:** 9 | **Ops:** 663
> **URL:** https://eu2.make.com/402680/scenarios/8601355/edit

---

## מצב קיים (Current State)

### Trigger

**Custom Webhook** — receives `item_id` parameter when an attendee clicks the confirmation link.
Hook name: "MultiSale אישור הגעה". Runs immediately.

### Flow Overview

```
Attendee clicks confirmation link → Webhook with item_id
  ↓
Module 1: Webhook trigger (receives item_id)
  ↓
Module 5: GetItem — fetch attendee from Tier 3: Event Attendees (5088675039)
  ↓
Module 14: Query Events Board (5088674576) — find matching event by Event ID
  ↓
Module 7: VALIDATION ROUTER — 4 paths
  ├── Path 1: SUCCESS — board = Tier 3 + confirmed ≤ 50 + event open
  ├── Path 2: WRONG BOARD — board ≠ Tier 3
  ├── Path 3: OVER CAPACITY — confirmed > 50
  └── Path 4: EVENT CLOSED — event status = Closed/Completed
```

### Path 1 — Success (Confirmed)

```
Module 2: Update Tier 3 board
           - boolean_mm07ggeb (Attendance Confirmation) → checked: true
           - color_mky9rr1r (Send Messages) → "קוד קופון" (Coupon Code)
           - color_mky5e9mn (Status) → "אישר" (Confirmed)
           - long_text_mky56kjq (Notes) → append timestamp
           - text_mky7vf12 (Event ID) → from Events board lookup
  ↓
Module 3: WebhookRespond — return success HTML page
```

#### Success HTML Page

```html
Title: "אישרת הגעה."
Subtitle: "אישור ההגעה שלך התקבל בהצלחה. הקופון האישי נשלח אלייך במייל."
VIP Card: "מחכים לך באירוע המכירות"
Button: "מעבר לאינסטגרם" → https://www.instagram.com/optic_prizma/
```

### Paths 2/3/4 — Rejection

All rejection paths return the same HTML page:

```html
Title: "ההרשמה נסגרה."
Subtitle: "תודה על ההתעניינות. כל המקומות לאירוע המכירות הקרוב כבר שוריינו."
Card: "נתראה באירועים הבאים"
Button: "מעבר לאינסטגרם"
```

Each rejection path also sends an **alert email** to daniel@prizma-optic.co.il:

| Path | Email Subject |
|------|--------------|
| Wrong Board | `לקוח בשם {{5.name}} ניסה לאשר הגעה לאירוע סגור` |
| Over Capacity | `לקוח בשם {{5.name}} ניסה לאשר הגעה לאחר שנרשמו כבר מקסימום אנשים` |
| Event Closed | Same as Over Capacity |

**Email body (all):** `שם הלקוח: {{5.name}}`

### Validation Conditions

| Path | Conditions |
|------|-----------|
| Success | `board.id = 5088675039` AND `Total Confirmed ≤ 50` AND `Event Status EXISTS` AND `Status ≠ Closed` AND `Status ≠ Completed` |
| Wrong Board | `board.id ≠ 5088675039` |
| Over Capacity | `board.id = 5088675039` AND `Total Confirmed > 50` |
| Event Closed | `board.id = 5088675039` AND `Total Confirmed ≤ 50` AND (`Status NOT EXISTS` OR `Status = Closed`) |

### Monday Board Interactions

| Board | ID | Action |
|-------|-----|--------|
| Tier 3: Event Attendees | 5088675039 | **READ:** name, email, phone, status, event ID |
| Tier 3: Event Attendees | 5088675039 | **WRITE:** confirmation checkbox, status → "אישר", send messages → "קוד קופון", notes append |
| Events Management | 5088674576 | **READ:** Event ID, Total Confirmed (`numeric_mky5znnf`), Event Status |

### Key Data Flow

```
item_id → GetItem(Tier 3) → Event ID from attendee → Query Events board → Validate capacity + status → Update or Reject
```

---

## כיוון למערכת חדשה (New System Direction)

### What Changes

1. **Confirmation endpoint** — becomes a Supabase Edge Function: `POST /confirm-attendance` with `attendee_id`
2. **Capacity check** — `SELECT COUNT(*) FROM crm_attendances WHERE event_id = $1 AND status = 'confirmed'` with `FOR UPDATE` lock (atomic, no race condition)
3. **HTML response** — served by the Edge Function directly, or redirects to an Optic Up confirmation page
4. **Alert emails** — replaced by internal notification system (or kept as email via Resend/SendGrid)
5. **Coupon trigger** — on successful confirmation, `crm_attendances.coupon_sent = true` triggers coupon email via Messaging Hub

### What This Scenario Becomes

A single Edge Function: `confirm_attendance(attendee_id)`:
1. Validate attendee exists in `crm_attendances`
2. Check event capacity (atomic count with lock)
3. Check event status is 'registration_open'
4. If valid: update status → 'confirmed', trigger coupon email
5. If invalid: return appropriate error page + alert Daniel
6. Return HTML confirmation/rejection page

### CRM Tables Needed

- `crm_attendances` — attendee_id, lead_id, event_id, status (registered/confirmed/attended/no_show), confirmed_at, coupon_code, coupon_sent
