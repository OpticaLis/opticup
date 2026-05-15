# M4_FB_CAPI_HYBRID_DEDUPLICATION — Architecture Brief

> **Status:** Brief sealed 2026-05-15 evening · Owner: Architect · Pipeline: Full-Auto
>
> **One-line:** Add server-side Facebook Conversions API (CAPI) alongside the existing browser pixel, with shared `event_id` for Meta-side deduplication, so ROAS measurement stops under-counting whenever a thank-you-page load fails or an ad-blocker strips the pixel.

---

## 1. Goal

Ship a hybrid Pixel + CAPI implementation for Lead events (storefront supersale form is the high-volume case; Q7 thank-you-page model preserved). Browser pixel fires as today on thank-you-page load; server-side CAPI fires from a new Edge Function the moment `crm_leads` is created. Both events carry the same `event_id` so Meta deduplicates and treats them as one conversion. Match quality lifted from cookie-only (`_fbp` + `_fbc`) to advanced matching (`em` + `ph` + cookies). `tenants.fb_capi_token` becomes the per-tenant config knob — Prizma populated, other tenants opt-in.

## 2. Background

**Why this Brief exists:**

Phase 1 funnel infrastructure closed 2026-05-14 (P1.1/P1.2/P1.3/P1.4 — UTM triple-layer + broadcast_id propagation + short-link migration + RPC map). Measurement chain is intact end-to-end on demo. But the **Facebook side** of the funnel still measures with the same gap that prompted Daniel's directive: "Sending purchases is important — defer but right after we finish what we must do now we'll do this too."

The infrastructure already exists, dormant:
- `tenants.fb_capi_token` column — empty on Prizma. Storefront-settings UI editor `storefront-config.analytics.fb_capi_token` is wired to write it (verified at `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` line 457).
- Make scenario 8542928 (`שליחת רכישות לפייסבוק`) — exists, **INACTIVE**. Was the would-be CAPI sender. Verified inactive via Make MCP during 2026-05-14 knowledge-build SPEC.
- Browser pixel today: `fbq('track', 'Lead')` fires only when URL matches `/successfulsupersale/` etc. If the post-submit redirect fails, the lead lands in our DB but Facebook never gets a `Lead` event → ROAS under-counts.

**Daniel's Q7 decision (preserved by this SPEC):** "I want 100% real info — so if someone fills the form AND reaches thank-you, only then they're counted as a real lead." Hybrid Pixel + CAPI ensures the pixel-side fires reliably; Meta still only credits thank-you-page conversions because that's the URL the browser pixel binds to. CAPI fires earlier (at row insert) but carries the same `event_id` — Meta deduplicates, the thank-you-page pixel wins precedence, the lead is counted once.

**Make scenario 8542928 fate:** retired. See D1.

## 3. Scope

**In scope:**

