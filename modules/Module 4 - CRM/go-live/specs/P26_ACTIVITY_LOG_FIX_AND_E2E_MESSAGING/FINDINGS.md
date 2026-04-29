# FINDINGS — P26_ACTIVITY_LOG_FIX_AND_E2E_MESSAGING

> Out-of-scope discoveries during the P26 run. Severity-tagged. Not blocking.

---

## Findings

### Finding 1 — `register_lead_to_event` RPC does NOT fire automation engine

- **Code:** `M4-INTEGRATION-P26-01`
- **Severity:** **HIGH** (architectural surprise; impacts every E2E test that goes through the RPC layer; impacts the upcoming P5_V2 cutover model where Make scenarios may call the RPC directly)
- **Discovered during:** Phase 2 scenario 6 — RPC succeeded (attendee `b9c8faa7` created) but `crm_message_queue` and `crm_message_log` both empty for the lead within 3+ minutes. No automation rule fired.
- **Location:** `register_lead_to_event` RPC body (server-side) + `crm-event-register.js` (JS-side post-RPC handler).
- **Description:** The automation engine (`CrmAutomation.evaluate(...)`) runs JS-side. The RPC call alone returns success but does not fire any dispatch. The full flow requires:
  1. Caller (UI or external) calls `register_lead_to_event` RPC.
  2. RPC creates DB row.
  3. Caller-side JS receives result, calls `CrmAutomation.evaluate('attendee_upsert', ...)` which fires automation rules → posts to send-message EF → Make webhook → SMS+Email.
  Steps 1-2 work autonomously. Step 3 requires JS execution context.
- **Impact:**
  - Any DB-driven test (Supabase MCP, SQL script, scheduled cron) that calls the RPC will produce DB state changes without notifications.
  - If P5_V2 cutover involves Make scenarios calling the RPC directly to register leads, the registration confirmation message will NOT fire — Daniel needs to verify Make's scenario invokes the JS automation OR a server-side equivalent.
  - Any future server-side feature (e.g., scheduled re-engagement) that creates attendees via RPC won't trigger automation unless explicitly extended.
- **Suggested next action:** **NEW_SPEC (verify-or-fix)** — investigate whether the P5_V2 cutover Make scenarios DO call the JS automation (via UI handoff?) or whether they expect RPC-only. If RPC-only, either (a) add a database trigger that fires automation server-side, OR (b) document the constraint clearly and ensure all production callers go through JS. Estimated 1-2 hours of investigation; outcome determines fix size.
- **Rationale for action:** Architectural; impacts more than P26. Worth confirming the cutover model.

---

### Finding 2 — Pre-existing duplicate `formatTime` in `modules/crm/public/event-register.js`

- **Code:** `M4-R21-P26-01`
- **Severity:** LOW (pre-existing; would only fire if a future commit stages both checkin.js + public/event-register.js together)
- **Discovered during:** P26 commit 0b file-set verification.
- **Location:** `modules/crm/public/event-register.js:21` defines `function formatTime(s) { return s ? String(s).slice(0, 5) : ''; }`. `crm-event-day-checkin.js:170` defines `function formatTime(iso)` (the canonical, post-P26-0b).
- **Description:** Two functions with the same name + different signatures. Both extract a time-formatted string but operate on different inputs (one accepts `HH:MM:SS` and slices, the other accepts ISO datetime and formats). Functionally distinct.
- **Suggested next action:** **TECH_DEBT** — micro-SPEC: rename `public/event-register.js`'s `formatTime` to `formatTimeFromHHMMSS` (or similar) so both callers are unambiguous. ~5 minutes work.
- **Rationale for action:** Latent — won't trip until both files are staged together. But it WILL trip eventually.

---

### Finding 3 — `doCheckIn` semantic divergence (refactor candidate)

- **Code:** `M4-REFACTOR-P26-01`
- **Severity:** INFO (Daniel's planned unification was scope-correct; the underlying bodies just differ enough that simple unification breaks UI)
- **Discovered during:** P26 commit 0b — schedule.js's `doCheckIn` re-renders schedule board + uses `CrmHelpers.toast`; checkin.js's `doCheckIn` re-renders 3 columns + uses local `_chkLog/_chkUpd/showNotification`.
- **Suggested change:** Extract a pure-RPC helper `CrmEventDayCheckIn.checkInAttendee(attendeeId)` that does just RPC + log + state update without UI. Both checkin.js and schedule.js wrap with their own UI.
- **Effort:** 1 hour — design + implement + verify both surfaces.
- **Suggested next action:** TECH_DEBT — only worth doing if a third surface needs the same logic, OR if a future bug in one surface needs fixing in only one place.

---

### Finding 4 — Lead-intake EF dedup makes scenario-5 fresh-test impossible without cleanup

- **Code:** `M4-TEST-P26-01`
- **Severity:** INFO (testing-process gap, not a code bug)
- **Discovered during:** Phase 2 scenario 5 setup.
- **Description:** Both approved test phones (+972537889878 and +972503348349) have leads on Prizma (a262bc0e + 46d51368 + 8f0633bb). The lead-intake EF includes dedup logic — creating a NEW lead with the same phone+email returns the existing row, no fresh-lead automation fires. To test scenario 5 cleanly we'd need (a) a third approved phone, OR (b) Daniel deletes one existing lead first, OR (c) accept that fresh-lead testing exhausts after first run.
- **Suggested next action:** **DISMISS** (process artifact). Daniel can clean up after morning review per `TEST_DATA_INVENTORY.md` if he wants a fresh slot for next-time fresh-lead tests.

---
