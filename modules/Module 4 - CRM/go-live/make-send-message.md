# Make Scenario — "Optic Up — Send Message" (Architecture v3)

> **Architecture v3 — Make is a send-only pipe.** All business logic lives in the
> Supabase Edge Function `send-message`. Make receives a ready-to-send payload
> and forwards it to the correct channel. No Supabase modules. No templates.
> No DB access.
>
> **Built by:** Daniel (manual) + Claude (guidance)
> **Rebuilt on:** 2026-04-22 (re-architected from the 8-module P3b version)

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
| Activated | Yes (re-activated 2026-04-22 after v3 rebuild) |
| Modules | 4 (Webhook → Router → Global SMS \| Gmail) |
| SMS connection | `13198122` — My Global SMS connection |
| Email connection | `13196610` — My Gmail connection (`events@prizma-optic.co.il`) |

**No Supabase connection** — v3 intentionally removes the `OpticUp Connection`
(14098961) from this scenario. The Edge Function `send-message` is the only
code that talks to the database.

---

## Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│  CRM UI  ──▶  sb.functions.invoke('send-message', {...})          │
│                                                                  │
│  Storefront form  ──▶  /functions/v1/lead-intake                 │
│                          │                                       │
│                          ▼                                       │
│  Edge Function `lead-intake`                                     │
│    • Create lead (or detect duplicate)                           │
│    • fetch /functions/v1/send-message  (JWT anon)                │
│                          │                                       │
│                          ▼                                       │
│  Edge Function `send-message` (verify_jwt: true)                 │
│    1. Validate payload                                           │
│    2. Look up template_slug in crm_message_templates             │
│       (or use raw body for broadcast)                            │
│    3. Substitute %name% / %phone% / %email% / %event_*%          │
│    4. INSERT crm_message_log(status=pending)                     │
│    5. POST Make webhook with send-ready payload                  │
│    6. UPDATE crm_message_log to sent | failed                    │
│                          │                                       │
│                          ▼                                       │
│  Make scenario 9104395 (this document)                           │
│    [1] Custom Webhook                                            │
│    [2] Router                                                    │
│       ├─ Route 1 channel = sms  → [3a] Global SMS                │
│       └─ Route 2 channel = email → [3b] Gmail                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Webhook payload (from Edge Function → Make)

```json
{
  "channel": "sms" | "email",
  "recipient_phone": "+972537889878" | null,
  "recipient_email": "danylis92@gmail.com" | null,
  "subject": "email subject with substitutions applied" | null,
  "body": "message body with substitutions applied"
}
```

- `channel` drives the Router. Always `sms` or `email` for now
  (WhatsApp deferred until Meta WhatsApp Business API is wired).
- `recipient_phone` is in E.164 (`+972…`). Required when `channel = sms`.
- `recipient_email` is a plain email. Required when `channel = email`.
- `subject` is only relevant for the email route; SMS ignores it.
- `body` is fully rendered by the Edge Function — Make does zero variable
  substitution. For email, `body` is HTML; for SMS, plain text.

No `tenant_id`, no `lead_id`, no `template_slug`, no `variables` — Make
neither needs them nor has a DB to consult.

---

## Modules (4)

```
[1] Webhook (gateway:CustomWebHook)
    ↓
[2] Router
    ├── Route 1: channel = "sms"
    │     [3a] Global SMS → sendSmsToRecipients
    │            recipients  = {{1.recipient_phone}}
    │            body        = {{1.body}}
    │
    └── Route 2: channel = "email"
          [3b] Gmail → sendAnEmail
            to          = {{1.recipient_email}}
            subject     = {{1.subject}}
            body        = {{1.body}}
            contentType = HTML
```

No third "fallback" route is needed — the Edge Function validates `channel`
before calling Make, so only `sms` / `email` ever reach the Router. Error
handling lives inside the Edge Function (both before the Make call and after
the webhook returns non-200).

---

## Why architecture v3

**The problem with the 8-module P3b version:**
- Make held business logic (template fetch, variable substitution, log
  writes). Duplicated code already present in the CRM / Edge Functions.
- Make required a Supabase connection (service-role-ish credentials in
  a third-party platform).
