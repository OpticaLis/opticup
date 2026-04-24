# SPEC — STOREFRONT_FORMS Part B (Storefront Pages)

> **Location:** `modules/Module 4 - CRM/final/STOREFRONT_FORMS_PART_B/SPEC.md`
> **Authored by:** opticup-strategic (Cowork)
> **Authored on:** 2026-04-23
> **Module:** 4 — CRM
> **Phase:** Pre-Production (PRE_PRODUCTION_ROADMAP §1 + §2)
> **Author signature:** Cowork session wizardly-funny-johnson
> **Depends on:** STOREFRONT_FORMS Part A — CLOSED (commit 93880fe, f1eabf9)

---

## 1. Goal

Build two public-facing Astro pages on the storefront (`prizma-optic.co.il`):
`/event-register/` (pre-filled registration confirmation) and `/unsubscribe/`
(branded opt-out page). These pages replace the ERP-hosted equivalents and
consume the JSON APIs deployed in Part A.

---

## 2. Background & Motivation

Part A upgraded three Edge Functions: `event-register` now returns JSON pre-fill
data via `?token=...` GET and accepts HMAC-authenticated POST; `unsubscribe` now
returns JSON when called with `Accept: application/json`. Both EFs are deployed
and curl-verified (see `STOREFRONT_FORMS/EXECUTION_REPORT.md`).

The storefront needs two corresponding Astro pages that:
1. Present a branded experience under `prizma-optic.co.il` (not the ERP domain)
2. Use the tenant's theme, logo, and branding from `resolveTenant()`
3. Pre-fill the registration form so the invitee only confirms
4. Handle all states: loading, success, error, waiting list, already registered

**Design reference:** The current ERP registration form lives at
`modules/crm/public/event-register.{html,css,js}`. The storefront pages must
replicate this design in Astro + Tailwind, adapting to the storefront's design
system (CSS variables from `resolveTenant().storefront.theme`).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | `/event-register/` page exists | Astro file at `src/pages/event-register/index.astro` | `ls src/pages/event-register/index.astro` |
| 2 | `/unsubscribe/` page exists | Astro file at `src/pages/unsubscribe/index.astro` | `ls src/pages/unsubscribe/index.astro` |
| 3 | Build passes | `npm run build` → exit code 0 | Run build |
| 4 | Registration page fetches EF GET | Client-side `fetch` to `event-register?token=...` with anon key | Read code |
| 5 | Registration form pre-filled | Event name, date, time, location displayed read-only. Lead name shown in greeting. | Visual check on localhost |
| 6 | Registration form editable fields | arrival_time (select), eye_exam (select), notes (textarea with counter) | Visual check on localhost |
| 7 | Registration POST | Form submit calls EF POST with `{tenant_id, lead_id, event_id, arrival_time, eye_exam, notes}` | Read code |
| 8 | Registration success states | `registered` → success popup, `waiting_list` → warning popup, `already_registered` → info popup | Visual check or code review |
| 9 | Unsubscribe page fetches EF | Client-side `fetch` to `unsubscribe?token=...` with `Accept: application/json` + anon key | Read code |
| 10 | Unsubscribe success/error | Success → branded confirmation, Error → branded error with helpful message | Visual check on localhost |
| 11 | Both pages RTL | `dir="rtl"` on `<html>`, all layout uses logical properties (start/end, not left/right) | Read code |
| 12 | Both pages mobile-responsive | Usable on 375px viewport | Visual check on localhost |
| 13 | Tenant branding | Logo, tenant name, and theme CSS loaded from `resolveTenant()` | Read code |
| 14 | No direct table access | Pages use only EF fetch (client-side), no Supabase client imports | `grep -rn "supabase" src/pages/event-register/ src/pages/unsubscribe/` → 0 results for direct DB calls |
| 15 | Booking fee notice | Info notice about the deposit amount (from EF response `booking_fee`) | Visual check |
| 16 | File sizes | All new files ≤ 350 lines | `wc -l` on each file |
| 17 | No existing pages modified | `git diff --name-only` shows only new files | `git diff` |
| 18 | Visual verification | Both pages loaded on localhost, visually confirmed matching design spec | Screenshot or visual inspection |
| 19 | Commits | 1 commit for both pages | `git log` |

