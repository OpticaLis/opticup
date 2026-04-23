# SPEC — P16_FORMS_AND_UNSUBSCRIBE

> **Module:** Module 4 — CRM (+ storefront cross-repo)
> **Location:** `modules/Module 4 - CRM/go-live/specs/P16_FORMS_AND_UNSUBSCRIBE/`
> **Author:** opticup-strategic (Cowork)
> **Written:** 2026-04-23
> **Status:** READY FOR EXECUTION
> **Priority:** Pre-P7 — required for working SMS/Email links

---

## 1. Goal

Make three customer-facing links in CRM messages actually work:

1. **Unsubscribe link (`%unsubscribe_url%`)** — currently the Edge Function works
   but (a) doesn't update `status` to `unsubscribed`, and (b) the HTML page is
   bare-bones. Fix the EF and improve the HTML to match Prizma's brand.
2. **Event registration form (`%registration_url%`)** — currently a placeholder
   that resolves to nothing. Build a public HTML form matching the existing
   Monday form (arrival time, eye exam, notes) + success popup.
3. **Unsubscribed leads visibility** — default the registered leads board to
   hide `unsubscribed` leads, with a toggle to show them.

---

## 2. Tracks

### Track A — Unsubscribe Flow Fix (ERP repo)

**A1. Fix `unsubscribe` Edge Function** (`supabase/functions/unsubscribe/index.ts`)

Current behavior (line 152-161): sets `unsubscribed_at = now()` only.

Add to the same UPDATE:
```typescript
.update({
  unsubscribed_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  status: 'unsubscribed',  // ← ADD THIS
})
```

This ensures the CRM immediately reflects the unsubscribe in the leads board
and all audience filters exclude this lead.

**A2. Improve unsubscribe HTML response** (same file, `htmlPage` function)

The current success page says "הוסרת מרשימת התפוצה בהצלחה" in a plain card.
Enhance it to match Prizma's brand:
- Add Prizma logo (from `https://www.prizma-optic.co.il/images/logo.png` or
  inline SVG — verify actual URL)
- Add a ✅ checkmark icon
- Keep the card layout but add brand colors (indigo/slate theme)
- Keep the Hebrew RTL text
- Add: "ניתן לסגור חלון זה" at bottom
- Error pages: keep simple but add logo

**A3. Deploy the updated Edge Function**

```bash
supabase functions deploy unsubscribe --project-ref tsxrrxzmdxaenlvocyit
```

Verify: curl the function with a valid token → check both `unsubscribed_at`
AND `status='unsubscribed'` are set in the DB.

---

### Track B — Registered Leads Board Filter (ERP repo)

**B1. Default-exclude `unsubscribed` from registered tab** (`crm-leads-tab.js`)

Currently line ~69-93: the registered tab loads all `TIER2_STATUSES` leads.
`unsubscribed` is in `TIER2_STATUSES` so these leads show by default.

Change: when no filters are active (default view), exclude leads where
`status === 'unsubscribed'`. This means the default view shows only
"interested" leads.

Implementation approach — add a default exclusion in the filter logic:
```javascript
// In the filter function, when no status filters are selected (default):
// exclude 'unsubscribed' from the displayed leads
if (!state.statuses.length) {
  leads = leads.filter(function(r) { return r.status !== 'unsubscribed'; });
}
```

**B2. Add "הצג הוסרו" toggle** (`crm-leads-tab.js` or `crm-lead-filters.js`)

Add a small toggle/checkbox near the filter area: "הצג הוסרו מרשימה"
(show unsubscribed). When checked, `unsubscribed` leads appear in the table
(marked with a distinct visual indicator — gray row or strikethrough name).

Alternatively: the existing advanced filter already has multi-status checkboxes.
If the user explicitly selects "unsubscribed" in the status filter, it should
show them. The default exclusion only applies when NO status filter is active.

**Decision for executor:** Use the simplest approach — the existing status
filter checkboxes already allow selecting `unsubscribed`. Just change the
DEFAULT to exclude it. No new toggle needed if the filter already handles it.

---

### Track C — Event Registration Form (ERP repo — static HTML page)

**C1. Create the registration form page**

This is a standalone HTML page (no build step, no Astro) that:
- Lives at `modules/crm/public/event-register.html` (served by GitHub Pages
  at `app.opticalis.co.il/modules/crm/public/event-register.html`)
- OR: served inline by a new Edge Function `event-register`

**Daniel's preference (from screenshot):** The form should look exactly like
the existing Monday form. Fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| שעת הגעה מועדפת | dropdown | No | "הגעה גמישה - בחירת השעה עוזרת לנו לנהל..." |
| בדיקת ראייה | dropdown | No | "האם יש צורך בבדיקת ראייה?" |
| הערות | textarea | No | 2000 char limit |

