# P32 — Comprehensive Lifecycle QA After P31 Deploy + History Documentation Review

> **Status:** authored 2026-05-01 by opticup-executor under Daniel's overnight dispatch
> **Type:** verification + documentation audit (no code changes)
> **Mode:** autonomous overnight
> **Origin:** P31 just shipped. Daniel wants the full P30-style audit re-run on the post-P31 stack to confirm: validation works, lead_id auto-fix works (P31-003), failed-msg UI works end-to-end, and the audit trail is comprehensive enough for an operator to debug without a developer.

---

## 1. Goal

Three deliverables:

1. **Re-run 13 lifecycle scenarios** (same as P30) on the post-P31 stack and verify no `%X%` literal escapes substitution.
2. **Run 3 new P31-specific scenarios:**
   - 14: force a `template_not_found` failure → verify failed-msg UI surfaces it end-to-end (badge + chip + section + retry).
   - 15: force a fixable failure → fix the underlying cause → click retry → verify success.
   - 16: confirm `event_coupon_delivery_email_he` QR code now contains a real lead UUID (P31-003 fix verification).
3. **History documentation gap analysis** — Daniel-requested. Enumerate what the 3 audit tables (`crm_message_log` + `activity_log` + `crm_automation_runs`) actually capture per scenario, and what's MISSING for an operator to debug a customer complaint without a developer.

## 2. Hard Constraints (from dispatch)

- **Recipient:** ONLY phone `0537889878` + email `daniel@prizma-optic.co.il`
- **Both channels every dispatch:** SMS + Email
- **No data deletion**
- **No code changes**
- **No `--no-verify`**

## 3. Pre-flight Status (verified 2026-05-01)

- ✅ `crm-message-error-labels.js` live at `app.opticalis.co.il` (Hebrew error map loaded)
- ✅ `crm-leads-detail-messages.js` has `renderFailedSection` (P31 commit 6 live)
- ✅ Migration applied: 30/30 active Prizma templates have `required_variables=[]`
- ✅ `send-message` EF v13 deployed by Daniel via CLI; includes injectLeadVariables + validation + dispatch.ts extraction
- ✅ Test lead `a262bc0e` (T5 Canary Post-Shorten) reusable; phone+email match Daniel's allowlisted contacts

## 4. Scenarios

### 4.1 The 13 lifecycle scenarios (same as P30)

1. `lead_intake_new`
2. `lead_intake_duplicate`
3. `event_will_open_tomorrow`
4. `event_registration_open`
5. `event_invite_new`
6. `event_invite_waiting_list`
7. `event_registration_confirmation`
8. `event_waiting_list_confirmation`
9. `event_waiting_list`
10. `event_coupon_delivery` (with P31-003 verification — see 4.2 #16)
11. `event_attendee_moved_unpaid`
12. `event_attendee_moved_paid`
13. `payment_received`

### 4.2 The 3 P31-specific scenarios

- **14:** Force `template_not_found` failure → verify failed-msg UI end-to-end:
  - dispatch via `CrmMessaging.sendMessage` with a non-existent slug
  - confirm 404 response + `crm_message_log status='failed'`
  - confirm `⚠️ N` badge in registered tab increments
  - confirm `📩 הודעות כושלות (M)` chip appears with M+1
  - open lead detail; verify "הודעות כושלות" section appears with: channel icon, template name (or fallback), Hebrew error reason ("תבנית הודעה לא נמצאה"), timestamp
  - click "🔄 נסה שוב"; confirm second failure surfaces with updated reason

- **15:** Force a fixable failure (e.g., `phone_not_allowed`) → repair the underlying cause → retry → verify success
  - Note: phone_not_allowed produces `status='rejected'` not `failed`; alternative is to dispatch with a missing required-variable on a template with a hand-set `required_variables`

- **16:** Trigger `event_coupon_delivery` (scenario #10) and confirm the email QR code img URL contains a real UUID and NOT `%lead_id%`. Direct verification: query `crm_message_log.content` for the email row, regex match the `data=...` query param.

## 5. Success Criteria

For each scenario:

| # | Check |
|---|---|
| 1 | `crm_message_log.status` matches expectation (`sent` for 1-13, `failed` for 14-15 first pass) |
| 2 | `crm_message_log.content` contains NO `%X%` literals (post-substitution check) |
| 3 | `activity_log` row exists with non-empty `details` for paths that should write one |
| 4 | `crm_automation_runs.status='completed'` for rule-driven scenarios |
| 5 | `run_id` linked on rule-driven message_log rows (P29 verification still holds) |
| 6 | Daniel's phone receives SMS, mailbox receives email (manual cross-check in AM) |

## 6. Out of Scope

- Vendor delivery callback (P28-003 — separate SPEC)
- Bulk retry UI
- Schema changes (history audit is documentation-only per dispatch)

## 7. Outputs

Per dispatch:

- `SPEC.md` (this file)
- `EXECUTION_REPORT.md`
- `MESSAGE_VERIFICATION.md` — per-scenario table with content-excerpt confirming no `%X%` literals
- `HISTORY_AUDIT.md` — full audit trail per scenario
- `HISTORY_DOCUMENTATION_AUDIT.md` — gap analysis (Daniel's specific ask)
- `VISUAL_REPORT.md` — UI screenshots
- `TEST_DATA_INVENTORY.md` — Prizma rows touched + restore SQL
- `screenshots/`

## 8. Stop Triggers

| Trigger | Action |
|---|---|
| Recipient phone or email leaks beyond Daniel's contacts | STOP, document |
| Any `crm_message_log.status='sent'` row has `%X%` literal in content | STOP, document blocker (means substitution broke) |
| Failed-msg UI doesn't render in registered tab after a confirmed failure | STOP, document blocker (P31 commit 5 broken on prod) |
| Browser automation fails irrecoverably | STOP, surface |

---

*End of SPEC.md*
