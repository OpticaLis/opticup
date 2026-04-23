# SPEC — P3C_P4_MESSAGING_PIPELINE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P3C_P4_MESSAGING_PIPELINE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-22
> **Module:** 4 — CRM
> **Phase:** P3c + P4 (unified)
> **Author signature:** Cowork session compassionate-great-ramanujan

---

## 1. Goal

Replace the existing Make message dispatcher (8 modules with Supabase access)
with a clean 3-module send-only pipe, move all messaging logic into a Supabase
Edge Function `send-message`, and wire all CRM trigger points so messages are
sent automatically when business events occur.

---

## 2. Background & Motivation

**Architecture Decision v3 (2026-04-22):** Daniel decided Make should have zero
access to Supabase. The old P3b scenario (ID 9104395) fetches templates and
writes logs via native Supabase modules — this violates the principle that all
business logic must be internal.

**New architecture:** A Supabase Edge Function `send-message` handles everything
(template fetch, variable substitution, log write) and calls Make with a
ready-to-send message. Make has 3 modules: Webhook → Router → SMS | Email.

**Why unified P3c+P4:** The Edge Function IS the trigger wiring — it's the layer
between CRM events and Make. Building them separately would mean testing the
Edge Function twice.

**Depends on:**
- P3b ✅ (webhook URL and CRM helper exist, will be repointed)
- P2a ✅ (lead management — status changes trigger messages)
- P2b ✅ (event management — event status changes trigger messages)
- P3a ✅ (manual lead entry — terms approval flow triggers message)

**Key references:**
- `campaigns/supersale/FLOW.md` — complete trigger map with 13 event statuses and all message content
- `campaigns/supersale/messages/*.html` — 10 HTML email templates
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — architecture v3 decision

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Edge Function deployed | `send-message` active on Supabase | `curl -s https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/send-message -o /dev/null -w '%{http_code}'` → 401 (auth required) |
| 3 | Make scenario rebuilt | 3 modules: Webhook → Router → SMS \| Email | Visual confirmation by Daniel in Make UI |
| 4 | Webhook URL updated | `crm-messaging-config.js` points to new webhook | `grep 'hook.eu2.make.com' modules/crm/crm-messaging-config.js` |
| 5 | Test: template-based SMS | SMS received on test phone +972537889878 | Demo tenant, template `lead_intake_new`, channel `sms` |
| 6 | Test: template-based Email | Email received at danylis92@gmail.com | Demo tenant, template `lead_intake_new`, channel `email` |
| 7 | Test: error path | `crm_message_log` row with `status='failed'` | Template slug that doesn't exist |
| 8 | Test: raw broadcast | SMS sent without template (ad-hoc body) | Edge Function with `body` param instead of `template_slug` |
| 9 | Log rows written | Every send attempt produces `crm_message_log` row | `SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...'` after tests |
| 10 | Old scenario deleted | Scenario 9104395 no longer exists in Make | Daniel confirms deletion |
| 11 | CRM trigger: lead intake | New lead via Edge Function `lead-intake` triggers send-message | curl POST to lead-intake → SMS+Email sent |
| 12 | Variable list doc | Available variables documented in CRM | Visible in Messaging Hub templates sub-tab |
| 13 | Test data cleaned | All test rows removed from `crm_message_log` | `SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...'` → 0 |
| 14 | Docs updated | SESSION_CONTEXT, CHANGELOG, ROADMAP reflect P3c+P4 CLOSED | Files reviewed |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- Run read-only SQL (Level 1)
- Write SQL to `crm_message_log` on demo tenant (Level 2 — approved for test data)
- Create/edit/deploy Edge Functions on Supabase
- Create, edit, move JS files listed in §8
- Commit and push to `develop`
- Update `crm_message_templates` body/subject on demo tenant (Level 2 — approved)
- Delete old test data from demo tenant

### What REQUIRES stopping and reporting
- Any schema change (DDL) — new tables, columns, views, RPCs
- Any modification to Prizma tenant data
- Any merge to `main`
- Make scenario build (Daniel builds manually with Claude guidance)
- Deletion of old Make scenario 9104395 (Daniel does this)
- Any change to `lead-intake` Edge Function behavior (not just adding a send-message call)
- Any step where actual output diverges from §3 expected values

---

## 5. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:
- If Edge Function `send-message` returns non-200 on valid payload → STOP
- If Make webhook returns non-200 on valid payload → STOP
- If SMS/Email not received within 60 seconds of send → STOP (may indicate provider issue)
- If `crm_message_log` row is not created for any send attempt → STOP
- If any existing CRM functionality breaks (tab loading, lead detail, etc.) → STOP

---

## 6. Rollback Plan

