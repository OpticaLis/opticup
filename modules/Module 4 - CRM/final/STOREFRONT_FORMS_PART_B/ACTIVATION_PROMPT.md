# Activation Prompt — STOREFRONT_FORMS Part B (Storefront Pages)

> **Run this on Claude Code, in the `opticup-storefront` repo.**
> **Part A (ERP-side) is already CLOSED — do NOT touch the ERP repo.**

---

## Context

You are executing Part B of SPEC `STOREFRONT_FORMS`. The SPEC lives in the
ERP repo at: `modules/Module 4 - CRM/final/STOREFRONT_FORMS_PART_B/SPEC.md`

**What this SPEC does:** Creates two new Astro pages on the storefront:
`/event-register/` (pre-filled registration form) and `/unsubscribe/`
(branded opt-out page). Both consume the JSON APIs from the Edge Functions
that Part A deployed.

**What you are NOT doing:** touching ERP code, modifying EFs, changing DB.

## Pre-Flight

1. `git branch` → must be `develop`
2. `git pull origin develop`
3. `git status` → must be clean
4. Read the storefront CLAUDE.md for rules 24–30
5. Verify `.env` exists with `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`
6. `npm install` (if needed)

## Page 1 — `/event-register/` (Registration Confirmation)

Create `src/pages/event-register/index.astro`:

### Astro Frontmatter

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { resolveTenant, getThemeCSS } from '../../lib/tenant';

const tenant = await resolveTenant();
const tenantName = tenant?.name ?? '';
const themeCSS = tenant ? getThemeCSS(tenant.storefront.theme) : '';
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
---
```

### IMPORTANT — Design Reference

**Before writing ANY code, open the existing unsubscribe page in a browser:**
`https://www.prizma-optic.co.il/eventsunsubscribe/`

This is the design you must replicate. Both `/event-register/` and
`/unsubscribe/` must use the same design language (card style, colors,
fonts, spacing, icons). Copy the CSS patterns from the live page.

### HTML Structure

Use `BaseLayout` with `noindex={true}`. Inside:

1. A centered wrapper div (max-width 560px, margin auto)
2. A card matching the style from `/eventsunsubscribe/`
3. Inside the card, a `<div id="root">` with a loading indicator ("טוען…")
4. The card gets populated by client-side JS after EF fetch

### Client-Side JS

Use `<script define:vars={{ supabaseUrl, anonKey }}>` to pass env vars, then
a `<script>` block with the form logic:

1. **Read `?token=` from URL params**
   - If missing → show error: "הקישור חסר פרטים. בדוק את ההודעה האחרונה ששלחנו."

2. **Fetch EF GET:**
   ```js
   const EF_BASE = supabaseUrl + '/functions/v1/event-register';
   const resp = await fetch(EF_BASE + '?token=' + encodeURIComponent(token), {
     headers: {
       'apikey': anonKey,
       'Authorization': 'Bearer ' + anonKey
     }
   });
   const data = await resp.json();
   ```

3. **On error response** (`data.success === false`):
   - `invalid_token` → "הקישור אינו תקין או שפג תוקפו"
   - `event_not_found` → "אירוע לא נמצא"
   - `lead_not_found` → "פרטי מוזמן לא נמצאו"
   - Default → generic error

4. **On success** — render form:
   - Tenant logo (from `data.tenant_logo_url`)
   - Title: "אישור הגעה לאירוע" (h1)
   - Info notice about booking fee (`data.booking_fee` or default 50)
     including WhatsApp link: `https://wa.me/972533645404`
   - Greeting: "היי {data.lead_name},"
   - Event card (navy gradient):
     - "פרטי האירוע" label
     - Event name
     - 📅 Date (format DD.MM.YYYY from YYYY-MM-DD)
     - ⏰ Time (format HH:MM from HH:MM:SS)
     - 📍 Location
   - Form fields:
     - Arrival time select: "-- בחר/י --", "09:00 - 12:00 (בוקר)", "12:00 - 14:00 (צהריים)", "גמיש - כל השעות"
     - Eye exam select: "-- בחר/י --", "כן, אשמח לבדיקה", "לא, יש לי מרשם עדכני"
     - Notes textarea (maxlength 2000, live character counter)
   - Submit button: "אישור" (full-width, blue)

5. **Form submit → POST to EF:**
   ```js
   const payload = {
     tenant_id: data.tenant_id,
     lead_id: data.lead_id,
     event_id: data.event_id,
     arrival_time: arrivalTimeValue,
     eye_exam: eyeExamValue,
     notes: notesValue
   };
   fetch(EF_BASE, {
     method: 'POST',
     headers: {
       'apikey': anonKey,
       'Authorization': 'Bearer ' + anonKey,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify(payload)
   });
   ```

6. **Result popups** (overlay with icon + title + message):
   - `status: "registered"` → ✅ "ההרשמה בוצעה בהצלחה!" + "נתראה באירוע"
   - `status: "waiting_list"` → ⚠️ "נרשמת לרשימת ההמתנה" + explanation
   - `error: "already_registered"` → ℹ️ "כבר נרשמת לאירוע זה"
   - Any other error → ❌ "אירעה שגיאה" + message or generic fallback

### Styling

