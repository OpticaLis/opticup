# INVESTIGATION_NOTES — PRE_CUTOVER_QA_B_FORM_AND_TEMPLATE

> **Investigated:** 2026-05-01 (executor commit 1 of 4 per SPEC §9).
> **Scope:** identify form HTML/JS/CSS, EF write path, read-side consumers
> for both eye-exam paths, design-canon delta vs current form CSS.

---

## 1. Form file locations (confirmed §1.5 pre-flight)

| File | Lines | Role |
|---|---:|---|
| `modules/crm/public/event-register.html` | 17 | Static shell, links Heebo Google Font + `event-register.css` + `event-register.js` |
| `modules/crm/public/event-register.js` | 203 | Bootstraps form (GET to EF), renders, submits |
| `modules/crm/public/event-register.css` | 124 | Current visual treatment (blue/navy palette) |
| `supabase/functions/event-register/index.ts` | (lines 280-320 area) | EF: GET bootstraps event+lead+tenant, POST registers + writes `eye_exam_needed` to `crm_event_attendees` |

The form is served by Optic Up's `event-register` Edge Function. Customers reach it via the `%registration_url%` placeholder substituted into T5/T7 lifecycle messages.

## 2. Eye-exam options — current state

`event-register.js:88-92`:
```js
'<select id="eye_exam" name="eye_exam">' +
  '<option value="">-- בחר/י --</option>' +
  '<option value="כן">כן, אשמח לבדיקה</option>' +
  '<option value="לא">לא, יש לי מרשם עדכני</option>' +
'</select>' +
```

**2 options today:** `כן, אשמח לבדיקה` / `לא, יש לי מרשם עדכני`. Stored values are `"כן"` / `"לא"` (the option `value=`, not the label).

The submit handler at `event-register.js:153`:
```js
eye_exam: (el('eye_exam').value || '').trim(),
```
sends the raw `value=` (`"כן"` / `"לא"`) to the EF.

## 3. EF write path

`supabase/functions/event-register/index.ts:295-296`:
```ts
if (typeof body.eye_exam === "string" && body.eye_exam.trim()) {
  patch.eye_exam_needed = body.eye_exam.trim();
}
```
Writes whatever string the form posts directly to `crm_event_attendees.eye_exam_needed` (TEXT, no validation). So when B1 changes the option `value=` to the new 4 strings, the new strings will land in the column verbatim.

## 4. Two distinct eye-exam paths in the system

| Path | Form | EF | DB target | Read-side(s) |
|---|---|---|---|---|
| A — Storefront SuperSale form | (storefront repo) | `lead-intake` | `crm_leads.client_notes` JSON `eye_exam` key | `crm-leads-detail.js:205` (lead detail card) |
| B — Auto event-registration form | `modules/crm/public/event-register.{html,js}` | `event-register` | `crm_event_attendees.eye_exam_needed` (TEXT) | **(none currently rendered)** |

**B1 scope = Path B only.** Path A is owned by `P5_7_STOREFRONT_FORM_REWIRE` (separate, post-cutover SPEC).

## 5. Read-side investigation for `eye_exam_needed`

`grep eye_exam_needed modules/crm/` returns **0 hits** — no JS/HTML in the CRM admin currently renders the per-attendee eye-exam value.

`grep v_crm_event_attendees_full modules/crm/` returns 5 files that consume the view (`crm-dashboard.js`, `crm-payment-helpers.js`, `crm-attendee-cancel.js`, `crm-events-detail.js`, `crm-event-day.js`), but every selector explicitly enumerates the columns it needs and **none include `eye_exam_needed`**.

**Conclusion.** SPEC §3 #6 expected the eye-exam value to flow to "(a) lead detail card, (b) event-day attendee row, (c) internal logs". In current code:
- (a) lead detail card reads from a DIFFERENT path (`lead.client_notes.eye_exam` JSON, set by lead-intake EF, not event-register EF). Not in B1 scope.
- (b) event-day attendee row does NOT currently display the value.
- (c) no internal log surface displays it either.

This means B1 cannot "propagate" to read-sides that don't exist. The conservative path is: ship the 4 new option strings (the user-facing change Daniel asked for) + document the rendering gap in `FINDINGS.md` for a future SPEC. Daniel's autonomy expansion rule #5 ("most conservative, closest to SPEC §1 Goal") authorizes this — SPEC §1 Goal says "represents the current intake taxonomy", which ships when the form options change. It does NOT explicitly say "build new render surfaces".

