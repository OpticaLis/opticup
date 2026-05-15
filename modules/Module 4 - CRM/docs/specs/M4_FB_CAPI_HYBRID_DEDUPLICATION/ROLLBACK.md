# ROLLBACK — M4_FB_CAPI_HYBRID_DEDUPLICATION

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/ROLLBACK.md`
> **Reason this file is doc-context (not `_down.sql`):** Harvested from `M4_TEMPLATE_VALIDATION_UNIFIED/FOREMAN_REVIEW.md` Author Proposal #1 (2026-05-14). A `_down.sql` containing `DROP COLUMN` / `DROP TABLE` lines collides with the Iron-Rule-32 hook (`scripts/checks/destructive-ops-declared.mjs`) when the SPEC's §Destructive Operations declares only Make-side ops (no repo-side destructive ops). ROLLBACK.md as fenced SQL doc-context avoids the hook regex while preserving the rollback artifact.
> **When to apply:** ONLY if the SPEC fails partway through and must be reverted. Executor must NOT run these statements as part of normal SPEC execution.

---

## Master safety git tag

Pre-SPEC tag (Executor creates at Step 0 before any work):

```bash
git tag -a pre-fb-capi-start -m "Pre-SPEC safety tag for M4_FB_CAPI_HYBRID_DEDUPLICATION"
git push origin pre-fb-capi-start
```

Repo-side rollback:

```bash
git reset --hard pre-fb-capi-start
git push --force-with-lease origin develop  # ONLY with Daniel's explicit OK; never force without
```

(Note: `--force-with-lease` push is itself a destructive op in the Iron-Rule-32 regex. ROLLBACK execution requires Daniel's go-ahead in chat; this is not a self-serve rollback path.)

---

## DB-side rollback (in reverse order of application)

### 1. Stop the consumer

```sql
SELECT cron.unschedule('fb_capi_dispatch_consumer');
```

### 2. Undeploy or disable the `fb-capi-dispatch` Edge Function

Preferred — Supabase CLI:

```bash
supabase functions delete fb-capi-dispatch --project-ref tsxrrxzmdxaenlvocyit
```

If CLI delete unavailable — leave the EF deployed but unreferenced. The consumer is unscheduled (step 1) so the EF receives no traffic. Mark as orphaned in `docs/guardian/GUARDIAN_ALERTS.md` and clean up at the next infra hygiene SPEC.

### 3. Revert `lead-intake` to v25 (its state at SPEC seal)

Either redeploy the v25 source (Executor's pre-flight backup at `modules/Module 4 - CRM/backups/2026-05-15_M4_FB_CAPI_HYBRID_DEDUPLICATION/lead-intake/index.ts`) via:

```bash
supabase functions deploy lead-intake --project-ref tsxrrxzmdxaenlvocyit
```

…or restore via `git reset --hard pre-fb-capi-start` (which reverts the repo source) followed by `supabase functions deploy lead-intake`.

### 4. Drop the queue table (additive — safe drop)

```sql
DROP TABLE IF EXISTS public.crm_capi_dispatch_queue CASCADE;
```

(`CASCADE` is safe because no other table FK-references the queue. Verify with `\d crm_capi_dispatch_queue` before drop to be sure.)

### 5. Drop the added columns on `crm_leads` (additive — safe drop)

```sql
ALTER TABLE public.crm_leads
  DROP COLUMN IF EXISTS fb_event_id,
  DROP COLUMN IF EXISTS fb_pixel_fired_at;
```

### 6. Restore Make scenario 8542928 (if it was deleted at SPEC end)

If Make MCP `scenarios_delete(8542928)` was used and the Make API does NOT retain deleted scenarios → recreation is manual via the Make UI. Source-of-truth for the scenario's blueprint was Make MCP `scenarios_get(8542928)` captured by Executor in `EXECUTION_REPORT.md §3` before deletion. Use that capture as the recreation template.

If `scenarios_deactivate(8542928)` + archival annotation was used (delete unavailable) → re-activate via `scenarios_activate(8542928)` and strip the `[ARCHIVED …]` prefix from the name.

### 7. Remove repo-side doc changes

The `git reset --hard pre-fb-capi-start` from step 0 reverts:
- `docs/FB_CAPI.md` (new file — deleted)
- `roles/site-overseer/FUNNEL_ROADMAP.md` (P2.1 flipped back to PLANNED)
- `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` (Gap #5 reverted to OPEN)
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` (closure paragraph removed)
- `modules/Module 4 - CRM/docs/db-schema.sql` (appended section removed)
- `OPEN_TASKS.md` (2 follow-up rows removed)
- All SPEC-folder lifecycle files except this `SPEC.md` and `ROLLBACK.md`

---

## Verification after rollback

```sql
-- 1. Queue table gone
SELECT count(*) FROM information_schema.tables
 WHERE table_schema='public' AND table_name='crm_capi_dispatch_queue';
-- Expect: 0

-- 2. Columns gone from crm_leads
SELECT column_name FROM information_schema.columns
 WHERE table_schema='public' AND table_name='crm_leads'
   AND column_name IN ('fb_event_id', 'fb_pixel_fired_at');
-- Expect: 0 rows

-- 3. Cron job unscheduled
SELECT jobname FROM cron.job WHERE jobname='fb_capi_dispatch_consumer';
-- Expect: 0 rows

-- 4. Smoke 7/7 still PASS post-rollback (no regression)
-- Run: npm run test:smoke
-- Expect: 7 PASS, 0 FAIL
```

```bash
# 5. lead-intake EF version is back to v25 (or v26 if rollback re-deployed v25 as a new version)
# Verify via:
#   curl -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake' ...
# with original (pre-fb_event_id) payload — expect 200 OK with no fb_event_id processing
```

---

## Data destruction note

This rollback does NOT destroy production data. The new table is empty until the consumer runs; demo lead rows created during integration tests are cleaned up by the §3.1 cleanup block in `SPEC.md`. The new `crm_leads.fb_event_id` and `fb_pixel_fired_at` columns are nullable and unpopulated until the storefront SPEC ships — dropping them loses no production information.

The only destructive consequence of rollback is the Make scenario 8542928 deletion (if applied). Recreation is manual via Make UI using the captured blueprint.

---

*End of ROLLBACK.md — M4_FB_CAPI_HYBRID_DEDUPLICATION.*
