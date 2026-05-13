# Morning Summary — M4_DRY_RUN_PREVIEW_AND_DISPATCH

**Date:** 2026-05-14 morning (Pipeline ran overnight)
**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_DRY_RUN_PREVIEW_AND_DISPATCH_BRIEF.md`
**SPEC:** `modules/Module 4 - CRM/docs/specs/M4_DRY_RUN_PREVIEW_AND_DISPATCH/`
**Pipeline:** Full Auto Pipeline, single Claude Code chat, Opus 4.7 1M context
**Master safety tag:** `pre-dry-run-preview-2026-05-14` at commit `6e64118`

---

## Pipeline verdict: 🟢 GREEN — recommend merge to main contingent on Daniel's ~5-minute hands-on smoke

All 11 work areas from Brief §3 landed across 9 phases. Zero Prizma writes throughout. Zero `main` merges by the Pipeline (per Brief §4.9). The EF + DB + cancel chains are verified end-to-end on demo. The only deferred verification is the browser-DOM smoke for modal interactivity — captured at the end of `SMOKE_ARTIFACTS.md` with a concrete 8-step recipe (~5 minutes).

---

## Per-phase state

| Phase | Result | Commit |
|---|---|---|
| 1 — Discovery + UX sketch | ✅ MIGRATED | `ad3d0e6` (rolled into Phase 2 commit) |
| 2 — EF `mode='dispatch_preview'` | ✅ MIGRATED | `ad3d0e6` |
| 3 — Modal scaffolding | ✅ MIGRATED | `50fe633` |
| 4 — Search + body preview + checkboxes | ✅ MIGRATED | `3800078` |
| 5 — Test-send to first 3 | ✅ MIGRATED | `d9d9ee8` |
| 6 — Queue-side cancellation | ✅ MIGRATED | `9abcf5c` |
| 7 — QoL — count progression + chips + history + session-save | ✅ MIGRATED | `e4e1330` |
| 8 — Regression smoke + retro | ✅ MIGRATED | `b5741a3` |
| 9 — Morning summary | ✅ MIGRATED | this commit |

**Total: 7 commits on develop, 0 on main.**

---

## What changed (high level)

1. **`automation-engine` EF v14 → v15 ACTIVE** (`verify_jwt=true` preserved per Brief §4.8 H-NEW-28-1 mitigation). New mode `dispatch_preview` returns recipient-grouped JSON with per-recipient final SMS + email bodies + last-message history + lead aggregates for chip filters. New optional `exclude_lead_ids` / `recipient_subset` parameters on existing `mode='dispatch'`.

2. **New CrmConfirmSendV2 modal** consumes the preview JSON. Server-authoritative bodies, in-list search, per-row checkbox, expand-on-click body view, 4 quick-filter chips (All / 30-day / no-prior-reg / Customers), test-send-to-first-3 with badge feedback, post-dispatch cancel toast with run_id-targeted UPDATE, sessionStorage selection persistence with 6h TTL + stale-id reconciliation.

3. **`CrmAutomationClient.evaluate` now branches**: if `CrmConfirmSendV2` is loaded, calls `mode='dispatch_preview'` first (modal opens in loading state immediately for incremental count display), then approves dispatch via `mode='dispatch'`. Legacy v1 path preserved for backward compatibility — the 5 existing legacy callsites continue working unchanged.

4. **No DDL**. `crm_message_queue.run_id` is reused as the broadcast_id per Brief §3.7. Each EF dispatch mints fresh `run_id` at `createRun`, so test-send rows live under their own run_id and are immune to the main broadcast's cancel.

---

## Top 3 takeaways

1. **MCP `deploy_edge_function` was clean this run.** No OPEN-021 InternalServerError despite multiple prior recurrences (April-May). `DEPLOY_FALLBACK_NEEDED.md` was NOT written. Sentinel finding F6 records this — future Briefs may want to soften the "OPEN-021 pattern persists" language.

2. **The Brief's `(or reuse existing concept)` for broadcast_id paid off.** `crm_message_queue.run_id` is already per-dispatch unique (verified: 2026-05-12 Prizma broadcast had 2292 rows under one run_id). Zero DDL needed. The Phase 6 cancel SQL is a single `UPDATE ... WHERE tenant_id=$tid AND run_id=$rid AND processed_at IS NULL`, RLS-protected.

3. **The legacy v1 modal stays. Decommission is now unblocked but deferred.** This run intentionally did NOT remove the 5 legacy `CrmAutomationClient.evaluate` callsites — Daniel's confirmation gate stayed canonical. The next Brief (`M4_LEGACY_DISPATCH_DECOMMISSION_v2`) is the natural successor: once the v2 modal is hands-on validated on demo and Prizma, the 5 callsites flip and v1 retires. The previous decommission attempt's blocker (queue path has no preview) is fully resolved.

---

## Daniel's hands-on smoke (recommended ~5 minutes before merge)

1. Open `http://localhost:3000/crm.html` → Events tab.
2. Pick a demo event in `registration_open` status (e.g., `אירוע מותגים - מאי 2026` event `4fdd7821-...`).
3. Flip its status to trigger the modal. **Expected:** modal opens immediately with "🔄 מחשב נמענים..." then resolves to the recipient list.
4. Try search — type Hebrew letters or digits, list narrows.
5. Click on a recipient name — body-expand panel shows SMS body + email HTML source + "📩 הודעה אחרונה" line.
6. Toggle the chip filters above the recipient list (All / 30 ימים אחרונים / ללא הרשמה לאירוע קודם / לקוחות).
7. Uncheck 1 recipient — count line + approve button update live.
8. Click "אישור ושלח הודעות" — modal closes; cancel toast appears with "ביטול שליחה" button + "X messages queued — delivering over ~Y minutes."
9. Click "ביטול שליחה" → confirm dialog → toast updates with "🟡 בוטלו K מתוך N. M כבר נשלחו."
10. Verify in DB: `SELECT status, error_message FROM crm_message_queue WHERE tenant_id='8d8cfa7e-...' AND run_id=<the_run_id> AND processed_at IS NULL` shows `cancelled` + `operator_cancelled`.