The form arrives **pre-filled** with the lead's identity from URL params
(e.g., `?lead_id=X&event_id=Y&token=Z`). The lead does NOT need to enter
name/phone/email — those come from the link.

**C2. Form submission logic**

On submit ("אישור" button):
1. Call the `register_lead_to_event` RPC (via Supabase JS client or a new
   lightweight Edge Function wrapper)
2. On success → show popup: "ההרשמה בוצעה בהצלחה! 🎉" with event details
3. On `waiting_list` → show: "נרשמת לרשימת ההמתנה"
4. On `already_registered` → show: "כבר נרשמת לאירוע זה"
5. On error → show: "אירעה שגיאה, נסה שוב"
6. Store `eye_exam` and `preferred_arrival_time` and `notes` in
   `crm_event_attendees` columns (verify they exist — if not, store in
   a JSON column or `client_notes`)

**C3. Security for the registration form**

The form link must be secure enough that someone can't register arbitrary
leads. Options:
- **Option A (simple):** HMAC token in URL (same pattern as unsubscribe) —
  `?lead_id=X&event_id=Y&token=HMAC(lead_id:event_id:tenant_id)`
- **Option B (simpler):** The form calls the `register_lead_to_event` RPC
  which already requires `tenant_id` + `lead_id` + `event_id`. Without valid
  IDs the RPC fails. The UUID format makes guessing impractical.

**Recommendation:** Option B for simplicity. The RPC already validates.
The UUIDs are unguessable. No token infrastructure needed.

**C4. Wire `%registration_url%` in `buildVariables`**

File: `modules/crm/crm-automation-engine.js` — `buildVariables` function
(lines 120-138).

Add after the event variables block:
```javascript
if (evt && evt.registration_form_url) {
  vars.registration_url = evt.registration_form_url;
} else if (triggerData && triggerData.eventId) {
  // Auto-generate registration URL from event + lead
  vars.registration_url = 'https://app.opticalis.co.il/modules/crm/public/event-register.html'
    + '?event_id=' + triggerData.eventId
    + '&lead_id=' + lead.id;
}
```

Also update the SELECT in `buildVariables` (line 126) to include
`registration_form_url` in the event query.

**C5. Wire `%registration_url%` in `send-message` Edge Function**

File: `supabase/functions/send-message/index.ts` — `substituteVariables`

The EF already substitutes `%key%` patterns from the `variables` object.
If the CRM passes `registration_url` in variables, it will be substituted
automatically. **No EF change needed** — just ensure the CRM passes it.

But verify: does the `send-message` EF receive and forward the `variables`
object as-is? If yes → no EF change. If it filters/whitelists variables →
add `registration_url` to the whitelist.

---

## 3. Success Criteria

| # | Criterion | Expected |
|---|-----------|----------|
| 1 | Unsubscribe EF sets `status='unsubscribed'` | DB shows both `unsubscribed_at` AND `status='unsubscribed'` after curl test |
| 2 | Unsubscribe HTML page has Prizma logo | Visual check |
| 3 | Registered tab default hides unsubscribed leads | Load tab → no `unsubscribed` status leads visible by default |
| 4 | Selecting "unsubscribed" in status filter shows them | Filter → unsubscribed leads appear |
| 5 | Event registration form renders | Page loads at the chosen URL |
| 6 | Form fields match Daniel's screenshot | Arrival time dropdown, eye exam dropdown, notes textarea, אישור button |
| 7 | Form submit calls RPC and shows success popup | "ההרשמה בוצעה בהצלחה!" |
| 8 | `%registration_url%` resolves in messages | Template variable replaced with actual URL |
| 9 | `wc -l` all modified CRM files | ≤ 350 each |
| 10 | Zero new console errors | On both demo and prizma |

---

## 4. Autonomy Envelope

**HIGH AUTONOMY** with these checkpoints:

- **Checkpoint 1 (after Track A):** Report: "Unsubscribe EF deployed, tested
  with curl, status + timestamp both set. HTML improved."
- **Checkpoint 2 (after Track B):** Report: "Default filter excludes
  unsubscribed. Status filter checkbox reveals them."
- **Checkpoint 3 (after Track C):** Report: "Registration form at [URL],
  tested with [event_id], RPC returned [result], popup shown."

---

## 5. Stop-on-Deviation Triggers

1. `crm_event_attendees` doesn't have columns for `eye_exam` /
   `preferred_arrival_time` AND there's no JSON/notes column to store them
   → STOP, report, suggest schema approach
2. The `register_lead_to_event` RPC doesn't accept the needed params
   → STOP, report
3. Any CRM file would exceed 350 lines after edits
4. The `send-message` EF whitelists variables and `registration_url` is
   not passable → STOP, report

