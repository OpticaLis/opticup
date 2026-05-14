# SPEC — M4_TEMPLATE_VALIDATION_UNIFIED

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UNIFIED/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-14
> **Module:** 4 — CRM
> **Phase (if applicable):** Phase 2 P2.3 of `roles/site-overseer/FUNNEL_ROADMAP.md`
> **Author signature:** opticup-strategic, Overnight Bundle Tier A.1 chat 2026-05-14
> **Brief:** `__LAUNCH_PLAN_DRAFT__/OVERNIGHT_BUNDLE_2026_05_14_*` (Tier A.1)

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-14 (Overnight Bundle Tier A.1 dispatch).
- FUNNEL_ROADMAP.md Q5 + Phase 2 P2.3 row verified PLANNED, layer 6.
- GUARDIAN_ALERTS.md scan: `🟢 healthy`, 0 CRITICAL, 0 HIGH delta in current window; no blockers for M4 CRM EF work.
- `supabase/functions/send-message/event-variables.ts` read end-to-end (266 lines) — confirms `scanForUnsubstitutedPlaceholders` (lines 209-215) + `scanForPaymentUrlMismatch` (lines 189-193) live there today, NOT in `index.ts` as the Brief claimed. The Brief's "3 places" was inexact — actually:
  - **Place 1**: `event-variables.ts:189-215` (the helpers).
  - **Place 2**: `index.ts:256-285` (the call sites, post-substitution scan).
  - **Place 3**: manual-send UI claim — grep across `modules/crm/*.js` for `unsubstituted_placeholder` / `scanForUnsub` returns **0 hits**. The manual-send UI (`crm-send-dialog.js`, `crm-event-send-message.js`, `crm-messaging-broadcast.js`) does NOT validate locally — it delegates to `send-message` EF which does the canonical scan. So the real situation is **2 places** that both live inside `send-message`. The "third place" the Brief referenced is the absence of validation in the `automation-engine` pre-enqueue path — exactly the gap this SPEC closes.
- `supabase/functions/automation-engine/prepare-plan.ts` read end-to-end (182 lines). `buildVariables` (lines 36-70) injects ONLY: `name`, `phone`, `email`, `lead_id`, `unsubscribe_url` (placeholder), `event_name`, `event_date`, `event_time`, `event_location`, `registration_url`. **Missing**: `event_max_attendees`, `event_deposit_amount`, `event_day_of_week`, `coupon_code`, `waze_url`, `payment_url_<fee>` — every one of these is bound by `send-message`'s `injectEventVariables` at dispatch time, but the automation-engine's plan-time `substituteVars` runs against the un-bound `vars` bag, so the dispatched message goes to `crm_message_queue` already with its plan-time `body` containing literal `%event_max_attendees%`. This is exactly the bug pattern in `GUARDIAN_ALERTS.md M-NEW-28-1` (2026-05-12: 7 demo SMS failed with `unsubstituted_placeholder: event_max_attendees`).
- `supabase/functions/automation-engine/queue-send.ts` read end-to-end (130 lines). Direct queue-insert path for the `queue_send` action type (rules like `event_invite_waiting_list` that schedule N-days-before send). Variables passed at queue-write time are bare `{name, phone, email}` (lines 77-81) — `send-message` re-injects at dispatch from `vars` already on the queue row, so `event_max_attendees` etc. ARE bound correctly there. **Critical finding: `queue_send` is OK; `send_message` action type (immediate dispatch via `dispatchPlanDirect`) is the broken path.** Validation belongs on the `send_message` action_type pre-dispatch.
- Live template inventory check (demo tenant) — 11 of 26 demo `event_*` templates reference `%event_max_attendees%` / `%event_deposit_amount%` / `%registration_url%`. Confirms the broken set is non-trivial.
- `crm_message_queue.body` column is `text NULL` — composed body is stored at plan-time today. Validation must therefore happen BEFORE the row lands in queue.
- `crm_automation_rules` columns checked: `id, tenant_id, name, trigger_entity, trigger_event, trigger_condition, action_type, action_config, sort_order, is_active, created_at, updated_at`. **NO `last_error` column.** This SPEC adds it (text NULL, no default).
- `crm_message_log` columns confirmed: `tenant_id, lead_id, event_id, run_id, template_id, broadcast_id, channel, content, status, external_id, error_message, created_at` — `status='rejected'` + `error_message='unsubstituted_placeholder: ...'` is the canonical failure-row shape (existing pattern from `send-message` index.ts).
- `crm_automation_runs` columns confirmed — has `error_message text NULL`, useful for the run-level summary too but rule-level surfacing is what the operator sees in the rule editor.
- Pre-existing untracked files survey: 60+ untracked paths present at session start (Brief noted, will leave alone — selective `git add` by filename throughout). Full-Auto Pipeline mode — no Daniel questions during run.
- EF baseline versions captured: `automation-engine v15`, `send-message v25`, `dispatch-queue v14`. The new shared module is a new file, not a new EF; `_shared/template-validation.ts` is bundled into each EF's deploy artifact (Deno import). Re-deploys: `send-message v25→v26` (import refactor only — pure refactor), `automation-engine v15→v16` (new validation call).
- Lessons applied from prior `FOREMAN_REVIEW.md` files (3 most recent in M4 — `M3_SHORTGY_TO_INTERNAL_REDIRECT`, `M4_BROADCAST_ID_PROPAGATION`, `M3_UTM_TRIPLE_LAYER_PERSISTENCE`):
  - **FROM `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` Executor Proposal #1** (auto-fallback to CLI EF deploy on MCP `InternalServerErrorException`) → **APPLIED**: §4 Autonomy Envelope authorizes the pivot inline.
  - **FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #2** (Pipeline-mode escalation discipline) → **APPLIED**: §5 Stop-on-Deviation Triggers below pre-enumerate the narrow blockers that Daniel-escalate vs. which auto-pivot.
  - **FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1** (baselines from LIVE measurement, never from author memory) → **APPLIED**: every numeric symbol below cites a runnable query.
  - **FROM `M3_SHORTGY_TO_INTERNAL_REDIRECT/FOREMAN_REVIEW.md`** Author Proposal #1 (pre-write the "out-of-scope inventory") → **APPLIED**: §7 lists the precise tables/files NOT touched.

### Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | Object | Metric | Value (captured 2026-05-14 LIVE) | Query |
|---|---|---|---|---|
| `BASE_SEND_MESSAGE_VER` | `send-message` EF | version | `25` (will become `≥26`) | `mcp__claude_ai_Supabase__list_edge_functions → slug='send-message'.version` |
| `BASE_AUTOMATION_ENGINE_VER` | `automation-engine` EF | version | `15` (will become `≥16`) | same, slug='automation-engine' |
| `BASE_DISPATCH_QUEUE_VER` | `dispatch-queue` EF | version | `14` (must remain `14` — out of scope) | same, slug='dispatch-queue' |
| `BASE_AUTORULES_COLS` | `crm_automation_rules` | column count | `12` (will become `13` post-SPEC) | `SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_automation_rules'` |
| `BASE_DEMO_QUEUE_ROWS` | `crm_message_queue` | `COUNT(*) WHERE tenant_id=demo` | `15` (post-run delta: +0 from the broken-template integration test scenario) | `SELECT count(*) FROM crm_message_queue WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` |
| `BASE_PRIZMA_QUEUE_ROWS` | `crm_message_queue` | `COUNT(*) WHERE tenant_id=prizma` | (capture pre-flight; MUST be identical post-SPEC — Prizma READ-ONLY) | `SELECT count(*) FROM crm_message_queue WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` |
| `BASE_PRIZMA_RULES_HASH` | `crm_automation_rules` | aggregate row hash | (capture pre-flight; MUST be identical post-SPEC except `last_error` column-add — NULL on every Prizma row) | `SELECT md5(string_agg(id::text \|\| coalesce(name,'') \|\| action_type \|\| updated_at::text, '\|' ORDER BY id)) FROM crm_automation_rules WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` |
| `BASE_GIT_HEAD` | repo | HEAD commit at SPEC start | `0cf61233e9d3c33eaee5ede77854bcfae436be15` | `git rev-parse HEAD` |
| `BASE_INTEGRITY_GATE` | `npm run verify:integrity` | exit code | `0` (clean, 113 files scanned 8ms) | `npm run verify:integrity; echo $?` |

---

## 1. Goal

Extract the two template-output validation helpers from `send-message/event-variables.ts` into a new shared module `supabase/functions/_shared/template-validation.ts`, then call it BEFORE `crm_message_queue` insert from the `automation-engine` pre-enqueue path. Closes KNOWLEDGE_MAP Layer 6 §"validation not in auto-dispatch path" gap (per FUNNEL_ROADMAP Q5 decision) and prevents the bug class behind `GUARDIAN_ALERTS.md M-NEW-28-1` (`unsubstituted_placeholder: event_max_attendees`) from producing `status='failed'` rows that the broadcast counter has to subtract out.

---

## 2. Background & Motivation

KNOWLEDGE_MAP.md Layer 6 (`roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md`) recorded on 2026-05-14 that template-placeholder validation works at SEND-time (verified empirically: 7 demo SMS on 2026-05-12 failed-CLOSED with `unsubstituted_placeholder: event_max_attendees` — exactly the safety net the project wants) but does NOT run at QUEUE-time. The dispatch chain is `automation-engine → crm_message_queue → dispatch-queue → send-message`. Today the validation fires at the last hop, AFTER the message has already cost a queue slot, a `dispatch-queue` drain tick, and a `crm_message_log` row with `status='failed'`. Worse, the `crm_automation_rules` row whose template is broken stays `is_active=true` with no error-surface, so the next cron tick re-creates the same doomed messages.

