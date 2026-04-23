# FINDINGS — FINAL_FIXES

> **Location:** `modules/Module 4 - CRM/final/FINAL_FIXES/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — M4-QA-04 root cause misidentified in FINAL_QA_AUDIT; pending_review-on-cancel is a feature, not a bug

- **Code:** `M4-SPEC-01`
- **Severity:** MEDIUM (SPEC-quality issue with downstream impact — not a product defect)
- **Discovered during:** Track G SPEC-load validation + file read of `crm-confirm-send.js`.
- **Location:**
  - `modules/crm/crm-confirm-send.js:163-176` (`writePendingReviewRows` helper)
  - `modules/crm/crm-confirm-send.js:243-251` (cancel button handler that INSERTs the rows)
  - `modules/crm/crm-messaging-log.js:118-147` (amber `שלח מחדש` button that reads them)
  - `modules/crm/crm-send-dialog.js:14` (comment "[P20] optional prefill for resend from log flow")
  - `modules/Module 4 - CRM/go-live/specs/P21_AUTOMATION_OVERHAUL/EXECUTION_REPORT.md:154` ("Approve → dispatch. Cancel → pending_review rows + שלח מחדש opens quick-send pre-filled.")
- **Description:** FINAL_QA_AUDIT/FINDINGS.md M4-QA-04 claims "Opening a Confirmation Gate creates `crm_message_log` rows with `status='pending_review'`." This is factually wrong — the rows are created **only on cancel**, as the persistence half of the P20/P21 "save for later + resend" flow. The audit saw rows from a cancelled gate, didn't click `שלח מחדש`, and inferred "orphan data". FINAL_FIXES SPEC §Track G inherited this misread and prescribed two fixes that would both destroy the feature.
- **Reproduction:**
  ```
  1. Open a Confirmation Gate in crm.html (e.g., change an event to registration_open).
  2. BEFORE clicking "אשר ושלח" or "בטל": query
     SELECT count(*) FROM crm_message_log WHERE tenant_id=<demo> AND status='pending_review'
     → count matches pre-gate state (NOT +N).
  3. Click "בטל". Query again → +N rows now appear with status='pending_review'.
  4. Open Messaging Hub → "היסטוריה" tab. The N rows show with amber "ממתין לאישור" badge + a "שלח מחדש" button.
  ```
- **Expected vs Actual:**
  - QA audit expected: rows appear at gate-open (inferred orphan lifecycle).
  - Actual: rows appear at cancel-click (deliberate persistence of rejected plan for resend).
- **Suggested next action:** DISMISS the SPEC directive (already done — Track G removed from commit scope per dispatcher). Optionally: authored FOREMAN note to update M4-QA-04 in FINAL_QA_AUDIT/FINDINGS.md so future SPEC authors don't repeat the misread. A separate SPEC could still be valuable if the real UX concern is "cancelled gates clutter the log forever with no TTL" — valid, but distinct from the bug framing.
- **Rationale for action:** The feature exists, is documented across 3 files, and was shipped by P20 + enhanced by P21. Fixing the alleged bug would ship a regression.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Cross-EF `send-message` dispatch helpers duplicated across 2 Edge Functions

- **Code:** `M4-DEBT-FINAL-01`
- **Severity:** LOW (tech debt; not blocking go-live)
- **Discovered during:** Track B implementation (copying `dispatchIntakeMessages` + `callSendMessage` from `lead-intake/index.ts` to `event-register/index.ts`).
- **Location:**
  - `supabase/functions/lead-intake/index.ts:100-156` (original)
  - `supabase/functions/event-register/index.ts:36-108` (new, Commit 2)
- **Description:** Both EFs now contain near-identical `dispatchXMessages(tenantId, leadId, template, vars, hasEmail)` + `callSendMessage(tenantId, leadId, channel, template, vars)` helpers, plus the same `ANON_KEY` hardcoded constant and `SEND_MESSAGE_URL` derivation. A third EF needing server-side dispatch (e.g., an unsubscribe-confirmation EF, or the future scheduler EF for time-based reminders) will duplicate this block a third time.
- **Reproduction:**
  ```
  diff <(sed -n '100,156p' supabase/functions/lead-intake/index.ts) \
       <(sed -n '36,108p' supabase/functions/event-register/index.ts)
  # Differences are cosmetic: function name (dispatchIntakeMessages vs dispatchRegistrationMessages),
  # comment wording, and extra early-return params. Core fetch logic is identical.
  ```
- **Expected vs Actual:**
  - Expected (SaaS-clean): a `supabase/functions/_shared/send-message-client.ts` module exporting `sendMessageViaEF(tenantId, leadId, channel, templateSlug, variables)` imported by all dispatching EFs.
  - Actual: copy-paste across EFs.
- **Suggested next action:** TECH_DEBT — small dedicated SPEC after merge to main. Extract to `_shared/`, import from both EFs, redeploy both with identical behavior. ~30 min including deploy + smoke-test.
- **Rationale for action:** Not urgent (2 EFs is manageable), but each duplication slightly raises the cost of rotating the anon key, changing the send-message contract, or adding instrumentation (logging, metrics, retry).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — SPEC line-count estimates assume inline helpers, not shared modules

- **Code:** `M4-SPEC-02`
- **Severity:** LOW (SPEC-quality nit; does not affect product)
- **Discovered during:** Track B, after writing the event-register EF changes (199→294 vs SPEC estimate +40-60).
- **Location:** SPEC §6 "Files Affected" table, row for `supabase/functions/event-register/index.ts`.
- **Description:** The SPEC's "+40-60 lines" estimate covered only the dispatch block inside the POST handler (`templateBase` picker + `variables` builder + call site) — correctly ~25 lines. It did NOT account for the helper functions that the SPEC itself prescribed ("same cross-EF fetch pattern used in `lead-intake/index.ts` for `lead_intake_new` / `lead_intake_duplicate` dispatch"), which are ~65 lines copied verbatim from lead-intake. Total +95 is accurate given no `_shared/` module exists (see Finding 2).
- **Reproduction:** `wc -l` before (199) and after (294) Commit 2.
- **Expected vs Actual:**
  - SPEC estimate: 199 + 40..60 = 239..259 lines.
  - Actual: 294 lines.
- **Suggested next action:** DISMISS (not a code issue). Optional opticup-strategic SKILL.md addition: "When prescribing 'mirror the pattern from file X', estimate = net new logic + full helper block unless a `_shared/` import is possible."
- **Rationale for action:** Landed well under the 350 hard limit (57-line margin), no rule violation, no functional impact. Useful signal for future SPECs only.
- **Foreman override (filled by Foreman in review):** { }

---

## Not findings (explicit non-findings, for traceability)

- **Registration URL still exposes UUIDs** — known, in SPEC §Track C2 as "deferred to post-merge SPEC". Not a finding; it's an intentionally out-of-scope followup per the SPEC.
- **Event detail modal doesn't auto-refresh** — same, M4-QA-07 in FINAL_QA_AUDIT/FINDINGS.md, out-of-scope per SPEC §7.
- **23 unlabeled form fields + 8 elements without id/name** — M4-QA-08, out-of-scope per SPEC §7.
- **Templates reference `%registration_url%` which is not auto-injected by send-message EF** — plausible gap, but I did not verify it during this SPEC. No `event_registration_confirmation_*_he` templates on demo were inspected for this placeholder. Confirmation messages to already-registered leads don't semantically need a registration link, so even if templates contain the literal `%registration_url%` it wouldn't be user-facing catastrophic. Not escalated to a finding. Leaving a note for whoever reviews `crm_message_templates` before Prizma cutover.
