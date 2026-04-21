# Scenario 5A — פתיחת אירוע ושליחת הודעות (Open Event & Send Messages)

> **Make ID:** 8254965 | **Modules:** 69 | **Ops:** 735 | **Priority:** CORE
> **URL:** https://eu2.make.com/402680/scenarios/8254965/edit

---

## מצב קיים (Current State)

### Trigger

**Monday Webhook** — `watchBoardColumnValues` on Events Management board (5088674576).
Fires when the **Event Status** column changes (e.g., to "Registration Open").

### Flow Overview

```
Events Management board status change
  ↓
Module 1: Webhook trigger
  ↓
Module 2: Fetch full event details (GetItem from Events board 5088674576)
  ↓
Module 21: PRIMARY ROUTER — routes by Event Status value
  ├── Route 1: "Registration Open" → mass message flow
  ├── Route 2: "Will Open Tomorrow" → pre-opening notification
  └── Route 3: "Closed" → closure messaging
```

### Route 1: Registration Open (Main Flow)

```
Module 3: Query ALL leads from Master Board (5088674569)
           Filter: Status = "ממתין לאירוע" (Waiting for Event)
  ↓
Module 9: INTEREST FILTER ROUTER
           Condition: Lead's interests match event interests
           (pipe-delimited field comparison)
  ↓
Module 33: SHORT URL — generate registration link via Short.io
           Domain: prizmaoptic.short.gy
           Original: https://forms.monday.com/forms/d6f3ec64c578eb54e6c6ee3e194615de
                     ?r=euc1&name_id={{3.name}}&phone_id={{phone}}&email_id={{email}}
                     &event_id={{Event ID}}&Interest=SuperSale
           Redirect: 302 (temporary)
  ↓
Module 66: SHORT URL — generate unsubscribe link
           Original: https://prizma-optic.co.il/eventsunsubscribe/?item_id={{3.id}}
           Path slug: u{{3.id}}
  ↓
Module 5: SEND SMS (Global SMS)
Module 7: SEND EMAIL (Gmail)
  ↓
Module 8: UPDATE LEAD STATUS on Master Board
           Status → "הוזמן לאירוע" (Invited to Event)
           Notes append: "הודעת ״הרשמה נפתחה״ נשלחה | {{now}}"
```

### Messages — Registration Open

#### SMS (Global SMS)

```
{{3.name}}, נפתחה ההרשמה ל-{{2.name}} שיתקיים ב-{{2.mappable_column_values.date_mky5xx32.text}}.

הטבות האירוע מוגבלות ל-50 נרשמים בלבד - מומלץ לשריין מקום כעת לפני המעבר לרשימת המתנה.

💛 שימו לב: שריון המקום כרוך בדמי שריון של 50 ₪, שמקוזזים מהקנייה ביום האירוע (או מוחזרים בביטול עד 48 שעות לפני).

לרישום: {{33.shortURL}}

להסרה: {{66.shortURL}}
```

#### Email (Gmail — events@prizma-optic.co.il)

**Subject:** `ההרשמה נפתחה: {{2.name}} - כל הפרטים 👇`

