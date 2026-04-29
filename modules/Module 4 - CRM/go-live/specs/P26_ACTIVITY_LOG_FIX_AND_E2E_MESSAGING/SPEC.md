# P26 — Activity Log Field Fix + Prizma E2E Messaging Audit

> **Status:** authored 2026-04-29 night by opticup-strategic (Foreman)
> **Origin:** P25 Finding 1 (HIGH — activity_log details silently dropped) + Daniel directive that P25 didn't actually verify message dispatch end-to-end. P26 bundles the trivial fix with a real E2E messaging run on Prizma using Daniel's approved contacts.
> **Module:** 4 — CRM
> **Position in roadmap:** pre-cutover micro-fix + verification. Should ship before 3.5.

---

## 1. Goal

Two coordinated deliverables in one SPEC:

**Deliverable A — Code fix (10 files, 1 commit):** rename `metadata:` → `details:` and `severity:` → `level:` (or remove `severity:` since it defaults to `'info'`) in every `ActivityLog.write` call site in CRM, plus fix one `entity_type` typo (singular vs plural). This restores activity_log audit trail for all CRM actions.

**Deliverable B — E2E messaging audit on Prizma (read-only, Prizma-targeted):** run the full lifecycle end-to-end on Prizma using Daniel's approved test contacts, and VERIFY that every expected SMS and email actually arrives at his phone/inbox. Document each message with screenshot of the received content. This is what P25 didn't do.

---

## 2. Background — Live State

### 2.1 The bug (Deliverable A — verified live by P25)

`shared/js/activity-logger.js:48` reads `config.details`. CRM call sites pass `metadata:` instead → silently coerced to `{}`. Same for `severity:` (passed but ignored — logger reads `config.level`).

DB evidence (queried 2026-04-29 evening):
| Action | Total rows | Empty `details={}` |
|---|---|---|
| `crm.attendee.coupon_sent` | 12 | 12 |
| `crm.attendee.cancel` | 5 | 5 |
| `crm.attendee.payment_refund_requested` | 8 | 8 |
| `crm.attendee.payment_marked_paid` | 5 | 5 |
| `crm.attendee.mark_no_refund_due_flag` | 3 | 3 |
| `crm.attendee.payment_credit_opened` | 3 | 3 |
| `crm.attendee.payment_refunded` | 3 | 3 |
| `crm.attendee.checked_in` | 3 | 3 |
| `crm.template.save` | 11 | 11 |
| `crm.rule.create` | 6 | 6 |
| `crm.page.open` | 230 | 230 |

**Total: 289 historical entries with empty `details={}` across 11 actions.**

### 2.2 Call sites to fix (10 sites)

| # | File | Line | Issue |
|---|---|---|---|
| 1 | `modules/crm/crm-attendee-cancel.js` | 17 | `metadata:` + `severity:` |
| 2 | `modules/crm/crm-event-day-checkin.js` | 213 | `metadata:` + `severity:` |
| 3 | `modules/crm/crm-event-day-coupon.js` | 32 | `metadata:` + `severity:` |
| 4 | `modules/crm/crm-event-day-manage.js` | 310 | `metadata:` + `severity:` |
| 5 | `modules/crm/crm-event-day-schedule.js` | 148–149 | `metadata:` + `severity:` |
| 6 | `modules/crm/crm-init.js` | 72 | `severity:` only (no metadata field — `crm.page.open` is contextless) |
| 7 | `modules/crm/crm-messaging-broadcast.js` | 29 | `metadata:` + `severity:` |
| 8 | `modules/crm/crm-messaging-rules.js` | 36 | `metadata:` + `severity:` |
| 9 | `modules/crm/crm-messaging-templates.js` | 44 | `metadata:` + `severity:` |
| 10 | `modules/crm/crm-payment-helpers.js` | 42 | `metadata:` + `severity:` + `entity_type:'crm_event_attendee'` (SINGULAR — should be plural) |

P25 Finding 1 enumerated 5 sites; deeper grep found 5 more. All 10 ship in commit 1.

### 2.3 Templates that should fire during E2E (Deliverable B)

Per `crm_message_templates` and the V2 rebuild memory, the lifecycle messages Daniel should verify receiving are:

