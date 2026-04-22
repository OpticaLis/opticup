# SPEC — P3B_MAKE_MESSAGE_DISPATCHER

> **Location:** `modules/Module 4 - CRM/go-live/specs/P3B_MAKE_MESSAGE_DISPATCHER/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-22
> **Module:** 4 — CRM
> **Phase:** P3b (Go-Live)
> **Execution environment:** Claude Code local (Windows desktop)

---

## 1. Goal

Build a generic message-sending pipeline in Make.com so that any CRM action
or Edge Function can fire a single webhook to send an SMS or Email via
template, with automatic logging to `crm_message_log`. Then wire a CRM-side
helper (`CrmMessaging.sendMessage`) so P4 can call it from specific trigger
points. This is Layer 2 of the Go-Live architecture — Make as a dumb message
pipe, zero business logic in Make.

---

## 2. Background & Motivation

The old Make scenarios (20+ in Events Flow folder) are tightly coupled to
Monday.com and contain business logic (duplicate checks, status changes,
board sync). The new architecture moves ALL logic to Supabase/CRM (Layer 1)
and reduces Make to a message sender (Layer 2).

Daniel already built a proof-of-concept: **"Demo 1A-S — Lead Intake
(Supabase)"** (scenario 9101245, Demo folder, inactive). This POC:
- Uses HTTP modules to hit Supabase REST API (not native modules)
- Reads templates from `crm_message_templates` via REST
- Sends SMS via Global SMS, Email via Gmail
- Has `REPLACE_WITH_SERVICE_ROLE_KEY` placeholder in auth headers
- Still has lead-intake business logic in Make (duplicate check, lead INSERT)

P3b replaces the POC's approach with a clean generic pattern: Make receives
`{ template_slug, channel, variables }`, fetches the template, sends, logs.
No business logic in Make.

**Depends on:** P3a (done — `pending_terms` status, manual lead form).
**Feeds into:** P4 (wire CRM trigger points → webhook calls).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean w.r.t. P3b files | `git status` |
| 2 | Make scenario "Optic Up — Send Message" exists | Active in Demo folder | Make API: `scenarios_list` → scenario in folder 499779 |
| 3 | Scenario has a working webhook | Webhook URL responds to POST | `curl -X POST {url} -d '{"test":true}'` → 202 Accepted |
| 4 | SMS send works on demo | Test SMS sent via Global SMS | Global SMS sends to test phone 0537889878 |
| 5 | Email send works on demo | Test email sent via Gmail | Gmail sends to danylis92@gmail.com |
| 6 | Template fetched from DB | `lead_intake_new_sms_he` body used | SMS content matches DB template body with variable substitution |
| 7 | Message logged to `crm_message_log` | Row inserted after send | `SELECT * FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...' ORDER BY created_at DESC LIMIT 2` → 2 rows (SMS + Email) |
| 8 | CRM helper exists | `CrmMessaging.sendMessage()` callable | `grep 'sendMessage' modules/crm/crm-messaging-send.js` → found |
| 9 | Webhook URL NOT hardcoded | URL in config object | `grep -n 'MAKE_WEBHOOK' modules/crm/crm-messaging-config.js` → config object |
| 10 | Error path works | Bad template_slug → error logged | POST with slug `nonexistent_template` → crm_message_log row with status=`failed` |
| 11 | File sizes ≤ 350 lines | All new/modified JS files | `wc -l` |
| 12 | Docs updated | SESSION_CONTEXT, CHANGELOG, MODULE_MAP, MASTER_ROADMAP | File inspection |
| 13 | Test data cleaned | Test log rows removed | `SELECT COUNT(*) FROM crm_message_log WHERE content LIKE '%P3b Test%'` → 0 |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Use Make MCP tools: `scenarios_create`, `scenarios_update`, `hooks_create`, `hooks_get`, `scenarios_get`, `scenarios_list`, `scenarios_activate`
- Create a new scenario in Demo folder (499779) on team 402680
- Create a new webhook (type `gateway-webhook`) on team 402680
- Reference existing connections by ID: Global SMS (13198122), Gmail (13196610)
- Create new JS files under `modules/crm/` (config + helper)
- Modify `crm.html` to add script tags for new files
- Run SQL queries on demo tenant for testing (Level 1 — read)
- INSERT test rows into `crm_message_log` on demo tenant (Level 2 — approved)
- DELETE test rows from `crm_message_log` on demo tenant (Level 2 — approved)
- Commit and push to `develop`
- Update MODULE_MAP, SESSION_CONTEXT, CHANGELOG, MASTER_ROADMAP

