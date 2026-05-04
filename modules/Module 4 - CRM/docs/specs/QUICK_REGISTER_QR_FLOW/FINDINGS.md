# FINDINGS — QUICK_REGISTER_QR_FLOW

> **Scope:** all findings surfaced during Rungs 1, 2, 3 + Hotfixes #1/#2/#3.
> **Authors:** Campaign Overseer (in-session) + Daniel (manual QA).

---

## F1 — `STOREFRONT_URL` hardcoded in `quick-register` EF (LOW, SaaS-blocker for tenant 2)

**File:** `supabase/functions/quick-register/index.ts:23`
```
const STOREFRONT_URL = "https://prizma-optic.co.il";
```

**Why it matters:** when the second tenant onboards, every quick-register URL that the `lookup_url` op returns will point to the Prizma domain. Tenant 2 employees would WhatsApp `רישום מהיר אירוע N` and get a QR pointing to a non-existent page on Prizma's domain.

**Recommendation:** when SPEC #11 (multi-tenant SaaS readiness) is authored, promote `STOREFRONT_URL` to `tenants.config` JSONB column (e.g., `tenants.config->'storefront_base_url'`) and resolve it from the tenant lookup that the EF already performs. Until then: harmless on single-tenant deploy.

**Severity:** LOW (single-tenant deploy). Promoted to MEDIUM the moment a second tenant signs.

---

## F2 — Storefront page defaults `tenantSlug='prizma'` (MEDIUM in current cutover state)

**File:** `opticup-storefront/src/pages/quick-register/index.astro:26`
```
const tenantSlug = Astro.url.searchParams.get('tenant')?.trim() || 'prizma';
```

**Why it matters:** during smoke test 2026-05-04 evening, Daniel scanned a demo-side QR (which correctly carried `?event=14`), landed on the form, and got `event_not_found` because the form defaulted `tenantSlug='prizma'` and event 14 only exists on demo. Real fix required appending `&tenant=demo` to the URL.

**Two-sided coupling:** F1 + F2 together mean that today:
- Make scenario 8464122 hardcodes `tenant_slug:"demo"` in the lookup_url body
- EF returns a Prizma URL (because of F1)
- The Prizma URL omits a `tenant=` param
- The form defaults to `prizma` (because of F2)
- Result: prizma-side test always works (matches the form default); demo-side test always fails unless URL is hand-modified.

**Recommendation:** in the same SPEC as F1, emit `?event=N&tenant=<slug>` from the EF when `lookup_url` returns the URL. Form already prefers explicit query param over default — no form change needed if URL carries `tenant`.

**Workaround (today):** Daniel uses `?event=N&tenant=demo` for demo testing; production prizma testing works as-is.

---

## F3 — Make MCP `scenarios_update` unreliable for blueprints >150KB through subagent dispatch (HIGH for tooling, but not blocking)

**Trigger incident:** Rung 3 attempted to round-trip a 269KB blueprint through Make MCP `scenarios_update` via three independent subagent dispatches. All three failed:
1. First subagent: read the wrong slice of the file, claimed modules 213/40 didn't exist.
2. Second subagent: applied 2 patches, claimed REPL3 not found (it was — `urlFile` field name vs `url` lookup).
3. Third subagent: applied all 3 patches correctly, but `scenarios_update` returned `'metadata' missing, missingProperty: 'metadata'` — despite metadata being present in the patched JSON.

**Root cause hypothesis:** subagents serialize the blueprint object differently than the MCP tool expects. Likely a JSON encoding round-trip (string vs object) introduces subtle structural drift that the Make API rejects.

**Workaround that worked:** Campaign Overseer extracted the exact verbatim strings via `scenarios_get` (which DID succeed — read-side has no encoding issue), dictated them to Daniel, who applied the changes manually in Make UI. Total manual time: ~5 minutes including Run-once verification.

**Recommendation for future SPECs:**
- For Make scenario edits where the scenario blueprint is >150KB, **author SPECs that assume manual UI work**, not autonomous MCP round-trip.
- The Overseer's role becomes: probe + dictate exact strings + verify post-Save via `scenarios_get`.
- Reserve `scenarios_update` for scenarios authored from scratch via blueprint upload (typically <100KB), not surgical edits to large existing scenarios.

**Severity:** HIGH for tooling — this constrains the Bounded Autonomy model for any Make-scenario work. But not blocking for any single SPEC because the manual workaround is fast.

---

## F4 — Module 36 (Monday legacy) dangles in scenario 8464122 quick-register branch (LOW, cosmetic)

**Trigger:** post-Rung 3, the `monday:ListItemsByColumnValues` module 36 still exists in the branch, upstream of HTTP module 213. Its output now feeds nothing — the QR caption + URL reference module 213's response (correct), and module 36's output is dropped on the floor.

**Why it matters (a little):** the scenario shows extra latency (one Monday API call per WhatsApp trigger that nothing consumes), occasional Monday API errors will surface as red triangles in the Make UI even though they're harmless, and the scenario carries dead state.

**Recommendation:** in a Make-cleanup pass (separate from this SPEC), delete module 36 from the branch. Connect the scenario filter directly to module 213. Estimated effort: 2 minutes manual UI work.

**Severity:** LOW (cosmetic + minor latency). Deferred to housekeeping.

---

## F5 — `event_coupon_delivery_*` automation works as designed for quick-register attendees (POSITIVE)

**Validation during smoke test:** the existing automation rules `event_coupon_delivery_email` and `event_coupon_delivery_sms` fired correctly when the EF dispatched coupon delivery for the new attendee. No new wiring needed. The `lead_id`-as-QR coupon mechanism works identically for walk-in attendees as for form attendees.

**Implication:** the SPEC's §2 assumption ("Quick-register attendees plug into this exact same coupon flow — no new coupon plumbing") is verified live.

**Severity:** N/A (positive finding). Recorded for Foreman review confidence.

---

## Summary

- 2 SaaS-readiness debts (F1, F2) — addressable in a single multi-tenant cleanup SPEC.
- 1 tooling constraint (F3) — informs future SPEC authoring discipline.
- 1 cosmetic cleanup item (F4) — Make-housekeeping backlog.
- 1 positive verification (F5) — coupon plumbing reuse validated.

No CRITICAL findings. No data corruption. No customer-facing failures during smoke test on demo.

---

*End of FINDINGS.md.*