If all 10 steps green → **merge to main**. If any deviation → STOP and ping the next chat.

---

## Whether `M4_LEGACY_DISPATCH_DECOMMISSION_v2` is unblocked

✅ **YES.** The previous decommission Brief stopped because retiring the 5 legacy callsites would lose Daniel's operator-approval gate. This SPEC built that gate into the queue path. The next Brief can now propose flipping the 5 callsites from `CrmAutomationClient.evaluate` (which routes to v2 modal already today via the branch) to a queue-only path that surfaces preview via the same modal API. The v2 modal is the unified surface.

**However:** the natural progression is NOT a rush. Recommend Daniel wait 1-2 days of v2 modal use on Prizma production before authoring the decommission Brief, so any quirks in v2 surface before the legacy fallback is removed.

---

## Findings log (full detail in `FINDINGS.md`)

| ID | Severity | Description | Next action |
|---|---|---|---|
| F1 | LOW (carry) | Demo email allowlist superset (3 entries; Brief lists 2) | Daniel decides: keep live or trim |
| F2 | INFO | `crm_message_log.template_slug` is full slug, not base; UI shows verbose form | Optional small SPEC for cleaner display |
| F3 | INFO | Phase 5 test-send button effectively untested (demo has only 3 leads, rules narrow to 1) | When demo is seeded, manual exercise |
| F4 | INFO | Email body-preview shows HTML source, not rendered | By design — Iron Rule 8 |
| F5 | INFO | Cancel toast K/M counts are snapshot-at-click, not live | No action recommended |
| F6 | INFO | MCP `deploy_edge_function` clean — no OPEN-021 fallback needed | Sentinel-of-resolution datapoint |

---

## Rollback procedure (if hands-on smoke fails)

```
git reset --hard pre-dry-run-preview-2026-05-14    # local rollback
# OR per-commit:
git revert b5741a3 e4e1330 9abcf5c d9d9ee8 3800078 50fe633 ad3d0e6
git push origin develop
```

For EF rollback (v15 → v14):
```
git checkout pre-dry-run-preview-2026-05-14 -- supabase/functions/automation-engine/
supabase functions deploy automation-engine
git checkout HEAD -- supabase/functions/automation-engine/
```

For DB rollback: not needed. Zero DDL was applied. The 2 demo `crm_message_queue` rows in `status='cancelled'` are an artifact of Phase 6 smoke; they are inert and can stay as test-data evidence.

---

## Architect handoff — next chat should consider

- **Document & merge:** Update `MODULE_MAP.md` to register the 4 new client files (v2-render.js, v2.js, broadcast-cancel.js — and ensure the EF map note for preview.ts + consumer.ts is added). Refresh `CHANGELOG.md` with the 7 commits. Refresh `SESSION_CONTEXT.md` with the new "v2 modal canonical for new flows; v1 still active for the 5 legacy callsites."
- **Author successor Brief:** `M4_LEGACY_DISPATCH_DECOMMISSION_v2` — flip 5 callsites + retire v1. Recommend waiting 1-2 production days first.
- **F2 follow-up:** ~10-minute SPEC for cleaner history slug display in body-expand panel.
- **Sentinel update:** L-NEW-29-1 (automation-engine GLOBAL_MAP says v7) should be refreshed to v15 in the next Sentinel scan.

---

*End of summary. Daniel — please run the 10-step hands-on smoke above before merging to main.*
