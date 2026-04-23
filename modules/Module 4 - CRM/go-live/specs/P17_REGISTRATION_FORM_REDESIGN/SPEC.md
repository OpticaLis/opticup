# SPEC — P17_REGISTRATION_FORM_REDESIGN

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P17_REGISTRATION_FORM_REDESIGN/`
> **Author:** opticup-strategic (Cowork)
> **Written:** 2026-04-23
> **Status:** READY FOR EXECUTION
> **Priority:** Pre-P7 — customer-facing form must look professional before cutover

---

## 1. Goal

Redesign the public event registration form to match Daniel's approved
screenshot design: storefront brand colors (blue, not purple), proper Hebrew
copy explaining the deposit/barcode flow, WhatsApp contact info, and tenant
branding throughout (no "Optic Up" anywhere). Also fix the footer branding
violation identified in P16 FOREMAN_REVIEW (M4-BRAND-P16-01).

---

## 2. Changes

### A — Color Scheme: Storefront Blue (replace purple)

The current form uses indigo/purple (`#4f46e5`). Daniel explicitly said
"בלי הסגול" (no purple). Replace with the ERP/storefront palette:

| CSS variable | Current (purple) | New (storefront blue) |
|---|---|---|
| `--primary` | `#4f46e5` | `#3b82f6` |
| `--primary-dark` | `#4338ca` | `#2563eb` |
| `--bg-start` | `#eef2ff` | `#eff6ff` |

Also update:
- `.event-card` gradient: from `#4f46e5 → #7c3aed` to `#1a237e → #283593`
  (navy gradient — matches the ERP header, gives a professional premium feel)
- `.card` `border-top`: from `var(--primary)` to `#1a237e` (navy accent line)
- `.card` `box-shadow`: change purple tint `rgba(79, 70, 229, .08)` to blue
  tint `rgba(26, 35, 126, .08)`
- `.popup.success .icon-wrap` stroke: from `#059669` to `#10b981` (keep green,
  just verify consistency)
- `button.submit:disabled` background: from `#c7d2fe` (purple-tint) to
  `#93c5fd` (blue-tint)
- Focus ring: `rgba(79, 70, 229, .12)` → `rgba(59, 130, 246, .12)`

### B — Title + Deposit Explanation Text

Replace the current greeting (`"היי [name],"` + generic subtitle) with
Daniel's approved copy from the screenshot:

**New title:** `אישור הגעה לאירוע`

**New subtitle block** (3 paragraphs, styled as info notice):

```
שימו לב: כדי להבטיח לכם שירות אישי ללא המתנה, אישור ההגעה הסופי וקבלת
הברקוד כרוכים בפיקדון סמלי (XX ש"ח) המתקזז במלואו מהרכישה (או מוחזר
בביטול עד 48 שעות מראש.

איך זה עובד? לאחר שליחת הטופס, תישלח אליכם הודעה אוטומטית להשלמת השריון
וקבלת הברקוד האישי באופן עצמאי.

לשאלות ועזרה ניתן לפנות אלינו בוואטסאפ: 053-3645404
```

