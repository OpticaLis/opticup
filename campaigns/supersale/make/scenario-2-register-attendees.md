# Scenario 2 — רישום משתתפים לאירוע (Register Attendees to Event)

> **Make ID:** 8479284 | **Modules:** ~15 (active) | **Ops:** 1,734 (heavily used)
> **URL:** https://eu2.make.com/402680/scenarios/8479284/edit

---

## מצב קיים (Current State)

### Trigger

**Monday Webhook** — `watchBoardColumnValues` on Tier 1: Incoming Leads board (5088674481).
Hook name: "Leads Board Done Status". Fires when any item changes status in group `group_mky4jdgd` (Approved and Active).

### Flow Overview

```
Tier 1 board status change (Approved and Active group)
  ↓
Module 1: Webhook trigger
  ↓
Module 2: GetItem — fetch full lead from Tier 1 (5088674481)
           Filter: groupId == "group_mky4jdgd"
  ↓
Module 3: ROUTER — two registration paths
  ├── Path A: Automatic Registration (no Event Number)
  └── Path B: Manual Registration (Event Number provided)
```

### Path A — Automatic Registration

**Condition:** Event Number field does NOT exist AND group = "Approved and Active"

```
Module 41: Add to Facebook Custom Audience
           Business: 106457754847532
           Audience: "פריזמה דאטא הרשמות סופר סייל"
           Data: first_name, last_name, email, phone
  ↓
Module 38: Create new item in Tier 1 (copy for tracking)
  ↓
Module 39: Update status → "ממתין לאירוע" (Waiting for Event)
```

### Path B — Manual Registration (Event Number Provided)

**Condition:** Event Number EXISTS AND group = "Approved and Active"

```
Module 4: Query Events Board (5088674576) by Event ID
  ↓
Module 20: ROUTER — event match validation
  ├── Match found + event open:
  │     Module 5: Router → SuperSale filter
  │       ├── SuperSale:
  │       │     Module 6: Short.io — generate registration short URL
  │       │     Module 7: Send SMS with registration link
  │       │     Module 8: Send Email with event details
  │       │     Module 16: Create duplicate item in "DONE" group
  │       │     Module 19: Update duplicate → "הוזמן לאירוע"
  │       └── Other: (similar flow for MultiSale)
  └── No match:
        Module 21: Write error "אין התאמה לאירוע פתוח!" to Event Number field
```

### Messages

#### Hebrew SMS (Module 7)

```
היי {{2.name}}, ההרשמה ל-{{4.name}} שיתקיים בתאריך {{4.mappable_column_values.date_mky5xx32.text}} פתוחה.

לאישור הגעה:
{{6.shortURL}}
```

#### Hebrew Email (Module 8)

**Subject:** `ההרשמה פתוחה: {{4.name}} - נא אשרו הגעה`

Rich HTML template with event details, registration CTA button → `{{6.shortURL}}`, gift incentive block.

### Monday Board Interactions

| Board | ID | Action |
|-------|-----|--------|
| Tier 1: Incoming Leads | 5088674481 | **READ:** name, email, phone, Event Number (`text_mkzmd19y`), status, terms, eye exam, creation date |
| Tier 1: Incoming Leads | 5088674481 | **WRITE:** Create duplicate in DONE group, update status, set MOVE checkbox |
| Events Management | 5088674576 | **READ:** Event ID, name, date, hours, status, interests, form link |

### Key Write Pattern — Dual Item

This scenario creates a **duplicate item** in the DONE group as an audit trail:
1. Original item → status updated to "הוזמן לאירוע"
2. Copy created in DONE group with all fields copied verbatim
3. Copy gets: approval date = `{{now}}`, DONE = "Done", MOVE = checked

### Facebook Audience Sync

Module 41 pushes lead data to Facebook Custom Audience for retargeting:
- `fn`: `first(split(name, " "))` — first name
- `ln`: `last(split(name, " "))` — last name
- `email`, `phone`

### Filters

| Router | Condition | Purpose |
|--------|-----------|---------|
| Module 3 Path A | Event Number NOT exist + group = Approved | Auto-registration |
| Module 3 Path B | Event Number EXISTS + group = Approved | Manual registration |
| Module 5 | Event interests contain "SuperSale" | SuperSale path |
| Module 20 | Results ≥ 1 AND status = "Registration Open" | Open event validation |
| Module 21 | Results = 0 | No matching event error |

---

## כיוון למערכת חדשה (New System Direction)

### What Changes

1. **No more dual-item pattern** — Supabase handles audit via `crm_lead_history` table or `updated_at` timestamps. No need to duplicate rows.
2. **Facebook sync** — moves to a separate webhook/Edge Function that fires on lead status change, not embedded in registration flow
3. **Event matching** — `SELECT * FROM crm_events WHERE id = $1 AND status = 'registration_open'` replaces Monday board query
4. **Error handling** — proper error responses instead of writing error text to a Monday column

### What This Scenario Becomes

A single Supabase RPC: `register_lead_to_event(lead_id, event_id)`:
1. Validate event exists and is open
2. Validate capacity (< 50)
3. Update lead status → 'invited_to_event'
4. Log invitation in `crm_event_invitations`
5. Return success/error
6. Trigger async: send SMS + Email via Messaging Hub

### CRM Tables Needed

- `crm_event_invitations` — lead_id, event_id, invited_at, registration_url, channel
- `crm_lead_history` — lead_id, field_changed, old_value, new_value, changed_at (replaces dual-item audit)
