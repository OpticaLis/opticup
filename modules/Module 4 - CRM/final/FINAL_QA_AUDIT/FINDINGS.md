# FINDINGS — FINAL_QA_AUDIT

> Findings not fixed during this SPEC (per Iron Rule "one concern per task").
> Each entry has: ID, severity, location, description, suggested next action.

---

## M4-QA-01 — CRITICAL — Registration URL non-functional after merge

- **Location:** `modules/crm/crm-automation-engine.js:148-154`
- **Description:** Automation engine builds `https://app.opticalis.co.il/modules/crm/public/event-register.html?event_id=<uuid>&lead_id=<uuid>`. This path maps to GitHub Pages which serves `main`. The file `modules/crm/public/event-register.html` does not exist on `main` (verified via `git log origin/main -- …` returning empty). Every registration_open / invite_new / invite_waiting_list message sent today carries a link that will 404.
- **Evidence:** Confirmation Gate preview in test B2 displayed the broken URL with real event_id + lead_id UUIDs. `git log origin/main` returned no commits touching the file; only `develop` commit `c0f3c94` has it.
- **Suggested next action:** Dedicated fix SPEC covering:
  1. Merge `develop → main` (immediate fix — makes file reachable)
  2. Migrate to HMAC-token URL reusing the P10 unsubscribe pattern (`/r?t=<token>` instead of `?event_id=&lead_id=`)
  3. Surface the per-event `registration_form_url` override in the event create/edit modal
  4. Plan Option C (storefront-hosted form) as a Q2 follow-up SPEC
- **Severity rationale:** Blocks go-live. This is the CTA in 8 of 10 automation rules.

## M4-QA-02 — CRITICAL — Activity Log tab renders no content

- **Location:** `modules/crm/crm-bootstrap.js:38-43`
- **Description:** The `showCrmTab` override in bootstrap dispatches to 6 tabs but has NO case for `'activity-log'`. The new `renderActivityLog` handler in `crm-init.js:24-26` is never reached because the bootstrap override runs first and swallows the call. Header renders because of a separate `TAB_META` lookup at line 17, but `#activity-log-host` stays empty.
- **Evidence:** Browser test G4: clicked "לוג פעילות" nav button → `document.getElementById('activity-log-host').innerHTML` returned empty string. Header said "לוג פעילות — היסטוריית פעולות במערכת" but main was empty.
- **Suggested next action:** One-line fix in `crm-bootstrap.js` — add:
  ```js
  if (name === 'activity-log' && typeof renderActivityLog === 'function') {
    var host = document.getElementById('activity-log-host');
    if (host) renderActivityLog(host);
  }
  ```
- **Severity rationale:** Same regression class as M4-BUG-04 (P3a) that shipped to production. Daniel, QA, and Shir all expect this tab to work since it was shipped in P12.

## M4-QA-03 — CRITICAL — Public form registrations don't send confirmations

- **Location:** `supabase/functions/event-register/index.ts` (entire POST handler)
- **Description:** After a successful `register_lead_to_event` RPC call, the EF only updates attendee form-fields (scheduled_time, eye_exam, notes) and returns the RPC result. It does NOT call the `send-message` EF, does NOT invoke `CrmAutomation.evaluate`, does NOT dispatch the `event_registration_confirmation` template. So when a lead clicks the registration link (the common case once URL is fixed), they get an in-page popup but zero SMS/email confirmation.
- **Evidence:** Test C3 — successfully submitted the public form for P55 Daniel Secondary. DB: attendee row created ✅. `crm_message_log`: zero new rows after the submission ❌. Compare to UI-side registration via `registerLeadToEvent` in `crm-event-register.js` which calls `dispatchRegistrationConfirmation` explicitly after RPC success.
- **Suggested next action:** In `event-register/index.ts`, after the `result.success && result.attendee_id` block:
  1. Determine confirmation template slug based on `result.status` (`registered` → `event_registration_confirmation`; `waiting_list` → `event_waiting_list_confirmation`).
  2. Build variables (name, phone, email, event_name, event_date, event_time, event_location, registration_url, unsubscribe_url) from lead + event rows.
  3. Call `send-message` EF twice (SMS + email channels) via `Promise.allSettled` so dispatch failures don't fail the form submission.
  4. Alternative: expose the automation engine as a server-side Supabase RPC so all entry points use the same rule evaluator.