**Dynamic value:** `XX ש"ח` must be replaced with the event's actual
`booking_fee` value from the EF bootstrap (e.g., "50 ש"ח"). This requires
adding `booking_fee` to the EF GET response (see §C).

**Styling:** This block should be styled as a soft info notice — light blue
background (`#eff6ff`), subtle border, smaller font (13-14px), good line
height. NOT a bold/alarming warning. See Daniel's screenshot: clean, readable,
professional text under the main title.

**The greeting** (`"היי [name],"`) moves BELOW this block, before the event
card. Keep it but make it secondary — smaller, muted color.

### C — EF Bootstrap: Add `booking_fee`

File: `supabase/functions/event-register/index.ts`

In the GET handler (line 76), add `booking_fee` to the event SELECT:
```typescript
.select("id, tenant_id, name, event_date, start_time, location_address, status, max_capacity, booking_fee")
```

And in the response (line 96-107), add:
```typescript
booking_fee: evRes.data.booking_fee ?? 50,
```

This lets the form display the correct deposit amount dynamically (Rule 9 —
no hardcoded business values).

### D — Footer Branding Fix

Replace `event-register.html` line 13:
```html
<div class="foot">&copy; Optic Up</div>
```

With a dynamic footer populated by JS after the EF bootstrap loads. The
footer should show the tenant name (e.g., "© אופטיקה פריזמה") — NOT
"Optic Up" or "Opticalis".

In `event-register.js`, after `renderForm()` receives `data.tenant_name`,
set the footer:
```javascript
var footEl = document.querySelector('.foot');
if (footEl && data.tenant_name) footEl.textContent = '© ' + data.tenant_name;
```

### E — Form Field Labels (minor polish from screenshot)

Daniel's screenshot shows slightly different labels. Match them:

| Current label | Screenshot label | Change? |
|---|---|---|
| `שעת הגעה מועדפת` | `שעת הגעה מועדפת` | Same ✅ |
| hint: `הגעה גמישה - בחירת השעה עוזרת לנו לנהל את זרימת המבקרים.` | `ההגעה גמישה - בחירת השעה עוזרת לנו לנהל את האירוע בצורה נוחה עבורך.` | Update hint text |
| `בדיקת ראייה` | `בדיקת ראייה*` | Add asterisk (required field visual cue) |
| hint: `האם יש צורך בבדיקת ראייה במהלך הביקור?` | `האם יש צורך בבדיקת ראייה?` | Shorten |
| `הערות` | `הערות` | Same ✅ |
| hint: `יש משהו שחשוב שנדע? (אופציונלי)` | `אם יש משהו שאנחנו צריכים לדעת לפני ההגעה (נגישות, העדפות וכו') - אפשר לכתוב כאן.` | Update hint text |
| button: `אישור ההרשמה` | `אישור` | Shorten button text |

### F — Overall Layout (match screenshot)

The screenshot shows a cleaner, simpler layout than the current form:
- No event card gradient block (the event details are NOT shown in the
  screenshot — the form is simpler, just title + explanation + fields)
- The form fields have clean underline-style borders, not rounded boxes
- The button is smaller and left-aligned (in RTL: right-aligned)

**Decision for executor:** The event card can stay (it's useful context for
the attendee), but make it more subtle — lighter colors, no gradient. If
the event card pushes the form below the fold on mobile, consider hiding
it or making it collapsible. Use judgment — the goal is the form should
feel clean and professional, matching the screenshot's overall feel.

---

## 3. Success Criteria

| # | Criterion | Expected |
|---|-----------|----------|
| 1 | No purple/indigo colors in `event-register.css` | `grep -c "4f46e5\|4338ca\|7c3aed\|c7d2fe" event-register.css` = 0 |
| 2 | Footer shows tenant name, not "Optic Up" | `grep "Optic Up" event-register.html` = 0 AND footer dynamically shows tenant_name |
| 3 | Title is "אישור הגעה לאירוע" | Visible in rendered form |
| 4 | Deposit text includes dynamic booking_fee | `grep "booking_fee" event-register.js` ≥ 1 AND `grep "booking_fee" index.ts` ≥ 1 |
| 5 | WhatsApp number visible | `grep "053-3645404" event-register.js` = 1 |
| 6 | Eye exam hint shortened | `grep "במהלך הביקור" event-register.js` = 0 |
| 7 | Button text is "אישור" | `grep "אישור ההרשמה" event-register.js` = 0 (replaced) |
| 8 | EF bootstrap returns `booking_fee` | `grep "booking_fee" index.ts` ≥ 2 (SELECT + response) |
| 9 | `wc -l` all modified files | ≤ 350 each |
| 10 | Zero new console errors | On demo tenant |

---

## 4. Autonomy Envelope

**MAXIMUM AUTONOMY.** This is a UI/copy/styling SPEC with zero business logic
changes. The only backend touch is adding one field to the EF GET response.

No checkpoints needed — report at completion.

---

## 5. Stop-on-Deviation Triggers

1. Any file would exceed 350 lines after edits
2. The EF deploy fails
3. The `booking_fee` column doesn't exist in `crm_events` (it does — verified
   via `information_schema`: `booking_fee NUMERIC DEFAULT 50.00`)
