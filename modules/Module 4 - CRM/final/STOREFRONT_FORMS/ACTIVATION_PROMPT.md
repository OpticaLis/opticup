# Activation Prompt — STOREFRONT_FORMS (Part A: ERP-side)

> **Paste this into Claude Code on the Windows desktop.**
> **Part B (Storefront pages) has a separate activation prompt — run AFTER Part A.**

---

## Context

You are executing Part A of SPEC `STOREFRONT_FORMS`. Read the full SPEC at:
`modules/Module 4 - CRM/final/STOREFRONT_FORMS/SPEC.md`

**What this SPEC does:** Upgrades 3 Edge Functions so that public-facing
registration and unsubscribe pages can move from the ERP to the storefront.
Then updates the CRM JS to generate the new storefront URLs.

**What you are NOT doing:** building the storefront pages (that's Part B,
separate repo).

## Pre-Flight

1. `git branch` → must be `develop`
2. `git pull origin develop`
3. `git status` → must be clean
4. Read the SPEC: `modules/Module 4 - CRM/final/STOREFRONT_FORMS/SPEC.md`
5. Read the 3 target EFs to understand current state:
   - `supabase/functions/event-register/index.ts`
   - `supabase/functions/unsubscribe/index.ts`
   - `supabase/functions/send-message/index.ts`
6. Read `modules/crm/crm-automation-engine.js` (the `buildVariables` function
   and the `registration_url` generation)

## Execution — 4 Tracks

### Track A — event-register EF: HMAC token support

The EF currently accepts `?e=UUID&l=UUID` (and `tenant_id` via POST body).
Add HMAC token support:

1. Add the same `b64urlDecode` + `verifyHmac` helpers that `unsubscribe` EF
   already has (copy from there — yes, this is the cross-EF duplication noted
   in M4-DEBT-FINAL-01; acceptable for now).
2. GET handler: accept `?token=...` as an alternative to `?e=UUID&l=UUID`.
   Token format: `b64url("${lead_id}:${tenant_id}:${event_id}:${expiry}")`.
   Verify HMAC with `SERVICE_ROLE_KEY`. On valid token, extract IDs and
   proceed as today. On invalid/expired → 400 JSON error.
   **Keep the old UUID params working** — if no `token` param, fall back to
   the existing `?e=&l=&t=` behavior. This is backwards compat.
3. GET response: ensure the response includes ALL pre-fill fields:
   - `lead.full_name`, `lead.phone`, `lead.email`
   - `event.name`, `event.event_date`, `event.start_time`, `event.location_address`
   - `event.booking_fee` (already included per P17)
   - `tenant.name`, `tenant.logo_url`
4. POST handler: accept `?token=...` the same way. Extract IDs from token
   before proceeding with the existing RPC call.

### Track B — unsubscribe EF: JSON response mode

The EF currently returns HTML for all requests. Add content negotiation:

1. Check the `Accept` header. If it includes `application/json`, return:
   ```json
   { "success": true, "message": "הוסרת בהצלחה מרשימת התפוצה" }
   ```
   or on error:
   ```json
   { "success": false, "message": "הקישור אינו תקף או שפג תוקפו" }
   ```
2. If `Accept` does NOT include `application/json` (or is `*/*` from a
   browser), return the existing HTML page. This is backwards compat.

### Track C — send-message EF: update unsubscribe URL

In the token generation section (where `variables.unsubscribe_url` is built):
- Change the URL from `${SUPABASE_URL}/functions/v1/unsubscribe?token=...`
  to `https://prizma-optic.co.il/unsubscribe?token=...`
- **Hardcoded domain is intentional** — SaaS-ification with
  `tenants.storefront_domain` is out of scope (see SPEC §7).

### Track D — CRM JS: update registration URL

In `modules/crm/crm-automation-engine.js`, find the `buildVariables` function
where `registration_url` is constructed.

1. Change the URL from `app.opticalis.co.il/r.html?e=...&l=...` to
   `https://prizma-optic.co.il/event-register?token=...`
2. Generate the HMAC token client-side? **NO** — the client doesn't have
   `SERVICE_ROLE_KEY`. Instead: the `event-register` EF should expose a
   token-generation endpoint, OR the `send-message` EF should inject
   `%registration_url%` the same way it injects `%unsubscribe_url%`.

   **RECOMMENDED APPROACH:** Add `registration_url` injection to
   `send-message` EF (Track C extension) — the EF already has the
   `SERVICE_ROLE_KEY` and already injects `unsubscribe_url`. The client-side
   `crm-automation-engine.js` just needs to set
   `vars.registration_url = '[קישור הרשמה — יצורף אוטומטית]'` as a
   preview placeholder (same pattern as `unsubscribe_url` preview).

   The `send-message` EF needs: `lead_id`, `tenant_id`, `event_id` (already
   available in the EF's variables context when dispatching event-scoped
   templates). Token format:
   `b64url("${lead_id}:${tenant_id}:${event_id}:${expiry}")` + HMAC.

## Deploy

After all 4 tracks:
1. Deploy `event-register` EF: `supabase functions deploy event-register --project-ref tsxrrxzmdxaenlvocyit`
2. Deploy `unsubscribe` EF: `supabase functions deploy unsubscribe --project-ref tsxrrxzmdxaenlvocyit`
3. Deploy `send-message` EF: `supabase functions deploy send-message --project-ref tsxrrxzmdxaenlvocyit`

## Verify

1. `curl` the `event-register` EF GET with a valid token → 200 + pre-fill data
2. `curl` the `unsubscribe` EF with `Accept: application/json` → JSON
3. `curl` the `unsubscribe` EF without header → HTML (backwards compat)
4. Check `send-message` EF code: `unsubscribe_url` domain = `prizma-optic.co.il`
5. Check `crm-automation-engine.js`: `registration_url` = preview placeholder

## Commit Plan

- Commit 1: `feat(crm-ef): add HMAC token to event-register + JSON mode to unsubscribe + storefront URLs`
- Commit 2: `feat(crm): update registration_url to server-side injection with preview placeholder`
- `git status` → clean tree

## MANDATORY at end

- `git status` → clean. No uncommitted files.
- Write `EXECUTION_REPORT.md` + `FINDINGS.md` (if any) in the SPEC folder.

## Warnings

- **Do NOT modify `lead-intake` EF** — out of scope.
- **Do NOT create or modify DB tables** — no DDL in this SPEC.
- **Do NOT touch storefront repo** — that's Part B.
- **Do NOT break backwards compat** — old UUID URLs must still work.
- **ONLY test phones:** `+972537889878` / `+972503348349`. ONLY on demo tenant.
