# SPEC — PRIZMA_CRM_BUGFIX_BACKPORT

**Module:** 4 — CRM
**Author:** opticup-strategic (Foreman hat)
**Date authored:** 2026-05-12
**Brief:** `modules/Module 4 - CRM/architecture-brief/PRIZMA_CRM_BUGFIX_BACKPORT_BRIEF.md`
**Predecessor SPEC:** `modules/Module 4 - CRM/docs/specs/M4_DEMO_E2E_FULL_AUDIT/`
**Mode:** Full-Auto Pipeline (single chat, continuous-run with planned escalation on structural mismatch)
**Severity:** HIGH — Prizma production is actively affected

---

## 0. Pre-Authoring Reality Check

### Inputs verified

| Input | Source | Value |
|---|---|---|
| Demo tenant_id | `M4_DEMO_E2E_FULL_AUDIT/PRE_FIX_RULE_SNAPSHOT.json` | `8d8cfa7e-ef58-49af-9702-a862d459cccb` |
| Prizma tenant_id | `M4_DEMO_E2E_FULL_AUDIT/PRE_FIX_RULE_SNAPSHOT.json` §prizma_baseline | `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` |
| Demo rule 1 id (post-fix shape known) | `POST_FIX_RULE_STATE.json` | `a06be5d8-4dd6-43fa-bb53-b0e3be07a548` (registration_open) |
| Demo rule 2 id (post-fix shape known) | `POST_FIX_RULE_STATE.json` | `ee0a6f24-1a3e-43f4-9ea6-fc4c1d081787` (invite_waiting_list) |
| Demo's POST-fix `action_config` shape (target) | `POST_FIX_RULE_STATE.json` | `{channels, language?, template_slug, recipient_type='leads_by_status', recipient_status_filter=['waitlist']}` — no `post_action_attendee_upsert` key |
| Demo's PRE-fix `action_config` shape (Prizma should match this) | `PRE_FIX_RULE_SNAPSHOT.json` | `{channels, language?, template_slug, recipient_type='cross_event_active_waitlist', post_action_attendee_upsert={status:'invited'}}` |
| Integrity gate result at SPEC author time | `npm run verify:integrity` | exit 0, 41 files scanned clean |

### Cross-Reference Check (Rule 21 enforcement at author time)

This SPEC introduces NO new DB objects, NO new functions, NO new files, NO new T-constants, NO new config keys. It mutates 2 existing rows in `crm_automation_rules` (data only). Rule 21 sweep result: **0 collisions / 0 new names — N/A.**

### Baselines pinned at author time

| Baseline | Value | Used where |
|---|---|---|
| `BASE_PRIZMA_TENANT_ID` | `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` | Pre-flight queries, UPDATE filters, EF dry-run |
| `BASE_DEMO_TENANT_ID` | `8d8cfa7e-ef58-49af-9702-a862d459cccb` | Regression check — demo's rules must remain byte-identical to `POST_FIX_RULE_STATE.json` |
| `BASE_DEMO_POSTFIX_RULE_1_ID` | `a06be5d8-4dd6-43fa-bb53-b0e3be07a548` | Regression-check filter |
| `BASE_DEMO_POSTFIX_RULE_2_ID` | `ee0a6f24-1a3e-43f4-9ea6-fc4c1d081787` | Regression-check filter |
| `BASE_TARGET_TEMPLATE_SLUG` | `event_invite_waiting_list` | Prizma rule discovery |

### Lessons harvested from prior SPECs in this module

- **From `M4_DEMO_E2E_FULL_AUDIT`** — Path A/B branching with explicit "STOP + escalate on shape mismatch" worked; preserve it here verbatim.
- **From `DEMO_PARITY_REPLICATION`** — when writing to a tenant that mirrors another, capture a hash baseline pre-write so post-state byte-equivalence is verifiable. Re-applied below in §3 Success Criteria.
- **From `M4_ATTENDEE_PAYMENT_AUTOMATION` FOREMAN_REVIEW** — sticky `crm_automation_runs` rows on localhost are a Make-webhook dev quirk, NOT a functional issue; in EF dry-run on Prizma we use `mode='evaluate'` which never dispatches and never writes to `crm_automation_runs` → not applicable here.
- **Methodology two-tier hash pattern (DEMO_PARITY_REPLICATION INFO findings):** capture both a row-level hash AND an aggregate `crm_automation_rules` md5 for Prizma pre/post so we can prove the 14 untouched rules were not collateral-damaged by the 2 UPDATEs.