FUNNEL_ROADMAP Q5 (2026-05-14, Daniel-decided): "ensure auto-dispatch path also validates. Do NOT fill `required_variables`." This SPEC implements exactly that: validation moves from "post-substitution at dispatch" to "post-substitution at PLAN-time, BEFORE queue insert" for the `automation-engine`'s `send_message` action type. The `queue_send` action type (delayed cron-triggered N-days-before broadcasts) is already safe — its `crm_message_queue` rows store the bare `{name,phone,email}` variables bag and let `send-message` re-substitute at dispatch time, where validation already runs.

Manual-send UI (`crm-send-dialog.js`, `crm-event-send-message.js`, `crm-messaging-broadcast.js`) does NOT have its own local scan — it posts straight to `send-message` EF which validates server-side. That's fine; this SPEC does NOT touch the UI.

### 2.1 Foreman decisions (resolved at author time, NOT executor decisions)

**Decision D1 — Where the shared module lives.** **`supabase/functions/_shared/template-validation.ts`** (project convention; `_shared/` already exists with `tenant-config.ts` as precedent — same Deno import pattern from per-EF `index.ts`). NOT `js/shared/` (that's the ERP browser side, different runtime).

**Decision D2 — Function naming.** Keep the existing two function names as-is for `send-message`'s refactor (pure extract, zero behavior change):
- `scanForUnsubstitutedPlaceholders(text: string): string[]`
- `scanForPaymentUrlMismatch(body: string): string | null`

Plus add a NEW top-level orchestrator `validateTemplateOutput(body: string, subject?: string | null): ValidationResult` that runs both scans and returns a uniform structured result. Callers that want to fail-CLOSED in one branch (like `automation-engine`) import this; callers that want fine-grained control over the per-scan failure path (like `send-message` index.ts, which writes a different `error_message` per scan) keep importing the individual helpers.

**Decision D3 — Where automation-engine validates.** Inside `prepareRulePlan` in `prepare-plan.ts`, AFTER `substituteVars` produces `composedBody`, BEFORE the plan item is pushed onto the list. Failing items are NOT pushed to `items` (so `dispatchPlanDirect` never sees them, so `crm_message_queue` never receives them) AND are recorded with a structured rejection — one `crm_message_log` row per rejected dispatch (`status='rejected'`, `error_message='unsubstituted_placeholder: X,Y'`) so the existing operator-facing message-log view surfaces the failure. The plan_item's lead is also NOT counted in `total_recipients` (no inflation of the cron's run row).

