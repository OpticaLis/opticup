# SPEC — M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT (STUB)

> **Status:** STUB ONLY. Awaiting full Brief from Architect (parallel Cowork session as of 2026-05-11). Do NOT execute on this stub.
> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/SPEC.md`
> **Authored by:** opticup-executor (stub written under Full-Auto Pipeline of `DEMO_HEALTH_CHECK_EVENT_LINK_FIX`, Path A2 resolution)
> **Authored on:** 2026-05-11
> **Module:** 3 — Storefront

---

## Provenance

This stub exists because the predecessor SPEC `DEMO_HEALTH_CHECK_EVENT_LINK_FIX` (Module 4) escalated mid-pipeline for a Path A/B/C decision on the demo event-link bug. The Architect chose **Path A2 — Strategic defer**: rather than patch `tenants.ui_config.storefront_url` for demo to a non-functional URL, the demo tenant needs an actual live storefront deployment that mirrors Prizma's supersale forms.

See:
- Predecessor SPEC: `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/SPEC.md`
- Diagnosis: `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/DIAGNOSIS.md`
- Architect decision: `modules/Module 4 - CRM/escalations/2026-05-11T16-47-08Z_demo_link_root_cause.md` §Architect Decision

## Goal (one line)

Provision a live demo storefront on a separate Vercel project, mirroring Prizma's supersale forms, wired to demo's `tenant_id = 8d8cfa7e-ef58-49af-9702-a862d459cccb` in the existing Supabase project — so Daniel can run his manual test cycle on a clean isolated test environment.

## Why this isn't authored in full yet

- Decision on the **target URL** for demo's storefront is pending (Architect Brief in flight).
- Decision on the **scope of mirrored forms** (1:1 with all current Prizma supersale forms, or a subset?) needs Daniel's input.
- DNS / Vercel project setup decisions belong to the Architect / Daniel, not to the executor's autonomy envelope.
- Scope likely involves the sibling repo `opticalis/opticup-storefront` — multi-repo planning is an Architect task.

## Expected when full SPEC arrives

The full SPEC, authored by a fresh Foreman session, will include:

1. The target URL (e.g., `https://demo-storefront.vercel.app` or `https://demo-optic.co.il`) decided by Daniel/Architect.
2. The list of supersale forms / pages to mirror.
3. A Vercel project bootstrap plan.
4. Wiring plan: `lead-intake` EF + `event-register` EF + `quick-register` EF + storefront repo env config (`tenant_slug=demo` + service-role key scoping).
5. **ONE single-row UPDATE on demo's `tenants.ui_config.storefront_url`** to the new live URL — this is the destructive op that closes the loop with the predecessor SPEC's intent.
6. Smoke test plan: trigger demo event-link generation → URL produced uses the new domain → cross-check against the live storefront's `/r/<code>` endpoint resolving correctly.
7. Iron-Rule-32 §Destructive Operations declaration covering the single UPDATE.

## Destructive Operations

`None.` while this remains a stub. The follow-up full SPEC will declare exactly one destructive op when authored: a single-row UPDATE on demo's `tenants.ui_config.storefront_url` (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`) to point at the newly-provisioned demo storefront URL. No other destructive ops anticipated.

## Out of scope (likely)

- Production traffic shifts on Prizma — Prizma stays on `prizma-optic.co.il`.
- Schema changes — `tenants.ui_config` shape unchanged; only the value updates.
- Building NEW forms for demo — only mirroring existing Prizma forms.

## Status indicators

- **Predecessor SPEC closed as:** 🟡 CLOSED-DEFERRED — see its FOREMAN_REVIEW.md.
- **This stub closed when:** the full SPEC body replaces these placeholder sections.
- **Dependencies:** none upstream; downstream the closure of CRM Migration #3 depends on this SPEC closing first (since Daniel's manual test cycle gates that migration).

---

*End of stub. DO NOT execute. Awaiting full Brief.*