**Replicate the design from the live page `https://www.prizma-optic.co.il/eventsunsubscribe/`.**
Open it in a browser, inspect the CSS, and use the same card style, colors,
fonts, spacing, and visual language. Adapt for the form layout (event card,
form fields, submit button, popups). Both pages must feel like they belong
to the same design family as the existing unsubscribe page.

**Target: ≤ 320 lines.** If the file approaches 330, extract the `<script>`
into `src/scripts/event-register.ts` and import it.

---

## Page 2 — `/unsubscribe/` (Branded Opt-Out)

Create `src/pages/unsubscribe/index.astro`:

### Astro Frontmatter

Same pattern as registration page — resolve tenant, get theme CSS.

### IMPORTANT — Design Reference

**This page must look identical to the existing page at:**
`https://www.prizma-optic.co.il/eventsunsubscribe/`

Open it in a browser, copy its exact design (card, colors, fonts, icons,
spacing, WhatsApp button), and use the EF JSON response for the dynamic values
instead of static text.

### HTML Structure

1. Centered wrapper matching `/eventsunsubscribe/` layout
2. Card with `<div id="root">` — loading state initially
3. Client JS fetches unsubscribe EF, renders result

### Client-Side JS

1. **Read `?token=` from URL params** — if missing, show error
2. **Fetch EF GET with JSON mode:**
   ```js
   const EF_BASE = supabaseUrl + '/functions/v1/unsubscribe';
   const resp = await fetch(EF_BASE + '?token=' + encodeURIComponent(token), {
     headers: {
       'apikey': anonKey,
       'Authorization': 'Bearer ' + anonKey,
       'Accept': 'application/json'
     }
   });
   const data = await resp.json();
   ```

3. **Render result:**
   - Success (`data.success === true`):
     - Green check SVG icon
     - Title: data.title or "הוסרת מרשימת התפוצה"
     - Message: data.message
     - Accent: indigo (#4f46e5)
   - Error (`data.success === false`):
     - Red warning SVG icon
     - Title: data.title or "קישור לא תקין"
     - Message: data.message
     - Accent: rose (#e11d48)
   - Footer: "ניתן לסגור חלון זה" (muted text)

### Styling

**Copy the exact CSS from `https://www.prizma-optic.co.il/eventsunsubscribe/`.**
This page already has the design we want — replicate it.

**Target: ≤ 220 lines.**

---

## Deploy

After commit:
1. `npm run build` → must pass with 0 errors
2. Push to develop: `git push origin develop`
3. (Daniel will merge to main for production deploy on Vercel)

---

## Visual Verification — MANDATORY

**This step is NOT optional. You MUST do this before writing the EXECUTION_REPORT.**

1. Start dev server: `npm run dev`
2. Open browser and navigate to:

### Check 1: Registration page
- URL: `http://localhost:4321/event-register?token=test`
- Expected: page loads → loading state → error state (invalid token)
- Verify:
  - [ ] No console errors
  - [ ] Card renders with rounded corners, shadow, navy top border
  - [ ] Error message is in Hebrew
  - [ ] Page is RTL
  - [ ] Heebo font is loading
  - [ ] Mobile: resize to 375px → layout adapts, no horizontal scroll

### Check 2: Unsubscribe page
- URL: `http://localhost:4321/unsubscribe?token=test`
- Expected: page loads → loading state → error state (invalid token)
- Verify:
  - [ ] No console errors
  - [ ] Error card with rose accent top border
  - [ ] Warning icon renders
  - [ ] Hebrew text, RTL layout
  - [ ] Footer text "ניתן לסגור חלון זה" visible
  - [ ] Mobile: resize to 375px → layout adapts

### Check 3: Registration page structure (code review)
- Open `src/pages/event-register/index.astro`
- Verify the form rendering code includes:
  - [ ] Logo display from `tenant_logo_url`
  - [ ] Event card with gradient background
  - [ ] All 3 form fields (arrival_time, eye_exam, notes)
  - [ ] Character counter on notes textarea
  - [ ] Submit button "אישור"
  - [ ] All 4 popup variants (success, waitlist, info, error)

**Document ALL visual verification results in EXECUTION_REPORT.md.**

---

## Commit

```
git add src/pages/event-register/index.astro src/pages/unsubscribe/index.astro
# (add any extracted script files if created)
git commit -m "feat(crm): add event-register + unsubscribe storefront pages"
git push origin develop
```

## MANDATORY at End

- `git status` → clean. No uncommitted files.
- `npm run build` → exit 0.
- Write `EXECUTION_REPORT.md` + `FINDINGS.md` (if any) in the SPEC folder
  **in the ERP repo** at:
  `modules/Module 4 - CRM/final/STOREFRONT_FORMS_PART_B/`

## Warnings

- **Do NOT modify any existing pages** — only create new ones.
- **Do NOT modify BaseLayout, global CSS, or astro.config** unless absolutely
  necessary (and if so → STOP and report why).
- **Do NOT install new npm packages** — all needed deps already exist.
- **Do NOT skip visual verification** — Daniel explicitly requires it.
- **Do NOT create test data or touch the database.**
- **Do NOT modify ERP repo files** — Part A is CLOSED.
- **Remember anon key headers** on ALL EF fetch calls — without them you get
  `401 UNAUTHORIZED_NO_AUTH_HEADER` even though the EFs have `verify_jwt=false`.
