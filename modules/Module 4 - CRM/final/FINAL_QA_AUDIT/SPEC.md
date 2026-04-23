# SPEC — FINAL_QA_AUDIT

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/final/FINAL_QA_AUDIT/`
> **Author:** opticup-strategic (Cowork)
> **Written:** 2026-04-23
> **Status:** READY FOR EXECUTION
> **Priority:** FINAL — last gate before merge to main

---

## 1. Goal

Full end-to-end QA audit of the CRM module on the **demo tenant**. Two
deliverables:

1. **QA Test Report** — execute every user-facing flow variation, record
   pass/fail, document bugs found.
2. **Recommendations Report** — propose fixes and improvements that would
   make the CRM fully self-service for an event manager (no dependency on
   Daniel, Make, or Claude).

This is a **read + test + report** SPEC. Code fixes are NOT part of this
SPEC — they will be authored as separate fix SPECs based on the findings.

---

## 2. Context — What Was Built

The CRM manages the full lifecycle of marketing events for optical stores:

```
Lead intake (form/manual) → Tier 1 (incoming) → approve → Tier 2 (registered)
→ create event → open registration → send invites → leads register via form
→ event day (check-in, coupons, purchases) → event close → follow-up messages
```

**Key systems:**
- 6 CRM tabs: Dashboard, לידים נכנסים (Tier 1), רשומים (Tier 2), Events,
  Messaging Hub, Activity Log
- Automation engine with 10 rules (trigger → condition → recipients → send)
- Confirmation Gate (preview modal before automated sends)
- Broadcast wizard (manual sends with advanced filtering)
- Edge Functions: `lead-intake`, `send-message`, `event-register`, `unsubscribe`
- Make scenario (3 modules): Webhook → Router → SMS | Email

**Demo tenant:** slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`
**Test phones (ONLY these):** `+972537889878`, `+972503348349`
**Test email:** `danylis92@gmail.com`
**PIN for demo:** `12345`

---

## 3. Test Matrix — Every Flow Variation

The executor must test EVERY flow below on the demo tenant. For each test,
record: test ID, action taken, expected result, actual result, PASS/FAIL.

### Group A — Lead Lifecycle

| ID | Test | Expected |
|----|------|----------|
| A1 | Create manual lead (Tier 1) with phone `+972537889878` + email `danylis92@gmail.com` | Lead created with status `pending_terms`, source `manual` |
| A2 | Create manual lead with DUPLICATE phone `0537889878` (non-normalized) | Blocked — toast "ליד עם מספר טלפון זה כבר קיים" |
| A3 | Edit lead — change city to "אשקלון" | DB updated, `updated_at` refreshed |
| A4 | Add note to lead via detail modal | Note appears in notes tab with timestamp HH:MM |
| A5 | Change lead status (Tier 1) via detail modal | Status updated, note "סטטוס שונה מ-X ל-Y" inserted |
| A6 | Transfer lead from Tier 1 → Tier 2 ("אשר ✓") with `terms_approved=false` | BLOCKED — toast about terms not approved |
| A7 | Set `terms_approved=true` via SQL, then transfer | Lead moves to Tier 2, status=`waiting`, note inserted |
| A8 | Create second lead with phone `+972503348349` + email (use a second email or same) | Lead created successfully |
| A9 | Verify both leads appear in correct tabs (Tier 1 vs Tier 2) | Correct tab placement |

### Group B — Event Lifecycle

| ID | Test | Expected |
|----|------|----------|
| B1 | Create new event with campaign defaults | Event created with auto-number, `max_coupons` from campaign |
| B2 | Change event status: `planning → registration_open` | Status updated. Automation engine fires (Confirmation Gate should appear showing messages to Tier 2 leads) |
| B3 | Approve the confirmation gate | Messages dispatched via `send-message` EF → Make → SMS/Email |
| B4 | Check `crm_message_log` for the dispatched messages | Log rows with `status=sent`, correct template slugs, correct lead names |
| B5 | Change event status: `registration_open → invite_new` | Confirmation Gate shows invite messages to Tier 2 (excluding already registered) |
| B6 | Verify event detail modal — capacity bar, KPI cards, coupon funnel | Visual check: all sections render |
| B7 | Verify coupon funnel panel — shows "0 קיבלו קופון" (or hidden if 0) | Panel hidden or shows zeros correctly |

