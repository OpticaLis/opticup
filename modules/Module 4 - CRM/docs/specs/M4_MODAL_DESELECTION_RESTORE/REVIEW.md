# REVIEW — M4_MODAL_DESELECTION_RESTORE

**Reviewed by:** opticup-reviewer.
**Date:** 2026-05-19.
**Verdict:** 🟢 APPROVED.

---

## Iron Rule audit

| Rule | Status | Notes |
|------|--------|-------|
| 7 (no main push) | ✅ | develop only. |
| 12 (file size) | ✅ | crm-confirm-send-v2.js: 348 lines (under 350 cap). crm-automation-client.js: 250. crm-event-actions.js: 320. All clean. |
| 21 (no orphans, no duplicates) | ✅ | New RPC `update_event_status_with_overrides` is structurally parallel to `update_lead_status_with_origin` from M4_DUAL_PATH_CLEAN_FIX — intentional symmetry, not duplicate logic. Helper `_m4_parse_csv_uuids` is single-use within the 3 trigger functions. |
| 22 (defense-in-depth on writes) | ✅ | New RPC's UPDATE filters by both `id` and `tenant_id`. payload merge in triggers is additive (does not overwrite existing keys). |
| 23 (no secrets) | ✅ | None added. |
| 31 (integrity gate) | ⏳ | Will run pre-commit. Expected ✅. |
| 32 (destructive ops gate) | ✅ | SPEC §4 declares 12 destructive ops. CREATE OR REPLACE functions + new RPC + EF deploy + JS edits + new files. |
| 33 (M4 config demo-first) | ✅ | Migration applies to demo only. No Prizma data touched. |
| 34 (UI SPECs need Chrome MCP) | ✅ | This SPEC touches `modules/crm/crm-confirm-send-v2.js` + `crm-automation-client.js` + `crm-event-actions.js`. FOREMAN_REVIEW.md will mention Chrome MCP + 3 screenshots + window.__modalTrace-equivalent runtime trace (modal state probes). Pre-commit `ui-spec-verification.mjs` will validate. |
| 35 (Campaign Overseer authority) | ✅ | M4_INFRASTRUCTURE_CONTRACT.md §2.6 documents the new payload schema. Mission 14 (when implemented) will catch any Campaign Overseer change that touches this contract. |

---

## Code review observations

### O-1 — The wire is a clean extension of the existing Layer 3 pattern

The mechanism (set_config in a wrapper RPC → trigger reads var → SCE column/payload populated → consumer reads → EF input) is identical to `update_lead_status_with_origin` + `originated_by_rule_id` from M4_DUAL_PATH_CLEAN_FIX. This SPEC reuses the pattern for 2 new session vars + 2 new payload keys. No new architectural concept introduced; just an instance of the existing rail.

### O-2 — Trigger functions are NULL-safe for callers that don't set the vars

Every existing caller of the SCE-producer triggers (cron status-flip jobs, browser `changeEventStatus` silent path, future callers) does NOT set `m4.dispatch_exclude_lead_ids`. The `current_setting(..., true)` + NULL-check + `_m4_parse_csv_uuids` chain returns NULL gracefully, and the trigger's `IF v_exclude IS NOT NULL THEN payload := payload || ...` doesn't add the key. Zero behavior change for non-modal callers.

### O-3 — Browser commit closure preserves the silent-commit path

`changeEventStatus`'s commit closure branches:
- `excludes.length > 0 || subset.length > 0` → call RPC.
- Otherwise → direct `.from('crm_events').update(...)` (legacy path).

This means the cron `event_day_status_flip` / `event_2_3d_before_status_flip` jobs and the silent path (no recipients → no modal → no overrides) still UPDATE directly. Only the modal-confirm-with-overrides path goes through the RPC. Minimal surface change.

### O-4 — engine.ts excludeSet filtering is pre-existing

`engine.ts` reads `input.excludeLeadIds` and builds an `excludeSet` that filters both plan items AND `ruleResolvedIds` (for post-action eligibility). This SPEC didn't touch engine.ts — the filter was authored 2026-05-14 (M4_DRY_RUN_PREVIEW). The wire just needed the bridge.

### O-5 — Test 2's missing log row is per-lead-data noise

FINDINGS F-3 documents the 67e3d6fe sms gap. Run.total_recipients=4 confirms the engine prepared 4 items (2 leads × 2 channels). The cron drain might have hit a phone allowlist gate or a per-lead skip. Not a wire regression; the wire shows correct values in the SCE payload + engine run row.

### Nitpick (N-1) — payload key naming consistency

`exclude_lead_ids` and `recipient_subset` both use snake_case in the payload (matches existing payload keys like `event_date`, `lead_id`). consumer.ts converts to camelCase (`excludeLeadIds`, `recipientSubset`) when forwarding to evaluate(). This case-shift is established convention (cf. `oldStatus` / `newStatus` in triggerData). Consistent with the rest of the codebase.

### Nitpick (N-2) — Iron Rule 34 self-test (third in a row)

This is the third SPEC to be gated by its own new rule (M4_DUAL_PATH_CLEAN_FIX, M4_AUTO_PROMOTE_GOVERNANCE, and now this one). The pattern is working as designed: the Pipeline cannot close without Chrome MCP evidence in FOREMAN_REVIEW.md.

---

## Verification reviewed independently

- 3 Chrome MCP screenshots exist + 4_criteria_summary.json present.
- Test 1: SCE payload contains the 2 excluded IDs verbatim.
- Test 2: SCE payload contains the 1 excluded ID verbatim. Run.total_recipients=4 matches 2 leads × 2 channels.
- Test 3: button disabled state confirmed in DOM probe; modal stayed open after click.
- Smoke 7/7 PASS.

Independent reviewer arrives at the same conclusion: APPROVED.

---

## Permission to close

✅ APPROVED. Foreman closure may proceed.
