# TEST_REPORT — M4_FB_CAPI_PURCHASE_EVENTS

**Date:** 2026-05-19 15:55Z
**Tester:** opticup-localhost-tester (skill)
**Repo:** opticalis/opticup, branch `develop`, HEAD `e4b32f3`
**Status:** **🔴 RED — env-blocker (trigger semantics regression: schema-resolution failure)**
**Smoke:** 7/7 PASS (baseline) — captured before E2E ran
**E2E:** 0/6 RUN — blocked by trigger function regression on first INSERT
**Iron Rule 34:** N/A — Executor opted to skip `crm-pixel-gap-tile.js` per D-AUTH-7

---

## §0 Metadata

| Field | Value |
|---|---|
| SPEC folder | `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS/` |
| SPEC sealed commit | `28738f6` |
| C2 (migration) | `01bd44e` |
| C3 (EF + docs) | `dbb8ecf` |
| C4 (Executor retro) | `368636c` |
| C5 (Reviewer) | `e4b32f3` |
| HEAD at LH-Tester start | `e4b32f3` |
| Demo tenant_id | `8d8cfa7e-ef58-49af-9702-a862d459cccb` |
| Demo lead_id used | `cb6b343e-e4cc-42b0-990a-91999111a03c` (full_name: "Localhost Tester E2E", phone: `+972503348349` — allowlist per memory `feedback_test_data_phones`) |
| Demo event_id used | `a089ed87-db77-45e5-ba23-d233225da2ce` (name: "אירוע המותגים טסט 5.19 - 2") |
| Pipeline coordination lock | `_archive/pipeline-sessions/2026-05-19T15-46-03-348Z_M4_FB_CAPI_PURCHASE_EVENTS_pid-8864-741e969c.lock` (claimed) |
| Escalation written | `modules/Module 4 - CRM/escalations/2026-05-19T15-50-00Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_OSSP_SCHEMA.md` |
| Supervisor Triage response | `modules/Module 4 - CRM/escalations/ARCHITECT_DECISION_2026-05-19T15-50-00Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_OSSP_SCHEMA.md` (Status: SHADOW_PROPOSAL · Confidence: 1) |
| Supervisor Shadow log | `_archive/supervisor-log/shadow-2026-05-19.md` (1 row appended) |

---

## §1 Startup result

| Server | URL | Response | Time |
|---|---|---|---|
| ERP | http://localhost:3000/index.html | 200 OK | <50ms |
| Storefront | http://localhost:4321/ | 200 OK | <50ms |

Both servers already running at session start (no `scripts/start-local.ps1` invocation needed).

Pipeline coordination lock claimed successfully via `node scripts/pipeline-coordination.mjs claim` (lock filename in §0).

---

## §2 Smoke 7/7 POST result

Run: `node tests/smoke/baseline.test.mjs`

```
opticup baseline smoke — 7 tests
Tenant: 8d8cfa7e-ef58-49af-9702-a862d459cccb (demo)

  PASS  1. PIN login returns JWT with tenant_id=demo  (886ms)
  PASS  2. Create CRM lead succeeds (M4)  (210ms)
  PASS  3. Read inventory count for demo tenant (M1)  (297ms)
  PASS  4. Storefront homepage returns 200  (1244ms)
  PASS  5. Storefront /supersale lead-form page returns 200  (852ms)
  PASS  6. Cross-module: lead from test-2 visible via crm_leads SELECT  (122ms)
  PASS  7. No 5xx on critical pages (HEAD only)  (1082ms)

7/7 passed, 0 failed
```

**Verdict:** ✅ Smoke 7/7 PASS. SPEC §3 criterion 27 satisfied.

