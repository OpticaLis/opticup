# Demo Tenant — End-to-End Full Audit + Fix-As-You-Go Overnight Run

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat, overnight, up to 8 hours)
**Owning module:** Module 4 — CRM (with cross-module scope: M3 Storefront, M12 Communications, M5 Customers infrastructure)

---

## 1. Purpose

Daniel discovered a confirmed bug on demo and asked for an overnight comprehensive audit + fix-as-you-go of every behavioral flow in the CRM/event/lead/messaging pipeline. This SPEC authorizes the Pipeline to:

1. **Fix the confirmed bug** (see §3 for exact correct behavior).
2. **Run every scenario end-to-end** on demo tenant — creating, deleting, re-creating leads + events using only the whitelisted phones and emails.
3. **Fix any bug discovered along the way** without stopping for confirmation. If unsure → fix it the way that seems best and log it as "uncertain" in the report.
4. **Verify all side-effects:** event board updates, status badges, activity_log entries, message templates rendering, short-link generation, automation rule firing.
5. **Produce a clean report:** what was tested, what was fixed (with file/commit references), what is uncertain.

This is an overnight Pipeline run. Daniel reviews the report in the morning. Anything misjudged → corrected then.

## 2. Constraints

- **Demo tenant ONLY.** Tenant UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`. Any write to Prizma's row → immediate stop + escalation.
- **Whitelist enforced.** Any test lead created must use ONLY these contact channels:
  - Phones: `0537889878`, `0503348349`, `0507168471`
  - Emails: `danylis92@gmail.com`, `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`
  - Both allowlists are already configured per predecessor SPECs.
- **No outbound messages to non-whitelisted numbers.** The `test_mode_sms_allowlist` + `test_mode_email_allowlist` already enforce this. If any test creates a lead with a non-whitelisted contact, drop the contact before save.
- **No schema changes.** Bugs must be fixed at the data/config/code level — never via new columns or new tables. If a schema change appears necessary → log as "uncertain - needs Architect review" and skip.
- **No DELETE on existing pre-test data in demo** unless the lead/event was created by THIS Pipeline as a test artifact. Pre-existing demo rows stay untouched.
- **No merge to main.** All changes to `develop`.

## 3. THE CONFIRMED BUG — Fix This First, In Detail

### Current broken behavior — TWO INTERTWINED BUGS

**Bug 3.1 — Wrong target audience for the "additional event" invitation flow:**

When an event is opened for registration (`status` → `registration_open`), the automation rule for the `"הזמנה לאירוע נוסף - רשימת המתנה"` flow (template_code likely `event_invite_waiting_list` / `cross_event_active_waitlist`) sends to the wrong audience. Per Daniel's inspection of the rule UI 2026-05-11, the rule's "למי לשלוח" field is set to "כל Tier 2 (כל הרשומים)" — meaning every lead who is registered to ANY event. This is the bug. The flow should send ONLY to leads whose **`crm_leads.status = 'רשימת המתנה'`** in the MAIN LEADS BOARD (the primary leads table, NOT the event's attendee table).

**The distinction is critical and was a misunderstanding by Architect on first pass:**
- "Main leads board" / "בורד רשומים" / "בורד ראשי" = the `crm_leads` table — Tier 2 leads
- "Attendees of event X" = the event's own attendee list — a separate concept
- This rule's correct filter is on the MAIN LEADS BOARD, by `crm_leads.status`, NOT on any event's attendee list

**Bug 3.2 — Send-message auto-attaches recipient as attendee:**

When the `event_invite_waiting_list` template is sent to a lead, the codepath also inserts that lead as an attendee of the new event with status `"הוזמן"` (Invited). This is wrong. The message is a marketing invitation, not a registration. The lead should remain in the main leads board with their existing status; nothing in the new event's attendee list.

This auto-attach is what fills the event capacity preemptively. Visually it shows as "0/1" because "הוזמן" status often isn't counted toward the cap UI, BUT if a real lead clicks the registration link, the SLOT IS ACTUALLY TAKEN at the DB level, and the new registrant gets bumped to waitlist. The UI lies; the DB tells the truth.

### Correct behavior

When an event status transitions to `registration_open`, TWO automation rules should fire:

**Rule A — `event_invite_pending` (or similar — sends to "ממתין" status):**
- Target: leads on main board with `status = 'ממתין'` (Pending)
- Action: send "הזמנה לאירוע" message
- Side effect on attendee table: NONE (no auto-attach)
- **This is already working correctly per Daniel — don't touch.**

**Rule B — `event_invite_waiting_list` (the buggy one):**
- Target: leads on main board with `status = 'רשימת המתנה'` (Waiting List) — `crm_leads.status` filter, applied to the main leads table, NOT any event's attendee list
- Action: send "הזמנה לאירוע נוסף - רשימת המתנה" message
- Side effect on attendee table: NONE — the message is a marketing invitation, recipient is NOT added to the new event under any status
- A recipient becomes a registrant only by actively clicking the link, filling the form, submitting → at which point normal capacity logic applies (open slot → confirmed/attending; full → waitlist of THIS event)

### Where to look

1. **The automation rule row** — find it by name "אירוע פתח להרשמה - הזמנת רשימת המתנה" or template_code `event_invite_waiting_list`. Its "audience filter" field is the primary bug. Inspect the SQL/JSON of the rule. The filter must reference `crm_leads.status = 'רשימת המתנה'`, not "all Tier 2".
2. **The send-message Edge Function or the rule executor** — find where, after sending this template, an INSERT is happening into `event_attendees` (or whatever the table is called) with status `'הוזמן'`. Remove that INSERT for THIS specific template/flow. Other flows that DO want auto-attach (if any) should remain unchanged.
3. **Verify the visual UI counter logic** — at the same time, check that the capacity counter handles `"הוזמן"` status correctly. The fact that "0/1" displayed when 1 person was attached as "הוזמן" suggests the counter excludes "הוזמן" from the cap — verify this is intentional and consistent. If not, that's a Bug 3.3 to log.

### Required fix

1. Update the automation rule's audience filter to `crm_leads.status = 'רשימת המתנה'` on the main board.
2. Remove the side-effect INSERT into event_attendees for this flow.
3. Verify with a clean test event + a clean set of test leads that this flow now sends ONLY to the right people AND does NOT auto-attach them.

### Where to look in code

Likely locations (Pipeline confirms via grep):
- An Edge Function or RPC named like `event_open_waitlist_invite`, `send_event_invitation`, `event_create_trigger`, or similar
- A `trigger` on the `crm_events` table firing on `INSERT` or `UPDATE status='פתוחה'`
- A `crm_events.on_open` flow in an automation_rules row
- The `send-message` EF's handling of the specific template_code (likely `event_waitlist_invite` or `additional_event_waitlist`)
- The attendee-insertion logic that's wrongly chained to the message-send

### Required fix

Pipeline modifies the codepath so:
- Filter eligibility: only leads with `status = 'רשימת המתנה'` (or its enum equivalent) in **some other event**
- Decouple message-send from attendee-creation. Sending is atomic; attendee-creation only happens on explicit registration.

If the bug is in an automation_rule row's filter condition → UPDATE the row.
If the bug is in an RPC or EF → modify the code and redeploy.
If unsure → fix in the way most consistent with the rest of the codebase (e.g., if other automation_rules use `lead.status` filtering, do the same).

## 4. End-to-End Scenarios to Cover

The Pipeline must run ALL of these scenarios on demo, in order, with intermediate cleanup so each scenario starts from a known state.

### Block A — Lead Lifecycle
A1. Create lead via storefront form (submit `/supersale/register/` on `opticup-storefront-demo.vercel.app`) — lead arrives in demo CRM
A2. Create lead via CRM "+" button manually — same
A3. Create lead via Quick-Register QR flow (WhatsApp walk-in path) — same
A4. Change lead status through the full state machine (new → contacted → interested → ... → converted / lost)
A5. Soft-delete a lead → verify it disappears from active views but stays in DB with is_deleted flag
A6. Restore a soft-deleted lead → verify it returns to the right state
A7. Hard-delete attempt — verify proper PIN gate (and that demo allows the test PIN)
A8. Deduplication: create two leads with the same phone → verify dedup behavior matches Prizma

### Block B — Event Lifecycle
B1. Create new event with max_attendees=1 — verify NO auto-invitations happen at creation time before the user explicitly opens registration
B2. Open registration on the event ("נפתחה הרשמה") — verify ONLY waitlisted leads from OTHER events get the message; verify no auto-attendee-creation (the bug being fixed in §3)
B3. A lead clicks the registration link → fills the form → submits → verify proper status assignment (first slot taken, others waitlist)
B4. Lead requests cancellation → verify removal from attendee + status update + waitlist promotion of next person
B5. Soft-delete event → verify it disappears from active board, stays in DB
B6. Restore deleted event → verify attendee_ids restored correctly (per RESTORE_DELETED_EVENT_UI Approach B)
B7. Edit event details — verify activity_log captures change
B8. Close registration → verify no further registrations accepted; existing waitlist stays in waitlist

### Block C — Messaging Flows
C1. Verify each automation rule fires correctly. For each rule, trigger its condition and check that:
   - The message is sent ONLY to whitelisted contacts (or filtered if recipient is not whitelisted)
   - The template renders with correct placeholders (tenant name = demo, not Prizma; storefront_url = demo Vercel; phone numbers = demo's numbers)
   - The activity_log captures the send + recipient + template_id
C2. Send a manual message from the CRM (not automation) — verify the same rendering rules
C3. Verify short-link generation: every link produced should resolve to `opticup-storefront-demo.vercel.app/...`, not opticalis or prizma

### Block D — Storefront Integration
D1. Submit each storefront form (supersale, contact, optometry, quick-register if available) — verify each one produces a lead in demo's CRM with correct UTM tracking, correct acquisition_source, correct tenant_id
D2. Verify storefront's tenant detection works — `PUBLIC_DEFAULT_TENANT=demo` produces demo-tenant leads
D3. Verify image proxy still works for demo (image-proxy with demo's service-role key)
D4. Verify language switching works (HE/EN/RU) and submits correctly per language

### Block E — Event Board / UI
E1. Verify event board shows correct attendee counts after each scenario
E2. Verify event status badges update correctly (registration open/closed/full/waitlist-only)
E3. Verify the "תפוסה" (capacity) progress bar reflects real state — including whether "הוזמן" status counts toward the cap (consistency check)
E4. Verify activity_log entries appear in the event's history tab
E5. Verify any aggregations on dashboards reflect the test activity
E6. **CRITICAL — Visual Browser Verification via Chrome MCP.** Use the `mcp__Claude_in_Chrome__*` tools to connect to a Chrome browser, navigate to demo CRM, and visually verify:
   - After fixing Bug 3.1+3.2, create a fresh test event with max_attendees=1, open registration
   - Check the event's attendee list → should show 0 attendees, not auto-attached "הוזמן" people
   - Check the activity_log → should show "sent invitation" events for the recipients, but NO "registered" events
   - Try clicking the registration link from one of the whitelisted test leads → verify they register successfully into the open slot
   - Screenshot before/after to AUDIT_REPORT.md

### Block F — Edge Cases
F1. Lead with no phone, only email — verify email-only flow works
F2. Lead with phone but no email — verify SMS-only flow works
F3. Event at max_attendees, new registration attempt — verify rejection or waitlist
F4. Two simultaneous registrations to last slot — verify atomic slot assignment (race condition test)
F5. Event reopened after being closed — verify state transitions correctly
F6. Lead converted to customer (if M5 flow exists in demo) — verify both records sync

### Block G — Data Integrity
G1. After all tests, run `SELECT count(*)` on key tables — verify no orphan rows
G2. Verify no row was created or modified with `tenant_id != demo's UUID` outside of the read-only inspections
G3. Verify Prizma's data is bit-identical to pre-test snapshot
G4. Verify the activity_log is consistent (no entries without a parent record)

