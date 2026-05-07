# SPEC — M4_AUDIT_PHASE2 (Functional Flow Tests — Live SMS/Email)

> **Location (target):** `modules/Module 4 - CRM/docs/specs/M4_AUDIT_PHASE2/SPEC.md`
> **Authored by:** Campaign Overseer + opticup-strategic Foreman (Cowork session, 2026-05-05)
> **Phase:** 2 of 2 (Phase 1 = M4_OVERNIGHT_AUDIT, closed)
> **Module:** 4 — CRM
> **SPEC class:** `[functional-test / live-pipeline / read-mostly]` — exercises the live messaging pipeline on demo tenant. Generates real SMS + email to ONE phone + ONE email. No code changes.

---

## 1. Goal

Run the 8 Track D functional tests that Phase 1 deferred — actually firing live SMS + email through the demo pipeline using ONE phone (`0537889878`) and ONE email (`daniel@prizma-optic.co.il`). Verify message bodies render correctly (variables substituted, no `%name%` literals, Hebrew renders right, links work). Capture every fired message's content + delivery status. Append the results as `PHASE2_REPORT.md` so the morning triage has a complete picture.

**Critical context:** Module 4 is in PRODUCTION as of 2026-05-03. Real customers receive messages from the same pipeline this test exercises. The cutover is live. Tests run on demo tenant only — but the EFs and Make scenarios are shared between demo + prizma.

## 2. Background & Motivation

Phase 1 audit (2026-05-05 06:38-07:01) deferred 8 of 17 Track D tests because they would fire real SMS/email. Daniel pre-authorized one phone + one email for this Phase 2. The deferred tests cover:
- T1 Lead intake (storefront → demo) — full pipeline including SMS + email
- T4 Manual lead → registration — staff registers existing lead to event
- T5 Auto event registration form (T5/T7 flow) — SMS link → form submit → status promotion
- T9 Lead delete + cascade — soft-delete lead → attendees auto-soft-delete (verify via DB only — NO message fires)
- T12 Broadcast 1000-cap — SKIP (would require >1000 demo leads + real SMS budget)
- T13 Coupon delivery — message log + SMS body + unsubscribe link
- T14 Unsubscribe link — click link → consent state DB write → next message suppressed (this is also G-HIGH-1 verification — the verify_jwt drift)
- Plus T2 duplicate (already PASS in Phase 1 but re-verify SMS body)
- Plus a Hebrew-rendering sanity check across all template variables

**Why now:** Phase 1 found 4 CRITICAL security findings + suspicion that unsubscribe is broken. The morning triage SPEC will close those, but Daniel needs to know whether the messaging pipeline itself is delivering correct content to customers RIGHT NOW. If templates render wrong, every customer SMS today is wrong.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value |
|---|-----------|---------------|
| 1 | Branch at end | `develop`, clean |
| 2 | Commits produced | 0 |
| 3 | Files created | 2 (SPEC.md + PHASE2_REPORT.md) |
| 4 | Phone whitelist enforcement | every fired SMS targets `+972537889878` exactly |
| 5 | Email whitelist enforcement | every fired email targets `daniel@prizma-optic.co.il` exactly |
| 6 | Prizma writes during run | 0 |
| 7 | Prizma message_log writes | 0 |
| 8 | Demo test leads created | ≤30 (one phone, recreated frequently) |
| 9 | Tests executed | T1, T2, T4, T5, T9, T13, T14 — 7 tests with documented outcomes |
| 10 | T12 (broadcast 1000-cap) | SKIPPED with documented reason — too costly |
| 11 | Each fired message captured | message_log row id + slug + body content + status + delivered_at + provider_response (if available) |
| 12 | Hebrew rendering check | for each template fired: confirm `%name%` / `%event_name%` / `%event_date%` / `%registration_url%` / `%unsubscribe_url%` substituted (no literal `%` in body) |
| 13 | Unsubscribe end-to-end | clicked link returns 200 + consent_state row written + subsequent send to same contact suppressed |
| 14 | Demo cleanup at end | all test leads soft-deleted; no zombie attendees |
| 15 | Total runtime | ≤4 hours |

## 4. Whitelist (NON-NEGOTIABLE)

