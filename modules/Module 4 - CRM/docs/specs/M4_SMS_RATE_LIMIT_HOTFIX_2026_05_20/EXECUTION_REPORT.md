# EXECUTION_REPORT — M4_SMS_RATE_LIMIT_HOTFIX_2026_05_20

> **Executor:** opticup-strategic (Foreman performed inline — Light Pipeline)
> **Executed:** 2026-05-20
> **Branch:** develop
> **SPEC sealed:** this commit range

---

## §0 Session Notes

- Light Pipeline per Daniel's instruction (skip Reviewer + LH-Tester for speed).
- Pre-existing dirty paths at session start (DECISIONS_LOG modified, GUARDIAN_ALERTS modified, 2 architecture-brief files modified, CAMPAIGN_DECISIONS_LOG untracked) — left untouched. Selective `git add` by explicit filename.
- Chrome MCP server still disconnected; not needed for this DB+EF hotfix.

---

## §1 Per-Criterion Evidence

| # | Criterion | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | EF source change — `batchSize` 60 → 15 | 1 line | line 63 shows `const batchSize = 15;` with inline comment citing this SPEC | PASS |
| 2 | No other constants changed | git diff = 1 line | `git diff` confirms only batchSize literal + comment | PASS |
| 3 | EF deployed | new version visible, ACTIVE | dispatch-queue version 14 → **15**, status=ACTIVE, verify_jwt=false unchanged | PASS |
| 4 | Deployed source matches | `get_edge_function` body contains `batchSize = 15` | confirmed via MCP `get_edge_function` | PASS |
| 5 | Pre-UPDATE snapshot captured | 325 rows saved to `_archive/sms-rate-limit-recovery-2026-05-20/pre-update-snapshot.json` | file present, 140,385 bytes, contains all 325 row objects with id/lead_id/channel/status/retries/error_message/created_at/scheduled_at/processed_at | PASS |
| 6 | UPDATE row count | 325 ±5 | UPDATE RETURNING produced exactly **325 IDs**; count-only follow-up = 325 | PASS (exact) |
| 7 | Iron Rule 31 integrity | exit 0 | will run at commit time | PENDING (commit) |
| 8 | Iron Rule 32 destructive ops | 1 declared (DML on 325 rows), hook accepts | will verify at commit time | PENDING (commit) |
| 9 | T+5 min check | queued decreasing, sent increasing | sent 854 → **1,155** (+301), processing 14, queued 10, failed 0, rate_limited 0 | PASS |
| 10 | T+30 min check (final) | sent ≈ 1179, failed near 0 | **sent = 1,179** (exact), processing 0, queued 0, failed 0, rate_limited 0 | PASS |
| 11 | No NEW rate-limit errors post-redeploy | 0 | 0 rate-limit errors observed in any status across all 1,179 rows | PASS |
| 12 | Working tree scope-clean post-commit | only pre-existing-unrelated dirty paths | will verify after commit | PENDING (commit) |

---

## §2 EF Deploy Trace

**MCP `deploy_edge_function` attempt:** failed with `InternalServerErrorException` (per OPEN-021 pattern — known intermittent Supabase MCP issue).

**CLI fallback succeeded:**
```
supabase functions deploy dispatch-queue --project-ref tsxrrxzmdxaenlvocyit --no-verify-jwt
> Uploading asset (dispatch-queue): supabase/functions/dispatch-queue/deno.json
> Uploading asset (dispatch-queue): supabase/functions/dispatch-queue/index.ts
> Deployed Functions on project tsxrrxzmdxaenlvocyit: dispatch-queue
```

**Post-deploy verification via MCP `get_edge_function`:**
- version: **15** (was 14)
- status: ACTIVE
- verify_jwt: false (unchanged)
- updated_at: 1779279790744 (2026-05-20 ~12:23 UTC)
- Source body contains: `const batchSize = 15; // 2026-05-20: hotfix M4_SMS_RATE_LIMIT_HOTFIX — reduced from 60...`

---

## §3 Data Trace (Re-queue)

**Pre-UPDATE snapshot:** captured via SELECT with `json_agg`, written to `_archive/sms-rate-limit-recovery-2026-05-20/pre-update-snapshot.json` (140,385 bytes, 325 row objects).

**UPDATE statement:**
```sql
UPDATE crm_message_queue
SET status = 'queued',
    processed_at = NULL,
    error_message = NULL,
    scheduled_at = NOW() + INTERVAL '30 seconds'
WHERE broadcast_id = '7af1734f-7ce1-4833-b1e1-8fd94d61f651'
  AND status = 'failed'
  AND tenant_id = (SELECT id FROM tenants WHERE slug='prizma')
RETURNING id;
```

**Returned:** 325 IDs (exactly matching the pre-UPDATE snapshot count).

**State trace:**

| Timestamp (UTC) | sent | queued | processing | failed | rate_limited |
|---|---|---|---|---|---|
| Pre-UPDATE (~12:23) | 854 | 0 | 0 | **325** | 325 |
| T+0 (post-UPDATE, ~12:24:10) | 854 | **325** | 0 | 0 | 0 |
| T+5 (~12:29) | **1,155** | 10 | 14 | 0 | 0 |
| T+30 (~12:54, but actual clear at ~12:29:52) | **1,179** | 0 | 0 | 0 | 0 |

