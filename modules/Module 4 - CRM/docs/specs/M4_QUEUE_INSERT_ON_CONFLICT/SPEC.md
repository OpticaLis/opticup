# SPEC — M4_QUEUE_INSERT_ON_CONFLICT

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_QUEUE_INSERT_ON_CONFLICT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-21
> **Module:** 4 — CRM
> **Predecessors:** `M4_DISPATCH_PREVIEW_LAZY_ROWS` (A; renamed from M4_DISPATCH_PREVIEW_SUMMARY_MODE 2026-05-21 rev 2) + `M4_SCE_CONSUMER_RACE_FIX` (B).
> **Series:** Third of 3.
> **Pipeline mode:** Full-Auto with Chrome MCP live verification at closure on demo under injected load.
> **Tenant scope:** demo only.

---

## 0. Pre-Authoring Reality Check

| Check | Result |
|---|---|
| `uq_crm_message_queue_idem` shape | `UNIQUE (tenant_id, run_id, lead_id, template_slug, channel) WHERE run_id IS NOT NULL AND template_slug IS NOT NULL AND status IN ('queued','processing','sent')` — confirmed live via pg_indexes |
| `dispatch.ts:69` | `db.from("crm_message_queue").insert(chunk)` — NO ON CONFLICT. |
| `queue-send.ts:102-123` | Client-side SELECT-then-INSERT pattern. NON-atomic. |
| supabase-js `.upsert({onConflict:'a,b,c'})` | Cannot emit the partial WHERE clause → Postgres raises "no unique or exclusion constraint matching the ON CONFLICT specification". Confirmed by the in-code comment at queue-send.ts:91-101. |
| Resolution shape | New SECURITY DEFINER RPC that wraps raw `INSERT ... ON CONFLICT (cols) WHERE (...) DO NOTHING RETURNING id`. Both dispatch.ts and queue-send.ts route through it. |
| Iron Rule 31 gate | exit 0 |

### Runtime-Semantics Rehearsal

**Without ON CONFLICT (current state):** concurrent inserts of the same (tenant, run, lead, slug, channel) tuple BOTH succeed, producing duplicate queue rows. The dispatch-queue's status-machine atomic UPDATE on `status='queued'` prevents duplicate SENDS (INCIDENT_REPORT §2.4) — but the storage layer is dirty, the audit trail is misleading, and the safety depends on dispatch-queue's behavior which we don't want to be load-bearing.

**With ON CONFLICT DO NOTHING via RPC:** the second concurrent insert silently no-ops. INCIDENT-REPORT-style ~3× over-enqueue → ~1× actual.

**Why the partial WHERE matters:** rows with `run_id IS NULL` are excluded from the index — ON CONFLICT can't fire. This is the M4_DUAL_PATH legacy compat: some historical rows have run_id NULL. New code in this SPEC will assert run_id NOT NULL at RPC entry to enforce the contract.

**Test cases mentally walked:**
- A. Both rows have run_id + template_slug set, same tuple → 2nd row no-ops. PASS.
- B. Row missing run_id → RPC raises error → caller logs to crm_message_log + continues with remaining rows. PASS (intentional defense-in-depth).
- C. Row missing template_slug → RPC raises error. PASS.
- D. Two rows with SAME run_id but DIFFERENT channel (sms vs email) for same lead → both insert (channel differs in conflict tuple). PASS — that's the intended behavior, not a dup.
- E. Row with status='cancelled' on existing queue row + new INSERT of same tuple → INSERT succeeds (existing 'cancelled' row excluded from partial filter). PASS — re-enqueue after cancellation is legitimate.

---

## 1. Goal

Make the `crm_message_queue` insert path idempotent at the DB level — concurrent inserts of the same (tenant, run, lead, slug, channel) tuple no-op the second one via `ON CONFLICT DO NOTHING`. Replace the racy client-side SELECT-then-INSERT pattern in queue-send.ts with the same atomic primitive.

Verify under demo load: 3 parallel calls inserting the same 1,200-recipient batch produce exactly 1,200 queue rows, not 3,600.

---

## 2. Success Criteria

