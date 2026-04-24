# FINDINGS — WAITING_LIST_PUBLIC_REGISTRATION_FIX

---

## F1 — MCP event-register deploy returns InternalServerError — HIGH (infrastructure, blocks in-session QA)

**Severity:** HIGH
**Location:** `mcp__claude_ai_Supabase__deploy_edge_function` → function
name `event-register`.
**Description:** Second SPEC in a row where deploying `event-register` via
the MCP fails with `InternalServerErrorException: Function deploy failed
due to an internal error`. Same pattern as OPEN_ISSUE #6's resolution
note: "Pending: Manual redeploy of `event-register` EF from Daniel's
Supabase CLI — MCP deploy path failed." Content is valid; the error
comes from the deploy infrastructure, not the code.
**Suggested next action:** Raise with Supabase support (or their MCP
team). Interim workaround: manual deploy via CLI. If this becomes
systematic, consider scripting the CLI deploy so it runs without
Daniel-hand (e.g., a Make/cron job that watches for EF source changes
on the develop branch and deploys automatically).

---

## F2 — Architectural split: client runs automation rules, EFs hardcode — HIGH (architectural debt)

**Severity:** HIGH (architectural; logged as OPEN_ISSUE #19)
**Location:** `modules/crm/crm-automation-engine.js` (client only) vs
`supabase/functions/event-register/index.ts` + `lead-intake/index.ts`
(server, hardcoded templates).
**Description:** `CrmAutomation.evaluate` reads `crm_automation_rules`
and resolves recipients + dispatches — but only when JavaScript runs.
No DB trigger fires rules on `crm_events.status` UPDATE. Every
server-side entry point has to re-implement rule-like dispatch with a
hardcoded mapping. This SPEC adds a THIRD hardcoded path
(`capacity.ts` for the waiting_list transition).
**Consequence today:** adding a new rule to `crm_automation_rules` via
the admin UI does nothing for non-UI entry points unless someone also
patches the relevant EF's hardcoded list. Dev ergonomics and rule
correctness both suffer.
**Suggested next action:** OPEN_ISSUE #19 tracks the rebuild to a
`rule-evaluate` EF. Deferred to post-P7 (not a feature blocker; the
hardcodes work).

---

## F3 — `event-register` EF runtime state after deploy must be verified — INFO

**Severity:** INFO (operational reminder)
**Location:** Runtime, post-deploy.
**Description:** After manual deploy, the first public-form registration
on a cap-at-1 event will be the canary. If it doesn't transition, likely
causes: (a) deploy didn't pick up `capacity.ts` (should be listed in
Supabase dashboard's function files), (b) Deno import of
`./capacity.ts` fails at runtime (missing `.ts` extension handling on
some Deno versions — current runtime is 2.x and supports bare `.ts`
imports — verified by send-message EF's `url-builders.ts` import).
**Suggested next action:** If canary fails, check Supabase function
logs (`supabase functions logs event-register`). The current Deno
version on Supabase supports relative `.ts` imports (confirmed by
`send-message/url-builders.ts` working). No change expected here.

---

## F4 — `v_crm_event_attendees_full` view assumed to exist — LOW

**Severity:** LOW (no incident)
**Location:** `supabase/functions/event-register/capacity.ts:67`.
**Description:** The new capacity helper reads from the VIEW
`v_crm_event_attendees_full` to get JOINed lead data (full_name, phone,
email). This view is already used by `modules/crm/crm-event-day.js:70`
on the client, so it exists and RLS is already sorted. If the view is
ever dropped or renamed, this EF breaks silently (the `aRes.error`
branch logs but still returns `transitioned: true, dispatched: 0`).
**Suggested next action:** Add the view name to a central
"dependencies of server code" registry (doesn't exist yet). Low urgency.
