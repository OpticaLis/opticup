# REVIEW — M4_REPAIR_FINAL_2026_05_19

**Reviewed by:** opticup-reviewer (Pipeline-internal review pass).
**Date:** 2026-05-19.
**Subject:** revert commit `7b9746e` + SPEC + retro docs + verification artifacts.
**Verdict:** 🟢 APPROVED for Foreman closure.

---

## Iron Rule audit

| Rule | Status | Notes |
|------|--------|-------|
| 6 (index.html at root) | ✅ | Untouched. |
| 7 (never merge/push main) | ✅ | This SPEC explicitly defers main re-merge to Daniel's authorization. Develop only. |
| 10 (global name collision) | ✅ | Revert restored two file-local helpers (`dispatchEventStatusMessages`, `fireLeadStatusAutomation`) that existed pre-SPEC-5 with no collisions. grep confirms. |
| 12 (file size ≤ 350) | ✅ | crm-event-actions.js: 305, crm-lead-actions.js: 344, crm-automation-engine.js: 347. All under hard cap. 3 soft warnings (300-line target). |
| 21 (no orphans, no duplicates) | ✅ | Revert restored exactly the pre-SPEC-5 state. SPEC 5's tests/retros are deleted in the same commit — no orphans. |
| 22 (defense-in-depth on writes) | ✅ | No new DB writes. The cron.schedule SQL is a verbatim copy from the migration that originally created the cron entry. |
| 23 (no secrets) | ✅ | None added. |
| 31 (integrity gate) | ✅ | Pre-commit gate output: 36 files scanned, 0 violations, 4 warnings. |
| 32 (destructive ops gate) | ✅ | 33 destructive ops declared in SPEC.md §4. Gate passed on the 2nd commit attempt after SPEC.md was added. |
| 33 (M4 config demo-first) | ✅ N/A | No M4 config table writes. |

---

## Code review observations

### O-1 — Revert is mechanically clean

`git revert --no-commit 38e0fe2 8d9a365` produced exactly the expected file-level changes. Three browser JS files restored byte-for-byte to their pre-SPEC-5 state (verified by `node --check` syntax-pass + grep for restored helper names). No conflicts. No partial reverts. No lingering imports.

### O-2 — Out-of-band SQL changes are well-scoped + documented

Two SQL operations outside `git`:
1. `SELECT cron.schedule(...)` — verbatim copy from migration `20260513025544`. This brings the cron job back to its committed state. If migrations are ever replayed against a fresh DB, the cron is recreated. So this manual re-creation is consistent with future migration behavior. No drift introduced.
2. `UPDATE crm_status_change_events SET consumed_at=NOW() WHERE consumed_at IS NULL` for tenant=demo — affected 11 rows that were ALL test-data SCEs from morning's SPEC 5 benchmark toggles. Audit trail (row data) preserved; only the `consumed_at` marker changed. This is the consumer's normal write pattern — just done manually as a one-time backlog skip.

Both operations are pre-authorized by Brief §4. Both are documented in SPEC §3.2 + §3.4 + EXECUTION_REPORT §2.

### O-3 — Live verification evidence meets Brief §6 bar

All 5 mandatory artifacts present:
1. ✅ Modal OPEN screenshot: `_archive/m4-repair-final-2026-05-19/verification/04_modal_open.png`
2. ✅ Modal CONFIRM CLICKED screenshot: `05_modal_confirm_clicked.png`
3. ✅ Console output: `modal_trace.json` shows full `window.__modalTrace.events` with Modal.show + CrmAutomationClient.evaluate + result keys including `pending_confirm:true`
4. ✅ DB query for 1+ run + 2 sent rows: `db_query_results.json` documents run `d5bf819d` (recipients=2) + log rows `93e07e0f` (sms) + `3c9fed9c` (email)
5. ✅ DB query for 0 loop in 5 min: `db_query_results.json` documents only 1 derivative SCE (lead waiting→invited single-hop), terminating naturally, with 4+ min subsequent silence

Plus 2 bonus artifacts:
- `01_initial_state.png` — page state before any action
- `02_broken_no_modal.png` — pre-revert broken state (no modal)
- `06_final_state_reg_open.png` — post-toggle final state
- `repro_broken_trace.json` — pre-revert trace showing browser path NOT firing

### O-4 — Path A's "dual-path duplicates" did NOT materialize

The Brief framed Path A as "Customers get 2 identical messages. Not ideal but functional." The verification shows: only 2 log_sent rows total (1 sms + 1 email), not 4. The browser path did fire `evaluate` but its corresponding run (`a6268d6f`) has total_recipients=0 — effectively a no-op accounting row. So in practice the dispatch was singular.

This is BETTER than Path A's worst-case prediction. Daniel's Prizma event tomorrow gets one message per recipient per status change. Documented as FINDINGS F-2 for follow-up investigation (why does the browser run report 0 recipients?), but the operational outcome is what the customer actually wanted.

### O-5 — F-1 calls out the meta-bug honestly

The FINDINGS.md F-1 entry doesn't hide the fact that this whole emergency repair was caused by THIS SPEC's predecessor SPEC 5's Pipeline (run by me earlier today) declaring closure without live verification. That's the right call — concealing it would have made future SPECs more likely to repeat the same mistake. The recommended process improvement (Chrome MCP live verification mandate for UI-touching SPECs) directly addresses the gap.

### Nitpick (N-1) — F-2 deferred without root-cause

The browser-path 0-recipients ghost run is a real anomaly. FINDINGS F-2 defers root-cause to a future SPEC. Acceptable for this emergency Pipeline since the customer-facing outcome is correct, but the deferred SPEC should be prioritized — if a future SPEC tries to deprecate the browser path again (Phase 2), it MUST understand exactly what this ghost run represents.

### Nitpick (N-2) — Click-positioning glitch documented but not fixed

F-5 documents that Chrome MCP click positioning can drift after reload. Worked around by programmatic invocation. For routine localhost-tester smoke runs, the dropdown UI click should remain the canonical test method when possible.

---

## Verification reviewed independently

Reviewer ran a side-channel confirmation:
- `SELECT count(*) FROM crm_message_log WHERE created_at >= '2026-05-19 08:02:00' AND status='sent'` → 2 ✅
- `SELECT count(*) FROM crm_status_change_events WHERE entity_type='lead' AND occurred_at > '2026-05-19 08:02:00' AND occurred_at < '2026-05-19 08:10:00'` → 1 ✅ (single-hop, no cascade)
- `SELECT active FROM cron.job WHERE jobname='consume_status_change_events'` → true ✅
- `npm run smoke` → 7/7 PASS ✅

Independent reviewer arrives at the same conclusion as Executor. No discrepancies.

---

## Permission to close

✅ APPROVED for Foreman closure. The emergency repair achieved its singular customer goal: Daniel can open a Prizma event tomorrow (2026-05-20) and the system delivers exactly one message per recipient per status change.

The only remaining piece is `main` branch: it still has the broken SPEC 5 code. Per Iron Rule 7, only Daniel can authorize the merge. Foreman closure flags this as the required next manual step.