## 5. Fix Authority (the user's explicit grant)

For ANY bug discovered during scenario execution:
- Fix it the way that seems most correct
- Do NOT stop to ask Daniel — he's asleep
- Choose the fix that best aligns with how OTHER parts of the codebase solve similar problems
- If 100% certain → just fix it and log to "Fixed (confident)"
- If 50-99% certain → fix it and log to "Fixed (uncertain - review)"
- If 0-50% certain → log to "Not Fixed - Needs Architect Decision" and explain why

The morning report (the deliverable Daniel reads) classifies every action under one of these 3 buckets.

## 6. Deliverables

### Reports (all in SPEC folder)

1. **`AUDIT_REPORT.md`** — the main morning report. Structure:
   - Executive summary (1 page max)
   - **Bug §3 fix status** — what was found, what was changed, where
   - **Section per Block (A-G):** every scenario, pass/fail, fix applied if any
   - **Findings classification:**
     - 🟢 Fixed (confident) — N items
     - 🟡 Fixed (uncertain - review) — M items
     - 🔴 Not Fixed (needs Architect) — K items
   - **Scenarios that passed without intervention** — listed briefly
2. **`COMMITS_LIST.md`** — every commit made by this Pipeline with one-line description
3. **`TEST_ARTIFACTS_LOG.md`** — every lead/event created + deleted by this Pipeline (for audit)
4. Standard Pipeline closure files: EXECUTION_REPORT, FINDINGS, FOREMAN_REVIEW

