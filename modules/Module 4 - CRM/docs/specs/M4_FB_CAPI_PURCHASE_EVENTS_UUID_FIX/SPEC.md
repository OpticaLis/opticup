# SPEC — M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-19
> **Module:** 4 — CRM
> **Class:** P0 HOTFIX of the just-shipped `M4_FB_CAPI_PURCHASE_EVENTS` SPEC (which is currently broken in production).
> **Author signature:** Claude Code single-chat Full-Auto Pipeline (Opus author → Sonnet executor → default reviewer → default LH-Tester → Opus closure).
> **Risk class:** LOW. 1 migration, 3 `CREATE OR REPLACE FUNCTION` calls. No DROP, no table changes, no trigger re-creation, no destructive ops. Daniel-authorized 2026-05-19.

---

## 0. Pre-Authoring Reality Check

This is a HOTFIX SPEC. The parent SPEC `M4_FB_CAPI_PURCHASE_EVENTS` shipped 3 trigger functions whose bodies reference `public.uuid_generate_v5(public.uuid_ns_oid(), ...)`. Live DB probe at Localhost-Tester phase 4 confirmed the `uuid-ossp` extension installs functions into the `extensions` schema (Supabase convention), not `public`. Result: SQLSTATE 42883 fires on every INSERT/UPDATE-of-status/UPDATE-of-purchase_amount on `crm_event_attendees`. This blocks ALL attendee writes on both demo + Prizma in production right now.

