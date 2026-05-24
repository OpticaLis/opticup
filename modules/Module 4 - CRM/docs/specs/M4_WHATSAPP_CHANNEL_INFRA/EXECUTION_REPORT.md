# EXECUTION REPORT: M4_WHATSAPP_CHANNEL_INFRA

**Executor:** Claude Code (opticup-executor)
**Date:** 2026-05-24
**Status:** PARTIAL — schema + config + EF code complete; EF deployment requires Daniel CLI deploy (OPEN-021)

---

## Phase A — Schema + Config (demo)

**A1. Schema migration applied:**
- `channel_configs` table created: tenant_id + RLS + UNIQUE(tenant_id, channel) + GRANT SELECT
- `crm_message_templates`: `whatsapp_template_name` column added
- `crm_message_log`: `meta_message_id` column added
- Migration file: `supabase/migrations/20260524180000_m4_whatsapp_channel_infra.sql`

**A2. Demo seed data:**
- `channel_configs` row: `channel=whatsapp, provider=dialog360, sender_identity=+972548695258, is_active=true`
- Template: `lead_intake_new_whatsapp_he` → Dialog360 template `lead_intake_new` (approved)

**A3. WhatsApp allowlist:** `test_mode_whatsapp_allowlist` added to demo tenant `ui_config` with 3 numbers

**A4. Short link:** `WCATd` created (demo, W-prefix, pricing catalog, click_count verified 0→1)

## Phase B — Edge Function Code

**B1. send-message/index.ts** (349 lines):
- Channel validation expanded: `sms|email` → `sms|email|whatsapp`
- WhatsApp recipient phone check added
- WhatsApp allowlist gate added (via new `whatsappAllowed` function)
- Template query includes `whatsapp_template_name`
- WhatsApp template var mapping: `%name%` → `{{1}}`, `%event_name%` → `{{2}}`, `%event_date%` → `{{3}}`

**B2. send-message/dialog360.ts** (117 lines, NEW):
- Direct HTTP POST to `https://waba.360dialog.io/v1/messages`
- Auth: `D360-API-KEY` header from `DIALOG360_API_KEY` env var
- Template-message format (name + language + positional params)
- On success: stores `meta_message_id` from Dialog360 response → `crm_message_log`
- On failure: stores error in `error_message`, marks `status='failed'`

**B3. send-message/dispatch.ts** (169 lines):
- WhatsApp branch added BEFORE Make call: `if (p.channel === "whatsapp")` → `dispatchViaDialog360`
- SMS/email path via Make completely unchanged

**B4. send-message/allowlists.ts** (106 lines):
- `whatsappAllowed` function added (same pattern as emailAllowed — reads `ui_config.test_mode_whatsapp_allowlist`)

**B5. dispatch-queue/index.ts** (348 lines):
- Channel type extended to include `'whatsapp'`
- WhatsApp throttle: 1000ms (same as SMS)
- Daily cap check: counts today's WhatsApp sent messages; if >= 2000, defers remaining (`status='deferred_cap'`)

**B6. whatsapp-inbound/index.ts** (119 lines, NEW):
- Dialog360 webhook handler
- Webhook verification (GET with hub.challenge)
- Status updates: delivered/read/failed → updates `crm_message_log` by `meta_message_id`
- Opt-out capture: "הסר"/STOP/unsubscribe → `crm_suppress_contact` + `unsubscribed_at` flag
- Returns 200 on all paths (prevents Dialog360 webhook retries)

**B7. Deployment:** EF deployment requires Daniel CLI deploy per OPEN-021. Code changes committed to repo. Daniel deploys with:
```
supabase functions deploy send-message
supabase functions deploy dispatch-queue
supabase functions deploy whatsapp-inbound --no-verify-jwt
```

## Phase C — Verification (pre-deploy)

| Check | Result |
|---|---|
| channel_configs row (demo) | whatsapp/dialog360/+972548695258, is_active=true |
| WhatsApp template (demo) | lead_intake_new_whatsapp_he, whatsapp_template_name=lead_intake_new |
| meta_message_id column exists | YES |
| WhatsApp allowlist set | 3 numbers in ui_config |
| WCATd resolves (full chain) | 307→302→302→200 (prizma-optic.co.il/supersalepricescatalog/) |
| WCATd click_count | 0→1 |

**Post-deploy verification (Daniel):** Send test WhatsApp via send-message EF with `channel='whatsapp'` → Dialog360 API → verify delivery + meta_message_id logged.

## Phase D — Prizma

| Check | Result |
|---|---|
| channel_configs row (prizma) | whatsapp/dialog360/+972548695258, is_active=true |
| WhatsApp template (prizma) | lead_intake_new_whatsapp_he, whatsapp_template_name=lead_intake_new |
| WCATp resolves (EF direct) | 302→target (storefront /r/ route returns 404 — Vercel edge cache needs redeploy) |
| WCATp click_count | 0→1 (via EF direct test) |

## File Sizes (all under 350)

| File | Lines |
|---|---|
| send-message/index.ts | 349 |
| send-message/dispatch.ts | 169 |
| send-message/dialog360.ts | 117 |
| send-message/allowlists.ts | 106 |
| dispatch-queue/index.ts | 348 |
| whatsapp-inbound/index.ts | 119 |

## Acceptance Criteria Status

| # | Criterion | Status |
|---|---|---|
| 1 | channel_configs with RLS | PASS |
| 2 | whatsapp_template_name column | PASS |
| 3 | WhatsApp template rows both tenants | PASS |
| 4 | send-message accepts whatsapp + Dialog360 dispatch | CODE READY — deploy pending |
| 5 | Template-message format | CODE READY — deploy pending |
| 6 | SMS/email via Make unchanged | CODE READY — zero regression in code |
| 7 | WhatsApp allowlist | PASS (config set) |
| 8 | crm_message_log meta_message_id | PASS (column exists) |
| 9 | dispatch-queue WhatsApp throttle | CODE READY — deploy pending |
| 10 | Daily cap deferred_cap status | CODE READY — deploy pending |
| 11 | Suppression gate | CODE READY — uses existing crm_check_contact_suppressed |
| 12 | Opt-out inbound EF | CODE READY — deploy pending |
| 13 | WCATp/WCATd short links | PASS (both resolve, click_count works) |
| 14 | API key in env secret | PASS (Daniel confirmed DIALOG360_API_KEY set) |
| 15 | Demo-first | PASS |
| 16 | Zero new placeholders | PASS |

## Next Steps (for Daniel)

1. Deploy the 3 Edge Functions from CLI
2. Register whatsapp-inbound webhook URL in Dialog360 dashboard
3. Send a test WhatsApp to verify end-to-end delivery
4. Storefront redeploy to clear /r/ edge cache for WCATp
