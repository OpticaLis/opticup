# FINDINGS — PRE_CUTOVER_QA_B_FORM_AND_TEMPLATE

> Findings logged during execution that are NOT part of this SPEC's scope but
> deserve a follow-up. Format: one entry per finding, with severity, location,
> description, and suggested next action.

---

## F1 — `crm_event_attendees.eye_exam_needed` has no UI render surface

**Severity:** LOW (missing feature, not a bug)
**Location:** `modules/crm/` — across the 5 files that consume `v_crm_event_attendees_full` (`crm-dashboard.js`, `crm-payment-helpers.js`, `crm-attendee-cancel.js`, `crm-events-detail.js`, `crm-event-day.js`).
**Discovered while:** investigating SPEC §3 #6 read-side propagation.

**Description.** SPEC §3 #6 expected the eye-exam value submitted via the auto-event-registration form to flow to (a) lead detail card, (b) event-day attendee row, (c) internal logs. The grep confirms:
- `eye_exam_needed` is referenced 0 times in `modules/crm/` JS/HTML (only the form itself + the EF write path).
- The lead detail card (`crm-leads-detail.js:205`) reads from a DIFFERENT path: `lead.client_notes` JSON, set by the lead-intake EF (the storefront form, not this auto form).
- No `v_crm_event_attendees_full` consumer enumerates `eye_exam_needed` in its SELECT — even though the column is in the view.

So the data has a write path and a column, but no display anywhere in CRM admin.

**Suggested next action.** Decide which surface is the natural home and ship in a small follow-up SPEC:
- Option A: column in the event-day attendee table (operator sees who needs an exam at a glance).
- Option B: row in the per-attendee detail panel.
- Option C: mirror into `crm_lead_notes` so it shows in the lead's timeline.
- Option D: mirror into the lead detail card (so both Path-A and Path-B values display in the same place).

Daniel's UX call. Not blocking for cutover — the data is captured correctly, it just isn't surfaced.

---

## F2 — 8 historical rows carry the old `"כן"` short-value

**Severity:** INFO
**Location:** `crm_event_attendees.eye_exam_needed` cross-tenant.
**Discovered while:** B1 pre-state SELECT.

**Description.** Pre-B1, 8 rows had `eye_exam_needed = "כן"` (the legacy short value) and 0 rows had `"לא"`. Post-B1, NEW form submissions write the long Hebrew strings (`"לא, אין צורך בבדיקה"`, etc.). Existing 8 rows stay as-is per SPEC §7 (no backfill).

If the future surface SPEC (F1) renders the value, it will see two value families until either (a) the historical 8 rows get backfilled in a separate SPEC, or (b) the rendering code maps old → new at display time.

**Suggested next action.** When F1's UI surface SPEC is authored, either include a one-line backfill `UPDATE crm_event_attendees SET eye_exam_needed = 'כן, בדיקה רגילה' WHERE eye_exam_needed = 'כן'` (best guess for old "כן"), OR add a 4-line value-normalization helper at the read site. The 8 rows are likely cancelled / past-event QA test data anyway — Daniel can make the call.

---

## F3 — Heebo Google Font import was duplicated work — Rubik switch obsoletes existing PRE_CUTOVER and lifecycle templates that pull Heebo

**Severity:** LOW (consistency, not behavior)
**Location:** Various PRE_CUTOVER templates + (potentially) older render surfaces still referencing Heebo.
**Discovered while:** B2 font swap.

**Description.** The form's HTML pulled `Heebo` weights from Google Fonts. Other Optic Up surfaces (CRM admin, storefront) may still reference Heebo. Per canon §2 "One font: Rubik" — every surface should converge. Out of scope for this SPEC, but a project-wide font audit + migration is a natural follow-up.

**Suggested next action.** A future tech-debt SPEC: grep `Heebo` across the repos (this one + `opticup-storefront`), enumerate every callout, swap to Rubik. Estimate <2 hours of mechanical edits.

---

*End of FINDINGS.md.*