| # | Criterion | Expected value |
|---|---|---|
| 1 | New RPC | `enqueue_crm_messages_idempotent(p_rows jsonb)` exists. SECURITY DEFINER. SET search_path='public'. Returns `jsonb {inserted:int, conflicted:int, errors:int}`. Canonical JWT-claim tenant isolation. |
| 2 | RPC body uses ON CONFLICT | grep RPC source → contains `ON CONFLICT (tenant_id, run_id, lead_id, template_slug, channel) WHERE` + `DO NOTHING`. |
| 3 | RPC validates run_id + template_slug NOT NULL per row | grep RPC source → row-level NULL check; rows lacking either bubble up as error_count. |
| 4 | dispatch.ts routes through RPC | `db.from("crm_message_queue").insert(chunk)` replaced with `db.rpc('enqueue_crm_messages_idempotent', {p_rows: chunk})`. |
| 5 | queue-send.ts routes through RPC | The lines 102-123 SELECT-then-INSERT pattern deleted. Just call the RPC with all rows. |
| 6 | EF redeploy | automation-engine v23 (post-B) → v24. |
| 7 | Demo idempotency test | 3 parallel curl POSTs each inserting same 1,200-row batch via the RPC. Result: 1,200 rows inserted total (not 3,600). RPC return: first call `{inserted:1200, conflicted:0}`; other two `{inserted:0, conflicted:1200}`. |
| 8 | Prizma all tables bit-identical pre/post | counts unchanged. |
| 9 | Iron Rule 31 gate | exit 0 or 2. |
| 10 | Iron Rule 32 ops declared | DDL: 1 RPC create. DML: re-use SPEC A's demo load test scripts. |
| 11 | Iron Rule 33 demo-first | Migration applied to demo first; then Prizma. |
| 12 | Iron Rule 34 Chrome MCP live verification | Demo: drive a fresh demo event status change under load, observe `crm_message_queue` row count equals planned recipients, not 2× or 3×. |
| 13 | Smoke baseline | 7/7 PASS. |

---

## 3. Autonomy Envelope

### What the Executor CAN do
- Apply 1 migration on demo: create RPC + grant.
- Apply migration on Prizma after demo verification green.
- Redeploy automation-engine v23 → v24.
- Re-use SPEC A's inject + cleanup scripts for the live test on demo.
- Idempotency curl test against demo EF endpoint.

### What REQUIRES stopping
- Demo test shows >1,200 queue rows after 3 parallel inserts → STOP.
- Existing function with same name found → STOP.
- RPC raises a JWT-claim error on a service_role caller → STOP (header bug).
- Any need to alter the partial index → STOP (out of scope).

---

## 4. Stop-on-Deviation Triggers

- ON CONFLICT statement raises "no unique or exclusion constraint matching the ON CONFLICT specification" at runtime → the WHERE clause does not match the index's WHERE clause exactly. STOP, re-grep `pg_indexes` for the actual definition.
- Demo idempotency test inserts >1,200 rows but <3,600 (e.g., 2,400) → partial fix; STOP.
- Demo Postgres logs show new `permission denied for function` → grant missing.

---

## 5. Rollback Plan

- Pre-write tag pushed.
- Code: `git checkout <tag> -- supabase/functions/automation-engine/dispatch.ts queue-send.ts`. Redeploy v24 source back to v23.
- Migration: rollback in ROLLBACK.md:
  ```sql
  DROP FUNCTION IF EXISTS public.enqueue_crm_messages_idempotent(jsonb);
  ```

---

## Destructive Operations

Authorized:
1. **DDL CREATE FUNCTION** — additive RPC.
2. **DDL GRANT EXECUTE** to authenticated + service_role — additive.
3. **EF redeploy** automation-engine v23 → v24.
4. **DML on demo (load-test re-use)** — SPEC A's inject + cleanup scripts, sentinel-bound.

NONE of: DROP TABLE / DROP COLUMN / DROP INDEX / DROP POLICY, TRUNCATE, mass-delete without tenant scope, `--no-verify`, force push, main branch.

---

## 6. Out of Scope

- The partial unique index itself (`uq_crm_message_queue_idem`). NOT modified. It already keys on the right tuple; we just route inserts through it correctly.
- `dispatch-queue` EF (already has its own advisory-lock from M4_NIGHT_RUN_2026_05_20 W2.1).
- `send-message` EF.
- Cancelled-row re-enqueue policy (works automatically since cancelled rows are excluded from the partial filter).
- Browser-side `crm-automation-queue-send.js` legacy bypass — code comment at queue-send.ts:99-101 notes it's a latent bug; in practice it's dead code (Rung 2 routes browser through this EF). NOT touched here.

---

## 7. Expected Final State

