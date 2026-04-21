# Scenario 0A — Automations Board: הודעות משלימות (Supplementary Messages)

> **Make ID:** 8501661 | **Modules:** 43 | **Ops:** 0 (built but never triggered)
> **URL:** https://eu2.make.com/402680/scenarios/8501661/edit
> **Status:** Active but 0 executions. Fully wired, never triggered in production.

---

## מצב קיים (Current State)

### Trigger

**Monday Webhook** — `watchBoardColumnValues` on board 5089355329 (MultiSale Automations).
Hook name: "Automations - Trigger status changes". Fires on column value changes.

**Why 0 ops:** The webhook is configured but the Automations board (5089355329) has apparently never had the trigger column changed in production. This scenario is fully built and ready but has not been activated.

### Flow Overview

```
Automations board status change
  ↓
Module 1: Webhook trigger
  ↓
Module 2: GetItem — fetch full details from Automations board (5089355329)
  ↓
Module 21: MAIN ROUTER — 4 branches by status
  ├── Branch 1: "ממתין לאירוע" (Waiting) → event update messages
  ├── Branch 2: "הודעת אירועים פתוחים" + MultiSale → reminder waves
  ├── Branch 3: "הוזמן לאירוע" + SuperSale → invitation follow-ups
  └── Branch 4: "אישר הגעה" (Confirmed) → final day reminder
```

### Branch 1 — "ממתין לאירוע" (Waiting for Event Updates)

**Purpose:** Send "new event dates opened" notifications to leads waiting for an event.

```
Module 3: Query Master Board (5088674569) — leads with status "ממתין לאירוע"
  ↓
Module 4: LANGUAGE ROUTER
  ├── Hebrew:
  │     Module 10: Short.io — registration link
  │     Module 12: Short.io — unsubscribe link
  │     Module 5: Send SMS (Global SMS)
  │     Module 6: Send Email (Gmail)
  │     Module 8: Update lead status
  │
  └── Russian:
        Module 33: Short.io — registration link
        Module 34: Short.io — unsubscribe link
        Module 29: Send Russian SMS
        Module 30: Send Russian Email
        Module 32: Update lead status
```

#### Hebrew SMS (MultiSale Event Update)

```
עדכון אירועי המולטיפוקל: ימי בדיקה חדשים נפתחו!

כדי שנוכל לשריין לך שעה, יש לבחור תאריך כאן:
{{10.shortURL}}

*שריון התור הסופי (כולל שעת בדיקה) יתבצע טלפונית לפי סדר הפניות בטופס. 

להסרה:
{{12.shortURL}}
```

#### Russian SMS (MultiSale Event Update)

```
Обновление: открыты новые дни для подбора мультифокальных линз!

Чтобы мы могли забронировать для Вас время, выберите дату здесь: {{33.shortURL}}

*Окончательное согласование времени приема осуществляется по телефону, в порядке поступления заявок.

Отмена рассылки: {{34.shortURL}}
```

### Branch 2 — Reminder Waves (MultiSale)

**Purpose:** Send progressive reminders to leads about open events.

Three sub-routes for first/second/third reminders with urgency escalation.

#### Hebrew Reminder SMS (First wave)

```
היי {{16.name}}, כבר {{19.mappable_column_values.numeric_mm0p54pm}} רשומים מתוך 50 לאירוע המכירות הקרוב, שיתקיים ב{{19.mappable_column_values.date_mky5xx32.text}}.

נשארו מקומות - אבל לא לאורך זמן.
קישור להרשמה:
{{17.shortURL}}

להסרה: {{18.shortURL}}
```

### Branch 3 — SuperSale Invitation Follow-ups

**Purpose:** Follow-up messages to leads who were invited to a SuperSale event but haven't registered yet.

Includes SMS + Email with registration links and urgency messaging.

### Branch 4 — Confirmed Attendance Final Reminder

**Purpose:** Day-before/morning-of reminder for confirmed attendees.

Includes event details, location, and what to bring.

### Monday Board Interactions

| Board | ID | Action |
|-------|-----|--------|
| MultiSale Automations | 5089355329 | **READ:** Item name, status, language, interests |
| Master Board (Tier 2) | 5088674569 | **READ:** Leads by status, phone, email, language |
| Master Board (Tier 2) | 5088674569 | **WRITE:** Status updates, notes append |
| Events Management | 5088674576 | **READ:** Event details (date, registered count, status) |

### Filters Summary

| Branch | Condition |
|--------|-----------|
| Branch 1 | Status = "ממתין לאירוע" |
| Branch 2 | Item name = "הודעת אירועים פתוחים" AND Interest contains "MultiSale" |
| Branch 3 | Status = "הוזמן לאירוע" AND Interest = "SuperSale" |
| Branch 4 | Status = "אישר הגעה" |
| Language routing | `color_mm0czkdv.text` = "עברית" vs "רוסית" |

---

## כיוון למערכת חדשה (New System Direction)

### What Changes

1. **This entire scenario is the Messaging Hub** — it's the closest existing analog to what the Messaging Hub will do. The concept is the same: trigger-based messages by status + language.
2. **No separate Automations board** — triggers come from `crm_leads.status` changes directly
3. **Message templates** — stored in `crm_message_templates`, not hardcoded in Make modules
4. **Language routing** — `lead.language` field, automatic template selection
5. **Reminder waves** — scheduled jobs (cron) that query `crm_leads WHERE status = 'invited' AND event.date - NOW() < interval '3 days'`

### What This Scenario Becomes

**The Messaging Hub's automation engine.** Key automations:

| Trigger | Action | Timing |
|---------|--------|--------|
| Lead status → 'waiting_for_event' + new event opens | Send "new dates" notification | Immediate |
| Lead status → 'invited' + no registration after 24h | Send reminder wave 1 | +24h |
| Lead status → 'invited' + no registration after 48h | Send reminder wave 2 (urgency) | +48h |
| Lead status → 'confirmed' + event in 1 day | Send day-before reminder | Event date - 1 |
| Lead status → 'confirmed' + event today | Send morning-of reminder | Event day 8:00 |

All these become rows in a `crm_automation_rules` table, processed by a single Edge Function on a schedule.

### CRM Tables Needed

- `crm_automation_rules` — trigger_status, delay_minutes, template_id, channel, active
- `crm_message_templates` — with language variants
- `crm_message_log` — tracks which automation sent what to whom (prevents duplicates)