### What REQUIRES stopping and reporting

- Any schema change (DDL) — new columns, tables, etc.
- Any modification to existing Make scenarios (the old ones in Events Flow)
- Any modification to `js/shared.js`
- Any modification to existing RPCs
- Any write to Prizma tenant data
- Any merge to `main`
- Any step where actual output diverges from §3 expected values
- If the Make API returns an error creating/activating a scenario
- If `crm_message_templates` returns 0 rows for `lead_intake_new_sms_he` on demo
- Any new file exceeding 350 lines

### Supabase service_role key protocol

The scenario blueprint uses HTTP modules that need the service_role key in
the `Authorization` header. **The executor MUST NOT embed the actual key.**
Use the placeholder `REPLACE_WITH_SERVICE_ROLE_KEY` in all HTTP module
headers, same as Demo 1A-S. After the SPEC closes, Daniel will manually
replace the placeholder in Make's UI. This is a deliberate security measure.

**For testing:** Since the placeholder key won't authenticate, tests that
require actual SMS/Email sends need Daniel to temporarily set the real key.
The executor should:
1. Build the scenario with placeholder keys
2. STOP and ask Daniel to set the real key in Make UI
3. After Daniel confirms → run the send tests
4. After tests pass → Daniel can leave the key or reset to placeholder

---

## 5. Stop-on-Deviation Triggers

- If `scenarios_create` returns an error → STOP (Make API issue)
- If `hooks_create` returns an error → STOP
- If the webhook URL format doesn't match `https://hook.eu2.make.com/{udid}` → STOP
- If the scenario activates but doesn't process a test webhook within 30s → STOP
- If SMS send fails with a Global SMS error → STOP
- If Gmail send fails → STOP
- If `crm_message_log` INSERT fails (RLS/permission issue) → STOP

---

## 6. Rollback Plan

- **Code:** `git reset --hard {START_COMMIT}`
- **Make:** Deactivate + delete the new scenario via `scenarios_deactivate` + `scenarios_delete`. Delete the webhook via `hooks_delete`.
- **DB:** `DELETE FROM crm_message_log WHERE content LIKE '%P3b Test%' AND tenant_id = '8d8cfa7e-...'`
- SPEC marked REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit)

- **Wiring CRM trigger points** — P4 (lead intake → webhook, event open → webhook, etc.)
- **WhatsApp channel** — GREEN-API has a different pattern (incoming webhook, not outbound). Future SPEC.
- **Bulk send** — will be a separate scenario or loop in P4. P3b builds the single-message pipe.
- **New message templates** — P5.
- **Old Make scenarios** — untouched. They stay active for Prizma production until P7.
- **Modifying Demo 1A-S** — left as-is for reference. The new scenario replaces its role.
- **Native Supabase modules in Make** — Daniel's POC uses HTTP modules. We follow the proven pattern.

---

## 8. Expected Final State

### New files
- `modules/crm/crm-messaging-config.js` (~20 lines) — webhook URL config object
- `modules/crm/crm-messaging-send.js` (~80 lines) — `CrmMessaging.sendMessage()` helper

