# RUNG 1 — Activation Prompt — M4_AUTOMATION_ENGINE_SERVER_SIDE

> **Paste this entire block into a fresh Claude Code session. Load the `opticup-executor` skill first.**
> **Reporting language: ENGLISH to Daniel.**
> **Cutover blocker: YES — must land before Sunday 2026-05-04 morning.**

---

## YOUR MANDATE

You are the Executor for Optic Up. Load `opticup-executor` (which loads `opticup-guardian` automatically). Then execute Rung 1 of M4_AUTOMATION_ENGINE_SERVER_SIDE per this prompt.

The SPEC and FOREMAN_REVIEW live at `modules/Module 4 - CRM/docs/specs/M4_AUTOMATION_ENGINE_SERVER_SIDE/`. **Read FOREMAN_REVIEW.md first** — it contains material restructuring of the SPEC (drops §5.2 / §5.3 / §5.6 entirely; clarifies §5.5; adds the missing send-message config block). **Where the SPEC and the FOREMAN_REVIEW disagree, the FOREMAN_REVIEW wins.**

### Pre-flight (mandatory, before any change)

1. **Session-start protocol from CLAUDE.md §1** — confirm machine, verify branch is `develop`, pull latest, two-phase Cowork sync gate (survey untracked first), clean-repo check, **integrity gate `npm run verify:integrity`** (exit 0 mandatory).
2. **Load Iron Rules 1–23 + 31** — top of mind throughout.
3. **Confirm tenant scope:** all QA in this Rung uses **prizma** tenant — UUID `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`. Any test event creation, status flip, or rule fire is on prizma. **NOT demo.** Reason: T8/T9 rules and queue infrastructure are seeded on prizma; demo's coverage is partial.
4. **Phone allowlist for any SMS-triggering test:** ONLY `0537889878` and `0503348349` (Daniel's two personal lines). If a test would reach any other phone, abort and re-scope the test data first.
5. **Read these files end-to-end before writing any code:**
   - `modules/Module 4 - CRM/docs/specs/M4_AUTOMATION_ENGINE_SERVER_SIDE/SPEC.md`
   - `modules/Module 4 - CRM/docs/specs/M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md`
   - `modules/crm/crm-automation-engine.js` (326 lines — full)
   - `modules/crm/crm-automation-recipient-resolvers.js` (145 lines — full)
   - `modules/crm/crm-automation-queue-send.js` (111 lines — full)
   - `modules/crm/crm-automation-post-actions.js` (144 lines — full)
   - `modules/crm/crm-automation-runs.js` (its full content — runs row creation logic)
   - `modules/crm/crm-automation-dispatch.js` (52 lines)
   - `supabase/functions/lead-intake/index.ts` (the EF authoring template — pattern reference)
   - `supabase/functions/lead-intake/dispatch.ts` (cross-EF call pattern)
   - `supabase/config.toml` lines 390–423 (existing EF blocks — `pin-auth`, `facebook-campaigns-sync`, `lead-intake`)

### Step 1 — DB Pre-Flight (Iron Rule 21 — No Orphans, No Duplicates)

Verify against the live DB and report findings:

```sql
-- A. Confirm rules shape unchanged since FOREMAN_REVIEW (T8 + T9 use queue_send + status_change)
SELECT id, name, trigger_entity, trigger_event, action_type, action_config
FROM crm_automation_rules
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND action_type = 'queue_send'
ORDER BY name;

-- B. Confirm cron jobs current state
SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;

-- C. Confirm no name collision for the new cron job
SELECT 1 FROM cron.job WHERE jobname IN ('event_2_3d_before_status_flip', 'automation-engine');

-- D. Confirm crm_message_queue idempotency unique constraint exists
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'crm_message_queue' AND indexname LIKE '%idem%';
```

If A returns 0 rows for queue_send rules → STOP, the SPEC's premise has changed since the review.
If C returns ≥1 row → STOP, name collision; ask the Foreman.
If D returns 0 rows → STOP, idempotency guard is gone; do not proceed.

### Step 2 — Build the EF

Path: `supabase/functions/automation-engine/index.ts` (+ `deno.json` mirroring `lead-intake/deno.json`).

The EF is a faithful port of the browser engine. Read `crm-automation-engine.js` end-to-end and mirror:
- The TRIGGER_TYPES map (5 keys: event_status_change, event_registration, lead_status_change, lead_intake, attendee_moved). **Do NOT add a 6th trigger type.** No `event_time_window` (per FOREMAN_REVIEW §4).
- The CONDITIONS evaluators (always, status_equals, count_threshold, source_equals).
- The recipient-resolver logic from `crm-automation-recipient-resolvers.js` (7 recipient_types: trigger_lead, tier2, tier2_excl_registered, leads_by_status, attendees / attendees_waiting / attendees_all_statuses, attendees_with_active_coupon, cross_event_active_waitlist).
- The queue_send path from `crm-automation-queue-send.js` — UPSERT into `crm_message_queue` with `onConflict: 'tenant_id,event_id,lead_id,template_slug,channel'`, `ignoreDuplicates: true`. Same scheduled_at math (event_date - offset_days at send_time, anchored Israel `+03:00`). **Do not invent new idempotency markers.**
- The post-actions logic from `crm-automation-post-actions.js` (executePostActions, attendeeUpsert, promoteWaitingLeadsToInvited).
- Run-row creation/finalization from `crm-automation-runs.js` (createRun → finishRun on `crm_automation_runs`). **Run row creation now lives server-side.** Browser will continue to read `crm_automation_runs` for history, but write moves here.

EF contract:
```
POST /functions/v1/automation-engine
Body: {
  tenant_id: string (REQUIRED),
  trigger_type: 'event_status_change' | 'event_registration' | 'lead_status_change'
              | 'lead_intake' | 'attendee_moved',
  trigger_data: { ... per trigger_type, same shape as the browser engine accepts today },
  mode: 'evaluate' | 'dispatch'   // defaults to 'dispatch' for cron callers; Rung 2 uses 'evaluate' first then 'dispatch'
  plan_items: [...]               // ONLY when mode='dispatch' AND caller already has approved planItems (Rung 2 path)
}
Returns: {
  run_id: string | null,
  fired: number,
  sent: number,
  failed: number,
  rejected: number,
  queued: number,
  skipped: number,
  plan_items?: [...]              // only when mode='evaluate'
}
```

Authoring discipline:
- Mirror `supabase/functions/lead-intake/index.ts` boilerplate **exactly** for: createClient construction, env var names, CORS headers, jsonResponse + errorResponse helpers, ANON_KEY handling pattern. Do NOT reinvent — pattern drift causes verify_jwt regressions (lesson from M4_CAMPAIGNS_V2 Rung 2).
- Use `SUPABASE_SERVICE_ROLE_KEY` for the EF's DB client (server-side, bypasses RLS — every query MUST manually filter `.eq('tenant_id', tenantId)` per Iron Rule 22).
- The EF is single-tenant per call. Do NOT iterate tenants inside the EF. Cron handles fan-out (Step 4).

Run `npm run verify:integrity` after writing the EF. Exit 0 mandatory.

### Step 3 — Add config.toml blocks

Edit `supabase/config.toml`. Add **two** new blocks at the end of the file (after `[functions.lead-intake]`), both modeled exactly on `[functions.lead-intake]`:

```toml
# Same comment-block as lead-intake — verify_jwt = true; required to prevent
# CLI redeploy from defaulting verify_jwt incorrectly (lesson from
# M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE Rung 2 facebook-campaigns-sync incident).
[functions.send-message]
enabled = true
verify_jwt = true
import_map = "./functions/send-message/deno.json"
entrypoint = "./functions/send-message/index.ts"

# Server-side automation engine — port of browser CrmAutomation.evaluate.
# verify_jwt = true mirrors lead-intake. Called by pg_cron (anon JWT) for
# server-driven status flips, and by browser CrmAutomationClient (Rung 2).
[functions.automation-engine]
enabled = true
verify_jwt = true
import_map = "./functions/automation-engine/deno.json"
entrypoint = "./functions/automation-engine/index.ts"
```

The send-message block addition is tech-debt cleanup folded into this Rung per FOREMAN_REVIEW §2.2 finding 5.

### Step 4 — Deploy EF + replace cron + add new cron

Order:
1. Deploy `automation-engine` EF: `mcp__claude_ai_Supabase__deploy_edge_function`. Verify via `mcp__claude_ai_Supabase__list_edge_functions`.
2. Re-deploy `send-message` EF (no code change — just to apply the new verify_jwt = true config block; do NOT skip this or the block has no effect). Use the same MCP tool.
3. **Replace** `event_day_status_flip` cron. Capture pre-state into EXECUTION_REPORT first:
   ```sql
   SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'event_day_status_flip';
   ```
   Then unschedule and reschedule with the augmented command:
   ```sql
   SELECT cron.unschedule('event_day_status_flip');
   -- Then SELECT cron.schedule('event_day_status_flip', '30 5 * * *', $$ ... $$);
   -- The new command must:
   --   (a) UPDATE crm_events SET status='event_day' WHERE event_date = (now() AT TIME ZONE 'Asia/Jerusalem')::date
   --       AND status NOT IN ('event_day','planning','closed','completed') AND is_deleted = false
   --       RETURNING id, tenant_id;
   --   (b) For each (event_id, tenant_id) returned, call net.http_post to the automation-engine EF
   --       with body {"tenant_id":"<uuid>","trigger_type":"event_status_change","trigger_data":{"eventId":"<uuid>","newStatus":"event_day"},"mode":"dispatch"}
   --   (c) EXCEPTION WHEN OTHERS — never let one event/tenant block others (use the daily-alert-generation
   --       cron's DO-block + per-iteration BEGIN/EXCEPTION pattern as the live precedent).
   ```
   Use `mcp__claude_ai_Supabase__apply_migration` for the cron rewrite (Level-2 SQL — destructive).
4. **Add** new cron `event_2_3d_before_status_flip` (also at `30 5 * * *` — same slot, sibling responsibility):
   - Same DO-block shape as (3).
   - UPDATE: `SET status='2_3d_before' WHERE event_date = ((now() AT TIME ZONE 'Asia/Jerusalem')::date + INTERVAL '3 days')::date AND status NOT IN ('2_3d_before','event_day','planning','closed','completed') AND is_deleted = false RETURNING id, tenant_id`.
   - For each row, call EF with `trigger_type='event_status_change'`, `trigger_data.newStatus='2_3d_before'`.

### Step 5 — Parity verification on prizma

Pick a **safe** test path that does NOT send real SMS to anyone other than the allowlisted phones:

1. Query `crm_events` for prizma — find or create a test event with `event_date = today + 3 days`. If creating, the event must be in a status that the cron's NOT IN guard does NOT block (e.g., `planning_in_progress` or any non-blocked status). Confirm there are zero attendees on it OR only attendees whose lead phone is in the allowlist.
2. Manually trigger the cron once to verify shape:
   ```sql
   -- Don't wait for 05:30 UTC. Inline-run the new cron's DO block once.
   ```
3. Confirm:
   - `crm_events` row was UPDATEd to `status='2_3d_before'`.
   - EF was called (check `crm_automation_runs` for a new row with the test event_id and `trigger_type='event_status_change'`, `status='completed'`).
   - For T8 rule (`event_2_3d_before` queue_send), `crm_message_queue` has `scheduled_at = T-3 day at 10:00 Israel` rows — one per allowlisted attendee per channel.
4. For T9: same drill with an event whose `event_date = today` and current status that the NOT IN guard does NOT block. Verify queue rows for `event_day` template at `today 08:00`.

Stop on any mismatch. Do NOT proceed to commit until parity is observed.

### Step 6 — Integrity gate + commit

1. `npm run verify:integrity` (exit 0).
2. Pre-commit hooks pass (file-size, RLS, tenant_id, secrets, etc.).
3. Add files explicitly by name (NEVER `git add -A`):
   - `supabase/functions/automation-engine/index.ts`
   - `supabase/functions/automation-engine/deno.json`
   - `supabase/config.toml` (modified)
4. Commit message: `feat(crm): M4 Rung 1 — server-side automation-engine EF + status-flip crons invoke engine`
5. Push to `origin develop`.
6. Migration commits (cron rewrite + new cron) — use `mcp__claude_ai_Supabase__apply_migration`; the migration filename appears in `supabase/migrations/`. Add and commit those migration files separately: `chore(db): replace event_day_status_flip + add event_2_3d_before_status_flip cron — both invoke automation-engine EF`.

### Step 7 — Write retrospective deliverables (MANDATORY)

Both files at `modules/Module 4 - CRM/docs/specs/M4_AUTOMATION_ENGINE_SERVER_SIDE/`:

1. `EXECUTION_REPORT.md` — what was done. Required sections per the executor's template. **Must include:**
   - The pre-state of `event_day_status_flip` cron (full original `command` text), so rollback is mechanical.
   - The diff between `lead-intake/index.ts` boilerplate and `automation-engine/index.ts` boilerplate (per FOREMAN_REVIEW §7 executor proposal #1).
   - Parity test results from Step 5: exact `crm_message_queue` row counts and `crm_automation_runs` ids.
   - Confirmation that the SMS phone allowlist held — list every phone the test would have hit.
2. `FINDINGS.md` — anything surprising, anything you skipped, anything for the next Foreman pass.

### Step 8 — Report to Daniel (English, brief)

- One sentence: what shipped.
- Status: cutover-readiness for Sunday.
- ONE next question, if any.

### Stop-on-deviation triggers (non-negotiable)

- Integrity gate exit ≠ 0 → STOP.
- Any cron `apply_migration` returns an error → STOP.
- Step 5 parity test fails (queue rows missing, runs row missing, row counts off) → STOP.
- An SMS test would have hit a phone other than `0537889878` or `0503348349` → STOP.
- The new EF returns a different `crm_automation_runs` row shape than the browser engine produces today → STOP.
- Any unexpected file change appears in `git status` beyond what this prompt scoped → STOP.
- A null-byte ERROR (exit 1) from the integrity gate at any point → STOP and escalate.

### Out of scope for Rung 1

- Browser callers still call `CrmAutomation.evaluate` directly. Both paths coexist transiently. **Do NOT touch `crm-event-actions.js`, `crm-event-register.js`, `crm-lead-actions.js`, or `crm-attendee-move.js`** in this Rung.
- Do NOT delete any browser-side automation file. Rung 3 owns deletes.
- Do NOT migrate / UPDATE any `crm_automation_rules` row. Existing T8/T9 shape is correct.
- Do NOT add an `event_time_window` trigger type to the EF or the rules table.

---

*End of Rung 1 activation prompt.*
