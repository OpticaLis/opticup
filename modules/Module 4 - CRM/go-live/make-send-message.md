# Make Scenario — "Optic Up — Send Message"

> **Built by:** P3B_MAKE_MESSAGE_DISPATCHER SPEC (2026-04-22)
> **Purpose:** Generic message dispatcher — receives webhook, fetches template from Supabase, sends SMS/Email, logs result.

---

## Identifiers

| Field | Value |
|---|---|
| Scenario ID | `9103817` |
| Scenario name | `Optic Up — Send Message` |
| Team ID | `402680` (Prizma Optics Make team) |
| Folder | Demo (id `499779`) |
| Webhook (hook) ID | `4068400` |
| Webhook URL | `https://hook.eu2.make.com/b56ocktlm8rcpj52pu12qkthpke71c77` |
| Activated | Yes (2026-04-22) |
| SMS connection | `13198122` — My Global SMS connection |
| Email connection | `13196610` — My Gmail connection (events@prizma-optic.co.il) |

---

## Webhook payload (JSON)

```json
{
  "tenant_id": "<uuid>",
  "lead_id": "<uuid>",
  "template_slug": "lead_intake_new",
  "channel": "sms",
  "variables": {
    "name": "...",
    "phone": "+972...",
    "email": "...@...",
    "event_name": "...",
    "event_date": "...",
    "event_location": "..."
  },
  "event_id": null,
  "language": "he"
}
```

- `template_slug` is the BASE slug. Scenario appends `_{channel}_{language}` to form the full slug (e.g. `lead_intake_new_sms_he`).
- `channel` is one of `"sms"` / `"email"` (WhatsApp planned for a future SPEC).
- `language` defaults to `"he"` if missing.
- `event_id` may be `null`.
- `variables` keys map to template placeholders `{{name}}`, `{{phone}}`, `{{email}}`, `{{event_name}}`, `{{event_date}}`, `{{event_location}}`.

---

## Flow (13 modules)

```
[1] Webhook (gateway:CustomWebHook)
  ↓
[2] SetVariable "FullSlug" = template_slug + "_" + channel + "_" + (language|he)
  ↓
[3] SetVariable "NormalizedPhone" = strip non-digits, replace leading 0 with 972
  ↓
[4] HTTP GET crm_message_templates?slug=eq.{FullSlug}&tenant_id=eq.{tenant_id}&is_active=eq.true
  ↓
[5] Router ──┬── Route 1 (channel=sms AND length(template)>0):
             │     [6] SetVariable "SmsBody" (substituted body)
             │     [7] global-sms:sendSmsToRecipients → +{NormalizedPhone}
             │     [8] HTTP POST crm_message_log (status=sent)
             │
             ├── Route 2 (channel=email AND length(template)>0):
             │     [9]  SetVariable "EmailBody" (substituted body)
             │     [10] SetVariable "EmailSubject" (substituted subject)
             │     [11] google-email:sendAnEmail → {variables.email}
             │     [12] HTTP POST crm_message_log (status=sent)
             │
             └── Route 3 (length(template)=0 — template not found):
                   [13] HTTP POST crm_message_log (status=failed, error_message=...)
```

---

## Auth in HTTP modules

- `apikey` header: Supabase anon key (public, shipped in client — retrieve from `js/shared.js` or Supabase Dashboard → Settings → API).
- `Authorization: Bearer REPLACE_WITH_SERVICE_ROLE_KEY` — **placeholder** until Daniel replaces it manually in Make's UI. Required to bypass RLS when inserting into `crm_message_log` and reading templates.

Do NOT inline the real service_role key in this repo or in any git history. Rule 23.

---

## CRM helper

The scenario is called from CRM via `window.CrmMessaging.sendMessage()` — see `modules/crm/crm-messaging-send.js`. The webhook URL lives in `modules/crm/crm-messaging-config.js` (separate file so it's trivial to locate and update).

---

## P4 wiring points (future)

P3b does not wire any triggers. P4 will call `CrmMessaging.sendMessage(...)` from:

- Manual lead entry form submit (send terms-approval link)
- Event status change → "open" (send event announcement)
- Attendee registered (send confirmation)
- Other CRM touch points as they come up

---

## Operational notes

- Demo 1A-S (scenario `9101245`) is left untouched as a reference. It remains inactive. Do not modify or delete.
- To rebuild: delete scenario `9103817` + hook `4068400`, then re-run the P3B SPEC.
- To tweak the blueprint: edit via Make UI, OR update the `scenarios_update` call in a follow-up SPEC.