- **Severity rationale:** Blocks the core "happy path" of the go-live flow. Shir's operational assumption is "lead clicks → lead gets confirmation".

## M4-QA-04 — MEDIUM — Confirmation Gate leaves orphan pending_review log rows on cancel

- **Location:** `modules/crm/crm-confirm-send.js` (not read in detail; inferred from behavior) and `crm-messaging-send.js` or similar INSERT call
- **Description:** Opening a Confirmation Gate creates `crm_message_log` rows with `status='pending_review'`. If the user clicks "בטל" instead of "אשר ושלח", these rows are not deleted — they persist in the log showing "ממתין לאישור" indefinitely. Observed 4 such rows from one cancelled B2 run.
- **Evidence:** 4 `pending_review` rows at 2026-04-23 15:43:05 for cancelled gate; 2 `sent` rows at 15:44:21 for the later approved gate. After cleanup SQL the pending_review rows were removed along with the sent rows.
- **Suggested next action:** Either (a) DELETE pending_review rows on cancel, (b) defer the INSERT until "אשר ושלח" is clicked, or (c) add a nightly sweep EF that deletes pending_review older than 24h.
- **Severity rationale:** Clutters the log, but doesn't break anything. Would fail a "zero stuck messages" health check.

## M4-QA-05 — LOW — Confirmation Gate preview shows literal `%unsubscribe_url%`

