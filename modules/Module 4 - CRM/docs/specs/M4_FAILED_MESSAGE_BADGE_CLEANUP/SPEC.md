# SPEC — M4_FAILED_MESSAGE_BADGE_CLEANUP

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_FAILED_MESSAGE_BADGE_CLEANUP/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-15
> **Module:** 4 — CRM
> **Phase:** Hotfix + reusable feature
> **Brief:** `modules/Module 4 - CRM/architecture-brief/M4_FAILED_MESSAGE_BADGE_CLEANUP_BRIEF.md`
> **Author signature:** Claude Code (Opus 4.7), Full-Auto Pipeline chat 2026-05-15

> **Heading convention:** Use `## N. Title`. No `§` prefix (Iron-Rule-32 hook regex.)

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-15.
- Phase 0 diagnostic executed (live SQL + grep) — see `## 1.5 Phase 0 Findings`. Time spent: ~30 min (well under 45-min budget). **Conclusion: D1 — live aggregate.** No escalation.
- Daniel's decisions baked in by the Brief — NOT relitigated in this SPEC (per `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA/FOREMAN_REVIEW.md` P-T1.1-1):
  - Option C (TWO surfaces: per-lead × + chip-modal).
  - Option A (full audit trail: `acknowledged_at` + `acknowledged_by` + `acknowledged_reason`).
  - ONE backend RPC drives both surfaces.
  - One-time historical cleanup applies the new mechanism to the 758 specific Prizma rows.
- Cross-Reference Check completed 2026-05-15 against repo HEAD: **0 collisions / 0 hits** on every new name introduced (`acknowledged_at`, `acknowledged_by`, `acknowledged_reason`, `acknowledge_failed_messages` RPC, `crm.message_log.acknowledge` permission key, `crm-failed-messages-modal.js` file). Rule 21 satisfied.
- Pre-existing untracked files surveyed: ~80 paths (mostly other architecture briefs from overnight bundle drafts + sibling SPEC folders + 3 tracked `tests/optic*.accdb` files). **Leave-alone + selective `git add` by name** (D1 decision per the activation prompt). Executor commits ONLY the files explicitly listed in §8.
- Brief assumption vs reality divergence corrected from live DB:
  - Brief says "758 rows have `status='rejected'`". **Reality (verified live): the 758 rows have `status='failed'`.** Prizma's `crm_message_log` last-90-day distribution: sent=3932, **failed=762**, pending_review=4, rejected=2. The badge code filters `status='failed'` (singular), so the 758 are the ones rendering the badge.
  - Brief says backup file `BACKUP_758_ROWS.json` holds row_ids of the broadcast `ab7341c9` failures. **Reality (verified live + file): the 762 failed rows all have `broadcast_id IS NULL`** — they came from the automation engine's `send_message` action (Rule 2.2/2.4), not the broadcast wizard. The `ab7341c9` attribution in the Brief is wrong. The 758-row backup is correctly keyed by `log_id` (verified: 758 unique log_ids + 758 unique lead_ids + all sms + 2026-05-13 06:13-06:32 burst).
- Note on UI surfaces: the current chip click toggles `_failuresOnly` filter. Per Brief Surface 2, **the chip click is repurposed to open the new modal**; the filter toggle becomes redundant and is removed in this SPEC.

### Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | File | Metric | Value (captured 2026-05-15) |
|---|---|---|---|
| `BASE_LINES_LEADS_TAB` | `modules/crm/crm-leads-tab.js` | `wc -l` | 348 (cap 350) |
| `BASE_LINES_DETAIL_MSGS` | `modules/crm/crm-leads-detail-messages.js` | `wc -l` | 150 |
| `BASE_LINES_CRM_HTML` | `crm.html` | `wc -l` | 330 |
| `BASE_FAILED_ROWS_PRIZMA_90D` | live DB | `COUNT(*) FROM crm_message_log WHERE tenant_id='prizma' AND status='failed' AND lead_id IS NOT NULL AND created_at >= now()-90d` | 762 |
| `BASE_FAILED_LEADS_PRIZMA_90D` | live DB | `COUNT(DISTINCT lead_id)` above | 760 |
| `BASE_BACKUP_758_LOG_IDS` | `modules/Module 4 - CRM/docs/specs/M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA/BACKUP_758_ROWS.json` | unique log_ids in `rows[]` | 758 |
| `BASE_FAILED_ROWS_DEMO_90D` | live DB | same query, tenant_id='demo' | 0 |

---

## 1. Goal

Ship a reusable **acknowledge** mechanism for failed-message badges in the CRM — both per-lead (× on the ⚠️ badge) and bulk (via the "📩 הודעות כושלות (N)" chip → modal) — and apply it as one-time historical cleanup to the 758 specific Prizma rows from the 2026-05-13 placeholder-failure burst, so the visible badge state clears for failures that have already been operationally resolved (follow-up SMS already delivered).

---

## 2. Background & Motivation

On 2026-05-13 (06:13–06:32 UTC), the automation engine sent 758 SMS messages with an unsubstituted `%event_max_attendees%` placeholder (Rule 2.2/2.4 event-invite path). All 758 failed with `status='failed'` and now render the ⚠️ badge against 758 leads + the chip "📩 הודעות כושלות (760)" in the leads board. The root cause was fixed by SPEC `M4_TEMPLATE_VALIDATION_UNIFIED` (closed 2026-05-14, Phase 2 P2.3 — pre-enqueue validation now catches unsubstituted placeholders BEFORE send). Daniel reviewed the incident on 2026-05-15 morning and chose deferred-then-cleared: a follow-up SMS was sent (758 leads received it successfully); event #24 is deliberately closed; the failed log rows are historical noise. Per Daniel: *"אני רוצה שיהיה כפתור שאוכל ללחוץ עליו ולנקות את הסימונים גם."*

