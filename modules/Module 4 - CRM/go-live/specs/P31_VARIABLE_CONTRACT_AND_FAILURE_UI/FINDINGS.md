# FINDINGS — P31_VARIABLE_CONTRACT_AND_FAILURE_UI

> Findings discovered during P31 execution that are NOT part of the SPEC's scope. Per executor playbook: log, do not fix, surface to Foreman.

---

## Finding P31-001 — `mcp__claude_ai_Supabase__deploy_edge_function` returned `InternalServerErrorException` again (2nd consecutive SPEC)

- **Severity:** MEDIUM (operational — recurring blocker for autonomous EF deploys)
- **First observed:** P29 commit 5 (dispatch-queue EF, 2x failures)
- **Second observed:** P31 commit 3 follow-up (send-message EF, 1x failure — handed off without retry per dispatch directive)

### Evidence

`mcp__claude_ai_Supabase__deploy_edge_function` payload: 6 source files (`index.ts` 282 lines, `dispatch.ts` 129, `lead-variables.ts` 43, `event-variables.ts` ~190, `url-builders.ts` ~98, `deno.json` 6). `verify_jwt: true`. Single attempt response:

```
{"error":{"name":"InternalServerErrorException","message":"Function deploy failed due to an internal error"}}
```

Same exact response shape as P29 (also `InternalServerErrorException`, also generic message). Daniel deployed P29's EF via Supabase CLI manually — same workaround needed here.

### Cross-reference to P29 finding

P29 FINDINGS.md P29-004 surfaced this with a MEDIUM severity + IMPROVEMENT_PROPOSALS.md Proposal 1 ("Add an EF-deploy availability pre-check to executor pre-flight"). The proposal hasn't been implemented yet; P31 hit the same wall. Pattern is now reproducible across two independent SPECs with different EFs (dispatch-queue vs send-message), different payload shapes, different code changes.

### Suggested escalation

This is a recurring tooling reliability issue, not a one-off platform glitch. Foreman-level conversation recommended:
- Drop MCP deploy from the executor playbook entirely (mark as "not autonomous-friendly")?
- Or add the pre-flight test deploy from P29 Proposal 1 so the executor surfaces it before code commits, not after?
- Or escalate to Supabase support (the error message gives no actionable detail; their server logs would have the real cause)?

### Suggested follow-up

Until the underlying cause is understood, every SPEC that touches an Edge Function should pre-bake a "Daniel deploys via CLI after commits" step into the SPEC §8 commit plan, not as a §11 fallback. Setting expectation upfront reduces the "looked autonomous, wasn't" friction.

---

## Finding P31-002 — Template body parser regex needed lowercase tightening; otherwise URL-encoded Hebrew creates phantom required_variables

- **Severity:** LOW (caught + fixed in pre-flight; no impact)

### Evidence

Initial parser regex from SPEC §3.1 #2: `%([a-zA-Z_][a-zA-Z0-9_]*)%` (case-insensitive first char). Catalog query against 30 active Prizma templates surfaced 3 false positives:

```
event_registration_confirmation_email_he   → "D7" (from %D7%94%D7%99%D7%99...)
lead_intake_duplicate_email_he             → "D7"
lead_intake_new_email_he                   → "D7"
```

Root cause: WhatsApp click-to-chat URLs in email bodies use URL-encoding for Hebrew text. Pattern: `wa.me/972533645404?text=%D7%94%D7%99%D7%99%2C` — `%D7%`, `%94%`, `%99%`, `%2C%` etc. The regex's case-insensitive first char makes `D7` (D=alpha, 7=alphanumeric) a valid identifier match.

### Resolution

Daniel-approved tightening to `%([a-z][a-z0-9_]*)%` — lowercase-only first char. Project convention is lowercase snake_case for placeholders (e.g., `%event_name%`, `%payment_url_50%`); URL-encoding hex pairs are uppercase or digit-led, so the tightened regex eliminates all 3 false positives without affecting any real placeholder.

### Suggested follow-up

Add a check or convention assertion to `crm-messaging-templates.js` (the template editor): when a user creates/edits a template, validate that all `%X%` tokens are lowercase. The current editor accepts any case without warning, so a future template author could write `%FullName%` and create the same class of confusion.

---

## Finding P31-003 — `lead_id` placeholder gap in `event_coupon_delivery_email_he` was already breaking QR codes in direct-send paths