**Decision D4 — Rule-level error surfacing.** Add column `crm_automation_rules.last_error text NULL` + write `'unsubstituted_placeholder: X,Y (slug=...)'` to it whenever a rule fires and any item fails validation. **Rule stays `is_active=true`** (Daniel's directive: operator must see the error, not silent suppression). The rule editor UI (`modules/crm/crm-rule-editor.js` — out of scope for this SPEC, separate UI follow-up) will read `last_error` and render a yellow badge; for now the column exists so the next UI iteration can wire it.

**Decision D5 — Iron Rule 14/15 application for the new column.** `last_error` is added to an EXISTING table — `crm_automation_rules` already has `tenant_id UUID NOT NULL` (per pre-flight grep) and 2 canonical RLS policies (service_bypass + tenant_isolation, JWT-claim). Column-add migration is purely additive — no new policy, no new constraint. Defense-in-depth pattern (Iron Rule 22): every UPDATE of `last_error` in the engine includes both `tenant_id` filter AND the rule `id`.

**Decision D6 — pre-enqueue substitution semantics.** The validator runs against `composedBody` (after `substituteVars`) — the same byte string that `send-message` would scan post-substitution. This means we exactly replicate the at-dispatch validation surface; if it would fail there, it fails here. The automation-engine's substitution-vars bag (`buildVariables` in `prepare-plan.ts` lines 36-70) is intentionally NARROWER than `send-message`'s `injectEventVariables` — that's correct, because the queue-bag is what `send-message` receives and re-binds; HOWEVER, for the `send_message` action type (immediate dispatch via `dispatchPlanDirect`), the body is composed at plan-time and just re-rendered at dispatch with the same vars. So `automation-engine`'s validation runs against a body that should already be fully bound. Any unsubstituted placeholder at this point IS a template-vs-engine mismatch — exactly what we want to surface.

**Decision D7 — backward-compat for send-message.** Pure refactor on the send-message side: same exports, same behavior, same error responses, same `crm_message_log` writes. The `event-variables.ts` `scanFor*` functions stay there as thin re-exports of the new shared module so any other importer (e.g. a future ERP-side validator) can import from one place. This decision preserves 100% of v25 behavior for v26 — pure code motion + a re-export shim.

**Decision D8 — Manual-send UI scope.** OUT (§7). The manual-send UI already delegates validation to `send-message` EF — adding a client-side mirror has no behavioral benefit (the EF still validates, fail-CLOSED still works), only doubles the surface area to maintain. If a future SPEC wants to give the operator a pre-send preview-validation in the wizard, it can call `send-message` with a new `mode='preview'` (out of scope here).

---

## 3. Success Criteria (Measurable)

Every criterion has an EXACT expected value. Run-time evidence in `EXECUTION_REPORT.md §2`.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, scope-clean | `git status --short` (only this SPEC's authored/modified files listed) |
| 2 | Commits produced on develop | 3-5 commits, all pushed to `origin/develop` | `git log origin/develop..HEAD --oneline` then `git log --oneline -5 origin/develop` after push |
| 3 | New file: `supabase/functions/_shared/template-validation.ts` | Exists, exports `scanForUnsubstitutedPlaceholders` + `scanForPaymentUrlMismatch` + `validateTemplateOutput` | `ls supabase/functions/_shared/template-validation.ts && grep -c "^export " supabase/functions/_shared/template-validation.ts` → exit 0 + count ≥3 |
| 4 | `send-message/event-variables.ts` re-exports the shared helpers | Module still exports both function names (via re-export from `_shared/template-validation.ts`) — body of scan functions removed | `grep -c "scanForUnsubstitutedPlaceholders\|scanForPaymentUrlMismatch" supabase/functions/send-message/event-variables.ts` → ≥2 (export lines) |
| 5 | `send-message/index.ts` behavior unchanged | Same error messages emitted on a doomed template send | post-deploy curl test of `send-message` EF v26 returns `error: unsubstituted_placeholder, missing: [...]` (same shape as v25) — see §3.1 below |
| 6 | `crm_automation_rules.last_error` column exists | text NULL, no default, on existing table | `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_automation_rules' AND column_name='last_error'` → 1 row, text, YES, NULL |
| 7 | `automation-engine` EF version bumped | `BASE_AUTOMATION_ENGINE_VER + 1` (= 16) | `mcp__claude_ai_Supabase__list_edge_functions → slug='automation-engine'.version` ≥ 16 |
| 8 | `send-message` EF version bumped | `BASE_SEND_MESSAGE_VER + 1` (= 26) | same, slug='send-message' ≥ 26 |
| 9 | `dispatch-queue` EF version unchanged | exactly `BASE_DISPATCH_QUEUE_VER` (= 14) | same, slug='dispatch-queue' == 14 (otherwise SCOPE VIOLATION) |
| 10 | Integration test scenario PASS — broken template on demo | 0 new `crm_message_queue` rows AND 1 `crm_message_log` row with status='rejected', error_message starts with 'unsubstituted_placeholder' AND 1 `crm_automation_rules.last_error` populated AND structured engine response `{ok:false, fired:1, sent:0, queued:0, validation_failures:1, error:'unsubstituted_placeholder', missing:['<placeholder>']}` (or equivalent — see §3.2) | See §3.2 detailed scenario below |
| 11 | Integration test scenario PASS — clean template on demo (regression) | 1 new `crm_message_queue` row OR direct send (depending on whether the test uses queue_send or send_message action_type) AND the rule's `last_error` field stays NULL | See §3.3 detailed scenario below |
| 12 | Prizma read-only invariant | `BASE_PRIZMA_QUEUE_ROWS` count identical pre/post AND `BASE_PRIZMA_RULES_HASH` identical pre/post (only difference allowed: `last_error` NULL column-add, which doesn't affect the hash query since it excludes that column) | re-run baseline queries post-run; diff |
| 13 | Iron Rule 31 (integrity gate) | exit 0 (or 2 warnings; never 1 ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 14 | Iron Rule 32 (destructive ops declared) | this SPEC declares `**None.**` and the executor produces zero file deletes / `git rm` / `git rebase` / `git reset --hard` / `git push --force` / DROP / TRUNCATE / DELETE-without-tenant-WHERE / governance-file deletions | `git log origin/develop..HEAD --stat` review post-run + `scripts/checks/destructive-ops-declared.mjs` exits 0 |
| 15 | Smoke test (Tier A pre-deploy) | 7/7 PASS on `tests/smoke/baseline.test.mjs` (or equivalent project smoke script) before first commit | `node tests/smoke/baseline.test.mjs` (or `node scripts/start-local.ps1` verifier) exit 0 with 7 PASS lines |
| 16 | Smoke test (Tier A post-deploy) | 7/7 PASS after EFs redeploy + last commit | same |
| 17 | Out-of-scope files unmodified | files listed in §7 untouched | `git diff --name-only origin/develop..HEAD` does NOT include any §7 path |

### 3.1 Send-message regression test (criterion 5 detail)

Post-`send-message v26` deploy, invoke directly with a body containing an unsubstituted placeholder via the demo tenant. Expected response shape (identical to v25): HTTP 400, JSON `{ok:false, error:"unsubstituted_placeholder", missing:["unknown_var"], template:null}`. AND a `crm_message_log` row written with `tenant_id=demo, status='failed', error_message='unsubstituted_placeholder: unknown_var'`. Run command in EXECUTION_REPORT.md §3.

### 3.2 Broken-template integration test (criterion 10 detail)

Steps the Executor MUST execute (and document each step's result in EXECUTION_REPORT.md §3 with verbatim output):

1. **Setup (demo tenant, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`):** create a new active `crm_message_templates` row with slug `m4_template_validation_test_sms_he` and body containing a deliberately-unbound placeholder, e.g. `שלום %name%! משהו על %nonexistent_var%.` Channel `sms`, language `he`, `is_active=true`. Use `mcp__claude_ai_Supabase__execute_sql` with explicit `tenant_id` in the INSERT (Iron Rule 22).
2. **Setup:** create a new active `crm_automation_rules` row with `tenant_id=demo`, action_type='send_message', a unique `name='M4_VALIDATION_TEST'`, trigger_entity='lead', trigger_event='created' (`lead_intake`), trigger_condition={"type":"always"}, action_config pointing at the broken template above (template_slug='m4_template_validation_test', channels=['sms'], recipient_type='trigger_lead', language='he'). is_active=true. Record `rule_id`.
3. **Capture baselines:** queue count for demo + the new rule's `last_error` value (NULL).
4. **Trigger:** POST to `automation-engine` EF with mode='dispatch', trigger_type='lead_intake', trigger_data=`{leadId:<existing demo lead id>, lead:{full_name:'Test', phone:'+97250...', email:'demo@example.com'}}`, dispatch_messages=true. Capture full response JSON.
5. **Verify** (in this order):
   - Queue count delta = 0 (no row added for the broken template).
   - `crm_message_log` rows for this `run_id` count = 1 with status='rejected' AND error_message starts with 'unsubstituted_placeholder'.
   - `crm_automation_rules.last_error` for `rule_id` is NOT NULL AND contains 'unsubstituted_placeholder' AND contains 'nonexistent_var'.
   - `crm_automation_rules.is_active` for `rule_id` is still `true` (NOT auto-disabled).
   - The engine's JSON response includes a structured failure signal — exact shape decided at execute-time but MUST include enough info to tell which placeholders failed; record the actual shape in EXECUTION_REPORT.md.
6. **Cleanup:** DELETE the test template + test rule (both `tenant_id=demo` scoped). Verify queue count returns to `BASE_DEMO_QUEUE_ROWS` exactly.

### 3.3 Clean-template regression test (criterion 11 detail)

Run a similar scenario but with a template whose body uses only auto-injected variables (`%name%`, `%phone%`) so the substitution succeeds. Expected: 1 plan item produced (NOT 0), validation passes silently, rule's `last_error` stays NULL. Cleanup template + rule afterward.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo (Level 1 SQL autonomy: SELECT only).
- Run Level 2 SQL on the demo tenant for the integration tests (Decision D5 above; `ROLLBACK` available for cleanup).
- Create / modify the new shared module + the 2 EFs + the 1 migration listed in §8.
- Apply the migration via `mcp__claude_ai_Supabase__apply_migration` (preferred) or `supabase migration up` if MCP fails.
- Deploy EFs via `mcp__claude_ai_Supabase__deploy_edge_function` (preferred). **Auto-pivot to local CLI `supabase functions deploy <name>` (with `--no-verify-jwt` only for `dispatch-queue` — NOT applicable here) on MCP `InternalServerErrorException` failure ≥2 in a row** — see M4_BROADCAST_ID_PROPAGATION FOREMAN_REVIEW Executor Proposal #1. No Daniel escalation needed for the pivot.
- Commit by explicit filename only (`git add <path>`); push to `origin/develop` after each logical commit.
- Run the standard verify scripts (`npm run verify:integrity`, smoke tests).

### What REQUIRES stopping and reporting
- Any test in §3 fails AND cannot be diagnosed in a single retry. Stop, write the failure into EXECUTION_REPORT.md §5 Decisions / §6 Findings, halt the pipeline.
- Integrity gate exits 1 (null-byte ERROR).
- Any out-of-scope file in §7 ends up modified.
- Smoke test <7/7 PASS at either gate (criterion 15 OR 16). STOP, do NOT proceed.
- `crm_message_queue` for Prizma changes during the run (criterion 12 violation — invariant). STOP.
- A 3rd consecutive MCP EF deploy failure even after CLI pivot — escalate as written finding, do not loop forever.
- Any reading of project-state files surfaces a SCOPE VIOLATION (e.g. the `dispatch-queue` EF version has changed).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- Iron Rule 32 destructive-ops check fires in pre-commit on the SPEC.md itself or any other file — STOP, this SPEC declares `None.` and the section must remain so. Do not authorize destructive ops mid-run; write an escalation file at `modules/Module 4 - CRM/escalations/{ISO_TS}_template_validation_destructive_op.md` instead.
- Pre-commit hook fires for Rule 14 (tenant_id missing) or Rule 15 (RLS missing) on the migration — pause, the migration adds a column to an existing tenant-isolated table, hooks should pass; if they don't there's a SPEC defect.
- If `npm run verify:integrity` returns warnings only (exit 2) — record in EXECUTION_REPORT.md §5, continue.
- If the broken-template integration test (criterion 10) passes structurally but the rule's `last_error` is NULL — that's a real bug in the implementation, STOP and report (do not band-aid the test).

---

## 6. Rollback Plan

Forward path is purely additive; rollback is:
1. `git reset --hard pre-M4_TEMPLATE_VALIDATION_UNIFIED` to discard the commits.
2. Re-deploy `send-message v25` (the artifact lives at `mcp__claude_ai_Supabase__list_edge_functions` history; in practice the CLI deploy from the pre-spec commit suffices).
3. Re-deploy `automation-engine v15` same way.
4. Apply the down-migration `modules/Module 4 - CRM/migrations/2026_05_14_m4_template_validation_unified_down.sql` — `ALTER TABLE crm_automation_rules DROP COLUMN IF EXISTS last_error;` (no data loss — column is freshly added; any post-SPEC values are diagnostic state only).
5. Cleanup demo test rows (template + rule + crm_message_log rows tagged with the SPEC's run_ids) — `WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND name='M4_VALIDATION_TEST'`.

---

## Destructive Operations

**None.**

This SPEC is purely additive:
- 1 new file (`supabase/functions/_shared/template-validation.ts`).
- 2 file modifications (`send-message/event-variables.ts` body removal + re-export shim; `send-message/index.ts` no behavior change; `automation-engine/prepare-plan.ts` adds validation call; `automation-engine/engine.ts` may add response field).
- 1 ALTER TABLE ADD COLUMN (purely additive; existing rows are NULL; no DROP, no rename).
- 0 file deletes, 0 mass renames, 0 `git rebase`, 0 `git reset --hard`, 0 `git push --force`, 0 SQL DROP / TRUNCATE / unscoped DELETE, 0 governance-doc deletions.
- The Iron-Rule-32 declared-deletes regex MUST NOT match any line authored by this SPEC; if it does, fix the line (not the hook). Demo cleanup DELETEs in the integration test are tenant_id-scoped on demo and run via direct SQL (not file changes) — they do not trigger the file-pattern destructive-ops check.

---

## 7. Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:

- `supabase/functions/dispatch-queue/` (any file) — out of scope; this SPEC validates BEFORE the queue, not at queue-drain time. Version stays 14.
- `supabase/functions/send-message/index.ts` body of `scanForPaymentUrlMismatch` / `scanForUnsubstitutedPlaceholders` call sites (lines 256-285) — call sites stay unchanged in v26. Only the imported helpers' SOURCE moves; the import path changes from local `./event-variables.ts` to `../_shared/template-validation.ts` (via re-export shim — see Decision D7).
- Manual-send UI files: `modules/crm/crm-send-dialog.js`, `modules/crm/crm-event-send-message.js`, `modules/crm/crm-messaging-broadcast.js`, `modules/crm/crm-messaging-templates.js` — out of scope (Decision D8).
- The rule-editor UI (`modules/crm/crm-rule-editor.js`) — adding the yellow-badge / `last_error` surface is a separate SPEC. This SPEC only adds the DB column; reading it from the UI happens later.
- Prizma tenant — READ-ONLY for diagnostic queries only. Zero Prizma writes; zero Prizma EF traffic outside the standard automated dispatch chain (which we don't trigger from here).
- `queue_send` action type path (rules with delayed N-days-before send via `prepareQueueSend`) — already safe because `crm_message_queue` stores the bare vars bag and re-renders at dispatch where validation already runs. No code change there.
- `required_variables` column on `crm_message_templates` — per FUNNEL_ROADMAP Q5 decision, do NOT fill or repurpose. This SPEC does NOT touch the column or its readers.
- `crm_automation_runs.error_message` — leave alone; per-rule error-surface lives on `crm_automation_rules.last_error` instead (cron-loop friendly: persists across runs).
- The pg_cron job `consume_status_change_events` — out of scope; the consumer path is correct (it calls automation-engine, which is what we're hardening).

---

## 8. Expected Final State

### New files
- `supabase/functions/_shared/template-validation.ts` (≤120 lines; exports `scanForUnsubstitutedPlaceholders`, `scanForPaymentUrlMismatch`, `validateTemplateOutput`, `ValidationResult` type).
- `modules/Module 4 - CRM/migrations/2026_05_14_m4_template_validation_unified_up.sql` (1 ALTER TABLE ADD COLUMN).
- `modules/Module 4 - CRM/migrations/2026_05_14_m4_template_validation_unified_down.sql` (1 ALTER TABLE DROP COLUMN IF EXISTS).
- SPEC closure artifacts (Executor-authored at SPEC close):
  - `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UNIFIED/EXECUTION_REPORT.md`
  - `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UNIFIED/FINDINGS.md` (only if findings exist)
  - `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UNIFIED/TEST_REPORT.md` (localhost-tester output)
  - `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UNIFIED/FOREMAN_REVIEW.md` (Foreman-authored)

### Modified files
- `supabase/functions/send-message/event-variables.ts` — remove the two function BODIES (lines 189-215 currently); replace with `export {scanForUnsubstitutedPlaceholders, scanForPaymentUrlMismatch} from "../_shared/template-validation.ts";`. Net delta: -27 lines + 1 re-export line. No new logic.
- `supabase/functions/send-message/index.ts` — possibly no change if the import line `import { scanForUnsubstitutedPlaceholders, scanForPaymentUrlMismatch } from "./event-variables.ts"` continues to resolve (the re-export keeps the names). If TypeScript path resolution complains during deploy, fall back to importing directly from `../_shared/template-validation.ts`. Either way: zero behavior change.
- `supabase/functions/automation-engine/prepare-plan.ts` — import `validateTemplateOutput` from `../_shared/template-validation.ts`; inside the `send_message` action-type branch (currently lines 124-182), AFTER `composedBody` is computed in the inner loop (lines 162-179), run `validateTemplateOutput(composedBody)` (plus the subject if email — composedBody covers body only today; if email subject substitution exists, scan it too) and if invalid: (a) do NOT push the item to `items`, (b) increment a new `validation_failures` counter on the return value, (c) accumulate the placeholder list to write to the rule's `last_error` in the engine layer (next file), (d) insert a `crm_message_log` row with `status='rejected'`, `error_message='unsubstituted_placeholder: X,Y'`, `tenant_id`, `lead_id`, `event_id`, `run_id`, `channel`, `content=composedBody`.
- `supabase/functions/automation-engine/engine.ts` — extend `PreparedPlan` and `EvaluateResult` types with `validation_failures: number` + accumulate to write the rule's `last_error` (one UPDATE per rule with non-zero failures: `UPDATE crm_automation_rules SET last_error='unsubstituted_placeholder: <slug>:<vars>; ...' WHERE id=<rule_id> AND tenant_id=<tenantId>`). The UPDATE uses defense-in-depth (Iron Rule 22): both `id` AND `tenant_id` in the WHERE. The engine's `EvaluateResult` response gains `validation_failures` so the API caller (cron / browser CrmAutomationClient) sees the count.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — add a top-bullet entry for this SPEC at close.
- `docs/DB_TABLES_REFERENCE.md` — note the new `crm_automation_rules.last_error` column if a registry entry for that table already exists (one-line addition; not a structural change).

### Deleted files
None.

### DB state
- Table `crm_automation_rules` gains 1 column: `last_error text NULL` (no default; no constraint; no index). Existing rows: NULL. RLS unchanged (existing policies cover the column automatically). Iron Rule 14 (tenant_id NOT NULL) already satisfied by the existing column. Iron Rule 15 (RLS) already satisfied by the existing 2 policies.

### Build-side-effect file expectations

This SPEC has NO build/codegen step. The EF deploy uploads the .ts files as-is; there is no `npm run build` invocation in scope. No drift expected.

### Docs updated (MUST include)
- Module's `SESSION_CONTEXT.md` — single top-bullet on what closed.
- `docs/DB_TABLES_REFERENCE.md` — `crm_automation_rules` row gains `last_error` mention (if the table is already listed there; if not, skip — this is informational, not structural).
- No `MASTER_ROADMAP.md` update (this SPEC is a Phase 2 P2.3 closure; FUNNEL_ROADMAP.md row is what tracks Phase 2 progress, and it's updated in the SESSION_CONTEXT line).
- No `docs/GLOBAL_MAP.md` update needed (no new functions/contracts at the project level; the EF helpers are internal-runtime).
- No `docs/GLOBAL_SCHEMA.sql` update in this SPEC (Integration Ceremony at next M4 phase close merges in).

---

## 9. Commit Plan

Specify how commits should be grouped. Each commit pushes to `origin/develop` immediately. Multi-commit OK (3-5 commits total target):

- **Commit 1:** `feat(m4,ef): extract template validation helpers to _shared/template-validation.ts` — Files: `supabase/functions/_shared/template-validation.ts` (new) + `supabase/functions/send-message/event-variables.ts` (body removal + re-export shim) + redeploy `send-message v25→v26`.
- **Commit 2:** `feat(m4,db): add crm_automation_rules.last_error column` — Files: `modules/Module 4 - CRM/migrations/2026_05_14_m4_template_validation_unified_up.sql` + paired `_down.sql`. Migration applied via MCP first.
- **Commit 3:** `feat(m4,ef): validate templates pre-enqueue in automation-engine` — Files: `supabase/functions/automation-engine/prepare-plan.ts` + `supabase/functions/automation-engine/engine.ts` + redeploy `automation-engine v15→v16`. Includes new `validation_failures` field on the EvaluateResult.
- **Commit 4 (closure):** `chore(spec): close M4_TEMPLATE_VALIDATION_UNIFIED with retrospective` — Files: `EXECUTION_REPORT.md` + `FINDINGS.md` (if any) + `TEST_REPORT.md` (post localhost-tester) + `SESSION_CONTEXT.md` top-bullet + optional `DB_TABLES_REFERENCE.md` one-line. (FOREMAN_REVIEW.md committed by Foreman in a separate Commit 5 if Foreman-as-reviewer runs.)

Optional **Commit 5:** `chore(spec): FOREMAN_REVIEW.md for M4_TEMPLATE_VALIDATION_UNIFIED` — Foreman-authored after reading the closure docs.

---

## 10. Dependencies / Preconditions

- Phase 1 P1.1 + P1.2 + P1.3 + P1.4 closed (✅ all closed 2026-05-14 — verified in SESSION_CONTEXT).
- `automation-engine` EF must be at v≥15 at SPEC start (confirmed: v15 live).
- `send-message` EF must be at v≥25 at SPEC start (confirmed: v25 live).
- Localhost smoke must be 7/7 PASS at SPEC start (Tier A.1 dispatch implies localhost is up; Executor confirms before proceeding).
- Demo tenant integrity: `BASE_DEMO_QUEUE_ROWS=15` at start; Executor re-confirms before §3.2 setup.
- Master safety tag `pre-M4_TEMPLATE_VALIDATION_UNIFIED` created on `BASE_GIT_HEAD`.

### Browser readiness pre-flight (executor instructs at start)

This SPEC's verification is purely SQL/HTTP/script-based. No browser action required. **Skip Chrome readiness check.**

---

## 11. Lessons Already Incorporated

- FROM `M3_SHORTGY_TO_INTERNAL_REDIRECT/FOREMAN_REVIEW.md` Author Proposal #1 (pre-write out-of-scope inventory) → APPLIED in §7.
- FROM `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` Executor Proposal #1 (MCP→CLI EF deploy auto-pivot) → APPLIED in §4 Autonomy Envelope.
- FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #2 (Pipeline-mode escalation discipline) → APPLIED in §5 + §4.
- FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1 (live-measured baselines, never memory) → APPLIED in §0 Baselines.
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 (heading text must NOT use §N. prefix; pre-commit hook regex) → APPLIED: this SPEC's headings use `## N. Title` (plain) and `## Destructive Operations` (no prefix).
- FROM `M4_BROADCAST_ID_PROPAGATION/SPEC.md` §0 (Baselines table format with runnable query column) → APPLIED.

---

## 12. Pre-Merge Checklist

Every item must pass before the executor closes the SPEC. Any item failing → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md §2`.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. A null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] **Destructive Operations declared (Iron Rule 32):** SPEC §Destructive Operations = `**None.**`; pre-commit hook exit 0 on every commit; no destructive patterns introduced.
- [ ] `git status --short` returns empty for scope-clean (untracked pre-existing files outside scope tolerated per Pipeline mode).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md (if any) + TEST_REPORT.md written in the SPEC folder.
- [ ] `send-message v26` + `automation-engine v16` deployed and ACTIVE on Supabase.
- [ ] `crm_automation_rules.last_error` column exists on demo (and Prizma, since the migration runs project-wide) with NULL on every existing row.
- [ ] Demo integration test scenarios §3.2 + §3.3 both documented in EXECUTION_REPORT §3 with verbatim output.
- [ ] Prizma read-only invariant (criterion 12) verified: queue count + rules-hash identical pre/post.
- [ ] Tier A.1 smoke 7/7 PASS pre + 7/7 PASS post.

---

*End of SPEC — M4_TEMPLATE_VALIDATION_UNIFIED.*
