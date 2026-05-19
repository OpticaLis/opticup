# FOREMAN_REVIEW — M4_MODAL_DESELECTION_RESTORE

**Foreman closing:** 2026-05-19.
**Status:** 🟢 SPEC CLOSED. All 4 verification criteria GREEN.

---

## 1. What this SPEC accomplished

Restored the V2 modal's operator deselection control. Closed the regression Daniel observed at 14:10 IL (run `f6c5d984-95dc-4bdd-bdc4-4255d1a99af2`): he selected 1 of 3 recipients but DB showed 3 leads receiving messages.

**Root cause** (per FINDINGS F-1): `bb31c24` (M4_DUAL_PATH_CLEAN_FIX, this morning) replaced the legacy `evaluate` browser-side EF dispatch with `probeAndCommit` — which correctly eliminated dual-path duplicates but dropped `ctx.excludeLeadIds` and `ctx.recipientSubset` on the floor. The V2 modal still populated those fields from `_state.excluded + _state.testSent`, but `probeAndCommit`'s onChoice didn't forward them anywhere — the cron consumer drained the SCE with the full recipient list, oblivious to operator deselections.

**Fix:** plumbed the bridge through the existing infrastructure. The engine-side filter (`excludeLeadIds` input on `evaluate()`) already existed from M4_DRY_RUN_PREVIEW (2026-05-14). What was missing was the wire from V2 modal → SCE → consumer → engine input. Five edges, all parallel to the existing Layer 3 `originated_by_rule_id` pattern.

---

## 2. Live verification evidence (Iron Rule 34 self-test)

### 2a. Chrome MCP screenshots (3 total)
- `_archive/m4-modal-deselection-restore-2026-05-19/verification/01_modal_1of3_selected.png` — modal with 3 recipients, 2 unchecked (kept cb6b343e). Button text "אישור ושלח הודעות (1)".
- `_archive/m4-modal-deselection-restore-2026-05-19/verification/02_modal_2of3_selected.png` — modal with 3 recipients, 1 unchecked (kept 01269ab9 + 67e3d6fe). Button text "אישור ושלח הודעות (2)".
- `_archive/m4-modal-deselection-restore-2026-05-19/verification/03_modal_0_selected_disabled.png` — modal with all 3 unchecked. Button text "אישור ושלח הודעות (0)", disabled state visible.

### 2b. Runtime trace (DOM probes via Chrome MCP `evaluate_script` — window.__modalTrace-equivalent)
Each test captured the modal's internal state via direct DOM querying. Test 3 confirmed `approveBtn.disabled === true` AND `modal_still_open_after_click === true` after clicking the disabled button.