- Edge Function: `supabase functions delete send-message` + redeploy old version if needed
- Make: old scenario 9104395 stays until new one is tested. Delete only after all tests pass.
- Code: `git reset --hard {START_COMMIT}` for repo changes
- DB: no schema changes in this SPEC. Only `crm_message_log` rows (deletable).

---

## 7. Out of Scope (explicit)

- **WhatsApp channel** — deferred until Daniel switches from Green API to Meta official API
- **Scheduled reminders** (2-3 days before event, event day) — requires a scheduler, separate SPEC
- **Template content authoring** (P5) — this SPEC wires the pipeline, not the content
- **Broadcast Wizard UI changes** — existing B5 UI is sufficient, just wire to real send
- **Variable chips UI** (clickable buttons in template editor) — future UI enhancement SPEC
- **Prizma tenant data** — all testing on demo only
- **CRM UI redesign** — no visual changes

---

## 8. Expected Final State

### New files
- `supabase/functions/send-message/index.ts` — Edge Function (~150-200 lines)

### Modified files
- `modules/crm/crm-messaging-config.js` — new webhook URL (from new Make scenario)
- `modules/crm/crm-messaging-send.js` — refactored to call Edge Function instead of Make directly
- `supabase/functions/lead-intake/index.ts` — add send-message call after lead insert (new + duplicate)
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P3c+P4 CLOSED
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — P3c+P4 ✅
- `modules/Module 4 - CRM/go-live/make-send-message.md` — updated for new architecture

### Deleted files
- None

### DB state
- No schema changes
- `crm_message_templates` on demo tenant: existing 4 templates, placeholders already in `%name%` format
- `crm_message_log` on demo: clean after test cleanup

### Docs updated (MUST include)
- Module 4 `SESSION_CONTEXT.md` — P3c+P4 CLOSED, architecture v3 documented
- Module 4 `CHANGELOG.md` — P3c+P4 section with commits
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — P3c+P4 ✅
- `modules/Module 4 - CRM/go-live/make-send-message.md` — full rewrite for v3

---

## 9. Commit Plan

Budget: 4-6 commits + 1 retrospective. Buffer: ±1 fix commit (per P3a lesson).

- **Commit 1:** `feat(crm): add send-message Edge Function` — new Edge Function
- **Commit 2:** `refactor(crm): rewire CRM messaging to use Edge Function` — update crm-messaging-send.js + config
- **Commit 3:** `feat(crm): wire lead-intake to send-message on new/duplicate lead` — update lead-intake EF
- **Commit 4:** `docs(crm): update P3c+P4 docs — architecture v3, new Make scenario` — SESSION_CONTEXT, CHANGELOG, ROADMAP, make-send-message.md
- **Commit 5:** `chore(spec): close P3C_P4_MESSAGING_PIPELINE with retrospective`

---

## 10. Dependencies / Preconditions

- P3b CLOSED ✅ (commit dd75d05)
- Architecture v3 decision committed ✅ (commit 0f6fc20)
- Demo tenant has 4 templates in `%name%` format ✅
- Test lead exists: phone 0537889878, email danylis92@gmail.com
- Make org 1405609, team 402680 accessible
- Global SMS connection 13198122 active
- Gmail connection 13196610 active (events@prizma-optic.co.il)
- Daniel available for Make scenario build (3 modules, ~5 minutes)

---

## 11. Lessons Already Incorporated

- FROM `P3A FOREMAN_REVIEW` §6 Proposal 1 → ± files buffer in Expected Final State → APPLIED: §8 lists ±0 new files beyond the Edge Function, modifications are exact
- FROM `P3A FOREMAN_REVIEW` §6 Proposal 2 → Exact array positions for status insertions → N/A (no status insertions in this SPEC)
- FROM `P3A FOREMAN_REVIEW` §7 Proposal 1 → Pre-commit hook rehearsal → NOTED: Edge Function is a single new file, low collision risk
- FROM `P3A FOREMAN_REVIEW` §7 Proposal 2 → UI wiring smoke test → APPLIED: §5 includes "any existing CRM functionality breaks" as stop trigger
- FROM `P3B EXECUTION_REPORT` → API-built Make scenarios have UDT issues → APPLIED: Daniel builds Make manually, not via API
- FROM `P3B FINDINGS` M4-MAKE-01 → Webhook UDT not registerable via API → APPLIED: manual build avoids this entirely
- Cross-Reference Check completed 2026-04-22 against GLOBAL_SCHEMA: 0 collisions. `send-message` Edge Function name checked — no existing function with that name.

---

## 12. Technical Design

### Edge Function `send-message`

**Endpoint:** `POST /functions/v1/send-message`
**Auth:** `verify_jwt: true` — called from CRM (authenticated) or from other Edge Functions (service_role)

