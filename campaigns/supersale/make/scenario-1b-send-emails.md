# Scenario 1B — Send Emails / Register Master Boards

> **Make ID:** 8474384 | **Modules:** 34 | **Ops:** 54
> **URL:** https://eu2.make.com/402680/scenarios/8474384/edit

---

## מצב קיים (Current State)

### Trigger

**Monday Webhook** — `watchBoardColumnValues` on Master Board (5088674569).
Hook name: "Master Board Messages". Fires when a label/status field changes.

### Flow Overview

```
Master Board column change
  ↓
Module 1: Webhook trigger
  ↓
Module 2: GetItem — fetch full lead details from Master Board (5088674569)
  ↓
Module 8: PRIMARY ROUTER
  ├── Path A: "תודה שנרשמת" (Thanks for Signing Up) → confirmation emails
  └── Path B: "Send Reg. link" → event registration link via SMS + Email
```

### Path A — Registration Confirmation Emails

Triggered when the "Email Messages" column is set to "תודה שנרשמת".

```
Module 3: Router — filter for "תודה שנרשמת" label
  ├── Module 5: Router — SuperSale (NOT MultiSale)
  │     ├── Module 5a: Send SuperSale HTML email (Gmail)
  │     └── Module 7: Update board — mark email sent
  └── Module 40: Router — MultiSale + Language
        ├── Hebrew → Module 4: Send Hebrew MultiSale email
        │            Module 6: Update board
        └── Russian → Module 39: Send Russian MultiSale email
                      Module 41: Update board
```

#### SuperSale Confirmation Email

**Subject:** `היי {{2.name}}, תודה שאישרת את התקנון!`

**Content:**
- Dark HTML template with multi-step process guide (4 steps)
- Pricing catalog WhatsApp button
- Brands page link
- Instagram link
- Store location (Herzl 32, Ashkelon) with Waze link
- Unsubscribe footer with short URL

### Path B — Event Registration Link

Triggered when "Email Messages" column is set to "Send Reg. link".

```
Module 9: Query Events Board (5088674576) — lookup event by Event ID
  ↓
Module 36, 37: Short.io — generate short URLs (registration + unsubscribe)
  ↓
Router: Language split
  ├── Hebrew path:
  │     Module 18: Send SMS (Global SMS)
  │     Module 19: Send Email (Gmail)
  │     Module 24: Update status → "הוזמן לאירוע"
  └── Russian path:
        Module 44: Send Russian SMS
        Module 45: Send Russian Email
        Module 46: Update status
```

### Messages — Path B (Event Registration)

#### Hebrew SMS (Module 18)

```
היי {{2.name}}, ההרשמה ל-{{9.name}} שיתקיים בתאריך {{9.mappable_column_values.date_mky5xx32.text}} פתוחה.

לאישור הגעה:
{{17.shortURL}}




לההסרה:
{{37.shortURL}}
```

#### Russian SMS (Module 44)

```
Здравствуйте, {{2.name}},

Открыта запись на {{9.name}} на {{9.mappable_column_values.date_mky5xx32.text}}.

Для подтверждения участия: {{42.shortURL}}




Отмена рассылки: {{43.shortURL}}
```

#### Hebrew Email (Module 19)

**Subject:** `ההרשמה פתוחה: {{9.name}} - נא אשרו הגעה`

**Content:**
- Event details with featured premium brands (Rodenstock, Zeiss, Leica, Hoya)
- Registration CTA button → `{{17.shortURL}}`
- 100% guarantee + exclusive discount messaging
- Location reminder + unsubscribe footer

#### Russian Email (Module 45)

**Subject:** `Открыта запись: {{9.name}} - подтвердите участие`

Same structure as Hebrew, Russian LTR version. CTA → `{{42.shortURL}}`

### Monday Board Interactions

| Board | ID | Action |
|-------|-----|--------|
| Master Board (Tier 2) | 5088674569 | **READ:** name, email, status, interests, phone, language (`color_mm0czkdv`), notes, "Email Messages" status |
| Master Board (Tier 2) | 5088674569 | **WRITE:** `color_mkzktxk5` (Email Messages) → "Send", status → "הוזמן לאירוע", notes append |
| Events Management | 5088674576 | **READ:** Event ID, name, date, times, interests, status, form link |

### Filters

| Router | Condition | Purpose |
|--------|-----------|---------|
| Router 3 | Message label = "תודה שנרשמת" | T&C confirmation path |
| Router 5 | NOT MultiSale in interests | SuperSale-specific |
| Router 40 | Language + Interest | Hebrew vs Russian MultiSale |
| Router 8 Path B | `text_mkzqwagk` EXISTS + group ≠ "Not Interested" + message = "Send Reg. link" | Registration link path |

### Key Data Mappings

| Variable | Source |
|----------|--------|
| `{{2.name}}` | Lead name |
| `{{2.mappable_column_values.email_mky18cr2.text}}` | Lead email |
| `{{2.mappable_column_values.phone_mky4a5fq.text}}` | Lead phone |
| `{{2.mappable_column_values.color_mm0czkdv.text}}` | Language (עברית/רוסית) |
| `{{2.mappable_column_values.dropdown_mkyfcdgn.text}}` | Interests |
| `{{9.name}}` | Event name |
| `{{9.mappable_column_values.date_mky5xx32.text}}` | Event date |
| `{{17.shortURL}}` / `{{42.shortURL}}` | Registration link (HE/RU) |
| `{{37.shortURL}}` / `{{43.shortURL}}` | Unsubscribe link (HE/RU) |

---

## כיוון למערכת חדשה (New System Direction)

### What Changes

1. **Trigger** — Supabase event on `crm_leads.email_status` change replaces Monday webhook
2. **Language routing** — `lead.language` field in Supabase, no need for Monday color column
3. **Email templates** — stored in `crm_message_templates` table, not hardcoded in Make modules
4. **Short URLs** — Supabase redirect table or internal URL shortener
5. **Status updates** — direct Supabase `UPDATE` instead of Monday API calls

### What This Scenario Becomes

In the new system, 1B splits into two Messaging Hub actions:

1. **"Send T&C Confirmation"** — auto-triggered after lead approves terms. Single email, language-aware.
2. **"Send Registration Link"** — manual or auto trigger from Messaging Hub. SMS + Email, language-aware.

Both are standard message templates in the hub, not separate Make scenarios.

### CRM Tables Needed

- `crm_message_templates` — template_id, name, channel (sms/email), language, subject, body_html, body_text
- `crm_message_log` — lead_id, template_id, sent_at, channel, status (sent/failed/bounced)
