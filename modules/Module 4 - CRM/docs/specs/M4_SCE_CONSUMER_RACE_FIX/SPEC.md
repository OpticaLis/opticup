# SPEC — M4_SCE_CONSUMER_RACE_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_SCE_CONSUMER_RACE_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-21
> **Module:** 4 — CRM
> **Predecessor:** `M4_DISPATCH_PREVIEW_SUMMARY_MODE` (SPEC A; must land first)
> **Series:** Second of 3 — followed by `M4_QUEUE_INSERT_ON_CONFLICT` (C).
> **Pipeline mode:** Full-Auto with Chrome MCP live verification at closure on demo under injected load.
> **Priority:** HIGHEST per the INCIDENT_REPORT §3.1 priority ordering — but sequenced second because SPEC A's operator-brake gives single-operator safety even without B.
> **Tenant scope:** demo only.

---

## 0. Pre-Authoring Reality Check

| Check | Result |
|---|---|
| `crm_status_change_events` schema | tracked. Has: `id, tenant_id, entity_type, entity_id, old_status, new_status, payload, originated_by_rule_id, occurred_at, consumed_at, skip_reason`. No `claimed_at` column yet. |
| Existing consumer code | `supabase/functions/automation-engine/consumer.ts:99-104` — `.select(...).is('consumed_at', null).order('occurred_at').limit(cap)`. NO row lock. |
| Existing pg_cron job | `consume_status_change_events` — fires every minute per tenant. |
| Iron Rule 31 gate | exit 0 |
| `m4_dispatch_lock` pattern (precedent) | M4_NIGHT_RUN_2026_05_20 W2.1 added a per-tenant advisory-lock table for dispatch-queue. Confirmed schema-level precedent for using locking to serialize parallel-cron consumers. |

### Runtime-Semantics Rehearsal

**Current race timeline (per INCIDENT_REPORT §2.2):**
```
T+0     pg_cron tick 1 starts; SELECT unconsumed SCE rows → claims [SCE-1]
T+1s    tick 1 fires evaluate(); evaluate begins enqueuing 1,210×2=2,420 rows; takes >60s
T+60s   pg_cron tick 2 starts (parallel); SELECT unconsumed → SAME [SCE-1] (still NULL consumed_at)
T+61s   tick 2 fires evaluate(); ANOTHER enqueue of 2,420 rows
T+120s  pg_cron tick 3; same thing → 3rd batch
T+125s  tick 1 finishes, UPDATEs SCE-1 consumed_at=NOW(). But 6,000+ queue rows already inserted.
```

**Post-fix flow with FOR UPDATE SKIP LOCKED via RPC `claim_unconsumed_status_change_events`:**
```
T+0     pg_cron tick 1 calls RPC → atomic UPDATE claims [SCE-1] with claimed_at=NOW(). Returns rows.
T+1s    tick 1 fires evaluate(); 60s+ work begins.
T+60s   pg_cron tick 2 calls RPC; FOR UPDATE SKIP LOCKED skips SCE-1 (claimed_at NOT NULL & < 5 min old).
        Returns 0 rows. Tick 2 exits clean — no double enqueue.
T+125s  tick 1 finishes, UPDATEs SCE-1 consumed_at=NOW(). claimed_at no longer relevant.
```

**Stale-claim handling:** if tick 1 crashes mid-process, `claimed_at` stays NOT NULL but `consumed_at` stays NULL. After 5 minutes (configurable), the next tick's RPC filter `(claimed_at IS NULL OR claimed_at < NOW() - INTERVAL '5 minutes')` re-claims the orphaned row. Worst case: 5-min latency on a recovery, not data loss.

---

## 1. Goal

Eliminate the SCE-consumer race that caused yesterday's ~3× over-enqueue (~6,661 rows vs expected 2,251). Replace the `.select().is(consumed_at, null)` row claim with an atomic `FOR UPDATE SKIP LOCKED` claim via a new SECURITY DEFINER RPC. Verify under demo load (~1,200 injected leads) that running 3 parallel `pg_cron` ticks against a single unconsumed SCE row enqueues exactly ONE batch of rows, not three.

---

## 2. Success Criteria (Measurable)