### New files
- `modules/Module 4 - CRM/docs/specs/M4_QUEUE_INSERT_ON_CONFLICT/{SPEC,EXECUTION_REPORT,FINDINGS,TEST_REPORT,FOREMAN_REVIEW,ROLLBACK}.md`
- `modules/Module 4 - CRM/migrations/m4_queue_on_conflict_rpc_2026_05_21.sql`

### Modified files
- `supabase/functions/automation-engine/dispatch.ts` — line 69 `.insert(chunk)` → `db.rpc('enqueue_crm_messages_idempotent', {p_rows: chunk})`. Log-row failure-fallback at lines 71-94 stays — still catches RPC-level errors with the same crm_message_log row-per-item.
- `supabase/functions/automation-engine/queue-send.ts` — lines 90-128 (SELECT-then-INSERT) deleted. Replaced with single RPC call. Comment at 91-101 about partial-index limitation deleted (no longer relevant).
- `modules/Module 4 - CRM/docs/db-schema.sql` — RPC entry added.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — top entry.

### DB state
- 1 new RPC on demo + Prizma. Zero existing data touched.

---

## 8. Commit Plan

- **Commit 1** — `feat(m4): migration — enqueue_crm_messages_idempotent RPC`
  - Files: the migration .sql + ROLLBACK.md.
- **Commit 2** — `feat(m4): automation-engine dispatch.ts + queue-send.ts use ON CONFLICT RPC (v24)`
  - Files: dispatch.ts + queue-send.ts.
- **Commit 3** — `docs(spec): close M4_QUEUE_INSERT_ON_CONFLICT — EXECUTION_REPORT + FINDINGS + TEST_REPORT + FOREMAN_REVIEW + SESSION_CONTEXT`

3 commits total.

---

## 9. Migration SQL

```sql
-- enqueue_crm_messages_idempotent — atomic insert into crm_message_queue with
-- ON CONFLICT DO NOTHING against the partial unique index uq_crm_message_queue_idem.
-- supabase-js cannot emit the partial WHERE clause on its own; this RPC does.
CREATE OR REPLACE FUNCTION public.enqueue_crm_messages_idempotent(
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_jwt_tenant uuid;
  v_inserted   int := 0;
  v_total      int;
  v_errors     int := 0;
BEGIN
  -- Canonical JWT-claim tenant isolation (service_role bypass on NULL claims).
  BEGIN
    v_jwt_tenant := (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_tenant := NULL;
  END;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RETURN jsonb_build_object('inserted', 0, 'conflicted', 0, 'errors', 1, 'error_message', 'p_rows_not_array');
  END IF;
  v_total := jsonb_array_length(p_rows);
  IF v_total = 0 THEN
    RETURN jsonb_build_object('inserted', 0, 'conflicted', 0, 'errors', 0);
  END IF;

  -- Pre-validate: every row carries tenant_id consistent with JWT claim (or
  -- caller is service_role with NULL claim). Reject batch if any row crosses tenants.
  IF v_jwt_tenant IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_rows) r
      WHERE (r->>'tenant_id')::uuid IS DISTINCT FROM v_jwt_tenant
    ) THEN
      RAISE EXCEPTION 'enqueue_crm_messages_idempotent: row tenant_id mismatch'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Reject rows missing run_id or template_slug — they cannot benefit from the
  -- partial unique index and routing them through ON CONFLICT would silently insert
  -- duplicates. Count them in v_errors so the caller can log them, return early
  -- without inserting any so the batch stays atomic-or-nothing.
  v_errors := (
    SELECT count(*) FROM jsonb_array_elements(p_rows) r
    WHERE r->>'run_id' IS NULL OR r->>'template_slug' IS NULL
  );
  IF v_errors > 0 THEN
    RETURN jsonb_build_object(
      'inserted', 0,
      'conflicted', 0,
      'errors', v_errors,
      'error_message', 'rows_missing_run_id_or_template_slug'
    );
  END IF;

  -- Atomic INSERT ... ON CONFLICT DO NOTHING. The WHERE clause on the ON CONFLICT
  -- target must match the partial index exactly.
  WITH ins AS (
    INSERT INTO public.crm_message_queue (
      tenant_id, event_id, lead_id, run_id, channel, template_slug,
      variables, language, status, scheduled_at, created_at, broadcast_id
    )
    SELECT
      (r->>'tenant_id')::uuid,
      NULLIF(r->>'event_id','')::uuid,
      (r->>'lead_id')::uuid,
      (r->>'run_id')::uuid,
      r->>'channel',
      r->>'template_slug',
      COALESCE(r->'variables', '{}'::jsonb),
      COALESCE(r->>'language', 'he'),
      COALESCE(r->>'status', 'queued'),
      COALESCE((r->>'scheduled_at')::timestamptz, now()),
      now(),
      NULLIF(r->>'broadcast_id','')::uuid
    FROM jsonb_array_elements(p_rows) r
    ON CONFLICT (tenant_id, run_id, lead_id, template_slug, channel)
       WHERE (run_id IS NOT NULL AND template_slug IS NOT NULL
              AND status = ANY (ARRAY['queued','processing','sent']))
       DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'conflicted', v_total - v_inserted,
    'errors', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_crm_messages_idempotent(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_crm_messages_idempotent(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.enqueue_crm_messages_idempotent(jsonb) IS
  'M4_QUEUE_INSERT_ON_CONFLICT (2026-05-21). Idempotent INSERT into crm_message_queue '
  'via ON CONFLICT DO NOTHING against the partial unique index uq_crm_message_queue_idem. '
  'supabase-js cannot emit the partial WHERE on its own; this RPC bridges that.';
```

