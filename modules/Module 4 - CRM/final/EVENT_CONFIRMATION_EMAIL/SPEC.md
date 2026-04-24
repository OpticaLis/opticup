# SPEC — EVENT_CONFIRMATION_EMAIL

> **Location:** `modules/Module 4 - CRM/final/EVENT_CONFIRMATION_EMAIL/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-24
> **Module:** 4 — CRM
> **Priority:** HIGH — registration confirmation email arrives unstyled and without QR code

---

## 1. Goal

Build a branded HTML confirmation email with QR code for event registrants,
and add bulk status change functionality to the CRM leads board. After this
SPEC, leads who register receive a professional email with event details,
QR code for entrance scanning, and a payment link for the 50 NIS booking fee.

---

## 2. Background & Motivation

OPEN_ISSUES.md issues #3, #6, #7. Currently the post-registration
confirmation email is plain text with no branding. In the old Monday/Make
system, registrants received a QR code that was scanned at event entrance.
This needs to be restored in the new Supabase-native system. Additionally,
the CRM leads board needs bulk status change capability (select multiple
leads, change all their statuses at once).

Depends on: CRM_HOTFIXES SPEC must be closed first (send-message EF must
be working with short links).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Confirmation email template exists | Template in `crm_message_templates` with slug pattern `event_registration_confirmation_*_he` | SQL query → row exists, body contains HTML |
| 2 | Email contains QR code | HTML body includes `<img>` with QR code data (inline base64 or URL) | Inspect email template body |
| 3 | QR code encodes attendee identifier | QR content = attendee barcode or attendee_id | Code review of QR generation |
| 4 | Email contains payment link | Body includes Bit/payment link for 50 NIS booking fee | Template body inspection |
| 5 | Email is HTML-branded | Prizma branding: logo, gold/black theme, RTL, responsive | Template body inspection |
| 6 | Bulk status change UI works | Checkboxes on lead rows, "שנה סטטוס" bulk button appears on selection | Visual/code inspection |
| 7 | Bulk status change updates DB | Selected leads' statuses all update | SQL verification after test |
| 8 | git status clean | Nothing to commit | `git status` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- Run read-only SQL (Level 1)
- Insert/update message templates for demo tenant (Level 2, test data)
- Edit JS/HTML/CSS files in `modules/crm/`
- Create new files in `modules/crm/` (e.g., bulk-status-change module)
- Generate QR codes using a JS library or inline SVG generation
- Create HTML email templates matching existing Prizma branding
- Commit and push to `develop`

### What REQUIRES stopping and reporting
- Any modification to send-message EF or url-builders.ts
- Any new DB table or column
- Changes to shared.js
- Any file exceeding 350 lines
- Adding new npm dependencies to the ERP repo (ERP is vanilla JS, no npm)

---

## 5. Stop-on-Deviation Triggers

- If QR code library requires npm install in ERP repo → STOP (use inline
  SVG generation or a CDN-loaded library instead)
- If confirmation email template exceeds email client compatibility limits
  (use tables, inline styles, no flexbox/grid) → review approach
- If bulk status change requires a new RPC → STOP and document as finding

---

## 6. Rollback Plan

- **Code:** `git reset --hard` to commit before first change
- **DB:** Delete test templates: `DELETE FROM crm_message_templates WHERE
  slug LIKE 'event_registration_confirmation_%' AND tenant_id = '8d8cfa7e...'`
- **No schema changes** in this SPEC

---

## 7. Out of Scope

- Payment processing integration (link only, no Bit API integration)
- QR code scanning app/UI for event day (separate feature)
- Email delivery service setup (uses existing Make pipeline)
- WhatsApp confirmation messages
- Internationalization (Hebrew only for now)
- Changes to event-register or unsubscribe EFs

---

## 8. Expected Final State

### New files
- `modules/crm/crm-bulk-status.js` — bulk status change logic + UI
  (checkboxes, selection bar, status picker)

### Modified files
- `modules/crm/crm.html` — add `<script>` tag for new bulk-status module
- `modules/crm/crm-leads-board.js` — integrate checkboxes and bulk action
  bar into lead cards
- Template in `crm_message_templates` table — new HTML template for
  registration confirmation with QR code + payment link + branding

### DB state
- `crm_message_templates` has active template(s) for confirmation email
  (both SMS and email variants, Hebrew)

### Docs updated
- `modules/Module 4 - CRM/final/OPEN_ISSUES.md` — mark #3, #6, #7 resolved

---

## 9. Commit Plan

- Commit 1: `feat(crm): add branded HTML confirmation email template with QR code`
- Commit 2: `feat(crm): add bulk status change to leads board`
- Commit 3: `chore(spec): close EVENT_CONFIRMATION_EMAIL with retrospective`

---

## 10. Dependencies / Preconditions

- CRM_HOTFIXES SPEC must be closed (send-message EF working with short links)
- Existing email templates in `crm_message_templates` for reference on
  slug naming and structure
- Prizma branding reference: gold (#d4af37) on black (#000000), Prizma
  Optic logo, RTL layout

---

## 11. Lessons Already Incorporated

- FROM SHORT_LINKS FOREMAN_REVIEW: "line-count projection" → APPLIED: §5
  includes file size check, §8 plans new file instead of bloating existing.
- FROM SHORT_LINKS FOREMAN_REVIEW: "rollback plan must be explicit" →
  APPLIED: §6 includes template cleanup SQL.
- FROM STOREFRONT_FORMS_PART_B FOREMAN_REVIEW: "Astro CSS scoping" → NOT
  APPLICABLE (no storefront code in this SPEC).
- Cross-Reference Check completed 2026-04-24 against GLOBAL_SCHEMA: 0
  collisions. No new DB objects created; template rows use existing table.

---

## QR Code Implementation Notes

The QR code should be generated **server-side in the send-message EF** or
**as an inline SVG in the email template**. Options:

**Option A — Inline SVG QR (recommended):**
Generate a QR code as SVG directly in the email template using a
lightweight QR generation algorithm. The QR content should be the
attendee's barcode or a short identifier. Embed as inline `<img
src="data:image/svg+xml;base64,...">` for maximum email client
compatibility.

**Option B — External QR API:**
Use a free QR API like `https://api.qrserver.com/v1/create-qr-code/?data=ATTENDEE_ID&size=200x200`.
Simpler but depends on external service availability.

**Decision: executor chooses** based on what works best in the email
template context. Both are acceptable. The key requirement is that the
QR code contains a scannable identifier for the attendee.

---

## Payment Link Notes

Daniel mentioned a 50 NIS booking fee. The payment link should point to
Bit or a similar payment service. For now, use a **placeholder URL** like
`https://prizma-optic.co.il/payment?attendee_id=XXXX` — the actual
payment integration is out of scope. Mark it as a finding for future work
if no existing payment URL pattern exists.
