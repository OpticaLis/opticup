# ACTIVATION PROMPT — M4_WHATSAPP_CHANNEL_INFRA

**Copy-paste this prompt to start the Executor pipeline.**

---

You are the Optic Up Executor (opticup-executor skill). Execute the SPEC at:
`modules/Module 4 - CRM/docs/specs/M4_WHATSAPP_CHANNEL_INFRA/SPEC.md`

Read the full SPEC first. It is the single source of truth for this task.

## Context

This SPEC wires WhatsApp as a first-class M4 channel via Dialog360 (official WABA BSP). Dialog360 account is live: number +972548695258, Coexistence mode, 2000 msgs/24h, template `lead_intake_new` approved. The work:

1. **Schema:** `channel_configs` table (per-tenant, encrypted creds, RLS) + `whatsapp_template_name` column on templates + `meta_message_id` column on log.
2. **send-message EF:** expand channel validation to accept 'whatsapp'; new `dialog360.ts` module for direct HTTP dispatch to Dialog360 REST API (NOT via Make). Template-message format (name + {{N}} positional vars).
3. **dispatch-queue EF:** WhatsApp throttle (1000ms) + daily cap (2000).
4. **whatsapp-inbound EF:** NEW, minimal — opt-out capture ("הסר"/STOP → suppression) + delivery status updates via Dialog360 webhook.
5. **Short links:** WCATp/WCATd (W-prefix pricing catalog).
6. **Config:** Demo allowlist, Dialog360 seed rows, WhatsApp template rows.

## Execution order

Phase A (demo): schema migration + seed data + allowlist + short links
Phase B: EF modifications (send-message, dispatch-queue) + new EF (whatsapp-inbound) + deploy
Phase C (demo verify): send test WhatsApp → Dialog360 200 + delivery; allowlist gate; daily cap; opt-out "הסר"; short link resolve; SMS/email regression
Phase D (prizma): seed config + short link + spot-check
Phase E: EXECUTION_REPORT.md + FINDINGS.md

## Iron Rules in force

- **23:** Dialog360 API key = Supabase secret `DIALOG360_API_KEY`, never in code. Daniel pastes it.
- **33:** Demo-first. All testing on demo before prizma.
- **34:** Runtime-touching — evidence required: Dialog360 API response, crm_message_log query, opt-out suppression query, short-link resolve + click_count, SMS/email regression.
- **14/15:** channel_configs needs tenant_id + RLS.
- **19:** Per-tenant config in table (channel_configs).

## Daniel action required (before Phase C)

Daniel must paste the Dialog360 API key into Supabase Edge Function secrets:
Supabase Dashboard → Edge Functions → Secrets → add `DIALOG360_API_KEY` = (the key from Dialog360 dashboard → Settings → API keys)

## Deliverables

Write to the SPEC folder (`modules/Module 4 - CRM/docs/specs/M4_WHATSAPP_CHANNEL_INFRA/`):
- `EXECUTION_REPORT.md` — step-by-step log with SQL, API responses, DB queries
- `FINDINGS.md` — observations

## Stop-on-deviation triggers

- Dialog360 API returns non-200 on a correctly-formed template request
- `DIALOG360_API_KEY` secret not set (can't test — stop, report, wait for Daniel)
- Any modification to the Make webhook path for SMS/email (zero regression required)
- crm_message_log insert fails (schema incompatibility)
- WhatsApp template `lead_intake_new` not approved in Dialog360 (check before sending)
- Need to DELETE any existing row — stop and escalate
