# SPEC — STOREFRONT_FORMS_BUGFIX

> **Location:** `modules/Module 4 - CRM/final/STOREFRONT_FORMS_BUGFIX/SPEC.md`
> **Author:** opticup-strategic (Cowork)
> **Date:** 2026-04-23
> **Priority:** CRITICAL — production SMS/email links are broken
> **Estimated effort:** 15–25 minutes

---

## 1. Goal

Fix two bugs discovered during end-to-end testing of the STOREFRONT_FORMS
feature (Parts A + B):

1. **BUG 1 — registration_url uses old domain:** SMS/email registration links
   point to `app.opticalis.co.il/r.html?event_id=...&lead_id=...` instead of
   the new `prizma-optic.co.il/event-register?token=HMAC_SIGNED_TOKEN`.
2. **BUG 2 — unsubscribe page doesn't complete on mobile:** The storefront
   `/unsubscribe/` page loads but the unsubscribe action doesn't visually
   complete when opened on a phone.

---

## 2. Root Cause Analysis

### BUG 1 — registration_url old domain

The chain:
1. `crm-automation-engine.js:buildVariables()` (line 139) fetches the event
   row including `registration_form_url`.
2. Line 154: `if (evt.registration_form_url)` — if the column is populated,
   it's passed directly as `vars.registration_url`.
3. The `crm_events` table has old-format URLs stored in `registration_form_url`
   from the pre-STOREFRONT_FORMS era (format:
   `https://app.opticalis.co.il/r.html?event_id=X&lead_id=Y`).
4. `crm-messaging-send.js` passes `variables` to the `send-message` EF.
5. The EF's `hasOverride` check (line 179-181) sees `registration_url` starts
   with `https://` and preserves it — never generates the new HMAC-signed URL.

**Fix:** In `buildVariables()`, ignore `registration_form_url` when it
contains the old format (`r.html` or `app.opticalis`). Let the placeholder
pass through so the EF generates the correct HMAC URL.

### BUG 2 — unsubscribe page mobile

The unsubscribe EF (`supabase/functions/unsubscribe/index.ts`) auto-executes
the unsubscribe on GET and returns HTML (browser) or JSON (API). The EF logic
is correct. The storefront page (`opticup-storefront/src/pages/unsubscribe/
index.astro`) calls the EF with `Accept: application/json` via client-side
`fetch()`. Possible failure modes on mobile:

- Silent JS error in the fetch or response handling
- The page shows loading state but never transitions to success/error
- CORS or network issue specific to the storefront→EF call on mobile

**Fix:** Debug the storefront page's client-side JS. The fix is in the
storefront repo, not ERP.

---

## 3. Scope

### In scope
- `modules/crm/crm-automation-engine.js` — fix `buildVariables()` line 154
- `opticup-storefront/src/pages/unsubscribe/index.astro` — debug and fix
  client-side JS (if bug is there)
- End-to-end verification: send a test message and verify URLs are correct

### Out of scope
- Clearing old `registration_form_url` values from DB (they serve as legacy
  fallback for events that predate the new system)
- Modifying the `send-message` EF
- Modifying the `event-register` or `unsubscribe` EFs
- Any other CRM changes

---

## 4. Success Criteria

| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | `buildVariables()` ignores old-format `registration_form_url` | Read the code — line 154 now filters out URLs containing `r.html` or `app.opticalis` |
| 2 | New test SMS contains `prizma-optic.co.il/event-register?token=` | Send test message to 0537889878, check `crm_message_log` for correct URL |
| 3 | Unsubscribe page works on mobile | Navigate to `/unsubscribe?token=test` on localhost, verify success/error state renders correctly after EF call |
| 4 | `npm run build` passes in storefront repo (if touched) | Exit 0 |
| 5 | `git status` clean in both repos after commit | No uncommitted files |

---

## 5. Stop-on-Deviation Triggers

- If fixing Bug 2 requires modifying the unsubscribe EF — STOP
- If any other file besides the two listed needs changes — STOP
- If `npm run build` fails — STOP
- If the test message still shows the old URL after the fix — STOP

---

## 6. Commit Plan

- **ERP repo commit:** `fix(crm): filter legacy registration_form_url in buildVariables`
- **Storefront repo commit (if needed):** `fix(crm): fix unsubscribe page mobile rendering`

---

## 7. Implementation

### BUG 1 Fix

In `modules/crm/crm-automation-engine.js`, change lines 154-158 from:

```javascript
if (evt.registration_form_url) {
  vars.registration_url = evt.registration_form_url;
} else if (triggerData && triggerData.eventId) {
  vars.registration_url = '[קישור הרשמה — יצורף אוטומטית]';
}
```

To:

```javascript
// P-BUGFIX: ignore legacy registration_form_url values that point to the
// old ERP domain (app.opticalis.co.il/r.html). These must fall through
// to the placeholder so the send-message EF generates a new HMAC-signed
// storefront URL (prizma-optic.co.il/event-register?token=...).
var regUrl = evt.registration_form_url || '';
var isLegacyUrl = regUrl.indexOf('r.html') !== -1 || regUrl.indexOf('app.opticalis') !== -1;
if (regUrl && !isLegacyUrl) {
  vars.registration_url = regUrl;
} else if (triggerData && triggerData.eventId) {
  vars.registration_url = '[קישור הרשמה — יצורף אוטומטית]';
}
```

### BUG 2 Investigation

Read `opticup-storefront/src/pages/unsubscribe/index.astro` end-to-end.
Check:
1. Does the `fetch()` call include the correct headers (`apikey`, `Authorization`, `Accept: application/json`)?
2. Does the response handler check `data.success` correctly?
3. Is there error handling around the fetch (try/catch)?
4. Does the success state render visibly different from the loading state?
5. Test on localhost with `?token=test` — the EF should return an error (invalid token), verify the error state renders.

If the page code looks correct, the issue may be that Daniel's phone cached
an old version of the page. In that case, no code fix is needed — just confirm
the page works on localhost and report to Daniel that a hard refresh on mobile
should fix it.