### Modified files
- `crm.html` — 2 new `<script>` tags for the config + send files
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`
- `modules/Module 4 - CRM/docs/CHANGELOG.md`
- `modules/Module 4 - CRM/docs/MODULE_MAP.md`
- `MASTER_ROADMAP.md` §3 — update to "P3b CLOSED"

### Make state
- 1 new scenario in Demo folder: "Optic Up — Send Message" (active after testing)
- 1 new webhook for the scenario
- Demo 1A-S left untouched (inactive, reference only)

### DB state (demo tenant)
- 0 test rows in `crm_message_log` (cleaned up after testing)

### ± buffer
1–2 additional files may be modified for wiring fixes (per P3a Foreman lesson).

---

## 9. Commit Plan

- **Commit 0:** Backlog commits from Cowork (see ACTIVATION_PROMPT §Phase 1)
- **Commit 1:** `feat(crm): add Make message dispatcher scenario and webhook` — document scenario ID, webhook URL, blueprint summary in a `go-live/make-send-message.md` reference file
- **Commit 2:** `feat(crm): add CRM messaging helper for webhook dispatch` — crm-messaging-config.js + crm-messaging-send.js + crm.html script tags
- **Commit 3:** `docs(crm): update P3b session context, changelog, module map, master roadmap`
- **Commit 4:** `chore(spec): close P3B_MAKE_MESSAGE_DISPATCHER with retrospective`

**Budget note:** Feature SPECs consistently produce 1–2 unplanned fix commits. This is expected.

---

## 10. Dependencies / Preconditions

- P3a completed ✅
  Verify: `git log --oneline -5` → P3a commits visible
- Make team 402680 accessible ✅
  Verify: `scenarios_list(teamId=402680)` returns results
- Demo folder 499779 exists ✅
  Verify: `folders_list(teamId=402680)` → Demo folder present
- Global SMS connection 13198122 active ✅
  Verify: `connections_list(teamId=402680)` → Global SMS present
- Gmail connection 13196610 active ✅
  Verify: `connections_list(teamId=402680)` → Gmail present
- `crm_message_templates` has demo templates ✅
  Verify: `SELECT COUNT(*) FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-...' AND is_active = true` → 4
- `crm_message_log` table exists ✅
  Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'crm_message_log'` → 12 columns
- Demo 1A-S scenario exists as reference ✅
  Verify: `scenarios_get(scenarioId=9101245)` → blueprint available as pattern reference

---

## 11. Lessons Already Incorporated

- FROM `P3A FOREMAN_REVIEW` §6 Proposal 1 → ± files buffer in expected final state → APPLIED: §8 has buffer note
- FROM `P3A FOREMAN_REVIEW` §6 Proposal 2 → Exact array positions → N/A (no array insertions in P3b)
- FROM `P2B FOREMAN_REVIEW` §6 Proposal 2 → Budget fix commits → APPLIED: §9 has budget note
- FROM `P2A FOREMAN_REVIEW` §6 Proposal 1 → Verify queries on all preconditions → APPLIED: §10 has Verify on every line
- FROM `P3A EXECUTION_REPORT` §9 Proposal 1 → Pre-commit hook rehearsal → NOTED: P3b has few repo files, low risk of hook collisions
- FROM `P3A EXECUTION_REPORT` §9 Proposal 2 → UI wiring smoke test → N/A (P3b adds no DOM event listeners to existing tabs)

---

## 12. Technical Design

### 12.1 Make Scenario Blueprint — "Optic Up — Send Message"

**Logical flow:**

```
[Webhook] → [Set Variables] → [Fetch Template from Supabase] → [Router]
                                                                  ├─ SMS path → [Substitute vars] → [Global SMS Send] → [Log to DB]
                                                                  └─ Email path → [Substitute vars] → [Gmail Send] → [Log to DB]
                                                                  
                                                          [Error Handler] → [Log error to DB]
```

**Webhook payload schema:**

```json
{
  "tenant_id": "8d8cfa7e-ef58-49af-9702-a862d459cccb",
  "lead_id": "uuid-of-lead",
  "template_slug": "lead_intake_new",
  "channel": "sms",
  "variables": {
    "name": "ישראל ישראלי",
    "phone": "+972537889878",
    "email": "test@example.com",
    "event_name": "",
    "event_date": "",
    "event_location": ""
  },
  "event_id": null
}
```

**Channel determines route:**
- `"sms"` → Global SMS path
- `"email"` → Gmail path

**Template fetch (HTTP module):**
```
GET https://tsxrrxzmdxaenlvocyit.supabase.co/rest/v1/crm_message_templates
  ?slug=eq.{template_slug}_{channel}_{language}
  &tenant_id=eq.{tenant_id}
  &is_active=eq.true
  &select=id,body,subject
