# DEPLOY_FALLBACK_NEEDED — STATUS_CHANGE_TRIGGERS_FRAMEWORK

> **Authored:** 2026-05-12 by opticup-executor
> **Trigger:** Criterion 21 / `InternalServerErrorException` from Supabase MCP `deploy_edge_function`
> **Status:** ⏸ Executor STOPPED. Daniel CLI deploy required before SPEC resumes.

---

## What needs to deploy

**2 Edge Functions**, both with their latest source already committed to `develop` (commit `8de4197` is the EF code change; commit `61018a1` is the SQL migration that the EFs depend on).

### 1. `automation-engine`
- **Path:** `supabase/functions/automation-engine/`
- **Entrypoint:** `index.ts`
- **`verify_jwt`:** `true` (must match `[functions.automation-engine]` block in `supabase/config.toml` if/when added; current production is `true`)
- **Files in EF:** `deno.json`, `index.ts`, `engine.ts`, `dispatch.ts`, `post-actions.ts`, `prepare-plan.ts`, `queue-send.ts`, `recipients.ts`, `runs.ts` (9 files)
- **What changed:**
  - `engine.ts` (231 → 320 lines): `TRIGGER_TYPES` adds `attendee_status_change`; `CONDITIONS` adds `status_changed_from` + `status_changed_to`; new exported `consumeStatusChangeEvents()` function (~85 lines).
  - `index.ts` (105 → 127 lines): imports `consumeStatusChangeEvents`; `VALID_TRIGGER_TYPES` adds `attendee_status_change`; mode `consume_status_events` branch returns `{ok, processed, evaluated, errors}`.
  - Other 7 files unchanged.

### 2. `dispatch-queue`
- **Path:** `supabase/functions/dispatch-queue/`
- **Entrypoint:** `index.ts`
- **`verify_jwt`:** `false` (pg_cron path; current production)
- **Files in EF:** `deno.json`, `index.ts` (2 files)
- **What changed:**
  - `index.ts` (191 → 233 lines): rows now grouped by `(lead_id, scheduled_at)`; each group dispatched via `Promise.allSettled` with `PARALLEL_CAP=5`; `sleep()` once after each group (slowest-channel duration) instead of between every row. New `dispatchOne()` helper.

---

## CLI commands for Daniel

From a checkout of `develop` on the Windows desktop or laptop:

```powershell
cd C:\Users\User\opticup
git pull origin develop
# verify HEAD is at 8de4197 or later
git log --oneline -1

supabase functions deploy automation-engine --no-verify-jwt=false
supabase functions deploy dispatch-queue --no-verify-jwt=true
```

(Adjust flags if the project's existing convention differs — refer to the previous successful deploy in `M4_HARDCODED_PRIZMA_REMOVAL` retrospective.)

---

## Verification after deploy

The Executor will resume from SPEC §3 criterion 18 (demo smoke E2E test) once Daniel confirms both EFs at the new version. To confirm pre-resume:

```sql
-- Should show 'automation-engine' updated_at within last 5 minutes of Daniel's deploy
SELECT slug, updated_at, version FROM cron.edge_function_versions
WHERE slug IN ('automation-engine','dispatch-queue')
ORDER BY updated_at DESC LIMIT 5;
```

(Or whichever Supabase internal query Daniel prefers — the equivalent of "show me current EF version".)

---

## Background — why this happens

Supabase MCP `deploy_edge_function` intermittently fails with
`InternalServerErrorException` regardless of payload validity. Pattern
observed in 3 prior M4 SPECs:
- `M4_HARDCODED_PRIZMA_REMOVAL` (2026-05-06): 4 EFs deployed via CLI by Daniel
- `M4_UNSUB_SUPPRESSION_CRIT` (2026-05-06): send-message v18→v19 via CLI
- `M4_PUBLIC_FORM_VARIABLES_HIGH` (2026-05-06): event-register v13→v14 via CLI

The SPEC explicitly authorized this fallback path. The Executor is
following autonomy-envelope rules — not retrying MCP because the SPEC
disallows that (it adds risk of partial-deploy state).

---

## Resume protocol

When Daniel confirms both EFs deployed:
1. Re-engage `opticup-executor` skill with prompt: *"Resume STATUS_CHANGE_TRIGGERS_FRAMEWORK SPEC from criterion 18 — EFs deployed at versions <X>. Continue Phase 3 (cron schedule), Phase 4 (browser mirror + UI), Phase 5 (smoke + closure)."*
2. The Executor verifies criterion 21 by querying the EF version (read-only — does not count as a deploy MCP call).
3. Continues Phase 3 → 4 → 5.

---

*Pause point for Daniel CLI deploy. Resume Phase 3 after confirmation.*
