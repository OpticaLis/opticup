# SPEC — M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-14
> **Module:** 4 — CRM
> **Phase:** Funnel Phase 1 — predecessor follow-up SPEC (P1.4 → P1.1 link)
> **Author signature:** Claude Code Windows desktop, full-auto pipeline chat 2026-05-14

---

## 0. Pre-Authoring Reality Check

- **Brief read in full** on 2026-05-14 from `modules/Module 4 - CRM/architecture-brief/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX_BRIEF.md`.
- **Source documents read:**
  - `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/RPC_BODY.sql` (4603 bytes, md5 `dbd2ccd1eb068b494edfec5cf7788563` per yesterday's SPEC closure)
  - `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/STATE_TRANSITIONS.md` §6 (Quick-Reference Decision Table)
  - `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FINDINGS.md` FIND-1
- **Canonical sentinel confirmation** (per activation prompt — Brief says `'event_closed'` but the contract document is the truth):
  - `STATE_TRANSITIONS.md` §6 row "No existing same-event row, capacity full, event=`closed`" → expected `status` return value = **`event_closed`** (currently returns `'waiting_list'` ← marked as FIND-1 inconsistency in the same row).
  - `STATE_TRANSITIONS.md` §3 T7 row also documents the bug. The canonical sentinel for this fresh-INSERT branch when event is closed is `event_closed`.
  - The invited-promote branch on `RPC_BODY.sql` L44–L50 already uses `CASE WHEN v_event.status='closed' THEN 'event_closed' ELSE 'waiting_list' END` (via `v_promote_status`) and returns that variable — the FIX mirrors this existing pattern onto the fresh-INSERT branch.
- **RPC pre-flight probe required** (per yesterday's FOREMAN_REVIEW Author Proposal #2 — codify pre-flight for RPC-touching SPECs). Executor must verify at execution start, BEFORE writing the migration:
  ```sql
  SELECT
    proname,
    pronargs,
    md5(pg_get_functiondef(oid)) AS body_md5,
    length(pg_get_functiondef(oid)) AS body_len
  FROM pg_proc
  WHERE proname = 'register_lead_to_event' AND pronamespace = 'public'::regnamespace;
  ```
  **Expected:** `proname='register_lead_to_event'`, `pronargs=4`, `body_md5='dbd2ccd1eb068b494edfec5cf7788563'`, `body_len=4603`. **STOP-trigger #1** (see §5) if any value differs.
- **Lesson application from prior FOREMAN_REVIEWs in M4** (top 3 most recent):
  - `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FOREMAN_REVIEW.md` Author Proposal #2 (codify pre-flight pg_proc probe for RPC SPECs) → **APPLIED above in this §0**.
  - `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FOREMAN_REVIEW.md` Executor Proposal #1 (tool availability pre-flight) → **NOT APPLICABLE** — this SPEC does not invoke `mmdc` / Playwright / browser; the integration test is SQL-only.
  - `M4_WAITLIST_SYNC_PRIORITY_FIX/FOREMAN_REVIEW.md` (2026-05-14, earlier today) — pre-write master safety tag pattern → **APPLIED** in §6 Rollback Plan + §10 Preconditions (`pre-m4-rpc-return-shape-fix-{commit}` tag before `apply_migration`).
- **Pre-existing untracked files surveyed** (per CLAUDE.md §1.4): 47 untracked paths recorded at session start (architecture-brief drafts, M3 SPEC folders, role docs). Daniel selected "Selective git add" — Executor leaves them alone, commits only this SPEC folder's artifacts + the migration files by explicit filename.
- **Color-form completeness check:** NOT APPLICABLE (not a visual re-skin SPEC).
- **Baselines from live measurement** (per yesterday's STATUS_CHANGE_TRIGGERS_FRAMEWORK Author Proposal #1):
  | Metric symbol | Expected value | How measured |
  |---|---|---|
  | `BASE_RPC_BODY_MD5` | `dbd2ccd1eb068b494edfec5cf7788563` | RPC pre-flight probe above |
  | `BASE_RPC_BODY_LEN` | 4603 | same |
  | `BASE_DEMO_ATTENDEES_COUNT` | (capture at pre-flight) | `SELECT count(*) FROM crm_event_attendees WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_deleted=false` |
  | `BASE_PRIZMA_ATTENDEES_COUNT` | (capture at pre-flight) | `SELECT count(*) FROM crm_event_attendees WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma') AND is_deleted=false` |
  | `BASE_PRIZMA_LEADS_COUNT` | (capture at pre-flight) | `SELECT count(*) FROM crm_leads WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma') AND is_deleted=false` |

  Executor captures actual values during pre-flight and pins them. Post-migration, the two Prizma counts MUST be unchanged (criterion #6 below).

---

## 1. Goal

Fix `register_lead_to_event` RPC so its return-value `status` field reflects the actual inserted row state in the fresh-INSERT over-capacity branch. Today returns hardcoded `'waiting_list'` regardless of inserted status; should return `'event_closed'` when the event is closed and `'waiting_list'` when it is not — same `CASE WHEN` already used in the INSERT statement two lines above.

This is the 1-line fix prerequisite to Funnel Phase 1 P1.1 (`M3_UTM_TRIPLE_LAYER_PERSISTENCE`) — fixing the return-shape now means P1.1's touchpoint logging sits on a verified RPC contract.

---

## 2. Background & Motivation

Yesterday's read-only diagnostic SPEC `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP` (closed 2026-05-14 at commit `d1c31d6` with TEST_REPORT closure follow-on `089ebb0`) produced byte-identical capture of `register_lead_to_event` and identified 7 findings. FIND-1 is the only MEDIUM finding with a deterministic fix and zero coupling to other in-flight work — perfect candidate for an immediate small SPEC.

**The bug:** at `RPC_BODY.sql` L70–L73 (live `pg_proc` lines 67–76), the over-capacity fresh-INSERT branch INSERTs the new attendee row with `status = CASE WHEN v_event.status='closed' THEN 'event_closed' ELSE 'waiting_list' END`, but the `RETURN jsonb_build_object(...)` payload at L73 hardcodes `'status', 'waiting_list'`. When the event is closed AND capacity is full AND the lead has no existing row AND no waiting/invited row on another active event, the inserted DB row carries `status='event_closed'` while the RPC returns `status='waiting_list'`. The DB row is canonical; consumers reading the return value get the wrong sentinel.

**Why now:** P1.1 (UTM persistence) touches the same RPC path. Fixing the return shape first prevents P1.1's tests from being written around a known wrong return value. Per CLAUDE.md Rule 21, a one-line correction now is cheaper than a workaround later.

**Why not affecting production today:**
- ERP `crm-event-register.js:87` only fires `checkAndAutoWaitingList` when `data.status === 'registered'` — the hardcoded `'waiting_list'` does NOT match, so no spurious auto-promotion. (No data corruption.)
- event-register EF + quick-register EF return `result.status` to storefront, which renders a "waiting list" message — user is misinformed but the DB row state is preserved. (UX-only impact.)
- DB row state is canonical for staff dashboards + reporting + automation rules — those read the row, not the RPC return.

The fix is the smallest possible safe change: swap the literal in one `jsonb_build_object` call for the same `CASE WHEN` already present in the same function body (L72–L73 of the live RPC).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | RPC pre-flight probe matches `BASE_RPC_BODY_MD5` baseline | `body_md5 = dbd2ccd1eb068b494edfec5cf7788563`, `body_len = 4603` | Supabase MCP `execute_sql`: see §0 probe SQL — STOP if mismatch (trigger #1) |
| 2 | Smoke 7/7 PASS on demo BEFORE migration | exit 0, 7/7 PASS | `npm run smoke` from baseline tests dir |
| 3 | Migration applied via `apply_migration` MCP | exit 0, migration listed in `list_migrations` MCP | Supabase MCP `apply_migration` with name `2026_05_14_register_lead_to_event_return_shape_fix`, then `list_migrations` |
| 4 | Post-migration RPC body changed ONLY on the fresh-INSERT over-capacity return literal | exact 2-line diff of the function body: the hardcoded `'status', 'waiting_list'` literal at the fresh-INSERT terminal becomes the same `CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END` already used in the INSERT statement immediately above | `pg_get_functiondef` post-migration → write to `RPC_BODY_POST.sql` in SPEC folder → `diff RPC_BODY.sql RPC_BODY_POST.sql` shows ONLY the return-clause change |
| 5 | Integration test on demo — fresh-insert into closed+full event returns `event_closed` | RPC return jsonb has `success=true`, `status='event_closed'`, `attendee_id` non-null; the inserted row's `status` column also equals `event_closed`; cleanup deletes the test event + test attendee row + test lead after assertion. | Supabase MCP `execute_sql` — full test script in §8 below, written to `INTEGRATION_TEST.sql` in SPEC folder |
| 6 | Prizma untouched | `BASE_PRIZMA_ATTENDEES_COUNT` + `BASE_PRIZMA_LEADS_COUNT` byte-identical pre/post; zero writes to Prizma in this SPEC's session | Re-run baseline COUNT queries after the integration test; equality |
| 7 | Smoke 7/7 PASS on demo AFTER migration | exit 0, 7/7 PASS | `npm run smoke` from baseline tests dir, re-run by Localhost-Tester |
| 8 | P1.4 `FINDINGS.md` updated — FIND-1 marked RESOLVED | grep `RESOLVED` in `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FINDINGS.md` near the FIND-1 heading + commit SHA of the migration commit | `grep -A 1 'FIND-1' ...FINDINGS.md` returns the RESOLVED line |
| 9 | `KNOWLEDGE_MAP.md` Layer 4 mapping updated to reflect new return value | if `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` contains a Layer 4 row for this RPC's fresh-INSERT branch, it is updated to reflect `event_closed` return; if not present, this criterion is N/A and EXECUTION_REPORT documents the N/A | `grep -i 'register_lead_to_event' roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` — if any hit, that hit reflects the fixed return shape |
| 10 | Migration files committed under canonical naming | `modules/Module 4 - CRM/migrations/2026_05_14_register_lead_to_event_return_shape_fix_up.sql` + `_down.sql` exist | `ls modules/Module\ 4\ -\ CRM/migrations/2026_05_14_register_lead_to_event_return_shape_fix_*.sql` returns 2 files |
| 11 | Iron Rule 12 — file size discipline | both migration files <350 lines (likely ~100 each) | `wc -l <migration files>` |
| 12 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |

**Branch & repo discipline:**
- Branch is `develop` (CLAUDE.md §9.1) — verify before every commit.
- Commits use selective `git add <filename>` only — never `-A` / `.` (CLAUDE.md §9.6 + Daniel's selection at session start).
- Zero modifications to `main`.
- Backup folder created BEFORE migration (per CLAUDE.md §9.9 — any migration is a file-touching operation; mandatory backup applies): `modules/Module 4 - CRM/backups/2026-05-14_M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/` containing snapshots of `RPC_BODY.sql` (pre) + SESSION_CONTEXT.md (pre) + this SPEC.md.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Run the RPC pre-flight probe (read-only).
- Capture the pre-migration `RPC_BODY.sql` from live `pg_get_functiondef` (read-only).
- Create the backup folder + copy the pre-migration files.
- Apply the canonical migration (`_up.sql`) via `apply_migration` MCP using the migration name `2026_05_14_register_lead_to_event_return_shape_fix`.
- Capture the post-migration body to `RPC_BODY_POST.sql`.
- Run the integration test on the demo tenant (creating one closed+full test event, one test lead, one fresh registration → assert → clean up the test rows).
- Run `npm run smoke` before and after.
- Commit via `git add` on explicit filenames + push to `develop`.
- Update `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FINDINGS.md` FIND-1 with RESOLVED line + commit SHA.
- Update `KNOWLEDGE_MAP.md` Layer 4 if a relevant row exists.
- Write `EXECUTION_REPORT.md` + `FINDINGS.md` at close.

### What REQUIRES stopping and reporting

- Anything in §5 below.
- Any change to the RPC body OTHER than the one return-literal swap.
- Any DB write against Prizma rows (only demo writes are authorized, scoped to the test event/lead/attendee created and cleaned up by the integration test).
- Any merge to `main`.
- Any caller-code edit (the contract changes — callers see the right value — but no caller code needs changing per the activation prompt's explicit constraint).
- Any change to `crm-event-register.js`, `event-register/index.ts`, `quick-register/index.ts` (the 3 live callers from yesterday's STATE_TRANSITIONS.md §4).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. **Live RPC body differs from yesterday's capture.** If the RPC pre-flight probe at §0 returns `body_md5 ≠ dbd2ccd1eb068b494edfec5cf7788563` OR `body_len ≠ 4603` → STOP. Write an escalation file at `modules/Module 4 - CRM/escalations/{ISO_TS}_M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX_body_drift.md` capturing the new md5 + new length + a diff against the pinned baseline. Halt the pipeline. Something changed the RPC between yesterday's SPEC and now — the Foreman must reauthor with new baseline data before re-attempting.

2. **The fresh-INSERT over-capacity return literal does not match the documented FIND-1 location.** When the Executor identifies the line to change in the live body, if the literal `'status', 'waiting_list'` is not found at the `RETURNING id INTO v_attendee_id; PERFORM sync_lead_status_from_attendee(...); RETURN ...` chain immediately following the over-capacity INSERT → STOP. The fix target has moved; reauthor before proceeding.

3. **The canonical sentinel per `STATE_TRANSITIONS.md` is NOT `'event_closed'`.** Already confirmed in §0 against the live STATE_TRANSITIONS.md §6 row — but if the Executor reads it differently → STOP, surface to Foreman. Do NOT invent a sentinel.

4. **Any caller's runtime behavior would BREAK on the new return value.** Yesterday's STATE_TRANSITIONS.md §3 T7 row documented all 3 callers' handling of the current `'waiting_list'` return. Re-verify in pre-flight that:
   - ERP `crm-event-register.js:87` still has `data.status === 'registered'` as the auto-promote condition (no caller treats `'waiting_list'` specially in a way that would break on `'event_closed'`).
   - event-register EF + quick-register EF pass `result.status` through to storefront message rendering without forking on the literal value.
   If any caller does fork on the literal `'waiting_list'` in a destructive way (i.e., would crash or emit a wrong action when receiving `'event_closed'`) → STOP. The fix would break a caller. Surface to Foreman.

5. **Smoke <7/7 PASS pre-migration on demo.** If `npm run smoke` returns <7/7 → STOP. This means something else regressed since P1.4 closure earlier today. The migration cannot land on a regressed baseline.

6. **Any non-canonical migration pattern.** The new `CREATE OR REPLACE FUNCTION` MUST mirror the existing RPC exactly except for the one return literal:
   - `SECURITY DEFINER` preserved
   - `SET search_path = 'public'` preserved
   - `LANGUAGE plpgsql` preserved
   - `RETURNS jsonb` preserved
   - All other branches byte-identical
   - JWT-claim tenant guard at L17 preserved verbatim
   If any of these differ → STOP. The migration must be a surgical 1-clause swap, not a rewrite.

7. **Integration test result does not match expectation.** If the integration test returns:
   - RPC `success=false` → STOP. Test setup is wrong, not a fix problem.
   - RPC `status ≠ 'event_closed'` post-migration in the closed+full scenario → STOP. Migration didn't take.
   - The inserted attendee row's `status` column ≠ `event_closed` → STOP. INSERT branch broken (should NOT happen — INSERT was not touched).

8. **Prizma rows modified.** If `BASE_PRIZMA_ATTENDEES_COUNT` or `BASE_PRIZMA_LEADS_COUNT` differ between pre-flight and post-cleanup → STOP. Multi-tenant isolation broken; immediate escalation.

9. **Iron Rule 31 fails.** If `npm run verify:integrity` returns exit 1 at any point → STOP, do not commit.

---

## 6. Rollback Plan

The migration is `CREATE OR REPLACE FUNCTION` — not destructive. The paired `_down.sql` restores the pre-migration RPC body verbatim from `RPC_BODY.sql` (yesterday's capture, md5 `dbd2ccd1eb068b494edfec5cf7788563`).

**Rollback procedure if needed:**
1. Apply `2026_05_14_register_lead_to_event_return_shape_fix_down.sql` via `apply_migration`.
2. Verify post-rollback `md5(pg_get_functiondef('public.register_lead_to_event'::regproc)) = dbd2ccd1eb068b494edfec5cf7788563`.
3. If repo state needs reverting: `git reset --hard <START_COMMIT>` where `START_COMMIT` is the SHA recorded at the top of EXECUTION_REPORT.md (captured before the first commit in this SPEC).
4. Notify Foreman; mark SPEC REOPEN, not CLOSED.

**Pre-write master safety tag** (per `M4_WAITLIST_SYNC_PRIORITY_FIX` pattern, applied today earlier in same module): the Executor creates an annotated git tag `pre-m4-rpc-return-shape-fix-2026-05-14` on `HEAD` (which equals the SPEC.md commit) BEFORE running `apply_migration`. Push the tag to origin. Any rollback can `git diff <tag>..HEAD` to see exactly what changed.

No DB row state to roll back (the integration test creates + cleans up its own rows; no production-row UPDATEs beyond the RPC body itself).

---

## 4. Destructive Operations

**None.**

`CREATE OR REPLACE FUNCTION` is NOT destructive per Iron Rule 32 (no DROP, no schema removal, no policy removal, no DELETE without tenant-scoped WHERE). The migration adds one `_up.sql` and one paired `_down.sql`; no file deletes, no renames (≥5), no `git rebase`, no `git reset --hard`, no `git push --force`, no SQL `DROP`/`TRUNCATE`, no DML mass-delete, no governance-file deletion, no `main` branch modification.

The integration test on demo creates 1 test event + 1 test lead + 1 test attendee row, then cleans them up with explicit `DELETE WHERE id=<id> AND tenant_id=<demo>` queries — these are tenant-scoped row-level deletes targeting only the rows the test itself created. Not classified as destructive under Iron Rule 32 (per-row tenant-scoped DELETEs of test data are not in the gate's pattern list — only `DELETE FROM <table>` without a tenant_id-scoped WHERE is).

If the Executor encounters a need for any operation in the Iron-Rule-32 list mid-run → STOP, write an escalation file at `modules/Module 4 - CRM/escalations/{ISO_TS}_M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX_destructive_op.md`, emit ONE Hebrew line to Daniel, halt the pipeline. Do NOT silently amend this section mid-run.

---

## 7. Out of Scope (explicit)

- **FIND-2, FIND-3, FIND-4, FIND-5, FIND-6, FIND-7** from `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FINDINGS.md`. Each is queued for its own SPEC or TECH_DEBT entry per yesterday's FOREMAN_REVIEW §4 dispositions. Do NOT touch any of them.
- **Touchpoint logging.** That belongs to P1.1 (`M3_UTM_TRIPLE_LAYER_PERSISTENCE`), not here.
- **Any caller-code modification.** The fix is RPC-side. Callers receive the correct value automatically; they need no patch.
  - `modules/crm/crm-event-register.js` — UNTOUCHED
  - `supabase/functions/event-register/index.ts` — UNTOUCHED
  - `supabase/functions/quick-register/index.ts` — UNTOUCHED
- **Soft-delete revival capacity check** (FIND-3). Separate TECH_DEBT entry.
- **Return-shape contract documentation in MODULE_SPEC.md** (FIND-4). Separate doc-refresh SPEC.
- **Audit row on resubscribe** (FIND-5). Separate TECH_DEBT entry.
- **Auto-move recency-bias ordering** (FIND-6). Documented behavior; no fix.
- **Storefront cross-repo grep** (FIND-7). Next Foreman session on a machine with both repos checked out.
- **GLOBAL_SCHEMA.sql merge.** No structural schema change here. The RPC body changes; signature does not. GLOBAL_SCHEMA tracks structure, not function bodies — unchanged.
- **GLOBAL_MAP.md merge.** No new contracts. The RPC's return-value contract is now consistent with the documented contract — strictly speaking the doc was right and the code was wrong; no map change.
- **MASTER_ROADMAP.md update.** This is a follow-up bug-fix to a P1.4 finding, not a module-phase transition.

---

## 8. Expected Final State

### New files

1. `modules/Module 4 - CRM/migrations/2026_05_14_register_lead_to_event_return_shape_fix_up.sql` — the `CREATE OR REPLACE FUNCTION` with the corrected return literal.
2. `modules/Module 4 - CRM/migrations/2026_05_14_register_lead_to_event_return_shape_fix_down.sql` — the paired rollback, verbatim restore of yesterday's body.
3. `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/SPEC.md` — this file.
4. `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/RPC_BODY_POST.sql` — `pg_get_functiondef` of the RPC after migration.
5. `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/INTEGRATION_TEST.sql` — the full DO block / SQL script used to assert the fresh-INSERT closed-and-full path returns `event_closed`. Captured for reproducibility.
6. `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/EXECUTION_REPORT.md` — written by Executor at close.
7. `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/FINDINGS.md` — written by Executor; expected EMPTY-or-very-short (the fix is tight).
8. `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/FOREMAN_REVIEW.md` — written by Foreman at closure.
9. `modules/Module 4 - CRM/backups/2026-05-14_M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/RPC_BODY_PRE.sql` — copy of yesterday's RPC_BODY.sql, captured before migration.
10. `modules/Module 4 - CRM/backups/2026-05-14_M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/SESSION_CONTEXT_PRE.md` — copy of M4 SESSION_CONTEXT.md before any update.
11. `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/TEST_REPORT.md` — written by Localhost-Tester.

### Modified files

- `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FINDINGS.md` — FIND-1 marked RESOLVED with date 2026-05-14 + migration commit SHA. ~3 lines added.
- `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` — IF a Layer 4 row for this RPC fresh-INSERT branch exists, update its return-value column to `event_closed`. IF absent, no edit; EXECUTION_REPORT documents the N/A. Estimated 0–5 lines changed.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — add one paragraph at the top noting the closure of this SPEC + commit SHA. Estimated +1 paragraph.

### Migration content (informative)

The forward migration is approximately:

```sql
-- 2026_05_14_register_lead_to_event_return_shape_fix_up.sql
-- Closes FIND-1 from M4_REGISTER_LEAD_TO_EVENT_RPC_MAP (2026-05-14).
-- One-clause change: fresh-INSERT over-capacity RETURN now mirrors the INSERT's
-- own CASE WHEN instead of hardcoding 'waiting_list'.

CREATE OR REPLACE FUNCTION public.register_lead_to_event(
  p_tenant_id uuid, p_lead_id uuid, p_event_id uuid, p_method text DEFAULT 'manual'::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- [body identical to current live body EXCEPT for the single RETURN at the
-- fresh-INSERT over-capacity terminal — see RPC_BODY.sql line 76 in the
-- P1.4 SPEC folder; ONLY that one literal becomes:
--   CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END]
$function$;
```

The Executor reproduces the full body verbatim (from `RPC_BODY.sql`) with that one substitution. No other change is permitted (per §5 trigger #6).

### Integration test (informative — full script in `INTEGRATION_TEST.sql`)

```sql
-- All operations execute as authenticated demo tenant context via JWT claim
-- override. Test creates one event + one lead, registers, asserts, cleans up.

DO $$
DECLARE
  v_demo_tenant uuid := '8d8cfa7e-ef58-49af-9702-a862d459cccb';
  v_event_id uuid;
  v_lead_id uuid;
  v_existing_attendee_id uuid;
  v_test_lead_phone text := '0503348349';  -- Daniel's secondary, whitelist-allowed
  v_rpc_result jsonb;
  v_inserted_status text;
BEGIN
  -- 1. Set up: create a CLOSED, max_capacity=1, currently-full event on demo
  INSERT INTO crm_events (tenant_id, name, event_date, max_capacity, status, is_deleted)
  VALUES (v_demo_tenant, 'TEST_M4_RETURN_SHAPE_FIX', current_date + 30, 1, 'closed', false)
  RETURNING id INTO v_event_id;

  -- 2. Seed one filler attendee so capacity is hit (use a pre-existing demo lead
  --    OR insert a filler lead — Executor picks based on demo state at runtime).
  --    Filler attendee must be in a state that counts (registered) so capacity gate fires.
  INSERT INTO crm_leads (tenant_id, name, phone, status, is_deleted)
  VALUES (v_demo_tenant, 'TEST_M4_FILLER', '0537889878', 'waiting', false)
  RETURNING id INTO v_lead_id;

  INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method, is_deleted)
  VALUES (v_demo_tenant, v_lead_id, v_event_id, 'registered', 'test_setup', false)
  RETURNING id INTO v_existing_attendee_id;

  -- 3. Create a SECOND test lead (the "fresh" lead). This is the actor that hits
  --    the fresh-INSERT branch.
  INSERT INTO crm_leads (tenant_id, name, phone, status, is_deleted)
  VALUES (v_demo_tenant, 'TEST_M4_FRESH', '0507168471', 'waiting', false)
  RETURNING id INTO v_lead_id;  -- reuse v_lead_id for the fresh-lead path

  -- 4. Set JWT claim so the RPC's tenant-guard passes
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('tenant_id', v_demo_tenant::text)::text,
    true
  );

  -- 5. Call the RPC — this is the fresh-insert-to-closed-full path
  v_rpc_result := register_lead_to_event(v_demo_tenant, v_lead_id, v_event_id, 'integration_test');

  -- 6. Assert RPC return
  IF (v_rpc_result->>'status') != 'event_closed' THEN
    RAISE EXCEPTION 'FAIL: RPC returned status=%, expected event_closed. Full result: %',
      (v_rpc_result->>'status'), v_rpc_result;
  END IF;

  IF (v_rpc_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: RPC success=false. Full result: %', v_rpc_result;
  END IF;

  -- 7. Assert DB row state
  SELECT status INTO v_inserted_status
    FROM crm_event_attendees
   WHERE id = (v_rpc_result->>'attendee_id')::uuid
     AND tenant_id = v_demo_tenant;

  IF v_inserted_status != 'event_closed' THEN
    RAISE EXCEPTION 'FAIL: DB row status=%, expected event_closed (DB row was wrong all along).', v_inserted_status;
  END IF;

  RAISE NOTICE 'PASS: RPC returned status=event_closed, DB row status=event_closed.';

  -- 8. Cleanup — delete the test rows tenant-scoped + id-scoped
  DELETE FROM crm_event_attendees
    WHERE tenant_id = v_demo_tenant
      AND event_id = v_event_id;
  DELETE FROM crm_leads
    WHERE tenant_id = v_demo_tenant
      AND name IN ('TEST_M4_FILLER', 'TEST_M4_FRESH');
  DELETE FROM crm_events
    WHERE tenant_id = v_demo_tenant
      AND id = v_event_id;
END $$;
```

The Executor adapts the script to actual demo state (the existing 'TEST_M4_*' name collision check, phone whitelist values, exact NOT NULL columns on each table). Phones are taken from the activation prompt's whitelist (`0537889878`, `0503348349`, `0507168471`). No phones outside that whitelist may be used; no SMS dispatch is expected (the test creates + deletes rows in a single transaction, the `crm_status_change_events` trigger may fire but the cron consumer runs after the transaction and will be cleaned up by the next sweep — the test event no longer exists, so no message can be queued for a non-existent event).

### Build-side-effect file expectations

None. No `npm run build`, no codegen, no view materialization. The fix is a single function-body change.

### Docs updated (MUST include)

- `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FINDINGS.md` — FIND-1 → RESOLVED (criterion #8).
- `KNOWLEDGE_MAP.md` Layer 4 — IF a row exists for this RPC (criterion #9).
- M4 `SESSION_CONTEXT.md` — one-paragraph closure entry.

### Docs NOT updated (explicit non-changes)

- `MASTER_ROADMAP.md` — bug-fix, no module-phase transition.
- `docs/GLOBAL_MAP.md` — no contract change.
- `docs/GLOBAL_SCHEMA.sql` — no structural change.
- `MODULE_SPEC.md` — no business-logic change.
- `MODULE_MAP.md` — no new function or file.
- `CHANGELOG.md` — out-of-band micro-fix; will be folded into the next M4 phase CHANGELOG at the next Integration Ceremony.

---

## 9. Commit Plan

The Executor produces 3 commits on `develop`, then the Foreman closes with 1.

1. **Commit 1** — `feat(m4,rpc): fix register_lead_to_event return shape on fresh-insert closed+full path`
   - Files: `modules/Module 4 - CRM/migrations/2026_05_14_register_lead_to_event_return_shape_fix_up.sql`, `..._down.sql`, `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/RPC_BODY_POST.sql`, `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/INTEGRATION_TEST.sql`, `modules/Module 4 - CRM/backups/2026-05-14_M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/RPC_BODY_PRE.sql`, `modules/Module 4 - CRM/backups/2026-05-14_M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/SESSION_CONTEXT_PRE.md`
   - Also includes `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/SPEC.md` (this file) if not already committed in a precursor commit.

2. **Commit 2** — `docs(m4): mark FIND-1 RESOLVED in P1.4 FINDINGS + KNOWLEDGE_MAP Layer 4 update`
   - Files: `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FINDINGS.md`, `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` (if applicable), `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`
   - SESSION_CONTEXT update is the one-paragraph closure entry.

3. **Commit 3** — `chore(spec): close M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX execution`
   - Files: `EXECUTION_REPORT.md`, `FINDINGS.md` (in this SPEC's folder)
   - Includes TEST_REPORT.md if Localhost-Tester runs in the same chat.

4. **Commit 4** (Foreman) — `chore(spec): close M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX with retrospective`
   - File: `FOREMAN_REVIEW.md`

If the Pipeline produces these all in one chat (which the activation prompt requests), the Reviewer and Localhost-Tester each commit their reports separately (TEST_REPORT.md as the Localhost-Tester commit; no Reviewer commit if the Reviewer only verifies and the verdict goes into FOREMAN_REVIEW). Final commit count is 4–5 depending on whether Reviewer commits separately.

---

## 10. Dependencies / Preconditions

- **Branch:** `develop`, clean except for the pre-existing untracked paths Daniel chose to leave untouched.
- **Predecessor SPEC:** `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP` CLOSED (verified — was closed by commit `089ebb0` earlier today).
- **MCP availability:** Supabase MCP `apply_migration`, `execute_sql`, `list_migrations` — required.
- **Smoke test infrastructure:** `npm run smoke` (`tests/smoke/baseline.test.mjs`) — required for criteria 2 + 7.
- **Demo tenant access:** demo slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345.
- **Prizma untouched:** the integration test writes ONLY to demo. Verified by criterion 6.
- **Master safety tag:** `pre-m4-rpc-return-shape-fix-2026-05-14` pushed to `origin` before `apply_migration` (per §6).
- **No browser action required.** All verification is SQL + script-based. Per §10 of the SPEC_TEMPLATE — Chrome readiness check skipped.

### Browser readiness pre-flight (executor instructs at start)

**Pre-flight (executor): SPEC's QA is SQL + smoke-script based — no browser required. Skip Chrome readiness check.**

---

## 11. Lessons Already Incorporated

- FROM `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FOREMAN_REVIEW.md` Author Proposal #2 → APPLIED in §0 (RPC pre-flight probe codified for any RPC-touching SPEC). This SPEC is the first to use the practice end-to-end.
- FROM `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FOREMAN_REVIEW.md` Executor Proposal #1 → NOT APPLICABLE (no Mermaid, no Playwright, no browser).
- FROM `M4_WAITLIST_SYNC_PRIORITY_FIX/FOREMAN_REVIEW.md` (2026-05-14 earlier) → Master safety tag pattern → APPLIED in §6.
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 → SPEC heading style is `## N. Title` with the Iron-Rule-32 destructive-ops heading using `## N. Destructive Operations` form → APPLIED (this SPEC's §4 is `## 4. Destructive Operations`).
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #2 → §0 Pre-Authoring Reality Check structure → APPLIED.
- FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1 → live-measured baselines with runnable commands → APPLIED in §0 Baselines sub-table.
- FROM `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author Proposals #1 + #2 → color-form completeness + multi-form counts → NOT APPLICABLE (no color swap in this SPEC).
- FROM `SETTINGS_PERMISSIONS_CONSOLIDATION/FOREMAN_REVIEW.md` Author Proposal #1 → link vs comment distinction in sweep criteria → NOT APPLICABLE (no sweep here).
- FROM `SETTINGS_PERMISSIONS_CONSOLIDATION/FOREMAN_REVIEW.md` Author Proposal #2 → untracked-files survey at session start → APPLIED in §0 (47 untracked paths recorded; selective add chosen).

---

## 12. Pre-Merge Checklist

Every item below must be checked off in EXECUTION_REPORT.md §2 before the Executor commits its closure commit.

- [ ] All 12 §3 success criteria PASS with actual values captured.
- [ ] Pre-flight RPC body md5 matched baseline `dbd2ccd1eb068b494edfec5cf7788563`.
- [ ] Pre-migration smoke 7/7 PASS.
- [ ] Migration applied via `apply_migration` MCP (not direct execute_sql).
- [ ] Post-migration body diff against pre-migration body shows EXACTLY the one return-clause change.
- [ ] Integration test on demo PASSED — RPC returned `event_closed`, DB row was `event_closed`.
- [ ] Prizma row counts byte-identical pre/post.
- [ ] Post-migration smoke 7/7 PASS (Localhost-Tester confirmation).
- [ ] P1.4 `FINDINGS.md` FIND-1 line carries RESOLVED + migration commit SHA.
- [ ] `KNOWLEDGE_MAP.md` Layer 4 row updated OR `N/A` reason documented.
- [ ] M4 `SESSION_CONTEXT.md` carries one-paragraph closure entry.
- [ ] Master safety tag `pre-m4-rpc-return-shape-fix-2026-05-14` pushed to origin.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] **Iron Rule 32:** `## 4. Destructive Operations` section declares `None.` and no destructive op was attempted.
- [ ] `git status --short` returns empty for the SPEC's commits (pre-existing untracked paths surveyed at §0 may remain — they are not this SPEC's concern).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md (likely short or empty) written in the SPEC folder.

---

*End of SPEC.md. SPEC sealed by Foreman. Ready for opticup-executor dispatch.*