- **Severity:** MEDIUM (latent bug fixed by P31; was producing broken QR codes)

### Evidence

`event_coupon_delivery_email_he` body contains:

```html
<img src="https://api.qrserver.com/v1/create-qr-code/?data=%lead_id%&size=300x300" alt="QR Code"/>
```

The QR code generator URL needs `%lead_id%` substituted. In rule-driven dispatches the engine's `buildVariables` injects `vars.lead_id = lead.id || ''` so substitution works. But P30's S10 (`event_coupon_delivery` direct-send via `CrmMessaging.sendMessage`) was called WITHOUT `lead_id` in variables — meaning the QR code img URL in the email Daniel received literally rendered as:

```
https://api.qrserver.com/v1/create-qr-code/?data=%lead_id%&size=300x300
```

→ broken QR code in Daniel's email.

### Resolution

P31's `injectLeadVariables` (commit 2) auto-fills `lead_id` from `crm_leads.id` on every dispatch (Daniel-approved option b). Going forward, even direct-send paths that forget `lead_id` get it auto-injected. The bug class for this template is closed permanently.

### Suggested follow-up

Re-send `event_coupon_delivery_email_he` to Daniel after P31 EF deploy to verify the QR code now renders correctly. Trivial test: the SPEC §10 Phase 2 #11 already covers this if the Phase-2 lead has the failed coupon_delivery row in their history.

---

## Finding P31-004 — All 30 active templates resolve to `required_variables=[]` post-migration; no template needs custom contract entries today

- **Severity:** INFO (positive — broad coverage from auto-fill+inject set)

### Evidence

Post-migration query:

```sql
SELECT count(*) FROM crm_message_templates
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND is_active=true
   AND jsonb_array_length(required_variables) > 0;
-- 0
```

All 30 active Prizma templates have `[]`. Every real placeholder used in any active template body falls within:
- 4 from `crm_leads` auto-fill: `name, phone, email, lead_id`
- 4 from `crm_events` auto-fill: `event_name, event_date, event_time, coupon_code`
- 6 existing auto-injects: `unsubscribe_url, registration_url, event_max_attendees, event_deposit_amount, event_day_of_week, event_location`
- `payment_url_*` wildcard guarded separately by `scanForPaymentUrlMismatch`

### Implication

P31's contract is real but currently has no per-template entries to enforce. The bug-prevention surface is the auto-fill itself + the validation skeleton. Future templates that introduce new `%X%` tokens will need `required_variables` populated explicitly (and the EF will reject dispatches that miss them).

### Suggested follow-up

Document this contract in `docs/CONVENTIONS.md`: "When authoring a new template that uses any placeholder beyond the 14 auto-handled ones, add the new placeholder to the template's `required_variables` array via `crm-messaging-templates.js`. The `send-message` EF will reject dispatches that don't pass the variable."

---

## Finding P31-005 — Strict-mode `arguments.callee` ban surprised the rerender-on-retry pattern; required a named function helper

- **Severity:** LOW (caught at code-review time; resolved cleanly)

### Evidence

First implementation of the retry-success rerender used:

```js
CrmLeadsDetailMessages.wireFailedRetryHandlers(body, lead, data, function () {
  body.innerHTML = renderDetail(...);
  wireTabs(...); wireFooter(...);
  CrmLeadsDetailMessages.wireFailedRetryHandlers(body, lead, data, arguments.callee);
});
```

`arguments.callee` is forbidden in strict mode (which all opticup CRM modules use). Browser would have thrown `TypeError` on retry success.

### Resolution

Refactored to a named helper `renderAndWire(body, lead, data)` at module top-level. Retry callback recurses via the named reference instead of `arguments.callee`. Net code is cleaner anyway — single source of the render-and-wire sequence.

### Suggested follow-up

Add to `docs/CONVENTIONS.md` a "Strict mode patterns" section noting `arguments.callee` is forbidden and recommending named function declarations for self-recursive callback patterns.

---

*5 findings total: 1 MEDIUM (recurring MCP EF-deploy issue), 1 MEDIUM (pre-existing latent bug fixed by P31), 1 LOW (parser regex tightening, fixed in pre-flight), 1 LOW (strict-mode pattern caught at code-review), 1 INFO (post-migration baseline observation).*