**Design:** Dark theme (black bg #000000, gold accent #d4af37)

**Content blocks:**
1. Event details box — date, time (09:00-14:00), location (הרצל 32, אשקלון)
2. Booking fee notice: 50 ₪ reservation fee, credited against purchase or refunded until 48h before
3. Registration CTA button → `{{33.shortURL}}`
4. Unsubscribe footer

### Route 2: Will Open Tomorrow

#### SMS

```
עדכון מערכת - אירועי המכירות.

ההרשמה לאירוע הקרוב אליו נרשמת תיפתח מחר.

לידיעתך:
על מנת לשמור על איכות השירות וחוויית הקנייה, מספר המשתתפים באירוע הקרוב מוגבל ל־50 משתתפים.

עם פתיחת ההרשמה תישלח הודעה נוספת.
הפרטים המלאים נשלחו במייל.

להסרה: {{69.shortURL}}
```

#### Email

**Subject:** `פתיחת הרשמה לאירוע המכירות - עדכון`

Similar dark-themed HTML. Emphasizes "registration opens tomorrow" with event details button.

### Monday Board Interactions

| Board | ID | Action |
|-------|-----|--------|
| Events Management | 5088674576 | **READ:** Event name, Event ID (`text_mky7rmq8`), Date (`date_mky5xx32`), Time (`text_mky9k86w`), Status (`color_mky5aap2`), Send Messages (`color_mkzgh2c7`), Form Link (`link_mky5yjag`), Interests (`dropdown_mkygek3v`) |
| Master Board (Tier 2) | 5088674569 | **READ:** Full Name, Phone (`phone_mky4a5fq`), Email (`email_mky18cr2`), Interests (`dropdown_mkyfcdgn`), Status |
| Master Board (Tier 2) | 5088674569 | **WRITE:** Status → "הוזמן לאירוע", Notes append with timestamp |

### Key Data Mappings

| Variable | Source | Usage |
|----------|--------|-------|
| `{{2.name}}` | Event item name | Event title in all messages |
| `{{2.mappable_column_values.date_mky5xx32.text}}` | Event date column | Date display |
| `{{2.mappable_column_values.text_mky9k86w}}` | Available time | Hours (09:00-14:00) |
| `{{2.mappable_column_values.dropdown_mkygek3v.text}}` | Event interests | Filter leads |
| `{{3.name}}` | Lead full name | Personalization |
| `{{3.id}}` | Lead Monday item ID | Unsubscribe link param |
| `{{33.shortURL}}` | Short.io registration URL | Registration link |
| `{{66.shortURL}}` | Short.io unsubscribe URL | Unsubscribe link |

### Filters Summary

| Router | Condition | Purpose |
|--------|-----------|---------|
| Router 21 | Event Status = "Registration Open" | Main flow gate |
| Router 9 | Lead interests ∩ Event interests ≠ ∅ | Interest match filter |
| Router 33 | Event Type contains "SuperSale" AND Status = "ממתין לאירוע" | SuperSale-specific path |

---

## כיוון למערכת חדשה (New System Direction)

### What Changes

1. **Trigger moves to Supabase** — instead of Monday webhook, an Optic Up event status change fires a Supabase trigger or Edge Function
2. **Lead query from Supabase** — `SELECT * FROM crm_leads WHERE status = 'waiting_for_event' AND interests @> '{SuperSale}'` replaces Monday board query
3. **Short URLs** — can be generated server-side or use a simple redirect table in Supabase (no Short.io dependency)
4. **Messaging stays in Make** (initially) — Make scenarios call Supabase to get lead lists, then send via Green API / Global SMS / Gmail. Later: direct API calls from Edge Functions
5. **Status updates** — `UPDATE crm_leads SET status = 'invited_to_event', notes = notes || '...' WHERE id = ANY($1)` replaces Monday column updates
6. **Unsubscribe URL** — points to Optic Up internal endpoint, not prizma-optic.co.il

### CRM Tables Needed

- `crm_events` — event_id, name, date, time, location, status, interests, coupon, max_capacity
- `crm_leads` — name, phone, email, interests[], status, language, notes, tenant_id
- `crm_event_invitations` — event_id, lead_id, invited_at, channel (sms/email), short_url

### Messaging Hub Integration

This scenario is a **broadcast trigger** in the Messaging Hub concept. When an event opens:
1. Optic Up UI button "Open Registration" → sets event status
2. System auto-selects all matching leads (by interest + status)
3. Messaging Hub sends SMS + Email to all, with personalized short URLs
4. Each send is logged in `crm_messages` table

### What Stays the Same

- Message content (Hebrew copy) — proven to convert
- 50-person capacity limit messaging
- 50 ₪ booking fee copy
- SMS + Email dual-channel approach
- Unsubscribe link in every message