---

## 10. Phase 2 — Idempotency Verification on Demo

After Commit 2 + EF deploy:

1. Re-use SPEC A's load test (1,200 demo leads injected).
2. Inject one SCE row + invoke `consume_status_events` ONCE for tenant=demo with limit=10. Capture the resulting `run_id` and queue-row count (expected: 1,200).
3. RE-INVOKE the consumer manually with the SAME injected SCE (re-set claimed_at to NULL first). Expect: RPC returns `{inserted: 0, conflicted: 1200}`. Queue row count UNCHANGED.
4. Without SPEC B's claim mechanism active, fire 3 parallel direct calls to the RPC with the same row batch from bash:
   ```bash
   PAYLOAD=$(node scripts/build-rpc-payload.mjs)  # builds the 1,200-row jsonb
   for i in 1 2 3; do
     curl ".../rest/v1/rpc/enqueue_crm_messages_idempotent" \
       -H "apikey: $ANON_KEY" -H "Authorization: Bearer $JWT" \
       -d "{\"p_rows\": $PAYLOAD}" &
   done
   wait
   ```
5. Assert: total inserted across all 3 calls = 1,200 (not 3,600). Queue table row count for the run_id = 1,200.
6. Cleanup: delete queue rows for the test run_id, delete injected SCE, run SPEC A's cleanup script.

---

## 11. Lessons Already Incorporated

- FROM INCIDENT_REPORT §2.3 → APPLIED. Direct response.
- FROM `JWT_VALIDATION_HEADER.sql` → APPLIED. service_role bypass on NULL claims + strict cross-tenant rejection.
- FROM `queue-send.ts:91-101` in-code comment (the original 2026-05-03 author noted the partial-index limitation) → APPLIED. RPC bridges the gap explicitly.
- FROM `feedback_probe_constraints_not_just_tables.md` → APPLIED. Pre-flight read the actual index definition; confirmed the partial WHERE clause; built the ON CONFLICT body to match it exactly.
- FROM `feedback_dont_add_unrequested_features.md` → APPLIED. Did NOT drop the partial unique index; did NOT replace it with a full unique constraint; did NOT add a cancelled-row re-enqueue policy. Tight scope.

### Cross-reference sweep

- `enqueue_crm_messages_idempotent` — grepped GLOBAL_SCHEMA + MODULE_MAP + ts/js — 0 hits. Safe.
- `p_rows jsonb` signature — no other function takes this shape (verified via `\df` query mentally).
- No new tables, columns, indexes, views, or policies. Rule 21 satisfied.

---

## 12. Pre-Merge Checklist

- [ ] §2 success criteria pass with captured values.
- [ ] Iron Rules 31 + 32 + 33 + 34 honored.
- [ ] HEAD pushed to develop.
- [ ] Pipeline lock released (last SPEC of series).
- [ ] 5 SPEC docs + 1 ROLLBACK.md present.
- [ ] Demo + Prizma RPCs created; both schema_hashes captured pre/post.
- [ ] Idempotency test PASS captured in TEST_REPORT.md.
- [ ] Combined post-SPEC-C state: SPEC A's operator-brake + SPEC B's consumer-claim + SPEC C's queue-conflict = three independent safety layers, each verified.

---

*End of SPEC.*