### Code/Data

- Bug fixes committed to `origin/develop` per Pipeline's own commit discipline
- Test artifacts cleaned up at end (leads + events created for testing are soft-deleted with a `test_marker` set)
- No data left in demo that would interfere with Daniel's morning verification

## 7. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Overnight Pipeline run, up to 8 hours | Daniel 2026-05-11 |
| 2 | Demo only, whitelist enforced | Daniel 2026-05-11 |
| 3 | Fix-as-you-go authority, no stopping for questions | Daniel 2026-05-11 |
| 4 | Confirmed bug §3 fixed first, before scenario sweep | Architect 2026-05-11 |
| 5 | 3-bucket classification: Fixed-confident / Fixed-uncertain / Not-Fixed | Architect 2026-05-11 |
| 6 | No DELETE on pre-test demo data | Architect 2026-05-11 |
| 7 | No schema changes | Architect 2026-05-11 |
| 8 | No Prizma writes ever | Daniel 2026-05-11 |
| 9 | Test artifacts cleaned at end | Architect 2026-05-11 |
| 10 | Morning report is the primary deliverable | Daniel 2026-05-11 |

## 8. Destructive Operations Envelope

Allowed:
- **INSERT** test leads on demo with whitelisted contacts
- **INSERT** test events on demo
- **UPDATE** demo rows for bug fixes (config, rules, templates, statuses)
- **UPDATE** demo Edge Functions code if a bug requires it (redeploy via Supabase MCP)
- **UPDATE** RPC bodies in demo (via SQL apply)
- **Soft-DELETE** (set `is_deleted = true`) on test artifacts created by this Pipeline
- **Soft-DELETE** on test rows in other tables created by this Pipeline (with `test_marker = '<spec-slug>'` if such column exists, otherwise track by id list in TEST_ARTIFACTS_LOG.md)

