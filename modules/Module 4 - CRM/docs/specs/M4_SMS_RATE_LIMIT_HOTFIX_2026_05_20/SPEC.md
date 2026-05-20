# SPEC — M4_SMS_RATE_LIMIT_HOTFIX_2026_05_20

> **Class:** P0 HOTFIX — production customer impact (325 stuck SMS for tomorrow's event).
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-20
> **Branch:** develop
> **Pipeline:** LIGHT (Foreman + Executor only — no Reviewer / no LH-Tester per Daniel's instruction for speed; single-line code + scoped UPDATE).
> **Risk class:** LOW. 1-line EF edit + 325-row tenant-scoped UPDATE on `crm_message_queue.status`.

---

## 1. Background + Root Cause (from investigation)

Per `modules/Module 4 - CRM/architecture-brief/SMS_RATE_LIMIT_INVESTIGATION_REPORT.md`:

Prizma broadcast `7af1734f-7ce1-4833-b1e1-8fd94d61f651` ("מחר אירוע מאי 2026", 1,179 SMS recipients) hit Supabase Edge Function rate-limit mid-send. 854 sent + **325 failed** stuck in `crm_message_queue` with `status='failed', retries=0, error_message='exception: Rate limit exceeded for trace 019e447a... Retry after Xms'`. dispatch-queue's claim query does NOT include `status='failed'` rows → **no auto-retry**.

Root cause: pg_cron fires `dispatch-queue` every 15s; each invocation takes ~60s for 60 rows → up to 4 invocations overlap → 4× sending rate → Supabase per-trace rate-limit exceeded.

Daniel approved Option B (batch_size 60→15) + re-queue.

---

## 2. Goal

Two atomic operations:
1. Reduce `dispatch-queue` batch size from 60 → 15 (halves throughput, cuts concurrent-tick overlap from 4× to ~1×).
2. Re-queue the 325 stuck rows back to `status='queued'` with a 30s schedule delay so they re-enter dispatch under the new lower-throughput regime.

After this lands: customers receive the SMS in ~5-6 min from re-queue, with no further rate-limit errors expected.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | EF source change | `batchSize` literal changes from `60` to `15` in `supabase/functions/dispatch-queue/index.ts:63` | grep `const batchSize = 15` returns 1 hit |
| 2 | No other constants changed in dispatch-queue | only the batchSize line | git diff shows exactly 1 line changed |
| 3 | EF deployed | New version visible via MCP list_edge_functions; version+1 from current | MCP probe |
| 4 | Deployed source confirms the change | get_edge_function returns body containing `const batchSize = 15` | MCP probe |
| 5 | Pre-UPDATE snapshot captured | `_archive/sms-rate-limit-recovery-2026-05-20/pre-update-snapshot.json` exists with 325 rows | `ls` + `jq` row count |
| 6 | UPDATE row count | 325 (±5 tolerance for any race) | UPDATE RETURNING |
| 7 | Iron Rule 31 integrity | exit 0 at every commit | pre-commit hook |
| 8 | Iron Rule 32 destructive ops | 1 declared (DML on 325 queue rows) — hook accepts since SPEC declares it | pre-commit hook |
| 9 | 5-min check | `status='queued'` decreasing, `status='sent'` increasing for the broadcast | MCP `execute_sql` |
| 10 | 30-min check (final) | `status='sent'` ≈ 1179, `status='failed'` near 0 | MCP `execute_sql` |
| 11 | No NEW rate-limit errors in last 30 min | 0 new exception errors with "Rate limit" pattern post-redeploy | MCP query |
| 12 | Working tree scope-clean post-commit | only pre-existing dirty paths from prior sessions remain | `git status --short` |

---

## 4. Autonomy Envelope

### CAN
- Read any file.
- Run Level 2 SQL via MCP `execute_sql` for: pre-UPDATE snapshot SELECT, the 325-row UPDATE, status verification SELECTs.
- Edit `supabase/functions/dispatch-queue/index.ts` (single-line change).
- Deploy EF via MCP `deploy_edge_function`. CLI fallback on `InternalServerErrorException` per OPEN-021.
- Write SPEC.md + EXECUTION_REPORT.md + FOREMAN_REVIEW.md.
- Write the pre-UPDATE snapshot to `_archive/sms-rate-limit-recovery-2026-05-20/pre-update-snapshot.json`.
- Commit on develop. Push on develop. Open PR to main per Daniel's instructions (separate from this commit).

### MUST STOP
- UPDATE returns count != 325±5 → STOP, escalate.
- New rate-limit errors continue after EF deploy (e.g., 5-min check shows failed > 50) → STOP, alert Daniel for emergency hotfix to batchSize=5.
- Need to modify ANY file outside the 1 declared (`dispatch-queue/index.ts`).
- Need to write to any table other than `crm_message_queue` (and only the 325 specified rows by `broadcast_id + status='failed' + tenant_id=prizma`).
- EF deploy fails on both MCP and CLI fallback.
- Iron Rule 31 / 32 gate fails.

---

## 5. Stop-Triggers (extended)

1. Pre-UPDATE snapshot count != 325 → investigate state drift before UPDATE.
2. UPDATE affects rows from OTHER broadcasts or OTHER tenants → STOP, rollback.
3. Post-deploy first cron tick shows rate-limit errors in new batches → STOP, escalate.

---

## 6. Pipeline

LIGHT — 2 hats:
1. **Foreman (Opus)** authors this SPEC (DONE).
2. **Executor (Foreman + Foreman-as-Executor inline for speed)** — Daniel's instruction explicitly says skip Reviewer + LH-Tester. Foreman performs the edits + UPDATE + verification in the main thread.
3. **Foreman closes** with FOREMAN_REVIEW.md.

---

## 7. Out of Scope

- The Option C structural fix (advisory lock + retry mechanism) — separate SPEC, follow-up.
- Fixing the `retries++` missing field in dispatch-queue line 236 catch block — not part of THIS hotfix; defer to Option C SPEC.
- Updating `crm_broadcasts.total_failed` counter cron to count queue failures — separate SPEC.
- Touching `send-message`, `automation-engine`, `crm_message_log`, `crm_automation_rules`, `crm_message_templates`, `crm_broadcasts`, any other tables.

---

## 8. Expected Final State

- `supabase/functions/dispatch-queue/index.ts` line 63: `const batchSize = 15;` (was `60`).
- New EF version active.
- 325 queue rows transitioned: `failed` → `queued` → `processing` → `sent` (over ~5-6 min).
- `crm_message_queue WHERE broadcast_id='7af1734f-...' AND status='sent'` count ≈ 1179.
- `crm_message_queue WHERE broadcast_id='7af1734f-...' AND status='failed'` count near 0.
- Pre-UPDATE snapshot saved to `_archive/sms-rate-limit-recovery-2026-05-20/pre-update-snapshot.json` for audit trail.
- 2 commits on develop: (a) EF edit + SPEC, (b) post-execution EXECUTION_REPORT + FOREMAN_REVIEW + archived snapshot.

---

## 9. Rollback Plan

**If batchSize=15 still rate-limits (verified at 5-min check):**
- Emergency edit batchSize=5 + redeploy.
- Alert Daniel.

**If UPDATE hit more rows than expected:**
- Snapshot saved at `_archive/sms-rate-limit-recovery-2026-05-20/pre-update-snapshot.json` contains the original 325 IDs.
- Restore: `UPDATE crm_message_queue SET status='failed' WHERE id IN (... pre-snapshot ids ...) AND broadcast_id='7af1...'`.

**If EF deploy fails entirely:**
- Make scenario (Make webhook) still receives requests from any prior-version EF instances cached on Supabase edge. Pre-fix v_old behavior continues until the new version deploys.
- Recovery: revert the file edit + re-deploy v_old via MCP/CLI.

---

## 10. Commit Plan

- **C1** (this SPEC + EF edit, single commit): `fix(crm,ef): M4_SMS_RATE_LIMIT_HOTFIX_2026_05_20 — batchSize 60→15`.
- **C2** (post-execution retro + snapshot + Foreman closure): `chore(spec): M4_SMS_RATE_LIMIT_HOTFIX_2026_05_20 — Foreman closure + audit snapshot`.

---

## 11. Destructive Operations

**Count: 1.**

Per Iron Rule 32, the gate scans for destructive patterns. This SPEC declares:

1. **UPDATE on 325 rows in `crm_message_queue`** — sets `status='failed' → 'queued'`, `scheduled_at = NOW() + INTERVAL '30 seconds'`, scope = `broadcast_id='7af1734f-7ce1-4833-b1e1-8fd94d61f651' AND status='failed' AND tenant_id=(prizma uuid)`.

This is a tenant-scoped, broadcast-scoped DML update — NOT a table-level destructive op (no DROP, no TRUNCATE, no `DELETE FROM <table>` without WHERE). Daniel-authorized via the activation prompt. Pre-UPDATE snapshot provides rollback path.

No file deletes, no `git rm`, no mass renames, no `DROP TABLE`, no `DROP COLUMN`, no `TRUNCATE`, no main-branch modification.

---

## 12. Cross-References

- Investigation report: `modules/Module 4 - CRM/architecture-brief/SMS_RATE_LIMIT_INVESTIGATION_REPORT.md`.
- Affected broadcast: `7af1734f-7ce1-4833-b1e1-8fd94d61f651` ("מחר אירוע מאי 2026", Prizma).
- Iron Rules: 21, 22, 31, 32.
- Follow-up SPEC stub: `M4_DISPATCH_QUEUE_ADVISORY_LOCK_RETRY` (Option C structural fix — defer 24-48h).

---

*End of SPEC.*