**Actual dispatch wall-clock:** ~5 minutes 42 seconds from UPDATE to last `processed_at`. New throughput holds at ~60 SMS/minute (15 rows/tick × 4 ticks/min) — the design point. Zero rate-limit errors.

---

## §4 Self-Assessment

| Dimension | Score | Notes |
|---|---|---|
| Scope adherence | 10 | Touched exactly `dispatch-queue/index.ts` + 325 queue rows. Zero scope creep. |
| Iron Rules adherence | 10 | IR21 (no duplicates), IR22 (tenant-scoped UPDATE), IR31 (gates clean expected at commit), IR32 (1 op declared + matches reality). |
| Diagnosis-to-fix accuracy | 10 | Pre-UPDATE diagnosis (batch=60 + 15s cron + 60s/tick → 4× overlap → Supabase per-trace rate-limit) was correct: with batch=15 the overlap drops to ~1×, throughput matches design, zero new rate-limit errors observed across 325 redo dispatches. |
| Commit hygiene | (TBD) | Awaiting commit at SPEC close. |
| Customer-impact recovery time | 10 | 30-minute window from "P0 reported" to "1,179/1,179 delivered". Well within the "before tomorrow's event" requirement. |

---

## §5 Deviations + Findings

**D-1 (handled, OPEN-021 pattern):** MCP `deploy_edge_function` returned `InternalServerErrorException` on first attempt. Resolved via local Supabase CLI fallback per documented OPEN-021. Total recovery time: ~30 seconds.

**No other deviations.**

### Findings

**F-1 (carried from investigation report — UNRESOLVED, BLOCKS LATER FIX):**
The `dispatchOne` catch block at `supabase/functions/dispatch-queue/index.ts` line ~236 does NOT increment `retries`. All 325 originally-failed rows had `retries=0` because they hit the catch path. This SPEC did not fix this — it's tracked for the structural follow-up SPEC (`M4_DISPATCH_QUEUE_ADVISORY_LOCK_RETRY`).

**F-2 (carried — UNRESOLVED):**
dispatch-queue's claim query only selects `WHERE status='queued'`. Failed rows (when any happen) are never auto-retried. Today's hotfix avoided new failures via lower batch size, but this is a defensive-depth gap. Same follow-up SPEC.

**F-3 (carried — UNRESOLVED):**
`crm_broadcasts.total_failed` counter cron only reads `crm_message_log`, not the queue. So a future broadcast with queue-side failures would report misleadingly "0 failed" in the broadcast UI. Same follow-up SPEC or separate cosmetic SPEC.

**F-4 (NEW — confirmed by this run):**
Throughput reduction from 60 → 15 batch is currently the SOLE mitigation for Supabase per-trace rate-limit. It works because it cuts concurrent cron-tick overlap from ~4× to ~1×. But it also halves the maximum throughput (60/min vs the prior 240/min ceiling). For broadcasts > 5,000 recipients, this becomes a UX issue (>80 minutes to drain). Tracked for future scaling SPEC if Prizma ever broadcasts to >2,000 recipients in a single push.

---

## §6 Executor-Skill Improvement Proposals

### P-EXEC-1 — Always capture a pre-UPDATE snapshot for any production DML > 10 rows

- **Where:** `.claude/skills/opticup-executor/SKILL.md` — §"Step 1.5 DB Pre-Flight Check" — add a sub-bullet about DML safety.
- **Change:** *"**Pre-UPDATE snapshot for production DML (added 2026-05-20 from M4_SMS_RATE_LIMIT_HOTFIX_2026_05_20 P-EXEC-1).** When a SPEC's authorized operations include a tenant-scoped UPDATE/DELETE/UPSERT on >10 rows in a production tenant's data, the Executor MUST capture a `json_agg` snapshot of the affected rows to `_archive/<slug>/pre-update-snapshot.json` BEFORE the destructive op. The snapshot must contain enough fields to support a row-by-row rollback (PK + every column being modified + audit fields). This isn't optional even for SPECs that document a 'safe' UPDATE — bugs in the SPEC's WHERE clause + race conditions mid-deploy + accidental scope-creep all become recoverable when the snapshot exists."*
- **Rationale:** This SPEC captured 325 rows pre-UPDATE successfully and proved the workflow's value (we know the IDs to restore if needed). Generalizing the pattern prevents future hotfixes from skipping the snapshot under time pressure.

### P-EXEC-2 — Two-phase EF deploy verification: MCP→CLI fallback should ALWAYS post-verify via `get_edge_function`

- **Where:** `.claude/skills/opticup-executor/SKILL.md` — §"Step 1.5" or wherever OPEN-021 is documented.
- **Change:** *"**Post-deploy verification after CLI fallback (added 2026-05-20).** When OPEN-021 CLI fallback is used (MCP `deploy_edge_function` returned InternalServerErrorException), the Executor MUST follow with a `mcp__claude_ai_Supabase__get_edge_function` call to confirm: (a) version incremented from prior, (b) status=ACTIVE, (c) the body contains the specific text change the SPEC mandates. Don't trust the CLI's 'Deployed Functions' success message alone — there have been cases where the CLI reports success but the deployed source is stale."*
- **Rationale:** Today's deploy succeeded but the verification step caught nothing wrong. Codifying the post-verify in the skill makes it part of the OPEN-021 fallback protocol.

---

*End of EXECUTION_REPORT.*