| # | Slug | When it fires | Expected channel(s) |
|---|---|---|---|
| 1 | `lead_intake_new_sms_he` + `lead_intake_new_email_he` | Lead created (T1) | SMS + Email |
| 2 | `event_registration_open_sms_he` + email | Event status → registration_open (T4) | SMS + Email |
| 3 | `event_invite_new_sms_he` + email | Lead invited to event (T5) | SMS + Email |
| 4 | `event_registration_confirmation_sms_he` + email | Lead registers for event | SMS + Email |
| 5 | `event_waiting_list_confirmation_sms_he` + email | Registers over capacity | SMS + Email |
| 6 | `event_invite_waiting_list_sms_he` + email | Invited to event already at capacity (T7) | SMS + Email |
| 7 | `event_2_3d_before_sms_he` + email | 2-3 days before event (T8) | SMS + Email |
| 8 | `event_day_sms_he` + email | Day of event (T9) | SMS + Email |
| 9 | `event_coupon_delivery_sms_he` + email | Admin clicks "שלח" → coupon delivered | SMS + Email |
| 10 | `event_attendee_moved_unpaid_sms_he` + email | Admin moves attendee + opt-in toggle | SMS + Email |
| 11 | `event_attendee_moved_paid_sms_he` + email | Same, paid branch | SMS + Email |

