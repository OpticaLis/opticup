# SPEC — M4_AUTOMATION_ENGINE_SERVER_SIDE

> **Author:** Campaign Overseer (Cowork session) acting as SPEC drafter; Foreman review pending.
> **Date:** 2026-05-03 morning
> **Status:** DRAFT — Foreman to review + split into Rungs.
> **Pre-cutover priority:** HIGH — surfaced as finding **H-004** (with improvement proposal **IP-02**) in QA night-run report 2026-05-03 (HIGH severity); Daniel directive 2026-05-03 morning: "ship before cutover, replace not coexist". (Citation corrected 2026-05-03 per FOREMAN_REVIEW §2.2 finding 1 — the original draft cited "IP-04" which is an unrelated storefront-UX finding.)
> **Cutover-blocker?** Daniel-decided: **YES** for Phase 1 (event lifecycle automation must run server-side or no Sunday-morning cutover).

---

## 1. Why this SPEC exists

The CRM automation engine — the code that decides "now is the moment to fire T1 / T5 / T8 / T9" — currently lives in the **browser**. Specifically:

- `modules/crm/crm-automation-engine.js` (326 lines) loads in the CRM admin HTML and exports `window.CrmAutomation.evaluate(triggerType, triggerData)`.
- All its 5 callers (`crm-event-actions.js`, `crm-event-register.js`, `crm-lead-actions.js`, `crm-attendee-move.js`, `crm-payment-automation.js`) fire from user gestures inside the CRM UI (clicking "open registration", saving an event status change, manually moving an attendee, etc.).
- The "fresh-lead" path in the `lead-intake` Edge Function does fire server-side, but the rest does not.
- The only server-side scheduling that exists today is `dispatch_queue` (drains `crm_message_queue` every minute) and `event_day_status_flip` (flips `status='event_day'` at 05:30 UTC = 08:30 Israel).

**Concrete operational risk this creates:**

1. T8 (3-day-before-event reminder) and T9 (event-day morning) only fire if a CRM operator has the admin tab open at the right moment AND clicks the right gesture. If the team closes the CRM Friday evening and goes on a weekend — Saturday's T9 simply never fires.
2. Lead-status-change automations (e.g., `lead_status_change` trigger) only fire when an operator changes the status manually. There is no server-side time-based trigger.
3. The `crm_automation_runs` history table only records runs that happened in a browser tab. It is structurally impossible to schedule rules from the server today.

This violates Iron Rule 20 (SaaS litmus test) — a second tenant joining the platform would inherit a system that depends on someone always having a browser open.

QA night-run 2026-05-02 evening confirmed (see `modules/Module 4 - CRM/docs/specs/QA_NIGHT_RUN_2026_05_03/REPORT.md`, finding **H-004** + improvement proposal **IP-02**). Verdict: ship before cutover.

---

## 2. Goal

Move the automation **engine** (rule loading, condition evaluation, recipient resolution, plan building) from the browser to the server, so that:

1. Every automation rule can be triggered from a server-side context (Edge Function, pg_cron, dispatch-queue worker) — not just from a CRM UI gesture.
2. Time-based rules (T8 "3 days before", T9 "event morning") fire on schedule regardless of who is logged in.
3. The browser engine is **removed** — no dual-mode coexistence. Single source of truth for rule execution lives in the EF.
4. The existing `CrmConfirmSend` confirmation gate (the "preview + approve" UX in the CRM UI) keeps working — it is a separate concern from where the engine evaluates.

---

## 3. What exists today

### 3.1 Browser-side engine (to be removed in Rung 3)

- `modules/crm/crm-automation-engine.js` — the engine entry point.
- `modules/crm/crm-automation-dispatch.js` — direct-dispatch fallback (when CrmConfirmSend not loaded).
- `modules/crm/crm-automation-recipient-resolvers.js` — recipient resolution (lead lookups by trigger type).
- `modules/crm/crm-automation-queue-send.js` — queues into `crm_message_queue`.
- `modules/crm/crm-automation-post-actions.js` — after-dispatch state transitions (`promoteWaitingLeadsToInvited`, attendee upsert).

### 3.2 Server-side primitives that already exist

