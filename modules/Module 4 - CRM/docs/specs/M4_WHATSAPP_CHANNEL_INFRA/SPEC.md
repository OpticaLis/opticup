# SPEC: M4_WHATSAPP_CHANNEL_INFRA

**Status:** Ready for execution
**Author:** Foreman (opticup-strategic)
**Date:** 2026-05-24
**Module:** Module 4 - CRM
**Dependency:** None blocking. Pairs with M4_SCALE_READINESS SPECs 1-3 but no sequencing dependency.
**Brief:** M4_SCALE_READINESS_MASTER_PLAN.md SPEC 6A + M12_COMMUNICATIONS_BRIEF.md (WhatsApp architecture)

---

## 0. Problem Statement

M4 dispatch is hardcoded to SMS + email. Daniel needs WhatsApp as a first-class campaign channel via Dialog360 (official WABA BSP, already provisioned: number 054-869-5258 "Ready", Coexistence mode, 2000 msgs/24h Regular plan). Three templates already submitted to Meta (one approved, two pending). The ERP needs the infrastructure to dispatch WhatsApp messages through the same queue/template/broadcast pipeline used for SMS and email.

**Dialog360 account state (live 2026-05-24):**
- Number: +972548695258, status "Ready", Coexistence mode
- Plan: Regular (2000 messages / 24h)
- Templates submitted: `lead_intake_new` (APPROVED), `event_registration_open` (PENDING), `event_invite_new` (PENDING)
- Template naming: CRM slug WITHOUT the `_he` suffix (e.g., CRM `event_invite_new_whatsapp_he` maps to Dialog360 template name `event_invite_new`)

---

## 1. Acceptance Criteria

### Schema + config
1. `channel_configs` table exists with tenant_id + RLS, holding Dialog360 credentials (encrypted JSONB) for prizma + demo.
2. `crm_message_templates` accepts `channel='whatsapp'` and has a `whatsapp_template_name` column for the Meta-approved template name.
3. At least one WhatsApp template row exists on each tenant, mapped to the approved Dialog360 template `lead_intake_new`.

### Send path
4. `send-message` EF accepts `channel='whatsapp'` and dispatches via direct HTTP to Dialog360 REST API (`https://waba.360dialog.io/v1/messages`), NOT via Make.
5. The Dialog360 payload uses template-message format (template name + language + positional `{{N}}` parameters), not free-form body.
6. SMS + email dispatch via Make is unchanged (zero regression).
7. WhatsApp test-mode allowlist gates sends on demo (same pattern as SMS/email allowlists).
8. `crm_message_log` records WhatsApp sends with `channel='whatsapp'`, `status='sent'|'failed'`, and `meta_message_id` from Dialog360 response.

### Throttle + queue
9. `dispatch-queue` EF handles `channel='whatsapp'` with configurable throttle (`whatsapp_throttle_ms` default 1000ms) and daily cap (`whatsapp_daily_cap` default 2000, matching Dialog360 Regular plan).
10. When daily cap is reached, remaining WhatsApp queue rows get `status='deferred_cap'` (not failed — retried next day or when cap resets).

### Consent + opt-out
11. WhatsApp marketing sends require the lead to NOT be suppressed (same `crm_check_contact_suppressed` gate as SMS). v1 consent = supersale signup implicitly grants WhatsApp (same gate as SMS, per Daniel directive).
12. Inbound "הסר" / STOP replies captured via a new `whatsapp-inbound` EF (receives Dialog360 webhook), flipping the lead's suppression flag. Full inbox is out of scope (M12 later).

### Short links
13. A `WCATp` short-link code exists (W-prefix, pricing catalog, prizma tenant), resolves and increments `click_count`. Referenced by the approved WhatsApp templates.