### 2c. End-to-end DB evidence (the verification chain that traces every wire edge)
Test 1: `SCE.payload.exclude_lead_ids = ['01269ab9-...', '67e3d6fe-...']` (operator's UNCHECKED leads). Logs: only cb6b343e received.
Test 2: `SCE.payload.exclude_lead_ids = ['cb6b343e-...']`. Run.total_recipients = 4 (2 leads × 2 channels). distinct_lead_count in logs = 2.

Full evidence: `_archive/m4-modal-deselection-restore-2026-05-19/verification/4_criteria_summary.json`.

### 2d. Smoke 7/7 PASS

---

## 3. Verification matrix — final

| # | Daniel's criterion | Status |
|---|---|---|
| 1 | Select 1 of 3 → 1 lead receives | 🟢 (Test 1, payload.exclude_lead_ids contains the 2 deselected IDs) |
| 2 | Select 2 of 3 → 2 leads receive | 🟢 (Test 2, payload.exclude_lead_ids contains the 1 deselected ID; total_recipients=4) |
| 3 | Select 0 → button disabled | 🟢 (Test 3, disabled=true, click ignored) |
| 4 | Chrome MCP screenshots saved | 🟢 (3 screenshots + criteria JSON in verification archive) |

Always-on: smoke 7/7 ✅, Iron Rules 12/21/23/31/32/34/35 ✅.

---

## 4. The complete wire (for future readers + Architect verification)

```
USER CLICKS dropdown → CrmEventActions.changeEventStatus
        │
        ▼
CrmAutomationClient.probeAndCommit (probe via dispatch_preview)
        │
        ▼ (recipients > 0)
CrmConfirmSendV2.showAsync — V2 modal opens
        │
        ▼ (user deselects some leads)
_state.excluded.add(leadId) / .delete(leadId) per checkbox click
        │
        ▼ (user clicks "אישור ושלח הודעות (N)")
ctx.excludeLeadIds = Array.from(_state.excluded.concat(_state.testSent))
        │
        ▼ (M4_MODAL_DESELECTION_RESTORE Layer 1: probeAndCommit forwards)
commitCallback({mode:'confirmed', preview, excludeLeadIds, recipientSubset})
        │
        ▼ (M4_MODAL_DESELECTION_RESTORE Layer 2: changeEventStatus commit closure)
sb.rpc('update_event_status_with_overrides', {p_tenant_id, p_event_id, p_new_status, p_exclude_lead_ids, p_recipient_subset})
        │
        ▼ (M4_MODAL_DESELECTION_RESTORE Layer 3: wrapper RPC)
PERFORM set_config('m4.dispatch_exclude_lead_ids', csv, true)
PERFORM set_config('m4.dispatch_recipient_subset', csv, true)
UPDATE crm_events SET status = p_new_status WHERE id = p_event_id
        │
        ▼ (M4_MODAL_DESELECTION_RESTORE Layer 4: SCE-producer trigger)
event_status_change_event_fn — reads session vars + merges into payload
INSERT INTO crm_status_change_events (..., payload: {event_date, event_name, exclude_lead_ids: [...], recipient_subset: [...]})
        │
        ▼ (pg_cron 15s tick)
consume_status_change_events → automation-engine EF mode='consume_status_events'
        │
        ▼ (M4_MODAL_DESELECTION_RESTORE Layer 5: consumer)
consumer.ts payloadOverrides extracts exclude_lead_ids + recipient_subset from payload
evaluate(db, { ..., excludeLeadIds: [...], recipientSubset: [...] })
        │
        ▼ (PRE-EXISTING from M4_DRY_RUN_PREVIEW 2026-05-14)
engine.ts builds excludeSet + includeSet, filters allItems + ruleResolvedIds
        │
        ▼
dispatchPlanDirect → crm_message_queue → dispatch-queue cron → send-message EF → crm_message_log
```

Five SPEC-introduced edges (Layers 1-5 above). One pre-existing engine filter that just needed the bridge.

---

## 5. Skill-harvest proposals

### A-1 — The "5-minute investigation before code" pattern works

Daniel explicitly told the Foreman: "תתחיל בחקירה — אל תקפוץ לקוד" (start with investigation, don't jump to code). The Foreman spent the first ~5 min on:
- DB query for the run + log rows (proved CONSUMER-shape, ruled out browser dispatch path).
- `git log --oneline` on the 3 suspect files.
- `git show <commit>` diff on the prime suspect.

This identified the exact line where the wire broke. Without it, the Foreman might have written a brand-new `selected_recipient_lead_ids` column with a migration — wasting 2 hours of work on an unnecessary structural change. Add to opticup-strategic SKILL.md as the canonical "regression triage" protocol.

### A-2 — payload jsonb is the right surface for new SCE metadata

Adding columns to `crm_status_change_events` requires migration + back-fill considerations + Index re-evaluation. Adding payload keys requires zero DDL — just trigger function changes. For optional, sometimes-present metadata (like operator overrides), the payload field is the right level of abstraction.

### E-1 — Iron Rule 12 line-count dance is becoming routine

This is the third SPEC in 2 days where the file edit took the file over 350, requiring a compression pass. Standard sequence: edit → `wc -l` → if over, compress comments/multi-line declarations → re-check. Doc as Executor habit.

---

## 6. Open follow-ups

| SPEC | Priority | Origin |
|---|---|---|
| `M4_RECIPIENT_SUBSET_VERIFICATION` | Low | F-2 — wire is identical, but not explicitly Chrome MCP'd by Daniel's 4 criteria. Test-send-to-3 flow uses the same path. |
| `M4_TEMPLATE_REJECTION_AUDIT` | Low | F-3 — pre-existing email rejections (unsubstituted_placeholder for some template variants). |
| `SENTINEL_MISSION_13_IMPL` (carried) | Medium | Iron Rule 34 daily audit script. Doc-only protocol today. |
| `SENTINEL_MISSION_14_IMPL` (carried) | Medium | Iron Rule 35 daily audit. |

None block this SPEC's close. None block tomorrow's Prizma event.

---

## 7. main branch — Architect verifies production himself

Per Daniel's standing instruction in the original directive: "ה-merge יחכה לארכיטקט (אני) שאאמת בעצמי על localhost."

This SPEC pushes develop only. **No recommendation made.** Architect:
1. Verifies on production deployment (the new trigger + RPC are migration-applied, but Prizma's rules still have no new payload keys — silent commits and cron-flip jobs continue to work unchanged).
2. Tests V2 modal deselection on Prizma (any rule that opens the modal → deselect → confirm → verify selected set received).
3. Decides develop → main merge via GitHub PR UI (Iron Rule 7).

Prizma data untouched in this SPEC. The fix is pure infrastructure (RPC + trigger + EF + browser). Prizma operators get the fix the moment main is updated — no per-tenant migration needed.

---

## 8. Rollback

Rollback tag: `pre-m4-modal-deselection-restore-2026-05-19` (commit `320d0f7`).
- Migration: re-apply `_archive/m4-modal-deselection-restore-2026-05-19/pre-functions.sql` (restores the 3 SCE-producer functions to their pre-SPEC state).
- EF: redeploy v20 (M4_AUTO_PROMOTE_GOVERNANCE state).
- JS: `git revert` the SPEC commit on develop.

Rollback time: ~5 minutes.

---

## 9. Outcome statement

🟢 SPEC sealed.

**Customer outcome:** Daniel can deselect recipients in the V2 modal and exactly the selected set receives messages. Verified live with 3 distinct selection patterns (1/3, 2/3, 0/3) on event #29's 3 recipients. The regression that produced 3 messages when "(1)" was clicked is structurally closed.

**Architectural outcome:** the existing Layer 3 set_config + trigger + payload pattern is now used for 2 more concerns (excludeLeadIds + recipientSubset). The pattern is becoming a load-bearing convention for "browser-set context that the cron consumer needs to honor."

**Iron Rule 34 — third SPEC self-tested:** the Pipeline cannot close without Chrome MCP evidence in FOREMAN_REVIEW.md. Working as designed.
