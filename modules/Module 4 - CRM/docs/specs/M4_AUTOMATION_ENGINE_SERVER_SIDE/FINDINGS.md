# FINDINGS — M4_AUTOMATION_ENGINE_SERVER_SIDE Rung 1

> **Executor:** opticup-executor (Claude Code, Windows desktop)
> **Date:** 2026-05-03
> **3 findings logged.**

---

## F-1 — HIGH: Browser `crm-automation-queue-send.js` has the same
partial-unique-index ON CONFLICT bug; never queued anything historically

**Severity:** HIGH
**Location:** `modules/crm/crm-automation-queue-send.js:99-106`
**Description:** The browser-side queue_send helper uses the same
`upsert(rows, { onConflict: 'tenant_id,event_id,lead_id,template_slug,
channel', ignoreDuplicates: true })` pattern that fails server-side
because `uq_crm_message_queue_idem` is a PARTIAL unique index (WHERE
status IN queued/processing/sent) and PostgREST does not emit the
matching predicate. Postgres raises "no unique or exclusion constraint
matching the ON CONFLICT specification". The browser engine catches
this error silently:

```js
if (insRes.error) {
  console.error('CrmAutomationQueueSend insert:', insRes.error);
  return { queued: 0, leadIds: leadIds };
}
```

**Evidence:**
- Postgres logs (2026-05-03 06:48-07:02 UTC) repeatedly show the ON
  CONFLICT constraint error.
- Direct DB query: `SELECT COUNT(*) FROM crm_message_queue WHERE
  tenant_id = '6ad...' AND template_slug IN ('event_2_3d_before',
  'event_day')` → 0 rows lifetime.
- Browser engine T8 / T9 rules have NEVER queued a single message in
  prizma history. The bug existed since `queue_send` was introduced in
  P5_V2_REBUILD_RUNG2_RULES_REWIRE (2026-04-28) but symptom was
  invisible because operators rarely fire status_change for those
  newStatus values from the UI, AND the cron didn't call the engine
  pre-Rung-1.

**Suggested next action:** Rung 2 of this SPEC will route the browser
through the new EF, transparently fixing this. If Rung 2 slips
post-cutover, file a hotfix SPEC `M4_BROWSER_QUEUE_SEND_HOTFIX` to
apply the same SELECT-then-INSERT pattern in
`crm-automation-queue-send.js`.

---

## F-2 — MEDIUM: `crm_event_attendees` has no `updated_at` column

**Severity:** MEDIUM (data hygiene)
**Location:** `crm_event_attendees` table (no schema file change in
this Rung).
**Description:** During cleanup, `UPDATE crm_event_attendees SET
is_deleted = true, updated_at = now()` failed with `column "updated_at"
of relation "crm_event_attendees" does not exist`. The
`is_deleted=true` UPDATE on its own succeeded.

**Evidence:** SQL execution error during Rung 1 cleanup.

**Implication:** soft-deletes / status changes on the attendees table
have no audit timestamp. Other CRM tables (e.g. `crm_leads`) DO have
`updated_at`. This is an inconsistency.

**Suggested next action:** add `updated_at TIMESTAMPTZ DEFAULT now()`
+ a trigger to maintain it, OR document why this table intentionally
omits it. File as `M4_ATTENDEE_AUDIT_TIMESTAMP` post-cutover. Not
blocking.

---

## F-3 — INFO: `mcp__claude_ai_Supabase__get_logs` (service: `edge-function`)
returns access logs only, not console output

**Severity:** INFO (tooling)
**Location:** Supabase MCP client.
**Description:** The Edge Function log retrieval tool surfaces only the
HTTP access line (`POST | 200 | https://...`) per request, not the
EF's `console.log/warn/error` output. To see in-function logging during
debug, the only option I found was to either (a) bake diagnostic info
into the EF response body, or (b) read postgres logs (which surface
backend errors but not arbitrary EF console output).

**Evidence:** Tried `get_logs` with `service: edge-function` 3 times
during Rung 1 debug; only access lines returned. Confirmed the
deployment_id appeared but the log entries had no `console.log`
content.

**Suggested next action:** Either (a) document this in opticup-executor
SKILL.md so future executors don't waste time, or (b) check if there's
a separate Supabase log service that surfaces function runtime output
(`function_logs` vs `function_runtime_logs` API distinction).

---

*End of FINDINGS. 3 findings: 1 HIGH (browser parity bug), 1 MEDIUM
(attendees audit gap), 1 INFO (tooling).*
