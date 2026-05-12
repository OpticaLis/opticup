# SPEC — STATUS_CHANGE_TRIGGERS_FRAMEWORK

> **Location:** `modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Module 4)
> **Authored on:** 2026-05-12
> **Module:** 4 — CRM
> **Phase:** Post-cutover backlog → EV-001 close
> **Author signature:** Module Strategist chat 2026-05-12
> **Source brief:** `modules/Module 4 - CRM/architecture-brief/STATUS_CHANGE_TRIGGERS_FRAMEWORK_BRIEF.md` (Architect, v1, 2026-05-12)

> **Heading convention:** plain `## N. Title`. No `§` prefix (Iron-Rule-32 hook's regex rejects it).

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-12.
- Target files exist at the claimed paths; line counts confirmed (see Baselines).
- Live DB inspected via Supabase MCP on 2026-05-12:
  - `crm_event_attendees.status` is `text NOT NULL DEFAULT 'registered'` — present, defaultable, suitable for a transition trigger.
  - `crm_message_queue` has `scheduled_at timestamptz NOT NULL DEFAULT now()`, `channel text NOT NULL`, `lead_id uuid NOT NULL`, `status text NOT NULL DEFAULT 'queued'` — already shaped for the multi-channel-parallel fix (no schema change needed for §3 criterion 15).
  - No existing DB trigger on `crm_event_attendees` — only `crm_leads_cascade_attendee_soft_delete_trg` (on `crm_leads`) and `trg_promote_lead_on_message_sent` (on `crm_message_queue`).
  - Existing attendee-bearing rules audited live: **11 rows total** across both tenants. **Only 2 rules are silently broken** (1 demo `b2a21d96-b7bd-43c4-a02b-496dab6ec74e` + 1 Prizma `a9483a90-48b1-40ff-a6b2-cee157d72485`, both named "צ'ק אין לאירוע", both `trigger_event='created' + status_equals='attended'`). The 6 `status_equals='registered'`/`'waiting_list'` rules are CORRECT as-is (those statuses are the row default — they DO fire at creation today); they stay on `attendee:created`. The 4 `trigger_event='moved'` rules use the existing `attendee_moved` trigger type and are out of scope.
- **Cross-Reference Check completed 2026-05-12 against `docs/GLOBAL_SCHEMA.sql` + `docs/GLOBAL_MAP.md` + `docs/DB_TABLES_REFERENCE.md` + `docs/FILE_STRUCTURE.md` + every `modules/*/docs/db-schema.sql`: 0 collisions / 0 hits for `crm_status_change_events`, `crm_trigger_type_registry`, `attendee_status_change`, `status_changed_from`, `status_changed_to`, `consume_status_events`, `trg_attendee_status_change_event`.**
- Lessons applied from prior FOREMAN_REVIEW files in this module — see §11.
- Pre-existing untracked files surveyed: **47 items** present at SPEC authoring time (architecture-brief drafts, M3 storefront content, MIGRATION_* prompts). Executor leaves them alone. **Selective `git add` by filename throughout this SPEC** — never `git add -A`, never `git add .`.
- Color-form completeness check: N/A (no visual re-skin).

### Baselines (referenced symbolically in §3 Success Criteria)

| Symbol | File | Metric | Value (captured 2026-05-12) |
|---|---|---|---|
| `BASE_LINES_engine_ts` | `supabase/functions/automation-engine/engine.ts` | `wc -l` | 231 |
| `BASE_LINES_index_ts_ae` | `supabase/functions/automation-engine/index.ts` | `wc -l` | 105 |
| `BASE_LINES_recipients_ts` | `supabase/functions/automation-engine/recipients.ts` | `wc -l` | TBD by executor pre-flight |
| `BASE_LINES_dispatch_queue` | `supabase/functions/dispatch-queue/index.ts` | `wc -l` | 191 |
| `BASE_LINES_crm_engine_js` | `modules/crm/crm-automation-engine.js` | `wc -l` | 327 |
| `BASE_LINES_rule_editor` | `modules/crm/crm-rule-editor.js` | `wc -l` | 293 |
| `BASE_TRIGGER_TYPES_COUNT` | `engine.ts` TRIGGER_TYPES | entry count | 5 (`event_status_change`, `event_registration`, `lead_status_change`, `lead_intake`, `attendee_moved`) |
| `BASE_CONDITIONS_COUNT` | `engine.ts` CONDITIONS | evaluator count | 4 (`always`, `status_equals`, `count_threshold`, `source_equals`) |
| `BASE_BROKEN_RULES_COUNT` | live DB | rules with `trigger_entity='attendee' AND trigger_event='created' AND trigger_condition->>'status' NOT IN ('registered','waiting_list')` AND `is_active=true` | 2 (1 demo + 1 Prizma) |
| `BASE_PRIZMA_NONTARGET_RULE_HASH` | live DB | aggregate `md5(string_agg(action_config::text, ',' ORDER BY id))` of Prizma's 10 non-target rules | captured by Executor in Pre-Flight (DIAGNOSIS-style snapshot in EXECUTION_REPORT.md §2) |
| `BASE_DEMO_TENANT_ID` | `tenants` | id where `slug='demo'` | `8d8cfa7e-ef58-49af-9702-a862d459cccb` |
| `BASE_PRIZMA_TENANT_ID` | `tenants` | id where `slug='prizma'` (verify exact slug at pre-flight) | `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` (per `M4_AUTOMATION_ENGINE_SERVER_SIDE` SPEC) |
| `BASE_TARGET_RULE_DEMO_ID` | `crm_automation_rules.id` | demo check-in rule | `b2a21d96-b7bd-43c4-a02b-496dab6ec74e` |
| `BASE_TARGET_RULE_PRIZMA_ID` | `crm_automation_rules.id` | Prizma check-in rule | `a9483a90-48b1-40ff-a6b2-cee157d72485` |
| `START_COMMIT` | git | HEAD at SPEC start | `b2fb0c0283404e99654d09c918233a26a5b65296` |