- Template format conflicts (`{{name}}` vs. Make's own `{{…}}` syntax)
  forced us to keep variables in `%name%` format inside the DB.
- Changes to messaging logic required editing the Make scenario.

**The v3 design inverts this:**
- Supabase Edge Function holds 100% of the logic and DB access.
- Make holds the channel integrations only (Global SMS, Gmail).
- Adding or changing messaging behaviour is a git-tracked code change.
- Make can be swapped for any other send-only pipe in the future.

---

## Edge Function reference

- **Path:** `supabase/functions/send-message/index.ts`
- **Runtime:** `verify_jwt: true` — callers must present a valid JWT
  (legacy anon key, user JWT from `pin-auth`, or service role).
- **Env:**
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — standard Edge Function env.
  - `MAKE_SEND_MESSAGE_WEBHOOK_URL` — optional override. Falls back to the
    hardcoded URL above (matches `modules/crm/crm-messaging-config.js`).

### Request payload (CRM / lead-intake → send-message)

```json
{
  "tenant_id": "<uuid>",
  "lead_id": "<uuid>",
  "event_id": "<uuid>" | null,
  "channel": "sms" | "email",
  "template_slug": "lead_intake_new" | null,
  "body": "raw message body" | null,
  "subject": "raw email subject" | null,
  "variables": {
    "name": "...",
    "phone": "+972...",
    "email": "...@...",
    "event_name": "...",
    "event_date": "...",
    "event_time": "...",
    "event_location": "...",
    "coupon_code": "...",
    "registration_url": "...",
    "unsubscribe_url": "..."
  },
  "language": "he"
}
```

- Either `template_slug` OR `body` — not both (XOR).
- In template mode, full slug is composed as `{template_slug}_{channel}_{language}`.
  E.g. `lead_intake_new` + `sms` + `he` → `lead_intake_new_sms_he`.
- `variables.phone` feeds `recipient_phone` for SMS; `variables.email`
  feeds `recipient_email` for email.

### Response

```json
{
  "ok": true,
  "log_id": "<uuid>",
  "channel": "sms",
  "template_id": "<uuid>"
}
```

On failure (template missing, Make error, etc.) `ok: false` with an `error`
discriminator and the `log_id` of the failed `crm_message_log` row.

---

## Available template variables

These are the variables the Edge Function replaces inside template body and
(for email) subject. Missing variables are left as-is (`%unset%`) so
authoring bugs are visible instead of silently emitting empty strings.

| Variable | Hebrew label | Source |
|---|---|---|
| `%name%` | שם הלקוח | `crm_leads.full_name` |
| `%phone%` | טלפון | `crm_leads.phone` |
| `%email%` | אימייל | `crm_leads.email` |
| `%event_name%` | שם האירוע | `crm_events.name` |
| `%event_date%` | תאריך האירוע | `crm_events.event_date` |
| `%event_time%` | שעות האירוע | `crm_events.start_time` → `end_time` |
| `%event_location%` | מיקום האירוע | `crm_events.location_address` |
| `%coupon_code%` | קוד קופון | `crm_events.coupon_code` |
| `%registration_url%` | קישור הרשמה | `crm_events.registration_form_url` |
| `%unsubscribe_url%` | קישור הסרה | generated per-tenant (future) |

---

## CRM integration

### Frontend (authenticated UI)

- **Helper:** `window.CrmMessaging.sendMessage({...})` in
  `modules/crm/crm-messaging-send.js`. Invokes `send-message` through
  `sb.functions.invoke` — auth is derived from the CRM's PIN-auth session
  or anon key.
- **Modes:** `templateSlug` (lookup) or `body` (raw broadcast, for the
  Messaging Hub Broadcast Wizard when P5 wires it up).
- **Config:** `modules/crm/crm-messaging-config.js` keeps
  `MAKE_SEND_WEBHOOK` as human-readable documentation only — the value is
  not used at runtime by the frontend (it is the Edge Function's webhook
  target).

### Server-side (public form → lead-intake → send-message)

- **Path:** `supabase/functions/lead-intake/index.ts`.
- On new lead INSERT → fetch `/functions/v1/send-message` with
  `template_slug=lead_intake_new` for both SMS and email (email only if
  the lead provided one). Dispatches are wrapped in
  `Promise.allSettled` + `try/catch`, so a dispatch failure never blocks
  the form response — the lead is already persisted and
  `crm_message_log` captures the error.
- On duplicate detection (both initial check and 23505 race) → same
  pattern with `template_slug=lead_intake_duplicate`.
- **Auth quirk:** lead-intake hardcodes the legacy JWT anon key for the
  cross-function fetch. The `SUPABASE_ANON_KEY` env var inside Supabase
  Edge Functions currently returns the newer `sb_publishable_*` key
  format, which the gateway's `verify_jwt` rejects. The legacy JWT
  value is already git-tracked in `js/shared.js`, so this duplication is
  not a new secret exposure. See CHANGELOG P3c+P4 and FINDINGS for
  details.

---

## Operational notes

- Webhook URL `https://hook.eu2.make.com/n7y5m7x9m9yn4uqo3ielqsobdn8s5nui`
  is git-tracked in `crm-messaging-config.js` AND hardcoded as the default
  in `supabase/functions/send-message/index.ts`. Update both when the Make
  scenario is ever rebuilt with a new webhook.
- `MAKE_SEND_MESSAGE_WEBHOOK_URL` Supabase secret can override the default
  without a redeploy — useful for staging environments.
- Demo 1A-S (scenario `9101245`) is left untouched as a reference. It
  remains inactive. Do not modify or delete.
- To rebuild scenario `9104395`: delete the hook and scenario, then rebuild
  manually following the 4-module pattern above. Do not try to build this
  scenario via the Make API — a prior attempt (`9103817`) failed with
  `BundleValidationError` because webhook UDT is not registerable via API.

---

## Test results (2026-04-22, P3c+P4 execution)

All on demo tenant (`8d8cfa7e-ef58-49af-9702-a862d459cccb`), phone
`+972537889878`, email `danylis92@gmail.com`. Test logs cleaned after
verification (`crm_message_log` count on demo → 0).

| Path | Result | Details |
|---|---|---|
| Unauthenticated probe | ✅ PASS | `curl POST /send-message` → HTTP 401 |
| Error (template not found) | ✅ PASS | `template_slug=does_not_exist` → HTTP 404 + log row `status=failed`, `error_message=template_not_found: does_not_exist_sms_he` |
| Template SMS | ✅ PASS | `template_slug=lead_intake_new`, `channel=sms` → HTTP 200 + log row `status=sent`, Hebrew body with substituted `%name%` |
| Template Email | ✅ PASS | Same + `channel=email` → HTTP 200 + log row `status=sent`, Hebrew HTML body |
| Raw broadcast (no template) | ✅ PASS | `body="...to %name%..."` → HTTP 200 + log row `template_id=null`, `status=sent`, `%name%` substituted |
| lead-intake → new lead | ✅ PASS | `POST /lead-intake` → 201 + 2 log rows (sms + email) with `lead_intake_new` template, status=sent |
| lead-intake → duplicate | ✅ PASS | Same phone → 409 + 2 log rows with `lead_intake_duplicate` template, status=sent |