| # | Criterion | Expected value |
|---|---|---|
| 1 | New DB column | `crm_status_change_events.claimed_at timestamptz NULL` added via migration. NOT NULL constraint NOT added. |
| 2 | New RPC | `claim_unconsumed_status_change_events(p_tenant_id uuid, p_limit int, p_stale_minutes int DEFAULT 5)` exists. SECURITY DEFINER. Returns SETOF `crm_status_change_events`. Canonical JWT-claim tenant isolation header (per `.claude/skills/opticup-strategic/references/JWT_VALIDATION_HEADER.sql`) for service_role bypass + strict tenant_id check. |
| 3 | RPC body uses `FOR UPDATE SKIP LOCKED` | grep RPC source → contains both strings. |
| 4 | RPC filters stale claims | grep RPC source → contains `claimed_at IS NULL OR claimed_at < (now() - ...)` predicate. |
| 5 | consumer.ts calls RPC | `await db.rpc('claim_unconsumed_status_change_events', {p_tenant_id, p_limit})` replaces the SELECT path. Subsequent UPDATE to set `consumed_at` remains. |
| 6 | EF redeploy | `automation-engine` v22 (post-SPEC-A) → v23 |
| 7 | Demo race test passes | Trigger 3 parallel calls to consume_status_change_events for one tenant in <100ms window. Exactly ONE evaluate() runs per SCE row. Subsequent SELECT on queue rows shows exactly the expected count (e.g., 1,200), not 3,600. |
| 8 | Prizma all tables bit-identical pre/post | counts on crm_leads, crm_events, crm_message_queue, crm_message_log, crm_status_change_events, crm_automation_rules unchanged. |
| 9 | Iron Rule 31 gate | exit 0 or 2 at every commit. |
| 10 | Iron Rule 32 destructive ops declared | DDL: 1 column add + 1 RPC create. No DROP. |
| 11 | Iron Rule 33 demo-first | Migration applied to demo first via Supabase MCP. After demo race test green, applied to Prizma. |
| 12 | Iron Rule 34 Chrome MCP live verification | Demo: change a fresh demo event's status while watching 3 parallel race-injection ticks. Screenshot + Postgres logs + queue-row count assertion. |
| 13 | Smoke baseline | 7/7 PASS post-fix. |

### Baselines (from SPEC A's §0 + this SPEC's pre-flight)

| Symbol | Value |
|---|---|
| `BASE_AE_VERSION_POST_A` | 22 (assumes SPEC A landed) |
| `BASE_PRIZMA_SCE_ROWS` | (Executor captures pre-flight) |
| `BASE_DEMO_SCE_ROWS` | (Executor captures pre-flight) |

---

## 3. Autonomy Envelope