---

## 4. Architecture

### Data Flow

```
User clicks SMS link → prizma-optic.co.il/event-register?token=XXX
                             │
                             ▼
                    Astro SSR page loads
                    (no server-side EF call)
                             │
                             ▼
                    Client-side JS: fetch(EF_BASE + '?token=XXX')
                    with anon key headers
                             │
                             ▼
                    EF returns JSON: {lead_name, event_name, ...}
                             │
                             ▼
                    JS renders pre-filled form in DOM
                             │
                             ▼
                    User clicks "אישור" → POST to EF
                             │
                             ▼
                    Show result popup (success/waitlist/error)
```

### Why Client-Side Fetch (Not SSR)

The registration and unsubscribe pages must work as **client-side apps** that
call the EF directly from the browser. Reasons:
1. The EF `event-register` has `verify_jwt=false` — it's designed for public
   anonymous access via anon key.
2. SSR would require the storefront server to call the EF with server-side
   credentials, adding an unnecessary proxy layer.
3. The existing ERP form uses this exact pattern (client-side fetch) and it
   works well.
4. CORS headers are already configured on all EFs (`corsHeaders` object).

### Supabase Anon Key

The pages need the Supabase anon key to call EFs. This key is already available
in the storefront's environment as `PUBLIC_SUPABASE_ANON_KEY` (set in `.env`
and injected by Astro via `import.meta.env.PUBLIC_SUPABASE_ANON_KEY`).

The EF base URL is `PUBLIC_SUPABASE_URL + '/functions/v1/'`.

---

## 5. Design Specification

### Design Reference — LIVE PAGE

**CRITICAL:** An existing unsubscribe page is already live on the storefront at:
`https://www.prizma-optic.co.il/eventsunsubscribe/`

**The executor MUST open this page first** (via browser or curl) and replicate
its exact design language: layout, colors, fonts, spacing, card style, icons,
and overall feel. The new `/unsubscribe/` page should look identical to the
existing `/eventsunsubscribe/` page — just fed with dynamic values from the EF
JSON response instead of static content.

The same design language (card style, colors, typography) should carry over to
the `/event-register/` page as well, adapted for the form layout.

### Registration Page (`/event-register/`)

**Layout:** Match the card style from `/eventsunsubscribe/`. Max-width 560px.

**Visual hierarchy (top to bottom):**
1. **Tenant logo** — centered, from EF response `tenant_logo_url`
2. **Page title** — "אישור הגעה לאירוע" (h1)
3. **Info notice** — explaining the booking fee and process.
   Uses `booking_fee` from EF response. Contains WhatsApp link to store.
4. **Greeting** — "היי {lead_name},"
5. **Event card** — containing event details:
   - Event name
   - 📅 Date, ⏰ Time, 📍 Location
6. **Form fields:**
   - Arrival time (select): options "09:00 - 12:00 (בוקר)", "12:00 - 14:00 (צהריים)", "גמיש - כל השעות"
   - Eye exam (select): "כן, אשמח לבדיקה", "לא, יש לי מרשם עדכני"
   - Notes (textarea, maxlength 2000, with live counter)
7. **Submit button** — "אישור", full-width

**States:**
- Loading: centered spinner/text "טוען…"
- Error (invalid/expired token): error message + help text
- Form loaded: full form as described
- Submitting: button disabled + "שולח…"
- Result popups: overlay with icon, title, message (4 variants: success, waitlist, info, error)

### Unsubscribe Page (`/unsubscribe/`)

**Replicate the existing `/eventsunsubscribe/` page design exactly.**

The only difference: instead of static text, the page calls the `unsubscribe`
EF with `Accept: application/json` and renders the response dynamically.

**Content from EF response:**
- Success: title + message from `data.title` / `data.message`
- Error: title + message from `data.title` / `data.message`
- WhatsApp recovery link: `https://wa.me/972533645404`
- Footer: "ניתן לסגור חלון זה"

