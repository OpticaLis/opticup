# Make Scenario — "Optic Up — Send Message"

> **Built by:** Daniel (manual) + Claude (guidance), 2026-04-22
> **Rebuilt from:** P3B_MAKE_MESSAGE_DISPATCHER SPEC — original API-built scenario replaced with manual build using native Supabase modules
> **Purpose:** Generic message dispatcher — receives webhook, fetches template from Supabase (native module), sends SMS/Email, logs result (native module).

---

## Identifiers

| Field | Value |
|---|---|
| Scenario ID | `9104395` |
| Scenario name | `Optic Up — Send Message` |
| Team ID | `402680` (Prizma Optics Make team) |
| Folder | Demo (id `499779`) |
| Webhook (hook) ID | `4068609` |
| Webhook URL | `https://hook.eu2.make.com/n7y5m7x9m9yn4uqo3ielqsobdn8s5nui` |
| Activated | Yes (2026-04-22) |
| Supabase connection | `14098961` — OpticUp Connection (native Supabase modules) |
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
- `variables` keys map to template placeholders `%name%`, `%phone%`, `%email%`, `%event_name%`, `%event_date%`, `%event_location%`.

### Template placeholder format

Templates in `crm_message_templates` use `%name%` style placeholders (NOT `{{name}}`).
Reason: Make interprets `{{...}}` as its own variable references, which breaks substitution.
The `%...%` format avoids this conflict entirely.

---

## Flow (8 modules)

```
[1] Webhook (gateway:CustomWebHook)
  ↓
[2] Supabase Search Rows — crm_message_templates
      filter: slug = {template_slug}_{channel}_{language}, tenant_id = {tenant_id}
  ↓
[3] Router ──┬── Route 1 (channel = sms):
             │     [4] Global SMS → sendSmsToRecipients → {variables.phone}
             │         body = template body with %name%→name, %phone%→phone, %email%→email substituted
             │     [5] Supabase Create Row → crm_message_log (status=sent)
             │
             ├── Route 2 (channel = email):
             │     [6] Gmail → sendAnEmail → {variables.email}
             │         subject = template subject with substitutions
             │         body = template body with substitutions
             │     [7] Supabase Create Row → crm_message_log (status=sent)
             │
             └── Route 3 (fallback — template not found / no bundles from Search):
                   [8] Supabase Create Row → crm_message_log (status=failed, error_message=...)
```

### Key design decisions

1. **Native Supabase modules** — Search Rows and Create Row use the "OpticUp Connection" (connection ID 14098961). No HTTP modules, no manual service_role key in headers. Auth is handled by the connection.
2. **Search Rows with 0 results** — When the template slug is not found, Search Rows emits 0 bundles. The Router's fallback route (Route 3) fires automatically — no need for explicit `__IMTLENGTH__` checks.
3. **Variable substitution** — Each route uses Make's `replace()` function to swap `%name%`, `%phone%`, `%email%` in the template body/subject with actual values from `{{1.variables.name}}` etc.
4. **Fallback route** — Route 3 has "fallback" enabled (runs when no other route matches). This catches both "template not found" and any unexpected channel values.

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
- Old API-built scenario `9103817` was deleted on 2026-04-22 (BundleValidationError — webhook UDT not registered via API).
- To rebuild: delete scenario `9104395` + hook `4068609`, then rebuild manually following the same 8-module pattern.

---

## Test results (2026-04-22)

All 3 paths verified on demo tenant:

| Path | Result | Details |
|---|---|---|
| Error (template not found) | ✅ PASS | `crm_message_log` row written with `status=failed`, error message includes slug |
| SMS | ✅ PASS | Global SMS sent to +972537889878, Hebrew content with variable substitution, log written `status=sent` |
| Email | ✅ PASS | Gmail sent from events@prizma-optic.co.il, Hebrew content with variable substitution, log written `status=sent` |
