# SPEC — M4_DUAL_PATH_CLEAN_FIX_2026_05_19

**Authored by:** opticup-strategic (Foreman role).
**Date:** 2026-05-19.
**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_DUAL_PATH_CLEAN_FIX_2026_05_19_BRIEF.md`.
**Pipeline mode:** Full-Auto with mandatory Chrome MCP live verification at every closure step.
**Priority:** P0 — replaces the reverted SPEC 5; structural fix, not a patch.
**Tenants:** demo only. Prizma 100% read-only.

---

## 0. Strategic Intent

Close 4 systemic problems in one Pipeline:
1. Dual-path duplicate messages on event/lead/attendee status changes.
2. Latent feedback loop risk (rule post-action → status change → re-trigger same rule).
3. Same-second dual-INSERT race for SCE rows.
4. SPEC closure mode that shipped today's broken main (SQL-only "verification").

Plus a knowledge-transfer deliverable: Campaign Overseer must learn the M4 infrastructure contract so future template/rule edits don't introduce new framework gaps.

---

## 1. Pre-flight (executed 2026-05-19T08:42–08:43Z)

| Check | Result |
|---|---|
| develop HEAD | `6a1d1ec` (after M4_REPAIR_FINAL closure) |
| `cron.consume_status_change_events` | ✅ jobid=11, active=true (restored by morning's M4_REPAIR_FINAL) |
| Smoke 7/7 | ✅ PASS |
| Pipeline lock | ✅ claimed: `2026-05-19T08-43-07-444Z_M4_DUAL_PATH_CLEAN_FIX_2026_05_19_pid-54376-71aec71d.lock` |
| EF mode `dispatch_preview` exists | ✅ already shipped 2026-05-14 (M4_DRY_RUN_PREVIEW). Zero writes, returns recipient-grouped JSON. Reused as Brief's "rule_match_probe". |

---

## 2. Implementation — 4 layers + Knowledge Transfer

### Layer 1 — Single dispatch path (browser is UX-only)

**Browser code change (3 files):** before any status UPDATE, call `CrmAutomationClient.evaluate(triggerType, triggerData, { mode: 'dispatch_preview' })`. The probe returns recipient-grouped JSON without any writes. Then:

- **`recipients_by_lead.length === 0`** → silent commit. Browser does `UPDATE crm_*.status`, ActivityLog write, Toast "סטטוס עודכן". DB trigger fires SCE; cron consumer drains; no rule matches → no run, no dispatch.
- **`recipients_by_lead.length > 0`** → modal opens hydrated from the preview. User options:
  - **"אישור ושלח הודעות"** → `UPDATE crm_*.status` → DB trigger fires SCE → cron consumer drains → dispatches via queue. Single path. Modal closes.
  - **"אישור ללא הודעות"** → out of scope for this SPEC. Button hidden via new `hideCommitWithoutNotify` modal option for status-change callers. (Defer.)
  - **"ביטול"** → no UPDATE, no SCE, no dispatch. Modal closes.
- **`evaluate` error** → fallback to direct UPDATE without modal (safe-default; matches pre-SPEC-5 behavior when CrmConfirmSendV2 unavailable).

The 3 callsites:
- `modules/crm/crm-event-actions.js` — `changeEventStatus(eventId, newStatus)`
- `modules/crm/crm-lead-actions.js` — `changeLeadStatus(leadId, newStatus, oldStatus, opts)`
- `modules/crm/crm-attendee-move.js` — confirm callback for `move_attendee_between_events`

The DB-trigger → SCE → cron consumer is the ONLY path that writes to `crm_message_queue`. Browser never enqueues.

### Layer 2 — Idempotency at the SCE level (defense in depth)

Add to `crm_status_change_events`:
- Column `dispatch_lock_key text` populated by trigger as `encode(digest(entity_type || ':' || entity_id::text || ':' || coalesce(old_status, '∅') || ':' || new_status || ':' || date_trunc('second', occurred_at)::text, 'sha256'), 'hex')`.
- Column `skip_reason text NULL` — optional marker for rows deliberately consumed-on-insert (future use; not populated in this SPEC).
- `CREATE UNIQUE INDEX uq_sce_dispatch_lock ON crm_status_change_events (tenant_id, dispatch_lock_key)`.

Two SCEs from the same source within the same second collapse to one row at insert time. Belt-and-suspenders against any future dual-write that escapes Layer 1.

`ON CONFLICT DO NOTHING` added to the 3 trigger functions (`event_status_change_event_fn`, `lead_status_change_event_fn`, `attendee_status_change_event_fn`) so the second-of-two same-key inserts is a silent no-op, not a transaction rollback.

### Layer 3 — Loop guard (architectural)

Add column `crm_status_change_events.originated_by_rule_id uuid REFERENCES crm_automation_rules(id)`.

Populated by the 3 SCE-producer trigger functions reading `current_setting('m4.originated_by_rule_id', true)` (transaction-local Postgres session variable). The EF's `executePostActions()` (in `post-actions.ts`) sets this via `select set_config('m4.originated_by_rule_id', <rule_uuid>::text, true)` before each lead-status-update post-action.

Consumer (in `consumer.ts`) reads each SCE's `originated_by_rule_id` and passes it to `evaluate()` (in `engine.ts`) as part of `triggerData._origin_rule_id`. The engine filters out matching rule rows where `rule.id == triggerData._origin_rule_id` AND `(NOW() - sce.occurred_at) < INTERVAL '1 hour'`. Effect: a rule cannot re-fire on a SCE caused by its own post-action within 1 hour.

Cross-rule chains (rule A → status change → rule B fires) remain allowed — only A→A self-loops are blocked. The 1-hour window means a manual operator can re-test after waiting.

Documentation: new file `docs/CRM_RULE_CHAINING.md` explaining the column, the 1-hour window, and the test pattern.

### Layer 4 — Iron Rule 34 + enforcement

**Iron Rule 34** added to `CLAUDE.md`: any SPEC touching `.js`/`.html` files consumed by a browser MUST close with Chrome MCP evidence (screenshot + runtime trace + DB query). SQL-only is insufficient. Bypass requires Daniel's explicit in-chat go-ahead.

Enforcement:
- `scripts/checks/ui-spec-verification.mjs` — runs as part of `verify.mjs --staged`. Scans staged SPEC's `FOREMAN_REVIEW.md` (when present alongside any `modules/crm/**/*.js` change in the same SPEC's docs/specs folder). Requires text matching `Chrome MCP` AND (`screenshot` OR `screenshots`) AND (`window.__modalTrace` OR `console trace` OR `runtime trace`). Failure → exit 1, blocks commit.
- `docs/guardian/sentinel/mission-13-ui-spec-verification.md` — weekly audit doc (Sentinel writes to `docs/guardian/GUARDIAN_ALERTS.md` on miss).
- Tested with regression case: a fake SPEC closure without the required artifacts → script exits 1; with artifacts → exits 0.

### Layer 3-KT — Campaign Overseer knowledge transfer

**New file `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md`** (≥150 lines):
- Variable contract (all `%var_name%` placeholders the resolver knows; source column, formatting, channel applicability).
- Rule action contract (action_type values, action_config shapes, post_action_lead_status_update semantics with Layer 3 loop guard).
- Status change framework architecture diagram (click → status commit → DB trigger → SCE → cron consumer → AE → recipient resolution → template compose → queue → dispatch-queue → send-message → Make webhook).
- Authority boundary (what Campaign Overseer may edit vs what needs Architect SPEC).
- Live verification protocol (Iron Rule 33 demo-first reminder + Chrome MCP step).

**Update `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`** (if exists) or create it: "What Changed in M4 — Read Before Any Change" section pointing to the infrastructure contract.

**Iron Rule 35** added to `CLAUDE.md`: Campaign Overseer authority boundary. Template body wording, rule trigger conditions on existing trigger types, broadcast schedules, audience filter criteria are OK. New `%var_name%` placeholders, new trigger types, new action types, EF/DB-trigger/AE code changes require Architect SPEC. Bypass requires Daniel.

**`docs/guardian/sentinel/mission-14-campaign-overseer-authority.md`** — daily diff of `crm_message_templates`/`crm_automation_rules` against last commit; flag new `%var_name%` or new `action_type` values not in the documented contract.

---

## 3. Steps (chronological)

1. Pre-flight (done — §1).
2. Author this SPEC (done).
3. Write migration `m4_dual_path_clean_fix_2026_05_19.sql` covering Layer 2 + Layer 3 DDL (2 ADD COLUMN, 1 UNIQUE INDEX, 3 trigger-fn updates with `ON CONFLICT DO NOTHING` + `originated_by_rule_id` populate from session var).
4. Edit `supabase/functions/automation-engine/post-actions.ts` — wrap lead-status UPDATE with `set_config('m4.originated_by_rule_id', rule.id, true)` via RPC.
5. Edit `supabase/functions/automation-engine/consumer.ts` — pass `_origin_rule_id` from SCE into evaluate's triggerData.
6. Edit `supabase/functions/automation-engine/engine.ts` — filter rules by Layer 3 self-loop guard in the rule-matching loop.
7. Deploy `automation-engine` EF.
8. Edit `modules/crm/crm-confirm-send-v2.js` — add `hideCommitWithoutNotify` modal option.
9. Edit `modules/crm/crm-event-actions.js`, `modules/crm/crm-lead-actions.js`, `modules/crm/crm-attendee-move.js` — probe-first flow per Layer 1.
10. Author `docs/CRM_RULE_CHAINING.md` (~80-120 lines).
11. Add Iron Rules 34 + 35 to `CLAUDE.md` (§6 Hygiene Rules).
12. Author `scripts/checks/ui-spec-verification.mjs` + regression test.
13. Wire `ui-spec-verification.mjs` into `scripts/verify.mjs --staged`.
14. Author `docs/guardian/sentinel/mission-13-ui-spec-verification.md`.
15. Author `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` (≥150 lines).
16. Author `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`.
17. Author `docs/guardian/sentinel/mission-14-campaign-overseer-authority.md`.
18. Commit infrastructure (DDL + EF + JS + docs) in logical batches with §4-cleared destructive-ops gates.
19. Run live verification against all 23 criteria. Chrome MCP for Layer 1 (criteria 1-9); SQL for Layer 2 (10-11); synthetic for Layer 3 (12-13); file-existence + script-pass for Layers 4 + KT (14-20); smoke 7/7 (21); Iron Rules (22); evidence archived (23).
20. Write retro docs (EXECUTION_REPORT + FINDINGS + REVIEW + FOREMAN_REVIEW). FOREMAN_REVIEW.md MUST contain the Chrome MCP evidence references per Iron Rule 34 (this SPEC's own first test).
21. Push develop. DO NOT recommend merge to main — Architect verifies production himself per Daniel's instruction.

---

## 4. Destructive Operations

Declared (Iron Rule 32 — gate scans this section):

### Migration DDL
1. `ALTER TABLE crm_status_change_events ADD COLUMN dispatch_lock_key text` (Layer 2 — generated by trigger).
2. `ALTER TABLE crm_status_change_events ADD COLUMN skip_reason text` (Layer 2 — future-use marker, NULL in this SPEC).
3. `ALTER TABLE crm_status_change_events ADD COLUMN originated_by_rule_id uuid REFERENCES crm_automation_rules(id)` (Layer 3).
4. `CREATE UNIQUE INDEX uq_sce_dispatch_lock ON crm_status_change_events (tenant_id, dispatch_lock_key) WHERE dispatch_lock_key IS NOT NULL` (Layer 2).
5. `CREATE INDEX idx_sce_origin_rule ON crm_status_change_events (tenant_id, originated_by_rule_id, occurred_at DESC) WHERE originated_by_rule_id IS NOT NULL` (Layer 3).
6. `CREATE OR REPLACE FUNCTION event_status_change_event_fn()` — adds dispatch_lock_key + originated_by_rule_id + ON CONFLICT DO NOTHING.
7. `CREATE OR REPLACE FUNCTION lead_status_change_event_fn()` — same.
8. `CREATE OR REPLACE FUNCTION attendee_status_change_event_fn()` — same.

### Code/files
9. Edit `supabase/functions/automation-engine/post-actions.ts` — Layer 3 origin-rule session var.
10. Edit `supabase/functions/automation-engine/consumer.ts` — pass origin_rule_id into evaluate's triggerData.
11. Edit `supabase/functions/automation-engine/engine.ts` — Layer 3 self-loop rule filter.
12. Deploy edge function `automation-engine` (version bump).
13. Edit `modules/crm/crm-confirm-send-v2.js` — hideCommitWithoutNotify option.
14. Edit `modules/crm/crm-event-actions.js` — Layer 1 probe-first flow.
15. Edit `modules/crm/crm-lead-actions.js` — Layer 1 probe-first flow.
16. Edit `modules/crm/crm-attendee-move.js` — Layer 1 probe-first flow.
17. Edit `CLAUDE.md` — add Iron Rules 34 + 35.
18. New `docs/CRM_RULE_CHAINING.md`.
19. New `scripts/checks/ui-spec-verification.mjs`.
20. Edit `scripts/verify.mjs` — wire ui-spec-verification into `--staged`.
21. New `docs/guardian/sentinel/mission-13-ui-spec-verification.md`.
22. New `docs/guardian/sentinel/mission-14-campaign-overseer-authority.md`.
23. New `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md`.
24. New `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` (if not already present).

### One-time SQL / state
25. Possibly: `UPDATE crm_status_change_events SET consumed_at = NOW() WHERE consumed_at IS NULL AND tenant_id = '8d8cfa7e-...'` to clear demo backlog before verification (test data only — preserves audit log).
26. Demo toggles on event #28 + lead 01269ab9 for live verification (data-state changes via standard UI flow).

NO writes to Prizma row data. NO direct edits to Prizma config rows.

---

## 5. Verification Plan (Brief §4 — 23 criteria)

### Layer 1 (Chrome MCP — modal flow)
1. Toggle event #28 `planning → registration_open` on demo, single toggle, 5-min quiet pre-window.
2. Modal opens with title "אישור פעולה" (screenshot).
3. Modal shows recipient list ≥1 (screenshot).
4. User clicks "אישור ושלח הודעות" (screenshot).
5. Within 90s: exactly 1 run in `crm_automation_runs` + exactly 2 rows in `crm_message_log` status='sent' (1 SMS + 1 Email).
6. ZERO additional runs in next 5 minutes.

### Layer 1 negative
7. Toggle planning→planning (no change) — modal does NOT open, no UPDATE (vacuous; the value comparison rejects).
8. Toggle a status with no matching rule (e.g., reg_open→planning) — modal does NOT open, status commits silently.
9. Open modal, click "ביטול" — status NOT committed (event stays planning), no SCE, no dispatch.

### Layer 2 (SQL)
10. `SELECT dispatch_lock_key FROM crm_status_change_events ORDER BY occurred_at DESC LIMIT 5` — column populated as 64-char hex.
11. Synthetic dual-insert test (DBeaver/SQL): try to INSERT two SCEs with same key within 1 sec → second errors with `duplicate key value violates unique constraint "uq_sce_dispatch_lock"`. OR with ON CONFLICT DO NOTHING in trigger: second insert silently no-ops, only 1 row visible. Pick the design; document.

### Layer 3 (synthetic + SQL)
12. Synthetic test: pick a rule with `post_action_lead_status_update`, trigger it once on demo. After 5 min, query `SELECT count(*) FROM crm_automation_runs WHERE trigger_data->>'_origin_rule_id' = <rule_uuid>` — must be 0 (the SCE produced by post-action did NOT fire the rule again).
13. `SELECT originated_by_rule_id FROM crm_status_change_events WHERE entity_type='lead' AND occurred_at > NOW() - INTERVAL '10 minutes'` — populated when the SCE was caused by a post-action.

### Layer 4 (file existence + script pass)
14. `grep "Iron Rule 34" CLAUDE.md` returns lines.
15. `node scripts/checks/ui-spec-verification.mjs --test` exits 0 (regression test passes).
16. `ls docs/guardian/sentinel/mission-13-ui-spec-verification.md` exists.

### Layer 3-KT (file existence + content review)
17. `wc -l roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` shows ≥150 lines.
18. `grep "M4_INFRASTRUCTURE_CONTRACT" roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` returns line.
19. `grep "Iron Rule 35" CLAUDE.md` returns lines.
20. `ls docs/guardian/sentinel/mission-14-campaign-overseer-authority.md` exists.

### Always-on
21. `node tests/smoke/baseline.test.mjs` → 7/7 PASS.
22. All commits cleared by pre-commit Iron Rules 12 / 21 / 23 / 31 / 32.
23. All Layer 1 Chrome MCP screenshots + DB-query JSON + console traces archived in `_archive/m4-dual-path-clean-fix-2026-05-19/verification/`.

---

## 6. Rollback

If any verification phase fails after 3 attempts:
- Migration rollback: `DROP INDEX uq_sce_dispatch_lock; ALTER TABLE crm_status_change_events DROP COLUMN dispatch_lock_key, DROP COLUMN skip_reason, DROP COLUMN originated_by_rule_id;` — and restore the 3 trigger functions to the 2026-05-14 versions (recoverable from migration `20260514183000_m4_status_trigger_framework_extension.sql`).
- EF rollback: `git revert` the EF commit on develop + redeploy previous version.
- JS rollback: `git revert` the JS commits.
- Iron Rule rollback: `git revert` the CLAUDE.md commit.

Rollback tag at SPEC start: `pre-m4-dual-path-clean-fix-2026-05-19` (commit `6a1d1ec`).

---

## 7. Out of Scope (deferred)

- "אישור ללא הודעות" button functionality — preserved button as hidden via `hideCommitWithoutNotify` modal option for status-change callers; full re-implementation deferred.
- `M4_AUTOMATION_RUNS_METRIC_AUDIT` — `sent_count` undercount carry-over (QA Priority 5).
- Smoke-test addition for the new probe-first flow — manual Chrome MCP verification is sufficient for this SPEC; automated regression deferred.
- main branch handling — out of scope per Daniel; Architect verifies prod himself.

---

*End of SPEC. Execution proceeds in this same Pipeline run; opticup-executor takes over for §3 steps 3 onward.*
