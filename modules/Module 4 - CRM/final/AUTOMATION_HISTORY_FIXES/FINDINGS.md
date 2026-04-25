# FINDINGS — AUTOMATION_HISTORY_FIXES

---

## F1 — send-message MCP deploy infra failure (5th+ SPEC, ongoing) — HIGH (infra)

**Severity:** HIGH (infra, not code)
**Location:** `mcp__claude_ai_Supabase__deploy_edge_function` for
`send-message`.

**Description:** Called once with the corrected source; the call
returned `InternalServerErrorException: Function deploy failed due
to an internal error`. This matches F2 from
`OVERNIGHT_M4_SCALE_AND_UI/FINDINGS.md` (5th consecutive SPEC for
this specific EF). All other EFs (retry-failed, dispatch-queue)
deploy cleanly via MCP on first try. The pattern strongly suggests
a Supabase deploy-server caching or codepath issue specific to
this EF slug + project_ref combination.

**Workaround applied:** Source on disk is correct; Daniel runs
manual CLI deploy. Documented in EXECUTION_REPORT §"Daniel
handoff".

**Suggested long-term:** Open a ticket with Supabase support
listing project_ref `tsxrrxzmdxaenlvocyit` + function slug
`send-message` + the timestamps of the failures.
The opticup-executor skill should also short-circuit MCP attempts
for this EF until the upstream issue is resolved.

---

## F2 — Historical run `6e04a16d-25f9-47e4-bf30-27b1c9fd0849` will never display correct counts — LOW

**Severity:** LOW (cosmetic, historical)
**Location:** `crm_automation_runs` row id=6e04a16d, and one
orphaned `crm_message_log` row id=`af8ea676` (or `43adb97f`).

**Description:** The bug's example run remains visible in the
history with `total=2, sent=0, rejected=0`. The fix prevents
future occurrences but does NOT backfill the past. The orphaned
SMS-rejection row has `run_id=NULL` and `crm_automation_runs`
has its `status='completed'` — `finishRun` is not idempotent and
won't be re-called for this run.

**Suggested fix (optional, NOT in scope):** A one-shot SQL
backfill that pairs orphan rows to runs by tenant + lead +
created_at proximity:

```sql
-- DRY-RUN first, READ-ONLY:
SELECT l.id AS log_id, l.lead_id, l.created_at, r.id AS run_id
FROM crm_message_log l
JOIN crm_automation_runs r
  ON r.tenant_id = l.tenant_id
 AND r.started_at <= l.created_at
 AND (r.finished_at IS NULL OR l.created_at <= r.finished_at + INTERVAL '5 seconds')
WHERE l.run_id IS NULL
  AND l.created_at > '2026-04-22'  -- after Phase 4 launched
ORDER BY l.created_at DESC;
```

Then `UPDATE crm_message_log SET run_id = …` for matched rows,
followed by recomputing counters via the new finishRun path.

**Not urgent:** the historical view is informational; new runs
work correctly post-deploy.

---

## F3 — `crm_automation_runs.total_recipients` set at plan time, never reconciled — INFO

**Severity:** INFO
**Location:** `crm-automation-runs.js:createRun` line 23 —
`total_recipients = totalRecipients || 0`.

**Description:** The total is captured from the plan length at
run creation. If a recipient list shrinks (e.g. a lead is
soft-deleted between resolveRecipients and the EF call) the
total stays at the pre-shrink value while sent+failed+rejected
sum to less. Not a bug per se — total is "what was planned" and
the trio is "what the EF processed" — but a future audit might
flag the divergence.

**Suggested:** Document the semantic explicitly in the column
comment + the automation-history UI tooltip. No code change.

---

## F4 — `Modal.confirm` cancel button label key inconsistency — INFO

**Severity:** INFO (carryover from MANUAL_TERMS_APPROVAL F1)
**Location:** No new instances introduced by this SPEC, but the
finding from MANUAL_TERMS_APPROVAL still stands and is now also
relevant for `confirmClass` styling — the run-history retry
button uses raw Tailwind classes (`bg-indigo-600 hover:bg-indigo-700
…` line 140) outside the Modal.confirm path, so it is unaffected.

**Suggested:** No new action; track under MANUAL_TERMS_APPROVAL F1.
