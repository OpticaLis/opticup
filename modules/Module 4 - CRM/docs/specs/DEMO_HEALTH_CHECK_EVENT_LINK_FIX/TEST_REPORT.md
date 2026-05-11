# TEST_REPORT — DEMO_HEALTH_CHECK_EVENT_LINK_FIX

**Path resolved:** A2 (Strategic defer — no fix applied in this SPEC)
**Test report scope:** capture *current* state of both tenants as evidence that the SPEC produced no DB-side change. Real "fix verification" belongs to the follow-up SPEC `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT`.
**Test date:** 2026-05-11
**Tester:** opticup-executor (read-only)

---

## Demo URL Produced

The demo tenant's event-link generator (`buildRegistrationUrl` in `supabase/functions/send-message/url-builders.ts`) is **unchanged**. It still produces URLs at demo's currently-configured `storefront_url` value of `https://demo.opticalis.co.il`.

**Evidence — most recent `short_links` rows for demo (read-only, no triggering happened in this SPEC):**

| created_at | link_type | URL (truncated) |
|---|---|---|
| 2026-05-11 16:24:44.613667+00 | registration | `https://demo.opticalis.co.il/event-register?token=ZWZjMGJk…` |
| 2026-05-11 16:24:44.539334+00 | registration | `https://demo.opticalis.co.il/event-register?token=ZWZjMGJk…` |
| 2026-05-11 16:24:44.473403+00 | unsubscribe | `https://demo.opticalis.co.il/unsubscribe?token=ZWZjMGJk…` |
| 2026-05-11 16:24:44.462995+00 | registration | `https://demo.opticalis.co.il/event-register?token=YTdmNWUz…` |

All recent demo URLs use `demo.opticalis.co.il`. This is the same domain Daniel reported as "wrong" — and intentionally so, because the resolution Path A2 is to provision an actual demo storefront in the follow-up SPEC rather than to update the config to point at a non-functional URL.

**The actual fix verification (demo URL produced contains the new, correct domain) will be captured in `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/TEST_REPORT.md`, not here.**

## Prizma URL Produced (Read-Only)

The Prizma tenant's `tenants` row is **untouched** by this SPEC (criterion 11 satisfied). The generator continues to produce URLs at `https://prizma-optic.co.il`.

**Evidence — most recent `short_links` rows for Prizma (read-only):**

| created_at | link_type | URL (truncated) |
|---|---|---|
| 2026-05-11 16:27:12.960233+00 | unsubscribe | `https://prizma-optic.co.il/unsubscribe?token=YzFmY2I5…` |
| 2026-05-11 16:27:12.747608+00 | unsubscribe | `https://prizma-optic.co.il/unsubscribe?token=YzFmY2I5…` |

Prizma URLs continue to use `prizma-optic.co.il`. ✅ No regression. No outbound message was triggered by this SPEC.

## Regression Check — `tenants` table state

Snapshot at SPEC start (from DIAGNOSIS.md) vs snapshot at SPEC end (post-Architect-decision, pre-close):

| Tenant | `updated_at` at start | `updated_at` at end | `storefront_url` at start | `storefront_url` at end | Changed? |
|---|---|---|---|---|---|
| demo (`8d8cfa7e-…`) | `2026-03-29 08:33:43.906+00` | `2026-03-29 08:33:43.906+00` | `https://demo.opticalis.co.il` | `https://demo.opticalis.co.il` | ❌ No |
| prizma (`6ad0781b-…`) | `2026-03-19 09:54:27.256+00` | `2026-03-19 09:54:27.256+00` | `https://prizma-optic.co.il` | `https://prizma-optic.co.il` | ❌ No |

**Both rows untouched. Criterion 11 fully satisfied.**

## Outbound Message Verification

No outbound SMS / Email / WhatsApp / Make webhook calls were triggered by this SPEC. The diagnosis was entirely read-only against:
- `crm_message_templates` (SELECT, no triggering)
- `tenants` (SELECT, no UPDATE)
- `short_links` (SELECT of pre-existing rows, no INSERT)
- Source files via `Read` and `Grep` (no edits to EF/RPC/client code)

Criterion 10 satisfied.

## Smoke Suite

Per SPEC §3 criterion 14 — `npm run smoke` should pass 7/7. Per SPEC §13 Pre-Merge Checklist — also required.

> **Note:** Smoke result captured in EXECUTION_REPORT.md §2 Success Criteria Verification.

## Integrity Gate (Iron Rule 31)

> **Note:** Result captured in EXECUTION_REPORT.md §2 Success Criteria Verification. Pre-SPEC and post-SPEC both expected exit 0 (no null-byte ERROR).

## Verdict

🟡 **SPEC closes with no fix applied.** Demo's event-link URL is unchanged (still `https://demo.opticalis.co.il`). Prizma's URL is unchanged. Real fix is deferred to the follow-up SPEC `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT`. Daniel's blocked manual test cycle on demo remains blocked until that follow-up ships.