### Group C — Registration Form (CRITICAL — known broken link)

| ID | Test | Expected |
|----|------|----------|
| C1 | Check current `%registration_url%` generation in `crm-automation-engine.js` line 151 | URL points to `app.opticalis.co.il/modules/crm/public/event-register.html` — this is on GitHub Pages which serves from `main` branch. The form files are only on `develop`. **EXPECTED: BROKEN** |
| C2 | Manually test the registration form by loading `modules/crm/public/event-register.html` locally with `?event_id=<uuid>&lead_id=<uuid>` | Form loads, shows event details, allows submission |
| C3 | Submit the registration form | Lead registered to event (or waiting list). Confirmation messages dispatched. |
| C4 | Verify the `event-register` Edge Function GET endpoint returns correct data | JSON with event name, date, time, location, lead name, tenant branding |
| C5 | Verify the `event-register` Edge Function POST endpoint processes registration | Returns `{success: true, status: 'registered'}` or `waiting_list` |
| C6 | Test with invalid/missing event_id | Error page with Hebrew message |
| C7 | Test with invalid/missing lead_id | Error page with Hebrew message |

### Group D — Messaging Pipeline

| ID | Test | Expected |
|----|------|----------|
| D1 | Send manual message via quick-send dialog (SMS) | Message sent, log row created |
| D2 | Send manual message via quick-send dialog (Email) | Message sent, log row created |
| D3 | Open broadcast wizard, select board=`incoming`, verify statuses filter to Tier 1 | Only Tier 1 statuses shown |
| D4 | Switch board to `registered`, verify statuses filter to Tier 2 | Only Tier 2 statuses shown |
| D5 | Switch board to `by_event`, verify event picker appears and statuses hide | Event multi-select visible, statuses hidden |
| D6 | Select recipients, verify count updates live | "נמצאו X נמענים" updates on each filter change |
| D7 | Click recipient count → preview popup | Modal shows table with name, phone, status, source |
| D8 | Complete broadcast (template mode, SMS) | `crm_broadcasts` row created, messages sent, log rows created |
| D9 | Complete broadcast (raw mode, Email) | Same as D8 with free-text body |
| D10 | Try WhatsApp channel | Blocked with `invalid_channel:whatsapp` — no EF call |
| D11 | Open Messaging Hub → Templates tab | Templates list renders, can click to preview |
| D12 | Open Messaging Hub → Automation Rules tab | Rules list with 10 active rules |
| D13 | Edit a rule — change recipient_type to `tier2`, add status filter | Filter checkboxes appear, saved to `action_config.recipient_status_filter` |
| D14 | Open Messaging Hub → Log tab | Message log with filters, click-to-expand |
| D15 | Open lead detail → Messages tab | Per-lead message history |
| D16 | Variable copy panel — click a variable in broadcast wizard step 3 | Variable copied to clipboard, toast "הועתק: %var%" |

### Group E — Unsubscribe Flow

| ID | Test | Expected |
|----|------|----------|
| E1 | Check that `send-message` EF injects `%unsubscribe_url%` | Messages contain a valid unsubscribe link |
| E2 | Test unsubscribe EF with valid token (curl) | 200, `unsubscribed_at` set in DB |
| E3 | Test unsubscribe EF with invalid token | 400, Hebrew error page |
| E4 | After unsubscribing a lead, verify automation engine excludes them | `resolveRecipients` returns one fewer lead |
| E5 | Restore lead (set `unsubscribed_at=null`) for cleanup | Lead visible again |

### Group F — Event Day Operations

