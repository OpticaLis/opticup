# SPEC — M4_MODAL_DESELECTION_RESTORE

**Authored by:** opticup-strategic (Foreman role).
**Date:** 2026-05-19.
**Trigger:** Daniel observed run `f6c5d984-95dc-4bdd-bdc4-4255d1a99af2` at 11:09:43 UTC (14:10 IL): selected 1 of 3 recipients in V2 modal, button showed "(1)", but DB has 5 log rows across **3 distinct lead_ids** (01269ab9, cb6b343e, 67e3d6fe). Deselections ignored.
**Pipeline mode:** Full-Auto with Chrome MCP live verification (Iron Rule 34).

---

## 0. Investigation summary (the root cause)

The legacy `CrmAutomationClient.evaluate` function in `crm-automation-client.js` passed both `exclude_lead_ids` and `recipient_subset` from `ctx` to the EF `mode='dispatch'` call:
```js
exclude_lead_ids: (ctx && Array.isArray(ctx.excludeLeadIds)) ? ctx.excludeLeadIds : [],
recipient_subset: (ctx && Array.isArray(ctx.recipientSubset)) ? ctx.recipientSubset : []
```

M4_DUAL_PATH_CLEAN_FIX (commit `bb31c24`, 2026-05-19) introduced `probeAndCommit` and routed all status-change browser callers through it. The Layer 1 design eliminated the browser-side EF dispatch call entirely — the browser now only commits status. The cron consumer dispatches.

The new `probeAndCommit`'s `onChoice` callback receives `ctx.excludeLeadIds` (V2 modal still populates it from `_state.excluded + _state.testSent`) but **does not pass it anywhere**:
```js
CrmConfirmSendV2.showAsync(previewPromise, async function (choice, ctx) {
  ...
  var data = await commitCallback({ mode: 'confirmed', preview: (ctx && ctx.previewResponse) || null });
  // ↑ ctx.excludeLeadIds dropped on the floor
```

Run `f6c5d984` evidence: `trigger_data` is CONSUMER-shape (has `_origin_rule_id`, flat fields) — meaning the run came from the cron consumer path with no operator override. The consumer drains the SCE oblivious to V2 modal selections.

**The infrastructure to filter already exists** — `engine.ts evaluate()` has `excludeLeadIds` / `recipientSubset` inputs (M4_DRY_RUN_PREVIEW 2026-05-14). What broke is the bridge from V2 modal → SCE → consumer → evaluate.

Daniel's hint ("ייתכן שהיה כבר שדה קיים") was correct: `engine.ts` already accepts `excludeLeadIds` as a top-level input. The break is purely in the plumbing.

---

## 1. Pre-flight (executed 2026-05-19T11:29Z)

| Check | Result |
|---|---|
| develop HEAD | `320d0f7` (M4_AUTO_PROMOTE_GOVERNANCE closed) |
| Smoke 7/7 | ✅ PASS |
| Pipeline lock | ✅ claimed `pid-11540-4bf32a9d.lock` |
| Crons (15s) | ✅ both active (verified earlier in session) |

---

## 2. The fix — 4-edge bridge

The SCE `payload jsonb` field already carries entity-specific data (e.g., `{event_date, event_name}`). Extend it with two new keys, populated by the SCE-producer triggers via transaction-local session vars set by a new wrapper RPC. Consumer extracts them and forwards to `evaluate`'s existing inputs.

NO new DB columns. NO migration of existing rows. Same minimal-surface approach as Layer 3's `originated_by_rule_id` pattern.

### Edge 1 — DB session vars + wrapper RPC

New session vars: `m4.dispatch_exclude_lead_ids` (csv) + `m4.dispatch_recipient_subset` (csv).

New RPC `update_event_status_with_overrides(p_tenant_id uuid, p_event_id uuid, p_new_status text, p_exclude_lead_ids uuid[], p_recipient_subset uuid[])`:
- Sets both session vars via `set_config(..., true)`.
- Runs `UPDATE crm_events SET status = p_new_status WHERE id = p_event_id AND tenant_id = p_tenant_id`.

(Mirrors the `update_lead_status_with_origin` pattern from M4_DUAL_PATH_CLEAN_FIX Layer 3.)

### Edge 2 — 3 SCE-producer trigger functions