- New Edge Function `fb-capi-dispatch` (verify_jwt=false but Origin-allowlisted; same security posture as `lead-intake` + `submit-lead`).
- Trigger path: DB AFTER INSERT trigger on `crm_leads` writes a row to a new `crm_capi_dispatch_queue` table; pg_cron consumer (1-minute) reads queued rows + invokes `fb-capi-dispatch` EF per row. The queue absorbs FB API hiccups and gives us idempotency.
- Hybrid `event_id` contract: storefront pixel generates a UUID at form-submit time, sends it as a hidden field with the form payload, stores it on `crm_leads.fb_event_id`. Browser-side pixel fires `Lead` on thank-you-page with the same `event_id`. Meta deduplicates server-side.
- Advanced matching parameters: `em` (sha256 lowercase email), `ph` (sha256 E.164 phone) added alongside existing `_fbp` / `_fbc` cookie params. Match quality lift verified server-side before each dispatch.
- Tenant config: `tenants.fb_capi_token` (already exists), `tenants.fb_pixel_id` (likely already exists in `storefront_config.analytics.facebook_pixel_id` — executor pre-flight verifies). Multi-tenant from day 1 — Prizma populated with real token; demo populated with sandbox token (sandbox token to be supplied by Daniel pre-execution if needed, otherwise demo skips CAPI dispatch with a logged warning).
- Pixel validation gap reporting (P2.2 partial overlap — see D5): the dispatch queue's `status='no_match'` entries are countable; surface a daily count to Sentinel or a future site-overseer dashboard.
- Documentation: `docs/FB_CAPI.md` (canonical reference) + Site Overseer KNOWLEDGE_MAP.md update (Gap #5 closed).

**Out of scope:**

- Purchase events. The Brief title says "deduplication" — Lead events are the high-volume case and the proof-point. Purchase events get a follow-up SPEC `M4_FB_CAPI_PURCHASE_EVENTS` after Lead events are stable for 7 days (≥ 200 dispatched events validated against Meta Events Manager).
- WhatsApp Lead events from QR walk-in registration (`/quick-register/`). Different funnel, different attribution model. Out of scope.
- Custom events / standard events beyond `Lead`. We start with `Lead`; future events plug into the same queue + EF + registry.
- Re-architecting the storefront pixel. The pixel stays where it is; this SPEC only adds the CAPI dispatch side + the shared `event_id` substrate.
- Make scenario 8542928 itself. It is being retired (D1) — but cleanup of the inactive scenario is a separate one-line task done at end of SPEC, not infrastructure work.

## 4. Destructive Operations

Per Iron Rule 32:

1. Delete (or archive within Make) scenario 8542928 (`שליחת רכישות לפייסבוק`, currently inactive) at SPEC end as cleanup. Executor decides delete-vs-archive based on whether Make MCP supports archive for inactive scenarios; either way, the live state must reflect "8542928 is gone or marked retired."

No other destructive ops authorized. The new `crm_capi_dispatch_queue` table is additive. The `crm_leads.fb_event_id` column is additive. The Edge Function is new. If the executor finds a need for any other destructive op mid-run, STOP and escalate.

## 5. Pipeline

Standard Full-Auto Pipeline:

1. **Foreman (opticup-strategic)** authors `SPEC.md` from this Brief.
2. **Executor (opticup-executor)** implements DB schema + EF + storefront wiring + tenant config + documentation. Heavy DB-policy + EF work — recommend Sonnet model selection per STOREFRONT_PUBLIC_DATA_LAYER session lesson (Opus hit 3 API content-filter refusals on heavy security-vocabulary phases; Sonnet is mechanical-better + cheaper for EF + SQL).
3. **Reviewer (opticup-reviewer)** validates Iron Rule compliance — especially Rule 15 (canonical RLS pattern on new table), Rule 22 (defense-in-depth tenant_id), Rule 23 (no secrets in code — token reads from DB), Rule 14 (tenant_id on new table), Rule 18 (UNIQUE constraints tenant-scoped).
4. **Localhost-Tester** runs smoke 7/7 + Meta Events Manager Test Events validation (manual one-time check with Meta test event code; executor instructions in SPEC).
5. **Foreman closes** with FOREMAN_REVIEW.md + 4 skill-improvement proposals.

## 6. Locked Decisions

**D1. New Edge Function `fb-capi-dispatch`, retire Make scenario 8542928.**

Why EF over Make: (a) dedup requires `event_id` round-trip between browser pixel and server-side dispatch — easier to guarantee atomic in an EF that reads from our own DB; (b) advanced matching (`em` + `ph` SHA-256 hashing) is a server-side responsibility — natural EF fit; (c) Messaging Architecture v2 (per memory `project_messaging_architecture_v2.md`) explicitly says Make = pipe yo, zero DB access; CAPI needs to enrich each event with `crm_leads` data → must be EF; (d) future tenants need this — leaving it in Make creates per-tenant scenario duplication, which is the SaaS-axis trap.

**D2. Hybrid `event_id` model: UUID generated on form-submit, hidden field on form payload, stored on `crm_leads.fb_event_id`, shared with thank-you-page pixel via URL param or sessionStorage hand-off.**

Storefront generates UUID at submit time → POSTs to `lead-intake` EF with the UUID → `crm_leads.fb_event_id` populated → thank-you-page pixel reads the same UUID (URL param or sessionStorage) → fires browser-side `Lead` event with that same `event_id`. Meta dedup sees both events with same `event_id` and same `event_name='Lead'` within their 7-day window → counts once. Thank-you-page wins precedence per Meta's default behavior (latest wins for same event_id).

**D3. Queue-and-pg_cron-consumer pattern, NOT direct EF invocation from DB trigger.**

Why: (a) FB CAPI API can be flaky — 5xx errors, rate limits, token expiry; (b) DB triggers cannot retry on failure; (c) queue lets us absorb hiccups and replay; (d) pattern mirrors `crm_message_queue` + `dispatch-queue` consumer from CRM module — Iron Rule 21 (No Duplicates) means we reuse the established pattern, not invent a new "trigger-direct-invoke EF" pattern. Consumer runs every 1 minute via pg_cron; claims rows with `FOR UPDATE SKIP LOCKED`; dispatches per row; updates status to `sent` / `failed` / `no_match` (no email + no phone = no_match, advanced matching impossible, dispatch skipped).

**D4. Advanced matching: `em` + `ph` always sent when available; cookies always sent when available.**

We send the union, not the intersection. Meta's match-quality scoring rewards each parameter independently. Hashing per Meta spec: lowercase, trim, SHA-256, hex digest. Phone normalized to E.164 (+972…). Email lowercased and trimmed. No PII leaves Supabase in plaintext — the EF hashes before the API call.

**D5. Pixel validation gap reporting is in scope as a queue-status side-effect, not as a separate dashboard.**

P2.2 was originally a separate SPEC (`M3_PIXEL_VALIDATION_GAP_REPORTING`, 2-3 hrs). Because this SPEC produces `crm_capi_dispatch_queue` with status enum, the "dispatched server-side but pixel never fired browser-side" gap becomes measurable from this queue's rows joined against `crm_leads.fb_pixel_fired_at` (new boolean we add). P2.2 reduces to a one-page dashboard query — descope from a separate SPEC to a follow-up that takes 30-60 min. **Net:** ship the substrate here, ship the dashboard view later. Saves a context switch.

**D6. Per-tenant token storage stays in `tenants.fb_capi_token` (existing) — not in a new secrets table.**

Iron Rule 23 says no secrets in code. The token in DB is encrypted at rest by Supabase; RLS prevents anon/staff from reading other tenants' tokens. Service-role reads in EF only. SaaS-axis-clean: tenant 2 onboarding sets their token via storefront-settings UI; zero code change.

**D7. Demo tenant: real CAPI dispatch with sandbox token, OR no-op with warning logged.**

Daniel decides at SPEC dispatch time. Default (if Daniel doesn't supply sandbox token): demo's CAPI dispatch is a logged no-op with `status='skipped_no_token'`. Prizma always dispatches (real token to be supplied by Daniel at SPEC dispatch).

## 7. Success Criteria

Every criterion measurable. SPEC author fills exact expected values.

1. Edge Function `fb-capi-dispatch` deployed and verifiable via `mcp__71e952df...__list_edge_functions`.
2. `crm_capi_dispatch_queue` table exists with Iron Rule 14/15/18 compliance (tenant_id, RLS canonical, tenant-scoped UNIQUE if any).
3. `crm_leads.fb_event_id` and `crm_leads.fb_pixel_fired_at` columns added (additive, nullable).
4. pg_cron job `fb_capi_dispatch_consumer` exists with 1-minute schedule.
5. Storefront supersale form generates UUID per submission, sends as hidden field, receives confirmation.
6. Thank-you-page pixel reads same UUID and fires `fbq('track', 'Lead', {}, {eventID: '<uuid>'})`.
7. Demo end-to-end test: form submit → `crm_leads` row created with `fb_event_id` populated → queue row inserted → cron tick → EF invoked → Meta Test Events shows dedup'd event.
8. Prizma `tenants.fb_capi_token` populated; demo populated OR sandbox-skip mode active.
9. Smoke 7/7 PASS post-change.
10. Iron Rule 31 integrity gate passes at staged + full mode.
11. Make scenario 8542928 is retired (deleted or marked archived per executor's check on Make MCP capabilities).
12. `docs/FB_CAPI.md` exists and documents: contract, event_id flow, advanced matching, queue mechanics, replay procedure.
13. `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` updated: Gap #5 (browser pixel binds to thank-you-page) marked CLOSED via P2.1 with note explaining how dedup preserves Q7 thank-you-only conversion model.
14. All commits land on `develop`; working tree clean at SPEC close.

## 8. Stop-Triggers

The Executor MUST stop on any of:

- `tenants.fb_capi_token` schema differs from expectation (e.g., column moved to `storefront_config` JSONB instead of `tenants` column — executor pre-flight discovers actual location).
- `storefront_config.analytics.facebook_pixel_id` not found where KNOWLEDGE_MAP.md says it is.
- Make MCP `scenarios_delete` or `scenarios_archive` fails for 8542928 → escalate (do not silently skip cleanup).
- Meta Test Events check returns dedup failure (two events counted instead of one) → escalate before retrying.
- Storefront `submit-lead` EF cannot be modified without storefront repo PR → escalate; storefront-side change happens in sibling repo per its CLAUDE.md.
- Iron Rule 31 gate fails at any commit boundary.
- More than one `crm_capi_dispatch_queue`-like substrate already exists in DB (Rule 21 violation — find and reuse, don't create duplicate).

## 9. Rollback Plan

Per-commit annotated tags: `pre-fb-capi-{step}`. Worst-case rollback:
- Drop `crm_capi_dispatch_queue` (additive table, safe drop).
- Drop columns `fb_event_id` + `fb_pixel_fired_at` from `crm_leads` (additive, safe).
- Unschedule pg_cron job.
- Undeploy `fb-capi-dispatch` EF.
- Storefront commit revert.

Roll back atomic via tag `pre-fb-capi-start`. No data destruction.

## 10. Expected Final State

- Working tree clean on `develop`.
- 1 new EF (`fb-capi-dispatch`).
- 1 new table (`crm_capi_dispatch_queue`).
- 2 new columns on `crm_leads` (`fb_event_id`, `fb_pixel_fired_at`).
- 1 new pg_cron job.
- 1 storefront change (UUID generation + hidden field + thank-you-page pixel update).
- 1 new doc (`docs/FB_CAPI.md`).
- 1 KNOWLEDGE_MAP update (Gap #5 marked CLOSED).
- 1 Make cleanup (scenario 8542928 retired).
- Smoke + integrity GREEN.

## 11. Commit Plan

Indicative. Executor adjusts after pre-flight.

- C1: DB migration — `crm_capi_dispatch_queue` table + RLS + columns on `crm_leads` + pg_cron job.
- C2: Edge Function `fb-capi-dispatch` (TS source + deploy).
- C3: Storefront repo PR — UUID generation at form-submit, hidden field, thank-you-page pixel update with `eventID`.
- C4: `lead-intake` EF update — accept `fb_event_id` field, store on `crm_leads`, enqueue dispatch row.
- C5: Documentation — `docs/FB_CAPI.md` + KNOWLEDGE_MAP update.
- C6: Make scenario 8542928 retirement.
- C7: Tenant config — Prizma `fb_capi_token` populated, demo skip-or-sandbox.
- C8: Retrospective (EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW).

## 12. Out-of-Scope (explicit)

- Purchase events (follow-up SPEC `M4_FB_CAPI_PURCHASE_EVENTS` after 7-day Lead stability).
- WhatsApp QR-walk-in Lead attribution (different funnel).
- Pixel validation gap dashboard UI (P2.2 reduced to follow-up dashboard query — substrate ships here).
- Custom or standard events beyond `Lead` for v1.
- Storefront pixel architecture rework.
- Make scenario 8542928 logic reconstruction — it is being retired, not migrated.
- Phase 2.5 Funnel Health Dashboard.

## 13. Cross-References

- `roles/site-overseer/FUNNEL_ROADMAP.md` Phase 2, P2.1.
- `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` Gap #5 (line 557).
- Memory: `feedback_utm_architecture.md`, `project_messaging_architecture_v2.md` (Make = pipe-only).
- DECISIONS_LOG cross-module entry to be added at SPEC close.
- Iron Rules 14, 15, 18, 21, 22, 23, 31, 32.

## 14. Author Notes

This is the largest measurable business-value SPEC in the current queue. Phase 1 made our funnel data internally correct; P2.1 makes Facebook's measurement of our funnel correct. Daniel's quote anchors the priority: *"Sending purchases is important!"* — even though this SPEC ships Lead events first, it builds the substrate for the purchase-events SPEC that follows.

The Make-vs-EF decision (D1) is the most important architecture call here. Make is being retired from the data path entirely; this is consistent with Messaging v2 + the broader move from "Make as application" to "Make as pipe."

---

*End of Brief. Activation Prompt in sibling file `M4_FB_CAPI_HYBRID_DEDUPLICATION_ACTIVATION_PROMPT.md`.*