- `dispatch-queue` Edge Function (drains `crm_message_queue` → calls `send-message` per row). Runs every minute via pg_cron.
- `send-message` Edge Function (renders template, dispatches via Make).
- `lead-intake` Edge Function (fires T1/T5 inline on form submit — has its own dispatch helper, not using the engine).
- `crm_automation_rules` table (rule definitions).
- `crm_automation_runs` table (audit trail — currently written by browser engine).
- `crm_message_queue` table (scheduled future sends).
- `crm_message_log` table (delivery audit).
- 5 condition types in browser engine: `always`, `status_equals`, `count_threshold`, `source_equals`.
- 4 trigger types currently supported by browser engine: `event_status_change`, `event_registration`, `lead_status_change`, `lead_intake`, `attendee_moved`.

### 3.3 Schedule-based gaps (current pain points)

- T8 ("3 days before event"): no scheduled trigger. Must be fired by an operator manually OR by a cron not yet built.
- T9 ("event day morning"): `event_day_status_flip` flips event status at 08:30 Israel — but the automation rule for T9 only fires if a browser is open and a gesture happens. The flip alone doesn't invoke the engine.
- Lead-level periodic rules (e.g., "lead has been in 'waiting' status 14 days — escalate"): no time-based trigger exists at all.

---

## 4. Iron Rule check

| Rule | Applies | Notes |
|---|---|---|
| 1 (atomic quantity) | N/A | No quantity changes here |
| 7 (API abstraction) | YES | EF must call DB through service-role client; use the same patterns as send-message + lead-intake |
| 9 (no hardcoded business values) | YES | Tenant config (timezone for "08:30 Israel" etc.) must come from `tenants.config` |
| 10 (global name collision) | YES | New `automation-engine` EF + new SQL function names must not collide with existing |
| 11 (atomic sequential) | N/A | No sequential numbers generated |
| 13 (views-only external) | N/A | This is internal-only |
| 14/15 (tenant_id + RLS) | YES | New EF accepts tenant_id explicitly; SQL functions filter by tenant_id |
| 18 (UNIQUE tenant-scoped) | N/A | No new UNIQUE constraints |
| 20 (SaaS litmus) | YES — this rule is the entire reason the SPEC exists | New tenant must inherit a working scheduled engine |
| 22 (defense-in-depth on writes) | YES | Every INSERT in the new EF passes `tenant_id` explicitly |
| 23 (no secrets) | YES | EF reads secrets from env, not from code |
| 31 (integrity gate) | YES | All Rungs gated by `verify:integrity` exit 0 |

---

## 5. Proposed shape

### 5.1 New Edge Function: `automation-engine`

Path: `supabase/functions/automation-engine/index.ts`

Responsibility: the server-side equivalent of the browser engine's `evaluate(triggerType, triggerData)`.

Contract:
```
POST /functions/v1/automation-engine
Body: {
  tenant_id: string (required)
  trigger_type: 'event_status_change' | 'event_registration' | 'lead_status_change'
              | 'lead_intake' | 'attendee_moved' | 'event_time_window'    // NEW
  trigger_data: { ... per trigger_type, same shape as browser today }
}
Returns: {
  run_id: string | null
  fired: number
  sent: number      // direct-dispatch path; 0 if rules use queue_send
  failed: number
  rejected: number
  queued: number    // queue_send path
  skipped: number
}
```

Internal structure: a port of the existing browser engine logic (it is well-factored — 326 lines across 5 files). The port preserves:
- `TRIGGER_TYPES` map
- `CONDITIONS` evaluators
- `prepareRulePlan` flow (resolve recipients → build vars → fetch templates → emit plan items OR queue_send)
- `crm_automation_runs` row creation + finalization
- post-action hooks (status transitions, attendee upsert)

**What's deliberately NOT ported:** the `CrmConfirmSend` confirmation UX. That stays in the browser as a UI-only concern that *invokes* the EF and renders the returned plan items for approval before the EF dispatches. Rung 2 details below.

### 5.2 NEW trigger type: `event_time_window`

