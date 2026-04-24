# Activation Prompt — STOREFRONT_FORMS_BUGFIX

> **Run this on Claude Code. You will work in BOTH repos.**
> **SPEC:** `modules/Module 4 - CRM/final/STOREFRONT_FORMS_BUGFIX/SPEC.md`

---

## Context

Two bugs found during end-to-end testing of STOREFRONT_FORMS (Parts A + B).
Both are production-blocking — registration links in SMS/email go to the
wrong domain, and the unsubscribe page doesn't complete on mobile.

---

## Pre-Flight

1. `cd` to the ERP repo (`opticalis/opticup`)
2. `git branch` → must be `develop`
3. `git pull origin develop`
4. `git status` → must be clean

---

## BUG 1 — Fix registration_url old domain (ERP repo)

### The Problem

`crm-automation-engine.js:buildVariables()` line 154 reads
`evt.registration_form_url` from `crm_events` and passes it as
`vars.registration_url`. The DB has old-format URLs stored
(`https://app.opticalis.co.il/r.html?event_id=X&lead_id=Y`).
The `send-message` EF sees this is already a URL and preserves it,
never generating the new HMAC-signed storefront URL.

### The Fix

Open `modules/crm/crm-automation-engine.js`. Find lines 154-158:

```javascript
if (evt.registration_form_url) {
  vars.registration_url = evt.registration_form_url;
} else if (triggerData && triggerData.eventId) {
  vars.registration_url = '[קישור הרשמה — יצורף אוטומטית]';
}
```

Replace with:

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

### Verify

After the fix, grep to confirm:
```bash
grep -n "registration_form_url\|isLegacyUrl\|r\.html" modules/crm/crm-automation-engine.js
```

Expected: the new filter logic is in place, no raw passthrough of
`registration_form_url` without the legacy check.

### Commit (ERP repo)

```bash
git add modules/crm/crm-automation-engine.js
git commit -m "fix(crm): filter legacy registration_form_url in buildVariables

Old registration_form_url values in crm_events pointed to
app.opticalis.co.il/r.html — the pre-STOREFRONT_FORMS format.
buildVariables now ignores these so the send-message EF generates
the correct HMAC-signed storefront URL instead.

Fixes: M4-BUG-REGURL-01"
git push origin develop
```

---

## BUG 2 — Debug unsubscribe page (Storefront repo)

### Switch repos

```bash
cd ../opticup-storefront   # or wherever the storefront repo is
git branch                  # must be main (already merged)
git pull origin main
```

### Investigate

Read `src/pages/unsubscribe/index.astro` end-to-end. Check:

1. **Fetch call:** Does it include these headers?
   ```javascript
   headers: {
     'apikey': anonKey,
     'Authorization': 'Bearer ' + anonKey,
     'Accept': 'application/json'
   }
   ```

2. **Response handling:** Does it check `data.success === true` vs `false`?

3. **Error handling:** Is the fetch wrapped in try/catch? Does it handle
   network errors?

4. **Visual transition:** Does the success state look clearly different from
   the loading state? On mobile, is the success message visible without
   scrolling?

5. **Test on localhost:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:4321/unsubscribe?token=test` in Chrome DevTools.
   - The EF should return 400 (invalid token)
   - The page should show an error state with Hebrew text
   - Check console for any JS errors
   - Check Network tab: does the fetch to the EF complete?

### Common issues to look for

- Missing `Accept: application/json` header → EF returns HTML instead of JSON,
  `JSON.parse` fails silently
- The page might be calling the EF URL without the `/functions/v1/` path
- fetch error caught but not displayed (empty catch block)
- The page might render innerHTML but Astro scoped styles don't reach it
  (same bug as Part B — needs `<style is:global>`)

### Fix and commit (if code changes needed)

```bash
git add src/pages/unsubscribe/index.astro
git commit -m "fix(crm): fix unsubscribe page mobile rendering"
git push origin main
```

If the page code is correct and the issue is mobile caching, report that
no code fix is needed and Daniel should hard-refresh on his phone.

---

## MANDATORY at End

- Both repos: `git status` → clean
- ERP repo: the fix is on `develop` (Daniel will merge to main)
- Write `EXECUTION_REPORT.md` + `FINDINGS.md` (if any) in:
  `modules/Module 4 - CRM/final/STOREFRONT_FORMS_BUGFIX/`

---

## Warnings

- **Do NOT modify the send-message EF** — the fix is upstream in buildVariables
- **Do NOT modify the event-register or unsubscribe EFs**
- **Do NOT clear registration_form_url values from the DB** — they may be
  needed for legacy reference
- **Do NOT touch any other CRM files** — surgical fix only
- **Remember anon key headers** on all EF fetch calls