Some require time-based triggers (T8 fires 2-3 days before; can't be tested live without time travel). Others are admin-driven and can be verified directly.

**E2E verifiable today:** 1, 4, 5, 9 (lead intake, registration, waiting list, coupon delivery). T5 invite (#3) requires a closed event with capacity room — also verifiable.

### 2.4 Daniel's approved test contacts

- Phone: `0537889878` (any format)
- Phone: `0503348349` (any format) — Daniel's secondary
- Email: `daniel@prizma-optic.co.il`

All scenarios run on **Prizma**. Demo not used for Deliverable B.

---

## 3. Success Criteria

### 3.1 Deliverable A — code fix

| # | Criterion | Expected | How to verify |
|---|---|---|---|
| 1 | All 10 call sites use `details:` instead of `metadata:` | grep returns 0 hits for `metadata:` in those file lines | `grep -n "metadata:" modules/crm/*.js` |
| 2 | All 10 call sites use `level:` (or omit, defaulting to `'info'`) instead of `severity:` | grep returns 0 hits for `severity:` in CRM JS | `grep -n "severity:" modules/crm/*.js` |
| 3 | `crm-payment-helpers.js:42` uses `entity_type: 'crm_event_attendees'` (PLURAL) | grep | `grep -n "crm_event_attendee" modules/crm/crm-payment-helpers.js` returns the plural form only |
| 4 | After commit lands and admin runs ANY CRM action, the resulting `activity_log` row has non-empty `details` | DB query | smoke |
| 5 | No file exceeds 350 lines after the change (verifier method) | `node -e split` count | shell |
| 6 | All commits on `develop`, repo clean at end | `git status` | shell |
| 7 | Iron Rule 22 — every UPDATE/INSERT carries `tenant_id` (no change to existing UPDATEs) | code review | manual |

### 3.2 Deliverable B — E2E messaging audit

| # | Criterion | Expected | How to verify |
|---|---|---|---|
| 8 | Test attendee created on Prizma using only approved contact (phone `0537889878` or `0503348349`, email `daniel@prizma-optic.co.il`) | DB row exists with the contact | DB query + Daniel inbox confirmation |
| 9 | Lead intake (scenario 1) — Daniel receives BOTH SMS and Email at his contacts | screenshots of both | Daniel confirms receipt |
| 10 | Registration confirmation (scenario 4) — Daniel receives both | screenshots | Daniel confirms |
| 11 | Coupon delivery (scenario 9) — Daniel receives both, with the actual coupon code embedded (e.g., `SuperSale{event_number}`) | screenshots | Daniel confirms code matches event |
| 12 | Waiting list confirmation (scenario 5) — Daniel receives both | screenshots | Daniel confirms |
| 13 | Each received message rendering inspected: SMS character count + readability, Email RTL + Heroicons + gold color (per design canon) | visual check | screenshots |
| 14 | Activity_log entries from these dispatches show non-empty `details` populated correctly (post-commit-1 verification) | DB query | shell |
| 15 | Test data fully inventoried in `TEST_DATA_INVENTORY.md` so Daniel can clean up later | file exists | filesystem |

---

## 4. Autonomy Envelope

**Executor MAY without asking:**

- Edit the 10 call sites in commit 1.
- Run the smoke test on demo first to confirm the fix works (creates 1 demo cancel action → verifies non-empty details in activity_log).
- Push the fix to develop.
- Then run E2E messaging on Prizma.
- Document message receipts in screenshots.
- Toggle feature flags in browser if needed (no persisted change).
- Touch ONLY rows whose contact matches the approved set. If a row needs to be created (new lead for the test), use approved contacts.

**Executor MUST stop and ask:**

- If any test would dispatch SMS/Email to a non-approved contact — STOP, skip the scenario, log the skip.
- If after the fix, an activity_log row STILL has empty `details` — STOP, investigate (the rename might have missed a transform site).
- If the messaging pipeline (Make scenario 9104395) is not running or returning errors — STOP, surface to Daniel; this is not in P26 scope to fix.
- If a smoke test reveals a SECOND class of bug (not just metadata field name) — log + STOP for Daniel decision.

**Executor MAY NOT under any circumstances:**

- Touch any non-approved Prizma row
- Dispatch to any non-approved phone or email
- Delete or backfill historical activity_log entries (the 289 existing empty rows STAY as they are — fixing forward only)
- Use `--no-verify` on commits

---

## 5. Stop-on-Deviation Triggers

| Trigger | Action |
|---|---|
| Any non-approved Prizma row would be modified | STOP — skip scenario, log |
| Non-approved phone/email would receive a message | STOP — skip scenario, log |
| Make scenario fails or returns errors mid-test | STOP — surface to Daniel |
| activity_log shows empty details after commit-1 lands | STOP — fix incomplete |
| Any new schema constraint surfaces | STOP — escalate |
| Pre-commit gate fails | STOP — never `--no-verify` |

---

## 6. Out of Scope

- Backfilling historical `activity_log` rows (the 289 with empty details stay as-is)
- Fixing `crm-init.js:72` page-open log to add metadata (no metadata to add — page open is contextless)
- Fixing similar `metadata:` patterns OUTSIDE `modules/crm/` (other modules have their own logger callers; they're a separate audit)
- Adding new SMS/Email templates
- Time-based triggers (T8, T9 — can't test without time travel)
- The 4 pending tid() collisions (P23.3)
- Mobile-responsive Event Day "ניהול" (P25 Finding 3)
- Banner event context (P25 Finding 6)
- All P25 IMPROVEMENT_PROPOSALS

---

## 7. Expected Final State

**Files modified:**
- `modules/crm/crm-attendee-cancel.js` (1 line)
- `modules/crm/crm-event-day-checkin.js` (1 line)
- `modules/crm/crm-event-day-coupon.js` (1 line)
- `modules/crm/crm-event-day-manage.js` (1 line)
- `modules/crm/crm-event-day-schedule.js` (2 lines)
- `modules/crm/crm-init.js` (1 line — `severity:` removal only)
- `modules/crm/crm-messaging-broadcast.js` (1 line)
- `modules/crm/crm-messaging-rules.js` (1 line)
- `modules/crm/crm-messaging-templates.js` (1 line)
- `modules/crm/crm-payment-helpers.js` (1 line — both fields + entity_type plural)

**Reports written:**
- `EXECUTION_REPORT.md` — what was done, commits, deviations
- `FINDINGS.md` — anything observed but out-of-scope
- `MESSAGE_VERIFICATION.md` — per-scenario message receipt confirmation table
- `screenshots/` — all received SMS + Email screenshots (named `{scenario_id}_{channel}.png`)
- `TEST_DATA_INVENTORY.md` — every row created/modified during the run with restore SQL

**DB:**
- Zero schema changes
- Test rows exist on Prizma (will be cleaned up by Daniel)
- All NEW activity_log entries from Daniel's actions have non-empty `details`

---

## 8. Commit Plan

| # | Commit | Files | Note |
|---|---|---|---|
| 1 | `fix(crm): correct ActivityLog field names — metadata→details, severity→level, entity_type plural` | 10 files in `modules/crm/` | Single atomic commit; touches only field names, no behavior change |
| 2 | `chore(spec): close P26 with retrospective` | EXECUTION_REPORT + FINDINGS + MESSAGE_VERIFICATION + TEST_DATA_INVENTORY + screenshots | Retro |

Each commit must build clean; pre-commit gate green.

**No `--no-verify`. No exceptions.**

---

## 9. Rollback Plan

Deliverable A is purely additive (renames). If something breaks:
- Revert commit 1 — system returns to broken-audit-trail state. No data loss; no breaking change to consumers.
- Test data on Prizma stays unless Daniel decides to clean.

---

## 10. QA Plan (executor on Prizma + demo)

### Phase 1 — Demo smoke (verify fix works before Prizma)

| # | Scenario | Setup | Action | Expected |
|---|---|---|---|---|
| 1 | Cancel-write captures details | demo paid attendee | Click "בטל" → "מגיע החזר" | activity_log row for `crm.attendee.cancel` has `details={from_status, payment_status, path}` populated |
| 2 | Coupon-send-write captures details | demo pending_payment attendee | Click "שלח" | activity_log row for `crm.attendee.coupon_sent` has `details={sms_ok, email_ok, sms_log_id, email_log_id}` populated |
| 3 | Mark-paid (legacy) captures details | demo refund_requested attendee | Click "סמן הוחזר" | activity_log row for `crm.attendee.payment_refunded` has `details` populated |
| 4 | entity_type plural | demo paid attendee | Click "סמן שולם" via legacy panel | activity_log row has `entity_type='crm_event_attendees'` (PLURAL) |

If Phase 1 passes, push commit 1 and proceed.

### Phase 2 — Prizma E2E messaging (Daniel's directive)

| # | Scenario | Setup on Prizma | Action | Expected receipt |
|---|---|---|---|---|
| 5 | Lead intake | Create new lead via storefront form OR manually with phone `0537889878` + email `daniel@prizma-optic.co.il` | Form submit / manual create | Daniel receives `lead_intake_new_sms_he` + `_email_he`. Screenshot both. |
| 6 | Register lead to event | Lead from #5, register to a `registration_open` event with capacity | Click "רשום משתתף" in event detail | Daniel receives `event_registration_confirmation_sms_he` + email |
| 7 | Register over capacity | Lead from #5, register to a CLOSED or AT-CAPACITY event | Click "רשום" | Daniel receives `event_waiting_list_confirmation_sms_he` + email |
| 8 | Send coupon | Lead from #6 (registered, paid status set via "סמן שולם" if needed) | Open Event Day "ניהול" → click "שלח" | Daniel receives `event_coupon_delivery_sms_he` + email; Email contains correct coupon_code (e.g., `SuperSale{event_number}`); SMS has the coupon code visible |
| 9 | Invite to new event (T5) | New event with capacity. Daniel's lead is in `waitlist` from #7 | Status change → `invite_new` | Daniel receives `event_invite_new_sms_he` + email; SMS has registration link |
| 10 | activity_log post-fix verification | After scenarios 5–9 | DB query | All Daniel-triggered actions have non-empty `details` |

**Each scenario:** screenshot the received SMS (phone screen) and the received email (inbox view). Save in `screenshots/{N}_sms.png` and `screenshots/{N}_email.png`.

If a scenario's message DOESN'T arrive within 5 minutes — STOP, log as a finding (Make pipeline issue or template config issue), continue with next scenario.

---

## 11. Lessons Already Incorporated

- **Step 0 reproduce-the-bug**: §2.1 numbers are queried live (289 entries with empty details). §2.2 lists all 10 call sites with line numbers verified by grep.
- **CHECK-constraint pre-flight**: not applicable, no DDL.
- **Verifier-method line counts**: §2.1 / §2.2 measure with `grep -n` → no line-count drift risk for 1-line edits.
- **Business-semantics mapping**: Deliverable A doesn't introduce new write semantics — pure field-name fix. Existing semantics preserved.
- **Stale-baseline freshness gate**: SPEC dispatched the same evening; no drift.
- **Stop-trigger semantic distinctions**: §5 distinguishes "non-approved data touch" (HARD STOP) from "scenario surfaces a finding" (continue).
- **DDL + tenant override clarifier**: not applicable, no DDL.
- **State-machine 3-transition test**: not applicable, no state machine introduced.
- **Production-credential boundary**: §2.4 hard-restricted contacts.
- **Test data restore discipline**: §7 and §10 phase 2 produce TEST_DATA_INVENTORY for Daniel cleanup; no auto-delete.

---

## 12. After Execution

The executor writes EXECUTION_REPORT.md + FINDINGS.md + MESSAGE_VERIFICATION.md + TEST_DATA_INVENTORY.md + screenshots/. Foreman writes FOREMAN_REVIEW.md after Daniel reads.

---

*End of SPEC.md*
