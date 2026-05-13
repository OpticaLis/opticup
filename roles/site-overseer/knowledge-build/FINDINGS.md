# FINDINGS — SITE_OVERSEER_KNOWLEDGE_BUILD_FUNNEL

> One meta-finding worth recording independently of the knowledge map. The other "findings" surface as the Top 5 Gaps + 10 Open Questions inside `KNOWLEDGE_MAP.md` and are not duplicated here.

---

## F1 — `crm_broadcasts` aggregate counters are dead in the current codebase

- **Severity:** HIGH (silent measurement failure; misleads operators and any analytics that read `crm_broadcasts`).
- **Layer:** 5 (Broadcasts).
- **Detection method:** Repo-wide grep + DB scan during this SPEC.

### Evidence

1. **DB scan** of `crm_broadcasts` grouped by status, 2026-05-14, this SPEC:
   - `completed` × 5, all with `total_sent > 0`, last one 2026-05-12 12:36 UTC.
   - `partial` × 3, only 1 with `total_sent > 0`, last one 2026-05-12 11:12 UTC.
   - `queued` × 4, ALL with `total_sent = 0`, first one 2026-05-12 13:08 UTC, latest 2026-05-13 07:37 UTC.

2. **Repo-wide grep** (this SPEC) for any code that updates the broadcast row after insert:
   ```
   grep -rn "update.*crm_broadcasts\|crm_broadcasts.*update\|broadcasts.*total_sent" --include="*.{js,ts,sql}"
   →  No matches found
   ```
   The only mutations of `crm_broadcasts` in the codebase are the INSERT at `modules/crm/crm-messaging-broadcast-queue.js:111-138`. Nothing updates it afterward.

3. **Repo-wide grep** for `broadcast_id`:
   ```
   →  campaigns\supersale\migrations\001_crm_schema.sql:286:  broadcast_id  uuid  REFERENCES crm_broadcasts(id),
   ```
   The FK column exists in `crm_message_log` but is never populated by any send-message / dispatch-queue / automation-engine code path. The 2026-05-12 BROADCAST_QUEUE_INTEGRATION moved broadcasts onto `crm_message_queue`, and the new path simply does not carry `broadcast_id` through.

4. **Schema evidence** that the queue cannot carry the link even if asked:
   ```
   crm_message_queue columns:
   id, tenant_id, run_id, lead_id, event_id, channel, template_slug, body,
   subject, variables, language, status, retries, scheduled_at, created_at,
   processed_at, error_message, log_id
   ```
   No `broadcast_id` column at all.

### Why this is a finding (and not just a bug to fix here)

This SPEC is read-only mapping. Fixing the bookkeeping would require:
- Either adding `broadcast_id` to `crm_message_queue` + propagating to `crm_message_log` + writing a post-drain aggregation that updates the `crm_broadcasts` row (DDL + 3-4 code-edit points across 2 EFs).
- Or removing/deprecating the `crm_broadcasts` counter fields and replacing the UI's "how did this broadcast do" view with a `crm_message_log` aggregation by some other key (probably `created_at` window per `name`).

Either path is a non-trivial SPEC of its own, with downstream UI implications. Per the executor's "one concern per task" rule, the right move is to record the finding and let the Foreman scope the fix.

### Suggested next actions (for the Foreman, not this SPEC)

1. **Decide which path** (add `broadcast_id` to queue, or deprecate counters). Either is a 1-2 day SPEC.
2. **Sentinel mission addition:** add a check "any `crm_broadcasts` row older than 24 h still in `status='queued'`?" — if yes, alert. Cheap to add.
3. **UI guard:** if the broadcast detail view shows `total_sent` / `total_failed`, mark them "(unavailable)" until the fix lands — or hide them.

---

## What is NOT in FINDINGS

The other things the SPEC asked me to surface (5 measurement gaps, 10 open questions) live in `KNOWLEDGE_MAP.md`. Recording them here would duplicate. The gaps section in the map is the source of truth.

---

*End of FINDINGS.md.*
