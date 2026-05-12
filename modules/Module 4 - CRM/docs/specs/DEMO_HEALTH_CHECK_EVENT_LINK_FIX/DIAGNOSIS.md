# DIAGNOSIS — DEMO_HEALTH_CHECK_EVENT_LINK_FIX

**Diagnosed by:** opticup-executor (Full-Auto Pipeline)
**Diagnosis date:** 2026-05-11
**SPEC:** `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/SPEC.md`
**Mode:** Read-only diagnosis. No DB writes. No EF redeploys.

---

## Template

Two templates contain the "registration opened" copy that Daniel encountered. Both use the `%registration_url%` placeholder.

| tenant | channel | template_id | slug |
|---|---|---|---|
| demo | sms | `6d2e43dc-9f03-4743-a8da-00f6215e8048` | `event_registration_open_sms_he` |
| demo | email | `024cd171-b19d-4e18-a799-b8b729367c9e` | `event_registration_open_email_he` |
| prizma | sms | `b325481a-7926-4e43-b5c1-413f45a2f5c3` | `event_registration_open_sms_he` |
| prizma | email | `679c4510-4882-4a57-8a3e-0e611dabcd5d` | `event_registration_open_email_he` |

Demo SMS body excerpt:
```
%name%, נפתחה ההרשמה ל%event_name% ב-%event_date% 📅
...
להרשמה: %registration_url%
להסרה: %unsubscribe_url%
```

Subject line of the email template literally says "ההרשמה לאירוע %event_name% נפתחה" — matches Daniel's report ("registration opened" template).

The placeholder of interest is `%registration_url%`.

## Link Generator

`%registration_url%` is filled by a 3-layer chain:

1. **Client-side / engine prep:** `modules/crm/crm-automation-engine.js:114–120` and `supabase/functions/automation-engine/prepare-plan.ts:61–67`. Both set a *placeholder* (`[קישור הרשמה — יצורף אוטומטית]`) when no per-event override URL is configured. They do NOT generate the final URL.
2. **Send-time real substitution:** `supabase/functions/send-message/event-variables.ts:228–238`. If `vars.registration_url` is missing or still a `[...]` placeholder and an `eventId` is present, calls `buildRegistrationUrl(db, leadId, tenantId, eventId)`.
3. **Final URL builder:** `supabase/functions/send-message/url-builders.ts:93–104` — `buildRegistrationUrl`. This is THE generator.

Source of `buildRegistrationUrl` (verbatim, lines 93–104):

```ts
export async function buildRegistrationUrl(
  db: any, leadId: string, tenantId: string, eventId: string,
): Promise<string> {
  const cfg = await loadTenantConfig(db, tenantId);
  const origin = cfg?.storefront_url;
  if (!origin) throw new Error("tenant_storefront_unconfigured");
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = await signToken(`${leadId}:${tenantId}:${eventId}:${exp}`);
  const fullUrl = `${origin}/event-register?token=${token}`;
  return createShortLink(db, tenantId, fullUrl, "registration", leadId, eventId, origin);
}
```

The function:
- Reads the tenant's `storefront_url` from `tenants.ui_config` via `_shared/tenant-config.ts:loadTenantConfig`.
- Builds the long URL as `${origin}/event-register?token=<hmac>`.
- Wraps it in a short link via `createShortLink` (lines 37–78). The short link's prefix is also `${origin}/r/<code>`.
- **If `storefront_url` is missing/falsy, the function THROWS `tenant_storefront_unconfigured`**. There is NO platform fallback — no hardcoded default to `opticalis.co.il`, no fallback to `app.opticalis.co.il`.

## Domain Source

`origin = cfg?.storefront_url` where `cfg` is `await loadTenantConfig(db, tenantId)`.

`loadTenantConfig` (in `supabase/functions/_shared/tenant-config.ts:27–68`) returns:
```ts
storefront_url: typeof ui.storefront_url === "string" ? ui.storefront_url : null,
```
where `ui = data.ui_config` from the `tenants` table row of `tenantId`.

So the URL domain is **100% tenant-scoped** — read from `tenants.ui_config->>'storefront_url'`. There is no hardcoded literal, no JWT-claim fallback, no platform-default fallback. This was introduced 2026-05-06 by `M4_HARDCODED_PRIZMA_REMOVAL` (SESSION_CONTEXT line 9).

## Demo Tenant Config

Query result (2026-05-11):

```
id:                 8d8cfa7e-ef58-49af-9702-a862d459cccb
slug:               demo
name:               אופטיקה דמו (בדיקה)
updated_at:         2026-03-29 08:33:43.906+00      ← pre-SPEC snapshot
ui_config.storefront_url:        https://demo.opticalis.co.il
ui_config.whatsapp_phone_e164:   972500000000
business_phone:                  050-000-0000
business_address:                דוגמה 1, דמו
```

Full `ui_config` JSON contains:
- `brand`: green palette (`gold: #059669`, etc.) — distinct from Prizma's gold
- `storefront_url`: `https://demo.opticalis.co.il`
- `--color-primary`: `#059669`
- 11 keys total, all non-Prizma values

**Evidence — actual URLs generated for demo** (sample from `short_links` table, last 24 hours):