Headers:
  apikey: {SUPABASE_ANON_KEY}
  Authorization: Bearer {REPLACE_WITH_SERVICE_ROLE_KEY}
```

**Template slug convention:** The webhook sends the BASE slug (e.g.,
`lead_intake_new`). The scenario appends `_{channel}_{language}` to form
the full slug (e.g., `lead_intake_new_sms_he`). Language defaults to `he`
if not provided in the payload.

**Variable substitution:** Use Make's `replace()` function to substitute
`{{name}}`, `{{phone}}`, `{{email}}`, etc. in the template body. Same
pattern as Demo 1A-S.

**SMS send (Global SMS module):**
```
Connection: 13198122 (My Global SMS connection)
Destinations: ["+{variables.phone}"]
Originator: "PrizmaOptic"
Message: {substituted template body}
```

**Email send (Gmail module):**
```
Connection: 13196610 (My Gmail connection / events@prizma-optic.co.il)
To: [{variables.email}]
Subject: {substituted template subject}
Body (HTML): {substituted template body}
```

**Log to DB (HTTP POST to Supabase REST):**
```
POST https://tsxrrxzmdxaenlvocyit.supabase.co/rest/v1/crm_message_log
Headers:
  apikey: {SUPABASE_ANON_KEY}
  Authorization: Bearer {REPLACE_WITH_SERVICE_ROLE_KEY}
  Content-Type: application/json
  Prefer: return=representation