`event_status_change_event_fn`, `lead_status_change_event_fn`, `attendee_status_change_event_fn`: each reads `current_setting('m4.dispatch_exclude_lead_ids', true)` + `m4.dispatch_recipient_subset`. If non-empty, parses csv → uuid[], merges into the existing payload jsonb under keys `exclude_lead_ids` and `recipient_subset`. NULL-safe; absent vars = absent payload keys (no behavior change for callers that don't set the vars).

### Edge 3 — Consumer.ts

`buildTriggerDataForEntity` extracts `payload.exclude_lead_ids` + `payload.recipient_subset` and forwards them. `consumeStatusChangeEvents` passes them as TOP-LEVEL `excludeLeadIds` / `recipientSubset` to `evaluate(...)` (NOT inside triggerData — engine reads them from input.excludeLeadIds).

### Edge 4 — Browser plumbing

`probeAndCommit`'s `onChoice` callback collects `ctx.excludeLeadIds` + `ctx.recipientSubset` and passes them to `commitCallback` as part of `meta`. `changeEventStatus`'s commit closure: if either array is non-empty, call the new `update_event_status_with_overrides` RPC. If both empty, keep the existing direct `UPDATE crm_events SET status` (no behavior change for silent path or no-deselection path).

### Edge 5 — V2 modal UX (Daniel criterion 3)

`refreshFooterLabels`: `approveBtn.disabled = (remaining <= 0)`. Tiny addition; prevents the user from confirming with 0 selected.

---

## 3. Steps

1. Pre-flight (done — §1).
2. Author this SPEC.
3. Migration: add wrapper RPC + 3 trigger function rewrites. Apply to demo via apply_migration.
4. Edit `consumer.ts`: extract payload overrides + pass to evaluate.
5. EF deploy via supabase CLI (multi-file).
6. Edit `crm-automation-client.js` `probeAndCommit`: forward ctx → meta.
7. Edit `crm-event-actions.js` `changeEventStatus`: commit closure picks RPC vs direct UPDATE based on meta.
8. Edit `crm-confirm-send-v2.js` `refreshFooterLabels`: disable button at 0.
9. Chrome MCP live verification: 1-of-3 selection → 1 lead receives, 2-of-3 → 2 leads, 0 → disabled button.
10. Update `M4_INFRASTRUCTURE_CONTRACT.md` with payload schema additions.
11. Retro docs (Iron Rule 34 requires Chrome MCP refs in FOREMAN_REVIEW.md).
12. Single commit + push develop. NO main merge.

---

## 4. Destructive Operations

1. `CREATE OR REPLACE FUNCTION update_event_status_with_overrides(...)` — new RPC.
2. `CREATE OR REPLACE FUNCTION event_status_change_event_fn()` — adds payload merge.
3. `CREATE OR REPLACE FUNCTION lead_status_change_event_fn()` — same.
4. `CREATE OR REPLACE FUNCTION attendee_status_change_event_fn()` — same.
5. Edit `supabase/functions/automation-engine/consumer.ts` — top-level evaluate inputs.
6. Deploy edge function `automation-engine` v21.
7. Edit `modules/crm/crm-confirm-send-v2.js` — refreshFooterLabels button disable.
8. Edit `modules/crm/crm-automation-client.js` — forward ctx to commitCallback meta.
9. Edit `modules/crm/crm-event-actions.js` — commit closure with override RPC.
10. New `supabase/migrations/20260519130000_m4_modal_deselection_restore.sql`.
11. New SPEC folder + retros + Brief + verification archive.
12. Edit `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` — payload schema docs.

NO Prizma row writes. NO writes to `crm_message_log` / `crm_message_queue` outside the normal cron flow.

---

## 5. Verification Criteria (Daniel — 4 criteria + always-on)

1. **Select 1 of 3** in V2 modal → 1 lead receives messages (exactly 2 log_sent rows: sms + email).
2. **Select 2 of 3** → 2 leads × 2 channels = 4 log_sent rows.
3. **Select 0** → "אישור ושלח הודעות (0)" button is **disabled**; user cannot confirm.
4. **Chrome MCP screenshots saved** to `_archive/m4-modal-deselection-restore-2026-05-19/verification/` (Iron Rule 34).

Always-on:
- Smoke 7/7 PASS.
- Iron Rules 12/21/23/31/32/34/35 enforced via pre-commit.

---

## 6. Rollback

Rollback tag: `pre-m4-modal-deselection-restore-2026-05-19` on commit `320d0f7`.

- Migration rollback: revert the 4 function definitions to their pre-SPEC state (snapshots saved to `_archive/m4-modal-deselection-restore-2026-05-19/pre-functions.sql`).
- EF rollback: redeploy v20 (M4_AUTO_PROMOTE_GOVERNANCE state) via supabase functions deploy of the previous source.
- JS rollback: `git revert` the SPEC commit on develop.

---

## 7. Out of Scope

- **Test-send-to-3 flow** (`ctx.recipientSubset`): plumbed symmetrically with `exclude_lead_ids` but not explicitly verified by Daniel's 4 criteria. The same wire works for both. Verification of recipient_subset deferred to a future Chrome MCP smoke if needed.
- Prizma sync of any rule config (none changes; this SPEC is pure plumbing).

---

*End of SPEC.*
