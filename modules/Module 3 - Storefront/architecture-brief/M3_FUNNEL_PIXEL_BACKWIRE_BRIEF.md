# M3_FUNNEL_PIXEL_BACKWIRE — Architecture Brief

> **Status:** Brief sealed 2026-05-16 morning · Owner: Architect · Pipeline: Full-Auto
>
> **Target repos:** Both. ERP repo for new Edge Function `pixel-fired`; sibling `opticalis/opticup-storefront` for the POST call after `fbq` fires.
>
> **One-line:** Close the measurement loop. After the thank-you-page Pixel fires on storefront, the page POSTs `{event_id, tenant_id}` to a new Supabase EF `pixel-fired`, which UPDATEs `crm_leads.fb_pixel_fired_at = NOW()`. Without this, the column stays NULL forever → P2.2 dashboard cannot measure pixel-vs-CAPI gap.

---

## 1. Goal

Implement the storefront → ERP back-wire that populates `crm_leads.fb_pixel_fired_at`. The column was added in P2.1 in anticipation of this back-wire; the wire itself was deferred (P2.1 SC #12 explicitly observational). This Brief delivers the deferred half. After ship: dashboard tile from P2.2b becomes meaningful (real pixel-fire data); before ship: dashboard tile would show 100% gaps forever.

## 2. Background

**Why this Brief exists:**

P2.1 substrate (FB CAPI hybrid dedup) shipped 2026-05-15 evening. Both halves merged to main (`M4_FB_CAPI_HYBRID_DEDUPLICATION` + `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF`). The flow today:

1. Form submit on storefront → UUID generated → POST body has `fb_event_id`.
2. `lead-intake` EF stores `crm_leads.fb_event_id`.
3. `crm_capi_dispatch_queue` row enqueued.
4. `pg_cron` ticks → `fb-capi-dispatch` EF fires → server-side `Lead` event sent to Meta (when token populated).
5. Storefront redirects to thank-you page with `?fbe=<uuid>` param.
6. Thank-you page reads `fbe` param → calls `fbq('track','Lead',{},{eventID:uuid})` → browser pixel sends client-side `Lead` event to Meta with same `event_id`.
7. **Meta deduplicates server + browser events. Counts ONE conversion.** ✅

What's missing: **step 6.5.** After the browser pixel fires, the storefront does NOT tell the ERP "the pixel actually fired." So `crm_leads.fb_pixel_fired_at` is NULL forever. We can confirm CAPI dispatch (server logs `crm_capi_dispatch_queue.status='sent'`) but we cannot confirm browser-side `Lead` event actually fired (which happens if the redirect succeeded, the user landed on the thank-you page, the page loaded, `fbevents.js` loaded, no ad-blocker interfered, etc.).

This back-wire closes the measurement loop. It's what makes P2.2 dashboard real, not a banner-and-hope.

## 3. Scope

**In scope:**

**ERP repo (`opticalis/opticup`, branch develop):**
- New Edge Function `supabase/functions/pixel-fired/index.ts` (~80 lines).
  - `verify_jwt=false` (called from public storefront, no JWT).
  - Origin-allowlisted to the same domains as `lead-intake` + `submit-lead` + `fb-capi-dispatch`.
  - Accepts POST body `{event_id: string, tenant_id: string}`.
  - Validates `event_id` is a valid UUID, `tenant_id` is a valid UUID.
  - UPDATE `crm_leads SET fb_pixel_fired_at = NOW() WHERE fb_event_id = $1 AND tenant_id = $2 AND fb_pixel_fired_at IS NULL`.
  - Idempotent: second call for same `event_id` no-ops (the `AND fb_pixel_fired_at IS NULL` filter ensures this).
  - Returns 200 + `{updated: 0|1}` (informational; storefront fire-and-forget so won't typically read).
  - Logs to `console.log` only (no `crm_message_log` write — this is observational data, not communication).
  - Iron Rule 22 defense-in-depth: explicit `.eq('tenant_id', tenantId)` even though RLS would enforce.
- Optional Iron Rule 21 check: confirm no existing pixel-fired-back-wire EF or RPC exists (Brief expects: nothing — this is genuinely new).

**Storefront repo (`opticalis/opticup-storefront`, branch develop):**
- Thank-you-page templates (HE + EN + RU + multi variants): after `fbq('track','Lead',...,{eventID:uuid})` fires, append a `fetch()` POST to `/functions/v1/pixel-fired` with `{event_id: uuid, tenant_id: <derived>}`.
- Use `fetch(..., {keepalive: true})` so the request survives page unload (user may close tab right after).
- Fire-and-forget: do not await, do not block render, do not show errors.
- Reuse existing tenant_id derivation (already in scope for the existing pixel firing path).
- Single source of truth: the `fbe` URL param drives both the pixel call AND the back-wire POST.
- If `fbe` is absent (graceful degradation case from P2.1 D5), DO NOT POST — there's no event_id to back-wire.

**Documentation:**
- Update `docs/FB_CAPI.md` §"Optional back-wire" → mark as IMPLEMENTED (not optional anymore).
- Update `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md` §4: mark back-wire as DEPLOYED, remove the caveat banner instruction for P2.2b.

**Out of scope:**

- The dashboard tile itself (that's P2.2b — separate SPEC after this lands).
- Adding `fb_pixel_fired_at` to any reports or views beyond what P2.2b will need.
- Backfilling existing leads (`fb_pixel_fired_at` stays NULL for historical rows — the back-wire only flows forward; trying to backfill from Meta API is a different SPEC).
- Re-running existing leads through the pixel/CAPI flow.
- Changes to existing pixel firing logic — only ADD the POST call after the fire.

## 4. Destructive Operations

Per Iron Rule 32: **None.**

Pure additive: new EF, new POST call from storefront, doc updates. No deletes, no schema changes (column already exists from P2.1), no migrations.

## 5. Pipeline

Standard Full-Auto Pipeline:

1. **Foreman (opticup-strategic)** authors `SPEC.md` at `modules/Module 3 - Storefront/docs/specs/M3_FUNNEL_PIXEL_BACKWIRE/SPEC.md` (ERP-side authority per CLAUDE.md §7).
2. **Executor (opticup-executor)** implements: EF in ERP repo, POST call + tenant_id derivation in storefront repo. Default model: **Sonnet** — mechanical TS + tiny Astro/JS edit.
3. **Reviewer (opticup-reviewer)** validates: Iron Rule 21 (no duplicate), Rule 22 (defense-in-depth), Rule 23 (no secrets), Origin allowlist matches existing EFs, idempotency, fire-and-forget keepalive pattern correct.
4. **Localhost-Tester** runs storefront smoke + simulated thank-you-page navigation on demo storefront with mock UUID; verify `crm_leads.fb_pixel_fired_at` populates within 5 seconds.
5. **Foreman closes** with FOREMAN_REVIEW.md + 4 skill improvement proposals + memory update for `project_fb_capi_p21_state.md`.

## 6. Locked Decisions

**D1. POST endpoint, not GET pixel.**

A 1×1 GET pixel call would also work (older pattern), but POST is cleaner: no URL-length concerns, no caching weirdness, fits the existing EF pattern. Storefront calls `fetch()` not `<img>`.

**D2. `keepalive: true` on the fetch call.**

Users close tabs after seeing thank-you page. Without keepalive, a request issued at the very end of page lifecycle is cancelled. `keepalive: true` lets it complete after page unload. Universal browser support (Edge 79+, FF 84+, all Chrome/Safari).

**D3. Fire-and-forget, no await, no error UI.**

This is observational telemetry, not a user-blocking action. If the POST fails, the user has already converted (form submitted, pixel fired). Failure means we miss one measurement row — not worth interrupting the user. Storefront does not await; errors silently dropped (browser console only).

**D4. UPDATE conditional on `fb_pixel_fired_at IS NULL`.**

Two reasons: (a) idempotency — second call from a refresh or back-button is a no-op; (b) integrity — preserves the FIRST pixel fire time, not the latest. The "first fire" is the meaningful one (subsequent fires are page reloads, not new conversions).

**D5. tenant_id derivation reuses storefront's existing mechanism.**

The thank-you page already knows `tenant_id` (it's how `storefront_config` is queried for `pixel_events` config). No new derivation logic; just pass it along. Executor pre-flight identifies the existing variable/function.

**D6. NO `crm_message_log` row written.**

Pixel-fire observation is metric data, not communication data. Writing to `crm_message_log` would inflate counts + pollute messaging queries. Plain `console.log` in the EF is enough for debugging.

**D7. If storefront repo PR is blocked or harder than expected, the ERP EF can ship alone.**

The EF is harmless without a caller (it just won't see any traffic). Storefront work can land in a separate PR cycle. **Do NOT delay the ERP EF for storefront.** Coordinate but don't gate.

## 7. Success Criteria

1. New EF `pixel-fired` deployed and verifiable via `mcp__71e952df...__list_edge_functions`.
2. EF source ≤ 100 lines (this is intentionally small — if growing, executor pre-flight discovered scope creep).
3. EF Origin-allowlisted to the same domains as `lead-intake` (executor pre-flight confirms the canonical list).
4. POST `{event_id: <UUID>, tenant_id: <UUID>}` returns 200 + `{updated: 1}` for the first call with valid params.
5. Second call with same `event_id` returns 200 + `{updated: 0}` (idempotent).
6. POST with invalid UUID → 400 + error message.
7. POST with origin not in allowlist → 403.
8. Storefront thank-you-page (all language variants) issues the POST after `fbq` fires, with `keepalive: true`.
9. End-to-end demo test: storefront form submit → thank-you page → `crm_leads.fb_event_id` populated → `crm_leads.fb_pixel_fired_at` populated within 5 seconds.
10. Smoke 7/7 PASS on both repos.
11. Iron Rule 31 integrity gate passes.
12. `docs/FB_CAPI.md` updated: back-wire IMPLEMENTED.
13. `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md` §4 updated: caveat banner removed from P2.2b dependency.
14. Memory `project_fb_capi_p21_state.md` updated: back-wire shipped.
15. Both repos commit clean, working trees clean.

## 8. Stop-Triggers

The Executor MUST stop on any of:

- Existing EF or RPC found that already does pixel-fire back-wire → STOP, Rule 21 violation by Brief.
- Storefront repo lacks a derivable `tenant_id` at thank-you-page time → STOP, scope was wrong.
- POST fails E2E test → STOP, debugging required.
- More than one thank-you-page firing path exists in storefront (e.g., legacy + new) → STOP, scope was wrong.
- Iron Rule 31 integrity gate fails.
- Smoke regresses.

## 9. Rollback Plan

Per-commit annotated tags `pre-pixel-backwire-{step}`. Worst-case rollback:
- Undeploy `pixel-fired` EF (Edge Function — safe to remove).
- Revert storefront commit (removes POST call, no data lost).
- Doc reverts.

Both rollbacks atomic via tag. Existing `fb_event_id` substrate untouched.

## 10. Expected Final State

- ERP repo: 1-2 commits (EF + docs).
- Storefront repo: 1-2 commits (thank-you-page POST + docs).
- New EF live on Supabase.
- Demo E2E test passing.
- Working trees clean both repos.

## 11. Commit Plan

Indicative.

**ERP repo:**
- C1: EF `pixel-fired/index.ts` + deploy.
- C2: docs update + memory update + KNOWLEDGE_MAP §4 update.

**Storefront repo:**
- C3: thank-you-page POST (HE/EN/RU + multi variants).
- C4: storefront docs update (FB_CAPI_HANDOFF.md).

## 12. Out-of-Scope (explicit)

- Dashboard tile (P2.2b — next SPEC after this).
- Backfilling historical leads' `fb_pixel_fired_at`.
- Changes to pixel firing logic itself.
- Reports/views consuming `fb_pixel_fired_at` beyond P2.2b.
- Meta API polling (P2.3-FB-CAPI-POST-LAUNCH-MONITORING — separate SPEC, gated on prizma token).

## 13. Cross-References

- `M4_FB_CAPI_HYBRID_DEDUPLICATION` (P2.1 ERP substrate, closed 2026-05-15).
- `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF` (P2.1 storefront half, closed 2026-05-15).
- `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md` §4 + §6 — this Brief implements the §6 SPEC stub option B.
- `docs/FB_CAPI.md` §"Optional back-wire" — this Brief makes it non-optional.
- Memory: `project_fb_capi_p21_state.md`.

## 14. Author Notes

Smallest SPEC in the FUNNEL Phase 2 chain. 1-2 hours total. Closes a measurement gap that would otherwise make P2.2b dashboard useless. After this lands:
- ERP knows whether the pixel actually fired vs CAPI was just dispatched.
- Dashboard tile from P2.2b will surface true measurement gaps (network failures, ad-blockers, redirect issues), not false positives.
- The full FUNNEL Phase 2 measurement loop is closed.

---

*End of Brief. Activation Prompt in sibling file `M3_FUNNEL_PIXEL_BACKWIRE_ACTIVATION_PROMPT.md`.*