| ID | Test | Expected |
|----|------|----------|
| F1 | Enter event day mode for the test event | Event day page loads with counter cards |
| F2 | Check-in an attendee (if attendees exist) | `checked_in_at` set, status badge updates |
| F3 | Coupon column shows arrival-aware badges | Green "✓ הגיע" / amber "⚠️ לא הגיע" for sent coupons |
| F4 | Coupon ceiling enforcement — if all coupons used | Toast error when trying to send more |

### Group G — Cross-Cutting

| ID | Test | Expected |
|----|------|----------|
| G1 | Zero console errors across all 6 tabs | Only pre-existing Tailwind-CDN + GoTrueClient warnings allowed |
| G2 | All timestamps show HH:MM (not just date) | Check: lead detail created/updated, timeline, tables |
| G3 | Advanced filters persist across tab switches | Set filters on Tier 2, switch tabs, come back — filters still active |
| G4 | Activity Log tab shows CRM actions | Recent creates/updates/status changes visible |
| G5 | All files ≤ 350 lines | Run `wc -l` on all CRM JS files |
| G6 | Dashboard KPIs render (even with minimal data) | No errors, shows counts |

---

## 4. Registration URL Fix — Investigation & Recommendation

This is NOT a fix SPEC — the executor investigates and reports options.

**Current state:** `crm-automation-engine.js` line 151 builds:
```
https://app.opticalis.co.il/modules/crm/public/event-register.html?event_id=X&lead_id=Y
```

**Problem:** This path exists only on `develop`, not `main`. GitHub Pages
serves from `main`. Even after merge, the URL exposes raw UUIDs.

**What the executor should investigate and report:**

1. **Token approach (preferred):** Reuse the P10 HMAC pattern from
   `unsubscribe/index.ts` — encode `{event_id, lead_id}` into a short
   signed token. The `event-register` EF would accept `?t=<token>` and
   decode it. Report: how many lines would change, which files.

2. **URL path options:** The form is currently at
   `modules/crm/public/event-register.html`. After merge to main it would
   be accessible at `app.opticalis.co.il/modules/crm/public/event-register.html`.
   Report: is this acceptable as a permanent URL, or should a shorter
   redirect be created?

3. **Storefront integration:** Eventually the form should live at
   `prizma-optic.co.il/event-register`. Report: what would that require
   (new Astro page in the storefront repo, or just a redirect)?

4. **`registration_form_url` override:** The `crm_events` table already has
   this column. Report: can event managers set a custom URL per event to
   bypass the default?

**Deliverable:** A section in the recommendations report with the investigation
results and a recommended approach.

---

## 5. Recommendations Scope — Self-Service Event Management

