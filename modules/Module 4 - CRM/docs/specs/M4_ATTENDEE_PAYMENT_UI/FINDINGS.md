# FINDINGS — M4_ATTENDEE_PAYMENT_UI

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_UI/FINDINGS.md`
> **Written by:** opticup-executor

---

## Findings

### Finding 1 — SPEC §2.4 file-size projections were stale

- **Code:** `M4-SPEC-PAYMENTUI-01`
- **Severity:** INFO
- **Discovered during:** Pre-flight `wc -l` baseline.
- **Location:** SPEC §2.4 + §8.7.
- **Description:** The SPEC said `crm-events-detail.js` was 344 lines (6 from cap). At pre-flight time it was actually **349 lines** (1 from cap — much tighter). Same for `crm-event-day-manage.js`: SPEC said 340, actual was 344. The SPEC author's projections didn't account for the most recent edits in `M4_ATTENDEE_PAYMENT_SCHEMA` commit `a356270` (carve-out added a few lines).
- **Impact:** None operational — the SPEC's design (route logic through helper module) absorbed the tighter budget. But it tightened my margin from "comfortable" to "exact zero growth on events-detail.js".
- **Suggested next action:** TECH_DEBT for SPEC authoring methodology — when authoring a SPEC that depends on tight Rule 12 budgets, the §2.4-style projection should be re-checked against the actual file at the moment of SPEC approval (not based on the predecessor SPEC's projections).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `crm-leads-detail.js` (349 lines) cannot host any future payment-status display

- **Code:** `M4-RULE12-PAYMENTUI-02`
- **Severity:** INFO
- **Discovered during:** SPEC §8.5 explicit prohibition + pre-flight verify.
- **Location:** `modules/crm/crm-leads-detail.js`.
- **Description:** This file is 349/350 lines. The SPEC explicitly prohibits touching it. If a future SPEC wants to render payment status inside the lead detail card (e.g., "this lead has 2 paid attendees + 1 credit_pending"), there's no room — that file would need a refactor (file split or rename helpers) before any new code can land there.
- **Impact:** Forward-flag for future work. The lead detail view currently relies on its embedded `attendees` sub-section being rendered by other code paths (which DO have CrmPayment.renderStatusPill applied). So end-user impact today is none — payment status IS visible in the lead's attendee history via the existing render paths.
- **Suggested next action:** TECH_DEBT — schedule a Rule-12 cleanup SPEC for `crm-leads-detail.js` before the next feature that needs to add code there.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Action modal stays open after action; underlying event-detail card doesn't refresh

- **Code:** `M4-UX-PAYMENTUI-03`
- **Severity:** LOW (UX gap, not defect)
- **Discovered during:** Decision §4.5.
- **Location:** `modules/crm/crm-payment-helpers.js` (`renderActionPanel` + `openActionModal`).
- **Description:** When the user marks an attendee paid via the action modal, the modal re-renders itself with the new state (pill + buttons update correctly). But the event-detail modal underneath still shows the OLD attendee state (e.g., the card still shows the previous pill). The user has to manually close the action modal and re-open the event detail to see the refreshed state.
- **Impact:** Minor confusion — staff might think "did the action save?" until they close the modal. Bell badge does refresh correctly. DB state is correct.
- **Reproduction:**
  1. Open event detail → click attendee card → action modal opens.
  2. Click "סמן שולם" → toast appears, action modal re-renders with emerald pill.
  3. Close action modal → event detail card behind STILL shows pre-action pill.
  4. Close + re-open event detail → card now shows updated pill.
- **Suggested next action:** TECH_DEBT — could be addressed in a future SPEC by emitting a custom event `crm-payment-changed` from CrmPayment that all open table renders subscribe to. Out of scope for this SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.*
