# FINDINGS — M4_ATTENDEE_PAYMENT_AUTOMATION

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_AUTOMATION/FINDINGS.md`
> **Written by:** opticup-executor

---

## Findings

### Finding 1 — `crm_automation_runs` rows stuck in `status='running'` on localhost

- **Code:** `M4-DEV-AUTORUN-01`
- **Severity:** INFO (dev-environment quirk, not a production issue)
- **Discovered during:** Path 7 verification.
- **Location:** `crm_automation_runs` table, dispatch path `CrmAutomation.evaluate → CrmMessaging.sendMessage → send-message Edge Function → Make webhook`.
- **Description:** Path 4 + FIFO created 2 entries in `crm_automation_runs` for rule "הרשמה: אישור הרשמה" with `total_recipients=2` each. Both stuck at `status='running'`, never progressed to 'completed'. No corresponding rows in `crm_message_log` or `crm_message_queue`. Same observation in `M4_EVENT_DAY_PARITY_FIX` QA from earlier today (status_change run for WLDF_QA also stuck running).
- **Root cause (suspected):** the local dev server at `localhost:3000` calls the deployed `send-message` Edge Function which calls the Make webhook URL. Either Make rejects the localhost origin OR the run-status callback from Make doesn't reach the dev server. Production probably works fine (same setup as P3c+P4 worked on Prizma cutover preparation).
- **Impact:** ZERO functional impact on this SPEC — the engine evaluating + resolving recipients confirms Path 7 (engine still fires). The subsequent dispatch stall is a localhost limitation, NOT a regression.
- **Suggested next action:** TECH_DEBT — investigate whether dev server should mock the Make webhook, or whether the `crm_automation_runs.status` callback should be updated in-process (not relying on Make to ping back). Likely a future P-track infra SPEC. Not a blocker for any payment SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — SPEC §3 file-size criteria 4 + 5 + §8.8 had stale baseline numbers

- **Code:** `M4-SPEC-PAYAUTO-02`
- **Severity:** INFO (process improvement)
- **Discovered during:** Step 1 SPEC validation.
- **Location:** SPEC §3 criterion 4 ("Modified `crm-event-actions.js` size | within 5 lines of pre-SPEC (~349)"), criterion 5 ("Modified `crm-event-register.js` size | within 5 lines of pre-SPEC (~150)"), §8.8 file-size projection table.
- **Description:** Actual pre-SPEC line counts were 295 / 179, not the SPEC-stated 349 / 150. The "349" came from `M4_ATTENDEE_PAYMENT_UI` post-SPEC numbers; SPEC author appears to have copied numbers without re-running `wc -l`. Same pattern previously documented in `M4_ATTENDEE_PAYMENT_UI/FOREMAN_REVIEW.md §6 Proposal 1`.
- **Impact:** No operational impact — the actual file sizes ended at 297 / 192, well within Rule 12 hard cap of 350. But the criterion text reads as if the file was tight (349 + 5 = 354 = OVER cap), which created brief executor confusion ("am I about to breach Rule 12?") that was resolved by re-running `wc -l`.
- **Suggested next action:** TECH_DEBT — the lesson from `M4_ATTENDEE_PAYMENT_UI/FOREMAN_REVIEW.md §6 Proposal 1` ("re-baseline file sizes at SPEC approval") was applied to `crm-event-day-manage.js` in `M4_EVENT_DAY_PARITY_FIX` (where wc -l was correctly re-run at author time). It should also be applied to ANY file mentioned in §3 / §8.8, not just the most-recently-edited one. Recommend a follow-up `opticup-strategic` skill update so Foreman's pre-SPEC checklist mandates `wc -l` for ALL named files, not just the "tight" ones.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Pre-flight expected attendee count was 13 but actual was 12 at end of QA cleanup

- **Code:** `M4-DATA-PAYAUTO-03`
- **Severity:** INFO
- **Discovered during:** Path 8 final cleanup.
- **Location:** SPEC §10.2 expected ("Expected: paid:1, pending_payment:12") + §12.10 expected ("Expected: paid:1, unpaid:<backfill count>, pending_payment:<remainder>").
- **Description:** Pre-flight at session start showed 13 attendees on demo (1 paid + 12 pending). After QA + cleanup, total dropped to 12 (1 paid + 11 pending). All 12 remaining rows have `registered_at` from 2026-04-24 (yesterday) — none from today, confirming **0 QA-created residuals**. The "missing" attendee likely was deleted earlier (possibly during the M4_EVENT_DAY_PARITY_FIX QA's cleanup where I couldn't account for one — see that SPEC's report). Either way, current 12 is the consistent post-cleanup baseline; no QA artifact is left behind.
- **Impact:** None operational. The §12.10 "Expected" baseline-count phrasing is now off by 1 from reality, but the inequality `paid:1 + unpaid:0 (backfill match) + pending_payment:11` is internally consistent.
- **Suggested next action:** Foreman to update §10.2 baseline number in any future payment SPEC's prompt to "12 (verify)" not "13" — OR investigate one row's history more carefully (one option: the predecessor-SPEC's QA may have soft-deleted-then-hard-deleted a Daniel test attendee that wasn't documented). My EXECUTION_REPORT proposal #2 ("compute expected_count delta") would catch this proactively in future runs.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.*