---

## 1. Goal

Backport the demo's 2026-05-11 data fix (E2E audit) to Prizma's production tenant. Two rows in `crm_automation_rules` (Prizma's analogs of demo's `a06be5d8` + `ee0a6f24`) have the buggy pre-fix `action_config`. Apply the SAME data-only fix to Prizma — switch `recipient_type` from `cross_event_active_waitlist` → `leads_by_status` with `recipient_status_filter=['waitlist']`, and remove `post_action_attendee_upsert`. No code change. No schema change.

## 2. Scope — In

- Pre-flight read of Prizma's `crm_automation_rules` matching the bug shape.
- Comparison to demo's pre-fix shape (`PRE_FIX_RULE_SNAPSHOT.json`).
- Path A: 2 single-row UPDATEs scoped to Prizma's tenant_id + the 2 matched rule IDs.
- Path B (escalation, if structural mismatch found): write `escalations/{TS}_prizma_rule_mismatch.md`, emit ONE Hebrew status line to Daniel, halt.
- EF dry-run (`automation-engine` `mode='evaluate'`) on Prizma to verify the fix behaves correctly without sending real messages.
- Demo regression check — 2 demo rules' `action_config` must remain byte-identical to `POST_FIX_RULE_STATE.json`.
- 3 pre-merge artifacts: `READY-FOR-MAIN-MERGE.md`, `ROLLBACK_SQL.md`, `ARCHITECT_REVIEW_CHECKPOINT.md`.
- Executor retrospective (`EXECUTION_REPORT.md` + `FINDINGS.md`) + Foreman review (`FOREMAN_REVIEW.md`).
- Pre-commit annotated git tag `pre-backport-prizma-event-invite-fix`.
- Push to `origin/develop` only. Daniel does the main-merge via GitHub PR.

## 3. Success Criteria

A criterion is met only if its **Verify** column command/check returns the exact **Expected** value.