Body:
{
  "tenant_id": "{webhook.tenant_id}",
  "lead_id": "{webhook.lead_id}",
  "event_id": "{webhook.event_id}",
  "template_id": "{fetched_template.id}",
  "channel": "{webhook.channel}",
  "content": "{substituted body (first 500 chars)}",
  "status": "sent",
  "external_id": "{sms_response_id or null}"
}
```

**Error handler:** On any module error, POST to `crm_message_log` with
`status: 'failed'` and `error_message: {error description}`. This ensures
every attempted send is logged regardless of outcome.

### 12.2 Blueprint Reference

Use Demo 1A-S (scenario 9101245) as the structural reference for:
- HTTP module configuration (headers, Supabase REST patterns)
- `util:SetVariable2` for intermediate values
- `gateway:CustomWebHook` for webhook trigger
- `global-sms:sendSmsToRecipients` for SMS
- `google-email:sendAnEmail` for Gmail
- `builtin:BasicRouter` for channel routing

The Supabase anon key (public, already exposed in client code) must NOT be inlined in this SPEC (Rule 23 applies even to public tokens). Retrieve it from `shared.js` / `index.html` where the Supabase client is initialized, or from Supabase Dashboard → Settings → API.

### 12.3 CRM-Side Config (`crm-messaging-config.js`)

```js
(function () {
  'use strict';
  window.CrmMessagingConfig = {
    MAKE_SEND_WEBHOOK: '' // Set after scenario creation — webhook URL
  };
})();
```

The executor fills in the actual webhook URL after creating the scenario.
This file is small and dedicated — easy to find and update.

### 12.4 CRM-Side Helper (`crm-messaging-send.js`)

```js
(function () {
  'use strict';

  /**
   * Send a message via Make webhook.
   * @param {Object} opts
   * @param {string} opts.leadId — UUID of the lead
   * @param {string} opts.templateSlug — base slug (e.g., 'lead_intake_new')
   * @param {string} opts.channel — 'sms' or 'email'
   * @param {Object} opts.variables — { name, phone, email, event_name, ... }
   * @param {string} [opts.eventId] — optional event UUID
   * @param {string} [opts.language] — defaults to 'he'
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async function sendMessage(opts) {
    var webhookUrl = (window.CrmMessagingConfig || {}).MAKE_SEND_WEBHOOK;
    if (!webhookUrl) {
      console.error('CrmMessaging: webhook URL not configured');
      return { ok: false, error: 'webhook_not_configured' };
    }
    var tenantId = (typeof getTenantId === 'function') ? getTenantId() : null;
    if (!tenantId) return { ok: false, error: 'no_tenant' };

    var payload = {
      tenant_id: tenantId,
      lead_id: opts.leadId,
      template_slug: opts.templateSlug,
      channel: opts.channel || 'sms',
      variables: opts.variables || {},
      event_id: opts.eventId || null,
      language: opts.language || 'he'
    };

    try {
      var res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('webhook returned ' + res.status);
      return { ok: true };
    } catch (e) {
      console.error('CrmMessaging.sendMessage failed:', e);
      return { ok: false, error: e.message || String(e) };
    }
  }

  window.CrmMessaging = window.CrmMessaging || {};
  window.CrmMessaging.sendMessage = sendMessage;
})();
```

### 12.5 Shared API Dependencies

| Utility | Method to call | Verified? | Source |
|---------|---------------|-----------|--------|
| Make MCP — create scenario | `scenarios_create({teamId, blueprint, scheduling, folderId})` | ✅ (tool schema loaded) | Make MCP |
| Make MCP — create webhook | `hooks_create({teamId, name, typeName: 'gateway-webhook'})` | ✅ (tool schema loaded) | Make MCP |
| Make MCP — activate | `scenarios_activate({scenarioId})` | ✅ (tool loaded) | Make MCP |
| Global SMS connection | ID 13198122 | ✅ (connections_list verified) | Make |
| Gmail connection | ID 13196610, events@prizma-optic.co.il | ✅ (connections_list verified) | Make |
| getTenantId() | Returns current tenant UUID | ✅ | js/shared.js |
| fetch() | Browser native | ✅ | Browser API |

---

## 13. Test Protocol

All tests on demo tenant. **Tests 4–6 require Daniel to set the real
service_role key in Make first.**

### Pre-test: Verify Make scenario created
1. `scenarios_list(teamId=402680)` → new scenario appears in Demo folder
2. `hooks_get(hookId={new_hook_id})` → webhook URL matches `https://hook.eu2.make.com/...`
3. Scenario is active

### Test 1: Webhook accepts POST (no auth needed)
- `curl -X POST {webhook_url} -H 'Content-Type: application/json' -d '{"test":true}'` → 200/202
- This verifies the webhook is reachable. Make will accept the data even if processing fails.

### Test 2: CRM helper function exists
- Open CRM in browser, console: `typeof CrmMessaging.sendMessage` → `'function'`
- `typeof CrmMessagingConfig.MAKE_SEND_WEBHOOK` → `'string'` (non-empty)

### Test 3: CRM helper fires webhook (dry run)
- Console: `CrmMessaging.sendMessage({ leadId: 'test', templateSlug: 'lead_intake_new', channel: 'sms', variables: { name: 'P3b Test' } })`
- Expected: `{ ok: true }` returned
- Check Make execution log: scenario received the webhook data

### ⚠️ STOP — Ask Daniel to set service_role key in Make

### Test 4: SMS send (live)
- Fire webhook with:
  ```json
  {
    "tenant_id": "8d8cfa7e-ef58-49af-9702-a862d459cccb",
    "lead_id": "00000000-0000-0000-0000-000000000000",
    "template_slug": "lead_intake_new",
    "channel": "sms",
    "variables": { "name": "P3b Test Lead" },
    "language": "he"
  }
  ```
- Expected: SMS sent to the phone number in the template (or test phone)
- DB verify: `SELECT channel, status FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...' ORDER BY created_at DESC LIMIT 1` → channel=`sms`, status=`sent`

### Test 5: Email send (live)
- Fire webhook with `channel: "email"`, same template slug but email channel
- Expected: Email sent to danylis92@gmail.com
- DB verify: → channel=`email`, status=`sent`

### Test 6: Error path
- Fire webhook with `template_slug: "nonexistent_template_xyz"`
- Expected: crm_message_log row with status=`failed`, error_message populated

### Test 7: Cleanup
```sql
DELETE FROM crm_message_log
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND content LIKE '%P3b Test%';
```
Verify: 0 test rows remain.