A new server-only trigger that lets time-based rules fire from `pg_cron`. Use cases:
- T8: 3 days before event (window = 3d-before-event-date at 09:00 Israel)
- T9: event-day morning (window = event-date at 09:00 Israel)
- Future: lead-aging escalations, payment-reminder cadence, etc.

Rule shape: `trigger_entity='event'`, `trigger_event='time_window'`, `trigger_condition` JSON includes `{ type: 'time_window', offset_days: -3, time_of_day: '09:00', tz: 'Asia/Jerusalem' }`.

The new condition evaluator `time_window` checks current time vs `event_date + offset_days at time_of_day in tz`, with a tolerance band (e.g., ±15 minutes around the target moment). The pg_cron job that drives it runs every 15 minutes. Idempotency: a per-rule, per-event "last fired" marker (new column or per-rule kv table) prevents double-firing.

### 5.3 New pg_cron job: `automation_engine_time_windows`

```sql
SELECT cron.schedule(
  'automation_engine_time_windows',
  '*/15 * * * *',  -- every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/automation-engine',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon>"}'::jsonb,
    body := '{"trigger_type":"event_time_window","fanout":"all_active_tenants"}'::jsonb
  );
  $$
);
```

The EF, on receiving a `fanout='all_active_tenants'` payload, iterates active tenants and evaluates `event_time_window` rules per tenant.

### 5.4 Browser-side caller refactor (Rung 2)

The 5 existing callers stop calling `window.CrmAutomation.evaluate(...)` directly. Instead they call a thin wrapper `CrmAutomationClient.evaluate(triggerType, triggerData)` that:
1. POSTs to `/functions/v1/automation-engine` with `dry_run=true`.
2. Receives back `planned_items` (the same shape the browser engine builds today).
3. Renders the existing `CrmConfirmSend` modal.
4. On approve → POST again with `dry_run=false` (or with the approved plan). EF dispatches.

This is the surgical path that preserves the UX (confirmation modal) while moving the *engine logic* to the server. The browser keeps **zero** rule-evaluation code.

### 5.5 Browser-side files removed (Rung 3)

After Rung 2 ships and is verified:
- `modules/crm/crm-automation-engine.js` — DELETED
- `modules/crm/crm-automation-dispatch.js` — DELETED
- `modules/crm/crm-automation-recipient-resolvers.js` — DELETED
- `modules/crm/crm-automation-queue-send.js` — DELETED
- `modules/crm/crm-automation-post-actions.js` — DELETED

Replaced by:
- `modules/crm/crm-automation-client.js` — thin client (~80 lines): preview → confirm → dispatch round-trip.

`crm-payment-automation.js` keeps its wrapper role (it sits AROUND the engine call; the engine call itself moves to the EF).

### 5.6 Migration backfill (Rung 1)

T8 + T9 rules in `crm_automation_rules` need their `trigger_event` updated from current values to `time_window` and `trigger_condition` populated with the new shape. A one-shot UPDATE migration handles this for prizma + demo. Future tenants get them seeded via `seed-crm-automation-rules-demo.sql`.

---

## 6. Success criteria

1. EF `automation-engine` deployed to Supabase, `[functions.automation-engine]` block in config.toml with `verify_jwt = true`.
2. EF returns the same `evaluate()` contract for every trigger type the browser engine supports today (parity test on prizma).
3. New trigger type `event_time_window` fires on schedule via pg_cron job, evaluated within ±15 min of target.
4. T8 fires server-side 3 days before any prizma event (verified by inserting a test event with `event_date=now+3d` and observing the message_log).
5. T9 fires server-side at 09:00 Israel on event day (verified by setting an event to `event_date=today` and observing the message_log).
6. CRM admin UI: clicking "open registration" still shows the confirmation modal, still waits for approval, still dispatches on approve. Zero UX regression.
7. The 5 trigger types (`event_status_change`, `event_registration`, `lead_status_change`, `lead_intake`, `attendee_moved`) all run through the EF and produce identical `crm_automation_runs` + `crm_message_log` rows compared to the browser implementation pre-cutover.
8. Browser-side automation files (engine, dispatch, recipients, queue-send, post-actions) DELETED from the repo. Only `crm-automation-client.js` (new, thin) remains.
9. `verify:integrity` exit 0.
10. Pre-commit hooks pass.