A future SPEC can decide whether to:
- Add an "eye-exam needed" column to the event-day attendee table.
- Surface it in the per-attendee detail panel.
- Mirror the value into `crm_lead_notes` for the lead's timeline.

That's a deliberate UX choice. Logging it as F1 in FINDINGS.md.

## 6. Design canon delta vs current `event-register.css`

| Tokens / property | Current | Canon target |
|---|---|---|
| Font family | `'Heebo', 'Arial', sans-serif` | `Rubik` (canon §2 "One font: Rubik") |
| Body bg | linear-gradient `#eff6ff` → `#f8fafc` (cool blue) | white or canon cream `#fef9f0` (canon §2 "Light mode: white/cream") |
| Card surface | `#ffffff` ✓ | white ✓ — keep |
| Card top border | `4px solid #1a237e` (navy) | not in canon — replace with gold `#c9a555` accent or remove |
| Hero h1 | navy-ish `#0f172a` text | black on white per canon |
| Event card bg | linear-gradient `#1a237e → #283593` (navy/indigo) | switch to canon dark surface `#1a1a1a/black` — but only for "dark mode" surfaces. For Light mode, white card with subtle border + gold accent is more on-brand. Will choose: white card with gold inset border + black text. |
| Primary CTA | solid blue `var(--primary)=#3b82f6`, white text | canon gold gradient `linear-gradient(135deg, #c9a555 0%, #c9a555 50%, #e8da94 100%)` with **black text** (canon §6.1 WCAG fix v1.1) |
| CTA hover | blue darker | gold hover `#b8943f` |
| Focus ring | blue `rgba(59, 130, 246, .12)` | gold equivalent `rgba(201, 165, 85, .15)` |
| Emoji 📅 ⏰ 📍 | inline in JS render | per Daniel's directive — remove (no Heroicons either; plain text labels) |
| Em-dashes / en-dashes | `—`, `–` in JS render strings | replace with short hyphens `-` per Pattern P6 |

Existing copy is largely Pattern-P6-clean already (uses `-`); only ~3 places use `—` and need a short-hyphen swap.

## 7. Files to change in B2

- `event-register.html` — change Heebo `<link>` to Rubik 400/500/700/900.
- `event-register.css` — full palette migration (blue → gold), Heebo → Rubik, remove navy border-top, replace event-card gradient, adjust focus ring.
- `event-register.js` — remove emoji from render strings, replace any em-dash with short hyphen, add gold gradient button styling reference.

## 8. Existing DB rows with old eye-exam values

Per SPEC §7 explicitly out of scope: do NOT backfill. Old rows display their old strings. Deferred to a future migration SPEC if Daniel wants normalization.

A read-only count to confirm the question is small:

```sql
-- Will run in B1 commit message + EXECUTION_REPORT for completeness
SELECT eye_exam_needed, COUNT(*)
FROM crm_event_attendees
WHERE eye_exam_needed IS NOT NULL
GROUP BY eye_exam_needed
ORDER BY 2 DESC;
```

Result will be inlined later. Even if there are 100s of old rows, they stay as-is per §7.

---

## 9. Plan (drives commits 2 + 3)

**B1 commit (#2):**
- Edit `event-register.js:88-92` — replace 2 options with the 4 from SPEC §2:
  1. `"לא, אין צורך בבדיקה"` → `value="לא, אין צורך בבדיקה"`
  2. `"כן, בדיקה רגילה"` → `value="כן, בדיקה רגילה"`
  3. `"כן, בדיקת מולטיפוקל"` → `value="כן, בדיקת מולטיפוקל"`
  4. `"יש לי כבר מרשם עדכני"` → `value="יש לי כבר מרשם עדכני"`
- EF unchanged — already writes verbatim.
- No read-side updates (none exist for this path).

**B2 commit (#3):**
- `event-register.html` — Heebo → Rubik (4 weights).
- `event-register.css` — full palette migration per §6.
- `event-register.js` — strip 3 emoji + any em-dash from render strings.
- Verify at 1280px desktop + 380px mobile via Chrome MCP if available; otherwise visual-check via static review and document the deferred live-browser leg.

---

*End of INVESTIGATION_NOTES.md.*
