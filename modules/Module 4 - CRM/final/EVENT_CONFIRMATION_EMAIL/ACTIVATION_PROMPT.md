# Activation Prompt — EVENT_CONFIRMATION_EMAIL

> **Run this on Claude Code. Requires CRM_HOTFIXES to be closed first.**
> **SPEC:** `modules/Module 4 - CRM/final/EVENT_CONFIRMATION_EMAIL/SPEC.md`

---

## Context

The post-registration confirmation email is currently plain text. This
SPEC adds a branded HTML email with QR code and payment link, plus bulk
status change for the leads board.

---

## Pre-Flight

1. `cd` to ERP repo
2. `git branch` → must be `develop`
3. `git pull origin develop`
4. `git status` → clean
5. Read the SPEC at `modules/Module 4 - CRM/final/EVENT_CONFIRMATION_EMAIL/SPEC.md`
6. Verify CRM_HOTFIXES is closed: check for `EXECUTION_REPORT.md` in
   `modules/Module 4 - CRM/final/CRM_HOTFIXES/`

---

## Part 1 — Branded Confirmation Email with QR Code

### Step 1: Study existing email templates

```sql
SELECT slug, channel, subject, LENGTH(body) as body_length
FROM crm_message_templates
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND is_active = true
ORDER BY slug;
```

Look at the `registration_open_*` templates for branding reference — they
use Prizma's gold/black theme.

### Step 2: Create the confirmation email template

Create an HTML email template that includes:

1. **Prizma branding header** — gold (#d4af37) on black (#000000), "PRIZMA
   OPTIC" text logo, "Luxury Eyewear Events" subtitle
2. **Greeting** — "היי %name%, ההרשמה אושרה!"
3. **Event details box** — event name, date, time, location (same layout as
   the registration_open template)
4. **QR Code section** — QR code image encoding the attendee barcode/ID
5. **Payment section** — "דמי שריון מקום: 50 ₪" with payment link button
6. **Footer** — unsubscribe link, copyright

**Variables needed:** `%name%`, `%event_name%`, `%event_date%`,
`%event_time%`, `%location%`, `%qr_code_url%`, `%payment_url%`,
`%unsubscribe_url%`

**Email HTML rules:**
- Use tables for layout (not divbox/flexbox)
- All styles inline
- RTL direction
- Responsive with `@media` fallbacks
- Maximum width 600px

### Step 3: Insert template into DB

Insert both SMS and email variants:

```sql
-- Email variant
INSERT INTO crm_message_templates (tenant_id, slug, channel, language, subject, body, is_active)
VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb',
  'event_registration_confirmation_email_he',
  'email', 'he',
  'אישור הרשמה: %event_name% - אופטיקה פריזמה',
  '<THE HTML BODY>',
  true
);

-- SMS variant (short, with short link)
INSERT INTO crm_message_templates (tenant_id, slug, channel, language, subject, body, is_active)
VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb',
  'event_registration_confirmation_sms_he',
  'sms', 'he',
  NULL,
  'שלום %name%, נרשמת בהצלחה ל-%event_name% בתאריך %event_date%. QR Code: %qr_code_url% | תשלום 50₪: %payment_url% | לביטול: %unsubscribe_url%',
  true
);
```

### Step 4: QR Code generation

Choose the simplest approach that works in email:

**Option A (recommended) — External QR API in template variable:**
In `send-message` EF (or in the automation engine when calling send-message),
build the QR URL:
```
https://api.qrserver.com/v1/create-qr-code/?data=ATTENDEE_BARCODE&size=200x200&format=png
```
Pass it as the `%qr_code_url%` variable. The email template uses:
```html
<img src="%qr_code_url%" alt="QR Code" width="200" height="200">
```

**Option B — Inline SVG:** Generate QR as base64-encoded SVG and embed.
More complex but no external dependency.

### Step 5: Wire the template into the registration flow

The confirmation is already sent after registration (via automation rule
or direct send). Find where the current plain-text confirmation is sent
and change the `template_slug` to `event_registration_confirmation`.

Check `crm-automation-engine.js` for a rule with trigger type like
`registration_confirmed` or similar. If no such rule exists, check the
`event-register` EF — it may call `send-message` directly after RPC
success.

---

## Part 2 — Bulk Status Change

### Step 1: Create `modules/crm/crm-bulk-status.js`

This module adds:
1. **Checkboxes** on each lead card in the board
2. **Selection bar** that appears when ≥1 lead is selected: shows count +
   "שנה סטטוס" button + "בטל בחירה" button
3. **Status picker modal** — dropdown with available statuses, confirm button
4. **Batch update** — updates all selected leads' statuses in one go

```javascript
// crm-bulk-status.js — Bulk status change for CRM leads board
// Integrates with crm-leads-board.js via events/callbacks

(function () {
  'use strict';
  // ... implementation
})();
```

### Step 2: Integrate into leads board

In `crm-leads-board.js`, add checkbox rendering to each lead card and
wire the selection events to the bulk-status module.

### Step 3: Add script tag

In `crm.html`, add:
```html
<script src="modules/crm/crm-bulk-status.js"></script>
```

### Verify

1. Open CRM → Leads board
2. Checkboxes visible on each lead card
3. Select 2+ leads → selection bar appears
4. Click "שנה סטטוס" → status picker opens
5. Select a status → all selected leads update
6. Board refreshes showing new statuses

---

## Post-Fix Verification (MANDATORY)

1. `git status` → clean
2. No console errors on CRM pages
3. Confirmation email template renders correctly (check raw HTML in browser)
4. Bulk status change works end-to-end
5. Update `modules/Module 4 - CRM/final/OPEN_ISSUES.md` — mark #3, #6, #7

---

## MANDATORY at End

- Write `EXECUTION_REPORT.md` + `FINDINGS.md` in:
  `modules/Module 4 - CRM/final/EVENT_CONFIRMATION_EMAIL/`
- `git status` clean
- Push to `develop`

---

## Warnings

- **Do NOT modify send-message EF** unless absolutely necessary for QR
  variable injection — prefer adding variables in the automation engine
  before the EF call
- **Do NOT install npm packages** — ERP is vanilla JS with no build step
- **Do NOT change existing email templates** — create new ones
- **Payment link is a placeholder** — no actual payment integration
- **QR API availability:** if using external QR API, add error handling
  for when the API is down (fallback: skip QR, still send email)
- **File size limit:** 350 lines max per file. The bulk-status module
  should be its own file, not added to crm-leads-board.js