**Request payload:**
```json
{
  "tenant_id": "uuid",
  "lead_id": "uuid",
  "event_id": "uuid | null",
  "channel": "sms | email",
  "template_slug": "lead_intake_new | null",
  "body": "raw message body | null",
  "subject": "email subject | null",
  "variables": {
    "name": "...",
    "phone": "+972...",
    "email": "...@...",
    "event_name": "...",
    "event_date": "...",
    "event_location": "...",
    "event_time": "...",
    "coupon_code": "...",
    "registration_url": "...",
    "unsubscribe_url": "..."
  }
}
```

**Logic:**
1. Validate: `tenant_id` + `channel` required. Either `template_slug` or `body` required (not both).
2. If `template_slug`: compose full slug = `{template_slug}_{channel}_{language}` (language defaults to `he`). Query `crm_message_templates` for matching row. If not found → write log with `status='failed'`, return error.
3. If `body`: use as-is (for ad-hoc broadcast).
4. Substitute variables: replace `%name%`, `%phone%`, etc. in body (and subject for email).
5. Determine recipient: `variables.phone` for SMS, `variables.email` for email.
6. Write `crm_message_log` row with `status='pending'`.
7. Call Make webhook with: `{ channel, recipient_phone, recipient_email, subject, body }`.
8. If Make returns 200 → update log to `status='sent'`.
9. If Make returns error → update log to `status='failed'`, write `error_message`.
10. Return result to caller.

### Make Scenario (3 modules)

```
[1] Webhook (Custom)
    Receives: { channel, recipient_phone, recipient_email, subject, body }
    ↓
[2] Router
    ├── Route 1: channel = "sms"
    │     [3a] Global SMS → send to recipient_phone, body = body
    │
    └── Route 2: channel = "email"
          [3b] Gmail → send to recipient_email, subject = subject, body = body (HTML)
```

No error route needed in Make — the Edge Function handles errors before and after the Make call.

### CRM Integration Points (P4 wiring)

**Phase 1 — wired in this SPEC:**
- `lead-intake` Edge Function → after INSERT (new lead) → call `send-message` with `template_slug='lead_intake_new'`, channel `sms` + `email`
- `lead-intake` Edge Function → after duplicate detected → call `send-message` with `template_slug='lead_intake_duplicate'`, channel `sms` + `email`

**Phase 2 — wired in future SPECs (event status triggers):**
- Event status change → bulk send to filtered leads (complex, needs event-specific logic)
- Attendee registration → confirmation message
- Pre-event reminders → scheduled sends

**Broadcast (ad-hoc):**
- `crm-messaging-broadcast.js` already has UI for filtering leads + composing message
- Wire its "send" button to call `send-message` Edge Function with `body` (no template_slug)
- Loop over filtered recipients, one call per recipient

### Available Template Variables

These are the variables that can be used in message templates with `%variable%` syntax:

| Variable | Hebrew Label | Source |
|----------|-------------|--------|
| `%name%` | שם הלקוח | `crm_leads.full_name` |
| `%phone%` | טלפון | `crm_leads.phone` |
| `%email%` | אימייל | `crm_leads.email` |
| `%event_name%` | שם האירוע | `crm_events.name` |
| `%event_date%` | תאריך האירוע | `crm_events.event_date` |
| `%event_time%` | שעות האירוע | `crm_events.start_time` - `crm_events.end_time` |
| `%event_location%` | מיקום האירוע | `crm_events.location_address` |
| `%coupon_code%` | קוד קופון | `crm_events.coupon_code` |
| `%registration_url%` | קישור הרשמה | `crm_events.registration_form_url` |
| `%unsubscribe_url%` | קישור הסרה | Generated per-tenant |

---

## 13. Execution Sequence

### Step 1: Edge Function (Claude builds)
1. Write `send-message` Edge Function
2. Deploy to Supabase
3. Test with curl on demo tenant (all 3 paths: template SMS, template Email, error)

### Step 2: Make Scenario (Daniel builds with Claude guidance)
1. Delete old scenario 9104395
2. Create new scenario: Webhook → Router → SMS | Email
3. Test webhook manually
4. Activate scenario

### Step 3: Wire CRM (Claude builds)
1. Update `crm-messaging-send.js` to call Edge Function instead of Make
2. Update `crm-messaging-config.js` with new webhook URL (if changed)
3. Update `lead-intake` Edge Function to call `send-message`
4. Test end-to-end: form submission → lead created → SMS+Email sent

### Step 4: End-to-end tests on demo
1. Test 1: New lead via `lead-intake` → SMS + Email received
2. Test 2: Duplicate lead → duplicate SMS + Email received
3. Test 3: Template not found → log with status=failed
4. Test 4: Raw broadcast (no template) → SMS sent
5. Clean up test data

### Step 5: Documentation
1. Update SESSION_CONTEXT, CHANGELOG, ROADMAP
2. Update make-send-message.md
3. Write EXECUTION_REPORT + FINDINGS