| Channel | Allowed value | Forbidden |
|---|---|---|
| SMS phone | `0537889878` (E.164: `+972537889878`) | EVERY OTHER NUMBER, including `0503348349` (this Phase 2 narrows to ONE number per Daniel directive) |
| Email | `daniel@prizma-optic.co.il` | EVERY OTHER EMAIL |
| Tenant | demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`) | prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`) |

**Pre-flight gate (mandatory before ANY test fires):**

Before each test that fires a message, the executor MUST run this verification SQL on the demo tenant lead row being targeted:
```sql
SELECT id, tenant_id, phone, email, is_deleted
  FROM crm_leads
 WHERE id = '{lead_id_under_test}';
```
Confirm:
- `tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` (demo)
- `phone = '+972537889878'`
- `email = 'daniel@prizma-optic.co.il'` OR NULL (some tests use phone-only)
- `is_deleted = false`

If ANY of those is wrong → STOP that test, log as CRITICAL, continue with the next test.

## 5. Autonomy Envelope

### CAN do without asking
- All Phase 1 read permissions (any file in repo, demo + prizma SELECT)
- Create demo test leads with whitelist phone/email — soft-delete + recreate freely
- Drive Claude in Chrome MCP against demo CRM at `http://localhost:3000/crm.html?t=demo` (PIN 12345)
- Trigger live messaging via:
  - Storefront form submission to demo lead-intake
  - "Register to event" flow on demo CRM
  - "Send test message" buttons on demo CRM (if exposed)
  - Direct DB UPDATE that triggers automation rules (e.g., `event.status='registration_open'` triggers T4 template)
  - Direct EF invocation via Supabase MCP `execute_sql` calling RPC, or via `supabase functions invoke` if available
- Read demo `crm_message_log` to capture fired message bodies
- Read Make scenario `9104395` execution logs for delivery confirmation
- Click unsubscribe links from received messages (fired to whitelist contacts)
- Use Agent subagents for parallel sub-tests
- Write SPEC.md (this file) + PHASE2_REPORT.md — only project-tree writes

### REQUIRES stopping
- Any write to prizma tenant
- Any test pre-flight gate failure (per §4)
- Any message firing to non-whitelist contact (CRITICAL — investigate immediately, do not retry)
- Any commit, push, branch checkout other than verifying current
- Any DDL on either tenant
- Any EF deploy / source edit
- Any Make scenario edit (read-only)
- Any merge to main / push to main
- Total runtime exceeding 4 hours — write partial report and stop

## 6. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- Pre-flight gate failure on a target lead (§4) → STOP that test, log CRITICAL, continue with next
- Message fires successfully but `phone` field on the message_log row is NOT `+972537889878` → STOP this test, log CRITICAL, continue with next test
- A template renders with literal `%var%` (variable not substituted) → log CRITICAL, continue (this is content-level evidence not pipeline failure)
- Make scenario shows error in execution log on a tested message → log HIGH, continue
- Demo tenant unreachable → halt remaining tests, write partial report
- Any sign that a fired message reached prizma's queue (`crm_message_queue` row with prizma tenant_id created during this run) → STOP everything, this is a CRITICAL incident, do NOT continue any tests, write incident-report-only output

## 7. Test Plan (the 7 tests + 1 cleanup)

### Setup (run once)
1. Verify demo tenant accessible, login PIN 12345 works
2. Verify there's at least 1 active demo event in `registration_open` status (create one if not — name `M4_PHASE2_TEST_EVENT`, event_date = today + 14d, max_capacity = 5)
3. Pre-flight: confirm `0537889878` and `daniel@prizma-optic.co.il` resolve to a writable demo lead, OR document creating a fresh one in T1
4. Note `START_TIMESTAMP` — every message_log query later uses `created_at >= START_TIMESTAMP`

### T1 — Lead intake (storefront → demo)
**Goal:** verify the storefront form → lead-intake EF → demo crm_leads → SMS+email pipeline.

**Method options (executor picks):**
- (a) If demo storefront URL exists at `localhost:4321` or similar — submit the form via Chrome
- (b) If no demo storefront — call `lead-intake` EF directly via curl/fetch with demo anon JWT and tenant_id=`demo`
- (c) Direct DB INSERT into demo `crm_leads` to simulate ingestion (LEAST PREFERRED — bypasses EF logic)