---

## 6. File Plan

### New files:

| File | Purpose | Est. lines |
|------|---------|-----------|
| `src/pages/event-register/index.astro` | Registration page — Astro shell + client-side JS | ~280-320 |
| `src/pages/unsubscribe/index.astro` | Unsubscribe page — Astro shell + client-side JS | ~180-220 |

### No modified files.

**Note on file structure:** Both pages are self-contained `.astro` files with
embedded `<script>` and `<style>` blocks. No separate component files needed —
the pages are simple enough to stay under 350 lines each. If either exceeds
330 lines, the executor should extract the client-side JS into a separate
`src/scripts/event-register.ts` or `src/scripts/unsubscribe.ts` file.

---

## 7. Autonomy Envelope

**What the executor CAN do without asking:**
- Create new Astro pages under `src/pages/`
- Create helper scripts under `src/scripts/` if needed for file-size
- Read any file in the storefront repo
- Run `npm run build` and `npm run dev`
- Run `npm install` if a dependency is needed (unlikely — all deps exist)
- Commit and push to `develop`
- Access localhost for visual verification

**What REQUIRES stopping and reporting:**
- Any existing page being modified
- Any new npm dependency being added
- Any build failure
- Any file exceeding 350 lines with no obvious trim path
- Any change to `astro.config.mjs`
- Any change to `BaseLayout.astro` or global CSS

---

## 8. Out of Scope (explicit)

- ERP-side changes (Part A is CLOSED)
- i18n (Hebrew only for now — these are tenant-specific pages)
- Dark theme
- Any DDL / schema changes
- SEO metadata beyond basic title (these pages are tokenized, not indexable)
- WhatsApp share button
- Any changes to existing storefront pages
- Contact form integration
- Analytics / tracking pixels

---

## 9. Implementation Notes

### BaseLayout Usage

Both pages should use the storefront's `BaseLayout.astro` for consistent
header/footer. Import pattern:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { resolveTenant, getThemeCSS } from '../../lib/tenant';

const tenant = await resolveTenant();
const tenantName = tenant?.name ?? 'Optic Up';
const themeCSS = tenant ? getThemeCSS(tenant.storefront.theme) : '';
---
<BaseLayout
  title="אישור הגעה לאירוע"
  locale="he"
  tenantName={tenantName}
  tenantLogo={tenant?.storefront.logo_url}
  themeCSS={themeCSS}
  phone={tenant?.phone}
  noindex={true}
>
  <!-- page content -->
