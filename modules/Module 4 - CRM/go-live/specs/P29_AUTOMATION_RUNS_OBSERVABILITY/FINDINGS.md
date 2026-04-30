# FINDINGS — P29_AUTOMATION_RUNS_OBSERVABILITY

> Findings discovered during P29 execution that are NOT part of the SPEC's scope. Per executor playbook: log, do not fix, surface to Foreman.

---

## Finding P29-001 — SPEC §7 names wrong file for the `run_id` fix

- **Severity:** LOW (caught and corrected in pre-flight; no impact)

### Evidence

SPEC §7 (Expected Final State / Files modified):
> `modules/crm/crm-automation-engine.js` (~+1 line — `run_id` in pending_review INSERT)

Actual `pending_review` INSERT site (verified by grep):

```
modules/crm/crm-confirm-send.js:163  function writePendingReviewRows(plan) { ...
modules/crm/crm-confirm-send.js:170     content: it.composedBody || '', status: 'pending_review'
modules/crm/crm-confirm-send.js:173     var res = await sb.from('crm_message_log').insert(rows);
```

`crm-automation-engine.js` has zero `pending_review` writes — confirmed by grep. The engine builds the plan items (which carry `run_id`); the modal-side helper in `crm-confirm-send.js` is what writes the row literals to `crm_message_log`.

### Resolution applied

Fix landed at `crm-confirm-send.js:170` — added `run_id: it.run_id || null` to the row literal. File 270→271 lines (cap 350).

### Suggested follow-up

Already proposed as IMPROVEMENT_PROPOSAL 2 in EXECUTION_REPORT.md: SPEC template should require quoting `file:line` for every fix target in §7, forcing the SPEC author to grep before writing.

---

## Finding P29-002 — Demo tenant has 4 pre-existing stuck `running` rows from 2026-04-25 (4+ days old)

- **Severity:** INFO (out of P29 backfill scope; reaper will clean post-deploy)

### Evidence

Post-migration query against demo tenant:

```sql
SELECT id, rule_name, started_at, updated_at
  FROM crm_automation_runs
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND status='running';
```

| id (short) | rule_name | started_at | age |
|---|---|---|---|
| `4c8c56fb` | `שינוי סטטוס: אירוע נסגר` | 2026-04-25 18:20:46 | 4d 9h |
| `e23a85b8` | `הרשמה: אישור הרשמה` | 2026-04-25 18:23:24 | 4d 9h |
| `31bc85e5` | `הרשמה: אישור הרשמה` | 2026-04-25 18:24:48 | 4d 9h |
| `5540109c` | `הרשמה: אישור הרשמה` | 2026-04-25 18:45:53 | 4d 8h |

All 4 have `updated_at = started_at` (the migration's COALESCE backfill set updated_at to started_at for these rows — they never finished). All 4 are clearly abandoned demo test artifacts (4+ days old, no operator activity since).

### Why not backfilled in P29

SPEC §3.1 #5 explicitly scoped the backfill to the 2 named Prizma rows. Backfilling all stuck rows project-wide was out of scope. The reaper (commit 5, deploys via Daniel CLI) will catch these on its first tick after deploy — the cleanup happens automatically; no extra migration needed.

### Suggested follow-up

None. Once the EF is deployed, demo will self-heal within 1 minute (cron tick). This finding is a **positive signal** that the reaper has real work to do — useful for verifying it works in Phase 1 #7 + #8 post-deploy.

---

## Finding P29-003 — `crm_automation_runs` is not declared in `modules/Module 4 - CRM/docs/db-schema.sql`

- **Severity:** LOW (pre-existing doc drift; unrelated to P29 scope)

### Evidence

Grep for `crm_automation_runs` in `db-schema.sql` returns 0 matches. The table exists in production (verified via `information_schema.columns`) and its history goes back to before the schema-doc convention was established.

### Why not fixed in P29

P29's authority is to add `updated_at` to the table — not to retroactively author the table's CREATE TABLE statement. Adding a CREATE TABLE for an already-existing table would either (a) be a no-op `IF NOT EXISTS` statement that documents the wrong shape, or (b) require a full audit of every column, FK, index, and policy, which is its own SPEC.

### Suggested follow-up

A future doc-currency SPEC could backfill `db-schema.sql` for `crm_automation_runs` + any other table missing from the file. Run `information_schema.columns` against live DB, generate a CREATE TABLE statement per table, diff against `db-schema.sql`, fix the drift. Half-day SPEC.

---

## Finding P29-004 — `mcp__claude_ai_Supabase__deploy_edge_function` returned `InternalServerErrorException` twice on the dispatch-queue EF

- **Severity:** MEDIUM (operational — blocks autonomous EF deploys)

### Evidence

Two consecutive deploy attempts via the MCP tool, identical payload, identical error response:

```
{"error":{"name":"InternalServerErrorException","message":"Function deploy failed due to an internal error"}}
```

The deploy payload was a 172-line `index.ts` with the reaper block added. Both attempts had `verify_jwt: false` (matching the existing function). The `deno.json` was included as a second file. No content errors in the payload — the same code deploys cleanly via Supabase CLI manually.

### Why this matters

The executor playbook handles this correctly (retry once, then STOP and report), but it costs the SPEC's autonomy. If MCP is unreliable for deploys, the SPEC author should know in advance to plan the manual-CLI step into the dispatch.

### Suggested follow-up

IMPROVEMENT_PROPOSAL 1 in EXECUTION_REPORT.md: pre-flight should test EF-deploy availability with a no-op (re-deploy current source to itself). If it fails, surface immediately so Daniel can decide whether to wait or proceed with manual-CLI plan baked into the dispatch.

---

*End of FINDINGS. 4 findings total: 1 LOW (SPEC drift, fixed), 1 INFO (demo state observation), 1 LOW (pre-existing doc drift), 1 MEDIUM (MCP tool reliability).*