| link_type | target_url (truncated) | created_at |
|---|---|---|
| registration | `https://demo.opticalis.co.il/event-register?token=...` | 2026-05-11 16:24:44 |
| unsubscribe | `https://demo.opticalis.co.il/unsubscribe?token=...` | 2026-05-11 16:24:44 |

All 7 recent demo short_links resolve to `demo.opticalis.co.il`. None point to `app.opticalis.co.il`, `prizma-optic.co.il`, or any other domain.

## Prizma Tenant Config

Query result (2026-05-11):

```
id:                 6ad0781b-37f0-47a9-92e3-be9ed1477e1c
slug:               prizma
name:               אופטיקה פריזמה
updated_at:         2026-03-19 09:54:27.256+00      ← pre-SPEC snapshot (hands-off)
ui_config.storefront_url:        https://prizma-optic.co.il
ui_config.whatsapp_phone_e164:   972533645404
business_phone:                  053-3645404
business_address:                הרצל 32, אשקלון
```

**Evidence — actual URLs generated for Prizma** (sample from `short_links`):

| link_type | target_url (truncated) | created_at |
|---|---|---|
| unsubscribe | `https://prizma-optic.co.il/unsubscribe?token=...` | 2026-05-11 16:27:12 |
| unsubscribe | `https://prizma-optic.co.il/unsubscribe?token=...` | 2026-05-11 16:27:12 |

Prizma URLs correctly use `prizma-optic.co.il`. **Hands-off — Prizma row is not to be modified by this SPEC** (Brief §6 decision 5).

## Root Cause

The code path is doing exactly what it was designed to do. There is no bug in the generator, no broken fallback, no hardcoded `opticalis` literal anywhere in the path. **The configured `storefront_url` for the demo tenant is literally `https://demo.opticalis.co.il`, and that is what every link contains.**

Daniel's report ("link points to opticalis domain") is technically accurate: `demo.opticalis.co.il` is a subdomain of `opticalis.co.il`, the platform's company domain. The question is whether this configured value is what Daniel actually intends for the demo tenant.

**There are two possible interpretations of "wrong":**

1. **The value `demo.opticalis.co.il` doesn't resolve / is dead.** If `demo.opticalis.co.il` is not actually a deployed storefront (no DNS record, no Vercel project, no working web server), then every link demo generates is a dead link. Daniel encountered a dead link, called it "the opticalis domain" because that's what he sees in the URL, and reported it. The fix is to point demo's `storefront_url` at the URL where the demo storefront is actually deployed today (possibly a Vercel preview URL, possibly a different subdomain, possibly the same as ERP `app.opticalis.co.il/<path>`).

2. **The value is fine but Daniel expected demo to mirror Prizma's pattern (its own branded domain like `demo-optic.co.il`).** In that case, the fix is to provision a real domain for demo and update `storefront_url` accordingly — but that's domain-acquisition work outside this SPEC's scope.

**Adjacent strategic context (from `SESSION_CONTEXT.md`):** `QUICK_REGISTER_QR_FLOW` closed with `Tech Debt F1+F2: multi-tenant URL strategy when tenant 2 ships` — i.e., the question of how non-Prizma tenants' URLs should be structured was explicitly deferred. This SPEC is the first concrete manifestation of that deferred decision.

## Path Recommendation

Recommend **Path A** with two sub-options for the Architect to decide between:

- **Path A1 (tactical fix):** Update demo's `tenants.ui_config.storefront_url` to whatever URL the demo storefront is ACTUALLY deployed at today, so Daniel's manual test cycle on demo can proceed immediately. This is one scoped UPDATE on demo's row only; Prizma untouched. CRM Migration #3 unblocked within minutes.
- **Path A2 (strategic fix):** Architect decides demo deserves a Prizma-style branded domain (e.g., `demo-optic.co.il`), provisions DNS + hosting outside this SPEC, then the Pipeline runs a one-line UPDATE.

**Path B (code change) is NOT recommended.** The code is correct. There is no fallback to "fix" — `buildRegistrationUrl` already throws when `storefront_url` is missing. Adding a platform-default fallback (e.g., `app.opticalis.co.il/<slug>/event-register`) would mask future config errors silently — Iron-Rule-9 territory ("no hardcoded business values"). M4_HARDCODED_PRIZMA_REMOVAL explicitly removed hardcoded URL fallbacks; reintroducing one here would regress that work.

**Path C is NOT recommended** for the same reason as Path B.

## Open Questions for the Architect

1. **Where is the demo storefront actually deployed?** This Pipeline doesn't have visibility into Vercel/DNS state. The Architect (or Daniel) knows. The answer determines what URL `storefront_url` should be set to.
2. **Should demo get its own branded domain (mirroring Prizma's pattern), or is a subdomain of `opticalis.co.il` the SaaS-intended pattern for tenants without their own domain?** This is the deferred TD F1+F2 decision.
3. **Is `demo.opticalis.co.il` actually a working endpoint today?** If yes, then the report is "I expected a different value" (preference). If no, then it's "the value points to a dead URL" (functional bug).

---

*End of DIAGNOSIS.md. Pipeline is now pausing for the Architect's Path decision. See escalation file referenced in the Hebrew line.*