</BaseLayout>
```

**Important:** Set `noindex={true}` on both pages — they contain tokenized
URLs and should never be indexed by search engines.

### EF Call Headers

All EF calls from client-side JS must include:
```js
headers: {
  'apikey': ANON_KEY,
  'Authorization': 'Bearer ' + ANON_KEY,
  'Content-Type': 'application/json'  // for POST only
}
```

Where `ANON_KEY` comes from a `<script define:vars={{ anon: import.meta.env.PUBLIC_SUPABASE_ANON_KEY, efBase: import.meta.env.PUBLIC_SUPABASE_URL }}>` block in the Astro frontmatter-to-client bridge.

### EF Response Shapes

**event-register GET** (success):
```json
{
  "success": true,
  "lead_id": "uuid",
  "event_id": "uuid",
  "tenant_id": "uuid",
  "lead_name": "שם מלא",
  "lead_phone": "+972...",
  "lead_email": "email@example.com",
  "event_name": "שם האירוע",
  "event_date": "2026-05-15",
  "event_time": "09:00:00",
  "event_location": "כתובת",
  "booking_fee": 50,
  "tenant_name": "אופטיקה פריזמה",
  "tenant_logo_url": "https://..."
}
```

**event-register GET** (error): `{ "success": false, "error": "invalid_token" | "invalid_ids" | "event_not_found" | "lead_not_found" }`

**event-register POST** (success): `{ "success": true, "status": "registered" | "waiting_list" }` or `{ "success": true, "error": "already_registered" }`

**unsubscribe GET** (with `Accept: application/json`):
- Success: `{ "success": true, "message": "הוסרת בהצלחה מרשימת התפוצה", "title": "הוסרת מרשימת התפוצה" }`
- Error: `{ "success": false, "message": "...", "title": "קישור לא תקין או שפג תוקפו" }`

### Date/Time Formatting

Dates: `YYYY-MM-DD` → `DD.MM.YYYY` (Israeli format)
Times: `HH:MM:SS` → `HH:MM` (trim seconds)

### Error Recovery

Both pages must handle:
- Missing `?token=` param → show error, suggest checking the original message
- Network failure → show connection error, suggest retrying
- EF returns error → show appropriate branded error

Never show raw error messages or stack traces to the public.

---

## 10. Stop-on-Deviation Triggers

- If `npm run build` fails → STOP
- If any existing page is modified → STOP
- If any file exceeds 350 lines → STOP (find a way to split before continuing)
- If the EF returns unexpected response shape → STOP (Part A may have an issue)
- If `resolveTenant()` fails or returns null → STOP (env vars may be missing)

---

## 11. Commit Plan

- Commit 1: `feat(crm): add event-register + unsubscribe storefront pages`
  - All new page files
- Final: `git status` → clean tree, `npm run build` → exit 0

---

## 12. Visual Verification Protocol (MANDATORY)

**After all code is written and builds pass, the executor MUST:**

1. Start the dev server: `npm run dev`
2. Open localhost in a browser (Claude in Chrome or equivalent)
3. Navigate to `localhost:4321/event-register?token=test` — verify:
   - Page loads without console errors
   - Loading state appears, then error state (invalid token is expected)
   - Error message is in Hebrew, centered, properly styled
   - Card has rounded corners, proper shadow, navy top border
   - Mobile responsive: resize to 375px width, verify layout doesn't break
4. Navigate to `localhost:4321/unsubscribe?token=test` — verify:
   - Page loads without console errors
   - Loading state appears, then error state (invalid token is expected)
   - Error card matches design: rose accent, warning icon, Hebrew text
   - Mobile responsive at 375px
5. **Visual checks to confirm:**
   - [ ] Heebo font is rendering (not fallback sans-serif)
   - [ ] RTL layout is correct (text right-aligned, logical properties)
   - [ ] Logo area exists (may not load without valid token, but container present)
   - [ ] Form fields render correctly on the registration page
   - [ ] Event card gradient renders (navy blue)
   - [ ] Submit button is full-width, blue, rounded
   - [ ] No English text leaking through (all UI text is Hebrew)
6. Document visual verification results in `EXECUTION_REPORT.md`

**Note:** With an invalid test token, the pages will show error states. This
is expected and sufficient for visual verification. Full end-to-end testing
(with real tokens from the CRM) happens after Part B is deployed and Part A's
`send-message` EF generates live storefront URLs.

---

## 13. Dependencies / Preconditions

- STOREFRONT_FORMS Part A CLOSED (commits 93880fe, f1eabf9) ✅
- All 3 EFs deployed to Supabase ✅
- Storefront repo on `develop` branch, clean tree
- `.env` has `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` set
- `npm install` completed (all deps available)

---

## 14. Lessons Incorporated

- FROM `STOREFRONT_FORMS/FOREMAN_REVIEW.md` → Lesson 2: all EF curl/fetch
  commands must include anon-key headers → APPLIED: §9 explicitly documents
  the required headers.
- FROM `STOREFRONT_FORMS/FOREMAN_REVIEW.md` → Lesson 1: include file-size
  budget → APPLIED: §6 estimates line counts and prescribes extraction if >330.
- FROM `STOREFRONT_FORMS/EXECUTION_REPORT.md` → placeholder leak fix: the
  storefront pages consume the EF response directly, so they are unaffected
  by the `isPlaceholder` fix (that's server-side in `send-message`).
- FROM Daniel: "תשים לב שבסוף הבניה הוא בודק הכל ויזואלית ומוודא שהכל עובד
  כמו שצריך ונראה כמו שרצינו" → APPLIED: §12 Visual Verification Protocol
  is MANDATORY, not optional.