Beyond finding bugs, the executor should think about what an event manager
(Shir, who manages Prizma's events) needs to do her job independently.
Consider and report on:

1. **Can she create an event and open registration without help?**
   What's missing or confusing in the UI flow?

2. **Can she send invitations to the right audience?**
   Is the broadcast filtering intuitive? Are the board/status options clear?

3. **Can she monitor registrations as they come in?**
   Does the event detail show real-time registration count? Is the attendee
   list accessible and clear?

4. **Can she manage event day independently?**
   Check-in, coupon distribution, purchase recording — any gaps?

5. **Can she send follow-up messages after the event?**
   Post-event broadcast to attendees (thank you, no-show follow-up, etc.)

6. **Are automated messages working correctly?**
   Do the right messages go to the right people at the right time?

7. **Template management — can she edit message content?**
   Is the template editor usable? Can she see what variables are available?

8. **Reporting — can she see event ROI?**
   Coupon funnel, attendance rate, purchase conversion — is the data visible?

9. **What critical flows are currently IMPOSSIBLE without developer help?**
   List anything that requires SQL, Edge Function deployment, or code changes.

10. **Scheduled reminders — are they working?**
    The templates exist (`event_2_3d_before`, `event_day`) but no scheduler
    fires them. How critical is this for go-live?

---

## 6. Autonomy Envelope

**MAXIMUM AUTONOMY** — this is a read-only audit + test SPEC.

The executor may:
- Run any SELECT query on demo tenant
- Call any Edge Function with test data (demo tenant only)
- Create and delete test leads (ONLY phones `+972537889878` / `+972503348349`)
- Create and delete test events on demo
- Send test messages (only to approved phones/email)
- Browse all CRM pages on `localhost:3000/crm.html?t=demo`
- Read any file in the repo

The executor may NOT:
- Modify any source code file
- Run any DDL (CREATE, ALTER, DROP)
- Touch Prizma tenant data
- Deploy Edge Functions
- Modify Make scenarios

---

## 7. Demo Tenant Cleanup Protocol

**Before starting:** Record the current demo baseline:
```sql
SELECT 'leads' as t, count(*) FROM crm_leads WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_deleted = false
UNION ALL SELECT 'events', count(*) FROM crm_events WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'attendees', count(*) FROM crm_event_attendees WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'log', count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'broadcasts', count(*) FROM crm_broadcasts WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'notes', count(*) FROM crm_lead_notes WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

**After finishing:** Restore demo to the recorded baseline. Delete all test
data created during the audit. Report the final counts.

The executor is FREE to create leads, events, attendees, and messages as
needed for testing — the only constraint is using the 2 approved phone numbers
and restoring the baseline at the end.

---

## 8. Deliverables

Two files written to `modules/Module 4 - CRM/final/FINAL_QA_AUDIT/`:

### 8.1 QA_TEST_REPORT.md

Format per test:
```
### [Test ID] — [Test name]
- **Action:** [what was done]
- **Expected:** [what should happen]
- **Actual:** [what happened]
- **Result:** ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
- **Evidence:** [screenshot path, DB query result, curl output, etc.]
- **Notes:** [if FAIL — root cause analysis]
```

Summary section at the end:
- Total tests: X
- Passed: X
- Failed: X
- Partial: X
- Critical failures (blocks merge): [list]
- Non-critical issues (fix recommended): [list]

### 8.2 RECOMMENDATIONS.md

Organized by category:
1. **Critical fixes** (must fix before merge)
2. **Important improvements** (should fix before merge)
3. **Nice-to-have enhancements** (can fix after merge)
4. **Future features** (post-merge roadmap)
5. **Registration URL investigation results** (from §4)
6. **Self-service gaps** (from §5)

Each recommendation includes:
- What's the issue
- Why it matters
- Suggested fix (high-level, not code)
- Estimated effort (tiny/small/medium/large)
- Which files would be affected

---

## 9. Stop-on-Deviation Triggers

1. Any test causes data modification on Prizma tenant — STOP immediately
2. Any Edge Function call returns a 500 error — document and continue
3. Demo tenant has unexpected data state — document and continue
4. Cannot access `localhost:3000` — report and suggest alternative

---

## 10. Expected Duration

~60–90 minutes. This is a thorough audit with ~45 test cases + investigation
+ recommendations writing.

---

## 11. Verification Evidence (Guardian Protocol)

| Claim | Verification |
|-------|-------------|
| Demo tenant UUID | `8d8cfa7e-ef58-49af-9702-a862d459cccb` — used in all prior SPECs |
| Test phones approved | `+972537889878`, `+972503348349` — per memory `feedback_test_phone_numbers` |
| Test email | `danylis92@gmail.com` — per ROADMAP.md header |
| Demo PIN | `12345` — per memory and prior SPECs |
| Registration form path | `modules/crm/public/event-register.html` — verified via `ls` |
| Broken registration URL | `crm-automation-engine.js:151` hardcodes `app.opticalis.co.il` path — verified via grep |
| Edge Functions deployed | `lead-intake`, `send-message` (v3), `event-register`, `unsubscribe` — per SESSION_CONTEXT |
| Make webhook URL | `https://hook.eu2.make.com/n7y5m7x9m9yn4uqo3ielqsobdn8s5nui` — per P3b |

Cross-Reference Check completed 2026-04-23: 0 new names introduced (audit-only SPEC).

---

*End of SPEC — FINAL_QA_AUDIT*