### What the Executor CAN do without asking
- Apply 1 migration on demo: add column + create RPC + grant to authenticated/service_role.
- Apply same migration on Prizma AFTER demo verification passes.
- Redeploy `automation-engine` EF (v22→v23).
- Re-inject demo load test leads (re-use SPEC A's scripts) for verification.
- Use Supabase MCP for migration + EF deploy.
- Run race test: 3 parallel manual fetches against the demo consume_status_change_events EF endpoint within a 100ms window.

### What REQUIRES stopping and reporting
- Demo race test shows ≥2 evaluate() runs against the same SCE row → STOP, fix did not work.
- Prizma migration fails to apply (existing data shape mismatch) → STOP.
- Existing `claimed_at` column found on either tenant (someone else added it concurrently) → STOP.
- Any need to redeploy dispatch-queue or send-message → STOP (out of scope).
- Demo Postgres logs show new `permission denied` errors after RPC create → STOP, fix grants.

---

## 4. Stop-on-Deviation Triggers

- Migration applied successfully but RPC returns ZERO rows when SCE rows exist with `consumed_at=NULL AND claimed_at=NULL` → STOP, RPC predicate is wrong.
- RPC returns same SCE row to 2 concurrent callers (race test fails) → STOP, the SKIP LOCKED isn't working.
- Demo `consumer.ts` post-deploy throws when calling the RPC → STOP, verify RPC signature.

---

## 5. Rollback Plan

- **Pre-write tag:** `git tag pre-m4-sce-consumer-race-fix-2026-05-21 <START_COMMIT>` pushed.
- **Code rollback:** `git checkout <tag> -- supabase/functions/automation-engine/consumer.ts` + redeploy v23 source back to v22 via Supabase MCP.
- **Migration rollback:** the migration is purely additive (1 column NULL, 1 RPC). Rollback SQL lives in ROLLBACK.md doc-context (NOT a _down.sql file — per harvested pattern from M4_BROADCAST_ID_PROPAGATION):
  ```sql
  DROP FUNCTION IF EXISTS public.claim_unconsumed_status_change_events(uuid, int, int);
  ALTER TABLE public.crm_status_change_events DROP COLUMN IF EXISTS claimed_at;
  ```
- **Data:** zero DML on production data by this SPEC. Rollback path is structural only.

---

## Destructive Operations

The following are pre-authorized:
1. **DDL: `ALTER TABLE crm_status_change_events ADD COLUMN claimed_at timestamptz NULL`** — additive column, no DROP.
2. **DDL: `CREATE OR REPLACE FUNCTION claim_unconsumed_status_change_events(...)`** — additive function.
3. **DDL: `GRANT EXECUTE` to authenticated + service_role** — additive.
4. **EF redeploy:** automation-engine v22 → v23.
5. **DML on demo (load test re-use):** SPEC A's inject + cleanup scripts re-run. Same sentinel + same delete predicate.

NONE of: DROP TABLE, DROP COLUMN, DROP POLICY, TRUNCATE, `--no-verify`, force push, main-branch modification, mass-delete without tenant scope.

---

## 6. Out of Scope

- Queue ON CONFLICT (SPEC C). consumer.ts may still call dispatch.ts's `.insert(rows)` path which currently lacks ON CONFLICT — that's C's territory.
- preview.ts (SPEC A territory).
- send-message EF.
- dispatch-queue EF (already has its own advisory-lock from M4_NIGHT_RUN_2026_05_20 W2.1).
- Storefront repo.
- Merge to main.

---

## 7. Expected Final State

### New files
- `modules/Module 4 - CRM/docs/specs/M4_SCE_CONSUMER_RACE_FIX/{SPEC,EXECUTION_REPORT,FINDINGS,TEST_REPORT,FOREMAN_REVIEW,ROLLBACK}.md`
- `modules/Module 4 - CRM/migrations/m4_sce_claim_atomic_2026_05_21.sql` (the up migration, also applied via Supabase MCP)

### Modified files
- `supabase/functions/automation-engine/consumer.ts` — replace lines 99-104 `.select(...).is('consumed_at', null)...` with `db.rpc('claim_unconsumed_status_change_events', {p_tenant_id:tenantId, p_limit:cap})`. Keep the subsequent UPDATE setting `consumed_at` (now a no-op race-wise since claimed_at protected the work).
- `modules/Module 4 - CRM/docs/db-schema.sql` — add the new column + RPC.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — top entry.

### DB state
- Demo: 1 column added, 1 RPC created. claimed_at = NULL on all existing rows.
- Prizma: same DDL after demo green.

### Docs
- M4 SESSION_CONTEXT updated.
- GLOBAL_SCHEMA / GLOBAL_MAP NOT required at this SPEC's close (M4_DOC_RESYNC bundle handles them).

---

## 8. Commit Plan

- **Commit 1** — `feat(m4): migration — crm_status_change_events.claimed_at + claim_unconsumed_status_change_events RPC`
  - Files: the migration .sql + ROLLBACK.md.
- **Commit 2** — `feat(m4): automation-engine consumer.ts atomic claim via FOR UPDATE SKIP LOCKED (v23)`
  - Files: consumer.ts. Followed by `mcp__claude_ai_Supabase__deploy_edge_function` outside the commit (side-effect).
- **Commit 3** — `docs(spec): close M4_SCE_CONSUMER_RACE_FIX — EXECUTION_REPORT + FINDINGS + TEST_REPORT + FOREMAN_REVIEW + SESSION_CONTEXT`

3 commits total.

---

## 9. Migration SQL (exact)

```sql
-- 9.1 — Add claimed_at column (nullable, no default)
ALTER TABLE public.crm_status_change_events
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz NULL;

-- 9.2 — Add a partial index so the RPC's SELECT FOR UPDATE SKIP LOCKED stays fast
CREATE INDEX IF NOT EXISTS idx_crm_sce_unconsumed_claimable
  ON public.crm_status_change_events (tenant_id, occurred_at)
  WHERE consumed_at IS NULL;

-- 9.3 — Atomic claim RPC. Replaces consumer.ts's racy SELECT.
CREATE OR REPLACE FUNCTION public.claim_unconsumed_status_change_events(
  p_tenant_id    uuid,
  p_limit        int,
  p_stale_minutes int DEFAULT 5
)
RETURNS SETOF public.crm_status_change_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  -- Canonical JWT-claim tenant isolation. service_role bypass on jwt_tenant IS NULL.
  v_jwt_tenant uuid;
BEGIN
  BEGIN
    v_jwt_tenant := (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_tenant := NULL;
  END;

  -- Strict tenant check: callers must either be service_role (no JWT claims)
  -- OR present a JWT claim matching p_tenant_id. Anonymous callers cannot claim
  -- another tenant's rows.
  IF v_jwt_tenant IS NOT NULL AND v_jwt_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'claim_unconsumed_status_change_events: tenant mismatch'
      USING ERRCODE = '42501';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 100;
  END IF;
  IF p_stale_minutes IS NULL OR p_stale_minutes < 0 THEN
    p_stale_minutes := 5;
  END IF;

  -- Atomic CLAIM: select + set claimed_at + return rows. The inner SELECT uses
  -- FOR UPDATE SKIP LOCKED so concurrent ticks see different rows (or 0 rows).
  RETURN QUERY
  UPDATE public.crm_status_change_events ev
     SET claimed_at = now()
   WHERE ev.id IN (
       SELECT id FROM public.crm_status_change_events
        WHERE tenant_id = p_tenant_id
          AND consumed_at IS NULL
          AND (claimed_at IS NULL OR claimed_at < (now() - (p_stale_minutes || ' minutes')::interval))
        ORDER BY occurred_at
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
     )
  RETURNING ev.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_unconsumed_status_change_events(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_unconsumed_status_change_events(uuid, int, int) TO authenticated, service_role;

COMMENT ON FUNCTION public.claim_unconsumed_status_change_events(uuid, int, int) IS
  'M4_SCE_CONSUMER_RACE_FIX (2026-05-21). Atomic FOR UPDATE SKIP LOCKED claim of '
  'unconsumed crm_status_change_events rows for a tenant. Returns the now-claimed '
  'rows so the consumer can process them. Stale claims (>5 min) become re-claimable.';
```

---

## 10. Phase 2 — Race Verification on Demo

After Commit 2 + EF deploy:

1. Re-use SPEC A's `scripts/inject-demo-load-test-leads.mjs` to land 1,200 demo leads.
2. Re-enable the demo rule from SPEC A's §0.3.
3. Insert ONE SCE row manually for tenant=demo via SQL:
   ```sql
   INSERT INTO crm_status_change_events (tenant_id, entity_type, entity_id, old_status, new_status, payload, occurred_at)
   VALUES (<demo>, 'event', <test_event_id>, 'planning', 'registration_open',
           jsonb_build_object('event_id', <test_event_id>::text), now())
   RETURNING id;
   ```
4. From bash, fire 3 concurrent POSTs to automation-engine `mode=consume_status_events` for tenant=demo within a 50ms window:
   ```bash
   for i in 1 2 3; do
     curl -X POST "https://tsxrrxzmdxaenlvocyit.functions.supabase.co/automation-engine" \
       -H "Authorization: Bearer $ANON_KEY" \
       -d '{"tenant_id":"<demo>","mode":"consume_status_events","limit":10}' &
   done
   wait
   ```
5. Assert:
   - Exactly ONE call returns `evaluated:1, processed:1`.
   - Other 2 return `evaluated:0, processed:0` (skipped past locked row).
   - `crm_message_queue` row count for the test run_id = exactly the expected 1,200 (or 1,200 ± `lead_unsubscribed` filter applied).
   - NOT 3,600.
6. Cleanup: delete the test SCE row, clean up the queue rows, run SPEC A's cleanup script.

---

## 11. Lessons Already Incorporated

- FROM INCIDENT_REPORT §2.2 → APPLIED. This is the direct response.
- FROM `feedback_probe_constraints_not_just_tables.md` → APPLIED. Pre-flight checked schema columns + existing m4_dispatch_lock precedent, not just "is the table there?".
- FROM `JWT_VALIDATION_HEADER.sql` canonical template → APPLIED. Canonical service_role bypass + strict tenant check. No hand-rolled JWT validation.
- FROM `feedback_dont_add_unrequested_features.md` → APPLIED. Did NOT also fix queue ON CONFLICT (that's SPEC C). Did NOT add a stale-claim reaper cron (deferred to FINDINGS if needed).

### Cross-reference sweep

- `claim_unconsumed_status_change_events` — grepped GLOBAL_SCHEMA + MODULE_MAP + crm.js + automation-engine — 0 hits. Safe.
- `claimed_at` column — grepped — 0 hits on `crm_status_change_events`. Safe.
- `idx_crm_sce_unconsumed_claimable` — 0 hits. Safe.

---

## 12. Pre-Merge Checklist

- [ ] §2 success criteria pass with captured values.
- [ ] Iron Rule 31 + 32 + 33 + 34 honored.
- [ ] HEAD pushed to develop.
- [ ] Pipeline lock heartbeated.
- [ ] 5 SPEC docs + 1 ROLLBACK.md present.
- [ ] Demo + Prizma migration both applied; both pre/post schema_hashes captured.
- [ ] Race test PASS captured in TEST_REPORT.md.

---

*End of SPEC.*
