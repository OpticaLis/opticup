# EXECUTION_REPORT — M4_MODAL_DESELECTION_RESTORE

**Executor:** opticup-executor (Pipeline role).
**Date:** 2026-05-19.
**Pipeline mode:** Full-Auto with mandatory Chrome MCP live verification.

---

## 1. Investigation (Foreman-driven, before any code)

Daniel reported: V2 modal `אישור פעולה` deselections ignored. Selected 1 of 3, button said "(1)", DB showed 3 leads receiving messages. Run `f6c5d984-95dc-4bdd-bdc4-4255d1a99af2` at 11:09 UTC.

Investigation steps (Foreman order: read before code):
1. Queried the run row + log rows. trigger_data was **CONSUMER-shape** (had `_origin_rule_id`, flat fields) — meaning the run came from the cron consumer, NOT from a browser dispatch call.
2. `git log` on `modules/crm/crm-confirm-send-v2.js` + `crm-automation-client.js` + `automation-engine/engine.ts`. Identified the suspect commit: `bb31c24` (M4_DUAL_PATH_CLEAN_FIX, this Pipeline introduced `probeAndCommit`).
3. `git show bb31c24 -- modules/crm/crm-automation-client.js` diff revealed: the OLD `evaluate` function passed `exclude_lead_ids` / `recipient_subset` to EF `mode='dispatch'`. The NEW `probeAndCommit` collects `ctx.excludeLeadIds` from V2 modal but **drops it on the floor** — commit only does UPDATE crm_events.status; cron consumer drains the SCE without knowing about operator deselections.

Root cause confirmed: Layer 1 design from M4_DUAL_PATH_CLEAN_FIX correctly eliminated dual-path duplicates but inadvertently severed the operator deselection control. The infrastructure to filter (`engine.ts excludeSet`) already existed (M4_DRY_RUN_PREVIEW, 2026-05-14). What broke was the bridge from V2 modal → SCE → consumer → evaluate.

Daniel's hint ("ייתכן שהיה כבר שדה קיים") was correct: engine.ts already accepts `excludeLeadIds` top-level — no new field needed at engine layer.

---

## 2. Timeline (UTC)

| Time | Phase | Action |
|---|---|---|
| 11:29 | Pre-flight | Lock claimed `pid-11540-4bf32a9d.lock`. Smoke 7/7 PASS. |
| 11:29–11:33 | Investigation | DB queries + git diff. Root cause identified in `probeAndCommit`. |
| 11:33 | SPEC author | SPEC.md written with §4 declaring 12 destructive ops + 4 verification criteria. |
| 11:34 | Migration | `supabase/migrations/20260519130000_m4_modal_deselection_restore.sql` written + applied to demo. Pre-functions snapshot saved to `_archive/.../pre-functions.sql`. |
| 11:35 | EF | `consumer.ts` edited + EF deployed via supabase CLI. |
| 11:36 | Browser code | `crm-automation-client.js` `probeAndCommit` forwards ctx → meta. `crm-event-actions.js` `changeEventStatus` commit closure routes through RPC when excludes/subset present. `crm-confirm-send-v2.js` `refreshFooterLabels` disables button when remaining≤0. Line-count dance: 351 → 348 lines via one-liner compression. |
| 11:35:11 | **Test 1** (1 of 3 selected) | Modal opened with 3 recipients. Deselected 2 (kept cb6b343e). Confirmed. SCE payload.exclude_lead_ids = [01269ab9, 67e3d6fe]. Only cb6b343e received. |
| 11:39:05 | **Test 2** (2 of 3 selected) | Modal showed 3. Deselected cb6b343e only. Confirmed. SCE payload.exclude_lead_ids = [cb6b343e]. distinct_lead_count=2 (01269ab9 + 67e3d6fe). Run total_recipients=4. |
| 11:41 | **Test 3** (0 selected) | Modal showed 3. Unchecked all. Button text "אישור ושלח הודעות (0)", disabled=true. Click ignored. Modal stays open. |
| 11:42 | Smoke | 7/7 PASS. |
| 11:43 | Retros + KT | M4_INFRASTRUCTURE_CONTRACT.md §2.6 added. 4 retros written. |

---

## 3. Files touched

```
A  supabase/migrations/20260519130000_m4_modal_deselection_restore.sql
M  supabase/functions/automation-engine/consumer.ts
M  modules/crm/crm-automation-client.js                 (probeAndCommit forwards ctx → meta)
M  modules/crm/crm-event-actions.js                     (changeEventStatus routes through RPC when overrides)
M  modules/crm/crm-confirm-send-v2.js                   (refreshFooterLabels disables button at 0; 348 lines)
M  roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md (§2.6 SCE payload overrides)
A  modules/Module 4 - CRM/architecture-brief/M4_MODAL_DESELECTION_RESTORE_BRIEF.md  (if Daniel writes — investigation summary in this SPEC suffices)
A  modules/Module 4 - CRM/docs/specs/M4_MODAL_DESELECTION_RESTORE/{SPEC,EXECUTION_REPORT,FINDINGS,REVIEW,FOREMAN_REVIEW}.md
A  _archive/m4-modal-deselection-restore-2026-05-19/pre-functions.sql
A  _archive/m4-modal-deselection-restore-2026-05-19/verification/{01,02,03}*.png + 4_criteria_summary.json
```

DB out-of-band changes (Brief §4 pre-authorized):
- 1 new RPC `update_event_status_with_overrides`.
- 1 new helper function `_m4_parse_csv_uuids`.
- 3 CREATE OR REPLACE FUNCTION on SCE-producer triggers (add payload merge).
- automation-engine EF deployed v21 (consumer.ts overrides extraction).
- Multiple state resets for 3 verification toggles.

NO Prizma row writes.

---

## 4. Verification matrix — final

All 4 criteria GREEN. Full per-criterion evidence: `_archive/m4-modal-deselection-restore-2026-05-19/verification/4_criteria_summary.json`.

Key wire: `V2 _state.excluded → ctx.excludeLeadIds → probeAndCommit → commitCallback(meta) → changeEventStatus → update_event_status_with_overrides RPC → set_config session vars → UPDATE crm_events → event_status_change_event_fn trigger → SCE payload.exclude_lead_ids → consumer payloadOverrides → evaluate(excludeLeadIds: [...]) → engine.ts excludeSet filter → plan items dropped → queue insertion respects selection`.

---

## 5. Time spent

~30 min wall-clock from investigation to smoke 7/7 GREEN. Brief estimate 1-2 hours — significant undershoot because (a) the engine-side filtering infrastructure already existed, (b) the fix was structurally identical to the M4_DUAL_PATH_CLEAN_FIX Layer 3 `originated_by_rule_id` pattern (set_config + UPDATE in one RPC). Existing rails meant minimal new code.

---

*End of EXECUTION_REPORT.*