---

## 6. Files Affected

| File | Track | Changes |
|------|-------|---------|
| `supabase/functions/unsubscribe/index.ts` | A | Add `status: 'unsubscribed'` to UPDATE + improve HTML |
| `modules/crm/crm-leads-tab.js` | B | Default-exclude unsubscribed leads |
| `modules/crm/crm-automation-engine.js` | C | Wire `registration_url` in `buildVariables` |
| NEW: `modules/crm/public/event-register.html` | C | Standalone registration form page |

**Estimated: 3 existing files modified + 1 new file created.**

---

## 7. Out of Scope

- Terms approval mechanism (separate SPEC — requires a new endpoint + form)
- Short unsubscribe URL (requires either domain redirect or URL shortener)
- WhatsApp channel integration (deferred per architecture decision)
- Storefront repo changes (the unsubscribe EF returns its own HTML — no
  storefront route needed)
- Scheduled reminders (Level 2 automation, separate SPEC)
- Russian/English form translations

---

## 8. Expected Final State

```
supabase/functions/unsubscribe/index.ts    — +2 lines (status update + logo)
modules/crm/crm-leads-tab.js              — +3 lines (default filter)
modules/crm/crm-automation-engine.js       — +5 lines (registration_url)
modules/crm/public/event-register.html     — NEW, ~150-200 lines
```

3 commits:
1. `fix(crm): unsubscribe EF sets status + branded HTML`
2. `feat(crm): default-exclude unsubscribed from registered tab`
3. `feat(crm): event registration form + wire %registration_url%`

---

## 9. Rollback Plan

Revert commits individually. The unsubscribe EF can be re-deployed from
the previous version via `git checkout HEAD~1 -- supabase/functions/unsubscribe/`.

---

## 10. Commit Plan

See §8. Three focused commits, each testable independently.

---

## 11. Verification Evidence (Guardian Protocol)

| Claim | Verification |
|-------|-------------|
| Unsubscribe EF only sets `unsubscribed_at`, not `status` | **VERIFIED** — read `supabase/functions/unsubscribe/index.ts` lines 152-161: `.update({ unsubscribed_at, updated_at })` — no `status` field |
| `unsubscribed` status exists in seed data | **VERIFIED** — `crm-helpers.js:95`: `'unsubscribed'` is in `TIER2_STATUSES` |
| `not_interested` also exists | **VERIFIED** — `crm-helpers.js:94`: separate status, different meaning |
| Old unsubscribe URL pattern | **VERIFIED** — `prizma-optic.co.il/eventsunsubscribe/?item_id=` in 4 email HTML files |
| `registration_form_url` field exists in DB | **VERIFIED** — `crm-events-detail.js:54` SELECTs it; `CRM_SCHEMA_DESIGN.md:379` declares it |
| `%registration_url%` placeholder hardcoded | **VERIFIED** — `crm-messaging-templates.js:268`: `.replace(/%registration_url%/g, 'prizma-optic.co.il/r/...')` |
| `buildVariables` doesn't include `registration_url` | **VERIFIED** — `crm-automation-engine.js:120-138`: no `registration_url` key in the returned vars object |
| Design doc says EF should set status | **VERIFIED** — `scenario-un-unsubscribe.md:136`: `SET status = 'unsubscribed'` |
| FLOW.md form fields | **VERIFIED** — `FLOW.md:158-166`: arrival time, eye exam, notes, terms, marketing |

---

## 12. Lessons Already Incorporated

- **From P10 FOREMAN_REVIEW:** unsubscribe EF was designed to also set status
  (per design doc) but the implementation missed it. This SPEC closes the gap.
- **From P13 Finding M4-BUG-08:** audience filters depend on lead status, so
  setting `status='unsubscribed'` ensures these leads are correctly excluded
  from all automation rule audiences (the `unsubscribed_at` filter in
  `resolveRecipients` is belt; status is suspenders).
- **Cross-Reference Check completed 2026-04-23:** `event-register.html` path
  is new, no collision. `registration_url` variable name already exists in
  template system — reusing it, not creating new.

---

## 13. Open Questions for Executor

1. **Attendee data columns:** Do `crm_event_attendees` columns exist for
   `eye_exam`, `preferred_arrival_time`? If not, store in existing `notes`
   or `metadata` JSON column. Check `information_schema.columns` at pre-flight.
2. **GitHub Pages routing:** Does `app.opticalis.co.il/modules/crm/public/`
   serve static files? If not, consider the Edge Function approach instead.
3. **Logo URL:** Verify `https://www.prizma-optic.co.il/images/logo.png`
   actually returns the Prizma logo. If not, use an inline SVG or find the
   correct URL.

---

*End of SPEC — P16_FORMS_AND_UNSUBSCRIBE*
