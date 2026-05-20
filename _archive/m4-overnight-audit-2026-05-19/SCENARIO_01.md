# SCENARIO 01 — Lead intake via storefront /supersale/ form (HE)

**Status:** 🔴 REGRESSION (HE path) — sub-paths EN/RU not exercised once HE failed twice
**Date:** 2026-05-20
**Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
**Surfaces touched:**
- `http://localhost:4321/supersale/` (Astro storefront, demo tenant via `?t=demo`)
- Supabase Edge Function `lead-intake` (deployment version 28)

## Pre-state DB snapshot (whitelist phones, demo tenant)

```
2 active leads on whitelist phones:
- cb6b343e... +972503348349 "Localhost Tester E2E" waiting
- 01269ab9... +972537889878 "Test E2E FB CAPI"      waiting
```

Soft-deleted these 2 at 03:42:47 UTC to give a clean slate (active count → 0).

## Steps executed

### Attempt 1 (HE form)
- Navigated to `http://localhost:4321/supersale/`
- Clicked CTA "בדיקת התאמה ושריון מקום" → modal opened with form
- Filled: name="Audit S1 HE 2026-05-19", phone="0537889878", email="daniel+audit_s1@prizma-optic.co.il", eye-exam="לא צריך", terms-approved=true
- Clicked "שריינו לי מקום" → page navigated to `https://www.prizma-optic.co.il/successfulsupersale/?fbe=0f4001cf-ef28-45a5-a157-25bf587c6308`

### Attempt 2 (HE form — retry)
- Same flow, different name/email (`Audit S1 HE Retry 2026-05-20`)
- Same observable behavior — navigated to `https://www.prizma-optic.co.il/successfulsupersale/?fbe=9d2ae499-9405-4dd1-a48c-c1cf9c0c4386`

## Observed evidence (post-state)

### DB (queried after both attempts)
```sql
SELECT * FROM crm_leads
 WHERE fb_event_id IN ('0f4001cf-ef28-45a5-a157-25bf587c6308',
                       '9d2ae499-9405-4dd1-a48c-c1cf9c0c4386')
    OR full_name ILIKE 'Audit S1%';
-- → 0 rows
```

No lead created in **any** tenant. The fb_event_id in the success-page URL is unrelated to anything that landed in `crm_leads`.

### Edge Function logs

| Attempt | Sequence | Result |
|---|---|---|
| 1 | `OPTIONS /lead-intake` 03:43:01 → 200 (CORS preflight) | OK |
| 1 | `POST /lead-intake` 03:43:03 → **409** (execution_time 2,140 ms) | duplicate-conflict response from EF |
| 2 | `OPTIONS /lead-intake` 03:46:48 → 200 | OK |
| 2 | `POST /lead-intake` | **NO LOG ENTRY** — POST appears never to have been sent, or never reached the EF |

### Browser console
- A single `Failed to load resource: 409` error after Attempt 1.
- No errors logged for Attempt 2 — but no successful insert either.

### Success page (UX)
- Both attempts redirected to `https://www.prizma-optic.co.il/successfulsupersale/` (prizma **production** URL) with a client-generated `fbe` query param.
- User sees "נרשמת בהצלחה למערכת האירועים!" — implying success.

## Verdict 🔴 REGRESSION

The user-visible behavior — "thank you, you're registered" — does **not** match the actual state — no lead row created on the demo tenant. Three issues compound:

1. **Attempt 1 (409 from EF):** Even after soft-deleting all `is_deleted=FALSE` leads with the whitelist phone, `lead-intake` returned 409 "duplicate". Reading `supabase/functions/lead-intake/index.ts` lines 192–231 shows the duplicate check is `phone = X AND is_deleted = FALSE`, which **should** have matched zero rows. The 409 implies either (a) a stale row exists in some path the audit query didn't see, (b) the EF version deployed (v28) differs from the source on disk, or (c) a race within the EF itself. The partial unique index `crm_leads_tenant_phone_active_uniq` (on `(tenant_id, phone) WHERE is_deleted=false`) was confirmed in `pg_indexes` — it doesn't block this scenario.
2. **Attempt 2 (no POST in logs):** OPTIONS preflight at 03:46:48 succeeded, but no corresponding POST appeared in the EF logs in the 40 s window I observed. Either CORS allowed but the storefront then short-circuited, or the POST failed before reaching the Supabase boundary. (TL;DR — front-end side bug, not a duplicate-check rejection like Attempt 1.)
3. **Success page redirects to production URL:** `https://www.prizma-optic.co.il/successfulsupersale/` is the **production** success page, not a local demo page. Even on a tenant-isolated demo session this URL is hard-coded. Not breaking on its own, but it confuses the audit signal: the user sees prod-styled success regardless of whether the lead actually landed.

## Cross-references

- **Project memory `project_fb_capi_p21_state.md`** asserts FB CAPI P2.1 shipped 2026-05-15 with passing E2E. This scenario's failure contradicts that — or the demo-storefront submit path has regressed between then and 2026-05-19.
- Existing lead `01269ab9-59c2-40d7-b987-48041210f26d "Test E2E FB CAPI"` (2026-05-15) shows the path DID work on that date.

## Recommended follow-up SPEC (out of audit scope)

1. Reproduce Attempt-1 (409 against fresh phone+is_deleted=false=0 state) and root-cause.
2. Reproduce Attempt-2 (missing POST after OPTIONS) under DevTools network inspector — likely a front-end JS error before the fetch fires.
3. Decide whether demo storefront should redirect to a demo-styled success page rather than the prod-styled one.
4. Add a `tests/smoke/supersale-intake.test.mjs` (HE only) that uses Daniel's whitelist phone + hard-delete cycle and verifies the row appears in `crm_leads` within 5 s.

## Sub-paths EN/RU

Not exercised. Each requires its own whitelist-phone cycle, and the failure mode on HE is severe enough that EN/RU would not produce new information until HE is fixed. Document as **deferred** pending the SPEC above.
