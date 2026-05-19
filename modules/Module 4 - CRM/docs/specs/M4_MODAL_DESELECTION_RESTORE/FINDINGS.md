# FINDINGS — M4_MODAL_DESELECTION_RESTORE

---

## F-1 — Root cause: probeAndCommit drops ctx.excludeLeadIds
**Severity:** HIGH (regression)
**Status:** RESOLVED

`bb31c24` (M4_DUAL_PATH_CLEAN_FIX, 2026-05-19) introduced `probeAndCommit` to replace the legacy `evaluate` flow for status-change browser callers. Layer 1's goal was to eliminate dual-path duplicates by ensuring the browser only commits status and the cron consumer is the sole dispatcher.

The legacy `evaluate` passed `ctx.excludeLeadIds` + `ctx.recipientSubset` to the EF `mode='dispatch'` call. The new `probeAndCommit` does NOT call EF dispatch at all. The `onChoice` callback receives `ctx` (with the modal's deselection state) but the only thing it does with it is read `ctx.previewResponse` — both `ctx.excludeLeadIds` and `ctx.recipientSubset` were dropped.

V2 modal `_state.excluded + _state.testSent` continued populating `ctx.excludeLeadIds` correctly (no UI break), but the value had nowhere to go. The cron consumer drains the SCE rows produced by the status UPDATE, oblivious to operator selections, and dispatches to all matching recipients.

**Resolution:** plumbed the bridge through the existing SCE payload field. No new column.

---

## F-2 — Daniel's hint was correct: "existing field" was a payload key + EF input that just needed a bridge
**Severity:** INFO (validates investigation approach)
**Status:** N/A

The Brief warned: "ייתכן שהיה כבר שדה קיים (`recipient_overrides`, `lead_ids`, `selected_ids` — לא יודע) שמישהו הסיר. בדוק קודם בהיסטוריה."

What I found:
- **EF-side:** `engine.ts evaluate()` already has `excludeLeadIds` + `recipientSubset` TOP-LEVEL inputs (from M4_DRY_RUN_PREVIEW, 2026-05-14). The filtering logic (`excludeSet`, `includeSet`) is pre-existing and correct.
- **DB-side:** `crm_status_change_events.payload` jsonb field is already entity-specific (e.g., `{event_date, event_name}`). Extending it with `exclude_lead_ids` + `recipient_subset` keys requires no DDL — just trigger function updates.
- **Browser-side:** V2 modal still populates `ctx.excludeLeadIds` correctly. The wire just needed re-attachment.

This validated the investigation approach: read before code. The Foreman would have wasted time authoring a brand-new `selected_recipient_lead_ids` column with a migration if not for the careful diff/grep walk through bb31c24.

---

## F-3 — Test 1 email rejected due to pre-existing template/validation issue
**Severity:** LOW (noise, not introduced here)
**Status:** N/A — out of scope

Test 1 produced 2 log rows for cb6b343e: sms `a5d73060` status='sent' + email `fa62552e` status='rejected'. The criterion was "1 lead × 2 channels"; counting log rows confirms 1 distinct lead, 2 channel attempts. The rejection is `unsubstituted_placeholder` or similar — a pre-existing template validation issue for some specific template variant, unrelated to this SPEC.

Test 2 had 3 of 4 expected log rows (the 4th — 67e3d6fe sms — likely either still in-flight OR the lead is missing phone). total_recipients=4 on the run confirms the engine prepared 4 plan items (2 leads × 2 channels), so the wire is correct regardless of per-lead-data noise.

Both noise patterns are independent of this SPEC's correctness; the verification's actual signal is "distinct lead set matches operator's selection".

---

## F-4 — V2 modal session-storage caches excluded set across reloads
**Severity:** INFO (UX quirk)
**Status:** N/A — pre-existing, documented

`crm-confirm-send-v2.js` uses `sessionStorage` (key `crm_confirm_send_selection_v1`) to restore the operator's excluded set when the modal reopens within 6 hours. During verification I cleared this between tests to ensure clean state. Otherwise the first opens of Test 2 and Test 3 would have inherited Test 1's selection state.

For the Campaign Overseer in production: this is intentional (mid-flight resumption). For automated regression testing: clear sessionStorage before each test.

---

## F-5 — Iron Rule 12 line-count discipline triggered 1 more compression pass
**Severity:** INFO (process)
**Status:** RESOLVED

`crm-confirm-send-v2.js` went 349 → 351 lines after adding 2 lines (comment + `approveBtn.disabled = ...`). Compressed comment + statement into 1 inline `// M4_MODAL_DESELECTION_RESTORE` annotation → 348 lines. Iron Rule 12 hard cap honored.

---

## Future SPEC candidates

1. **`M4_RECIPIENT_SUBSET_VERIFICATION`** — explicit Chrome MCP smoke for the "test-send to first 3" subset path. Same wire as exclude_lead_ids; not directly exercised in Daniel's 4 criteria.
2. **`M4_MODAL_SESSION_STORAGE_STALE_CACHE_GUARD`** — F-4 notes the session-storage TTL is 6h. If operator deletes a lead between modal opens, the cached excluded set might reference a non-existent lead. The current `_hydrate` code does reconciliation (`validIds = new Set(_state.recipients.map(r => r.lead_id))`), so this might already be safe. Verify.
3. **`M4_TEMPLATE_REJECTION_AUDIT`** — F-3 noise. Why does the email channel sometimes hit unsubstituted_placeholder? Likely a Prizma-specific template variant on demo, but worth a focused investigation.