Important observation: smoke Test 2 (create CRM lead) PASSED — meaning `crm_leads` INSERTs still work. The regression captured below is specific to `crm_event_attendees`-triggered code paths (the 3 new triggers added by this SPEC's C2 migration).

---

## §3 E2E Test 1 (CompleteRegistration) — REGRESSION CAPTURED

**SPEC §3 criterion 14.** First attempted action.

**Pre-state probe** (before any INSERT):

```sql
SELECT
  (SELECT count(*) FROM crm_capi_dispatch_queue WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb') AS demo_queue_total,
  (SELECT count(*) FROM crm_capi_dispatch_queue WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND event_name='CompleteRegistration') AS demo_complete_reg,
  (SELECT count(*) FROM crm_capi_dispatch_queue WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND event_name='EventAttended') AS demo_event_attended,
  (SELECT count(*) FROM crm_capi_dispatch_queue WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND event_name='Purchase') AS demo_purchase,
  (SELECT count(*) FROM crm_capi_dispatch_queue WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma') AND event_name IN ('CompleteRegistration','EventAttended','Purchase')) AS prizma_new_event_names,
  (SELECT count(*) FROM crm_capi_dispatch_queue) AS total_all;
```

Result: `demo_queue_total=3 · demo_complete_reg=0 · demo_event_attended=0 · demo_purchase=0 · prizma_new_event_names=0 · total_all=33` (D7 baseline clean; Reviewer's count of 33 confirmed.)

**Attempted action:**

```sql
INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status)
VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb',
  'cb6b343e-e4cc-42b0-990a-91999111a03c',
  'a089ed87-db77-45e5-ba23-d233225da2ce',
  'registered'
)
RETURNING id, tenant_id, lead_id, event_id, status, purchase_amount, created_at;
```

**Actual result — verbatim error trace:**

```
ERROR: 42883: function public.uuid_ns_oid() does not exist
HINT: No function matches the given name and argument types. You might need to add explicit type casts.
QUERY:  INSERT INTO public.crm_capi_dispatch_queue (
    tenant_id, lead_id, event_id, event_name, status
  ) VALUES (
    NEW.tenant_id,
    NEW.lead_id,
    public.uuid_generate_v5(public.uuid_ns_oid(), NEW.lead_id::text || ':' || 'CompleteRegistration'),
    'CompleteRegistration',
    'queued'
  )
  ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING
CONTEXT:  PL/pgSQL function capi_enqueue_complete_registration_fn() line 4 at SQL statement
```

**Root cause** (diagnostic probe, read-only):

```sql
SELECT n.nspname || '.' || p.proname AS fn,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('uuid_ns_oid', 'uuid_generate_v5', 'uuid_generate_v4');
```

Returned:
- `extensions.uuid_generate_v4()`
- `extensions.uuid_generate_v5(namespace uuid, name text)`
- `extensions.uuid_ns_oid()`

The 3 trigger functions reference `public.uuid_generate_v5` and `public.uuid_ns_oid` — neither exists. The `uuid-ossp` extension is enabled but its functions live in the `extensions` schema on this Supabase project, not `public`. The SPEC §0.5 baseline confirmed the extension is enabled (`pg_extension WHERE extname='uuid-ossp'`) but did not probe the schema namespace.

**Post-state probe** (after the failed INSERT — transaction rolled back):

```sql
SELECT count(*) AS attendee_count
FROM crm_event_attendees
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND lead_id = 'cb6b343e-e4cc-42b0-990a-91999111a03c'
  AND event_id = 'a089ed87-db77-45e5-ba23-d233225da2ce';

SELECT
  (SELECT count(*) FROM crm_capi_dispatch_queue WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND event_name='CompleteRegistration') AS demo_complete_reg,
  (SELECT count(*) FROM crm_capi_dispatch_queue) AS total_all;
```

Result: `attendee_count=0 · demo_complete_reg=0 · total_all=33` — confirms full transaction rollback; nothing persisted from the failed test.

**Verdict for Test 1:** 🔴 **REGRESSION — trigger function aborts the parent INSERT due to schema-resolution failure of `uuid_ns_oid()`.**

Per SPEC §4 dispatch line and §5 stop-trigger #6: "Demo E2E test 14/15/16 doesn't produce the expected queue rows — STOP, escalate (trigger semantics regression)." Stop-trigger fired. No further DML attempted on demo or Prizma.

---

## §4 E2E Test 2 (EventAttended) — NOT RUN

**SPEC §3 criterion 15.** BLOCKED by §3 regression.

Test 2 requires an existing attendee row to UPDATE. The Test 1 INSERT rolled back; no attendee row exists to UPDATE. Even if one were obtained from existing demo data, the UPDATE-OF-status trigger (`trg_capi_attendee_attended`) calls the same broken `capi_enqueue_event_attended_fn()` which also references `public.uuid_generate_v5(public.uuid_ns_oid(), ...)`. Result would be the same SQLSTATE 42883.

Per "What I Never Do" + stop-on-deviation: no further DML attempted.

**Verdict:** 🔴 NOT RUN — blocked.

---

## §5 E2E Test 3 (Purchase) — NOT RUN

**SPEC §3 criterion 16.** BLOCKED by §3 regression.

Same reasoning: `trg_capi_attendee_purchased` calls `capi_enqueue_purchase_fn()` with the same broken `public.uuid_generate_v5(public.uuid_ns_oid(), ...)` pattern. No path to test the EF-side `custom_data` payload because no queue row can be enqueued.

**Note for the Reviewer's §6 EF-source verification claim:** the LH-Tester DID re-read the EF source at lines 159–202 (`fb-capi-dispatch/index.ts`) and confirms the `purchaseCustomData = { value: Number(attendee.purchase_amount), currency: "ILS" }` assignment exists at line 177 and is spread into both `eventPayload` (line 186) and `capiBody.data[0]` (line 199). The EF code path is correct; what blocks Test 3 is the upstream trigger, not the EF.

**Verdict:** 🔴 NOT RUN — blocked. EF code path verified by source-read (static-evidence only, not runtime).

---

## §6 E2E Tests 4, 5, 6 (idempotency + refund + typo) — NOT RUN

**SPEC §3 criteria 17, 18, 19.** All require a successful Test 3 baseline (an existing Purchase queue row to assert "no new row" against). Cannot be exercised against the current code.

**Verdict:** 🔴 NOT RUN — blocked.

---

## §7 D7 forward-only verification (Prizma)

**SPEC §3 criterion 29.** This is the ONE criterion the LH-Tester can verify even with broken triggers.

```sql
SELECT count(*) AS prizma_new_event_count
FROM crm_capi_dispatch_queue
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='prizma')
  AND event_name IN ('CompleteRegistration','EventAttended','Purchase');
```

Result: **`prizma_new_event_count = 0`.**

**Side observation:** the regression means that 0 rows can be enqueued by the triggers — so D7 holds trivially (the broken triggers couldn't backfill even if they tried). When the UUID fix lands, D7 still holds because the SPEC's trigger functions only fire on AFTER INSERT / AFTER UPDATE — not on historical data. The 84 existing `purchase_amount > 0` rows on Prizma remain un-enqueued unless an operator UPDATEs them (which they have no reason to do).

**Verdict for criterion 29:** ✅ PASS (current state) — but note this is currently trivially true because no triggers fire successfully. The forward-only property will need re-verification after the UUID fix lands.

---

## §8 Iron Rule 34 N/A justification

**SPEC D-AUTH-7 explicitly bounded:** "If the tile IS touched → Iron Rule 34 triplet required... If the tile is NOT touched → Iron Rule 34 does not apply to this SPEC (DB triggers + EF aren't browser-consumed)."

**Executor decision per EXECUTION_REPORT §4:** SKIP `crm-pixel-gap-tile.js`. The 98-line tile is unmodified.

**LH-Tester confirmation:**

```
$ git log --name-only 28738f6..e4b32f3 -- "modules/crm/crm-pixel-gap-tile.js"
(empty output — file not modified in this SPEC's commit range)
```

The Reviewer's §2 criterion 30 verdict ("Tile SKIPPED per Executor D-AUTH-7 decision; IR34 N/A for this SPEC") stands. **Iron Rule 34 — Chrome MCP triplet (screenshot + runtime trace + DB-query evidence) — does NOT apply to this SPEC's LH-Tester phase.** No Chrome MCP work is required for closure.

(This is not a bypass — D-AUTH-7 is the Foreman-pre-decided in-scope authorization to skip the tile, codified at SPEC author time per the new project Iron Rule 34 introduced 2026-05-19.)

---

## §9 SPEC §3 criteria 14–19 + 27 verdict table

| # | Criterion | Verdict | Evidence |
|---|---|:-:|---|
| 14 | Demo E2E — CompleteRegistration | 🔴 REGRESSION | §3 above; trigger function aborts INSERT |
| 15 | Demo E2E — EventAttended | 🔴 NOT RUN | §4 above; blocked by §3 |
| 16 | Demo E2E — Purchase + custom_data | 🔴 NOT RUN | §5 above; blocked by §3. EF source verified by static read only |
| 17 | Demo E2E — Idempotency | 🔴 NOT RUN | §6 above; blocked by §3 |
| 18 | Demo E2E — Refund direction no new row | 🔴 NOT RUN | §6 above; blocked by §3 |
| 19 | Demo E2E — Typo correction no new row | 🔴 NOT RUN | §6 above; blocked by §3 |
| 27 | Smoke 7/7 PASS | ✅ PASS | §2 above |
| 29 | D7 forward-only — Prizma queue unchanged | ✅ PASS | §7 above |
| 30 | If tile touched → IR34 triplet | ➖ N/A | §8 above; tile not touched |

**Tally:** 2 ✅ PASS (smoke + D7) · 1 ➖ N/A (IR34) · 1 🔴 REGRESSION (criterion 14) · 5 🔴 NOT RUN (criteria 15–19, blocked) · 0 ❌ failures in the sense of "should have passed and didn't" beyond the regression itself.

---

## §10 Cleanup confirmation

**Test rows created:** 0. The single INSERT attempt rolled back due to the trigger failure — no attendee row persisted, no queue row persisted.

**Final post-state probe** (proves nothing leaked):

```sql
SELECT count(*) FROM crm_event_attendees
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND lead_id='cb6b343e-e4cc-42b0-990a-91999111a03c'
  AND event_id='a089ed87-db77-45e5-ba23-d233225da2ce';
-- → 0

SELECT count(*) FROM crm_capi_dispatch_queue
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND lead_id='cb6b343e-e4cc-42b0-990a-91999111a03c'
  AND event_name IN ('CompleteRegistration','EventAttended','Purchase');
-- → 0

SELECT count(*) FROM crm_capi_dispatch_queue;
-- → 33 (unchanged from pre-state)
```

**Cleanup verdict:** ✅ Clean. No residue. (Postgres rollback semantics made cleanup automatic — the failed INSERT was a single atomic statement, and the trigger error aborted the whole transaction.)

The pre-existing demo lead `cb6b343e-e4cc-42b0-990a-91999111a03c` is NOT a test-created row — it pre-existed in the demo tenant from prior testing and remains intact (not deleted).

---

## §11 Findings

### T-LH-1 — Trigger functions reference `public.uuid_*` but uuid-ossp lives in `extensions` schema on this Supabase project (P0 regression)

- **Severity:** P0 (production-impacting; blocks all attendee writes on demo AND Prizma).
- **Location:** `supabase/migrations/20260519152955_m4_capi_purchase_events.sql` lines 45, 72, 104; equivalent live-DB function bodies for `capi_enqueue_complete_registration_fn`, `capi_enqueue_event_attended_fn`, `capi_enqueue_purchase_fn`.
- **Evidence:** SQLSTATE 42883 captured in §3 above. `pg_proc` probe confirms only `extensions.uuid_generate_v5` and `extensions.uuid_ns_oid` exist; no `public.uuid_*` exists.
- **Root cause:** SPEC §0.5 baseline probed extension existence (`pg_extension WHERE extname='uuid-ossp'`) but did not probe extension namespace. Supabase has moved most extensions to the `extensions` schema since 2023 (per Supabase platform changelog), so functions imported from `uuid-ossp` are namespaced there, not in `public`.
- **Suggested fix:** See escalation `2026-05-19T15-50-00Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_OSSP_SCHEMA.md` Option A. Author follow-up SPEC `M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX` with `CREATE OR REPLACE FUNCTION` × 3, replacing `public.uuid_generate_v5(public.uuid_ns_oid(), ...)` → `extensions.uuid_generate_v5(extensions.uuid_ns_oid(), ...)`. Estimated ~30 LoC migration. Triggers unchanged. No constraint touch. Non-destructive.

### T-LH-2 — Executor's Step 1.5 DB pre-flight should probe namespace, not just existence (skill-improvement input)

- **Severity:** PROCESS
- **Location:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check"
- **Evidence:** The Executor read SPEC §0.5 (which probed `pg_extension WHERE extname='uuid-ossp'`) and validated the extension was enabled — but never probed `pg_proc WHERE proname='uuid_generate_v5'` to confirm the namespace and function-signature match the SQL the SPEC §3.5 prescribed. A namespace probe would have caught this in Step 1.5 before the migration was applied.
- **Suggested fix:** In a future opticup-executor SKILL.md update, add to Step 1.5: "When the SPEC's SQL references a schema-qualified function (e.g., `public.fn_name`), probe `pg_proc WHERE proname='fn_name'` AND verify the namespace via `pg_namespace.nspname` matches the schema the SPEC's SQL uses. For uuid-ossp / pgcrypto / pgjwt / pg_net specifically on Supabase, the namespace is `extensions`, NOT `public`."
- **Foreman-level note:** This is the second time in the M4 CAPI track that a SPEC's SQL premise was contradicted by live-DB reality (the first was the `'purchased'` status-vocabulary escalation, 2026-05-19T15:15Z). Suggest the Foreman's SPEC-author Step 0 probes routinely include a `pg_proc` namespace check for every schema-qualified function the SPEC's SQL references.

### T-LH-3 — Reviewer phase did NOT catch this regression even though it ran live-DB probes

- **Severity:** PROCESS
- **Location:** `REVIEW.md` §3, §5, §7
- **Evidence:** Reviewer's §5 "VERBATIM match table" confirmed function bodies match SPEC §3.5 character-for-character — including the `public.uuid_generate_v5(public.uuid_ns_oid(), ...)` snippet. The verbatim match is correct (the live function body DOES read `public.uuid_*`); what the Reviewer did not do was test the function actually RUNS. The 3 spot-checks in §7 are all static-evidence checks (`pg_constraint`, `wc -l`, source `grep`). No spot-check exercised the triggers.
- **Suggested fix for opticup-reviewer/SKILL.md:** Add an audit heuristic that asks "for any new trigger function that the Reviewer verified by static evidence, is there a CHEAP runtime invocation possible to confirm it doesn't immediately error? (e.g., `EXPLAIN SELECT fn_name()` for a stored function, or a no-op transaction that calls the trigger and immediately ROLLBACKs.)" For SECURITY DEFINER trigger functions specifically, a `BEGIN; INSERT ... RETURNING id; ROLLBACK;` rehearsal would have caught this in the Reviewer phase rather than the LH-Tester phase. (The cost is a single rolled-back transaction.)

---

## Hand-off

🔴 RED → escalating to Foreman (opticup-strategic). SPEC remains open. Recommend the Foreman receive the LH-Tester verdict, then either (a) author the follow-up `M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX` SPEC and run the full Pipeline on it (Supervisor's proposed resolution), or (b) make a Daniel-Foreman call to hot-patch via a single migration commit appended to this SPEC's range. Pipeline coordination lock will be released at session end.

**Pipeline mode: full-auto.** Per skill §Pipeline Hand-off + retry policy: 0 retries needed for this failure (the deviation is informational, not flaky); the smoke retry budget was not consumed.

**Supervisor Triage:** SHADOW_PROPOSAL · Confidence 1 (genuinely-novel; no canonical entry) · Escalation continues: yes. Response file linked in §0.

**Reports written this phase:**
- `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS/TEST_REPORT.md` (this file)
- `modules/Module 4 - CRM/escalations/2026-05-19T15-50-00Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_OSSP_SCHEMA.md` (escalation)
- `modules/Module 4 - CRM/escalations/ARCHITECT_DECISION_2026-05-19T15-50-00Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_OSSP_SCHEMA.md` (Supervisor Triage response)
- `_archive/supervisor-log/shadow-2026-05-19.md` (Shadow log row)

---

*End of TEST_REPORT — M4_FB_CAPI_PURCHASE_EVENTS — RED.*
