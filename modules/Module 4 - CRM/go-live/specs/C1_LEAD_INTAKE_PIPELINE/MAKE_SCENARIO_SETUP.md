# Make Scenario Setup — Demo 1A-S Lead Intake (Supabase)

> **Created:** 2026-04-21
> **Scenario ID:** 9101245
> **Folder:** Demo (ID 499779)
> **Webhook URL:** `https://hook.eu2.make.com/y1p5x1zlqrwygdg4hi6klkgchci4o462`
> **Status:** CREATED — needs service_role key before activation

---

## Architecture (11 modules)

```
Webhook (4067178)
  |
Set Variable: FinalPhone (strip non-digits, 0→972)
  |
HTTP GET: crm_leads?phone=eq.+{FinalPhone} (duplicate check)
  |
Router ─┬─ Lead EXISTS ─► HTTP GET template (duplicate_sms) ─► Global SMS
        |
        └─ Lead NOT exists ─► HTTP POST crm_leads (insert)
                              ─► HTTP GET template (new_sms) ─► Global SMS
                              ─► HTTP GET template (new_email) ─► Gmail
```

## Connections Used

| Connection | ID | Purpose |
|---|---|---|
| Global SMS (PrizmaOptic) | 13198122 | Send SMS via Global SMS provider |
| Gmail (events@prizma-optic.co.il) | 13196610 | Send welcome email |

## ONE Manual Step Required

**Daniel must replace `REPLACE_WITH_SERVICE_ROLE_KEY` in all 5 HTTP modules.**

The Supabase service_role key bypasses RLS and is required for both reads
(tenant-scoped data) and writes (INSERT into crm_leads). The key is in
Supabase Dashboard → Settings → API → `service_role` (secret).

### How to do it:

1. Open Make → Demo folder → "Demo 1A-S — Lead Intake (Supabase)"
2. Click each of the 5 HTTP modules (modules 3, 5, 7, 8, 10)
3. In the Headers section, find `Authorization: Bearer REPLACE_WITH_SERVICE_ROLE_KEY`
4. Replace `REPLACE_WITH_SERVICE_ROLE_KEY` with the actual service_role key from Supabase
5. Save each module
6. Toggle the scenario ON (activate)

## Template Slugs Used

| Slug | Channel | When |
|---|---|---|
| `lead_intake_duplicate_sms_he` | SMS | Lead phone already exists |
| `lead_intake_new_sms_he` | SMS | New lead registered |
| `lead_intake_new_email_he` | Email | New lead registered |

All 4 templates (incl. `lead_intake_duplicate_email_he`) seeded in Supabase
demo tenant. See `seed-message-templates.sql`.

## Template Variable Interpolation

Templates use `{{name}}`, `{{phone}}`, `{{email}}` placeholders. The Make
scenario uses `replace()` functions to substitute webhook values before sending.

## Phone Format

- Webhook input: `0537889878` (local Israeli)
- Set Variable output: `972537889878` (international without +)
- DB storage / SMS destination: `+972537889878` (E.164 with +)

## Test Protocol

After activating, test with:
```
POST https://hook.eu2.make.com/y1p5x1zlqrwygdg4hi6klkgchci4o462
Content-Type: application/json

{
  "fields": {
    "name": { "raw_value": "Test Lead" },
    "phone": { "raw_value": "0537889878" },
    "email": { "raw_value": "danylis92@gmail.com" },
    "eyeexam": { "raw_value": "כן" },
    "comments": { "raw_value": "test from C1 SPEC" },
    "takanon": { "raw_value": "on" },
    "Language": { "raw_value": "he" },
    "utm_source": { "raw_value": "facebook" },
    "utm_medium": { "raw_value": "cpc" },
    "utm_campaign": { "raw_value": "demo_test" },
    "utm_content": { "raw_value": "c1_spec" },
    "utm_term": { "raw_value": "test" }
  }
}
```

### Expected Results:
1. New row in `crm_leads` with phone `+972537889878`, status `new`
2. SMS sent to `+972537889878` with welcome text
3. Email sent to `danylis92@gmail.com` with welcome email
4. Second submission: no new row, "already registered" SMS sent

### Cleanup:
```sql
DELETE FROM crm_leads
WHERE phone = '+972537889878'
  AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```
