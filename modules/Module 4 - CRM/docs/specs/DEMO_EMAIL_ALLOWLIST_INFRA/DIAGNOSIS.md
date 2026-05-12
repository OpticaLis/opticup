# DIAGNOSIS — DEMO_EMAIL_ALLOWLIST_INFRA

> **Date:** 2026-05-11
> **Phase:** Pre-execution diagnostic (read-only) — written pre-SPEC per `DEMO_WHITELIST_UPDATE/FOREMAN_REVIEW.md` Author Proposal #2
> **Author:** Full-Auto Pipeline (opticup-strategic / opticup-executor merged in single chat)

---

## 1. Goal of this diagnosis

Per Brief §5 Pre-Flight Diagnostic, identify:

1. The Edge Function (or RPC) that emits email today.
2. How the existing SMS allowlist is enforced — the codepath to mirror.
3. Where dropped-recipient logging goes.
4. Current `ui_config` shape for demo and Prizma (read-only).

---

## 2. Method

- Supabase MCP `execute_sql` for read-only `tenants.ui_config` snapshots (both tenants).
- Repo `Read` against `supabase/functions/send-message/index.ts` (local, 331 lines), `dispatch.ts` (128 lines), `lead-variables.ts`, `event-variables.ts`, `url-builders.ts`, `_shared/tenant-config.ts`.
- Supabase MCP `get_edge_function` to confirm live `send-message` is v21 and matches repo content.

No writes. No DDL. No code changes. No outbound traffic.

---

## 3. Findings

### Q1 — Which EF emits email today?

**Answer:** `supabase/functions/send-message/index.ts` (live v21) — single dispatch EF for BOTH SMS and email channels (router-style based on `channel` payload key).

Flow:
- POST {tenant_id, lead_id, channel, template_slug|body, variables} arrives at index.ts.
- Validate → suppression gate (unsubscribed) → inject lead/event/auto-URL variables → resolve template → universal placeholder scan.
- At line 300-308: determine `recipientPhone` vs `recipientEmail` from `variables`.
- At line 311-318: **SMS allowlist gate** — `if (channel === "sms" && !(await phoneAllowed(db, tenantId, recipientPhone)))` → reject + log row + return 200 `{ok:false, error:"phone_not_allowed"}`.
- At line 321: `writeDispatchAndSend()` (from `dispatch.ts`) — writes pending log, POSTs to Make webhook, marks sent/failed.

`dispatch.ts` is channel-agnostic — it just forwards the payload to Make. Make is a 3-module pipe (Webhook → Router → SMS|Email vendor); business logic lives in the EF.

**Implication for email:** there is no EF-level allowlist on the email path today. Once the body+subject substitution + universal placeholder scan pass, the email is dispatched to Make. The Brief's mitigation = add a mirror gate after the SMS gate, before `writeDispatchAndSend`.

### Q2 — SMS allowlist enforcement pattern

**Where:** `supabase/functions/send-message/index.ts` v21 lines 32-60 (helper) + lines 311-318 (gate).

**Contract:**
```
// C001 (2026-05-03) — phone allowlist moved from hardcoded ALLOWED_PHONES to
// tenants.test_mode_sms_allowlist (JSONB array of E.164 strings, NULL = production).
// Fail-closed on lookup error or malformed JSON — never accidentally blast strangers.
function normalizePhone(p: string): string { ... }    // E.164 ↔ 0XXXX normalization
async function phoneAllowed(db: any, tenantId: string, phone: string | null): Promise<boolean> {
  if (!phone) return true;
  const { data: tenant, error } = await db
    .from("tenants").select("test_mode_sms_allowlist").eq("id", tenantId).maybeSingle();
  if (error) {
    console.warn("phoneAllowed: tenant lookup failed; failing CLOSED for safety", error);
    return false;  // fail-closed
  }
  const allowlist = tenant?.test_mode_sms_allowlist;
  if (allowlist == null) return true;       // production mode
  if (!Array.isArray(allowlist)) {
    console.warn("phoneAllowed: malformed allowlist on tenant", tenantId);
    return false;  // fail-closed on malformed
  }
  const n = normalizePhone(phone);
  return allowlist.some((a: unknown) =>
    typeof a === "string" && normalizePhone(a) === n);
}
```

**Mirror for email:** identical shape, swap source column from `test_mode_sms_allowlist` (top-level jsonb column) to `ui_config -> 'test_mode_email_allowlist'` (jsonb path), and swap `normalizePhone` for `normalizeEmail` (lowercase + trim — the standard equivalence for email addresses).

### Q3 — Dropped-recipient logging destination

**Answer:** `crm_message_log` table, status='rejected'.

From index.ts v21 line 311-318:
```ts
if (channel === "sms" && !(await phoneAllowed(db, tenantId, recipientPhone))) {
  await db.from("crm_message_log").insert({
    tenant_id: tenantId, lead_id: leadId, event_id: eventId, run_id: runId,
    template_id: templateId, channel, content: finalBody,
    status: "rejected", error_message: "phone_not_allowed: " + recipientPhone,
  });
  return jsonResponse({ ok: false, error: "phone_not_allowed" }, 200);
}
```

**Mirror for email:** same insert pattern, with `error_message: "email_not_allowed: " + recipientEmail` and HTTP 200 `{ok:false, error:"email_not_allowed"}`.

