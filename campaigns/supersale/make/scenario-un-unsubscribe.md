# Scenario UN — Unsubscribe (הורדה מרשימת התפוצה)

> **Make ID:** 8502052 | **Modules:** 16 | **Ops:** 54
> **URL:** https://eu2.make.com/402680/scenarios/8502052/edit

---

## מצב קיים (Current State)

### Trigger

**Custom Webhook** — receives optional parameters: `email`, `phone`, `action`, `item_id`.
Hook name: "Unsubscribe Email". Runs immediately.

### Flow Overview

Three entry paths based on what data the webhook receives:

```
Webhook receives unsubscribe request
  ↓
Module 1: Webhook trigger
  ↓
Module 7: PRIMARY ROUTER
  ├── Path A: email EXISTS → search by email
  └── Path B: email NOT exist → search by item_id
```

### Path A — Email-Based Unsubscribe

```
Module 2: Search Master Board (5088674569) by email column (email_mky18cr2)
           Limit: 10 results
  ↓
Module 3: Router — check if found
  ├── Found (results ≥ 1):
  │     Module 4: Update status → "ביטל Unsubscribe"
  │     Module 5: Move to "Not Interested" group (group_mkzc75cf)
  │
  └── Not Found:
        Module 6: Alert email to daniel@prizma-optic.co.il
```

### Path B — Item ID-Based Unsubscribe

```
Module 15: GetItem by item_id from Master Board (5088674569)
  ↓
Module 24: BOARD TYPE ROUTER
  ├── Tier 2 (board = 5088674569):
  │     Module 9: Sub-router
  │       ├── Found: Module 10: Update status + notes, Module 11: Move to Not Interested
  │       └── Not found: Module 12: Alert email
  │
  └── Tier 3 (board = 5088675039):
        Module 20: Sub-router
          ├── Module 25: Search Master Board by phone
          │              (strips "972" prefix from Tier 3 phone)
          │   ↓
          │   Module 26: Router — found by phone?
          │     ├── Found: Module 21: Update status, Module 22: Move to Not Interested
          │     └── Not found: Module 27: Alert email
          └── (orphaned: Module 23, unused)
```

### Status Update on Unsubscribe

When a lead is successfully unsubscribed:

| Field | Value |
|-------|-------|
| Status | `ביטל Unsubscribe` (red label, index 9) |
| Notes | Append: `Unsubscribed \| {{now}}\n\n{{previous notes}}` |
| Group | Moved to `group_mkzc75cf` ("Not Interested") |

### Alert Emails (All Failure Paths)

**To:** daniel@prizma-optic.co.il

**Subject:** `מישהו ניסה לעשות Unsubscribe`

**Body variants:**

Email not found (Module 6):
```
משתתף ניסה להוריד את עצמו מרשימת התפוצה ולא הצליח. נא לבדוק!

פרטים:
{{1.email}}
```

Item ID not found in Tier 2 (Module 12):
```
משתתף ניסה להוריד את עצמו מרשימת התפוצה ולא הצליח. נא לבדוק!

פרטים:
{{1.item_id}}
```

Tier 3 phone not found in Master (Module 27):
```
משתתף ניסה להוריד את עצמו מרשימת התפוצה ולא הצליח. נא לבדוק!

המשתתף לא נמצא בבורד מאסטר, אבל הID נמצא במערכת

פרטים:
{{1.item_id}}
```

### Monday Board Interactions

| Board | ID | Action |
|-------|-----|--------|
| Master Board (Tier 2) | 5088674569 | **READ:** Search by email (`email_mky18cr2`) or by phone (`phone_mky4a5fq`). GetItem by item_id. |
| Master Board (Tier 2) | 5088674569 | **WRITE:** Status → "ביטל Unsubscribe", Notes append, Move to "Not Interested" group |
| Tier 3: Event Attendees | 5088675039 | **READ:** GetItem to determine board source, extract phone for Master Board lookup |

### Unsubscribe Link Resolution

The scenario handles two link formats:
1. **Email-based:** `?email=xxx@yyy.com` → direct email search on Master Board
2. **Item ID-based:** `?item_id=12345` → GetItem, determine board (Tier 2 or Tier 3), then find in Master Board

For Tier 3 items, the phone number is used to find the corresponding Tier 2 record (with `972` prefix stripped).

---

## כיוון למערכת חדשה (New System Direction)

### What Changes

1. **Single endpoint** — Supabase Edge Function: `POST /unsubscribe` with `lead_id` or `email`
2. **No board-hopping** — single `crm_leads` table, one status update:
   ```sql
   UPDATE crm_leads
   SET status = 'unsubscribed', unsubscribed_at = NOW(),
       notes = 'Unsubscribed | ' || NOW() || E'\n' || notes
   WHERE id = $1 OR email = $2;
   ```
3. **Confirmation page** — Edge Function returns HTML confirmation: "הוסרת בהצלחה מרשימת התפוצה"
4. **Alert** — only on failure (lead not found), via internal notification, not email

### What This Scenario Becomes

**Edge Function + database update.** No Make scenario needed.

Flow:
1. Lead clicks unsubscribe link → `https://app.opticalis.co.il/unsubscribe?id={lead_id}`
2. Edge Function validates lead exists
3. Updates `crm_leads.status = 'unsubscribed'`
4. Excludes from all future message queries (`WHERE status != 'unsubscribed'`)
5. Returns confirmation HTML page
6. If not found → log error, return generic "already unsubscribed" page

### CRM Tables Needed

- `crm_leads.status` — add 'unsubscribed' to status enum
- `crm_leads.unsubscribed_at` — timestamp for compliance