This SPEC builds the staff-facing "acknowledge" mechanism Daniel asked for (reusable for future failed-message noise) and consumes its own first run to clear the 758-row backlog. The forward-compat angle: the FUNNEL_ROADMAP Phase 2.5 Funnel Health Dashboard will be able to filter failure rates by `acknowledged_at IS NULL` (true active failures) vs `IS NOT NULL` (handled noise) for better signal-to-noise.

Referenced prior SPECs: `M4_TEMPLATE_VALIDATION_UNIFIED` (root-cause prevention), `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA` (758-row backup origin), `BROADCAST_EVENT_LINK_SUPPORT` (sibling SPEC that fixed the cross-broadcast variant of the same template-validation gap).

---

## 1.5 Phase 0 Findings (sealed before Repair Section)

Mandatory diagnostic per Brief §1. Time spent: ~30 min.

### 1.5.1 Badge source path — **D1 (live aggregate)**

- **Source file:** `modules/crm/crm-leads-tab.js:52-59` — function `loadFailedCounts()`.
- **Source query (verbatim from current code):**
  ```javascript
  var since = new Date(Date.now() - 90 * 86400000).toISOString();
  var res = await DB.select('crm_message_log', { status: 'failed' }, {
    columns: 'lead_id',
    rawFilters: function (q) { return q.not('lead_id', 'is', null).gte('created_at', since); },
    silent: true
  });
  var m = {}; (res.data || []).forEach(function (r) { if (r.lead_id) m[r.lead_id] = (m[r.lead_id] || 0) + 1; });
  _failedCounts = m;
  ```
- **Look-back window:** last 90 days (`created_at >= now() - 90 days`).
- **Status filter value:** `'failed'` (singular) — the Brief's `'rejected'` claim is WRONG; verified against live DB (the 758 rows are `status='failed'`).
- **Chip count formula:** `Object.keys(_failedCounts).length` = unique leads with ≥1 failed message in last 90 days. **Not total failed rows** — leads with 2 failures count once. Hence chip=760 with 762 total rows (2 leads have 2 failures each).
- **Per-lead badge formula:** `_failedCounts[r.id]` = count of failures for that lead in last 90 days. Rendered at `crm-leads-tab.js:277`.
- **Filter chip rendering:** `crm-leads-tab.js:189-201` — pill `📩 הודעות כושלות (M)` where `M = Object.keys(_failedCounts).length`. Current click handler toggles `_failuresOnly` and re-renders.
- **Per-lead history view query:** `modules/crm/crm-leads-detail-messages.js:27-31` — uses raw `sb.from('crm_message_log')` (known M4-DEBT-02 Iron Rule 7 violation; out of scope to fix here). SELECT will be extended to include the 3 new ack columns.

### 1.5.2 Failed-message live state (Prizma)

- Total `crm_message_log` last 90d with `lead_id NOT NULL`: 4700 rows.
- Status distribution: sent=3932, **failed=762**, pending_review=4, rejected=2.
- All 762 failed rows: `created_at` between `2026-05-13 06:13:01` and `2026-05-13 13:01:52`, `broadcast_id IS NULL` (automation engine, not wizard).
- Unique leads with failures: **760** (chip count).
- Backup file `BACKUP_758_ROWS.json` content verified: 758 unique log_ids, 758 unique lead_ids, all channel='sms', timestamps 06:13:01–06:32:06 (19-minute burst).
- 758 of the 762 are in the backup set; **4 unrelated failures** (= 762 − 758) span 2 unique leads (= 760 − 758) — these are the expected post-cleanup leftover.

### 1.5.3 Permission model decision — **introduce `crm.message_log.acknowledge`**

- Live `permissions` table state: **ZERO CRM-prefixed rows** today. The `'crm.broadcast.send'` string in `crm-activity-log.js:27` and `crm-messaging-broadcast-queue.js:167` is an **activity-log label**, not an enforced permission key.
- Decision: **introduce a new permission key `crm.message_log.acknowledge`** scoped per-tenant (Iron Rule 14). Inserted into `permissions` for both Prizma + Demo. Granted with `granted=true` to all 5 default roles (`מנכ"ל`, `מנהל`, `ראש צוות`, `צופה`, `עובד`) in BOTH tenants by default (backward-compatible — current behavior is "anyone with CRM access can use it"; new key just makes future restriction possible).
- **NO permission-matrix UI changes** in this SPEC. CRM has no other permission keys today; introducing a single CRM key without a permission group would be inconsistent. A future SPEC may add the full CRM permission group; this SPEC reserves the namespace by inserting the one key.
- UI gate: JS calls `hasPermission('crm.message_log.acknowledge')` to show/hide the × icon and the modal "סמן כמטופלות" button.
- Server gate: RPC uses canonical JWT-claim tenant_id check (Iron Rule 15). The RPC does NOT do its own permission lookup — the canonical pattern in M4 is "RLS enforces tenant boundary, UI enforces permission gating." Hot consequence: a malicious caller bypassing the UI but holding a valid JWT can still call the RPC — but they can only ever acknowledge their own tenant's rows. Acceptable risk; future hardening can move the permission check server-side.

### 1.5.4 `acknowledged_by` FK target — **`employees(id)`**

Matches the existing CRM convention. Other tables using the same column name: `crm_audit_log.employee_id`, `crm_broadcasts.employee_id`, `crm_event_status_history.employee_id`, `crm_lead_notes.employee_id`. The new column reuses the same FK target.

### 1.5.5 JWT-claim source for `employee_id`

Per the `pin-auth` Edge Function pattern, the JWT carries `employee_id` as a top-level claim. RPC reads it via:

```sql
COALESCE(
  (current_setting('request.jwt.claims', true)::json->>'employee_id')::uuid,
  NULL
)
```

`tenant_id` claim follows the canonical pattern (Iron Rule 15):

```sql
tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
```

### 1.5.6 Activity log integration

Yes — write ONE `activity_log` row per successful RPC call via existing `CrmHelpers.logActivity(action='crm.message_log.acknowledge', target_table='crm_message_log', target_id=NULL, details={count, reason})`. Client-side, after the RPC returns. Matches the existing pattern (see `crm-event-delete.js:34` and `crm-messaging-broadcast-queue.js:167`).

