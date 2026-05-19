# REVIEW — M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX

> **Reviewer:** opticup-reviewer (default model)
> **Reviewed:** 2026-05-19
> **SPEC:** `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/SPEC.md`
> **Commit range audited:** `fff7bf5..0b0ea5b` (C1 SPEC seal → C2 migration → C3 retrospective)

---

## §1 Verdict

🟡 **PASS WITH NOTES.** The P0 hotfix lands correctly: 3 trigger function bodies REPLACED with `extensions.`-qualified uuid-ossp calls, 0 destructive ops, 0 new objects, independent BEGIN/ROLLBACK rehearsal confirms SQLSTATE 42883 no longer fires. One minor finding (R-1: migration file 73 lines vs SPEC §3.5 declared ≤70 budget — 3 lines over).

---

## §2 SPEC §3 Executor-Owned Criteria (1–12, 20–21)

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Branch on `develop`, scope-clean | PASS — only the 3 declared files in commit range |
| 2 | C2 + C3 commits produced | PASS — `41fb198` (C2) + `0b0ea5b` (C3) |
| 3 | Migration file exists | PASS — `20260519160605_m4_capi_purchase_events_uuid_fix.sql` |
| 4 | MCP `apply_migration` success | PASS — confirmed via live `pg_proc.prosrc` probe |
| 5 | Function 1 has `extensions.uuid_generate_v5` | PASS — independently verified in `prosrc` |
| 6 | Function 2 same | PASS — same |
| 7 | Function 3 same | PASS — same |
| 8 | NO `public.uuid_generate_v5` refs remain | PASS — `broken_ref_count=0` (independent re-probe) |
| 9 | Trigger count = 3 | PASS — `trigger_count=3` |
| 10 | Function count = 3 | PASS — `fn_count=3` |
| 11 | Queue rows preserved | PASS — 34 (SPEC baseline was 33; +1 drift is pre-existing, see Executor D-RT-1; migration has 0 DML) |
| 12 | D7 forward-only, 0 Purchase rows | PASS — implicit (no DML in migration) |
| 20 | IR31 integrity gate exit 0 | PASS — re-ran independently, exit 0, 6 files scanned |
| 21 | IR32 destructive-ops = 0 declared | PASS — SPEC §11 declares 0; diff scan confirms |

---

## §3 Iron Rule Audit

- **Rule 12 (file size):** Migration .sql is **73 lines** vs SPEC §3.5 declared budget ≤ 70 lines. **R-1 (🟡 minor):** 3-line overage from a 7-line header comment block (vs SPEC's "~5 line" estimate). Header content is high-signal (root cause + cross-refs to SPEC + escalation file) — overage is justified BUT the SPEC budget was a hard ceiling. Recommend: tighten header to 4 lines OR Foreman amends §3.5 budget retroactively to ≤ 75. Not a stop-trigger; logged for awareness. `docs/FB_CAPI.md` not touched (D-AUTH-7 optional skipped).
- **Rule 21 (no duplicates):** PASS. Live probe: `fn_count=3`, `trigger_count=3` — unchanged from parent SPEC baseline. Zero new functions, triggers, constraints, columns, or tables. Diff contains only 3 `CREATE OR REPLACE FUNCTION` calls on pre-existing functions.
- **Rule 22 (defense-in-depth):** PASS. Function bodies use `NEW.tenant_id` directly from trigger context (line 19/40/64 of migration). The schema-qualifier swap targets `extensions.uuid_generate_v5` + `extensions.uuid_ns_oid` — PURE name-based UUID generators with no DB row access, so no tenant_id bypass surface introduced. The INSERT into `crm_capi_dispatch_queue` carries `NEW.tenant_id` verbatim.
- **Rule 31 (integrity gate):** PASS. `npm run verify:integrity` exit 0 (6 files scanned in 2ms).
- **Rule 32 (destructive ops):** PASS. SPEC §11 declares 0. `git log -p` scan of commit range against the destructive-op pattern set returned ZERO matches for DROP TABLE / DROP COLUMN / DROP POLICY / TRUNCATE / ALTER TABLE…DROP / DELETE FROM / DROP TRIGGER / DROP FUNCTION. Only 3 `CREATE OR REPLACE FUNCTION` (additive in IR32 terms).

---

## §4 Function-Body Diff Verification

Independent re-probe via `SELECT prosrc FROM pg_proc WHERE proname IN (...)` compared byte-by-byte against parent SPEC §3.5 bodies. Per-function diff vs parent:

| Function | Diffs from parent SPEC §3.5 |
|----------|-----------------------------|
| `capi_enqueue_complete_registration_fn` | 2 swaps: `public.uuid_generate_v5` → `extensions.uuid_generate_v5` (1×) AND `public.uuid_ns_oid` → `extensions.uuid_ns_oid` (1×). Comment line "-- Forward-only; INSERT trigger context implies a fresh attendee row." removed by Foreman in the hotfix SPEC §3.5 (cosmetic; no semantic effect). |
| `capi_enqueue_event_attended_fn` | Same 2 schema-qualifier swaps. Comment "-- Only fire on a real transition INTO 'attended'." removed (cosmetic). |
| `capi_enqueue_purchase_fn` | Same 2 schema-qualifier swaps. Comment "-- Daniel-decision (Option B, 2026-05-19): fire only on purchase_amount transition NULL/0 → >0…" removed (cosmetic). |

**Schema-qualifier swap count:** 6 total (3 × 2), matching expected. **All other shape preserved:** SECURITY DEFINER + `SET search_path = public` confirmed via `pg_proc.proconfig=[search_path=public]` and `prosecdef=true` for all 3. WHEN clauses unchanged. ON CONFLICT clause unchanged. Event names unchanged. INSERT column list unchanged.

**Note:** the cosmetic comment-line removals do NOT affect runtime behavior — they live in the SPEC §3.5 SQL block but Postgres does not store SQL comments in `pg_proc.prosrc`. The parent SPEC's `prosrc` would have stored a body with comments stripped anyway. No concern.

---

## §5 BEGIN/ROLLBACK Smoke Result (Independent Re-Probe)

Per the P-REVIEW-1 lesson surfaced by this SPEC's §0.7 (Reviewer-side proposal that a BEGIN/ROLLBACK rehearsal in the parent's Reviewer phase would have caught this bug in seconds), I independently ran:

