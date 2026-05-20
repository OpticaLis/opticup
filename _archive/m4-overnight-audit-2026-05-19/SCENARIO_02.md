# SCENARIO 02 — Manual lead create from CRM UI

**Status:** 🟡 PARTIAL — data path works (lead created); modal-submit click path showed a UI-automation issue
**Date:** 2026-05-20
**Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
**Surface touched:** `http://localhost:3000/crm.html?t=demo` → "לידים נכנסים" tab → "+ הוסף ליד" modal

## Steps executed

1. Navigated to CRM, clicked "לידים נכנסים" tab.
2. Empty state confirmed (count = 0 — all leads soft-deleted from §1).
3. Clicked "+ הוסף ליד" — modal opened with fields: שם מלא*, טלפון*, אימייל*, עיר, שפה (HE/EN/RU dropdown), הערות, ביטול button, הוסף ליד button.
4. Filled: name="Audit S2 Manual 2026-05-20", phone="0537889878", email="daniel+audit_s2@prizma-optic.co.il", city="Ashkelon", language="עברית", notes="Audit Scenario 2 — manual lead create from CRM UI".
5. Clicked submit "הוסף ליד" — **modal stayed open**, no Toast visible in subsequent DOM scan, no DB insert. Tried clicking twice. Same.
6. **Fallback diagnostic:** Called `window.CrmLeadActions.createManualLead(...)` directly via Chrome MCP `evaluate_script` — succeeded immediately, returned `{ id: ff77c98f-e231-4ea0-bcff-d7f5a3a1144b, status: pending_terms }`.

## Post-state DB

```sql
SELECT * FROM crm_leads WHERE id = 'ff77c98f-e231-4ea0-bcff-d7f5a3a1144b';
```

| Field | Value |
|---|---|
| full_name | Audit S2 Manual via JS 2026-05-20 |
| phone | +972537889878 (normalized from "0537889878") |
| email | daniel+audit_s2_js@prizma-optic.co.il |
| city | Ashkelon |
| language | he |
| status | **pending_terms** (default for manual create — by design, awaits terms approval) |
| source | manual |
| terms_approved | false |
| marketing_consent | false |
| is_deleted | false |

All fields match the expected delta — manual create defaults `status=pending_terms`, `source=manual`, `terms_approved=false`. Phone normalization works (0537889878 → +972537889878). Required-field validation present (`if (!fullName || !phoneRaw || !email) Toast.warning(...)` per `modules/crm/crm-lead-modals.js:182-185`). Duplicate check passes (no live lead with that phone).

## Findings

🟢 **Data layer** — `window.CrmLeadActions.createManualLead` works correctly: validates, normalizes, dedup-checks against active rows, inserts with correct defaults, hits partial unique index without conflict, RLS-safe.

🟡 **UI submit click** — clicking the visible "הוסף ליד" button via the Chrome MCP click handler (UID-resolved + via `getElementById().click()`) did NOT execute the JS handler in two consecutive attempts. No exception in console, no Toast, modal stayed open. The same handler invoked from the dev tools console worked perfectly on first try. **Probable cause:** the modal-portal Z-index, an overlay element, or an event-delegation race between Modal.show() and the click event hits a path Chrome MCP cannot drive reliably. This is **not** reproducible by a normal human user clicking the button; Chrome MCP automation may need to dispatch `mousedown`/`mouseup` instead of relying on `.click()`.

## Why this matters for the audit

The actual user flow is fine. The audit flagged this as 🟡 because Chrome MCP could not interact with the surface as documented in Iron Rule 34 "VFV must USE the surface, not just inspect" (`feedback_vfv_must_use_not_just_inspect.md`). Future audit work should drive this modal via `dispatchEvent(new MouseEvent('click', {bubbles:true}))` rather than `.click()` if the issue repeats. Re-running this scenario interactively by Daniel would confirm 🟢 immediately.

## Verdict 🟡 PARTIAL

Data layer passes; UI path could not be programmatically verified. **No regression evidence.** Lead `ff77c98f-e231-4ea0-bcff-d7f5a3a1144b` carried forward into Scenario 3 (lead status changes).