Forbidden:
- **Hard DELETE** anywhere
- ANY write to Prizma row in `tenants`
- ANY write to Prizma-scoped rows in any table
- Schema changes (ALTER, ADD/DROP COLUMN, CREATE TABLE)
- Force-push
- Merge to main
- Sending messages to non-whitelisted contacts
- Disabling the test_mode allowlists for any reason

If a non-whitelisted contact would be messaged → drop the message and log to FINDINGS.

If a fix requires touching production-scoped (Prizma) data → STOP + escalate.

## 9. Continuous-Run Mandate (overnight)

Run end-to-end in ONE Claude Code chat, autonomously, until all blocks A-G are exhausted OR 8 hours have passed.

Stop only on:
- Iron Rule 31/32 violation
- Attempt to write to Prizma scope (catastrophic regression)
- Database connection lost or unrecoverable
- Pre-commit gate failing more than 3 times consecutively (rare but possible signal of structural problem)

In any other case — keep running. Fix what's broken. Log what's uncertain. Move to next scenario.

## 10. Anti-Patterns

- DO NOT stop to ask Daniel — he is sleeping and approved this autonomous run
- DO NOT hard-delete anything
- DO NOT touch Prizma in any way
- DO NOT modify the test_mode allowlists during the run
- DO NOT skip cleanup — every test artifact gets soft-deleted at end
- DO NOT bury bugs in EXECUTION_REPORT — the morning AUDIT_REPORT.md is the source of truth Daniel reads
- DO NOT introduce schema changes
- DO NOT change identity tables (`tenants` row for demo, employees, channels)
- DO NOT optimize for "passing tests" — optimize for "discovering reality." A scenario that passes by accident is less useful than a scenario that fails honestly.

## 11. References

- Bug §3 baseline: Daniel's screenshot 2026-05-11 (event #23 "אירוע טסט 5", showing 0/1 capacity + 1 auto-invited "P55 Daniel Secondary" under "הוזמן")
- Demo storefront: `https://opticup-storefront-demo.vercel.app`
- Demo CRM: `https://app.opticalis.co.il/` with demo credentials
- Demo tenant UUID: `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- Whitelisted contacts: see §2 Constraints
- Auto-memory `project_crm_open_issues.md` — historical CRM issues
- Auto-memory `project_event_capacity_coupons.md` — event capacity logic
- Auto-memory `project_rpc_fixes_apr24.md` — register_lead_to_event RPC fix history
- Predecessor SPECs in this session: Health Check, Storefront provisioning, allowlists, parity replication

---

*End of brief.*
