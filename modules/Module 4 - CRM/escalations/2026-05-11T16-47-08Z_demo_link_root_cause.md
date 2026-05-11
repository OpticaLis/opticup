# Escalation — Demo Event-Link Root Cause + Path Decision Required

**SPEC:** `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/`
**Diagnosis file:** `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/DIAGNOSIS.md`
**Created by:** opticup-executor (Full-Auto Pipeline)
**Created at:** 2026-05-11T16:47:08Z
**Status when written:** Pipeline PAUSED. Awaiting Architect Decision.

---

## Root Cause (1–2 sentences)

The event-link generator is reading `tenants.ui_config->>'storefront_url'` and producing URLs at exactly that domain. Demo's `storefront_url` is currently set to `https://demo.opticalis.co.il` — which is why every link Daniel encountered contains "opticalis." This is not a code bug; it is a configuration value question (and possibly an unresolved multi-tenant URL strategy question deferred from QUICK_REGISTER_QR_FLOW TD F1+F2).

## Evidence Summary

- `buildRegistrationUrl` (`supabase/functions/send-message/url-builders.ts:93–104`) reads ONLY from `tenant.ui_config.storefront_url`. No hardcoded fallback. Throws if missing.
- Demo's `storefront_url` = `https://demo.opticalis.co.il`. Prizma's = `https://prizma-optic.co.il`.
- Recent `short_links` rows confirm the generator is faithfully producing those domains (demo → `demo.opticalis.co.il/...`, prizma → `prizma-optic.co.il/...`).
- No Prizma regression risk if we only touch demo's row.

## Proposed Fix Paths

### Path A1 — Tactical: update demo's `storefront_url` to the live demo storefront URL

Single-row UPDATE on demo's `tenants.ui_config.storefront_url`. Requires the Architect or Daniel to supply the *correct* URL (the URL where demo's storefront is actually deployed today). This SPEC's autonomy doesn't include "guess what the right URL is."

- **Effort:** ~5 minutes once the target URL is known.
- **Risk:** trivial — single row, scoped, reversible (pre-value captured in DIAGNOSIS.md).
- **Reversible via:** UPDATE back to `https://demo.opticalis.co.il`.

### Path A2 — Strategic: provision a branded domain for demo (e.g., `demo-optic.co.il`)

Out-of-scope for this SPEC (domain acquisition + DNS + hosting). If chosen, this Pipeline cannot apply the fix; Pipeline writes a stub follow-up SPEC and closes this one as deferred.

### Path B / Path C — code change

**NOT recommended.** See DIAGNOSIS.md §Path Recommendation. Adding a platform-default fallback would regress M4_HARDCODED_PRIZMA_REMOVAL (Iron Rule 9).

## Risk Assessment per Path

| Path | Risk to Prizma | Risk to demo | Reversibility | Iron-Rule impact |
|---|---|---|---|---|
| A1 | None (only demo's row touched) | None — single config edit, captured pre-value | One UPDATE | None |
| A2 | None (this SPEC doesn't touch DNS) | None (deferred to separate SPEC) | N/A — defer | None |
| B  | LOW (code is shared, but isolated EF) | Could introduce silent fallback | Code revert | **Regresses Rule 9 — re-introduces hardcoded URL** |
| C  | Same as B | Same as B | Same as B | Same as B |

## Executor Recommendation

**Path A1** with the target URL specified by the Architect.

If the Architect does not know the URL, the right answer is "Daniel, where is demo's storefront actually deployed today?" — this is a Daniel-only piece of information.

---

## Architect Decision

**Path:** A2 (Strategic — defer to provisioning SPEC)
**Decided by:** Architect, approved by Daniel, 2026-05-11
**Pasted into Pipeline at:** 2026-05-11 (same session as diagnosis)

### Resolution

Defer the demo `storefront_url` update — demo currently has no live storefront. Instead of patching `tenants.ui_config.storefront_url` to a non-functional value, provision an actual demo storefront deployment in a separate SPEC.

### Reasoning

Demo was disconnected from Prizma after the cutover testing phase. Daniel wants a 1:1 mirror of Prizma's supersale forms running on a separate Vercel project, hooked to demo's `tenant_id` in Supabase. This gives Daniel a clean isolated test environment for the manual test cycle he needs to run before further migrations.

### Resume Instructions Issued

1. Write a one-pager stub follow-up SPEC at `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/SPEC.md`. Full SPEC to be authored separately by a fresh Foreman session (Brief incoming in parallel Cowork).
2. Close THIS SPEC as 🟡 CLOSED-DEFERRED.
3. Do NOT modify `tenants.ui_config`.
4. No fix applied at any layer — strategic decision was "fix is in a different SPEC, not this one."

### What This Means for SPEC Criteria

- Criterion 7 (fix applied) → DEFERRED to follow-up SPEC.
- Criteria 8/9 (TEST_REPORT URLs) → TEST_REPORT captures *current* state as evidence that nothing changed during this SPEC; intended demo URL is owned by the follow-up.
- Criterion 11 (Prizma untouched) → automatically satisfied (no DB writes anywhere).
- Criterion 12 (DECISIONS_LOG entry) → records root cause + Path A2 decision + reference to follow-up SPEC.

---

## Next Steps (when decision arrives)

1. Pipeline parses the path letter from Daniel's pasted text.
2. Records the decision in this file under `## Architect Decision`.
3. Resumes execution per SPEC §4.1.
4. Applies the chosen Path's fix:
   - **Path A1:** one `UPDATE tenants SET ui_config = jsonb_set(ui_config, '{storefront_url}', to_jsonb(<target>::text)) WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'`.
   - **Path A2:** write follow-up SPEC stub `modules/Module 4 - CRM/docs/specs/M4_DEMO_DOMAIN_PROVISIONING/SPEC.md` (one-pager) + close this SPEC as deferred (no DB change).
   - **Path B / C:** STOP and escalate again (Executor strongly recommends against these).
5. Captures the post-fix URLs (demo + Prizma read-only) into TEST_REPORT.md.
6. Closes the SPEC.