Parity confirmed: SMS rejections do NOT throw or 5xx — they return 200 with `ok:false` so the upstream caller (lead-intake, dispatch-queue, Make scenario) sees the rejection as a graceful drop, not an EF error.

### Q4 — Current `ui_config` shape, both tenants

Captured at 2026-05-11 (pre-execution snapshot via Supabase MCP):

#### Demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)

`updated_at`: **`2026-03-29 08:33:43.906+00`** (this is `BASE_DEMO_UPDATED_AT`)

Existing `ui_config` keys (18):
- `brand` (object: gold, gold_hover, gold_light)
- `phone_catalog` (`"050-000-0000"`)
- `phone_general` (`"050-000-0000"`)
- `cookie_consent` (object: enabled, version, categories, policy_url, tracker_categories)
- `storefront_url` (`"https://opticup-storefront-demo.vercel.app"`)
- `--color-primary` (`"#059669"`)
- `default_waze_url` (`"https://waze.com/ul/hsv8s5h2c3"`)
- `whatsapp_phone_e164` (`"972500000000"`)
- `--color-primary-dark` (`"#065f46"`)
- `--color-primary-hover` (`"#047857"`)
- `--color-primary-light` (`"#d1fae5"`)
- `support_phone_display` (`"050-000-0000"`)

Already verified: `ui_config ? 'test_mode_email_allowlist'` returns `false`. Key is absent. UPDATE via `jsonb_set` will add it as the 13th top-level key without touching the others.

#### Prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`)

`updated_at`: **`2026-03-19 09:54:27.256+00`** (this is `BASE_PRIZMA_UPDATED_AT` — regression check baseline)

Existing `ui_config` keys (12 — same shape as demo, different values):
- `brand` (object: gold=`"#c9a555"`, gold_hover, gold_light)
- `phone_catalog` (`"053-364-5404"`)
- `phone_general` (`"053-364-5404"`)
- `cookie_consent` (object)
- `storefront_url` (`"https://prizma-optic.co.il"`)
- `--color-primary` (`"#4f46e5"`)
- `default_waze_url` (same as demo)
- `whatsapp_phone_e164` (`"972533645404"`)
- `--color-primary-dark` (`"#3730a3"`)
- `--color-primary-hover` (`"#4338ca"`)
- `--color-primary-light` (`"#eef2ff"`)
- `support_phone_display` (`"053-3645404"`)

Already verified: `ui_config ? 'test_mode_email_allowlist'` returns `false`. **Key is absent. SPEC §6 forbids this row from being touched.** Post-SPEC verification: this key MUST still be absent and `updated_at` MUST still equal `BASE_PRIZMA_UPDATED_AT`.

---

## 4. Live EF state

```
EF slug: send-message
EF id:   386cdaaa-c8cd-4bd0-9591-777ed2010e4a
Version: 21  (BASE_EF_VERSION)
Status:  ACTIVE
verify_jwt: true
Files in v21: 
  - functions/send-message/index.ts (331 lines, CRLF)
  - functions/send-message/event-variables.ts
  - functions/send-message/url-builders.ts
  - functions/send-message/lead-variables.ts
  - functions/send-message/dispatch.ts
  - functions/send-message/deno.json
  - functions/_shared/tenant-config.ts
```

Repo content matches the live v21 content (modulo CRLF). Post-SPEC redeploy adds a 7th file: `allowlists.ts`. Expected version after redeploy: **22**.

---

## 5. Architecture decision (recorded from Architect on 2026-05-11)

Chosen path: **Option 2 — jsonb key under existing `ui_config` column.**

Why Option 2 wins:
- No schema change (no DDL; no migration file; CI gate trivially satisfied).
- SaaS-litmus: a future tenant in a different country sets `ui_config.test_mode_email_allowlist` via the existing tenant-config UI just like `default_waze_url` or `whatsapp_phone_e164` — zero code changes.
- Consistent with how `ui_config` is already used for tenant-scoped configuration (cookie_consent categories, brand colors, etc.).
- Mild structural difference from SMS (top-level column) is acceptable: SMS predates `ui_config` (the column is older); future SaaS architecture leans on `ui_config` for all soft config.

Why NOT Option 1 (new column `test_mode_email_allowlist jsonb` on `tenants`):
- DDL adds CI gate friction and a migration file for what is structurally identical to other `ui_config` keys.
- A second column for a configuration value is a maintenance smell.

Why NOT Option 3 (separate `tenant_test_modes` config table):
- Premature normalization. 1 row per tenant; jsonb is the right granularity.

---

## 6. Conclusion

- **Email allowlist mechanism:** does not exist; will be added in this SPEC's run via Option 2 (jsonb in `ui_config`).
- **Mirror pattern source:** `phoneAllowed` in `send-message/index.ts` v21 lines 39-60 + gate at lines 311-318.
- **Logging destination:** `crm_message_log`, status='rejected', error_message='email_not_allowed: <email>'.
- **Forbidden surface:** Prizma's `ui_config` row (DO NOT touch), any DDL (forbidden), outbound test email (forbidden).

`updated_at` for both tenants will be re-checked in `EXECUTION_REPORT.md` after all commits + EF deploy land, to prove (a) demo's row advanced exactly once due to our UPDATE, and (b) Prizma's row did NOT drift.

---

*End of DIAGNOSIS.*