---

## 3. Success Criteria (Measurable — 19 criteria, mapped to Brief §7)

| # | Criterion | Expected value | Verify command |
|---|-----------|----------------|----------------|
| 1 | Phase 0 diagnostic documented in SPEC | Section `## 1.5 Phase 0 Findings` exists with 6 sub-sections (1.5.1–1.5.6) | `grep -c "^### 1\.5\." SPEC.md` ≥ 6 |
| 2 | 3 new columns + composite index added to `crm_message_log` | Columns `acknowledged_at timestamptz NULL`, `acknowledged_by uuid NULL`, `acknowledged_reason text NULL` exist; index `idx_crm_message_log_ack` on `(tenant_id, acknowledged_at)` exists | Supabase MCP `information_schema.columns` + `pg_indexes` |
| 3 | RPC `acknowledge_failed_messages` exists with canonical RLS + `SET search_path='public'` | Function signature matches §8.1; `pg_get_functiondef` contains `SET search_path = 'public'` and the canonical JWT-claim tenant USING-clause | Supabase MCP `pg_get_functiondef` |
| 4 | RPC validates tenant_id from JWT claims (rejects cross-tenant call) | Demo-context call against a Prizma row_id → returns `{updated_count:0, skipped_count:0, errors:[{log_id, code:'cross_tenant'}]}` and DOES NOT update the Prizma row | demo integration test — see §3.1 below |
| 5 | Demo end-to-end full chain: 3 failed messages → ⚠️ shows N=3 → per-lead × clears 1 → chip shows 2 → bulk modal clears 2 → chip disappears | All 6 steps pass per the test script in §3.2 | demo integration test (`tests/spec/M4_FAILED_MESSAGE_BADGE_CLEANUP.test.mjs` OR LH-Tester manual walkthrough) |
| 6 | Demo: 3 leads' history view shows the failed message rows + "מטופל" tag with timestamp + employee + reason | Each acknowledged row in the per-lead history shows `<span class="crm-ack-tag">מטופל · {timestamp} · {employee_name}</span>` (reason in tooltip if present) | manual walkthrough |
| 7 | New permission key configured | Row exists in `permissions` for both tenants with `id='crm.message_log.acknowledge'`, `module='crm'`, `action='acknowledge'`; 10 rows exist in `role_permissions` (2 tenants × 5 roles) with `granted=true` | Supabase MCP `SELECT COUNT(*) FROM permissions WHERE id='crm.message_log.acknowledge'` → 2; `SELECT COUNT(*) FROM role_permissions WHERE permission_id='crm.message_log.acknowledge' AND granted=true` → 10 |
| 8 | Prizma 758-row cleanup completed via RPC: 758 acknowledged, 0 errors | RPC return: `{updated_count: 758, skipped_count: 0, errors: []}` | execute RPC + capture return in EXECUTION_REPORT |
| 9 | Prizma chip count post-cleanup = 2 (or document if leftover differs) | `SELECT COUNT(DISTINCT lead_id) FROM crm_message_log WHERE tenant_id='prizma' AND status='failed' AND acknowledged_at IS NULL AND lead_id IS NOT NULL AND created_at >= now() - 90d` = 2 | Supabase MCP |
| 10 | Spot-check 5 random affected Prizma leads: ⚠️ gone | For each of 5 random `lead_id`s sampled from `BACKUP_758_ROWS.json`, the unacknowledged-failure count = 0 | Supabase MCP — see §3.3 |
| 11 | Spot-check same 5 leads: history view query shows the row + ack columns populated | For each of the 5 sampled log_ids, `SELECT acknowledged_at, acknowledged_by, acknowledged_reason FROM crm_message_log` returns non-null values matching the cleanup batch | Supabase MCP |
| 12 | NO Prizma row touched outside the 758 backup set | After cleanup: `SELECT COUNT(*) FROM crm_message_log WHERE tenant_id='prizma' AND acknowledged_at IS NOT NULL AND id NOT IN (<758 log_ids>)` = 0 | Supabase MCP |
| 13 | Demo: zero writes outside the test scenarios | Demo `acknowledged_at IS NOT NULL` count after test cleanup = 0 (test scenarios clean up their own rows) | Supabase MCP — see §3.4 cleanup block |
| 14 | Event #24 status untouched (still `closed` per Daniel's deferral) | `SELECT status FROM crm_events WHERE event_number=24 AND tenant_id='prizma'` = `'closed'` (or whatever pre-SPEC value is — captured as `BASE_EVENT_24_STATUS` at executor session start) | Supabase MCP at executor session start + close |
| 15 | Smoke 7/7 PASS pre- AND post-migration | LH-Tester `TEST_REPORT.md` records 7/7 passed in single post-execution run; "pre" baseline is delegated to most recent green TEST_REPORT.md from a prior SPEC chain (per `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` Author Proposal #2). Executor confirms which prior TEST_REPORT is being used as the pre-baseline at the start of EXECUTION_REPORT §2.15. | `npm run smoke` from `tests/smoke/baseline.test.mjs` after migrations |
| 16 | Integrity gate exit 0 | `npm run verify:integrity` → exit 0 (no null-byte ERROR) | `npm run verify:integrity; echo $?` |
| 17 | Activity log entry created for the historical 758 cleanup call | `SELECT COUNT(*) FROM activity_log WHERE action='crm.message_log.acknowledge' AND tenant_id='prizma' AND created_at >= <executor_session_start>` = 1; details JSON contains `count: 758` and a non-empty `reason` | Supabase MCP |
| 18 | Bundle 2 T1.1 escalation file updated with Option E + completion timestamp | `modules/Module 4 - CRM/escalations/2026-05-14T22-35Z_brands_event_24_resend_decision.md` contains a new section `## Resolution — Option E (Acknowledge mechanism + 758 cleared)` with ISO timestamp and pointer to this SPEC | `grep -c "Option E" <escalation file>` ≥ 1 |
| 19 | Repo clean at close | `git status` → "nothing to commit, working tree clean" for files touched by this SPEC (other pre-existing untracked files outside SPEC scope are left untouched per the leave-alone D1 decision) | `git status --porcelain` shows only pre-existing untracked paths that were already there at SPEC start |

### 3.1 Cross-tenant rejection test scenario (criterion 4)

```
-- Setup (executor seeds in demo via direct INSERT):
INSERT INTO crm_message_log (tenant_id, lead_id, channel, content, status, created_at)
VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb',  -- demo
  '<any demo lead uuid>', 'sms', 'cross-tenant rejection probe', 'failed', now()
) RETURNING id; -- capture as <demo_seed_log_id>

-- Test: call the RPC FROM PRIZMA JWT context (simulated via execute_sql with custom claims) with <demo_seed_log_id>:
SET LOCAL "request.jwt.claims" TO '{"tenant_id":"6ad0781b-37f0-47a9-92e3-be9ed1477e1c","employee_id":"<any prizma employee>"}';
SELECT * FROM acknowledge_failed_messages(ARRAY['<demo_seed_log_id>']::uuid[], 'cross-tenant-probe');
-- Expected return: {updated_count:0, skipped_count:0, errors:[{log_id:'<demo_seed_log_id>', code:'cross_tenant'}]}

-- Verify the demo row was NOT touched:
SELECT acknowledged_at FROM crm_message_log WHERE id='<demo_seed_log_id>';
-- Expected: NULL

-- Cleanup (executor MUST delete the probe row):
DELETE FROM crm_message_log WHERE id='<demo_seed_log_id>';
```

### 3.2 Demo end-to-end test scenario (criterion 5)

Seed 3 fake failures, walk the UI, verify counts.

```
-- Setup (executor inserts 3 demo failures):
INSERT INTO crm_message_log (tenant_id, lead_id, channel, content, status, error_message, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', id, 'sms',
       'demo-ack-test ' || gen_random_uuid()::text, 'failed', 'demo seed', now()
FROM crm_leads
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND phone IN ('+972537889878','+972503348349','+972507168471')
LIMIT 3
RETURNING id;
-- Capture the 3 returned ids as <demo_log_id_1>, <demo_log_id_2>, <demo_log_id_3>.
```

UI walkthrough (LH-Tester, on `http://localhost:3000/crm.html` with demo PIN 12345):
1. Open לידים tab — verify ⚠️ badge appears on the 3 seeded leads + chip shows `📩 הודעות כושלות (3)`.
2. Click the × on one lead's ⚠️ → confirm dialog → confirm → ⚠️ disappears for that lead, chip = 2.
3. Click chip → modal opens listing 2 remaining → checkbox both → "סמן כמטופלות" → modal closes, chip disappears.
4. Open each of the 3 leads' detail modal → "הודעות" tab → verify the failed row is STILL listed with a "מטופל · {timestamp} · {employee}" tag.

### 3.3 Spot-check sample (criteria 10–11)

Executor reads `BACKUP_758_ROWS.json` `rows[]`, picks 5 random `log_id` + their `lead_id` (via Math.random()-style selection on the parsed JSON), verifies each per criteria 10–11. Sample log_ids recorded in EXECUTION_REPORT §2.10 for Reviewer cross-check.

### 3.4 Demo cleanup block (pre-list per `M4_TEMPLATE_VALIDATION_UNIFIED` Author Proposal #2)

After the demo end-to-end test passes, executor MUST run this single block to clean up demo writes (criterion 13):

```sql
-- Cleanup demo seed rows (3 failure rows from §3.2 + any cross-tenant probe row from §3.1):
DELETE FROM crm_message_log
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND content LIKE 'demo-ack-test%'
  AND created_at >= '<executor_session_start_iso>';

DELETE FROM crm_message_log
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND content = 'cross-tenant rejection probe';

-- Verify zero residue:
SELECT COUNT(*) FROM crm_message_log
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND acknowledged_at IS NOT NULL;
-- Expected: 0
```

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo.
- Run any read-only SQL (Level 1 autonomy).
- Apply the migration (single file, declared additive — see §8.1). Level 2 autonomy is pre-authorized by this SPEC.
- Insert/update the 758 Prizma rows via the new RPC (Level 2 autonomy — pre-authorized).
- Insert demo seed rows for the §3.2 test + delete them per §3.4.
- Edit/create the files listed in §8 by name.
- Commit and push to `develop` per §9.
- Reuse the most recent green TEST_REPORT.md from a prior SPEC chain as the "smoke pre" baseline (per `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` Author Proposal #2). Executor records WHICH prior TEST_REPORT in EXECUTION_REPORT §2.15.
- Capture `BASE_EVENT_24_STATUS` at executor session start and at session close, confirm unchanged.

### What REQUIRES stopping and reporting

- Phase 0 ambiguity (already resolved — but if executor sees deviation from Phase 0 findings in repo state, STOP).
- Any UPDATE on Prizma touching a row OUTSIDE the 758 backup set → STOP, rollback.
- RPC failing the cross-tenant rejection test (criterion 4) → STOP, fix the RLS canon BEFORE proceeding.
- Demo end-to-end chain breaking at ANY link (criterion 5 sub-steps) → STOP, do NOT proceed to Prizma cleanup.
- Prizma chip post-cleanup ≠ 2 → STOP, investigate (document the discrepancy).
- Smoke pre-baseline TEST_REPORT not green → STOP (use a different prior baseline or escalate).
- Event #24 `crm_events.status` changing during the run → STOP (Daniel: deliberately closed).
- File-size compliance: if `crm-leads-tab.js` grows past 350 lines as a result of executor's edits → STOP and split (per Iron Rule 12).

---

## 5. Stop-on-Deviation Triggers (additional to CLAUDE.md §9)

- If Phase 0's hypothesis (D1 live aggregate at `crm-leads-tab.js:52-59`) does NOT match repo state at executor session start (e.g., file was just refactored by a parallel session and `loadFailedCounts` no longer exists) → STOP.
- If the live `BASE_FAILED_ROWS_PRIZMA_90D` value at executor session start differs from 762 by more than ±5 (i.e., new failures or someone manually deleted some) → STOP, capture the new baseline, reconfirm 758 backup is still a subset, escalate if not.
- If `BACKUP_758_ROWS.json` MD5 verification (executor's session-start re-dump matches the stored content_md5 per row) finds ANY content drift → STOP. (Brief §5 step 6.)
- If `activity_log` write fails during the historical cleanup (criterion 17), but the 758-row UPDATE succeeded → STOP and report; don't loop on the activity row, but escalate so Foreman can decide whether to manually add it.

---

## 6. Rollback Plan

This SPEC is **purely additive at the schema level** (3 NULL-able columns + 1 index + 1 new RPC + permission inserts). Per `M4_TEMPLATE_VALIDATION_UNIFIED` Author Proposal #1, no `_down.sql` is provided — a `ROLLBACK.md` is provided instead.

Rollback file: `modules/Module 4 - CRM/docs/specs/M4_FAILED_MESSAGE_BADGE_CLEANUP/ROLLBACK.md` (executor writes it as the LAST step of the migration commit — same commit as the migration). Contents:

1. **Reverse the 758-row UPDATE** (only if the cleanup ran):
   ```sql
   UPDATE crm_message_log
   SET acknowledged_at = NULL, acknowledged_by = NULL, acknowledged_reason = NULL
   WHERE id = ANY (
     SELECT id FROM crm_message_log
     WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
       AND acknowledged_reason LIKE '2026_05_13_unsubstituted_placeholder%'
   );
   ```
2. **Drop the RPC**: `DROP FUNCTION IF EXISTS public.acknowledge_failed_messages(uuid[], text);`
3. **Drop the index**: `DROP INDEX IF EXISTS idx_crm_message_log_ack;`
4. **Drop the 3 columns**: `ALTER TABLE crm_message_log DROP COLUMN IF EXISTS acknowledged_at, DROP COLUMN IF EXISTS acknowledged_by, DROP COLUMN IF EXISTS acknowledged_reason;`
5. **Revoke the permission**: `DELETE FROM role_permissions WHERE permission_id='crm.message_log.acknowledge'; DELETE FROM permissions WHERE id='crm.message_log.acknowledge';`
6. **Revert code commits**: `git revert <range>` for the JS/HTML commits.

This rollback is documented but NOT pre-emptively executed. Use only if a critical issue is discovered post-merge to develop.

---

## Destructive Operations

Per Iron Rule 32.

1. **Level 2 UPDATE on `crm_message_log`** — exactly 758 specific rows in Prizma identified by `id IN (<758 log_ids from BACKUP_758_ROWS.json>)`. One-time, idempotent (RPC skips rows where `acknowledged_at IS NOT NULL`).
2. **DELETE on `crm_message_log` (demo only)** — cleanup block in §3.4 deletes demo seed rows (test scenarios from §3.2 + cross-tenant probe row from §3.1). All deletes are WHERE-scoped to `tenant_id='demo'` AND `content LIKE 'demo-ack-test%'` OR `content='cross-tenant rejection probe'`. NEVER touches Prizma. Pre-authorized.
3. **ALTER TABLE `crm_message_log` ADD COLUMN** × 3 (additive, NOT destructive per IR-32 regex — listed here for completeness).
4. **CREATE FUNCTION `acknowledge_failed_messages`** (additive).
5. **CREATE INDEX `idx_crm_message_log_ack`** (additive).
6. **INSERT INTO `permissions` + `role_permissions`** (additive).

**No DROP, no TRUNCATE, no schema removal, no Prizma row deletion, no git destructive ops, no main deploys.**

---

## 7. Out of Scope (explicit)

- Re-sending any message to any customer (Daniel: already received follow-up).
- Touching event #24's `status` (deliberately closed by Daniel).
- Acknowledging the 2 unrelated leftover failures (= 4 rows / 2 leads not in the 758 backup set).
- Acknowledging failures across other tenants (this SPEC's historical cleanup is Prizma-only AND limited to the 758 specific log_ids).
- Building un-acknowledge / undo (future SPEC if needed).
- Building "history of cleared failures" filter chip (future SPEC).
- Building bulk auto-acknowledge by age (future SPEC).
- Fixing the M4-DEBT-02 raw `sb.from()` in `crm-leads-detail-messages.js` (out of scope; this SPEC just extends the SELECT to include 3 columns).
- Adding the new permission key to the permission-matrix admin UI (future "CRM permission group" SPEC).
- Merging to `main`.

---

## 8. Expected Final State

### 8.1 New files

- `modules/Module 4 - CRM/docs/specs/M4_FAILED_MESSAGE_BADGE_CLEANUP/SPEC.md` — this file.
- `modules/Module 4 - CRM/docs/specs/M4_FAILED_MESSAGE_BADGE_CLEANUP/ROLLBACK.md` — created by executor as part of the migration commit.
- `modules/Module 4 - CRM/docs/specs/M4_FAILED_MESSAGE_BADGE_CLEANUP/migrations/01_failed_message_ack.sql` — single combined migration. Body:

  ```sql
  -- 1) Schema additions on crm_message_log
  ALTER TABLE public.crm_message_log
    ADD COLUMN IF NOT EXISTS acknowledged_at  timestamptz NULL,
    ADD COLUMN IF NOT EXISTS acknowledged_by  uuid        NULL REFERENCES public.employees(id),
    ADD COLUMN IF NOT EXISTS acknowledged_reason text     NULL;

  CREATE INDEX IF NOT EXISTS idx_crm_message_log_ack
    ON public.crm_message_log (tenant_id, acknowledged_at);

  -- 2) RPC: acknowledge_failed_messages
  CREATE OR REPLACE FUNCTION public.acknowledge_failed_messages(
    p_message_log_ids uuid[],
    p_reason          text DEFAULT NULL
  ) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
  AS $$
  DECLARE
    v_tenant_id  uuid;
    v_employee_id uuid;
    v_updated   int;
    v_skipped   int;
    v_cross     uuid[];
    v_errors    jsonb;
  BEGIN
    -- Extract JWT claims (canonical pattern, Iron Rule 15)
    v_tenant_id  := (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid;
    v_employee_id := NULLIF((((current_setting('request.jwt.claims', true))::json ->> 'employee_id')), '')::uuid;

    IF v_tenant_id IS NULL THEN
      RETURN jsonb_build_object('updated_count', 0, 'skipped_count', 0, 'errors',
        jsonb_build_array(jsonb_build_object('code', 'no_tenant_in_jwt')));
    END IF;

    -- Identify cross-tenant log_ids before touching anything
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
      INTO v_cross
      FROM public.crm_message_log
      WHERE id = ANY (p_message_log_ids)
        AND tenant_id <> v_tenant_id;

    -- UPDATE only rows that:
    --   (a) belong to caller's tenant,
    --   (b) are still unacknowledged (idempotent),
    --   (c) are in the caller-supplied list.
    WITH upd AS (
      UPDATE public.crm_message_log
         SET acknowledged_at     = now(),
             acknowledged_by     = v_employee_id,
             acknowledged_reason = p_reason
       WHERE tenant_id = v_tenant_id
         AND id = ANY (p_message_log_ids)
         AND acknowledged_at IS NULL
       RETURNING id
    )
    SELECT COUNT(*) INTO v_updated FROM upd;

    -- Skipped = (caller-supplied count) − (updated) − (cross-tenant)
    v_skipped := GREATEST(0, COALESCE(array_length(p_message_log_ids, 1), 0) - v_updated - COALESCE(array_length(v_cross, 1), 0));

    -- Build errors array for cross-tenant rejections
    SELECT COALESCE(jsonb_agg(jsonb_build_object('log_id', x, 'code', 'cross_tenant')), '[]'::jsonb)
      INTO v_errors
      FROM unnest(v_cross) AS x;

    RETURN jsonb_build_object(
      'updated_count', v_updated,
      'skipped_count', v_skipped,
      'errors', v_errors
    );
  END;
  $$;

  -- 3) Permission key (per-tenant), granted to all 5 default roles in each tenant
  INSERT INTO public.permissions (id, module, action, name_he, description, tenant_id)
  SELECT 'crm.message_log.acknowledge', 'crm', 'acknowledge',
         'סימון הודעות כושלות כמטופלות',
         'מאפשר לסמן הודעות כושלות בכרטיס הליד כמטופלות; הסימן ייעלם, ההודעה תישאר בהיסטוריה.',
         t.id
    FROM public.tenants t
    WHERE t.id IN ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', '8d8cfa7e-ef58-49af-9702-a862d459cccb')
    ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (role_id, permission_id, granted, tenant_id)
  SELECT r.id, 'crm.message_log.acknowledge', true, r.tenant_id
    FROM public.roles r
    WHERE r.tenant_id IN ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', '8d8cfa7e-ef58-49af-9702-a862d459cccb')
    ON CONFLICT DO NOTHING;
  ```

  Note: the migration uses `ON CONFLICT DO NOTHING` so re-running is a no-op if rows already exist (idempotent). PK on `permissions(id, tenant_id)` and on `role_permissions(role_id, permission_id, tenant_id)` is assumed (executor verifies via `pg_constraint` at session start; if missing PKs, fall back to explicit existence-check SELECTs).

- `modules/crm/crm-failed-messages-modal.js` — NEW file. ≤ 220 lines (target ≤ 200). Exposes `window.CrmFailedMessagesModal = { open, close }`. `open()` queries `crm_message_log` for unacknowledged failed-status rows in last 90d via DB.select (Iron Rule 7), groups by lead, renders modal with: paginated table (50/page), checkbox per row, "Select all visible" + "Select all from broadcast X" (where broadcast_id is non-null) helpers, "סמן כמטופלות" footer button gated on `hasPermission('crm.message_log.acknowledge')`. On submit: calls RPC via `sb.rpc('acknowledge_failed_messages', {...})`, then calls `CrmHelpers.logActivity('crm.message_log.acknowledge', 'crm_message_log', null, { count: <updated_count>, reason: <p_reason> })`, then calls `window.reloadCrmLeadsFailedCounts()` to refresh badges + chip.

### 8.2 Modified files

- `modules/crm/crm-leads-tab.js` — line range [52-59] `loadFailedCounts()` gains `WHERE acknowledged_at IS NULL` (or rather, an `.is('acknowledged_at', null)` rawFilter); lines [277, 196-200] add × icon HTML to badge + repurpose chip click to call `CrmFailedMessagesModal.open()`; lines [38, 145, 197-200] remove the `_failuresOnly` filter state + use site. **Net delta target: ≤ +15 lines** (file MUST stay ≤ 350 — `BASE_LINES_LEADS_TAB = 348` leaves ≤ 2-line headroom; executor must remove _failuresOnly to make room, or this is a stop-trigger per §4).
- `modules/crm/crm-leads-detail-messages.js` — line [29-31] extends SELECT to include `acknowledged_at, acknowledged_by, acknowledged_reason` + a join to `employees(name)` for the display label; line [renderFailedSection per row template] adds the "מטופל" tag rendering. Tag template (verbatim):

  ```html
  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 ms-2" title="{reason or ''}">
    <span aria-hidden="true">✓</span>
    מטופל · {formatted_timestamp} · {employee_name}
  </span>
  ```

  Net delta target: ≤ +30 lines.

- `crm.html` — add `<script src="modules/crm/crm-failed-messages-modal.js"></script>` after the existing `<script src="modules/crm/crm-leads-detail-messages.js">` tag in the CRM script bundle section. Net delta: +1 line.

- `modules/Module 4 - CRM/escalations/2026-05-14T22-35Z_brands_event_24_resend_decision.md` — append section `## Resolution — Option E (Acknowledge mechanism + 758 cleared)` with completion timestamp + pointer to this SPEC folder. Net delta: ~15 lines appended.

- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — add a one-block entry at the top noting "2026-05-15: M4_FAILED_MESSAGE_BADGE_CLEANUP closed via Full-Auto Pipeline. 758 historical failed-message rows acknowledged; new mechanism reusable for future noise."

- `modules/Module 4 - CRM/docs/CHANGELOG.md` — add row in the latest section for this SPEC's commits (executor lists hash + one-line description per commit).

- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — add row for the new `crm-failed-messages-modal.js`; update `crm-leads-tab.js` + `crm-leads-detail-messages.js` line-counts + tag with `[M4_FAILED_MESSAGE_BADGE_CLEANUP, 2026-05-15]`.

- `docs/GLOBAL_MAP.md` — add row for the new RPC `acknowledge_failed_messages` under the M4 RPC section.

- `docs/GLOBAL_SCHEMA.sql` — append `ALTER TABLE crm_message_log ADD COLUMN acknowledged_at ...` etc., the `CREATE INDEX`, the `CREATE FUNCTION`, and the `INSERT INTO permissions` rows.

- `modules/Module 4 - CRM/docs/db-schema.sql` — same merge as GLOBAL_SCHEMA but module-scoped.

### 8.3 Backup folder (mandatory per CLAUDE.md §9 #9)

`modules/Module 4 - CRM/backups/2026-05-15_M4_FAILED_MESSAGE_BADGE_CLEANUP/`

Contents (executor copies at session start, BEFORE editing):
- `CLAUDE.md`
- `crm.html`
- `modules/crm/crm-leads-tab.js`
- `modules/crm/crm-leads-detail-messages.js`
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`
- `modules/Module 4 - CRM/docs/MODULE_SPEC.md`
- `modules/Module 4 - CRM/docs/MODULE_MAP.md`
- `modules/Module 4 - CRM/ROADMAP.md` (if it exists at that path)
- `modules/Module 4 - CRM/docs/CHANGELOG.md`
- `modules/Module 4 - CRM/docs/db-schema.sql`
- `pre_migration_crm_message_log_tabledef.sql` — output of `pg_get_tabledef('public.crm_message_log')` (or `\d+ crm_message_log` equivalent)
- `pre_state_758_rows_recheck.json` — re-dump of the same query that built `BACKUP_758_ROWS.json` + md5 comparison report against the stored `content_md5` per row

### 8.4 DB state (expected post-SPEC)

- Table `crm_message_log` has 16 columns (was 13).
- Index `idx_crm_message_log_ack` exists on `(tenant_id, acknowledged_at)`.
- Function `public.acknowledge_failed_messages(uuid[], text)` exists.
- `permissions` has 2 rows where `id='crm.message_log.acknowledge'`.
- `role_permissions` has 10 rows where `permission_id='crm.message_log.acknowledge' AND granted=true`.
- Prizma `crm_message_log` rows: 758 have `acknowledged_at IS NOT NULL`, `acknowledged_by` = Daniel's `employees.id`, `acknowledged_reason='2026_05_13_unsubstituted_placeholder_followup_delivered'`.
- Demo `crm_message_log` has 0 rows with `acknowledged_at IS NOT NULL` (test seeds cleaned up).
- Activity log has 1 new row with `action='crm.message_log.acknowledge'` for Prizma (cleanup batch).

### 8.5 Docs updated (MUST include)

- `MASTER_ROADMAP.md` §3 — one-line entry under M4 maintenance: "2026-05-15: failed-message acknowledge mechanism shipped; 758-row historical noise cleared."
- `docs/GLOBAL_MAP.md` — new RPC.
- `docs/GLOBAL_SCHEMA.sql` — new columns + index + RPC + permission inserts.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — see §8.2.
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — see §8.2.
- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — see §8.2.

---

## 9. Commit Plan

Recommended commit grouping (executor may split further if file-size pressure forces it, but should not consolidate further):

1. **Commit 1** — `chore(spec): seal M4_FAILED_MESSAGE_BADGE_CLEANUP SPEC + Brief`. Files: SPEC.md, ROLLBACK.md, `architecture-brief/M4_FAILED_MESSAGE_BADGE_CLEANUP_BRIEF.md`, `architecture-brief/M4_FAILED_MESSAGE_BADGE_CLEANUP_ACTIVATION_PROMPT.md`.
2. **Commit 2** — `feat(m4,db): add ack columns + RPC + permission key for crm_message_log`. Files: migration SQL, backup folder (full content). Applies migration via Supabase MCP `apply_migration`.
3. **Commit 3** — `feat(m4,ui): per-lead × + bulk chip-modal for failed-message ack`. Files: `crm-failed-messages-modal.js`, `crm-leads-tab.js`, `crm-leads-detail-messages.js`, `crm.html`.
4. **Commit 4** — `chore(m4,prod): apply ack mechanism to 758 historical Prizma failures`. NO CODE FILES — just an EXECUTION_REPORT update + activity_log proof. The RPC call itself is the "commit" content (logged in EXECUTION_REPORT §2.8).
5. **Commit 5** — `docs(m4): integration ceremony — GLOBAL_MAP + GLOBAL_SCHEMA + MODULE_MAP + SESSION_CONTEXT + CHANGELOG + MASTER_ROADMAP + escalation update`. Files: all docs.
6. **Commit 6** — `chore(spec): close M4_FAILED_MESSAGE_BADGE_CLEANUP retrospective`. Files: EXECUTION_REPORT.md, FINDINGS.md (executor) + later FOREMAN_REVIEW.md (Foreman) + TEST_REPORT.md (LH-Tester).

---

## 10. Dependencies / Preconditions

- `M4_TEMPLATE_VALIDATION_UNIFIED` is closed (verified 2026-05-14). Root-cause prevention is live.
- Local dev environment running ERP (`:3000`) + Storefront (`:4321`) per `scripts/start-local.ps1` for the LH-Tester step.
- Supabase MCP credentials in `$HOME/.optic-up/credentials.env` (for migration apply + RPC calls).
- Prizma employees table has a row for Daniel — RPC will use his `employee_id` claim from his JWT. If the historical cleanup is executed via service_role (no JWT), `v_employee_id` will be NULL and the rows will record `acknowledged_by=NULL` — acceptable for the historical batch (the action was system-initiated). The Reviewer should flag this in §3 Findings if it's not the desired record.

---

## 11. Lessons Already Incorporated

- **FROM `M4_TEMPLATE_VALIDATION_UNIFIED/FOREMAN_REVIEW.md` Author Proposal #1** → "ROLLBACK.md over `_down.sql` for purely-additive migrations declared `None.`" → **APPLIED** in §6 (rollback plan documented as ROLLBACK.md file written in the migration commit).
- **FROM `M4_TEMPLATE_VALIDATION_UNIFIED/FOREMAN_REVIEW.md` Author Proposal #2** → "Pre-list cleanup DELETE statements as a single block in §3" → **APPLIED** in §3.4 (single demo-cleanup block).
- **FROM `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` Author Proposal #2** → "Smoke pre/post in Pipeline mode: LH-Tester runs ONCE post-execution; 'pre' delegates to most recent green TEST_REPORT" → **APPLIED** in §3 criterion 15 + §4 Autonomy Envelope.
- **FROM `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA/FOREMAN_REVIEW.md` P-T1.1-1** → "Daniel-decision freeze checklist" → **APPLIED** in §0 (Daniel's decisions baked in by the Brief — NOT relitigated; this SPEC documents them as inputs, not as questions).
- **FROM `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA/FOREMAN_REVIEW.md` P-T1.1-2** → "When diagnostic confirms a hypothesis, also compute cohort overlap with target's current state" → **APPLIED** in §1.5.2 (verified the 758 backup is a strict subset of the 762 live failed rows; quantified the 4-row / 2-lead leftover).
- **FROM `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` Author Proposal #1** → "Function-signature change → DROP FUNCTION before CREATE OR REPLACE" → **NOT APPLICABLE** (this SPEC creates a NEW function; no signature change).
- **Iron Rule 22 (defense-in-depth on writes)** → applied in the RPC: even though tenant_id is enforced in the UPDATE's WHERE clause via JWT-claim, the `acknowledged_by` write is also tenant-scoped via the same WHERE → no cross-tenant leakage path.
- **Iron Rule 14 / 15 / 18 / 20 (SaaS canon)** → permission rows are per-tenant; RLS uses the canonical JWT-claim pattern; no UNIQUE constraint introduced (the new index is non-unique); SaaS litmus test passes (a third tenant onboarding will get the permission row + role grants automatically via the existing `clone-tenant.sql` if it follows the documented pattern — out of scope here, but the migration's tenant-list parameterization is the only thing that would need adjustment).

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria (1–19) pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0.
- [ ] `git status --short` returns empty for files this SPEC touched (pre-existing untracked paths from outside the SPEC's scope are LEFT untouched per the D1 leave-alone decision — those are NOT counted against this checklist item).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md (if any) + ROLLBACK.md written in the SPEC folder.
- [ ] MODULE_MAP / SESSION_CONTEXT / CHANGELOG / GLOBAL_MAP / GLOBAL_SCHEMA / MASTER_ROADMAP / Module 4 db-schema.sql / escalation file updated per §8.2 + §8.5.
- [ ] TEST_REPORT.md (written by LH-Tester) confirms 7/7 smoke PASS + manual UI walkthrough of both ack surfaces.
- [ ] Reviewer's report (written by opticup-reviewer) confirms 19 success criteria + RLS canon + Iron Rules + permission model.
- [ ] FOREMAN_REVIEW.md (written by Foreman after execution) confirms verdict 🟢 CLOSED or 🟡 CLOSED WITH FOLLOW-UPS, with 2 author + 2 executor improvement proposals.

---

## 13. Sample Verification Queries (for Reviewer convenience)

```sql
-- Confirm 3 columns exist
SELECT column_name, data_type, is_nullable FROM information_schema.columns
WHERE table_schema='public' AND table_name='crm_message_log'
  AND column_name LIKE 'acknowledged_%' ORDER BY column_name;

-- Confirm index exists
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename='crm_message_log' AND indexname='idx_crm_message_log_ack';

-- Confirm RPC body has search_path + canonical JWT-claim USING
SELECT pg_get_functiondef('public.acknowledge_failed_messages(uuid[], text)'::regprocedure);

-- Confirm permission rows
SELECT id, module, action, tenant_id FROM permissions WHERE id='crm.message_log.acknowledge';
SELECT COUNT(*) AS grants FROM role_permissions WHERE permission_id='crm.message_log.acknowledge' AND granted=true;

-- Confirm 758 Prizma rows acknowledged
SELECT COUNT(*) FROM crm_message_log WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND acknowledged_at IS NOT NULL AND acknowledged_reason LIKE '2026_05_13_unsubstituted_placeholder%';

-- Confirm chip count post-cleanup
SELECT COUNT(DISTINCT lead_id) FROM crm_message_log WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND status='failed' AND lead_id IS NOT NULL AND created_at >= now() - interval '90 days'
  AND acknowledged_at IS NULL;

-- Confirm activity log entry
SELECT created_at, details FROM activity_log WHERE action='crm.message_log.acknowledge'
  AND tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' ORDER BY created_at DESC LIMIT 5;

-- Confirm Daniel's event #24 untouched
SELECT event_number, status, updated_at FROM crm_events
  WHERE event_number=24 AND tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
```

End of SPEC.
