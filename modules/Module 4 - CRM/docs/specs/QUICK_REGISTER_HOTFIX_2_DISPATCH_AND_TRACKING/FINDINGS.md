# FINDINGS — QUICK_REGISTER_HOTFIX_2_DISPATCH_AND_TRACKING

> **Location:** `modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_HOTFIX_2_DISPATCH_AND_TRACKING/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `coupon_sent` flag never flips after EF dispatches the coupon-delivery template

- **Code:** `M4-BUG-QR-01`
- **Severity:** MEDIUM
- **Discovered during:** §11 manual smoke test on demo event 14 — Daniel + Overseer DB verification post-dispatch.
- **Location:** `supabase/functions/quick-register/index.ts` (post-RPC success path) + `supabase/functions/quick-register/dispatch.ts` (returns void). Affects `crm_event_attendees.coupon_sent` + `coupon_sent_at` columns.
- **Description:** Hotfix #2 wires the `event_coupon_delivery` SMS+email dispatch correctly — `crm_message_log` shows two `status=sent` rows for the test attendee within 1s of registration. But `crm_event_attendees.coupon_sent` for that attendee remains `false` because the EF never updates it after a successful dispatch. Semantically the column is currently scoped to "staff-confirmed coupon redemption at checkout" (per Daniel), so the flag itself is technically correct — but the operator UI on event-day (M4 attendee list) shows a "שלח" (Send) button for any row where `coupon_sent=false`, which now appears for every quick-register attendee even though they already received the coupon. Risk: operator clicks "שלח" → duplicate dispatch → customer confusion + double-template charges.
- **Reproduction:**
  ```sql
  SELECT id, status, coupon_sent, coupon_sent_at, registration_method
  FROM crm_event_attendees
  WHERE event_id = '<event 14 uuid>' AND lead_id = '33cba7ca-...';
  -- Expected (post-Hotfix-2 dispatch): coupon_sent=true OR a separate "auto_sent" tracking column
  -- Actual: coupon_sent=false, coupon_sent_at=null
  ```
- **Expected vs Actual:**
  - Expected: After EF auto-dispatches coupon-delivery, the operator UI should NOT show a manual-send button for that attendee (or should show a clear "already auto-sent at HH:MM" indicator).
  - Actual: Operator UI shows the manual-send button → duplicate-dispatch risk on every quick-register attendee.
- **Suggested next action:** NEW_SPEC (Hotfix #3 per Daniel's chat directive 2026-05-04).
- **Rationale for action:** Operator UX bug with measurable duplicate-dispatch risk; semantically the fix is either (a) flip `coupon_sent=true` on auto-dispatch and fold "redeemed at checkout" into a separate column, or (b) add an `auto_dispatched_at` column the operator UI consults before showing the send button. Either is a deliberate schema decision for the Foreman, not a hotfix-2 absorbtion.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `registration_method` not surfaced in the CRM operator UI

- **Code:** `M4-UX-QR-02`
- **Severity:** MEDIUM
- **Discovered during:** §11 smoke test — Overseer noted that the verified attendee row carries `registration_method='quick_register_qr'` but no operator-facing surface exposes it.
- **Location:** `crm_event_attendees.registration_method` column (populated by RPC `register_lead_to_event` since QUICK_REGISTER_QR_FLOW Rung 1) + the M4 CRM event attendee list UI (file path TBD by next executor — likely `js/crm.js` or a CRM module list view; not searched this SPEC since it's out of scope).
- **Description:** The RPC populates `registration_method` correctly (`'quick_register_qr'` for walk-ins, `'form'` for the public event-register page, etc.) but no CRM operator screen shows that distinction. On event-day the operator can't tell at a glance whether a given attendee registered via QR walk-in (already received auto-coupon) or via the legacy public form (different message-history pattern). Pairs with Finding 1 — together they create a real risk of operator misjudgement about whether a given attendee has already been messaged.
- **Reproduction:**
  ```sql
  SELECT registration_method, COUNT(*) FROM crm_event_attendees
  WHERE event_id = '<event 14>' GROUP BY 1;
  -- Returns the distinction the UI does not display.
  ```
- **Expected vs Actual:**
  - Expected: Attendee list column or per-row badge like "QR walk-in" / "טופס ציבורי" / "ידני" so the operator can route their attention correctly.
  - Actual: Column not shown anywhere. Operator treats every attendee identically.
- **Suggested next action:** NEW_SPEC (rolled into Hotfix #3 per Daniel's chat directive 2026-05-04 — pairs naturally with Finding 1's UI-side fix).
- **Rationale for action:** Pure UI surface change in the M4 operator view; needs a Foreman-level decision on column placement, label vocabulary, and Hebrew translation before code touches the file.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Daniel feature request: revive cancelled attendees → registered when a slot opens

- **Code:** `M4-FEAT-QR-03`
- **Severity:** INFO
- **Discovered during:** Captured by SPEC §12 itself ("Captured for backlog (NOT this SPEC)") — Daniel verbal directive 2026-05-04 logged by Campaign Overseer in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/POST_CUTOVER_TECH_DEBT.md` per SPEC §12 first bullet.
- **Location:** `register_lead_to_event` RPC + `crm_event_attendees.status` lifecycle. Currently when an attendee cancels, their row goes to `status='cancelled'` and a freed slot is consumed by the next waiting-list promotion. Daniel wants a manual operator path to revive an existing cancelled attendee (e.g., same lead changes their mind) to `status='registered'` instead of forcing a fresh registration.
- **Description:** Repeating SPEC §12 verbatim so this finding survives even if the launch-plan draft moves: the operator-side feature is "revive cancelled → registered (when a slot opens up)". Out-of-scope for Hotfix #2; logged here so the file-per-SPEC retro carries the breadcrumb forward for the Foreman's roadmap.
- **Reproduction:** N/A (feature request, not a bug).
- **Expected vs Actual:** N/A.
- **Suggested next action:** TECH_DEBT (already logged by Overseer per SPEC §12). This finding is purely a forwarding pointer so it isn't lost when the launch-plan draft is cleaned up post-cutover.
- **Rationale for action:** Daniel decided this is post-M4 backlog, not this SPEC. Logged here per "do not hide it" rule.
- **Foreman override (filled by Foreman in review):** { }