```sql
DO $$ DECLARE v_demo uuid := '8d8cfa7e-...'; v_lead uuid; v_event uuid;
BEGIN
  SELECT id INTO v_lead FROM crm_leads WHERE tenant_id = v_demo LIMIT 1;
  SELECT id INTO v_event FROM crm_events WHERE tenant_id = v_demo LIMIT 1;
  INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status)
    VALUES (v_demo, v_lead, v_event, 'registered');
  RAISE EXCEPTION 'rollback-clean: INSERT succeeded, trigger fired, uuid resolved';
END $$;
```

**Result:** `P0001: rollback-clean: INSERT succeeded, trigger fired, uuid resolved`. NOT 42883. The trigger fired through to the queue INSERT, the `extensions.uuid_generate_v5(...)` call resolved, and the RAISE rolled the entire txn back cleanly. **Hotfix verified live.**

---

## §6 Cross-Module Safety Confirmation

Daniel's "trivial — touches 3 functions only, no tables, no EF, no other module" holds:

- `git diff fff7bf5..0b0ea5b --name-only` → **3 files**:
  1. `supabase/migrations/20260519160605_m4_capi_purchase_events_uuid_fix.sql` (NEW)
  2. `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/EXECUTION_REPORT.md` (NEW)
  3. `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/FINDINGS.md` (NEW)
- **ZERO** EF source touched (`supabase/functions/**` unmodified).
- **ZERO** table schema touched (no ALTER TABLE, no constraints, no columns).
- **ZERO** triggers re-created (CREATE OR REPLACE FUNCTION only; triggers `trg_capi_attendee_*` unchanged).
- **ZERO** files outside Module 4 touched.
- **ZERO** JS/HTML touched (IR34 UI-verification gate does not apply — no UI files in diff).

---

## §7 Concerns

- **R-1 (🟡 minor):** Migration file 73 lines vs SPEC §3.5 declared budget ≤ 70. Header comment block is 7 lines (vs SPEC estimate of 5). Overage of 3 lines, justified content-wise but exceeds the hard ceiling. Two clean paths: (a) Executor tightens header to 4 lines and re-applies migration as a touch-up commit, OR (b) Foreman amends §3.5 budget to ≤ 75 in this SPEC's closure note. Not a stop-trigger; logged for Foreman judgment at closure. **Recommended disposition: (b) — keep the rich header; amend budget retroactively.**
- **Spot-check on Executor's `D-RT-2`:** Executor opted not to add the optional 3-line `docs/FB_CAPI.md` note (per D-AUTH-7). I concur — the migration header is the canonical record, and the SPEC cross-refs make discoverability strong without doc duplication. No concern.

No CRITICAL findings. No STOP triggers fired.

---

## §8 LH-Tester Handoff Notes

The 6 E2E tests (SPEC §3 criteria 13–19) are deferred to opticup-localhost-tester. The DB is now in a state where:

- **E2E Test 1 (CompleteRegistration):** Should fire on `INSERT INTO crm_event_attendees` on demo tenant. Independent rehearsal above already confirmed the trigger reaches the queue INSERT.
- **E2E Test 2 (EventAttended):** Should fire on `UPDATE crm_event_attendees SET status='attended'` where prior status was `registered`. WHEN clause verified unchanged in `prosrc`.
- **E2E Test 3 (Purchase):** Should fire on `UPDATE crm_event_attendees SET purchase_amount=500` where prior was NULL or 0. EF payload check (`custom_data.value=500`, `currency='ILS'`) is EF-side — not affected by this hotfix.
- **E2E Test 4 (Idempotency on EventAttended):** Redundant UPDATE to `status='attended'` should be a no-op — WHEN clause `NEW.status IS DISTINCT FROM OLD.status` guards this.
- **E2E Test 5 (Refund direction no-op):** `purchase_amount=500→0` should be a no-op — WHEN clause `NEW.purchase_amount > 0` guards this.
- **E2E Test 6 (Typo correction no-op):** `purchase_amount=500→480` should be a no-op — WHEN clause `OLD.purchase_amount IS NULL OR OLD.purchase_amount = 0` guards this.
- **Smoke baseline (criterion 22):** `node tests/smoke/baseline.test.mjs` should be 7/7.
- **Parent SPEC dependency closure (criterion 23):** TEST_REPORT.md must explicitly link "criteria 14–19 of parent SPEC `M4_FB_CAPI_PURCHASE_EVENTS` now green via this hotfix's E2E pass."

**Cleanup discipline:** any demo attendee + queue rows inserted during E2E must be deleted at TEST_REPORT close (per SPEC §5 stop-trigger 5).

**Queue baseline for LH-Tester:** `queue_row_count=34` as of Reviewer audit (was 33 at SPEC §0.5 capture + 1 pre-existing drift acknowledged by Executor D-RT-1). After 6 E2E tests + cleanup, expect 34 again.

---

*End of REVIEW.*