### Cross-cutting
14. Dialog360 API key stored as Supabase Edge Function secret (`DIALOG360_API_KEY`), never in code (Iron Rule 23).
15. Demo-first (Iron Rule 33): all changes verified on demo before prizma.
16. Zero new CRM placeholders (Iron Rule 35 N/A — template vars use WhatsApp's `{{1}}` positional format, mapped from existing `%name%` etc. during dispatch).

---

## 2. Verified Live State (2026-05-24)

### send-message EF (line 119)
```typescript
if (!channel || (channel !== "sms" && channel !== "email")) {
  return errorResponse("Invalid channel (must be sms or email)", 400);
}
```

### Make dispatch payload (dispatch.ts lines 98-104)
```typescript
const makePayload = {
  channel: p.channel,
  recipient_phone: p.recipientPhone,
  recipient_email: p.recipientEmail,
  subject: p.finalSubject,
  body: p.finalBody,
};
```
WhatsApp MUST NOT use this path. New direct-HTTP path for WhatsApp dispatches to Dialog360 API.

### Dialog360 REST API contract
- Endpoint: `https://waba.360dialog.io/v1/messages`
- Auth header: `D360-API-KEY: {api_key}`
- Template message payload:
```json
{
  "messaging_product": "whatsapp",
  "to": "972XXXXXXXXX",
  "type": "template",
  "template": {
    "name": "lead_intake_new",
    "language": { "code": "he" },
    "components": [{
      "type": "body",
      "parameters": [
        { "type": "text", "text": "{{1_value}}" }
      ]
    }]
  }
}
```
- Success: HTTP 200, body `{ "messages": [{ "id": "wamid.XXXX" }] }`
- Failure: HTTP 4xx/5xx with error object

### Existing tables to extend
- `crm_message_templates`: currently no `whatsapp_template_name` column, channel values limited to sms/email
- `crm_message_log`: no `meta_message_id` column (needed for Dialog360 message tracking)

---

## 3. Destructive Operations

**This SPEC is ADDITIVE with two surgical ALTER TABLE extensions.** No deletes. No drops. No renames. No main.

| Operation | Type | Reversible? |
|---|---|---|
| CREATE TABLE `channel_configs` | Additive | Yes (DROP TABLE) |
| ALTER TABLE `crm_message_templates` ADD COLUMN `whatsapp_template_name` | Schema extend | Yes (DROP COLUMN) |
| ALTER TABLE `crm_message_log` ADD COLUMN `meta_message_id` | Schema extend | Yes (DROP COLUMN) |
| INSERT config rows (channel_configs, template rows) | Additive data | Yes (DELETE) |
| INSERT short_links row (WCATp) | Additive data | Yes (DELETE) |
| Modify send-message EF (add whatsapp dispatch branch) | Mutative code | Yes (git revert) |
| Modify dispatch-queue EF (add whatsapp throttle) | Mutative code | Yes (git revert) |
| New whatsapp-inbound EF | Additive code | Yes (delete function) |

---

## 4. New Code + Schema Design

### 4a. channel_configs table

```sql
CREATE TABLE public.channel_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  channel text NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
  provider text NOT NULL CHECK (provider IN ('dialog360','global_sms','gmail')),
  sender_identity text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  provider_credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel)
);
ALTER TABLE public.channel_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant isolation" ON public.channel_configs
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims',true)::json->>'tenant_id')::uuid);
GRANT SELECT ON public.channel_configs TO authenticated;
```

Seed rows (demo + prizma):
- Demo: `channel='whatsapp', provider='dialog360', sender_identity='+972548695258', provider_credentials='{"api_key_env":"DIALOG360_API_KEY","phone_number_id":"DEMO_PLACEHOLDER"}'`
- Prizma: same structure, same env-var reference (API key is project-level, not per-tenant, for v1)

Note: `provider_credentials` references an env-var name, not the actual key (Iron Rule 23). The send-message EF reads the env var at runtime.

### 4b. crm_message_templates extensions

```sql
ALTER TABLE crm_message_templates ADD COLUMN IF NOT EXISTS whatsapp_template_name text;
```

Template row example (INSERT for demo + prizma):
```
slug: 'lead_intake_new_whatsapp_he'
channel: 'whatsapp'
language: 'he'
whatsapp_template_name: 'lead_intake_new'
body: (the approved template body text, for display in the CRM template editor)
```

### 4c. crm_message_log extension

```sql
ALTER TABLE crm_message_log ADD COLUMN IF NOT EXISTS meta_message_id text;
```

### 4d. send-message EF changes

In `index.ts` line ~119, expand channel validation:
```typescript
if (!channel || !["sms", "email", "whatsapp"].includes(channel)) {
  return errorResponse("Invalid channel (must be sms, email, or whatsapp)", 400);
}
```

After recipient validation (~line 293), add WhatsApp recipient check:
```typescript
if (channel === "whatsapp" && !recipientPhone) {
  return errorResponse("Missing variables.phone for WhatsApp channel", 400);
}
```

In `dispatch.ts`, branch BEFORE the Make call:
```typescript
if (p.channel === "whatsapp") {
  return await dispatchViaDialog360(db, p, logRow, jsonResponse);
}
// existing Make path for sms/email continues unchanged
```

New function `dispatchViaDialog360`:
- Read `DIALOG360_API_KEY` from env
- Look up `whatsapp_template_name` from the template record
- Map CRM `%name%`-style vars to Dialog360 positional `{{1}}` params
- POST to `https://waba.360dialog.io/v1/messages`
- On 200: extract `messages[0].id` → store as `meta_message_id` on `crm_message_log`, mark `status='sent'`
- On 4xx/5xx: mark `status='failed'`, store error in `error_message`

### 4e. dispatch-queue EF changes

In `index.ts`, after the existing throttle logic:
```typescript
// WhatsApp throttle (similar to SMS 1000ms)
const waThrottleMs = 1000; // configurable in future crm_dispatch_config
const waDailyCap = 2000;   // Dialog360 Regular plan limit
```

Add daily-cap check: before dequeuing WhatsApp rows, count today's sent WhatsApp messages. If >= cap, skip WhatsApp rows (set `status='deferred_cap'`).

### 4f. whatsapp-inbound EF (new, minimal v1)

New Edge Function `whatsapp-inbound/index.ts`:
- Receives Dialog360 webhook POST (inbound messages + status updates)
- v1 scope: ONLY process opt-out messages containing "הסר" or "STOP" (case-insensitive)
- On opt-out: call existing `crm_suppress_contact` RPC to flip the lead's suppression flag
- Log the inbound message to `crm_message_log` with `direction='inbound'`, `channel='whatsapp'`
- Status updates (delivered/read): update `crm_message_log.status` by matching `meta_message_id`
- Full inbox / conversation threading: OUT OF SCOPE (M12 later)

### 4g. WhatsApp allowlist (test mode)

Add `test_mode_whatsapp_allowlist` key to demo tenant's `ui_config` JSONB (same pattern as SMS/email allowlists). send-message EF checks this before dispatching WhatsApp on demo.

### 4h. Short link WCATp

```sql
INSERT INTO short_links (tenant_id, code, target_url, link_type, label, expires_at, click_count)
VALUES ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'WCATp',
  'https://www.prizma-optic.co.il/supersalepricescatalog/',
  'template_static', 'pricing_catalog_whatsapp', '2099-12-31', 0);
```
Collision-check before insert. Demo gets `WCATd`.

---

## 5. Execution Steps

### Phase A — Schema + config (demo first)

**A1.** Write migration: `channel_configs` table + `whatsapp_template_name` column on templates + `meta_message_id` column on log. Apply to DB.

**A2.** Seed `channel_configs` row for demo (whatsapp/dialog360). Seed WhatsApp template rows for demo (`lead_intake_new_whatsapp_he` mapped to Dialog360 template `lead_intake_new`).

**A3.** Add `test_mode_whatsapp_allowlist` to demo tenant's `ui_config`.

**A4.** Insert `WCATd` short link for demo. Collision-check first.

### Phase B — Edge Function changes

**B1.** Modify `send-message/index.ts`: expand channel validation. Add WhatsApp recipient check.

**B2.** Create `send-message/dialog360.ts`: the `dispatchViaDialog360` function. Direct HTTP to Dialog360 API with template-message payload.

**B3.** Modify `send-message/dispatch.ts`: add branch — if channel='whatsapp', call `dispatchViaDialog360` instead of Make.

**B4.** Add `DIALOG360_API_KEY` as Supabase Edge Function secret (Daniel pastes the key from Dialog360 dashboard → Supabase Dashboard → Edge Functions → Secrets).

**B5.** Modify `dispatch-queue/index.ts`: add WhatsApp throttle + daily cap logic.

**B6.** Create `whatsapp-inbound/index.ts`: minimal opt-out capture + status update webhook handler. Register the webhook URL with Dialog360.

**B7.** Deploy all 3 EFs (send-message, dispatch-queue, whatsapp-inbound).

### Phase C — Verify on demo (Iron Rule 34)

**C1.** Send a test WhatsApp message via RPC call to `send-message` EF with `channel='whatsapp'`, template `lead_intake_new_whatsapp_he`, to a number in the allowlist. Verify:
- Dialog360 API returns 200 with `wamid`
- `crm_message_log` row has `channel='whatsapp'`, `status='sent'`, `meta_message_id` populated
- Message delivered to the phone

**C2.** Verify allowlist gate: send to a number NOT in the allowlist → `status='rejected'`.

**C3.** Verify daily cap: (simulate by setting cap to 1, sending 2) → second message gets `status='deferred_cap'`.

**C4.** Reply "הסר" from the test phone → verify suppression flag set on the lead.

**C5.** Curl `WCATd` short link → resolves, click_count increments.

**C6.** Verify SMS/email dispatch still works (zero regression): send a test SMS + email → both succeed via Make.

### Phase D — Prizma

**D1.** Seed `channel_configs` row for prizma. Seed WhatsApp template rows.

**D2.** Insert `WCATp` short link. Collision-check.

**D3.** Spot-check: send one test WhatsApp to Daniel's number → verify delivery.

### Phase E — Deliverables

**E1.** Write EXECUTION_REPORT.md + FINDINGS.md to SPEC folder. Commit all repo changes (migration file, EF source, SPEC deliverables) by explicit filenames on develop.

---

## 6. Verification Evidence Required (Iron Rule 34)

| Evidence | Source |
|---|---|
| Dialog360 API 200 response with wamid | EF log / curl output |
| crm_message_log row: channel=whatsapp, status=sent, meta_message_id populated | DB query |
| Message received on test phone | Screenshot or confirmation |
| Allowlist rejection: status=rejected for non-allowed number | DB query |
| Daily cap: status=deferred_cap when cap exceeded | DB query |
| Opt-out "הסר" reply → suppression set | DB query before/after |
| WCATd/WCATp resolve + click_count increment | curl output + DB query |
| SMS/email regression: both still work via Make | DB query showing sent status |

---

## 7. Rollback Plan

1. Revert EF changes via git (send-message, dispatch-queue). Delete whatsapp-inbound EF.
2. DROP COLUMN `whatsapp_template_name` from crm_message_templates.
3. DROP COLUMN `meta_message_id` from crm_message_log.
4. DROP TABLE `channel_configs`.
5. DELETE WhatsApp template rows + short link rows.

SMS/email path is unchanged throughout — never at risk.

---

## 8. Files Modified

| File | Change |
|---|---|
| `supabase/migrations/YYYYMMDDHHMMSS_m4_whatsapp_channel_infra.sql` | **NEW** — channel_configs + column extensions + seed data |
| `supabase/functions/send-message/index.ts` | Expand channel validation |
| `supabase/functions/send-message/dispatch.ts` | Add WhatsApp branch before Make call |
| `supabase/functions/send-message/dialog360.ts` | **NEW** — Dialog360 HTTP dispatch |
| `supabase/functions/dispatch-queue/index.ts` | WhatsApp throttle + daily cap |
| `supabase/functions/whatsapp-inbound/index.ts` | **NEW** — opt-out + status webhook handler |

---

## 9. Out of Scope (explicitly)

- Full WhatsApp Inbox (M12 — conversations, threading, agent assignment, 3-pane UI)
- Rich media messages (images, documents, buttons beyond template CTA)
- WhatsApp Commerce (product catalogs, carts)
- Green API removal (stays for QR/catalog inbound flows)
- module_channel_routing table (M12 — per-module channel override; v1 uses channel_configs directly)
- customer_consent / consent_log tables (M12 — v1 uses existing suppression as consent gate)
- WhatsApp "no WhatsApp" toggle → SMS fallback (noted as follow-up)
- Template approval status UI in CRM (SPEC 6B or follow-up)

---

## 10. Coordination Notes

- **Daniel action required:** paste Dialog360 API key into Supabase Edge Function secrets (`DIALOG360_API_KEY`) before Phase C testing.
- **Dialog360 webhook URL:** must be registered in Dialog360 dashboard pointing to the whatsapp-inbound EF URL. Daniel or Executor does this during Phase B6.
- **Pending templates:** `event_registration_open` and `event_invite_new` are pending Meta approval. SPEC can land with just `lead_intake_new` (approved). Additional templates wired when approved (data INSERT, no code change).

---

## 11. Self-Improvement Proposals

1. **For SPECs that add a new vendor dispatch path alongside an existing one,** the SPEC MUST include an explicit regression test for the existing path (criterion C6 here — SMS/email still works). This was almost missed; codify it as a mandatory acceptance criterion whenever a dispatch-path SPEC modifies the shared send-message EF.

2. **For SPECs that reference external API contracts (Dialog360 REST API here),** the SPEC §2 MUST include the exact endpoint URL, auth header format, and a sample request/response payload — verified against the vendor's current docs, not recalled from memory. The Dialog360 API contract was included here but should be a standard pattern for any vendor-integration SPEC.