| # | Criterion | Verify | Expected |
|---|---|---|---|
| 1 | DIAGNOSIS.md exists with Prizma's pre-fix rows + side-by-side comparison to demo's PRE-fix and POST-fix shapes | `test -f modules/.../PRIZMA_CRM_BUGFIX_BACKPORT/DIAGNOSIS.md` | exit 0 |
| 2 | Path decision documented (A or B with reasoning) | grep `^## Path Decision` in DIAGNOSIS.md | non-empty match |
| 3 (Path A) | 2 UPDATEs applied to Prizma's `crm_automation_rules` rows | `SELECT COUNT(*) FROM crm_automation_rules WHERE tenant_id=BASE_PRIZMA_TENANT_ID AND action_config->>'recipient_type'='leads_by_status' AND action_config->'recipient_status_filter'='["waitlist"]'::jsonb AND NOT action_config ? 'post_action_attendee_upsert' AND (action_config->>'template_slug'='event_invite_waiting_list' OR name LIKE '%רשימת המתנה%')` | 2 |
| 4 (Path A) | Prizma's 2 fixed rules have NO `post_action_attendee_upsert` key | `SELECT COUNT(*) FROM crm_automation_rules WHERE tenant_id=BASE_PRIZMA_TENANT_ID AND id IN (<matched-ids>) AND action_config ? 'post_action_attendee_upsert'` | 0 |
| 5 | Demo's 2 fixed rules byte-identical to E2E audit close state | `SELECT md5(action_config::text) FROM crm_automation_rules WHERE id IN ('a06be5d8…','ee0a6f24…')` | matches `POST_FIX_RULE_STATE.json` |
| 6 (Path A) | Prizma's 14 OTHER `crm_automation_rules` rows untouched | md5 of aggregate action_config for non-target rows compared pre/post | byte-identical |
| 7 | EF dry-run on Prizma in evaluate mode returns filtered recipients only | TEST_REPORT.md shows `plan_items` for recipients with `crm_leads.status='waitlist'` only + 0 attendee inserts | documented + pass |
| 8 | No live message sent during verification | `automation-engine` invoked with `mode='evaluate'` only; `crm_automation_runs` rows for this SPEC have `status='evaluated'` or equivalent dry-run marker, and 0 `crm_message_queue` rows inserted with Prizma tenant_id in test window | confirmed in TEST_REPORT.md |
| 9 | `READY-FOR-MAIN-MERGE.md` exists with PR title + body + compare URL pattern | `test -f` + grep "Title:" + "Body:" + "compare" | all present |
| 10 | `ROLLBACK_SQL.md` exists with verbatim pre-state SQL (one UPDATE per rule) | `test -f` + count `UPDATE crm_automation_rules` lines | 2 |
| 11 | `ARCHITECT_REVIEW_CHECKPOINT.md` exists with side-by-side diff + auto-classified verdict 🟢/🟡/🔴 | `test -f` + grep verdict emoji | exactly one of 🟢🟡🔴 |
| 12 | Pre-commit annotated git tag `pre-backport-prizma-event-invite-fix` exists | `git tag -l pre-backport-prizma-event-invite-fix` | non-empty |
| 13 | `npm run verify:integrity` exit 0 | command | exit 0 |
| 14 | `npm run smoke` 7/7 PASS | command | "7 passed" / equivalent |
| 15 | Working tree clean after final push | `git status --porcelain` | empty for SPEC-folder files |
| 16 | Pushed to `origin/develop` | `git rev-parse origin/develop` matches `HEAD` | match |
| 17 | NOT pushed/merged to `main` | `git log origin/main..HEAD --oneline` shows SPEC commits | non-empty (i.e., commits exist on develop but not main) |
| 18 | EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md all present in SPEC folder | `ls` | 3 files |
| 19 | OPEN_TASKS.md + DECISIONS_LOG entry updated | grep SPEC slug | match |
| 20 | Module 4 SESSION_CONTEXT.md updated with one-line today entry | grep "PRIZMA_CRM_BUGFIX_BACKPORT" | match |

## 3a. Shared Edit Block (mechanical — both rules)

Both UPDATEs follow the SAME jsonb operator pattern (data-only, idempotent under jsonb operator semantics):

```sql
UPDATE crm_automation_rules
SET action_config =
  (action_config - 'post_action_attendee_upsert')
  || jsonb_build_object(
       'recipient_type', 'leads_by_status',
       'recipient_status_filter', '["waitlist"]'::jsonb
     )
WHERE id = '<rule-id>'
  AND tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND action_config->>'recipient_type' = 'cross_event_active_waitlist'
  AND action_config ? 'post_action_attendee_upsert';
```

The extra `AND` clauses make the UPDATE a NO-OP if the row is already fixed (defense-in-depth) — so if Path B is mistakenly entered as A, no data is corrupted. Each UPDATE is its own statement (not a single multi-row UPDATE) so per-row outcome is observable.

## 4. Destructive Operations

Declared:
1. **UPDATE on `crm_automation_rules` row 1** — Prizma tenant_id only, scoped by matched rule id, jsonb operator pattern (§3a).
2. **UPDATE on `crm_automation_rules` row 2** — Prizma tenant_id only, scoped by matched rule id, jsonb operator pattern (§3a).
3. **Pre-commit annotated git tag** `pre-backport-prizma-event-invite-fix` on HEAD before any DB write.

Forbidden (any of these → STOP + escalate file under `modules/Module 4 - CRM/escalations/`):
- Any write to Prizma's `tenants` row.
- Any write to demo's rules (already fixed — must remain byte-identical to E2E audit close).
- Any DELETE on any table.
- Any schema change (DDL — `DROP`, `ALTER`, `CREATE`).
- Any code change to `automation-engine` EF or any other code under `supabase/functions/`, `js/`, `modules/`.
- Any live outbound message during verification (evaluate mode only).
- `git push --force`.
- Direct push or merge to `main`.
- Touching ANY tenant other than demo or Prizma.
- Touching `crm_automation_rules` rows other than the 2 matched IDs.