4. Any change to the POST handler logic (out of scope)

---

## 6. Files Affected

| File | Changes |
|------|---------|
| `modules/crm/public/event-register.css` (117L) | Replace purple colors with blue palette, update event-card gradient |
| `modules/crm/public/event-register.js` (194L) | New title/subtitle copy, dynamic booking_fee, footer update, hint text changes, button text |
| `modules/crm/public/event-register.html` (17L) | Remove static "© Optic Up" footer (or make it a placeholder for JS to populate) |
| `supabase/functions/event-register/index.ts` (198L) | Add `booking_fee` to SELECT + response |

**Estimated: 4 files modified, 0 new files.**

---

## 7. Out of Scope

- Event creation form changes (max_coupons, extra_coupons fields — separate
  SPEC for event management enhancements)
- Storefront URL in footer (tenants table doesn't have a `storefront_url`
  column yet — future SaaS enhancement)
- Registration form terms/marketing checkboxes (deferred per P16 §7)
- Unsubscribe page color changes (already branded correctly in P16)
- WhatsApp number from DB (hardcode for now; tenants table doesn't have a
  `whatsapp_number` column — future SaaS enhancement)
- Making eye_exam actually required (the asterisk is a visual cue only; the
  field remains optional in the EF)
- Short/vanity URL for the form link

---

## 8. Expected Final State

```
modules/crm/public/event-register.css  — ~117L (same count, color swaps)
modules/crm/public/event-register.js   — ~200-210L (added text block, minor growth)
modules/crm/public/event-register.html — ~17L (minimal change)
supabase/functions/event-register/index.ts — ~200L (+2 lines)
```

1 commit:
`fix(crm): redesign registration form — storefront colors, deposit copy, branding fix`

---

## 9. Rollback Plan

Revert the single commit. Redeploy the EF from HEAD~1 if needed.

---

## 10. Commit Plan

Single commit — all changes are a single logical unit (form redesign). The EF
change is trivial (one field added to SELECT/response) and ships with the
form that consumes it.

---

## 11. Verification Evidence (Guardian Protocol)

| Claim | Verification |
|-------|-------------|
| Current form uses purple `#4f46e5` | **VERIFIED** — read `event-register.css:1-2`: `--primary: #4f46e5` |
| Storefront primary is `#1a237e`, accent is `#3b82f6` | **VERIFIED** — read `css/styles.css:1`: `:root{--primary:#1a237e;...--accent:#3b82f6}` |
| Footer says "© Optic Up" | **VERIFIED** — read `event-register.html:13`: `<div class="foot">&copy; Optic Up</div>` |
| `booking_fee` exists in `crm_events` | **VERIFIED** — SQL query: `booking_fee NUMERIC DEFAULT 50.00` |
| `booking_fee` NOT in EF bootstrap response | **VERIFIED** — grep `event-register/index.ts` for `booking_fee` = 0 hits |
| `tenants` has no `storefront_url` or `whatsapp_number` | **VERIFIED** — SQL query returned only `logo_url` from the checked columns |
| Current title is greeting ("היי [name],") | **VERIFIED** — read `event-register.js:56-57` |
| Cross-Reference Check completed 2026-04-23 | No new DB objects, functions, or files. Only modifying existing 4 files. 0 collisions. |

---

## 12. Lessons Already Incorporated

- **From P16 FOREMAN_REVIEW proposal 2:** Customer-facing branding checklist
  — this SPEC explicitly addresses the footer branding violation and ensures
  no "Optic Up" text is visible to customers.
- **From P16 FOREMAN_REVIEW proposal 1:** Size estimation for HTML pages —
  this SPEC modifies existing files (not creating new), all currently under
  200L, growth is minimal (~10-15 lines in JS).
- **From P15 FOREMAN_REVIEW proposal 1:** Line-budget preflight — JS file at
  194L with ~15L of additions = ~209L, well within the 350 cap.

---

*End of SPEC — P17_REGISTRATION_FORM_REDESIGN*