- **Location:** `modules/crm/crm-automation-engine.js` — `buildVariables()` does not include `unsubscribe_url` in the variables object, so `substituteVars()` in `prepareRulePlan` leaves `%unsubscribe_url%` un-replaced. The real substitution happens server-side in `send-message` EF at actual send time.
- **Description:** In SMS preview during the Confirmation Gate, the last line reads `להסרה: %unsubscribe_url%` (literal), confusing any reviewer. The server-side substitution is correct design (tokens have 90-day TTL, shouldn't be pre-generated at preview time), but the client preview misleads.
- **Evidence:** Test B2 Confirmation Gate preview, captured from the rendered modal HTML.
- **Suggested next action:** Replace `%unsubscribe_url%` in preview with the literal Hebrew placeholder `[קישור הסרה יצורף בשליחה]`, or generate a clearly-fake preview token like `<tenant>/unsubscribe?token=<preview-placeholder>`.
- **Severity rationale:** Pure UX.

## M4-QA-06 — LOW — UI label typo "כללי אוטומטיה" should be "כללי אוטומציה"

- **Location:**
  - `modules/crm/crm-messaging-rules.js:92`, `:113`, `:184`
  - `modules/crm/crm-messaging-tab.js:10`
- **Description:** Hebrew typo. "אוטומציה" = automation (correct). "אוטומטיה" = awkward morphology (wrong). The page subtitle on the same screen uses the correct spelling ("תבניות, אוטומציה ושליחה ידנית") — the two disagree.
- **Evidence:** `grep -rn "אוטומטיה" modules/crm/*.js` returned 4 hits; page subtitle from `crm-messaging-tab.js` meta says "אוטומציה".
- **Suggested next action:** Single search-replace across all 4 occurrences.
- **Severity rationale:** Embarrassing but harmless.

## M4-QA-07 — LOW — Event detail modal does not auto-refresh

- **Location:** `modules/crm/crm-events-detail.js` (inferred — modal render does a one-shot query, no live subscription or interval poll)
- **Description:** If the event detail modal is open when an external event (public form submission, another user's UI action) mutates `crm_event_attendees`, the modal's KPI cards, capacity bar, and attendee list do not update. Observed in test C3: registered a lead via public form while CRM modal for the same event was open (in a different tab) — stale counters.
- **Suggested next action:** Either (a) 15-30s poll of `v_crm_event_stats` while modal open, (b) manual "🔄 רענן" button next to the KPI cards, or (c) Supabase realtime subscription on `crm_event_attendees` filtered by `event_id` while modal is open.
- **Severity rationale:** Unlikely to cause data loss; would cause staff confusion during live events.

## M4-QA-08 — LOW — Accessibility: 23 unlabeled form fields + 8 elements without id/name

- **Location:** Across modal renderers (lead create, lead edit, event create, broadcast wizard, confirmation send, etc.)
- **Description:** Chrome a11y issues tab flagged 23 form fields without associated `<label for=…>` and 8 form elements without `id` or `name`. These are scattered across the CRM modals that were built with inline HTML strings rather than structured components.
- **Suggested next action:** Dedicated a11y polish SPEC — add `id` to every input, `for` on every label, `aria-label` where visual labels aren't present, test keyboard navigation end-to-end. Consider extracting a shared `Field` helper that enforces the pairing.
- **Severity rationale:** Legal-ish compliance (IS 5568 / EU accessibility guidelines) and usability for screen readers + keyboard users. Currently not a runtime failure.

## F-DATA-01 — LOW — Pre-existing stray lead "טסט" on demo tenant

- **Location:** `crm_leads` row `4ea21299-a146-43d1-9c97-714daffb28cd`
- **Description:** Demo tenant has a lead with `full_name='טסט'`, `phone='+972500000000'` (not an approved test phone), `email='TESTD@GMAIL.COM'` (unknown ownership), `source='manual'`. Created 2026-04-23 10:47 UTC by an earlier session. If any automation rule fires on a tier2 transition and this lead becomes tier2, the system will attempt to SMS `+972500000000` and email `TESTD@GMAIL.COM`.
- **Evidence:** Baseline SELECT on `crm_leads`, timestamp clearly pre-existing this audit session.
- **Suggested next action:** Soft-delete (set `is_deleted=true`). Part of a broader `CRM_DEMO_SEED` SPEC to lock a known clean baseline before Prizma cutover. SESSION_CONTEXT already mentions this need (M4-DATA-03).
- **Severity rationale:** Data hygiene. Not a code bug.

## F-HIST-01 — INFO — Pre-existing log row with content `%event_date%` literal

- **Location:** `crm_message_log` — one row at 2026-04-23 13:35 for P55 דנה כהן, channel=sms, status=sent, content=`%event_date%`
- **Description:** A prior session sent a broadcast that had the variable unsubstituted. This is historical; not reproducible by the current pipeline (which substitutes in `send-message` EF before sending). Likely from a pre-P5.5 pipeline state.
- **Evidence:** Visible in Messaging → היסטוריה at row ts=13:35.
- **Suggested next action:** Ignore or delete as part of demo seed cleanup.
- **Severity rationale:** Historical artifact, no action required.

## F-EXEC-01 — INFO — Executor-skill toast-capture helper is missing

- **Location:** `.claude/skills/opticup-executor/references/` (absent)
- **Description:** Capturing Hebrew toast messages from the UI required installing a `window._capturedToasts` spy on `Toast.{info,success,warning,error,show}` via `evaluate_script`, plus short-timeout polling after each action. This is a reusable pattern for ALL future Optic Up UI audits but is not part of the executor's reference library.
- **Suggested next action:** See EXECUTION_REPORT.md Proposal 1 — add `TOAST_CAPTURE_HELPER.md` reference file.
- **Severity rationale:** Skill improvement, not a product finding.

## F-EXEC-02 — INFO — EXECUTION_REPORT_TEMPLATE missing baseline-delta check

- **Location:** `.claude/skills/opticup-executor/references/EXECUTION_REPORT_TEMPLATE.md`
- **Description:** For SPECs with a cleanup §7 section, there's no mandatory post-condition check. Without one, cleanup drift (like my -2 notes from an off-by-one filter) silently ships.
- **Suggested next action:** See EXECUTION_REPORT.md Proposal 2 — add a required "Baseline restoration delta" sub-section.
- **Severity rationale:** Skill improvement.

---

*End of FINDINGS.md*