## 5. Stop-Triggers (beyond CLAUDE.md §9 globals)

STOP and escalate (write `modules/Module 4 - CRM/escalations/{ISO_TS}_prizma_rule_mismatch.md` + emit ONE Hebrew line) if ANY of these fire:

1. Prizma's matched rule count ≠ 2 (e.g. 0, 1, 3+) — unexpected number of automation rules with that template_slug or name pattern.
2. Either matched rule's pre-fix `action_config.recipient_type` ≠ `cross_event_active_waitlist`.
3. Either matched rule's pre-fix `action_config.post_action_attendee_upsert` ≠ `{"status":"invited"}` (different status, missing key, different shape).
4. Either matched rule has a key in `action_config` that is NOT present in demo's pre-fix shape AND is also NOT in `{channels, language, template_slug}` (the "safe to preserve" set). Unexpected keys → escalate, do not improvise.
5. Demo's 2 rules' `action_config` md5 changed between pre-flight and final regression check.
6. EF dry-run on Prizma returns recipients with `crm_leads.status ≠ 'waitlist'` — means the fix's recipient resolution doesn't behave as expected on Prizma's data.
7. EF dry-run on Prizma indicates ANY attendee insert would happen (`post_action_attendee_upsert` semantics leaking through despite key removal).
8. EF dry-run returns 5xx or any error — investigate before relying on the fix.
9. Working tree not clean at SPEC start in a way that conflicts with SPEC scope (uncommitted edits to `crm_automation_rules`-relevant code).
10. `npm run verify:integrity` returns exit 1 at any checkpoint.

## 6. Autonomy Envelope

Without asking Daniel, the Executor CAN:
- Run all read-only SQL against demo + Prizma rules and supporting tables (`crm_leads`, `crm_event_attendees`, `crm_message_queue`, `crm_automation_runs`, `crm_message_templates`).
- Create the pre-commit annotated git tag.
- Apply the 2 UPDATEs IF Path A is chosen and all stop-triggers pass.
- Invoke `automation-engine` EF with `mode='evaluate'` for a hypothetical event status change scenario.
- Write all artifacts inside the SPEC folder.
- `git add` SPEC-folder files + `OPEN_TASKS.md` + `references/DECISIONS_LOG.md` + Module 4 `SESSION_CONTEXT.md` (selective add only; no `git add -A`).
- `git commit` + `git push origin develop`.

The Executor MUST stop and escalate when any stop-trigger fires.

## 7. Out of Scope (explicit)