---

## 1. Goal

Ship a generic status-change triggers framework: every entity table with a `status` column can opt into automations by adding a one-line DB trigger that inserts an event into a central queue (`crm_status_change_events`). The automation-engine consumes the queue every minute and evaluates `<entity>_status_change` rules from a registry-driven mapping table (`crm_trigger_type_registry`). Wire **attendee** as the first consumer of the framework (closing the EV-001 silent breakage that's been live since 2026-04). Ship multi-channel parallel dispatch alongside: when a template has both SMS + Email and the lead has both, the two rows enqueued in a single transaction with identical `scheduled_at` are dispatched **in parallel** within the queue drain (Promise.allSettled), eliminating the customer-facing "two pings ~1s apart" UX issue.

---

## 2. Background & Motivation

**EV-001** (`roles/campaign-overseer/OPEN_EVENTS_TICKETS.md`) was opened 2026-05-12. The current `TRIGGER_TYPES` whitelist in `automation-engine` and its browser mirror has 5 entries; **`attendee_status_change` is missing**. The board-led rule editor (`crm-rule-editor.js`, CRM_UX_REDESIGN_AUTOMATION, 2026-05) maps the "✅ נרשמים לאירוע" board to `attendee:created`, but lets staff save a rule with `trigger_condition.status='attended'` — and the engine never fires it because a new attendee row is created with the default status `'registered'`, not `'attended'`. The 2 production rules currently shaped this way (`צ'ק אין לאירוע` on demo + Prizma, both `is_active=true`, both `template_slug='check_in_event'`/`'check_in_attendee'`) are silently inert.

The Architect locked the pattern in Brief §4 (decisions 1–7):
- Build as **generic framework**, not a one-off attendee fix (Daniel directive 2026-05-12: "חייב להיות פתרון קבוע כי יש עוד אוטומציות בעתיד").
- Each module owns its **DB-trigger** call site (not a code-level `AutomationClient.evaluate()` — that pattern's 3 weaknesses are forgotten call sites, no retry on M4-EF unavailability, no audit replay).
- DB triggers write to a central queue table (`crm_status_change_events`); `automation-engine` reads from there. Decouples write from automation.
- Multi-channel SMS+Email **in parallel**, not sequential. UX: today customers see two pings seconds apart.
- If recipient missing one channel → dispatch the other silently (matches today's behavior).
- Build attendee only this round; framework-ready for sale/payment/inventory but NOT wired (M7/M8/M9 don't exist yet — YAGNI).

The 5th decision needed Strategist-Daniel resolution per Brief §7 Q1. Resolved 2026-05-12: **`crm_status_change_events` kept as audit log forever** (`consumed_at` flag distinguishes pending vs processed; debug value of "why didn't this automation fire?" outweighs the ~15K rows/yr/tenant storage cost; cleanup deferred to a future TTL SPEC if needed).

Brief §7 Q2/Q3/Q4 resolved by Module Strategist using Architect-recommended defaults — no Daniel escalation needed (see §11 below for each).

---

## 3. Success Criteria (Measurable)

Every criterion has an EXACT expected value. Mismatch = stop-on-deviation.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at SPEC close | On `develop`, clean tree | `git status --porcelain` → empty |
| 2 | Commits produced | 6 ± 1 (incl SPEC closure commit) | `git log $START_COMMIT..HEAD --oneline \| wc -l` |
| 3 | Table `crm_status_change_events` created | Columns: `id uuid PK`, `tenant_id uuid NOT NULL REFERENCES tenants(id)`, `entity_type text NOT NULL`, `entity_id uuid NOT NULL`, `old_status text` (nullable), `new_status text NOT NULL`, `occurred_at timestamptz NOT NULL DEFAULT now()`, `payload jsonb NOT NULL DEFAULT '{}'`, `consumed_at timestamptz` (nullable). RLS ENABLED with **2 canonical policies**: `service_bypass` to `service_role`, `tenant_isolation` to `public` using exact JWT-claim USING clause from Iron Rule 15. | Supabase MCP `list_tables verbose=true`; `SELECT polname, polqual FROM pg_policy WHERE polrelid='crm_status_change_events'::regclass` |
| 4 | Table `crm_trigger_type_registry` created | Columns: `id uuid PK`, `tenant_id uuid NOT NULL REFERENCES tenants(id)`, `entity_type text NOT NULL`, `trigger_type_slug text NOT NULL`, `display_name_he text NOT NULL`, `display_icon text NOT NULL DEFAULT '✅'`, `allowed_condition_types text[] NOT NULL DEFAULT ARRAY['status_equals','status_changed_from','status_changed_to']::text[]`, `is_active boolean NOT NULL DEFAULT true`, `notes text`, `created_at timestamptz NOT NULL DEFAULT now()`. UNIQUE constraint on `(tenant_id, entity_type)` (Iron Rule 18 — tenant-scoped). RLS ENABLED with same 2 canonical policies as criterion 3. | Supabase MCP `list_tables verbose=true` |
| 5 | Registry seeded for both tenants | exactly 2 rows: 1 for demo, 1 for Prizma. Both: `entity_type='attendee'`, `trigger_type_slug='attendee_status_change'`, `display_name_he='הרשמה לאירוע (שינוי סטטוס)'`, `display_icon='✅'`, `is_active=true` | `SELECT count(*) FROM crm_trigger_type_registry WHERE entity_type='attendee'` → 2 |
| 6 | Indexes created | `idx_crm_status_change_events_unprocessed (tenant_id, occurred_at) WHERE consumed_at IS NULL` AND `idx_crm_status_change_events_audit (tenant_id, entity_type, entity_id, occurred_at DESC)` | `SELECT indexname FROM pg_indexes WHERE tablename='crm_status_change_events'` |
| 7 | DB trigger `trg_attendee_status_change_event` | exists on `crm_event_attendees`, `AFTER UPDATE OF status`, fires ONLY when `OLD.status IS DISTINCT FROM NEW.status` (NULL-safe comparison); function name `attendee_status_change_event_fn`; inserts row with `entity_type='attendee'`, `entity_id=NEW.id`, `tenant_id=NEW.tenant_id`, `old_status=OLD.status`, `new_status=NEW.status`, `payload=jsonb_build_object('event_id', NEW.event_id, 'lead_id', NEW.lead_id)` | `SELECT trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table='crm_event_attendees' AND trigger_name='trg_attendee_status_change_event'` |
| 8 | `TRIGGER_TYPES` in `engine.ts` extended | 6 entries (was `BASE_TRIGGER_TYPES_COUNT=5`); new entry `attendee_status_change: { entity: 'attendee', event: 'status_change' }`; same 6 entries mirrored in browser file (`modules/crm/crm-automation-engine.js`) | `grep -c "^  [a-z_]*: { entity" supabase/functions/automation-engine/engine.ts` → 6; same in `crm-automation-engine.js` |
| 9 | `CONDITIONS` in `engine.ts` extended | 6 evaluators (was `BASE_CONDITIONS_COUNT=4`); new: `status_changed_from` (compares `data.oldStatus === cond.status`) and `status_changed_to` (compares `data.newStatus === cond.status`); same 6 in browser mirror | grep |
| 10 | `VALID_TRIGGER_TYPES` in `automation-engine/index.ts` extended | Includes `attendee_status_change` | grep |
| 11 | New EF mode `consume_status_events` | `automation-engine` POST accepts `body.mode='consume_status_events'` + `body.tenant_id`; returns JSON shape `{ ok: true, processed: <int>, evaluated: <int>, errors: <int> }`. Implementation: SELECT N (default 100, capped 500) unconsumed rows for the tenant ordered by `occurred_at ASC LIMIT N`; for each row, derive `trigger_type` by looking up `crm_trigger_type_registry` by `entity_type`; if attendee, fetch the parent attendee + lead to build `triggerData` with `{ attendeeId, leadId, eventId, oldStatus, newStatus }`; call existing `evaluate(db, {...})` in `dispatch` mode; mark row `consumed_at=now()`. Errors on a single row → log + leave `consumed_at IS NULL` (retried next tick). | `get_edge_function`; POST test returns shape |
| 12 | pg_cron job `consume_status_change_events` | scheduled every minute (`* * * * *`); iterates `SELECT id FROM tenants WHERE is_active=true` and POSTs to the EF per-tenant with EXCEPTION isolation (mirrors `daily-alert-generation` exactly) | `SELECT jobname, schedule, command FROM cron.job WHERE jobname='consume_status_change_events'` |
| 13 | `dispatch-queue/index.ts` parallel-by-group refactor | Claimed rows grouped by composite key `(lead_id, scheduled_at_iso_string)`. Each group dispatched via `Promise.allSettled` with a parallel-fan-out cap of **5** rows per group. `sleep()` called ONCE per group, AFTER all parallel dispatches resolve, with duration = max(1000ms if any row has channel='sms', else 500ms). No `sleep()` between rows inside a group. | grep + diff vs `BASE_LINES_dispatch_queue` |
| 14 | Browser engine mirrors EF | `modules/crm/crm-automation-engine.js` TRIGGER_TYPES = 6 entries, CONDITIONS = 6 evaluators. `window.CRM_AUTOMATION_TRIGGER_TYPES` + `window.CRM_AUTOMATION_CONDITIONS` re-exposed with the new entries. | grep |
| 15 | Rule-editor UI extension on attendees board | `modules/crm/crm-rule-editor.js` — `BOARDS` table augmented (either: new `attendees_status` entry with `{ entity: 'attendee', event: 'status_change' }`, OR existing `attendees` entry made variant-aware via a `firesOn` sub-state). State object gains `firesOn` field. New `COND_BY_BOARD` entries for status_changed_from/to. When `firesOn='status_change'`, the editor lets the user pick condition type (status_equals / status_changed_from / status_changed_to) and the matching status value from `STATUSES_BY_BOARD.attendees`. `_buildSaveData` produces `trigger_entity='attendee'`, `trigger_event='status_change'` for status_change selection. `crm-rule-editor.js` final line count ≤ 350 (Iron Rule 12). | grep + `wc -l` |
| 16 | 2 production rules migrated | `BASE_TARGET_RULE_DEMO_ID` and `BASE_TARGET_RULE_PRIZMA_ID`: `trigger_event` updated `'created'` → `'status_change'`. `trigger_entity`, `trigger_condition`, `action_config`, `is_active` UNCHANGED on both. Literal pre/post JSON of both rules captured in `EXECUTION_REPORT.md §2` (per `DEMO_PARITY_REPLICATION` Author Proposal #2 — content snapshots, not just hashes). | live DB SELECT |
| 17 | Prizma collateral untouched | Aggregate `md5(string_agg(...))` of Prizma's 10 non-target attendee+lead+event rules unchanged pre/post (captured at Pre-Flight in `BASE_PRIZMA_NONTARGET_RULE_HASH`, re-derived post-migration, must equal). | Supabase MCP execute_sql |
| 18 | E2E demo smoke — framework end-to-end | (a) Verify there's a `crm_message_templates` row for `check_in_event_sms_he` on demo OR Daniel pre-seeds it. If absent → Executor INSERTs a minimal placeholder template (body = `הגעת לאירוע %event_name%, להתראות 👋`) on demo only — Daniel can refine after. (b) Manually UPDATE one demo attendee `status` from `'registered'` to `'attended'` (use a Daniel-allowlisted phone — `0537889878` or `0503348349`). (c) Within 2 minutes (2 cron ticks): `crm_status_change_events` has 1 new row for that entity_id with `consumed_at IS NOT NULL`; `crm_message_queue` has 1 new row with `template_slug='check_in_event'`, `lead_id=<the attendee's lead>`, `status IN ('queued','sent')`. | Live DB SELECT chain, timestamps in TEST_REPORT.md |
| 19 | Multi-channel parallel dispatch proof | A second demo attendee transition (lead must have BOTH phone AND email) triggers a multi-channel rule (Executor temporarily duplicates the check-in rule with `channels: ['sms','email']` on demo for the test, then rolls back). Verify the 2 resulting `crm_message_queue` rows have `processed_at` deltas ≤ 200ms (was ~1000ms pre-fix). | `SELECT id, channel, scheduled_at, processed_at FROM crm_message_queue WHERE lead_id=<test> ORDER BY processed_at` — the delta proves parallel dispatch |
| 20 | Affected EF files ≤ 350 lines (Iron Rule 12) | each modified `.ts` and `.js` file `wc -l` ≤ 350 | `wc -l` per file post-write |
| 21 | EF deploy successful | `automation-engine` redeployed; `dispatch-queue` redeployed. If Supabase MCP `deploy_edge_function` returns `InternalServerErrorException` (known OPEN-021 pattern observed in `M4_HARDCODED_PRIZMA_REMOVAL`, `M4_UNSUB_SUPPRESSION_CRIT`, `M4_PUBLIC_FORM_VARIABLES_HIGH`) — Executor STOPS at criterion 21, writes a `DEPLOY_FALLBACK_NEEDED.md` in the SPEC folder summarizing what needs `supabase functions deploy` from Daniel's CLI, then waits. Daniel deploys via CLI from his Windows machine and confirms; Executor resumes from criterion 18. | `get_edge_function` returns new version OR `DEPLOY_FALLBACK_NEEDED.md` exists |
| 22 | EV-001 closure | `roles/campaign-overseer/OPEN_EVENTS_TICKETS.md` EV-001 section flipped from 🟡 HANDED-OFF to ✅ CLOSED with date 2026-05-12 and SPEC commit hash link | grep |
| 23 | SESSION_CONTEXT.md + CHANGELOG.md updated | one entry each at the top of each file with one-line summary | grep "STATUS_CHANGE_TRIGGERS_FRAMEWORK" |
| 24 | Integrity Gate (Iron Rule 31) | `npm run verify:integrity; echo $?` → `0` or `2`; NEVER `1` | terminal exit code |
| 25 | Smoke 7/7 PASS on localhost (Localhost-Tester deliverable) | `tests/smoke/baseline.test.mjs` reports 7/7 PASS against demo (PIN auth, CRM lead create+RLS, inventory read, storefront pages, no 5xx). The framework changes must not regress existing flows. | `node tests/smoke/baseline.test.mjs` exit 0 |

---

## 3a. Shared Edit Block

Not applicable — every edit in this SPEC is file-specific. No byte-identical multi-file block.

---

## 4. Autonomy Envelope

### What the Executor CAN do without asking
- Read any file in the repo + run any read-only SQL (Level 1 autonomy).
- Apply the single atomic SQL migration in commit 1 via Supabase MCP `apply_migration` (Level 2 autonomy — explicitly authorized by this SPEC because Brief §4 locked the DDL design).
- Create / edit / move the files listed in §8 Expected Final State (NO others).
- Run `supabase functions deploy` via Supabase MCP `deploy_edge_function`. **If MCP returns `InternalServerErrorException` (OPEN-021 pattern), STOP per criterion 21 and write `DEPLOY_FALLBACK_NEEDED.md`** — Daniel deploys from CLI and the Executor resumes. Do NOT attempt a second MCP call; do NOT silently absorb the failure.
- Commit and push to `develop` with explicit `git add <file>` (never wildcards).
- Apply any executor-improvement proposal from a recent FOREMAN_REVIEW if directly applicable.
- Run the smoke tests + verify scripts; produce TEST_REPORT.md.
- INSERT a minimal `check_in_event_sms_he` template on demo only (criterion 18a) if it's absent — this is a one-row config seed, not a structural DML.

### What REQUIRES stopping and reporting
- Any change to files NOT in §8.
- Any DB write OTHER than the 2 declared UPDATEs + atomic migration + criterion 18a seed + criterion 19 test rule (which the Executor MUST roll back to leave the rule set clean post-test).
- Any merge to `main`. Daniel-only per CLAUDE.md §9 #7.
- Pre-commit hook failure that cannot be diagnosed and corrected by re-running with the offending change reverted.
- Any output divergence from §3.

---

## 5. Stop-on-Deviation Triggers (beyond CLAUDE.md §9 globals)

1. Column / constraint / RLS-policy mismatch between the migration SQL and §3 criterion 3 or 4 → STOP.
2. Registry seed produces ≠ 2 rows post-migration → STOP.
3. The new pg_cron `consume_status_change_events` job fails ≥ 3 consecutive runs within the 5-minute window after creation (verified via `SELECT status, return_message FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5`) → STOP. Rollback path: `SELECT cron.unschedule('consume_status_change_events')`.
4. Criterion 18 demo smoke does NOT produce a `crm_message_queue` row within 2 minutes (= 2 cron ticks) of the attendee UPDATE → STOP (root-cause: DB trigger silent, consumer EF errored, or rule migration didn't take effect).
5. Criterion 17 Prizma collateral md5 changes during the SPEC's run → STOP (this is the canary that the UPDATE statement was too broad).
6. `crm-rule-editor.js` exceeds 350 lines after the UI extension → STOP. Executor MAY pre-split into a sibling file (e.g. `crm-rule-editor-attendees-status.js`) only if it declares the new file in EXECUTION_REPORT.md §3 deviations BEFORE writing it.
7. Integrity gate fires ERROR (exit 1) — null bytes detected — STOP.
8. The check-in template seed in criterion 18a accidentally writes to Prizma instead of demo → STOP. The SPEC's check-in seed touches demo ONLY; if any Prizma row count changes during criterion 18a, that's a stop-trigger.

---

## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:

1. `git reset --hard pre-status-change-framework-2026-05-12` (tag created in commit 1's pre-write).
2. `git push origin develop --force-with-lease` ONLY if the SPEC's commits already pushed; **never** to `main`.
3. `SELECT cron.unschedule('consume_status_change_events')` if the job was scheduled.
4. The 2 UPDATEd rules: restore via `ROLLBACK_SQL.md` (literal pre-state JSON snapshots captured in EXECUTION_REPORT.md §2 per criterion 16). Two `UPDATE crm_automation_rules SET trigger_event='created', action_config=<original jsonb> WHERE id=<target>` statements.
5. New tables can remain (no production code references them once Executor's EF changes are reverted by the git reset). OR drop via `DROP TABLE crm_status_change_events CASCADE; DROP TABLE crm_trigger_type_registry CASCADE; DROP FUNCTION attendee_status_change_event_fn() CASCADE;` — Executor's call, but document the chosen path in EXECUTION_REPORT.md.
6. Criterion 18a seed template: leave in place (it's a benign config row Daniel can use later) UNLESS rollback explicitly demanded — then `DELETE FROM crm_message_templates WHERE tenant_id=<demo> AND slug='check_in_event_sms_he'` IFF the row was authored by this SPEC.
7. Notify Foreman; SPEC marked REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit — anti-creep)

- Wiring `sale_status_change` / `payment_status_change` / `inventory_status_change` to actual call-sites. M7/M8/M9 don't exist yet; framework MUST support them, this SPEC does not WIRE them.
- A new rule-editor UI for arbitrary entities (sale, payment, inventory). Attendees board only this round.
- Retroactive backfill of past missed automations (the historical attendees whose status flipped to 'attended' before this SPEC landed will NOT receive a retroactive check-in SMS).
- Channel preference per-recipient (some customers might prefer email-only). Defer to a future M12 SPEC.
- WhatsApp parallel dispatch — channel exists in code but isn't in production rotation; defer.
- The 4 attendee rules with `trigger_event='moved'` (manual attendee-move flow) — they keep using the existing `attendee_moved` trigger type, no migration.
- The 6 attendee rules with `status_equals='registered'` or `status_equals='waiting_list'` — these CORRECTLY fire at attendee creation because those are the default-row statuses; do NOT migrate them.
- Composing the production SMS body for `check_in_event_sms_he` — Executor seeds a minimal placeholder only IF the template doesn't exist; Daniel edits the production wording after SPEC closes.
- Storefront repo changes. This SPEC is ERP-only (`opticalis/opticup`).
- Any addition to `js/shared.js` FIELD_MAP — `js/shared.js` is at 408 lines (M4-DEBT-P18-01 / M4-DEBT-01); the FIELD_MAP split SPEC is a separate prerequisite that has not been authored.
- Cleanup of demo's 1 inactive QA rule (`aeaa1679-b8a7-47c6-a3ce-d12297c44aaa`) — that's data-hygiene tech debt for `M4-DEMO-CRUFT-RULES`, not in scope here.

---

## 8. Expected Final State

### New files
- `supabase/migrations/<timestamp>_status_change_triggers_framework.sql` — single atomic migration (Iron Rule TD-2 — migrations committed to git, not MCP-applied-and-forgotten). Contains: 2 `CREATE TABLE`, 4 RLS policies (2 per table), 2 indexes on the events table + 1 UNIQUE constraint on the registry, 1 trigger function, 1 trigger, 2 registry seed rows (1 demo + 1 Prizma), 2 rule UPDATEs (the 2 silently-broken check-in rules). 1 `cron.schedule()` call for `consume_status_change_events` may live in this file OR a separate `<timestamp>_consume_status_change_events_cron.sql` (Executor's choice; cron is logically separate from DDL).
- `modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/SPEC.md` — this file.
- `modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/EXECUTION_REPORT.md` — Executor writes at close.
- `modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/FINDINGS.md` — Executor writes at close.
- `modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/ROLLBACK_SQL.md` — Executor writes during DB Pre-Flight, with literal pre-state JSON of the 2 target rules + `DROP` statements for the new tables.
- `modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/TEST_REPORT.md` — Localhost-Tester writes after smoke runs.
- `modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` — Foreman writes after retrospective phase.
- `modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/DEPLOY_FALLBACK_NEEDED.md` — IFF criterion 21's MCP deploy fails; Executor writes, Daniel resolves.

### Modified files (path + nature of change — keep edits surgical)
- `supabase/functions/automation-engine/engine.ts` — TRIGGER_TYPES adds `attendee_status_change`; CONDITIONS adds `status_changed_from` + `status_changed_to`; new exported async function `consumeStatusChangeEvents(db, tenantId, limit)`; final `wc -l ≤ 350`.
- `supabase/functions/automation-engine/index.ts` — `VALID_TRIGGER_TYPES` adds `attendee_status_change`; new branch for `body.mode === 'consume_status_events'` dispatching to the new engine function.
- `supabase/functions/automation-engine/recipients.ts` — `resolveRecipients` extended so the `trigger_lead` path can derive `lead_id` from `triggerData.attendeeId` when present (look up `crm_event_attendees.lead_id` via the service-role db client). This is the canonical "attendee carries its lead" lookup.
- `supabase/functions/dispatch-queue/index.ts` — claimed rows grouped by `(lead_id, scheduled_at)`; per-group `Promise.allSettled` with parallel cap 5; sleep after the group, not between rows.
- `modules/crm/crm-automation-engine.js` — mirror TRIGGER_TYPES (6 entries) + CONDITIONS (6 evaluators); update the explanatory header comment at the top.
- `modules/crm/crm-rule-editor.js` — `BOARDS` entry for `attendees` augmented (per §3 criterion 15); `_buildSaveData` switch on `firesOn`; new condition fields rendered when `firesOn='status_change'`. Final `wc -l ≤ 350`.
- `supabase/config.toml` — ensure `[functions.automation-engine]` block exists with `verify_jwt = true`; ensure `[functions.send-message]` block exists (Iron-Rule-cleanup carried from `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` §2 defect 5). NO-OP if both blocks already present.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — new top-of-file entry for this SPEC.
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — new entry.
- `roles/campaign-overseer/OPEN_EVENTS_TICKETS.md` — EV-001 marked ✅ CLOSED with commit hash.

### Deleted files
None.

### DB state post-SPEC
- `crm_status_change_events` table exists, 0 rows pre-smoke, ≥ 1 row after criterion 18.
- `crm_trigger_type_registry` table exists, exactly 2 rows for the attendee entity.
- `trg_attendee_status_change_event` trigger active on `crm_event_attendees`.
- `attendee_status_change_event_fn()` function exists (SECURITY DEFINER).
- pg_cron job `consume_status_change_events` SCHEDULED, runs every minute.
- 2 rule rows in `crm_automation_rules` have `trigger_event='status_change'` (BASE_TARGET_RULE_DEMO_ID + BASE_TARGET_RULE_PRIZMA_ID).
- Demo's other 9 attendee+lead+event rules unchanged (criterion 17).
- Prizma's 10 non-target rules unchanged (criterion 17 hash).
- Demo `crm_message_templates` has `check_in_event_sms_he` row (newly seeded by criterion 18a OR pre-existing); Prizma untouched.

### Docs updated
- `docs/GLOBAL_MAP.md` — Integration Ceremony append (executor adds the 2 new tables + the new EF mode under the M4 section). One commit at the end.
- `docs/GLOBAL_SCHEMA.sql` — Integration Ceremony append (DDL of new tables).
- `MASTER_ROADMAP.md` §3 — entry about EV-001 closure + framework readiness for M7/M8/M9.

---

## 9. Commit Plan

1. **`feat(m4-crm,sql): status-change framework — tables + RLS + trigger + registry seed + 2 rule migrations`** — single atomic SQL migration applied via Supabase MCP `apply_migration`. Files: `supabase/migrations/<timestamp>_status_change_triggers_framework.sql` (+ optional `<timestamp>_consume_status_change_events_cron.sql` if executor splits cron). Pre-write: annotated git tag `pre-status-change-framework-2026-05-12` on `$START_COMMIT`.
2. **`feat(m4-crm,ef): automation-engine consumes status_change_events queue`** — `engine.ts`, `index.ts`, `recipients.ts`. Adds the new mode, the new trigger type, the 2 new conditions, and the attendee-context resolver.
3. **`chore(m4-crm,cron): schedule consume_status_change_events every minute`** — if not bundled into commit 1's migration. Mirrors the `daily-alert-generation` per-tenant iteration pattern with EXCEPTION isolation.
4. **`fix(m4-crm,ef): dispatch-queue groups co-fire rows for parallel multi-channel`** — `dispatch-queue/index.ts`. (May be merged into commit 2 if Executor judges the diff small and clearly testable together; otherwise standalone.)
5. **`feat(m4-crm,ui): rule editor fires_on picker on attendees board + status_changed_from/to`** — `crm-automation-engine.js` (browser mirror) + `crm-rule-editor.js` (UI extension).
6. **`docs(m4-crm): close STATUS_CHANGE_TRIGGERS_FRAMEWORK SPEC + EV-001`** — SESSION_CONTEXT, CHANGELOG, OPEN_EVENTS_TICKETS, EXECUTION_REPORT.md, FINDINGS.md, ROLLBACK_SQL.md, TEST_REPORT.md (if Localhost-Tester ran during executor session). Integration Ceremony appends to `docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql` may live in this commit or a sibling cleanup commit.

Executor MAY combine commits 2+3 OR 4+2 OR 5+6 if cleanly testable together. NEVER split commit 1 — the SQL migration is atomic by design (registry, trigger, and rule migrations land together or none). Total commits expected: 5–6 (excluding any commit Daniel later makes to refine the seed template body).

---

## 10. Dependencies / Preconditions

- M4_AUTOMATION_ENGINE_SERVER_SIDE Rung 1 + Rung 2 already closed (✅ 2026-05-03). The `automation-engine` EF + `crm_message_queue` + `dispatch-queue` EF exist.
- `daily-alert-generation` pg_cron exists as the per-tenant fan-out + EXCEPTION isolation reference impl (verified live by `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` §3 Rung 1 step 4).
- demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`) + Prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`) tenant rows exist (always true).
- `tests/smoke/baseline.test.mjs` exists and runs on demo (✅ 2026-05-10 per Safety-Infra layer).
- Localhost-Tester skill `opticup-localhost-tester` exists (✅ 2026-05-10).

---

## 11. Lessons Already Incorporated

- FROM `PRIZMA_CRM_BUGFIX_BACKPORT/FOREMAN_REVIEW.md` Author Proposal #1 → "Pin EF response field semantics in §3 by reading EF source first" → **APPLIED** in §3 criteria 6 + 11 (exact `{ ok: true, processed: N, evaluated: M, errors: E }` shape derived from current `engine.ts`).
- FROM `PRIZMA_CRM_BUGFIX_BACKPORT/FOREMAN_REVIEW.md` Author Proposal #2 → "Re-state Cross-Reference Check at runtime, not just SPEC time" → **APPLIED** in §0 (Cross-Reference Check completed 2026-05-12 against GLOBAL_SCHEMA + GLOBAL_MAP + DB_TABLES_REFERENCE: 0 collisions; restate in EXECUTION_REPORT.md §2 against runtime state per Author Proposal #2's spirit).
- FROM `PRIZMA_CRM_BUGFIX_BACKPORT/FOREMAN_REVIEW.md` Executor Proposal #2 → "Capture two-tier hashes (per-target row + aggregate untouched)" → **APPLIED** in §3 criteria 16 (per-target row literal JSON snapshots) + 17 (aggregate-untouched md5 for Prizma's 10 non-target rules).
- FROM `DEMO_PARITY_REPLICATION/FOREMAN_REVIEW.md` Author Proposal #2 → "Identity-class proofs use literal JSON snapshots, not just hashes" → **APPLIED** in §3 criterion 16 (literal pre/post JSON for both migrated rules in EXECUTION_REPORT.md §2).
- FROM `DEMO_PARITY_REPLICATION/FOREMAN_REVIEW.md` Author Proposal #1 / Executor Proposal #1 → "Two-tier hash (full-set + matched-business-key) for tenant-parity proofs" → **NOT DIRECTLY APPLICABLE** (this SPEC is single-tenant-per-write at the DB level, not a parity replication). Used the per-row + aggregate pattern instead per Executor Proposal #2.
- FROM `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` §3 Rung 1 step 4 → "Per-tenant cron iteration with EXCEPTION isolation, mirroring `daily-alert-generation`" → **APPLIED** in §3 criterion 12.
- FROM `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` §2 defect 5 → "Missing `[functions.send-message]` block in `supabase/config.toml`" → **APPLIED** as a side-cleanup in §8 (verify both `[functions.automation-engine]` and `[functions.send-message]` blocks exist; no-op if already present).
- FROM `M4_HARDCODED_PRIZMA_REMOVAL` + `M4_UNSUB_SUPPRESSION_CRIT` + `M4_PUBLIC_FORM_VARIABLES_HIGH` → "MCP deploy_edge_function intermittently `InternalServerErrorException` (OPEN-021 pattern); CLI fallback via Daniel" → **APPLIED** in §3 criterion 21 + §4 Autonomy Envelope (Executor STOPS and writes `DEPLOY_FALLBACK_NEEDED.md` rather than retrying MCP or silently absorbing).
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2 → "§0 Baselines table with `BASE_*` symbols referenced in §3" → **APPLIED** in §0 Baselines table.
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 → "Plain numbered headings — never `§N.` prefix on `## N.` lines (Iron-Rule-32 hook regex rejects `§`)" → **APPLIED** throughout this SPEC.
- FROM `ATOMIC_CONFIRMATION_FLOW/FOREMAN_REVIEW.md` → "Add Rule-21-orphans co-staging guard to executor: when renaming a private symbol that collides with a sibling file, pre-rename in a separate commit" → **APPLIED** by §3 criterion 15's allowance for the Executor to pre-split `crm-rule-editor.js` into a sibling if line cap is at risk (declared upfront in EXECUTION_REPORT.md §3).
- Brief §7 Q2 (polling cadence) — resolved **1 minute** by Strategist (operational symmetry with `dispatch-queue`).
- Brief §7 Q3 (multi-channel timing — `same scheduled_at` vs `same DB transaction`) — resolved **both** (single `db.from(crm_message_queue).insert(rows)` call achieves both atomically; dispatch-queue parallel-by-group handles the dispatch side).
- Brief §7 Q4 (rule editor redesign vs extend) — resolved **extend** (`fires_on` sub-picker on existing `attendees` board; one new state field, no UI redesign).

---

## 12. Pre-Merge Checklist

Every item must pass before this SPEC closes. Any failure → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md §2`.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. Null-byte ERROR (exit 1) anywhere → REOPEN.
- [ ] **Iron Rule 32 (Destructive Operations Gate):** §4 above declares the SPEC's destructive ops (2 UPDATEs + 1 pre-commit tag); the pre-commit hook accepts these as declared.
- [ ] `git status --short` returns empty (clean tree) at SPEC close.
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + ROLLBACK_SQL.md present in SPEC folder.
- [ ] TEST_REPORT.md present (Localhost-Tester deliverable) — smoke 7/7 PASS recorded.
- [ ] FOREMAN_REVIEW.md written by Foreman in the final phase.
- [ ] Module's SESSION_CONTEXT.md + CHANGELOG.md updated.
- [ ] `OPEN_EVENTS_TICKETS.md` EV-001 marked ✅ CLOSED.
- [ ] `MASTER_ROADMAP.md` §3 updated with framework readiness note for future M7/M8/M9.
- [ ] `docs/GLOBAL_MAP.md` + `docs/GLOBAL_SCHEMA.sql` updated (Integration Ceremony append for the 2 new tables + the new EF mode).

---

## Destructive Operations

Required by Iron Rule 32 (`scripts/checks/destructive-ops-declared.mjs` enforces this in pre-commit + CI).

1. **2 single-row `UPDATE crm_automation_rules`** statements — 1 on demo (`id=b2a21d96-b7bd-43c4-a02b-496dab6ec74e`), 1 on Prizma (`id=a9483a90-48b1-40ff-a6b2-cee157d72485`). Scoped by `id` + `tenant_id` + pre-condition on the existing `trigger_event='created'` value (so a concurrent flip would no-op). Each UPDATE its own statement returning post-state `md5(action_config::text)`. Pre-state literal JSON for each captured in `EXECUTION_REPORT.md §2` and `ROLLBACK_SQL.md` per Iron Rule 32's declared-snapshot pattern.
2. **1 pre-commit annotated git tag** `pre-status-change-framework-2026-05-12` created on `$START_COMMIT` before commit 1. Inverse: `git tag -d <tag>` if rollback is taken.
3. **1 demo-only INSERT** into `crm_message_templates` for `check_in_event_sms_he` IFF the template row doesn't already exist (criterion 18a). Strict tenant scope. NO Prizma writes during criterion 18a.
4. **1 temporary demo rule duplicate** for criterion 19's multi-channel test (added pre-test, deleted post-test by the Executor — round-trip net-zero, captured in EXECUTION_REPORT.md §2 with both INSERT and DELETE statements).

No file deletions. No mass renames (≥ 5 files). No `git rebase`. No `git reset --hard` except in the rollback path of §6. No `git push --force`. No SQL `DROP TABLE` / `DROP COLUMN` / `DROP POLICY` / `TRUNCATE` / `ALTER TABLE ... DROP`. No untargeted `DELETE FROM <table>` (every DELETE in this SPEC is `WHERE id=<X> AND tenant_id=<demo>` scoped). No edits to CLAUDE.md or to any SKILL.md (skill-improvement proposals harvested into FOREMAN_REVIEW.md only, applied in a subsequent session by a separate `chore(skills): ...` commit per the self-improvement mandate).

The `cron.unschedule()` call in §6 Rollback Plan is the inverse of this SPEC's own additive `cron.schedule()` — declared here as a contingent operation, not a free-standing destructive op.

---

*End of SPEC. Hand-off: Executor reads this file, executes under Bounded Autonomy + Full-Auto Pipeline mode, writes EXECUTION_REPORT.md + FINDINGS.md + ROLLBACK_SQL.md, dispatches to Reviewer + Localhost-Tester, who write their own retrospectives. Foreman then writes FOREMAN_REVIEW.md and closes the SPEC.*