- ✅ Parent SPEC `M4_FB_CAPI_PURCHASE_EVENTS` read in full — particularly §0.7 runtime-semantics rehearsal (which missed the schema-location check), §3.5 verbatim trigger function bodies (which this SPEC patches), and §11 Destructive Operations (1 op was declared there for the parent constraint swap; THIS hotfix declares 0).
- ✅ Localhost-Tester escalation read: `modules/Module 4 - CRM/escalations/2026-05-19T15-50-00Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_OSSP_SCHEMA.md` — 3 options analyzed; Option A (schema-qualify) chosen.
- ✅ Supervisor Shadow Mode proposal read: `modules/Module 4 - CRM/escalations/ARCHITECT_DECISION_2026-05-19T15-50-00Z_*.md` — Confidence 1, escalation continued, Option A consistent with project convention.
- ✅ Independent Foreman probe of `pg_proc` joined to `pg_namespace`: `uuid_generate_v5(uuid, text)` and `uuid_ns_oid()` both live in schema `extensions`, NOT `public`. Confirmed reproducible via `DO $$ ... INSERT crm_event_attendees ... EXCEPTION sqlstate 42883 ... $$` block.
- ✅ Daniel authorized this SPEC in chat on 2026-05-19 + answered the pre-flight question (keep `uuid_generate_v5` for Brief D6's Meta-dedup semantic; do NOT switch to `gen_random_uuid()`).

### 0.4 Foreman's pre-flight answer to Daniel's question

**Question (from Daniel):** "Why is `uuid_generate_v5` (deterministic) preferred over `gen_random_uuid` (random) for the event_id?"

**Foreman's answer:** Brief D6 explicitly demanded "stable hash for Meta dedup." The functional value of determinism vs randomness:

- **Queue-row-level idempotency:** The unique constraint `(tenant_id, lead_id, event_name)` on `crm_capi_dispatch_queue` already prevents duplicate queue rows for the same (lead, event_name). The trigger's `ON CONFLICT DO NOTHING` clause means the same event never gets a second queue row.
- **Meta-side dedup via stable event_id:** Inside a single queue row's lifetime (queued → dispatched → sent OR failed → retried), the event_id is fetched once at trigger fire and stored in the queue row. EF retries on the same row carry the SAME event_id — Meta dedupes naturally. This is true with EITHER v5 or `gen_random_uuid()` (both produce a value stored ONCE in the row).
- **The edge case where v5 wins:** Operator deletes a previously-dispatched queue row, then a status/amount cycle re-fires the trigger. With `gen_random_uuid()` the new queue row gets a NEW event_id → Meta double-counts. With v5 the new row gets the SAME event_id → Meta dedupes. The unique constraint can't prevent this because the prior row was deleted, so the new INSERT succeeds.

This edge case is operational (operators rarely delete queue rows; status cycles after deletion are unusual) but real. Brief D6 protected against it; Foreman preserves the protection. **Decision: keep `uuid_generate_v5` with `extensions.` schema-qualifier.** No `gen_random_uuid` alternative proposed.

### 0.5 Live DB Baselines

| Symbol | Source | Value (captured 2026-05-19T15:50 UTC) |
|---|---|---|
| `BASE_PARENT_HEAD` | `git log --oneline -1` | `e4b32f3` (Reviewer audit of parent SPEC) — actually `1dc4751` after LH-Tester's RED TEST_REPORT commit |
| `BASE_UUID_OSSP_SCHEMA` | `SELECT n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname='uuid_generate_v5'` | `extensions` (NOT `public` — this is the root cause) |
| `BASE_TRIGGER_FN_COUNT` | `SELECT count(*) FROM pg_proc WHERE proname IN ('capi_enqueue_complete_registration_fn','capi_enqueue_event_attended_fn','capi_enqueue_purchase_fn')` | 3 (already exist from parent SPEC's C2 migration) |
| `BASE_TRIGGER_COUNT` | `SELECT count(*) FROM pg_trigger WHERE tgname IN ('trg_capi_attendee_registered','trg_capi_attendee_attended','trg_capi_attendee_purchased')` | 3 (already exist; NOT touched by this SPEC) |
| `BASE_QUEUE_ROW_COUNT` | `SELECT count(*) FROM crm_capi_dispatch_queue` | 33 (existing Lead rows; unchanged) |
| `BASE_PURCHASE_ROW_COUNT` | `SELECT count(*) FROM crm_capi_dispatch_queue WHERE event_name IN ('CompleteRegistration','EventAttended','Purchase')` | 0 (D7 forward-only; no rows have been successfully enqueued because the triggers fail) |
| `BASE_ATTENDEE_WRITE_BROKEN` | `DO $$ ... INSERT crm_event_attendees ... ROLLBACK $$` reproduces SQLSTATE 42883 | confirmed regression |

### 0.6 Cross-Reference Check (Iron Rule 21)

| Name | Search | Hits | Resolution |
|---|---|---|---|
| `capi_enqueue_complete_registration_fn` (already exists from parent SPEC) | `pg_proc.proname` | 1 | EXTEND existing — `CREATE OR REPLACE FUNCTION` replaces body, NOT a new function |
| `capi_enqueue_event_attended_fn` | same | 1 | same |
| `capi_enqueue_purchase_fn` | same | 1 | same |
| `extensions.uuid_generate_v5` | `pg_proc.proname` joined to namespace | 1 | EXISTS, schema is `extensions` |
| `extensions.uuid_ns_oid` | same | 1 | EXISTS, schema is `extensions` |

**No new objects.** This SPEC adds 0 functions, 0 triggers, 0 constraints, 0 columns, 0 tables. It REPLACES the bodies of 3 existing functions.

### 0.7 Runtime Semantics Rehearsal (per skill §1.5 Step 5.3)

The new function bodies are byte-identical to the parent SPEC §3.5 bodies EXCEPT the 2-occurrence schema-qualifier change inside the INSERT VALUES clause.

**Diff per function (just one example — all 3 identical change shape):**

```diff
- public.uuid_generate_v5(public.uuid_ns_oid(), NEW.lead_id::text || ':' || 'CompleteRegistration')
+ extensions.uuid_generate_v5(extensions.uuid_ns_oid(), NEW.lead_id::text || ':' || 'CompleteRegistration')
```

**Edge cases — all unchanged from parent SPEC §0.7 rehearsal:**
- INSERT trigger fires on fresh attendee row → enqueue with deterministic event_id → ON CONFLICT DO NOTHING on duplicate.
- UPDATE OF status fires only on transition INTO 'attended' (explicit `OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'attended'`).
- UPDATE OF purchase_amount fires only on (NULL/0 → > 0) transition (explicit guard).
- SECURITY DEFINER + `SET search_path = public` unchanged. The schema-qualifier in the INSERT statement is explicit so it doesn't depend on search_path (defensive). The functions still set search_path to `public` to keep `crm_capi_dispatch_queue` and `crm_event_attendees` resolvable without qualification.

**Why search_path stays `public`:** the SPEC's only references that NEED schema resolution at runtime are the 2 uuid-ossp functions, which are now explicitly qualified. Everything else (the queue table, the attendee table, the `NEW`/`OLD` records) is `public.` or local — `public` search_path covers them.

**Alternative considered + rejected:** `SET search_path = public, extensions` (Option C from the LH-Tester's escalation). Rejected because explicit qualification is the project's stronger convention; `SET search_path` adjustments inside SECURITY DEFINER functions have bitten the project before.

**Runtime semantics rehearsed: yes.** All 3 function bodies trigger-fire on the same DML transitions as the parent SPEC; the only behavioral difference is "the uuid_generate_v5 call now resolves successfully instead of raising SQLSTATE 42883."

### Lessons Applied (from this SPEC's parent — the just-broken `M4_FB_CAPI_PURCHASE_EVENTS`)

| From | Lesson | How honored here |
|---|---|---|
| Parent SPEC §0.7 ran the rehearsal but didn't verify schema location of extension functions | Add a schema-location probe for any cited extension function | This SPEC §0.5 baseline INCLUDES the `pg_proc JOIN pg_namespace` probe explicitly. Logged as Foreman skill improvement proposal P-AUTHOR-1 at the closure FOREMAN_REVIEW.md. |
| Parent SPEC's Executor didn't probe `pg_proc.namespace` either — accepted the SPEC's snippet verbatim | Executor Step 1.5 should probe function-namespace for any function called by Foreman-prescribed SQL | Logged as P-EXEC-1 at the closure FOREMAN_REVIEW.md. The Tester's escalation already noted this (T-LH-2). |
| Parent SPEC's Reviewer audited static SQL bodies but didn't BEGIN/ROLLBACK rehearse them | Add a BEGIN/ROLLBACK execution rehearsal for SECURITY DEFINER trigger functions before approving | Logged as Reviewer-side proposal P-REVIEW-1 (informational; opticup-reviewer skill not currently in the self-improvement loop but the parent SPEC closure surfaces this). |

### D-AUTH (Foreman decisions pre-committed at author time)

- **D-AUTH-1.** Schema-qualify ALL uuid-ossp calls to `extensions.`. No partial fix. Each of the 3 function bodies must have `extensions.uuid_generate_v5(extensions.uuid_ns_oid(), ...)`.
- **D-AUTH-2.** Keep `uuid_generate_v5` per Foreman's pre-flight answer above. Do NOT switch to `gen_random_uuid()` — Brief D6's Meta-dedup-on-stable-hash semantic is preserved.
- **D-AUTH-3.** ZERO destructive ops. `CREATE OR REPLACE FUNCTION` is additive in IR32 terms — `destructive-ops-declared.mjs` does NOT scan for it. The parent SPEC declared 1 destructive op (constraint swap, already executed). This hotfix declares 0.
- **D-AUTH-4.** ZERO trigger touches. The triggers (`trg_capi_attendee_*`) already point at the function names; replacing the FUNCTION BODIES auto-updates what the trigger fires.
- **D-AUTH-5.** ZERO schema touches. No table changes, no constraint changes, no GRANT changes, no RLS changes.
- **D-AUTH-6.** ZERO EF touches. The EF doesn't reference `uuid_generate_v5` — it reads `event_id` from the queue row's already-stored UUID. The bug is purely in the trigger functions.
- **D-AUTH-7.** ZERO docs changes for this SPEC. The parent SPEC's `docs/FB_CAPI.md` §13 already documents the behavior correctly; only the function-body changes inside the trigger code path that produces the documented behavior. Optional: add a one-liner note about the schema-qualifier discovery to `docs/FB_CAPI.md` at Executor's discretion (≤ 3 lines if chosen).
- **D-AUTH-8.** D7 forward-only stands (inherited from parent SPEC). The fix does NOT backfill any historical attendee rows. After the fix lands, FUTURE attendee INSERTs and status/purchase_amount UPDATEs will produce queue rows; existing rows are NOT touched.

### Findings at SPEC Author Time

| # | Finding | Severity | Disposition |
|---|---|---|---|
| F-A1 | The parent SPEC's §0.7 runtime semantics rehearsal missed schema-location verification for extension functions. This is a generalizable opticup-strategic skill gap. | HIGH (Foreman skill) | Promote to P-AUTHOR-1 in closure FOREMAN_REVIEW.md — codify the schema-location probe in the strategic skill. |
| F-A2 | The parent SPEC's Executor accepted the Foreman's `public.uuid_generate_v5` snippet verbatim without independently verifying. | MEDIUM (Executor skill) | Promote to P-EXEC-1 in closure FOREMAN_REVIEW.md — Executor Step 1.5 must probe namespace for any explicitly-schema-qualified function call. |
| F-A3 | The parent SPEC's Reviewer audited static SQL but didn't BEGIN/ROLLBACK rehearse — would have caught this in seconds. | MEDIUM (Reviewer skill) | Noted informationally; Reviewer skill not in the self-improvement loop today. |

---

## 1. Goal

Restore the broken trigger-function chain shipped by `M4_FB_CAPI_PURCHASE_EVENTS` by `CREATE OR REPLACE FUNCTION`-ing the 3 trigger function bodies with `extensions.`-qualified calls to `uuid_generate_v5` + `uuid_ns_oid`. After this lands: attendee INSERTs and status/purchase_amount UPDATEs stop failing with SQLSTATE 42883, and the 6 E2E tests deferred from the parent SPEC can execute green.

---

## 2. Background & Motivation

The parent SPEC's C2 migration (commit `01bd44e`) shipped 3 trigger functions referencing `public.uuid_generate_v5(public.uuid_ns_oid(), ...)`. The Foreman's §0.7 rehearsal checked that the `uuid-ossp` extension was enabled (it is, v1.1) but did NOT check the schema location of the functions. On this Supabase project the extension's functions live in the `extensions` schema (a Supabase-standard convention since 2023 that moves extension-installed functions out of `public` to keep the public schema clean). The result: `public.uuid_generate_v5` doesn't resolve → SQLSTATE 42883 → trigger function aborts → parent transaction rolls back → no attendee row created.

Daniel authorized this hotfix in chat 2026-05-19 explicitly: "Approved: open M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX SPEC immediately."

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|----------------|----------------|
| 1 | Branch state | On `develop`, scope-clean at SPEC close | `git status --short` shows only pre-existing-unrelated paths |
| 2 | Commits produced | 3 commits: C1 (SPEC seal) + C2 (migration via MCP `apply_migration` + saved .sql) + C3 (retrospective) | `git log {SPEC_SEAL}..HEAD --oneline \| wc -l` → 2–3 (Reviewer + LH-Tester each add their own commit after this range) |
| 3 | New migration file | `supabase/migrations/{ts}_m4_capi_purchase_events_uuid_fix.sql` exists | `ls supabase/migrations/*uuid_fix*.sql` → 1 file |
| 4 | Migration applied to DB | MCP `apply_migration` returns success | post-apply probe (criteria 5–8 below all hold) |
| 5 | Function body 1: `capi_enqueue_complete_registration_fn` references `extensions.uuid_generate_v5(extensions.uuid_ns_oid(), ...)` | YES | `SELECT prosrc FROM pg_proc WHERE proname='capi_enqueue_complete_registration_fn'` contains substring `extensions.uuid_generate_v5(extensions.uuid_ns_oid()` |
| 6 | Function body 2: `capi_enqueue_event_attended_fn` same | YES | same shape |
| 7 | Function body 3: `capi_enqueue_purchase_fn` same | YES | same shape |
| 8 | NO `public.uuid_generate_v5` references remain in trigger functions | 0 | `SELECT count(*) FROM pg_proc WHERE proname LIKE 'capi_enqueue_%_fn' AND prosrc LIKE '%public.uuid_generate_v5%'` → 0 |
| 9 | Trigger count UNCHANGED (3) | 3 | `SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_capi_attendee_%'` → 3 |
| 10 | Trigger functions count UNCHANGED (3) | 3 | `SELECT count(*) FROM pg_proc WHERE proname LIKE 'capi_enqueue_%_fn'` → 3 |
| 11 | Existing queue rows UNCHANGED | 33 | `SELECT count(*) FROM crm_capi_dispatch_queue` → 33 |
| 12 | D7 forward-only — no backfill on Prizma's 84 purchase_amount>0 attendees | unchanged | `SELECT count(*) FROM crm_capi_dispatch_queue WHERE event_name='Purchase'` → 0 (will become >0 only when LH-Tester does E2E test 3) |
| 13 | INSERT into crm_event_attendees no longer fails | TRUE | LH-Tester E2E Test 1 succeeds |
| 14 | E2E Test 1 — CompleteRegistration | queue row enqueued with `event_name='CompleteRegistration'` | `SELECT event_name FROM crm_capi_dispatch_queue WHERE lead_id=<test>` |
| 15 | E2E Test 2 — EventAttended | queue row enqueued with `event_name='EventAttended'` | same |
| 16 | E2E Test 3 — Purchase | queue row enqueued with `event_name='Purchase'`; EF payload includes `custom_data.value=500 + currency='ILS'` | EF source path verified + `meta_response`/`event_payload` probe |
| 17 | E2E Test 4 — Idempotency on EventAttended | 1 row only after redundant UPDATE | same |
| 18 | E2E Test 5 — Refund direction no-op | 1 Purchase row only after purchase_amount=500→0 | same |
| 19 | E2E Test 6 — Typo correction no-op | 1 Purchase row only after purchase_amount=500→480 | same |
| 20 | Iron Rule 31 integrity gate passes at every commit | exit 0 or 2 | pre-commit hook |
| 21 | Iron Rule 32 destructive-ops gate | declared 0 ops; hook reads `## Destructive Operations` section | pre-commit hook + visual confirm §11 |
| 22 | Smoke 7/7 PASS post-state | 7 passing | `node tests/smoke/baseline.test.mjs` |
| 23 | Parent SPEC `M4_FB_CAPI_PURCHASE_EVENTS` dependency closed | this SPEC's TEST_REPORT.md links the deferred E2E criteria 14-19 of the parent | LH-Tester writes the linkage explicitly |

### 3.5 Verbatim Function Bodies — REPLACE these 3 in one migration

```sql
CREATE OR REPLACE FUNCTION public.capi_enqueue_complete_registration_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.crm_capi_dispatch_queue (
    tenant_id, lead_id, event_id, event_name, status
  ) VALUES (
    NEW.tenant_id,
    NEW.lead_id,
    extensions.uuid_generate_v5(extensions.uuid_ns_oid(), NEW.lead_id::text || ':' || 'CompleteRegistration'),
    'CompleteRegistration',
    'queued'
  )
  ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.capi_enqueue_event_attended_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'attended' THEN
    INSERT INTO public.crm_capi_dispatch_queue (
      tenant_id, lead_id, event_id, event_name, status
    ) VALUES (
      NEW.tenant_id,
      NEW.lead_id,
      extensions.uuid_generate_v5(extensions.uuid_ns_oid(), NEW.lead_id::text || ':' || 'EventAttended'),
      'EventAttended',
      'queued'
    )
    ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.capi_enqueue_purchase_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.purchase_amount IS NULL OR OLD.purchase_amount = 0)
     AND NEW.purchase_amount IS NOT NULL
     AND NEW.purchase_amount > 0 THEN
    INSERT INTO public.crm_capi_dispatch_queue (
      tenant_id, lead_id, event_id, event_name, status
    ) VALUES (
      NEW.tenant_id,
      NEW.lead_id,
      extensions.uuid_generate_v5(extensions.uuid_ns_oid(), NEW.lead_id::text || ':' || 'Purchase'),
      'Purchase',
      'queued'
    )
    ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
```

**Total migration size estimate:** ~60 lines (3 functions × ~20 lines each). Below Daniel's "~30 lines" estimate because the functions are explicitly schema-qualified at every call site rather than relying on search_path tricks. Plus 1 leading comment block (~5 lines) describing the fix purpose + cross-ref to the parent SPEC. Final target: ≤ 70 lines.

---

## 4. Autonomy Envelope

### CAN do autonomously

- Read any file in the repo.
- Run Level 1 read-only SQL via Supabase MCP `execute_sql`.
- Run Level 2 SQL ONLY for the declared migration (`apply_migration` MCP call named `m4_capi_purchase_events_uuid_fix`). Single migration, single apply.
- Save migration SQL to `supabase/migrations/{ts}_m4_capi_purchase_events_uuid_fix.sql`.
- INSERT 1 test attendee row + DELETE it during LH-Tester E2E (same pattern as parent SPEC LH-Tester would have run). Clean up at TEST_REPORT close.
- Modify exactly these files:
  - `supabase/migrations/{ts}_m4_capi_purchase_events_uuid_fix.sql` (NEW)
  - OPTIONAL: `docs/FB_CAPI.md` (≤ 3-line note about the schema-qualifier; D-AUTH-7 makes this optional)
- Stage by explicit filename; `git diff --cached --name-only` before every commit.

### MUST STOP

- Need to modify any file outside the 1 (+ optional 2nd) declared.
- MCP `apply_migration` returns error.
- Need to DROP / CREATE TRIGGER (this SPEC uses CREATE OR REPLACE FUNCTION only — triggers stay).
- Need to add ANY new object (function, trigger, table, column, constraint).
- Need to touch ANY table including `crm_event_attendees` / `crm_capi_dispatch_queue` schema.
- Iron Rule 31 / 32 gate fails.
- Smoke regresses.
- Cross-Module Safety Audit §4 (Daniel said "trivial — touches 3 functions only, no tables, no EF, no other module") — touching anything beyond the 3 functions → STOP.

### Bounded handling of EXPECTED deviations

- **MCP `apply_migration` returns a transient 5xx** → retry once. If still fails → STOP, escalate. (No CLI fallback because `apply_migration` is the canonical path for DB DDL; CLI is for EF deploys.)
- **Post-apply probe shows function still references `public.uuid_generate_v5`** → indicates the CREATE OR REPLACE didn't take effect. Re-apply once; if still fails → STOP.

---

## 5. Stop-Triggers (extended)

In addition to CLAUDE.md §9:

1. ANY destructive op detected by IR32 hook beyond the declared 0 → STOP.
2. Schema-qualifier reverts to `public.` for any function after apply → STOP (indicates the migration didn't replace the body correctly).
3. After migration apply, E2E Test 1 INSERT still fails with SQLSTATE 42883 → STOP (the fix didn't work).
4. After E2E Tests 1-6, ANY of them produces wrong event_name or duplicate rows → STOP.
5. After E2E, demo queue not cleaned up → STOP, manual cleanup required.

---

## 6. Pipeline

Same 5-phase Full-Auto Pipeline:

1. **Foreman (Opus)** authors this SPEC.md (DONE — this file).
2. **Executor (Sonnet)** — write migration + apply via MCP + verify post-apply + commit. Optional ≤ 3-line note in docs/FB_CAPI.md.
3. **Reviewer (default)** — read the 3 function bodies via `pg_proc.prosrc`, confirm verbatim match to §3.5 with the only change being `public.uuid_generate_v5` → `extensions.uuid_generate_v5` (and the `uuid_ns_oid` qualifier). Confirm no other DB changes. Write REVIEW.md.
4. **Localhost-Tester (default)** — smoke 7/7 + the 6 E2E tests deferred from parent SPEC + cleanup. Write TEST_REPORT.md.
5. **Foreman closes** — write FOREMAN_REVIEW.md for THIS SPEC. THEN write a CLOSURE_NOTE.md inside the parent SPEC folder updating its verdict from 🔴 to 🟡 CLOSED-WITH-HOTFIX-DEPENDENCY-CLOSED. Update memory + FUNNEL_ROADMAP. Hebrew status to Daniel.

---

## 7. Out of Scope

- ANY change to `crm_event_attendees`, `crm_capi_dispatch_queue` schema, indexes, RLS, GRANTs, constraints.
- ANY change to the 3 triggers (just CREATE OR REPLACE FUNCTION — triggers unchanged).
- ANY change to `fb-capi-dispatch` EF.
- ANY change to other M4 EFs or triggers.
- ANY change to `crm-pixel-gap-tile.js` or other CRM JS.
- Browser-pixel work.
- Refund / cancellation events.
- Multi-currency.
- Backfill of historical events.
- Adding `gen_random_uuid()` alternative.
- Touching any Brief §4.2 / §4.4 / §4.6 surface from the parent SPEC.

---

## 8. Expected Final State

**Files added/modified:**

| File | Action | Expected size |
|---|---|---|
| `supabase/migrations/{ts}_m4_capi_purchase_events_uuid_fix.sql` | NEW | ≤ 70 lines |
| `docs/FB_CAPI.md` | OPTIONAL MODIFIED | +0-3 lines (optional schema-qualifier note) |
| `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/SPEC.md` | NEW (this file) | this file |
| `.../EXECUTION_REPORT.md` | NEW (by Executor) | ~80 lines |
| `.../FINDINGS.md` | NEW | ~20 lines |
| `.../REVIEW.md` | NEW (by Reviewer) | ~60 lines |
| `.../TEST_REPORT.md` | NEW (by LH-Tester) | ~120 lines (includes the 6 E2E tests inherited from parent) |
| `.../FOREMAN_REVIEW.md` | NEW (by Foreman closure) | ~200 lines |
| `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS/CLOSURE_NOTE.md` | NEW (parent-SPEC pivot from 🔴 to 🟡 CLOSED-WITH-HOTFIX-DEPENDENCY-CLOSED) | ~40 lines |

**DB state:**
- 3 trigger function bodies REPLACED (CREATE OR REPLACE — additive in IR32 terms).
- 0 schema changes elsewhere.
- 33 existing queue rows preserved.
- 84 Prizma `purchase_amount > 0` attendees: NOT backfilled (D7).
- ≤ 1 test attendee row inserted on demo during LH-Tester, deleted at close. ≤ 3 test queue rows inserted on demo during E2E, deleted at close.

**Memory update at parent SPEC closure (via Foreman):**
- `project_fb_capi_p21_state.md` — promote Purchase events from "out of scope" to "live (after UUID_FIX hotfix)"; note Meta now receives full funnel.

---

## 9. Rollback Plan

Pure-revert. The 3 function bodies are CREATE OR REPLACE — to rollback, run another CREATE OR REPLACE FUNCTION with the OLD `public.uuid_generate_v5` bodies. The parent SPEC's bodies live in its commit `01bd44e` for reference.

Alternative rollback: apply a reverse migration that restores the parent SPEC's broken bodies (literally `git show 01bd44e -- supabase/migrations/*.sql` of the parent migration).

Neither path is destructive; both are CREATE OR REPLACE. Working tag `pre-uuid-fix` at SPEC start.

Iron Rule 32 still says 0 destructive ops in either direction.

---

## 10. Commit Plan

- **C1** (already committed at this Foreman's commit): `chore(spec): seal M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX — hotfix for trigger function schema-qualifier`
  - Files: this `SPEC.md`.
- **C2**: `fix(m4): M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX — schema-qualify uuid-ossp to extensions schema`
  - Files: `supabase/migrations/{ts}_m4_capi_purchase_events_uuid_fix.sql` + (OPTIONAL) `docs/FB_CAPI.md`.
  - Migration applied via MCP `apply_migration` BEFORE commit.
- **C3**: `chore(spec): M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX — Executor retrospective`
  - Files: `EXECUTION_REPORT.md` + `FINDINGS.md`.

Reviewer + LH-Tester + Foreman closure each add 1 commit. Total commit range expected: 6.

---

## 11. Destructive Operations

**Count: 0.**

`CREATE OR REPLACE FUNCTION` is additive in Iron Rule 32 terms. The `destructive-ops-declared.mjs` gate scans for: file deletes, `git rm`, mass renames, `git rebase`, `git reset --hard`, `git push --force`, `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `TRUNCATE`, `ALTER TABLE ... DROP`, DML mass-delete, CLAUDE.md / SKILL.md section deletion, main-branch modification. **None of these patterns appear in this SPEC's migration.**

If the Executor encounters any need for a destructive op (e.g., the function body replacement somehow requires DROP FUNCTION first — it doesn't, CREATE OR REPLACE is sufficient) → STOP, escalate.

---

## 12. Cross-References

- **Parent SPEC:** `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS/SPEC.md` (closed 🔴 pending this hotfix; this SPEC's closure pivots the parent to 🟡 CLOSED-WITH-HOTFIX-DEPENDENCY-CLOSED).
- **Parent SPEC retrospective:** `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS/EXECUTION_REPORT.md` + `FINDINGS.md` + `REVIEW.md` + `TEST_REPORT.md`.
- **LH-Tester escalation:** `modules/Module 4 - CRM/escalations/2026-05-19T15-50-00Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_OSSP_SCHEMA.md`.
- **Supervisor Shadow proposal:** `modules/Module 4 - CRM/escalations/ARCHITECT_DECISION_2026-05-19T15-50-00Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_OSSP_SCHEMA.md`.
- **Iron Rules:** 12, 21, 22, 31, 32.
- **Supabase extension-schema convention:** functions installed via `CREATE EXTENSION ... WITH SCHEMA extensions` (Supabase's default since 2023).

---

## 13. Author Notes

This is the smallest possible recovery SPEC. Every line of the function bodies stays the same except the 2 schema-qualifier strings per function (6 total characters change × 3 functions). The Reviewer's audit is straightforward: read `pg_proc.prosrc` for each of the 3 functions + grep for `extensions.uuid_generate_v5` (should be 1 hit per function) and `public.uuid_generate_v5` (should be 0 hits across all 3).

**Why this was missed:** the Foreman §0.7 runtime semantics rehearsal in the parent SPEC verified the existence of the extension (✅ uuid-ossp v1.1 enabled) but not the schema location. Supabase moved most extensions to a dedicated `extensions` schema since 2023 — a SaaS-specific pattern that the public Postgres docs' example "`uuid_generate_v5(uuid_ns_oid(), ...)`" doesn't reflect. The lesson is documented in §0.7 above and will be promoted to the opticup-strategic SKILL in the FOREMAN_REVIEW.md.

**Why this is a HOTFIX class:** P0 production regression. Prizma operators can't register attendees, mark attendance, or record purchases AT THIS MOMENT until this lands. The fix is trivial in shape but urgent in priority.

---

*End of SPEC.*