---

## 7. Autonomy envelope

- Rung 1 (schema + EF deploy + cron job): execute autonomously after Foreman approval. Schema migration on prizma is non-destructive (UPDATE on existing rules).
- Rung 2 (browser client refactor): execute autonomously; preserves UX.
- Rung 3 (delete old browser files): requires Daniel sign-off because it's irreversible without a revert. Don't auto-delete.

---

## 8. Stop triggers

- EF dispatch test on prizma produces a different `crm_message_log` row pattern than the browser engine pre-cutover → STOP.
- Confirmation modal in CRM UI breaks → STOP.
- pg_cron job fails 3 consecutive runs → STOP, investigate before retrying.

---

## 9. Rollback

- Rung 1: drop the cron job + revert the rule UPDATE (pre-state captured in EXECUTION_REPORT).
- Rung 2: revert the caller wrapper to direct `CrmAutomation.evaluate` (browser engine still present, untouched).
- Rung 3: `git revert` of the delete commits + redeploy old static assets.

---

## 10. Out of scope

- The 4 HIGH non-blocking findings from QA night-run (international-phone form spam, hardcoded storefront origin, doc drift, browser engine itself — this SPEC closes the engine one). The other three are deferred to post-cutover SPECs (logged in tech-debt).
- Rewriting the lead-intake EF's inline T1/T5 dispatch to go through the new EF. Could be done later as a deduplication SPEC.
- Replacing CrmConfirmSend with a server-side preview API. The current confirm gate stays browser-side per Daniel decision.

---

## 11. Pre-flight checks

1. Confirm `supabase/functions/lead-intake` and `supabase/functions/send-message` patterns are still the active reference for Edge Function authoring.
2. Confirm `pg_cron` extension is enabled (it is — `dispatch_queue` runs through it).
3. Confirm `net.http_post` is the right call shape for the new cron job (it's used by `dispatch_queue`).
4. Re-read `crm-automation-engine.js` end-to-end to confirm the port is faithful — no hidden conditions or implicit browser-DOM dependencies.
5. Audit the 5 callers for any browser-only state they pass into trigger_data (DOM refs, window globals, etc.) — those need a different shape on server-side. (Spot-check from grep: the callers pass IDs + state strings only. Should be a clean port.)

---

## 12. Foreman handoff

Suggested 3-Rung split:

- **Rung 1:** EF + schema migration + cron job. Atomic ship. Fires the new server-side engine with parity to the browser engine, plus the new `event_time_window` trigger. Browser engine still present; UI still works through it. Verifiable via direct EF curl test.
- **Rung 2:** Browser callers re-routed to call EF in dry-run + approve mode. UX confirmation modal preserved. Browser engine files still present but unused.
- **Rung 3:** Delete the 5 browser engine files, ship `crm-automation-client.js` as their only replacement. Daniel sign-off required.

Time-pressure note: Daniel directive 2026-05-03 morning — Rung 1 must land before cutover (Sunday). Rung 2 + Rung 3 may slip to within 7 days post-cutover IF time runs short, but ALL three should ship same day if possible to keep the SPEC atomic.

---

## 13. Lessons from prior SPECs (Foreman: harvest into self-improvement)

- M4_LEAD_EYE_EXAM_DEFAULT discovered mid-execution that the data path went through a view, not a direct table. SPEC didn't catch it. Lesson for this SPEC: §11.4 explicitly instructs re-reading the engine source end-to-end before drafting the port. Plus §11.5 spot-checks the callers for DOM/window dependencies. Don't assume "well-factored" without checking.
- M4_CAMPAIGNS_V2 Rung 2 caught an executor confabulation when the executor said "I patched X" but had not. Mitigation: this SPEC's success criteria are concrete, observable, queryable post-deploy (rows in `crm_message_log`, cron job firing, files deleted). No "I trust the executor said it" criteria.
- The QA night-run report's **H-004** framing (with improvement proposal **IP-02**) is the source of truth for "why now." Carry the link into FOREMAN_REVIEW so future tenants see the trail from observation → SPEC. (Citation corrected 2026-05-03 — original draft mis-cited "IP-04".)

---

*End of SPEC.*