- Touching Prizma's `tenants` row or any `ui_config` field.
- Touching demo's rules.
- Touching ANY other tenant.
- Reaching into past `activity_log` or `crm_event_attendees` entries to "undo" historical auto-attaches (data archeology — not the bug fix scope).
- Adding new automation rules anywhere.
- Building regression tests (demo's E2E audit covers regression).
- Schema changes.
- Code changes anywhere.
- Editing `MASTER_ROADMAP.md` (no module phase boundary crossed; SESSION_CONTEXT is sufficient).
- Editing `GLOBAL_MAP.md` / `GLOBAL_SCHEMA.sql` (no surface added).
- Updating `TECH_DEBT.md` unless a non-trivial debt finding emerges.

## 8. Expected Final State

- Prizma `crm_automation_rules` — 2 rows updated such that:
  - `action_config->>'recipient_type' = 'leads_by_status'`
  - `action_config->'recipient_status_filter' = '["waitlist"]'::jsonb`
  - `NOT action_config ? 'post_action_attendee_upsert'`
  - All other keys (channels, language, template_slug, etc.) preserved byte-for-byte.
- Prizma's 14 other `crm_automation_rules` rows — unchanged (verified via md5).
- Demo's 2 rules — unchanged (verified via md5 of `action_config` against `POST_FIX_RULE_STATE.json`).
- SPEC folder contains: `SPEC.md`, `DIAGNOSIS.md`, `TEST_REPORT.md`, `READY-FOR-MAIN-MERGE.md`, `ROLLBACK_SQL.md`, `ARCHITECT_REVIEW_CHECKPOINT.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`, `FOREMAN_REVIEW.md`.
- Git tag `pre-backport-prizma-event-invite-fix` exists locally (and pushed if applicable).
- Branch `develop` has SPEC commits; `main` does NOT.
- Working tree clean.

## 9. Commit Plan

Plan: a small number of commits, each scoped, each pushed at end. Selective `git add` by explicit file path only.

| # | Stage | Files | Suggested message |
|---|---|---|---|
| 1 | Pre-flight + decision | `DIAGNOSIS.md` + `SPEC.md` (this file) | `docs(spec): author PRIZMA_CRM_BUGFIX_BACKPORT SPEC + pre-flight DIAGNOSIS` |
| 2 (Path A only) | Tag + fix application + dry-run | `TEST_REPORT.md` (DB writes are data, not in commit) | `fix(crm): backport event-invite waitlist fix to Prizma tenant — data-only UPDATE on 2 rows` |
| 3 (Path A only) | Pre-merge artifacts | `READY-FOR-MAIN-MERGE.md` + `ROLLBACK_SQL.md` + `ARCHITECT_REVIEW_CHECKPOINT.md` | `docs(spec): add pre-merge artifacts for PRIZMA_CRM_BUGFIX_BACKPORT` |
| 4 | Retrospectives | `EXECUTION_REPORT.md` + `FINDINGS.md` + `FOREMAN_REVIEW.md` + `OPEN_TASKS.md` + `references/DECISIONS_LOG.md` + Module 4 `SESSION_CONTEXT.md` | `chore(spec): close PRIZMA_CRM_BUGFIX_BACKPORT — retrospective + foreman review` |

If Path B: only commit #1 happens (with DIAGNOSIS.md showing escalation), plus an escalation file. No tag (the tag's purpose is to mark pre-write state — meaningless if no write).

## 10. Rollback Plan

If post-UPDATE the EF dry-run fails or any stop-trigger fires after the fix is applied:
1. Read `ROLLBACK_SQL.md` (the pre-state SQL is captured there).
2. Apply the 2 rollback UPDATEs to Prizma `crm_automation_rules`.
3. Verify via SELECT that `action_config` md5 matches the pre-flight pre-state md5 captured in DIAGNOSIS.md.
4. Move forward to escalation (`modules/Module 4 - CRM/escalations/{ISO_TS}_{slug}.md`) + emit Hebrew status line.
5. The git tag stays in place — it documents the pre-write state regardless of rollback outcome.

## 11. Lessons Already Incorporated

- **Cross-Reference Check completed 2026-05-12 against GLOBAL_SCHEMA / GLOBAL_MAP:** 0 new objects → N/A.
- **Folder-per-SPEC structure** — applied (this folder).
- **Baselines as symbols** — §0 baselines table; §3 success criteria references them by name (`BASE_PRIZMA_TENANT_ID`, etc.).
- **Two-tier hash pattern** — adopted in §3 criteria #5 + #6 (per-row md5 + aggregate untouched-rows md5).
- **Path A/B branching with planned escalation** — copied from `M4_DEMO_E2E_FULL_AUDIT` SPEC.
- **Defense-in-depth UPDATEs** — §3a Shared Edit Block adds extra `AND` clauses so a misclassified Path A becomes a NO-OP on already-fixed rows.

## 12. References

- Brief: `modules/Module 4 - CRM/architecture-brief/PRIZMA_CRM_BUGFIX_BACKPORT_BRIEF.md`
- Predecessor SPEC: `modules/Module 4 - CRM/docs/specs/M4_DEMO_E2E_FULL_AUDIT/`
  - `PRE_FIX_RULE_SNAPSHOT.json` — demo's pre-fix shape (Prizma should match this)
  - `POST_FIX_RULE_STATE.json` — demo's post-fix shape (Prizma's target end-state)
  - `FIX_VERIFICATION.md`, `AUDIT_REPORT.md`
- Iron Rules: CLAUDE.md §4–§6 (esp. Rule 14, 15, 22, 32)
- Authority Matrix: CLAUDE.md §7

---

*End of SPEC. Begin execution at Phase 1 (pre-flight read-only).*
