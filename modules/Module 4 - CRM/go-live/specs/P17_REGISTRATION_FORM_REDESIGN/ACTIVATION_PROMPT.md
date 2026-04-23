# Claude Code — Execute P17 Registration Form Redesign SPEC

> **Machine:** Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P17 redesigns the public event registration form to match Daniel's approved
screenshot: storefront blue colors (not purple), deposit/barcode explanation
text, WhatsApp contact, and tenant branding (no "Optic Up"). This is a
UI/copy/styling SPEC with one small EF change (add `booking_fee` to GET).

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P17_REGISTRATION_FORM_REDESIGN/SPEC.md`

**Known untracked:** SPEC folders from P13/P14/P15/P16 may be untracked.
Ignore them, use selective `git add` by filename.

---

## Pre-Flight

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC fully
3. Verify current colors: `grep "4f46e5" modules/crm/public/event-register.css`
   should return hits (the purple we're replacing)
4. Verify current footer: `grep "Optic Up" modules/crm/public/event-register.html`
   should return 1 hit
5. Verify `booking_fee` exists: the SPEC already verified this via SQL
6. Start `localhost:3000`, verify CRM loads
7. **Only approved phones:** `+972537889878`, `+972503348349`

**If pre-flight passes → GO.**

---

## Execution Sequence

### Step 1 — CSS Color Swap

Edit `modules/crm/public/event-register.css`:
- Replace all purple/indigo hex values with blue equivalents (see SPEC §2A)
- Key swaps: `#4f46e5→#3b82f6`, `#4338ca→#2563eb`, `#7c3aed→#283593`,
  `#eef2ff→#eff6ff`, `#c7d2fe→#93c5fd`
- Event card gradient: `#4f46e5→#1a237e`, `#7c3aed→#283593`
- Box-shadow tints: `rgba(79,70,229,.XX)→rgba(26,35,126,.XX)`

### Step 2 — JS Content Updates

Edit `modules/crm/public/event-register.js`:
- Change title from `greeting` ("היי [name],") to `"אישור הגעה לאירוע"`
- Add info notice block after title with the 3-paragraph deposit text
  (use `data.booking_fee` for the dynamic amount, fallback to 50)
- Move greeting below info block, make it secondary (smaller/muted)
- Update field hints per SPEC §2E
- Change button text from "אישור ההרשמה" to "אישור"
- After `renderForm()`, set footer to `"© " + data.tenant_name`

### Step 3 — HTML Footer

Edit `modules/crm/public/event-register.html`:
- Change `&copy; Optic Up` to an empty placeholder or generic text that
  JS will overwrite

### Step 4 — EF Bootstrap Change

Edit `supabase/functions/event-register/index.ts`:
- Add `booking_fee` to the SELECT on line 76
- Add `booking_fee: evRes.data.booking_fee ?? 50,` to the response

Deploy: `supabase functions deploy event-register --project-ref tsxrrxzmdxaenlvocyit --no-verify-jwt`

### Step 5 — Verify

- Load the form on localhost via Chrome DevTools (or curl the EF bootstrap
  and verify `booking_fee` is in the response)
- Visual check: no purple anywhere, title is correct, deposit text shows
  dynamic amount, footer shows tenant name
- `grep -c "4f46e5\|4338ca\|7c3aed" modules/crm/public/event-register.css`
  must return 0
- `grep "Optic Up" modules/crm/public/event-register.html` must return 0

### Step 6 — Commit

```
git add modules/crm/public/event-register.css modules/crm/public/event-register.js modules/crm/public/event-register.html supabase/functions/event-register/index.ts
git commit -m "fix(crm): redesign registration form — storefront colors, deposit copy, branding fix"
git push origin develop
```

---

## Key Rules

- **Only approved phones** for any SMS test
- **Rule 9:** `booking_fee` from DB, not hardcoded. WhatsApp number is OK
  to hardcode (no `whatsapp_number` column in tenants yet).
- **Rule 12:** all files ≤ 350 lines
- **No logic changes** to the POST handler — this is UI/copy only + one
  GET field addition

---

*End of ACTIVATION_PROMPT — P17_REGISTRATION_FORM_REDESIGN*