**Required outcomes:**
- 1 row in demo `crm_leads` with phone `+972537889878`, email `daniel@prizma-optic.co.il`
- 1 row in demo `crm_message_log` with template_slug `lead_intake_new_sms_he`, status terminal (sent/delivered/queued)
- 1 row in demo `crm_message_log` with template_slug `lead_intake_new_email_he`, status terminal
- Body of SMS captured + Hebrew renders + variables substituted
- Body of email captured + HTML structure intact + variables substituted
- Daniel receives both within 5 min on the actual phone + inbox

**Track D-T1 fail criteria:** missing message_log row, literal `%var%` in body, non-200 status from EF, delivery to wrong recipient.

### T2 — Duplicate detection (re-verify with body capture)
Re-submit the same phone within minutes. Expected: `lead_intake_duplicate_*` template fires, NOT a second `lead_intake_new_*`. Capture body. Verify "you're already registered"-style copy.

### T4 — Manual lead → registration
**Goal:** verify the staff-side flow.

Method: in demo CRM, find the lead from T1, click "Register to event" → pick `M4_PHASE2_TEST_EVENT` → confirm. Expected:
- `crm_event_attendees` row created (status `registered`)
- 1 SMS + 1 email fired (slug `event_registration_confirmation_*` or whatever production wires)
- Body has correct event_name + event_date + event_time

### T5 — Auto event registration form (T5/T7 flow)
**Goal:** verify the auto-flow when an event flips to `registration_open` and a `waiting`-status lead receives the invite.

Method: create a lead in `status='waiting'` linked to a **closed** event (so they're queued), then flip the event status to `registration_open`. Expected:
- Auto SMS fires (slug `event_invite_new_sms_he` or `event_registration_open_sms_he`)
- SMS body has working `%registration_url%` link
- Click the link → opens form → submit → `crm_event_attendees` row created with status `registered`/`waiting_list` per capacity → confirmation message fires

This test exercises the full T5 flow end-to-end. If the link returns 404 or the form fails to load, log as HIGH.

### T9 — Lead delete + cascade (DB-only verify, NO message fires)
Soft-delete a test lead with attached attendees. Verify:
- Lead `is_deleted=true`
- All attendees on that lead become `is_deleted=true` (cascade trigger)
- 0 messages fire from the soft-delete (this is critical — soft-delete must not trigger any "we miss you" sends)

If a message DOES fire from a soft-delete, that's a CRITICAL finding.

### T13 — Coupon delivery
**Goal:** verify the coupon-send pipeline.

Method: pick an attendee from T4, trigger coupon-send (via the existing CRM button). Expected:
- 1 SMS fires with template_slug `event_coupon_*` (verify exact slug)
- Body contains the coupon code
- Body contains an unsubscribe URL
- Attendee `coupon_sent=true`, `coupon_sent_at` set

### T14 — Unsubscribe end-to-end (also G-HIGH-1 verification)
**Goal:** verify the unsubscribe flow that Phase 1 flagged as suspicious (`verify_jwt` config drift).

Method:
1. From any received SMS or email, copy the unsubscribe URL
2. GET the URL in Chrome (no logged-in session)
3. Verify response: 200 OK or 302 to a "you're unsubscribed" page (NOT 401/403 from gateway — that would confirm G-HIGH-1)
4. Verify DB: a row in whatever consent table the EF writes (`crm_consent_state` or similar — executor discovers)
5. Send another message to the same contact via the same channel that was unsubscribed. Expected: suppressed (not in message_log as `sent`, OR in message_log as `suppressed_unsubscribed` per the EF's branching)

If step 3 returns 401/403 → **G-HIGH-1 confirmed CRITICAL.** Customers cannot unsubscribe today, which is a CAN-SPAM/regulatory liability.
If step 5 still sends → suppression broken; log CRITICAL.

### Cleanup (mandatory)
1. Soft-delete every test lead created during this run:
   ```sql
   UPDATE crm_leads
      SET is_deleted=true, deleted_at=NOW()
    WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
      AND phone='+972537889878'
      AND created_at >= '{START_TIMESTAMP}';
   ```
2. Soft-delete `M4_PHASE2_TEST_EVENT` if created
3. Verify 0 zombie attendees: `SELECT * FROM crm_event_attendees WHERE tenant_id=demo AND lead_id IN ({test_lead_ids}) AND is_deleted=false` should return 0

## 8. Out of Scope (DO NOT touch)

- Any code change in CRM/EF source
- Any prizma write
- Any test that would send to a contact other than the whitelist (no `0503348349` this run, no other email)
- T12 broadcast 1000-cap — explicitly skipped (would require flooding the test phone)
- T6 Quick-register QR — already PASS in Phase 1 deferred-by-design; not re-tested
- T11 Pagination — already covered by Phase 1
- T16 admin permissions — already covered by Phase 1
- The 4 missing FOREMAN_REVIEW.md files — opticup-strategic's job
- VM mount drift — leave alone
- Iron Rule 31 integrity gate — do not run

## 9. Report Structure (mandatory)

ONE file at `modules/Module 4 - CRM/docs/specs/M4_AUDIT_PHASE2/PHASE2_REPORT.md`:

```
# PHASE2_REPORT.md — Module 4 Functional Flow Tests
**Phase 2 start:** YYYY-MM-DD HH:MM (Israel)
**Phase 2 end:** YYYY-MM-DD HH:MM
**Total runtime:** Xh Ym
**Branch:** develop @ {sha}
**Whitelist enforced:** phone +972537889878, email daniel@prizma-optic.co.il
**Demo lead IDs created:** {list}
**Demo event ID created:** {if any}
**Prizma writes:** 0 (verified)

## EXECUTIVE SUMMARY
- N tests executed, M passed, K failed, L blocked
- Top 3 things to fix in the morning (one-liners)
- Was G-HIGH-1 (unsubscribe verify_jwt drift) confirmed? YES/NO/INCONCLUSIVE

## TEST RESULTS

### T1 — Lead intake (storefront → demo)
- Method used: (a/b/c)
- Pre-flight gate: PASS / FAIL ({sql_result})
- Lead created: id={uuid}, phone={value}, email={value}, tenant_id={uuid}
- SMS message_log row: id={uuid}, slug={value}, status={value}, body=`<full body verbatim>`
- Email message_log row: id={uuid}, slug={value}, status={value}, body excerpt=`<first 500 chars>`
- Hebrew rendering: clean / has literal `%var%` / mojibake
- Variables substituted: %name% → {value}, %event_name% → {value}, %registration_url% → {value}
- Daniel-side delivery confirmation: SMS received YES/NO at {timestamp}, email received YES/NO at {timestamp}
- Verdict: PASS / FAIL / PARTIAL — {reason}

### T2 — Duplicate detection
[same structure]

### T4 — Manual lead → registration
[same structure]

### T5 — Auto event registration form
[same structure, plus URL click result + form submit result]

### T9 — Lead delete + cascade (DB-only)
- Pre-state: lead {uuid} with N attendees
- Soft-delete executed: timestamp={value}
- Post-state: lead is_deleted=true, attendees is_deleted=true (count={n})
- Messages fired during soft-delete: COUNT={n} — expect 0
- Verdict: PASS if count=0

### T13 — Coupon delivery
[same structure]

### T14 — Unsubscribe end-to-end (G-HIGH-1 VERIFY)
- Source message: id={uuid}, slug={value}, unsubscribe_url={url}
- GET response: status={code}, location header={if any}
- DB consent write: row found in `{table}` with {fields}
- Suppression test: sent followup SMS, message_log row status={value}
- G-HIGH-1 verdict: CONFIRMED CRITICAL / FALSE ALARM / INCONCLUSIVE — {reason}

## TEMPLATE BODY ARCHIVE
Full body of every fired message, ordered by created_at:
1. {slug} → SMS / email — body
2. ...

## CLEANUP VERIFICATION
- Test leads soft-deleted: COUNT={n}
- Test event soft-deleted: YES/NO
- Zombie attendees: COUNT={n} (expect 0)

## APPENDIX A — Tool & Environment Issues
## APPENDIX B — Deltas vs Phase 1 (what changed in our understanding)
```

## 10. Lessons Already Incorporated

- Phase 1 deferred 8 tests due to whitelist conservatism — Phase 2 explicitly authorizes ONE phone + ONE email per Daniel directive
- Pre-flight gate (§4) is MANDATORY before each fire — prevents "wrong target" incidents
- Capture full message body (not just slug) — Hebrew rendering bugs need eyeballs on the actual text
- G-HIGH-1 is testable here — Phase 2 owns confirming or refuting it
- Module is in PRODUCTION — every test is on demo, but the EFs and Make scenario `9104395` are shared. A bug exposed by Phase 2 is a bug in customer-facing code RIGHT NOW.

*End of SPEC.*
